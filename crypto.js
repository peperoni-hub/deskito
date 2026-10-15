// Locking and unlocking data on the user's own device (the browser's built-in Web Crypto).
// Data is locked before it's synced, so the server only ever stores unreadable text.

const textEncoder = new TextEncoder();
const textDecoder = new TextDecoder();

function toBase64(buffer) {
  const bytes = new Uint8Array(buffer);
  let text = "";
  for (let i = 0; i < bytes.length; i += 0x8000) {
    text += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  }
  return btoa(text);
}

function fromBase64(text) {
  const raw = atob(text);
  const bytes = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) bytes[i] = raw.charCodeAt(i);
  return bytes;
}

/* Locking with a secret key (AES-GCM) */

async function lockBytes(key, bytes) {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const locked = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, bytes);
  return `${toBase64(iv)}.${toBase64(locked)}`;
}

async function unlockBytes(key, text) {
  const [iv, locked] = text.split(".");
  return new Uint8Array(await crypto.subtle.decrypt({ name: "AES-GCM", iv: fromBase64(iv) }, key, fromBase64(locked)));
}

async function lockJson(key, value) {
  return lockBytes(key, textEncoder.encode(JSON.stringify(value)));
}

async function unlockJson(key, text) {
  return JSON.parse(textDecoder.decode(await unlockBytes(key, text)));
}

/* Keys */

// The user's data key: one per account, the same on all their devices
async function newDataKey() {
  return crypto.subtle.generateKey({ name: "AES-GCM", length: 256 }, true, ["encrypt", "decrypt"]);
}

async function dataKeyFromBytes(bytes) {
  return crypto.subtle.importKey("raw", bytes, { name: "AES-GCM" }, true, ["encrypt", "decrypt"]);
}

async function dataKeyBytes(key) {
  return new Uint8Array(await crypto.subtle.exportKey("raw", key));
}

// A key made from a password (or recovery key); slow on purpose, so guessing is impractical
async function keyFromSecret(secret, salt, iterations) {
  const base = await crypto.subtle.importKey("raw", textEncoder.encode(secret), "PBKDF2", false, ["deriveKey"]);
  return crypto.subtle.deriveKey(
    { name: "PBKDF2", salt, iterations, hash: "SHA-256" },
    base,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"]
  );
}

function randomBytes(count) {
  return crypto.getRandomValues(new Uint8Array(count));
}

// Recovery key: 20 easy-to-read characters, like K7QM-2PXR-...
const RECOVERY_LETTERS = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";

function newRecoveryKey() {
  const letters = [...randomBytes(20)].map((byte) => RECOVERY_LETTERS[byte % RECOVERY_LETTERS.length]).join("");
  return letters.match(/.{4}/g).join("-");
}

function cleanRecoveryKey(text) {
  return text.toUpperCase().replace(/[^A-Z0-9]/g, "");
}

/* Key pairs: let two people (or a user and support) share a lock without sending a secret */

async function newKeyPair() {
  return crypto.subtle.generateKey({ name: "ECDH", namedCurve: "P-256" }, true, ["deriveKey"]);
}

async function publicKeyText(keyPair) {
  return toBase64(await crypto.subtle.exportKey("spki", keyPair.publicKey));
}

async function privateKeyBytes(keyPair) {
  return new Uint8Array(await crypto.subtle.exportKey("pkcs8", keyPair.privateKey));
}

async function privateKeyFromBytes(bytes) {
  return crypto.subtle.importKey("pkcs8", bytes, { name: "ECDH", namedCurve: "P-256" }, true, ["deriveKey"]);
}

// Both sides arrive at the same lock: my private key + their public key
async function sharedLock(myPrivateKey, theirPublicKeyText) {
  const theirs = await crypto.subtle.importKey("spki", fromBase64(theirPublicKeyText), { name: "ECDH", namedCurve: "P-256" }, false, []);
  return crypto.subtle.deriveKey(
    { name: "ECDH", public: theirs },
    myPrivateKey,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"]
  );
}
