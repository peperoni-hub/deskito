// Time Tracker page: timer, manual entries and the list of entries

const descriptionInput = document.getElementById("description");
const typeSelect = document.getElementById("entry-type");
const projectSelect = document.getElementById("entry-project");
const tagPicker = document.getElementById("entry-tags");
const clockMain = document.getElementById("clock-main");
const clockFraction = document.getElementById("clock-fraction");
const startStopButton = document.getElementById("start-stop");
const discardButton = document.getElementById("discard-timer");
const pauseButton = document.getElementById("pause-timer");
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

// The running timer is saved, so it keeps going after a refresh.
// sessionMs: time from earlier parts of this session (before a pause)
let running = readStore("running", null);
// A paused timer: its time so far is already saved as entries; Continue starts a new part
let pausedTimer = readStore("paused", null);
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

function showClock(elapsed) {
  clockMain.textContent = formatDuration(elapsed);
  clockFraction.textContent = "." + String(Math.floor((elapsed % 1000) / 10)).padStart(2, "0");
}

function updateClock() {
  showClock((running.sessionMs || 0) + Date.now() - running.start);
  frameRequest = requestAnimationFrame(updateClock);
}

function showRunningState() {
  cancelAnimationFrame(frameRequest);
  startStopButton.textContent = t("STOP");
  startStopButton.classList.add("running");
  startStopButton.classList.remove("paused");
  pauseButton.textContent = `⏸ ${t("PAUSE")}`;
  pauseButton.hidden = false;
  discardButton.hidden = false;
  clockMain.parentElement.classList.remove("paused");
  frameRequest = requestAnimationFrame(updateClock);
}

function savePaused() {
  if (pausedTimer) {
    writeStore("paused", pausedTimer);
  } else {
    localStorage.removeItem("paused");
  }
}

function showPausedState() {
  cancelAnimationFrame(frameRequest);
  showClock(pausedTimer.sessionMs);
  startStopButton.textContent = `▶ ${t("CONTINUE")}`;
  startStopButton.classList.remove("running");
  startStopButton.classList.add("paused");
  pauseButton.textContent = `■ ${t("STOP")}`;
  pauseButton.hidden = false;
  discardButton.hidden = true;
  clockMain.parentElement.classList.add("paused");
}

// Pause: save the time so far as an entry, and remember what you were doing
function pauseTimer() {
  const fields = { ...currentFields(), planId: running.planId || "" };
  const sessionMs = (running.sessionMs || 0) + Date.now() - running.start;
  stopTimer();
  pausedTimer = { ...fields, sessionMs, pausedAt: Date.now() };
  savePaused();
  setTimerFields(fields);
  showPausedState();
}

// Continue: a new part with the same task, project and tags; the clock adds up the session
function continueTimer() {
  const paused = pausedTimer;
  pausedTimer = null;
  savePaused();
  setTimerFields(paused);
  running = { start: Date.now(), planId: paused.planId || "", sessionMs: paused.sessionMs };
  saveRunning();
  showRunningState();
}

// Done for now: the paused session's time is already saved
function finishPaused() {
  pausedTimer = null;
  savePaused();
  resetTimer();
}

function resetTimer() {
  cancelAnimationFrame(frameRequest);
  running = null;
  saveRunning();
  clockMain.textContent = "00:00:00";
  clockFraction.textContent = ".00";
  setTimerFields({});
  startStopButton.textContent = t("START");
  startStopButton.classList.remove("running", "paused");
  pauseButton.hidden = true;
  discardButton.hidden = true;
  clockMain.parentElement.classList.remove("paused");
}

// Throw away the running timer without saving it
discardButton.addEventListener("click", async () => {
  if (await askConfirm(t("Discard the running timer? This time won't be saved."), t("Discard"))) {
    resetTimer();
  }
});

function startTimer(planId = "") {
  // Starting something new ends a paused session (its time is already saved)
  if (pausedTimer) {
    pausedTimer = null;
    savePaused();
  }
  running = { start: Date.now(), planId };
  saveRunning();
  showRunningState();
}

// end: when it stopped (earlier than now if the computer was off)
function stopTimer(end = Date.now()) {
  addEntry({ ...currentFields(), planId: running.planId || "", start: running.start, end: Math.max(end, running.start) });
  resetTimer();
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
  startTimer(entry.planId || "");
}

startStopButton.addEventListener("click", () => {
  if (running) {
    stopTimer();
  } else if (pausedTimer) {
    continueTimer();
  } else {
    startTimer();
  }
});

