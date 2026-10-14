// Projects page: projects (with tasks, budget, privacy, archive) and tags

const projectForm = document.getElementById("project-form");
const projectNameInput = document.getElementById("project-name");
const projectColorInput = document.getElementById("project-color");
const projectBudgetInput = document.getElementById("project-budget");
const projectPrivacySelect = document.getElementById("project-privacy");
const showArchivedInput = document.getElementById("show-archived");
const projectList = document.getElementById("project-list");
const tagForm = document.getElementById("tag-form");
const tagNameInput = document.getElementById("tag-name");
const tagList = document.getElementById("tag-list");

function trackedMs(projectId) {
  return store.entries
    .filter((entry) => entry.projectId === projectId)
    .reduce((sum, entry) => sum + (entry.end - entry.start), 0);
}

function projectsChanged() {
  saveProjects();
  renderProjects();
  refreshPickers();
}

function budgetBar(project) {
  if (!project.budgetHours) return null;
  const used = trackedMs(project.id) / 3600000;
  const percent = Math.min(100, (used / project.budgetHours) * 100);
  return el("div", { class: "budget" },
    el("div", { class: "budget-bar" },
      el("div", { class: `budget-fill${used > project.budgetHours ? " over" : ""}`, style: `width:${percent}%` })
    ),
    el("span", { class: "budget-label" }, `${used.toFixed(1)} of ${project.budgetHours} h budget`)
  );
}

function taskSection(project) {
  const input = el("input", { class: "text-input small", type: "text", placeholder: "New task" });
  const addTask = () => {
    const name = input.value.trim();
    if (!name) return;
    project.tasks.push({ id: uid(), name });
    projectsChanged();
  };
  input.addEventListener("keydown", (event) => {
    if (event.key === "Enter") addTask();
  });

  return el("div", { class: "tasks" },
    el("div", { class: "chip-list" },
      project.tasks.map((task) =>
        el("span", { class: "tag-chip" },
          task.name,
          el("button", {
            class: "chip-remove",
            title: "Remove task",
            onclick: () => {
              project.tasks = project.tasks.filter((item) => item.id !== task.id);
              projectsChanged();
            },
          }, "×")
        )
      )
    ),
    el("div", { class: "inline-row" },
      input,
      el("button", { class: "secondary-button small", onclick: addTask }, "Add task")
    )
  );
}

function projectCard(project) {
  return el("div", { class: `project-card${project.archived ? " archived" : ""}` },
    el("div", { class: "project-header" },
      el("span", { class: "dot big", style: `background:${project.color}` }),
      el("span", { class: "project-name" }, project.name),
      el("span", { class: "badge" }, project.private ? "Private" : "Public"),
      project.archived && el("span", { class: "badge" }, "Archived"),
      el("span", { class: "project-tracked" }, `${formatDuration(trackedMs(project.id))} tracked`)
    ),
    budgetBar(project),
    taskSection(project),
    el("div", { class: "project-actions" },
      el("button", {
        class: "secondary-button small",
        onclick: () => {
          project.private = !project.private;
          projectsChanged();
        },
      }, project.private ? "Make public" : "Make private"),
      el("button", {
        class: "secondary-button small",
        onclick: () => {
          project.archived = !project.archived;
          projectsChanged();
        },
      }, project.archived ? "Unarchive" : "Archive"),
      el("button", {
        class: "secondary-button small danger",
        onclick: async () => {
          if (!await askConfirm(`Delete "${project.name}"? Its time entries are kept, without a project.`)) return;
          store.projects = store.projects.filter((item) => item.id !== project.id);
          for (const entry of store.entries) {
            if (entry.projectId === project.id) {
              entry.projectId = "";
              entry.taskId = "";
            }
          }
          saveEntries();
          projectsChanged();
        },
      }, "Delete")
    )
  );
}

function renderProjects() {
  const visible = store.projects.filter((project) => showArchivedInput.checked || !project.archived);
  projectList.replaceChildren(
    ...(visible.length
      ? visible.map(projectCard)
      : [el("p", { class: "empty" }, "No projects yet. Add your first one above.")])
  );

  tagList.replaceChildren(
    ...store.tags.map((tag) =>
      el("span", { class: "tag-chip" },
        tag.name,
        el("button", {
          class: "chip-remove",
          title: "Delete tag",
          onclick: () => {
            store.tags = store.tags.filter((item) => item.id !== tag.id);
            for (const entry of store.entries) {
              entry.tagIds = entry.tagIds.filter((id) => id !== tag.id);
            }
            saveTags();
            saveEntries();
            renderProjects();
            refreshPickers();
          },
        }, "×")
      )
    )
  );
}

projectForm.addEventListener("submit", (event) => {
  event.preventDefault();
  store.projects.push({
    id: uid(),
    name: projectNameInput.value.trim(),
    color: projectColorInput.value,
    budgetHours: Number(projectBudgetInput.value) || 0,
    private: projectPrivacySelect.value === "private",
    archived: false,
    tasks: [],
  });
  projectForm.reset();
  projectColorInput.value = randomColor();
  projectsChanged();
});

tagForm.addEventListener("submit", (event) => {
  event.preventDefault();
  store.tags.push({ id: uid(), name: tagNameInput.value.trim() });
  tagForm.reset();
  saveTags();
  renderProjects();
  refreshPickers();
});

showArchivedInput.addEventListener("change", renderProjects);

function randomColor() {
  const colors = ["#d77a93", "#b48ac9", "#6b7d47", "#14213a", "#6e1f2b", "#b89b5e", "#e8a87c", "#4a90a4", "#8a5a3b"];
  return colors[Math.floor(Math.random() * colors.length)];
}

// Tracked totals change as you work, so redraw whenever the page is opened
document.querySelector('.nav-item[data-view="projects"]').addEventListener("click", renderProjects);

projectColorInput.value = randomColor();
renderProjects();
