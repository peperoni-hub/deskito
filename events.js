// "Upcoming" on the home page: add an event with its time; it waits there until you tick it
// off. Then it becomes a finished entry in "Your time", with that time record.
// (Upcoming events are calendar plans, so they also show in the calendar.)

const upcomingList = document.getElementById("upcoming-list");
const upcomingForm = document.getElementById("upcoming-form");
const upcomingTitle = document.getElementById("upcoming-title");
const upcomingDate = document.getElementById("upcoming-date");
const upcomingStart = document.getElementById("upcoming-start");
const upcomingEnd = document.getElementById("upcoming-end");
const upcomingAutoStart = document.getElementById("upcoming-auto-start");
const upcomingReminder = document.getElementById("upcoming-reminder");

function eventTime(plan) {
  return planTimeLabel(plan);
}

function eventRow(plan, showDay) {
  const hasDuration = !plan.allDay && !plan.noEnd && plan.end > plan.start;
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
        plan.type === "other" && plan.otherLabel && el("span", { class: "tag-chip" }, plan.otherLabel),
        plan.autoStart && el("span", { class: "tag-chip", title: t("Start the timer automatically") }, "⏱"),
        (plan.reminders || []).length > 0 && el("span", { class: "tag-chip", title: t("Remind me") }, "🔔")
      )
    ),
    hasDuration && el("span", { class: "entry-duration" }, formatDuration(plan.end - plan.start))
  );
}

function renderEvents() {
  const todayStart = dayStart(dayKey(Date.now()));
  const open = store.plans.filter((plan) => !plan.done).sort((a, b) => a.start - b.start);
  // An event without an end is "missed" once its day is over
  const endOf = (plan) => (plan.noEnd ? endOfDay(dayKey(plan.start)) : plan.end);
  const missed = open.filter((plan) => endOf(plan) <= todayStart);
  const coming = open.filter((plan) => endOf(plan) > todayStart);

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
    // All-day events and events without an end are recorded by their day / start time only
    const timed = !plan.allDay && !plan.noEnd;
    const entry = {
      id: uid(),
      description: plan.title,
      type: ["meeting", "event"].includes(plan.type) ? plan.type : "task",
      projectId: plan.projectId || "",
      taskId: plan.taskId || "",
      tagIds: [],
      start: plan.start,
      end: timed ? plan.end : plan.start,
      planId: plan.id,
      fromEvent: true,
      allDay: Boolean(plan.allDay),
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

function quickEventFields() {
  const title = upcomingTitle.value.trim();
  return {
    title,
    type: moodFromText(title) === "meeting" ? "meeting" : "task",
    projectId: "",
    taskId: "",
    notes: "",
    otherLabel: "",
    color: "",
    autoStart: upcomingAutoStart.checked,
    reminders: upcomingReminder.value ? [Number(upcomingReminder.value)] : [],
    ...eventRange(upcomingDate.value, upcomingStart.value, "", upcomingEnd.value),
  };
}

function resetQuickForm() {
  upcomingTitle.value = "";
  upcomingStart.value = "";
  upcomingEnd.value = "";
  upcomingAutoStart.checked = false;
  upcomingReminder.value = "";
}

upcomingForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const fields = quickEventFields();
  if (!fields.allDay && !fields.noEnd && fields.end === fields.start) {
    notify(t("The end must be after the start."));
    return;
  }
  if (!fields.allDay && !fields.noEnd && !await timesLookRight(fields.start, fields.end)) return;
  if ((fields.autoStart || fields.reminders.length) && "Notification" in window && Notification.permission === "default") {
    Notification.requestPermission();
  }
  store.plans.push({ id: uid(), ...fields });
  plansChanged();
  resetQuickForm();
  upcomingTitle.focus();
});

// More options: open the full window with what's typed so far
document.getElementById("upcoming-more").addEventListener("click", () => {
  const fields = quickEventFields();
  openPlanDialog({ ...fields, title: fields.title });
  resetQuickForm();
});

upcomingDate.value = dayKey(Date.now());
renderEvents();
