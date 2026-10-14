// Calendar page (week and month) and the mini calendar on the Time Tracker page

const PLAN_TYPES = { task: "Task", meeting: "Meeting", plan: "Plan", other: "Other" };
const HOUR_HEIGHT = 48;

const calTitle = document.getElementById("cal-title");
const calPrev = document.getElementById("cal-prev");
const calNext = document.getElementById("cal-next");
const calToday = document.getElementById("cal-today");
const calViewButtons = document.querySelectorAll(".cal-view-button");
const calShowTracked = document.getElementById("cal-show-tracked");
const calAdd = document.getElementById("cal-add");
const calBody = document.getElementById("cal-body");

const miniMonth = document.getElementById("mini-month");
const miniPrev = document.getElementById("mini-prev");
const miniNext = document.getElementById("mini-next");
const miniGrid = document.getElementById("mini-grid");
const miniDayTitle = document.getElementById("mini-day-title");
const miniDayList = document.getElementById("mini-day-list");
const miniAdd = document.getElementById("mini-add");
const miniOpen = document.getElementById("mini-open");

const planDialog = document.getElementById("plan-dialog");
const planForm = document.getElementById("plan-form");
const planDialogTitle = document.getElementById("plan-dialog-title");
const planTitle = document.getElementById("plan-title");
const planType = document.getElementById("plan-type");
const planProject = document.getElementById("plan-project");
const planDate = document.getElementById("plan-date");
const planStart = document.getElementById("plan-start");
const planEnd = document.getElementById("plan-end");
const planNotes = document.getElementById("plan-notes");
const planOtherRow = document.getElementById("plan-other-row");
const planOtherLabel = document.getElementById("plan-other-label");
const planColor = document.getElementById("plan-color");
const planColorReset = document.getElementById("plan-color-reset");
const planDeleteButton = document.getElementById("plan-delete");
const planTimerButton = document.getElementById("plan-timer");
const planCancelButton = document.getElementById("plan-cancel");

let calView = "week";
let calAnchor = Date.now();
let weekScroll = 7 * HOUR_HEIGHT;
let miniAnchor = Date.now();
let miniSelected = dayKey(Date.now());
let editingPlanId = null;

/* Date helpers */

function addDays(timestamp, days) {
  const date = new Date(timestamp);
  date.setDate(date.getDate() + days);
  return date.getTime();
}

function startOfMonth(timestamp) {
  const date = new Date(timestamp);
  date.setHours(0, 0, 0, 0);
  date.setDate(1);
  return date.getTime();
}

function addMonths(timestamp, months) {
  const date = new Date(startOfMonth(timestamp));
  date.setMonth(date.getMonth() + months);
  return date.getTime();
}

function dayStart(key) {
  return new Date(`${key}T00:00`).getTime();
}

// Every day shown in a month grid: from the Monday before the 1st to the Sunday after the last day
function monthGridDays(timestamp) {
  const nextMonth = addMonths(timestamp, 1);
  const days = [];
  for (let day = startOfWeek(startOfMonth(timestamp)); day < nextMonth || new Date(day).getDay() !== 1; day = addDays(day, 1)) {
    days.push(day);
  }
  return days;
}

function weekdayNames(style) {
  return Array.from({ length: 7 }, (_, i) => new Date(2024, 0, 1 + i).toLocaleDateString([], { weekday: style }));
}

function formatHours(milliseconds) {
  const minutes = Math.round(milliseconds / 60000);
  const hours = Math.floor(minutes / 60);
  return hours ? `${hours}h ${minutes % 60}m` : `${minutes}m`;
}

function plansOn(key) {
  return store.plans.filter((plan) => dayKey(plan.start) === key).sort((a, b) => a.start - b.start);
}

function entriesOn(key) {
  return store.entries.filter((entry) => dayKey(entry.start) === key);
}

function plannedMs(plans) {
  return plans.reduce((sum, plan) => sum + (plan.end - plan.start), 0);
}

/* Week view */

function topFor(timestamp, key) {
  const top = ((timestamp - dayStart(key)) / 3600000) * HOUR_HEIGHT;
  return Math.max(0, Math.min(24 * HOUR_HEIGHT, top));
}

