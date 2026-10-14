// Reports page: summary, detailed, weekly, attendance, planned vs actual, and exports

const reportRange = document.getElementById("report-range");
const reportCustom = document.getElementById("report-custom");
const reportFrom = document.getElementById("report-from");
const reportTo = document.getElementById("report-to");
const reportProject = document.getElementById("report-project");
const reportTag = document.getElementById("report-tag");
const reportType = document.getElementById("report-type");
const reportText = document.getElementById("report-text");
const reportTabs = document.querySelectorAll(".report-tab");
const reportBody = document.getElementById("report-body");
const exportCsvButton = document.getElementById("export-csv");
const exportPdfButton = document.getElementById("export-pdf");
const chartTip = document.getElementById("chart-tip");

let reportTab = "summary";
let summaryGroup = "project";

/* Which entries are in the report */

function reportPeriod() {
  const now = Date.now();
  const today = dayStart(dayKey(now));
  switch (reportRange.value) {
    case "today":
      return [today, addDays(today, 1)];
    case "last-week":
      return [addDays(startOfWeek(now), -7), startOfWeek(now)];
    case "this-month":
      return [startOfMonth(now), addMonths(now, 1)];
    case "last-month":
      return [addMonths(now, -1), startOfMonth(now)];
    case "this-year": {
      const yearStart = new Date(new Date(now).getFullYear(), 0, 1).getTime();
      return [yearStart, new Date(new Date(now).getFullYear() + 1, 0, 1).getTime()];
    }
    case "custom": {
      const from = reportFrom.value ? dayStart(reportFrom.value) : today;
      const to = reportTo.value ? addDays(dayStart(reportTo.value), 1) : addDays(today, 1);
      return [from, Math.max(to, addDays(from, 1))];
    }
    default:
      return [startOfWeek(now), addDays(startOfWeek(now), 7)];
  }
}

function reportEntries() {
  const [from, to] = reportPeriod();
  const text = reportText.value.trim().toLowerCase();
  return store.entries
    .filter((entry) => entry.start >= from && entry.start < to)
    .filter((entry) => !reportProject.value
      || (reportProject.value === "none" ? !entry.projectId : entry.projectId === reportProject.value))
    .filter((entry) => !reportTag.value || entry.tagIds.includes(reportTag.value))
    .filter((entry) => !reportType.value || entry.type === reportType.value)
    .filter((entry) => !text || entry.description.toLowerCase().includes(text))
    .sort((a, b) => a.start - b.start);
}

function daysInPeriod() {
  const [from, to] = reportPeriod();
  const days = [];
  for (let day = from; day < to; day = addDays(day, 1)) days.push(day);
  return days;
}

const msOf = (entry) => entry.end - entry.start;
const sumMs = (entries) => entries.reduce((sum, entry) => sum + msOf(entry), 0);

function hoursLabel(milliseconds) {
  return formatDuration(milliseconds).replace(/:\d\d$/, "");
}

/* Building blocks */

function statTile(label, value) {
  return el("div", { class: "stat-tile" },
    el("span", { class: "stat-label" }, label),
    el("span", { class: "stat-value" }, value)
  );
}

function reportCard(title, ...content) {
  return el("section", { class: "report-card" }, el("h3", { class: "report-card-title" }, title), ...content);
}

function emptyReport() {
  return el("p", { class: "empty" }, t("No time entries match this period and these filters."));
}

// Horizontal bars on one shared scale, with the value written beside each bar
function barList(rows) {
  const max = Math.max(...rows.map((row) => row.ms), 1);
  const total = rows.reduce((sum, row) => sum + row.ms, 0);
  return el("div", { class: "bar-list" },
    rows.map((row) => {
      const percent = total ? Math.round((row.ms / total) * 100) : 0;
      return el("div", { class: "bar-row", "data-tip": `${row.label}: ${formatDuration(row.ms)} (${percent}%)` },
        el("span", { class: "bar-label" },
          row.color && el("span", { class: "dot", style: `background:${row.color}` }),
          row.label
        ),
        el("span", { class: "bar-track" },
          el("span", { class: "bar-fill", style: `width:${(row.ms / max) * 100}%;${row.color ? `background:${row.color}` : ""}` })
        ),
        el("span", { class: "bar-value" }, formatDuration(row.ms)),
        el("span", { class: "bar-percent" }, `${percent}%`)
      );
    })
  );
}

