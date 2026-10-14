// Time Tracker page: timer, manual entries and the list of entries

const descriptionInput = document.getElementById("description");
const typeSelect = document.getElementById("entry-type");
const projectSelect = document.getElementById("entry-project");
const tagPicker = document.getElementById("entry-tags");
const clockMain = document.getElementById("clock-main");
const clockFraction = document.getElementById("clock-fraction");
const startStopButton = document.getElementById("start-stop");
const modeButtons = document.querySelectorAll(".mode-button");
const timerFields = document.getElementById("timer-fields");
const manualFields = document.getElementById("manual-fields");
const manualDate = document.getElementById("manual-date");
const manualStart = document.getElementById("manual-start");
const manualEnd = document.getElementById("manual-end");
const manualAddButton = document.getElementById("manual-add");
const entryDays = document.getElementById("entry-days");
const emptyMessage = document.getElementById("empty-message");
const weekTotal = document.getElementById("week-total");

const entryDialog = document.getElementById("entry-dialog");
const entryForm = document.getElementById("entry-form");
const editDescription = document.getElementById("edit-description");
const editType = document.getElementById("edit-type");
const editProject = document.getElementById("edit-project");
const editTags = document.getElementById("edit-tags");
const editDate = document.getElementById("edit-date");
const editStart = document.getElementById("edit-start");
const editEnd = document.getElementById("edit-end");
const editDeleteButton = document.getElementById("edit-delete");
const editCancelButton = document.getElementById("edit-cancel");

// The running timer is saved, so it keeps going after a refresh
let running = readStore("running", null);
let frameRequest = null;
let editingId = null;

/* Timer */

function currentFields() {
  return {
    description: descriptionInput.value.trim(),
    type: typeSelect.value,
    ...parseProjectValue(projectSelect.value),
    tagIds: readTagPicker(tagPicker),
  };
}

function saveRunning() {
  if (running) {
    writeStore("running", { ...running, ...currentFields() });
  } else {
    localStorage.removeItem("running");
  }
}

function updateClock() {
  const elapsed = Date.now() - running.start;
  clockMain.textContent = formatDuration(elapsed);
  clockFraction.textContent = "." + String(Math.floor((elapsed % 1000) / 10)).padStart(2, "0");
  frameRequest = requestAnimationFrame(updateClock);
}

function showRunningState() {
  startStopButton.textContent = "STOP";
  startStopButton.classList.add("running");
  frameRequest = requestAnimationFrame(updateClock);
}

function startTimer() {
  running = { start: Date.now() };
  saveRunning();
  showRunningState();
}

function stopTimer() {
  cancelAnimationFrame(frameRequest);
  addEntry({ ...currentFields(), start: running.start, end: Date.now() });

  running = null;
  saveRunning();
  clockMain.textContent = "00:00:00";
  clockFraction.textContent = ".00";
  setTimerFields({});
  startStopButton.textContent = "START";
  startStopButton.classList.remove("running");
}

function setTimerFields(entry) {
  descriptionInput.value = entry.description || "";
  fillTypeSelect(typeSelect, entry.type || "task");
  fillProjectSelect(projectSelect, entry.projectId ? projectValue(entry) : "");
  fillTagPicker(tagPicker, entry.tagIds || []);
}

function continueEntry(entry) {
  if (running) {
    stopTimer();
  }
  setMode("timer");
  setTimerFields(entry);
  startTimer();
}

startStopButton.addEventListener("click", () => {
  if (running) {
    stopTimer();
  } else {
    startTimer();
  }
});

for (const field of [descriptionInput, typeSelect, projectSelect, tagPicker]) {
  field.addEventListener("change", saveRunning);
}

/* Timer or manual mode */

function setMode(mode) {
  for (const button of modeButtons) {
    button.classList.toggle("selected", button.dataset.mode === mode);
  }
  timerFields.hidden = mode !== "timer";
  manualFields.hidden = mode !== "manual";
  if (mode === "manual" && !manualDate.value) {
    manualDate.value = dayKey(Date.now());
  }
}

for (const button of modeButtons) {
  button.addEventListener("click", () => setMode(button.dataset.mode));
}

manualAddButton.addEventListener("click", () => {
  if (!manualDate.value || !manualStart.value || !manualEnd.value) {
    alert("Please fill in the date, start time and end time.");
    return;
  }
  const start = fromDateAndTime(manualDate.value, manualStart.value);
  const end = fromDateAndTime(manualDate.value, manualEnd.value);
  if (end <= start) {
    alert("The end time must be after the start time.");
    return;
  }
  addEntry({ ...currentFields(), start, end });
  manualStart.value = "";
  manualEnd.value = "";
  setTimerFields({});
});

/* Entries */

