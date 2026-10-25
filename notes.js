// Sticky notes: a title and text, with when each note was added and every time it was edited.
// The same notes show in two places (a small card under the alarms, and the Notes page);
// each place is marked with data-notes in index.html.

const noteWidgets = [...document.querySelectorAll("[data-notes]")];

function noteDate(timestamp) {
  const date = new Date(timestamp).toLocaleDateString(locale(), { day: "numeric", month: "short", year: "numeric" });
  return `${date}, ${formatTimeOfDay(timestamp)}`;
}

function lastChange(note) {
  return note.edits?.length ? note.edits[note.edits.length - 1] : note.createdAt;
}

function noteCard(note, widget) {
  const edits = note.edits || [];
  return el("li", { class: "note" },
    el("div", { class: "note-top" },
      el("h3", { class: "note-title" }, note.title),
      el("span", { class: "note-actions" },
        el("button", { type: "button", class: "icon-button", title: t("Edit note"), onclick: () => openNoteForm(widget, note) }, "✎"),
        el("button", { type: "button", class: "icon-button", title: t("Delete note"), onclick: () => deleteNote(note) }, "✕")
      )
    ),
    note.body && el("p", { class: "note-body" }, note.body),
    el("details", { class: "note-history" },
      el("summary", {},
        t("Added {date}", { date: noteDate(note.createdAt) }),
        edits.length ? ` · ${edits.length === 1 ? t("Edited once") : t("Edited {count} times", { count: edits.length })}` : ""
      ),
      el("ul", {},
        el("li", {}, t("Added {date}", { date: noteDate(note.createdAt) })),
        ...edits.map((at) => el("li", {}, t("Edited {date}", { date: noteDate(at) })))
      )
    )
  );
}

function renderNotes() {
  const sorted = [...store.notes].sort((a, b) => lastChange(b) - lastChange(a));
  for (const widget of noteWidgets) {
    const list = widget.querySelector(".note-list");
    list.replaceChildren(
      ...(sorted.length
        ? sorted.map((note) => noteCard(note, widget))
        : [el("li", { class: "mini-empty note-empty" }, t("No notes yet."))])
    );
  }
}

/* Adding and editing */

function openNoteForm(widget, note = null) {
  const form = widget.querySelector(".note-form");
  form.dataset.noteId = note ? note.id : "";
  form.querySelector(".note-title-input").value = note ? note.title : "";
  form.querySelector(".note-body-input").value = note ? note.body : "";
  form.hidden = false;
  form.querySelector(".note-title-input").focus();
}

function closeNoteForm(widget) {
  const form = widget.querySelector(".note-form");
  form.hidden = true;
  form.reset();
  form.dataset.noteId = "";
}

function saveNoteForm(widget) {
  const form = widget.querySelector(".note-form");
  const title = form.querySelector(".note-title-input").value.trim();
  const body = form.querySelector(".note-body-input").value.trim();
  if (!title) return;
  const existing = store.notes.find((note) => note.id === form.dataset.noteId);
  if (existing) {
    // Only a real change counts as an edit
    if (existing.title !== title || existing.body !== body) {
      existing.title = title;
      existing.body = body;
      existing.edits = [...(existing.edits || []), Date.now()];
    }
  } else {
    store.notes.push({ id: uid(), title, body, createdAt: Date.now(), edits: [] });
  }
  saveNotes();
  closeNoteForm(widget);
  renderNotes();
}

function deleteNote(note) {
  const before = [...store.notes];
  store.notes = store.notes.filter((item) => item.id !== note.id);
  saveNotes();
  renderNotes();
  showToast(t("Note deleted."), [{
    label: t("Undo"),
    primary: true,
    run: () => {
      store.notes = before;
      saveNotes();
      renderNotes();
    },
  }]);
}

for (const widget of noteWidgets) {
  widget.querySelector(".notes-new").addEventListener("click", () => openNoteForm(widget));
  widget.querySelector(".note-cancel").addEventListener("click", () => closeNoteForm(widget));
  widget.querySelector(".note-form").addEventListener("submit", (event) => {
    event.preventDefault();
    saveNoteForm(widget);
  });
}

// From the small card on the home page to the Notes page
document.getElementById("notes-open").addEventListener("click", () => showView("notes"));

renderNotes();
