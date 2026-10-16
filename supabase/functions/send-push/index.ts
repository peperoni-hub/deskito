// Deskito send-push: runs every minute (see supabase/push.sql) and sends the notifications
// that are due to every device of their owner, even when Deskito is closed.
//
// Secrets to set in Supabase (Edge Functions → Secrets):
//   VAPID_PRIVATE_KEY  the private key from "Deskito push keys.txt"
//   CRON_SECRET        any long random text; the same one goes into push.sql
// SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are provided by Supabase automatically.

import { createClient } from "npm:@supabase/supabase-js@2.49.4";

const VAPID_PUBLIC_KEY = "BNwERnXymrD09Nb0a9_FkOH54tJLoF9Q6TE6XO0_dSZJH24FDLrQrtIYp4Wsx-76BWRGBCLpsTXbbH3gGEJK3pc";
const VAPID_SUBJECT = "https://peperoni-hub.github.io/deskito/";

// ---- web push (RFC 8291 message encryption + RFC 8292 VAPID), plain WebCrypto ----
// WEBPUSH-START
const enc = new TextEncoder();

function b64uDecode(text) {
  const base = text.replace(/-/g, "+").replace(/_/g, "/");
  const binary = atob(base + "=".repeat((4 - (base.length % 4)) % 4));
  return Uint8Array.from(binary, (c) => c.charCodeAt(0));
}

function b64uEncode(bytes) {
  let binary = "";
  for (const byte of new Uint8Array(bytes)) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function concat(...parts) {
  const out = new Uint8Array(parts.reduce((sum, part) => sum + part.length, 0));
  let at = 0;
  for (const part of parts) {
    out.set(part, at);
    at += part.length;
  }
  return out;
}

async function hkdf(salt, ikm, info, bytes) {
  const key = await crypto.subtle.importKey("raw", ikm, "HKDF", false, ["deriveBits"]);
  return new Uint8Array(await crypto.subtle.deriveBits({ name: "HKDF", hash: "SHA-256", salt, info }, key, bytes * 8));
}

async function vapidKey(publicKey, privateKey) {
  const raw = b64uDecode(publicKey);
  const jwk = { kty: "EC", crv: "P-256", x: b64uEncode(raw.slice(1, 33)), y: b64uEncode(raw.slice(33, 65)), d: privateKey, ext: true };
  return crypto.subtle.importKey("jwk", jwk, { name: "ECDSA", namedCurve: "P-256" }, false, ["sign"]);
}

async function vapidHeader(endpoint, signingKey, publicKey, subject) {
  const header = b64uEncode(enc.encode(JSON.stringify({ typ: "JWT", alg: "ES256" })));
  const claims = b64uEncode(enc.encode(JSON.stringify({
    aud: new URL(endpoint).origin,
    exp: Math.floor(Date.now() / 1000) + 12 * 3600,
    sub: subject,
  })));
  const signature = await crypto.subtle.sign({ name: "ECDSA", hash: "SHA-256" }, signingKey, enc.encode(`${header}.${claims}`));
  return `vapid t=${header}.${claims}.${b64uEncode(signature)}, k=${publicKey}`;
}

async function encryptPayload(device, text) {
  const deviceKey = b64uDecode(device.p256dh);
  const authSecret = b64uDecode(device.auth);
  const local = await crypto.subtle.generateKey({ name: "ECDH", namedCurve: "P-256" }, true, ["deriveBits"]);
  const localPublic = new Uint8Array(await crypto.subtle.exportKey("raw", local.publicKey));
  const devicePublic = await crypto.subtle.importKey("raw", deviceKey, { name: "ECDH", namedCurve: "P-256" }, false, []);
  const shared = new Uint8Array(await crypto.subtle.deriveBits({ name: "ECDH", public: devicePublic }, local.privateKey, 256));

  const ikm = await hkdf(authSecret, shared, concat(enc.encode("WebPush: info\0"), deviceKey, localPublic), 32);
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const contentKey = await hkdf(salt, ikm, enc.encode("Content-Encoding: aes128gcm\0"), 16);
  const nonce = await hkdf(salt, ikm, enc.encode("Content-Encoding: nonce\0"), 12);

  const aesKey = await crypto.subtle.importKey("raw", contentKey, "AES-GCM", false, ["encrypt"]);
  const padded = concat(enc.encode(text), new Uint8Array([2]));
  const cipher = new Uint8Array(await crypto.subtle.encrypt({ name: "AES-GCM", iv: nonce }, aesKey, padded));

  const recordSize = new Uint8Array([0, 0, 16, 0]); // 4096
  return concat(salt, recordSize, new Uint8Array([localPublic.length]), localPublic, cipher);
}

// Builds the request for one device; send it with fetch(request.url, request)
async function buildPushRequest(device, payload, signingKey, publicKey, subject) {
  return {
    url: device.endpoint,
    method: "POST",
    headers: {
      Authorization: await vapidHeader(device.endpoint, signingKey, publicKey, subject),
      "Content-Encoding": "aes128gcm",
      "Content-Type": "application/octet-stream",
      TTL: "3600",
      Urgency: "high",
    },
    body: await encryptPayload(device, JSON.stringify(payload)),
  };
}
// WEBPUSH-END

// ---- the job ----

Deno.serve(async (request) => {
  if (request.headers.get("x-cron-secret") !== Deno.env.get("CRON_SECRET")) {
    return new Response("Not allowed", { status: 401 });
  }

  const db = createClient(Deno.env.get("SUPABASE_URL"), Deno.env.get("SUPABASE_SERVICE_ROLE_KEY"));
  const now = new Date();
  const tooLate = new Date(now.getTime() - 30 * 60000); // Don't send things more than 30 minutes late

  // Claim the due jobs (marking them sent first means nothing is ever sent twice)
  const { data: jobs, error } = await db
    .from("deskito_push_jobs")
    .update({ sent: true })
    .eq("sent", false)
    .lte("send_at", now.toISOString())
    .gt("send_at", tooLate.toISOString())
    .select();
  if (error) return new Response(error.message, { status: 500 });

  // Tidy up old ones
  await db.from("deskito_push_jobs").delete().lt("send_at", new Date(now.getTime() - 2 * 86400000).toISOString());

  if (!jobs.length) return new Response("Nothing due");

  const userIds = [...new Set(jobs.map((job) => job.user_id))];
  const { data: devices } = await db.from("deskito_push_devices").select().in("user_id", userIds);
  const signingKey = await vapidKey(VAPID_PUBLIC_KEY, Deno.env.get("VAPID_PRIVATE_KEY"));

  let sent = 0;
  for (const job of jobs) {
    const payload = { title: job.title, body: job.body, tag: job.job_key, sticky: job.sticky };
    for (const device of (devices || []).filter((item) => item.user_id === job.user_id)) {
      try {
        const push = await buildPushRequest(device, payload, signingKey, VAPID_PUBLIC_KEY, VAPID_SUBJECT);
        const response = await fetch(push.url, push);
        if (response.status === 404 || response.status === 410) {
          // That browser unsubscribed or was reset
          await db.from("deskito_push_devices").delete().eq("endpoint", device.endpoint);
        } else if (response.ok) {
          sent++;
        } else {
          console.warn("push failed", response.status, await response.text());
        }
      } catch (problem) {
        console.warn("push error", problem);
      }
    }
  }
  return new Response(`Sent ${sent}`);
});