function planBlock(plan, lane, lanes) {
  const key = dayKey(plan.start);
  const top = topFor(plan.start, key);
  const height = Math.max(20, topFor(plan.end, key) - top);
  const project = findProject(plan.projectId);
  return el("div", {
    class: `plan-block plan-${plan.type}`,
    style: `top:${top}px;height:${height}px;left:calc(${(lane * 100) / lanes}% + 8px);width:calc(${100 / lanes}% - 10px);${planColorStyle(plan)}`,
    title: plan.notes || "",
    onclick: () => openPlanDialog(plan),
  },
    el("span", { class: "plan-title" }, plan.title),
    plan.type === "other" && plan.otherLabel && el("span", { class: "plan-kind" }, plan.otherLabel),
    el("span", { class: "plan-time" }, `${formatTimeOfDay(plan.start)} – ${formatTimeOfDay(plan.end)}`),
    project && el("span", { class: "plan-project" }, project.name)
  );
}

function dayColumn(key, isToday) {
  const column = el("div", { class: `day-col${isToday ? " today" : ""}`, style: `height:${24 * HOUR_HEIGHT}px` });

  // Click an empty spot to plan something at that time
  column.addEventListener("click", (event) => {
    if (event.target !== column) return;
    const minutes = Math.floor((event.offsetY / HOUR_HEIGHT) * 2) * 30;
    const start = dayStart(key) + minutes * 60000;
    openPlanDialog({ start, end: start + 3600000 });
  });

  if (calShowTracked.checked) {
    for (const entry of entriesOn(key)) {
      const top = topFor(entry.start, key);
      column.append(el("div", {
        class: "tracked-strip",
        style: `top:${top}px;height:${Math.max(3, topFor(entry.end, key) - top)}px`,
        title: `Tracked: ${entry.description || "(no description)"} · ${formatDuration(entry.end - entry.start)}`,
      }));
    }
  }

  // Plans that overlap are placed side by side
  const laneEnds = [];
  const placed = plansOn(key).map((plan) => {
    let lane = laneEnds.findIndex((end) => end <= plan.start);
    if (lane === -1) {
      lane = laneEnds.length;
      laneEnds.push(0);
    }
    laneEnds[lane] = plan.end;
    return { plan, lane };
  });
  for (const { plan, lane } of placed) {
    column.append(planBlock(plan, lane, Math.max(1, laneEnds.length)));
  }

  if (isToday) {
    column.append(el("div", { class: "now-line", style: `top:${topFor(Date.now(), key)}px` }));
  }
  return column;
}

function renderWeek() {
  const weekStart = startOfWeek(calAnchor);
  const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  const todayKey = dayKey(Date.now());
  const short = { day: "numeric", month: "short" };
  calTitle.textContent = `${new Date(days[0]).toLocaleDateString([], short)} – ${new Date(days[6]).toLocaleDateString([], { ...short, year: "numeric" })}`;

  const names = weekdayNames("short");
  const head = el("div", { class: "week-head" },
    el("div", { class: "gutter" }),
    days.map((day, i) => {
      const key = dayKey(day);
      const planned = plannedMs(plansOn(key));
      return el("div", { class: `week-day-head${key === todayKey ? " today" : ""}` },
        el("span", { class: "week-day-name" }, names[i]),
        el("span", { class: "week-day-number" }, new Date(day).getDate()),
        el("span", { class: "week-day-planned" }, planned ? `${formatHours(planned)} planned` : " ")
      );
    })
  );

  const gutter = el("div", { class: "gutter" },
    Array.from({ length: 24 }, (_, hour) =>
      el("div", { class: "hour-label", style: `height:${HOUR_HEIGHT}px` }, `${pad(hour)}:00`)
    )
  );

  const scroller = el("div", { class: "week-scroll" },
    head,
    el("div", { class: "week-grid" }, gutter, days.map((day) => dayColumn(dayKey(day), dayKey(day) === todayKey)))
  );
  scroller.addEventListener("scroll", () => {
    weekScroll = scroller.scrollTop;
  });

  calBody.replaceChildren(scroller);
  scroller.scrollTop = weekScroll;
}

/* Month view */