// Columns per day (or per month for long periods)
function timeChart(entries) {
  const days = daysInPeriod();
  const byMonth = days.length > 62;
  const buckets = new Map();
  for (const day of days) {
    const key = byMonth ? dayKey(day).slice(0, 7) : dayKey(day);
    if (!buckets.has(key)) buckets.set(key, { day, ms: 0 });
  }
  for (const entry of entries) {
    const key = byMonth ? dayKey(entry.start).slice(0, 7) : dayKey(entry.start);
    if (buckets.has(key)) buckets.get(key).ms += msOf(entry);
  }

  const values = [...buckets.values()];
  const max = Math.max(...values.map((bucket) => bucket.ms), 1);
  const labelEvery = Math.ceil(values.length / 14);
  return el("div", { class: "column-chart" },
    values.map((bucket, i) => {
      const label = byMonth
        ? new Date(bucket.day).toLocaleDateString(locale(), { month: "short" })
        : new Date(bucket.day).toLocaleDateString(locale(), values.length > 7 ? { day: "numeric" } : { weekday: "short", day: "numeric" });
      return el("div", { class: "column", "data-tip": `${label}: ${formatDuration(bucket.ms)}` },
        el("span", { class: "column-value" }, bucket.ms && values.length <= 14 ? hoursLabel(bucket.ms) : ""),
        el("span", { class: "column-bar-area" },
          el("span", { class: "column-bar", style: `height:${(bucket.ms / max) * 100}%` })
        ),
        el("span", { class: "column-label" }, i % labelEvery === 0 ? label : "")
      );
    })
  );
}

function groupEntries(entries, by) {
  const groups = new Map();
  const add = (key, label, color, entry) => {
    if (!groups.has(key)) groups.set(key, { label, color, ms: 0 });
    groups.get(key).ms += msOf(entry);
  };
  for (const entry of entries) {
    if (by === "project") {
      const project = findProject(entry.projectId);
      add(entry.projectId || "none", project ? project.name : t("No project"), project?.color || "var(--text-muted)", entry);
    } else if (by === "type") {
      add(entry.type, t(t(ENTRY_TYPES[entry.type] || entry.type)), "", entry);
    } else if (by === "tag") {
      const tags = entry.tagIds.map(findTag).filter(Boolean);
      if (tags.length === 0) add("none", t("No tag"), "", entry);
      for (const tag of tags) add(tag.id, tag.name, "", entry);
    } else {
      add(entry.description || "(no description)", entry.description || t("(no description)"), "", entry);
    }
  }
  return [...groups.values()].sort((a, b) => b.ms - a.ms);
}

/* Tabs */

function renderSummary(entries) {
  const working = entries.filter((entry) => entry.type !== "break");
  const breaks = entries.filter((entry) => entry.type === "break");
  const activeDays = new Set(working.map((entry) => dayKey(entry.start))).size;

  const groupSelect = el("select", { class: "picker" },
    el("option", { value: "project" }, t("Project")),
    el("option", { value: "type" }, t("Type")),
    el("option", { value: "tag" }, t("Tag")),
    el("option", { value: "description" }, t("Description"))
  );
  groupSelect.value = summaryGroup;
  groupSelect.addEventListener("change", () => {
    summaryGroup = groupSelect.value;
    renderReports();
  });

  return [
    el("div", { class: "stat-row" },
      statTile(t("Total time"), formatDuration(sumMs(entries))),
      statTile(t("Working time"), formatDuration(sumMs(working))),
      statTile(t("Breaks"), formatDuration(sumMs(breaks))),
      statTile(t("Average per working day"), formatDuration(activeDays ? sumMs(working) / activeDays : 0)),
      statTile(t("Entries"), String(entries.length))
    ),
    reportCard(t("Time per day"), timeChart(entries)),
    reportCard(t("Breakdown"),
      el("label", { class: "setting-row" }, t("Group by"), groupSelect),
      barList(groupEntries(entries, summaryGroup))
    ),
  ];
}