// Pause while running; Stop while paused
pauseButton.addEventListener("click", () => {
  if (running) {
    pauseTimer();
  } else if (pausedTimer) {
    finishPaused();
  }
});

for (const field of [descriptionInput, typeSelect, projectSelect, tagPicker]) {
  field.addEventListener("change", () => {
    if (pausedTimer) {
      pausedTimer = { ...pausedTimer, ...currentFields() };
      savePaused();
    } else {
      saveRunning();
    }
  });
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

manualAddButton.addEventListener("click", async () => {
  if (!manualDate.value || !manualStart.value || !manualEnd.value) {
    notify(t("Please fill in the date, start time and end time."));
    return;
  }
  const { start, end } = timeRange(manualDate.value, manualStart.value, manualEnd.value);
  if (end === start) {
    notify(t("The start and end time can't be the same."));
    return;
  }
  if (!await timesLookRight(start, end)) return;
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

// Deleting happens straight away, with an Undo button in case it was a mistake
function deleteEntries(ids, message) {
  const removed = store.entries.filter((entry) => ids.has(entry.id));
  store.entries = store.entries.filter((entry) => !ids.has(entry.id));
  saveEntries();
  renderEntries();
  showToast(message, [{
    label: t("Undo"),
    primary: true,
    run: () => {
      store.entries.push(...removed);
      saveEntries();
      renderEntries();
    },
  }]);
}

function deleteEntry(id) {
  deleteEntries(new Set([id]), t("Time entry deleted."));
  return true;
}

async function deleteDay(key, dayEntries) {
  if (!await askConfirm(t("Delete all {count} entries from {day}?", { count: dayEntries.length, day: dayLabel(key) }))) return;
  deleteEntries(new Set(dayEntries.map((entry) => entry.id)), t("{day} deleted.", { day: dayLabel(key) }));
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
  meta.append(el("span", { class: `type-chip type-${entry.type}` }, t(ENTRY_TYPES[entry.type] || entry.type)));
  for (const tagId of entry.tagIds) {
    const tag = findTag(tagId);
    if (tag) meta.append(el("span", { class: "tag-chip" }, tag.name));
  }
  return meta;
}

function entryRow(entry) {
  // Finished events from "Upcoming" are shown faded, with a tick
  return el("li", { class: `entry${entry.type === "break" ? " is-break" : ""}${entry.fromEvent ? " from-event" : ""}` },
    el("span", { class: "entry-main" },
      el("span", { class: `entry-description${entry.description ? "" : " no-description"}` },
        entry.fromEvent && el("span", { class: "event-done-mark", title: t("Done") }, "✓ "),
        entry.description || t("(no description)")
      ),
      entryMeta(entry)
    ),
    el("span", { class: "entry-times" }, entry.allDay ? t("All day") : entry.end === entry.start ? formatTimeOfDay(entry.start) : `${formatTimeOfDay(entry.start)} – ${formatTimeOfDay(entry.end)}`),
    el("span", { class: "entry-duration" }, entry.allDay || entry.end === entry.start ? "" : formatDuration(entry.end - entry.start)),
    el("span", { class: "entry-actions" },
      el("button", { class: "icon-button", title: t("Continue this entry"), onclick: () => continueEntry(entry) }, "▶"),
      el("button", { class: "icon-button", title: t("Edit"), onclick: () => openEditor(entry) }, "✎"),
      el("button", { class: "icon-button", title: t("Delete"), onclick: () => deleteEntry(entry.id) }, "✕")
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
  weekTotal.textContent = sorted.length ? t("Week total {time}", { time: formatDuration(weekMs) }) : "";

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
          el("span", { class: "day-tools" },
            el("button", { class: "link-button", onclick: () => deleteDay(key, dayEntries) }, t("Delete day")),
            el("span", { class: "day-total" }, t("Total {time}", { time: formatDuration(total) }))
          )
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

entryForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const { start, end } = timeRange(editDate.value, editStart.value, editEnd.value);
  if (end === start) {
    notify(t("The start and end time can't be the same."));
    return;
  }
  if (!await timesLookRight(start, end)) return;
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

if (running && pausedTimer) {
  pausedTimer = null;
  savePaused();
}
setTimerFields(running || pausedTimer || {});
setMode("timer");
renderEntries();
if (running) {
  showRunningState();
} else if (pausedTimer) {
  showPausedState();
}