function renderMonth() {
  const month = new Date(calAnchor).getMonth();
  const todayKey = dayKey(Date.now());
  calTitle.textContent = new Date(calAnchor).toLocaleDateString([], { month: "long", year: "numeric" });

  const cells = monthGridDays(calAnchor).map((day) => {
    const key = dayKey(day);
    const plans = plansOn(key);
    const otherMonth = new Date(day).getMonth() !== month;
    return el("div", {
      class: `month-cell${otherMonth ? " other-month" : ""}${key === todayKey ? " today" : ""}`,
      onclick: (event) => {
        if (event.target.closest(".month-chip")) return;
        calAnchor = day;
        setCalView("week");
      },
    },
      el("span", { class: "month-date" }, new Date(day).getDate()),
      plans.slice(0, 3).map((plan) =>
        el("button", { class: `month-chip plan-${plan.type}`, style: planColorStyle(plan), onclick: () => openPlanDialog(plan) },
          `${formatTimeOfDay(plan.start)} ${plan.title}`
        )
      ),
      plans.length > 3 && el("span", { class: "month-more" }, `+${plans.length - 3} more`),
      entriesOn(key).length > 0 && el("span", { class: "mini-line" })
    );
  });

  calBody.replaceChildren(
    el("div", { class: "month-head" }, weekdayNames("short").map((name) => el("span", {}, name))),
    el("div", { class: "month-grid" }, cells)
  );
}

function renderCalendar() {
  for (const button of calViewButtons) {
    button.classList.toggle("selected", button.dataset.calView === calView);
  }
  if (calView === "week") {
    renderWeek();
  } else {
    renderMonth();
  }
}

function setCalView(view) {
  calView = view;
  renderCalendar();
}

for (const button of calViewButtons) {
  button.addEventListener("click", () => setCalView(button.dataset.calView));
}

calPrev.addEventListener("click", () => {
  calAnchor = calView === "week" ? addDays(calAnchor, -7) : addMonths(calAnchor, -1);
  renderCalendar();
});

calNext.addEventListener("click", () => {
  calAnchor = calView === "week" ? addDays(calAnchor, 7) : addMonths(calAnchor, 1);
  renderCalendar();
});

calToday.addEventListener("click", () => {
  calAnchor = Date.now();
  renderCalendar();
});

calShowTracked.addEventListener("change", renderCalendar);

calAdd.addEventListener("click", () => {
  const start = new Date();
  start.setMinutes(start.getMinutes() < 30 ? 30 : 60, 0, 0);
  openPlanDialog({ start: start.getTime(), end: start.getTime() + 3600000 });
});

/* Mini calendar on the Time Tracker page */

function renderMini() {
  const month = new Date(miniAnchor).getMonth();
  const todayKey = dayKey(Date.now());
  miniMonth.textContent = new Date(miniAnchor).toLocaleDateString([], { month: "long", year: "numeric" });

  miniGrid.replaceChildren(
    ...weekdayNames("narrow").map((name) => el("span", { class: "mini-weekday" }, name)),
    ...monthGridDays(miniAnchor).map((day) => {
      const key = dayKey(day);
      const classes = ["mini-day"];
      if (new Date(day).getMonth() !== month) classes.push("other-month");
      if (key === todayKey) classes.push("today");
      if (key === miniSelected) classes.push("selected");
      return el("button", {
        class: classes.join(" "),
        onclick: () => {
          miniSelected = key;
          renderMini();
        },
      },
        el("span", { class: "mini-number" }, new Date(day).getDate()),
        el("span", { class: "mini-dots" }, plansOn(key).slice(0, 3).map((plan) => el("i", { class: `plan-dot plan-${plan.type}`, style: planColorStyle(plan) }))),
        entriesOn(key).length > 0 && el("span", { class: "mini-line" })
      );
    })
  );

  const plans = plansOn(miniSelected);
  const planned = plannedMs(plans);
  miniDayTitle.textContent = dayLabel(miniSelected) + (planned ? ` · ${formatHours(planned)} planned` : "");
  miniDayList.replaceChildren(
    ...(plans.length
      ? plans.map((plan) =>
          el("li", { class: `mini-plan plan-${plan.type}`, style: planColorStyle(plan), onclick: () => openPlanDialog(plan) },
            el("span", { class: "mini-plan-time" }, `${formatTimeOfDay(plan.start)} – ${formatTimeOfDay(plan.end)}`),
            el("span", { class: "mini-plan-title" }, plan.type === "other" && plan.otherLabel ? `${plan.title} · ${plan.otherLabel}` : plan.title)
          )
        )
      : [el("li", { class: "mini-empty" }, "Nothing planned.")])
  );
}

miniPrev.addEventListener("click", () => {
  miniAnchor = addMonths(miniAnchor, -1);
  renderMini();
});

