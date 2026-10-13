# Deskito: Plan

A time-tracking app inspired by Clockify, built to learn git. First for me, later for other people too.

**Slogan:** Every minute in its place.

## Tech stack
- **Phase A:** HTML, CSS, JavaScript. Runs in the browser, works fully offline, data saved in the browser.
- **Phase B:** add Supabase (accounts, shared database, emails) and put the app online.

## Phase A: works without a server

| Step | What we build | Git lesson |
|---|---|---|
| 0 | This plan | Set up git, first commit ✅ |
| 1 | Basic timer | Small commits, `git diff` ✅ |
| 2 | Save entries in a list | Branches and merging ✅ |
| 3 | Three themes (feminine, old money, neutral olive), welcome screen that picks the theme, switch theme in settings | Undoing mistakes (`git restore`, `git revert`) |
| 4 | Projects, tasks, tags, entry types (project / meeting / task / break), budgets, archive, private/public flag | Time travel through history, `.gitignore` |
| 5 | Timer upgrades: manual mode, continue, grouping, bulk edit | Two branches at once, `git stash` |
| 6 | Own Pomodoro (e.g. 50/10, 30/20), automatic break alarm (default: 10 min after 1 hour), reminders | Merge conflicts (on purpose) |
| 7 | Calendar (plans, meetings, time blocks) and timesheet view | VS Code Source Control panel |
| 8 | Reports (summary, detailed, weekly, attendance, assignments), filters, export | Tagging `v1.0` |
| 9 | Dark mode, keyboard shortcuts | Practice on your own |

## Phase B: needs a server (later)
- Put the code on GitHub and the app online (remotes, `push`, `pull`, pull requests)
- Real sign-up and login (the welcome question becomes part of sign-up)
- Teams, roles, groups, approvals, scheduling, time off, holidays, audit log
- Public and private projects shared within a team
- Scheduled reports emailed only to team leaders or their assistants
- Offline: only the timer works and entries go into today; sorting them out syncs once online

## How we work
- I write the app code; you type the git commands.
- Every change follows the loop: **edit → check (`git status` / `git diff`) → stage (`git add`) → commit (`git commit`)**.
- Every feature gets its own branch: **create → commit → switch to main → merge → delete**.
- One step per session, with a short recap of the commands at the end.