function renderDetailed(entries) {
  const rows = [...entries].reverse().map((entry) => {
    const project = findProject(entry.projectId);
    const task = findTask(project, entry.taskId);
    return el("tr", { class: "clickable", onclick: () => openEditor(entry), title: t("Click to edit") },
      el("td", {}, new Date(entry.start).toLocaleDateString(locale())),
      el("td", {}, entry.description || t("(no description)")),
      el("td", {}, project ? el("span", { class: "project-chip", style: `color:${project.color}` },
        el("span", { class: "dot", style: `background:${project.color}` }), task ? `${project.name} › ${task.name}` : project.name) : "–"),
      el("td", {}, t(ENTRY_TYPES[entry.type] || entry.type)),
      el("td", {}, entry.tagIds.map((id) => findTag(id)?.name).filter(Boolean).join(", ") || "–"),
      el("td", {}, `${formatTimeOfDay(entry.start)} – ${formatTimeOfDay(entry.end)}`),
      el("td", { class: "num" }, formatDuration(msOf(entry)))
    );
  });
  return [
    reportCard(t("All entries ({count})", { count: entries.length }),
      el("div", { class: "table-wrap" },
        el("table", { class: "report-table" },
          el("thead", {}, el("tr", {}, ["Date", "Description", "Project", "Type", "Tags", "Time", "Duration"].map((h, i) => el("th", { class: i === 6 ? "num" : "" }, t(h))))),
          el("tbody", {}, rows),
          el("tfoot", {}, el("tr", {}, el("td", { colspan: "6" }, t("Total")), el("td", { class: "num" }, formatDuration(sumMs(entries)))))
        )
      )
    ),
  ];
}

function renderWeekly(entries) {
  let columns = daysInPeriod().map((day) => ({ from: day, to: addDays(day, 1), label: new Date(day).toLocaleDateString(locale(), { weekday: "short", day: "numeric" }) }));
  if (columns.length > 14) {
    // Long periods: one column per week instead of per day
    const weeks = new Map();
    for (const column of columns) {
      const week = startOfWeek(column.from);
      if (!weeks.has(week)) weeks.set(week, { from: column.from, to: column.to, label: t("Week of {date}", { date: new Date(week).toLocaleDateString(locale(), { day: "numeric", month: "short" }) }) });
      weeks.get(week).to = column.to;
    }
    columns = [...weeks.values()];
  }

  const projects = groupEntries(entries, "project");
  const cell = (list, column) => sumMs(list.filter((entry) => entry.start >= column.from && entry.start < column.to));
  const forProject = (label) => entries.filter((entry) => (findProject(entry.projectId)?.name || t("No project")) === label);

  return [
    reportCard(t("Hours per project"),
      el("div", { class: "table-wrap" },
        el("table", { class: "report-table grid" },
          el("thead", {}, el("tr", {}, el("th", {}, t("Project")), columns.map((column) => el("th", { class: "num" }, column.label)), el("th", { class: "num" }, t("Total")))),
          el("tbody", {}, projects.map((group) => {
            const list = forProject(group.label);
            return el("tr", {},
              el("td", {}, group.color && el("span", { class: "dot", style: `background:${group.color}` }), group.label),
              columns.map((column) => {
                const ms = cell(list, column);
                return el("td", { class: `num${ms ? "" : " zero"}` }, ms ? hoursLabel(ms) : "–");
              }),
              el("td", { class: "num strong" }, hoursLabel(group.ms))
            );
          })),
          el("tfoot", {}, el("tr", {}, el("td", {}, t("Total")),
            columns.map((column) => el("td", { class: "num" }, hoursLabel(cell(entries, column)))),
            el("td", { class: "num" }, hoursLabel(sumMs(entries)))
          ))
        )
      )
    ),
  ];
}