function addEntry(fields) {
  store.entries.push({ id: uid(), ...fields });
  saveEntries();
  renderEntries();
}

function deleteEntry(id) {
  if (!confirm("Delete this time entry?")) return false;
  store.entries = store.entries.filter((entry) => entry.id !== id);
  saveEntries();
  renderEntries();
  return true;
}

function entryMeta(entry) {
  const meta = el("span", { class: "entry-meta" });
  const project = findProject(entry.projectId);
  if (project) {
    const task = findTask(project, entry.taskId);
    meta.append(
      el("span", { class: "project-chip", style: `color:${project.color}` },
        el("span", { class: "dot", style: `background:${project.color}` }),
        task ? `${project.name} › ${task.name}` : project.name
      )
    );
  }
  meta.append(el("span", { class: `type-chip type-${entry.type}` }, ENTRY_TYPES[entry.type] || entry.type));
  for (const tagId of entry.tagIds) {
    const tag = findTag(tagId);
    if (tag) meta.append(el("span", { class: "tag-chip" }, tag.name));
  }
  return meta;
}

function entryRow(entry) {
  return el("li", { class: `entry${entry.type === "break" ? " is-break" : ""}` },
    el("span", { class: "entry-main" },
      el("span", { class: `entry-description${entry.description ? "" : " no-description"}` },
        entry.description || "(no description)"
      ),
      entryMeta(entry)
    ),
    el("span", { class: "entry-times" }, `${formatTimeOfDay(entry.start)} – ${formatTimeOfDay(entry.end)}`),
    el("span", { class: "entry-duration" }, formatDuration(entry.end - entry.start)),
    el("span", { class: "entry-actions" },
      el("button", { class: "icon-button", title: "Continue this entry", onclick: () => continueEntry(entry) }, "▶"),
      el("button", { class: "icon-button", title: "Edit", onclick: () => openEditor(entry) }, "✎"),
      el("button", { class: "icon-button", title: "Delete", onclick: () => deleteEntry(entry.id) }, "✕")
    )
  );
}

function renderEntries() {
  const sorted = [...store.entries].sort((a, b) => b.start - a.start);
  emptyMessage.hidden = sorted.length > 0;

  const weekStart = startOfWeek(Date.now());
  const weekMs = sorted
    .filter((entry) => entry.start >= weekStart)
    .reduce((sum, entry) => sum + (entry.end - entry.start), 0);
  weekTotal.textContent = sorted.length ? `Week total ${formatDuration(weekMs)}` : "";

  const days = new Map();
  for (const entry of sorted) {
    const key = dayKey(entry.start);
    if (!days.has(key)) days.set(key, []);
    days.get(key).push(entry);
  }

  entryDays.replaceChildren(
    ...[...days].map(([key, dayEntries]) => {
      const total = dayEntries.reduce((sum, entry) => sum + (entry.end - entry.start), 0);
      return el("div", { class: "day-group" },
        el("div", { class: "day-header" },
          el("span", {}, dayLabel(key)),
          el("span", { class: "day-total" }, `Total ${formatDuration(total)}`)
        ),
        el("ul", { class: "entry-list" }, dayEntries.map(entryRow))
      );
    })
  );
}

/* Edit dialog */

function openEditor(entry) {
  editingId = entry.id;
  editDescription.value = entry.description;
  fillTypeSelect(editType, entry.type);
  fillProjectSelect(editProject, entry.projectId ? projectValue(entry) : "");
  fillTagPicker(editTags, entry.tagIds);
  editDate.value = dayKey(entry.start);
  editStart.value = timeKey(entry.start);
  editEnd.value = timeKey(entry.end);
  entryDialog.showModal();
}

entryForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const start = fromDateAndTime(editDate.value, editStart.value);
  const end = fromDateAndTime(editDate.value, editEnd.value);
  if (end <= start) {
    alert("The end time must be after the start time.");
    return;
  }
  const entry = store.entries.find((item) => item.id === editingId);
  Object.assign(entry, {
    description: editDescription.value.trim(),
    type: editType.value,
    ...parseProjectValue(editProject.value),
    tagIds: readTagPicker(editTags),
    start,
    end,
  });
  saveEntries();
  renderEntries();
  entryDialog.close();
});

editCancelButton.addEventListener("click", () => entryDialog.close());

editDeleteButton.addEventListener("click", () => {
  if (deleteEntry(editingId)) {
    entryDialog.close();
  }
});

/* Called by the Projects page when projects or tags change */
function refreshPickers() {
  const fields = currentFields();
  fillProjectSelect(projectSelect, fields.projectId ? projectValue(fields) : "");
  fillTagPicker(tagPicker, fields.tagIds);
  renderEntries();
}

/* Start up */

setTimerFields(running || {});
setMode("timer");
renderEntries();
if (running) {
  showRunningState();
}
