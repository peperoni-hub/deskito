// "Upcoming" on the home page: add an event with its time; it waits there until you tick it
// off. Then it becomes a finished entry in "Your time", with that time record.
// (Upcoming events are calendar plans, so they also show in the calendar.)

const upcomingList = document.getElementById("upcoming-list");
const upcomingForm = document.getElementById("upcoming-form");
const upcomingTitle = document.getElementById("upcoming-title");
const upcomingDate = document.getElementById("upcoming-date");
const upcomingStart = document.getElementById("upcoming-start");
const upcomingEnd = document.getElementById("upcoming-end");

function eventTime(plan) {
  return `${formatTimeOfDay(plan.start)} – ${formatTimeOfDay(plan.end)}`;
}

function eventRow(plan, showDay) {
  return el("li", { class: `event-row plan-${plan.type}`, style: planColorStyle(plan) },
    el("button", {
      type: "button",
      class: "event-check",
      title: t("Mark as done"),
      onclick: () => setDone(plan, true),
    }),
    el("span", { class: "event-main", onclick: () => openPlanDialog(plan) },
      el("span", { class: "event-title" }, plan.title),
      el("span", { class: "event-meta" },
        el("span", {}, showDay ? `${dayLabel(dayKey(plan.start))} · ${eventTime(plan)}` : eventTime(plan)),
        plan.type === "other" && plan.otherLabel && el("span", { class: "tag-chip" }, plan.otherLabel)
      )
    ),
    el("span", { class: "entry-duration" }, formatDuration(plan.end - plan.start))
  );
}

function renderEvents() {
  const todayStart = dayStart(dayKey(Date.now()));
  const open = store.plans.filter((plan) => !plan.done).sort((a, b) => a.start - b.start);
  const missed = open.filter((plan) => plan.end < todayStart);
  const coming = open.filter((plan) => plan.end >= todayStart);

  const days = new Map();
  for (const plan of coming) {
    const key = dayKey(Math.max(plan.start, todayStart));
    if (!days.has(key)) days.set(key, []);
    days.get(key).push(plan);
  }

  upcomingList.replaceChildren(
    ...(missed.length ? [eventDay(t("Not done yet"), missed, true, "missed")] : []),
    ...[...days].map(([key, plans]) => eventDay(dayLabel(key), plans, false)),
    ...(open.length ? [] : [el("p", { class: "upcoming-empty" }, t("Nothing coming up. Add an event to plan ahead."))])
  );
}

function eventDay(title, plans, showDay, extraClass = "") {
  return el("div", { class: `event-day ${extraClass}` },
    el("div", { class: "event-day-title" }, title),
    el("ul", { class: "event-list" }, plans.map((plan) => eventRow(plan, showDay)))
  );
}

// Done: the event becomes a finished entry in "Your time"; not done: it comes back here
function setDone(plan, done) {
  if (done) {
    const entry = {
      id: uid(),
      description: plan.title,
      type: plan.type === "meeting" ? "meeting" : "task",
      projectId: plan.projectId || "",
      taskId: plan.taskId || "",
      tagIds: [],
      start: plan.start,
      end: plan.end,
      planId: plan.id,
      fromEvent: true,
    };
    store.entries.push(entry);
    saveEntries();
    renderEntries();
    plan.done = true;
    plan.doneAt = Date.now();
    plan.entryId = entry.id;
  } else {
    if (plan.entryId) {
      store.entries = store.entries.filter((entry) => entry.id !== plan.entryId);
      saveEntries();
      renderEntries();
    }
    plan.done = false;
    delete plan.doneAt;
    delete plan.entryId;
  }
  plansChanged();
  if (done) {
    showToast(t("Done! Added to your time."), [{ label: t("Undo"), primary: true, run: () => setDone(plan, false) }]);
  }
}

// Long times across midnight are usually a 12:00 PM / 12:00 AM mix-up: ask first
async function timesLookRight(start, end) {
  if (end - start <= 12 * 3600000 || dayKey(start) === dayKey(end)) return true;
  return askConfirm(
    t("This lasts {time}. Is that right? (12:00 PM is noon, 12:00 AM is midnight.)", { time: formatHours(end - start) }),
    t("Yes, save")
  );
}

upcomingForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const { start, end } = timeRange(upcomingDate.value, upcomingStart.value, upcomingEnd.value);
  if (end === start) {
    notify(t("The start and end time can't be the same."));
    return;
  }
  if (!await timesLookRight(start, end)) return;
  const title = upcomingTitle.value.trim();
  store.plans.push({ id: uid(), title, type: moodFromText(title) === "meeting" ? "meeting" : "task", projectId: "", taskId: "", start, end, notes: "", otherLabel: "", color: "" });
  plansChanged();
  upcomingTitle.value = "";
  upcomingStart.value = "";
  upcomingEnd.value = "";
  upcomingTitle.focus();
});

upcomingDate.value = dayKey(Date.now());
renderEvents();