miniNext.addEventListener("click", () => {
  miniAnchor = addMonths(miniAnchor, 1);
  renderMini();
});

miniAdd.addEventListener("click", () => {
  const start = dayStart(miniSelected) + 9 * 3600000;
  openPlanDialog({ start, end: start + 3600000 });
});

miniOpen.addEventListener("click", () => {
  calAnchor = dayStart(miniSelected);
  showView("calendar");
  setCalView("week");
});

/* Plan dialog */

function openPlanDialog(plan) {
  editingPlanId = plan.id || null;
  planDialogTitle.textContent = plan.id ? "Edit plan" : "New plan";
  planTitle.value = plan.title || "";
  planType.replaceChildren(...Object.entries(PLAN_TYPES).map(([key, label]) => el("option", { value: key }, label)));
  planType.value = plan.type || "task";
  planOtherLabel.value = plan.otherLabel || "";
  showOtherField();
  planColorChosen = Boolean(plan.color);
  showPlanColor(plan.color);
  fillProjectSelect(planProject, plan.projectId ? projectValue(plan) : "");
  planDate.value = dayKey(plan.start);
  planStart.value = timeKey(plan.start);
  planEnd.value = timeKey(plan.end);
  planNotes.value = plan.notes || "";
  planDeleteButton.hidden = !plan.id;
  planTimerButton.hidden = !plan.id;
  planDialog.showModal();
}

function plansChanged() {
  savePlans();
  renderCalendar();
  renderMini();
}

planForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const start = fromDateAndTime(planDate.value, planStart.value);
  const end = fromDateAndTime(planDate.value, planEnd.value);
  if (end <= start) {
    alert("The end time must be after the start time.");
    return;
  }
  const fields = {
    title: planTitle.value.trim(),
    type: planType.value,
    ...parseProjectValue(planProject.value),
    start,
    end,
    notes: planNotes.value.trim(),
    otherLabel: planType.value === "other" ? planOtherLabel.value.trim() : "",
    color: planColorChosen ? planColor.value : "",
  };
  const existing = store.plans.find((plan) => plan.id === editingPlanId);
  if (existing) {
    Object.assign(existing, fields);
  } else {
    store.plans.push({ id: uid(), ...fields });
  }
  miniSelected = dayKey(start);
  plansChanged();
  planDialog.close();
});

planDeleteButton.addEventListener("click", () => {
  if (!confirm("Delete this plan?")) return;
  store.plans = store.plans.filter((plan) => plan.id !== editingPlanId);
  plansChanged();
  planDialog.close();
});

planTimerButton.addEventListener("click", () => {
  const plan = store.plans.find((item) => item.id === editingPlanId);
  planDialog.close();
  showView("tracker");
  continueEntry({
    description: plan.title,
    type: plan.type === "meeting" ? "meeting" : "task",
    projectId: plan.projectId,
    taskId: plan.taskId,
    tagIds: [],
  });
});

planCancelButton.addEventListener("click", () => planDialog.close());

/* Keep both calendars up to date */

document.addEventListener("entries-changed", () => {
  renderMini();
  renderCalendar();
});

document.querySelector('.nav-item[data-view="calendar"]').addEventListener("click", renderCalendar);

renderCalendar();
renderMini();

/* "Other" type: ask what kind of thing it is (a date, a trip...) */

function showOtherField() {
  planOtherRow.hidden = planType.value !== "other";
  planOtherLabel.required = planType.value === "other";
}

planType.addEventListener("change", showOtherField);

/* Each plan can have its own colour; without one it uses its type's colour */

let planColorChosen = false;

function planColorStyle(plan) {
  return plan.color ? `--plan-color:${plan.color}` : "";
}

function typeColor(type) {
  return getComputedStyle(document.documentElement).getPropertyValue(`--plan-${type}`).trim();
}

function showPlanColor(color) {
  planColor.value = color || typeColor(planType.value);
  planColorReset.hidden = !planColorChosen;
}

planColor.addEventListener("input", () => {
  planColorChosen = true;
  planColorReset.hidden = false;
});

planColorReset.addEventListener("click", () => {
  planColorChosen = false;
  showPlanColor("");
});

// Until you pick a colour yourself, the picker follows the type
planType.addEventListener("change", () => {
  if (!planColorChosen) showPlanColor("");
});
