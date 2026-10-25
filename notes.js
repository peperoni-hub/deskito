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

// Who can see a note: people it's shared with, plus people who get all your notes
function sharedNames(note) {
  const people = typeof sharePeople === "function" ? sharePeople() : [];
  return people.filter((person) => noteSharedWith(note, person.email)).map((person) => person.name);
}

function noteHistory(note) {
  const edits = note.edits || [];
  return el("details", { class: "note-history" },
    el("summary", {},
      t("Added {date}", { date: noteDate(note.createdAt) }),
      edits.length ? ` · ${edits.length === 1 ? t("Edited once") : t("Edited {count} times", { count: edits.length })}` : ""
    ),
    el("ul", {},
      el("li", {}, t("Added {date}", { date: noteDate(note.createdAt) })),
      ...edits.map((at) => el("li", {}, t("Edited {date}", { date: noteDate(at) })))
    )
  );
}

function noteCard(note, widget) {
  const names = sharedNames(note);
  return el("li", { class: "note" },
    el("div", { class: "note-top" },
      el("h3", { class: "note-title" }, note.title),
      el("span", { class: "note-actions" },
        el("button", { type: "button", class: "icon-button", title: t("Edit note"), onclick: () => openNoteForm(widget, note) }, "✎"),
        el("button", { type: "button", class: "icon-button", title: t("Delete note"), onclick: () => deleteNote(note) }, "✕")
      )
    ),
    note.body && el("p", { class: "note-body" }, note.body),
    names.length > 0 && el("span", { class: "note-shared-chip" }, `🔗 ${t("Shared with {names}", { names: names.join(", ") })}`),
    noteHistory(note)
  );
}

// Notes other people share with you: read-only, with who they're from
function renderSharedNotes() {
  const section = document.getElementById("shared-notes-section");
  const list = document.getElementById("shared-note-list");
  const calendars = typeof sharedCalendars === "undefined" ? [] : sharedCalendars;
  const notes = calendars.flatMap((calendar) => (calendar.notes || []).map((note) => ({ ...note, from: calendar.name })));
  notes.sort((a, b) => lastChange(b) - lastChange(a));
  section.hidden = notes.length === 0;
  list.replaceChildren(...notes.map((note) =>
    el("li", { class: "note shared-note" },
      el("div", { class: "note-top" },
        el("h3", { class: "note-title" }, note.title),
        el("span", { class: "note-from" }, t("From {name}", { name: note.from }))
      ),
      note.body && el("p", { class: "note-body" }, note.body),
      noteHistory(note)
    )
  ));
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

// "Share with": nobody (the default), everyone you share with, or chosen people
function fillShareChoices(form, sharedWith) {
  const box = form.querySelector(".note-share");
  const people = typeof sharePeople === "function" ? sharePeople() : [];
  if (!people.length) {
    box.replaceChildren(el("p", { class: "hint left" }, t("To share notes, first share with someone in Settings → Sharing.")));
    return;
  }
  const choice = (value, label, extra = "") => el("label", { class: `share-switch${extra}` },
    el("input", { type: "checkbox", value, checked: sharedWith.includes(value) }),
    label
  );
  box.replaceChildren(
    el("span", { class: "field-label" }, t("Share with")),
    el("div", { class: "share-switches" },
      choice("all", t("Everyone I share with"), " everyone"),
      ...people.map((person) => {
        const label = settingsFor(person.email).allNotes ? `${person.name} (${t("gets all your notes")})` : person.name;
        return choice(person.email, label);
      })
    )
  );
  // "Everyone" makes the single names unnecessary
  const everyone = box.querySelector('input[value="all"]');
  const update = () => {
    for (const input of box.querySelectorAll('input:not([value="all"])')) input.disabled = everyone.checked;
  };
  everyone.addEventListener("change", update);
  update();
}

function readShareChoices(form) {
  const checked = [...form.querySelectorAll(".note-share input:checked")].map((input) => input.value);
  return checked.includes("all") ? ["all"] : checked;
}

function openNoteForm(widget, note = null) {
  const form = widget.querySelector(".note-form");
  form.dataset.noteId = note ? note.id : "";
  form.querySelector(".note-title-input").value = note ? note.title : "";
  form.querySelector(".note-body-input").value = note ? note.body : "";
  fillShareChoices(form, note?.sharedWith || []);
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
  // Without anyone to share with there are no choices; keep what the note had
  const hasChoices = Boolean(form.querySelector(".note-share input"));
  const existing = store.notes.find((note) => note.id === form.dataset.noteId);
  const sharedWith = hasChoices ? readShareChoices(form) : existing?.sharedWith || [];
  if (existing) {
    // Only a change to the title or text counts as an edit (sharing isn't one)
    if (existing.title !== title || existing.body !== body) {
      existing.title = title;
      existing.body = body;
      existing.edits = [...(existing.edits || []), Date.now()];
    }
    existing.sharedWith = sharedWith;
  } else {
    store.notes.push({ id: uid(), title, body, createdAt: Date.now(), edits: [], sharedWith });
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
