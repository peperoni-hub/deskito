// Upcoming page: calendar plans as a to-do list. Tick one off and it moves to the timeline,
// faded and crossed out. (Events are plans, so they also show in the calendar.)

const upcomingList = document.getElementById("upcoming-list");
const timelineList = document.getElementById("timeline-list");
const eventsAdd = document.getElementById("events-add");

function eventTime(plan) {
  return `${formatTimeOfDay(plan.start)} – ${formatTimeOfDay(plan.end)}`;
}

function eventRow(plan) {
  const project = findProject(plan.projectId);
  return el("li", { class: `event-row plan-${plan.type}${plan.done ? " done" : ""}`, style: planColorStyle(plan) },
    el("button", {
      type: "button",
      class: "event-check",
      title: plan.done ? t("Mark as not done") : t("Mark as done"),
      "aria-pressed": String(Boolean(plan.done)),
      onclick: () => setDone(plan, !plan.done),
    }, plan.done ? "✓" : ""),
    el("span", { class: "event-main", onclick: () => openPlanDialog(plan) },
      el("span", { class: "event-title" }, plan.title),
      el("span", { class: "event-meta" },
        el("span", {}, plan.done && plan.doneAt
          ? `${dayLabel(dayKey(plan.start))} · ${eventTime(plan)} · ${t("Done {time}", { time: formatTimeOfDay(plan.doneAt) })}`
          : plan.end < dayStart(dayKey(Date.now()))
            ? `${dayLabel(dayKey(plan.start))} · ${eventTime(plan)}`
            : eventTime(plan)),
        plan.type === "other" && plan.otherLabel && el("span", { class: "tag-chip" }, plan.otherLabel),
        project && el("span", { class: "project-chip" }, el("span", { class: "dot", style: `background:${project.color}` }), project.name)
      )
    )
  );
}

function dayGroup(title, plans, extraClass = "") {
  return el("div", { class: `event-day ${extraClass}` },
    el("div", { class: "day-header" }, el("span", {}, title)),
    el("ul", { class: "event-list" }, plans.map(eventRow))
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
    ...(missed.length ? [dayGroup(t("Not done yet"), missed, "missed")] : []),
    ...[...days].map(([key, plans]) => dayGroup(dayLabel(key), plans)),
    ...(open.length ? [] : [el("p", { class: "empty" }, t("Nothing coming up. Add an event to plan ahead."))])
  );

  const done = store.plans.filter((plan) => plan.done).sort((a, b) => (b.doneAt || b.start) - (a.doneAt || a.start));
  timelineList.replaceChildren(
    done.length
      ? el("ul", { class: "event-list timeline" }, done.map(eventRow))
      : el("p", { class: "empty" }, t("No finished events yet. Tick off an event and it moves here."))
  );
}

function setDone(plan, done) {
  plan.done = done;
  if (done) {
    plan.doneAt = Date.now();
  } else {
    delete plan.doneAt;
  }
  plansChanged();
  if (done) {
    showToast(t("Done! Moved to your timeline."), [{ label: t("Undo"), primary: true, run: () => setDone(plan, false) }]);
  }
}

eventsAdd.addEventListener("click", () => {
  const start = new Date();
  start.setMinutes(start.getMinutes() < 30 ? 30 : 60, 0, 0);
  openPlanDialog({ start: start.getTime(), end: start.getTime() + 3600000 });
});

document.querySelector('.nav-item[data-view="events"]').addEventListener("click", renderEvents);
renderEvents();
