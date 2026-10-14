// Shared data (entries, projects, tags) and small helpers used by every page

function readStore(key, fallback) {
  try {
    const value = JSON.parse(localStorage.getItem(key));
    return value ?? fallback;
  } catch {
    return fallback;
  }
}

function writeStore(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

const ENTRY_TYPES = {
  task: "Task",
  project: "Project work",
  meeting: "Meeting",
  break: "Break",
};

const store = {
  entries: readStore("entries", []).map((entry) => ({
    id: entry.id || uid(),
    description: entry.description || "",
    projectId: entry.projectId || "",
    taskId: entry.taskId || "",
    tagIds: entry.tagIds || [],
    type: entry.type || "task",
    planId: entry.planId || "",
    start: entry.start,
    end: entry.end,
  })),
  projects: readStore("projects", []),
  tags: readStore("tags", []),
  plans: readStore("plans", []),
};

const prefs = {
  pomoWork: 25,
  pomoBreak: 5,
  pomoTrack: true,
  breakAlarm: true,
  breakAfterMin: 60,
  breakLengthMin: 10,
  remindTrack: false,
  remindEveryMin: 30,
  workStart: "09:00",
  workEnd: "17:00",
  longTimerHours: 8,
  ...readStore("prefs", {}),
};

function savePrefs() {
  writeStore("prefs", prefs);
}

function saveEntries() {
  document.dispatchEvent(new Event("entries-changed"));
  writeStore("entries", store.entries);
}

function saveProjects() {
  writeStore("projects", store.projects);
}

function saveTags() {
  writeStore("tags", store.tags);
}

function findProject(id) {
  return store.projects.find((project) => project.id === id);
}

function findTask(project, taskId) {
  return project ? project.tasks.find((task) => task.id === taskId) : undefined;
}

function findTag(id) {
  return store.tags.find((tag) => tag.id === id);
}

// Build an element: el("button", { class: "x", onclick: fn }, "Label")
function el(tag, props = {}, ...children) {
  const node = document.createElement(tag);
  for (const [key, value] of Object.entries(props)) {
    if (value === false || value == null) continue;
    if (key === "class") node.className = value;
    else if (key === "style") node.style.cssText = value;
    else if (key.startsWith("on")) node.addEventListener(key.slice(2), value);
    else if (value === true) node.setAttribute(key, "");
    else node.setAttribute(key, value);
  }
  node.append(...children.flat().filter((child) => child != null && child !== false));
  return node;
}

/* Time formatting */

function formatDuration(milliseconds) {
  const totalSeconds = Math.max(0, Math.floor(milliseconds / 1000));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  return [hours, minutes, seconds]
    .map((part) => String(part).padStart(2, "0"))
    .join(":");
}

function formatTimeOfDay(timestamp) {
  return new Date(timestamp).toLocaleTimeString(locale(), { hour: "2-digit", minute: "2-digit" });
}

function pad(number) {
  return String(number).padStart(2, "0");
}

function dayKey(timestamp) {
  const date = new Date(timestamp);
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function timeKey(timestamp) {
  const date = new Date(timestamp);
  return `${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function fromDateAndTime(dateValue, timeValue) {
  return new Date(`${dateValue}T${timeValue}`).getTime();
}

function dayLabel(key) {
  const today = dayKey(Date.now());
  const yesterday = dayKey(Date.now() - 86400000);
  if (key === today) return t("Today");
  if (key === yesterday) return t("Yesterday");
  return new Date(`${key}T00:00`).toLocaleDateString(locale(), { weekday: "short", day: "numeric", month: "short" });
}

function startOfWeek(timestamp) {
  const date = new Date(timestamp);
  const daysSinceMonday = (date.getDay() + 6) % 7;
  date.setHours(0, 0, 0, 0);
  date.setDate(date.getDate() - daysSinceMonday);
  return date.getTime();
}

/* Pickers shared by the timer bar and the edit dialog */

// A project picker value is "projectId" or "projectId:taskId"
function projectValue(entry) {
  return entry.taskId ? `${entry.projectId}:${entry.taskId}` : entry.projectId;
}

function parseProjectValue(value) {
  const [projectId = "", taskId = ""] = value.split(":");
  return { projectId, taskId };
}

function fillProjectSelect(select, value = "") {
  const keepId = parseProjectValue(value).projectId;
  select.replaceChildren(el("option", { value: "" }, t("No project")));
  for (const project of store.projects) {
    if (project.archived && project.id !== keepId) continue;
    select.append(el("option", { value: project.id }, project.name));
    for (const task of project.tasks) {
      select.append(el("option", { value: `${project.id}:${task.id}` }, `   ${project.name} › ${task.name}`));
    }
  }
  select.value = value;
}

function fillTypeSelect(select, value = "task") {
  select.replaceChildren(
    ...Object.entries(ENTRY_TYPES).map(([key, label]) => el("option", { value: key }, t(label)))
  );
  select.value = value;
}

function fillTagPicker(picker, selectedIds = []) {
  const menu = el("div", { class: "tag-menu" });
  if (store.tags.length === 0) {
    menu.append(el("p", { class: "tag-menu-empty" }, t("No tags yet. Add them on the Projects page.")));
  }
  for (const tag of store.tags) {
    menu.append(
      el("label", { class: "tag-option" },
        el("input", { type: "checkbox", value: tag.id, checked: selectedIds.includes(tag.id) }),
        tag.name
      )
    );
  }
  picker.replaceChildren(el("summary", {}), menu);
  updateTagSummary(picker);
  menu.addEventListener("change", () => updateTagSummary(picker));
}

function readTagPicker(picker) {
  return [...picker.querySelectorAll("input:checked")].map((input) => input.value);
}

function updateTagSummary(picker) {
  const names = readTagPicker(picker).map((id) => findTag(id)?.name).filter(Boolean);
  picker.querySelector("summary").textContent = names.length ? names.join(", ") : t("Tags");
}

function savePlans() {
  writeStore("plans", store.plans);
}

/* Our own "are you sure?" window and messages (browsers can block their built-in pop-ups) */

function askConfirm(message, confirmLabel = t("Delete")) {
  return new Promise((resolve) => {
    const dialog = document.getElementById("confirm-dialog");
    dialog.querySelector(".confirm-message").textContent = message;
    const yes = dialog.querySelector(".confirm-yes");
    yes.textContent = confirmLabel;
    const finish = (answer) => {
      dialog.close();
      resolve(answer);
    };
    yes.onclick = () => finish(true);
    dialog.querySelector(".confirm-no").onclick = () => finish(false);
    dialog.oncancel = () => resolve(false);
    dialog.showModal();
  });
}

function notify(message) {
  showToast(message);
}

// An end time earlier than the start time means the next day, e.g. 22:00 – 01:00
function timeRange(dateValue, startValue, endValue) {
  const start = fromDateAndTime(dateValue, startValue);
  let end = fromDateAndTime(dateValue, endValue);
  if (end < start) {
    const nextDay = new Date(end);
    nextDay.setDate(nextDay.getDate() + 1);
    end = nextDay.getTime();
  }
  return { start, end };
}