function renderAttendance(entries) {
  const workDay = timeRange("2000-01-01", prefs.workStart, prefs.workEnd);
  const workDayMs = workDay.end - workDay.start;
  const days = new Map();
  for (const entry of entries) {
    const key = dayKey(entry.start);
    if (!days.has(key)) days.set(key, []);
    days.get(key).push(entry);
  }

  const rows = [...days].reverse().map(([key, list]) => {
    const work = sumMs(list.filter((entry) => entry.type !== "break"));
    const breaks = sumMs(list.filter((entry) => entry.type === "break"));
    const first = Math.min(...list.map((entry) => entry.start));
    const last = Math.max(...list.map((entry) => entry.end));
    const overtime = work - workDayMs;
    return el("tr", {},
      el("td", {}, dayLabel(key)),
      el("td", {}, formatTimeOfDay(first)),
      el("td", {}, formatTimeOfDay(last)),
      el("td", { class: "num" }, hoursLabel(work)),
      el("td", { class: "num" }, hoursLabel(breaks)),
      el("td", { class: `num ${overtime > 0 ? "over" : "under"}` }, `${overtime >= 0 ? "+" : "−"}${hoursLabel(Math.abs(overtime))}`)
    );
  });

  return [
    reportCard(t("Attendance (work day: {start}–{end}, change it in Settings → Reminders)", { start: prefs.workStart, end: prefs.workEnd }),
      el("div", { class: "table-wrap" },
        el("table", { class: "report-table" },
          el("thead", {}, el("tr", {}, ["Day", "First in", "Last out", "Worked", "Breaks", "Overtime"].map((h, i) => el("th", { class: i >= 3 ? "num" : "" }, t(h))))),
          el("tbody", {}, rows)
        )
      )
    ),
  ];
}

function renderAssignments(entries) {
  const [from, to] = reportPeriod();
  const plans = store.plans.filter((plan) => plan.start >= from && plan.start < to && plan.type !== "other");
  const working = entries.filter((entry) => entry.type !== "break");

  const projectIds = new Set([...plans.map((plan) => plan.projectId || "none"), ...working.map((entry) => entry.projectId || "none")]);
  const rows = [...projectIds].map((id) => {
    const project = findProject(id);
    return {
      label: project ? project.name : t("No project"),
      color: project?.color || "",
      planned: plans.filter((plan) => (plan.projectId || "none") === id).reduce((sum, plan) => sum + plan.end - plan.start, 0),
      actual: sumMs(working.filter((entry) => (entry.projectId || "none") === id)),
    };
  }).sort((a, b) => b.planned + b.actual - (a.planned + a.actual));

  const max = Math.max(...rows.flatMap((row) => [row.planned, row.actual]), 1);
  return [
    el("div", { class: "stat-row" },
      statTile(t("Planned"), formatDuration(rows.reduce((sum, row) => sum + row.planned, 0))),
      statTile(t("Tracked"), formatDuration(sumMs(working)))
    ),
    reportCard(t("Planned vs tracked, per project"),
      el("div", { class: "legend-row" },
        el("span", {}, el("i", { class: "legend-swatch planned" }), t("Planned (calendar)")),
        el("span", {}, el("i", { class: "legend-swatch" }), t("Tracked (timer)"))
      ),
      rows.length === 0 ? el("p", { class: "mini-empty" }, t("Nothing planned or tracked in this period.")) : el("div", { class: "bar-list" },
        rows.map((row) =>
          el("div", { class: "bar-row double", "data-tip": t("{label}: planned {planned}, tracked {tracked}", { label: row.label, planned: formatDuration(row.planned), tracked: formatDuration(row.actual) }) },
            el("span", { class: "bar-label" }, row.color && el("span", { class: "dot", style: `background:${row.color}` }), row.label),
            el("span", { class: "bar-pair" },
              el("span", { class: "bar-track" }, el("span", { class: "bar-fill planned", style: `width:${(row.planned / max) * 100}%` })),
              el("span", { class: "bar-track" }, el("span", { class: "bar-fill", style: `width:${(row.actual / max) * 100}%` }))
            ),
            el("span", { class: "bar-value" }, `${hoursLabel(row.planned)} / ${hoursLabel(row.actual)}`),
            el("span", { class: `bar-percent ${row.actual > row.planned ? "over" : ""}` },
              row.planned ? `${Math.round((row.actual / row.planned) * 100)}%` : "–")
          )
        )
      )
    ),
  ];
}

function renderReports() {
  for (const tab of reportTabs) {
    tab.classList.toggle("selected", tab.dataset.reportTab === reportTab);
  }
  reportCustom.hidden = reportRange.value !== "custom";

  const entries = reportEntries();
  if (entries.length === 0 && reportTab !== "assignments") {
    reportBody.replaceChildren(emptyReport());
    return;
  }
  const render = {
    summary: renderSummary,
    detailed: renderDetailed,
    weekly: renderWeekly,
    attendance: renderAttendance,
    assignments: renderAssignments,
  }[reportTab];
  reportBody.replaceChildren(...render(entries));
}

/* Filters */

function fillReportFilters() {
  const keep = [reportProject.value, reportTag.value, reportType.value];
  reportProject.replaceChildren(
    el("option", { value: "" }, t("All projects")),
    el("option", { value: "none" }, t("No project")),
    ...store.projects.map((project) => el("option", { value: project.id }, project.name))
  );
  reportTag.replaceChildren(el("option", { value: "" }, t("All tags")), ...store.tags.map((tag) => el("option", { value: tag.id }, tag.name)));
  reportType.replaceChildren(el("option", { value: "" }, t("All types")), ...Object.entries(ENTRY_TYPES).map(([key, label]) => el("option", { value: key }, t(label))));
  [reportProject.value, reportTag.value, reportType.value] = keep;
}

for (const control of [reportRange, reportFrom, reportTo, reportProject, reportTag, reportType]) {
  control.addEventListener("change", renderReports);
}
reportText.addEventListener("input", renderReports);

for (const tab of reportTabs) {
  tab.addEventListener("click", () => {
    reportTab = tab.dataset.reportTab;
    renderReports();
  });
}

document.querySelector('.nav-item[data-view="reports"]').addEventListener("click", () => {
  fillReportFilters();
  renderReports();
});

document.addEventListener("entries-changed", () => {
  if (!document.querySelector('.view[data-view="reports"]').hidden) renderReports();
});

/* Hover tooltip for charts */

document.addEventListener("mousemove", (event) => {
  const target = event.target.closest("[data-tip]");
  if (!target) {
    chartTip.hidden = true;
    return;
  }
  chartTip.textContent = target.dataset.tip;
  chartTip.hidden = false;
  chartTip.style.left = `${Math.min(event.clientX + 14, window.innerWidth - chartTip.offsetWidth - 8)}px`;
  chartTip.style.top = `${event.clientY + 14}px`;
});

/* Exports */

function downloadFile(name, content, type) {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const link = el("a", { href: url, download: name });
  document.body.append(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function csvCell(value) {
  const text = String(value ?? "");
  return /[",\n;]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

exportCsvButton.addEventListener("click", () => {
  const header = ["Date", "Start", "End", "Duration", "Duration (hours)", "Description", "Project", "Task", "Type", "Tags"].map((name) => t(name));
  const lines = reportEntries().map((entry) => {
    const project = findProject(entry.projectId);
    return [
      dayKey(entry.start),
      timeKey(entry.start),
      timeKey(entry.end),
      formatDuration(msOf(entry)),
      (msOf(entry) / 3600000).toFixed(2),
      entry.description,
      project?.name || "",
      findTask(project, entry.taskId)?.name || "",
      t(ENTRY_TYPES[entry.type] || entry.type),
      entry.tagIds.map((id) => findTag(id)?.name).filter(Boolean).join(", "),
    ].map(csvCell).join(",");
  });
  // The invisible mark at the start makes Excel read special letters (č, ć, š...) correctly
  downloadFile(`deskito-report-${dayKey(Date.now())}.csv`, "﻿" + [header.join(","), ...lines].join("\r\n"), "text/csv;charset=utf-8");
});

exportPdfButton.addEventListener("click", () => window.print());
