# My Clockify App: Plan

A personal time-tracking app that looks like Clockify, built to learn git.

## Tech stack
- **HTML, CSS, JavaScript**: a web page that opens in the browser, nothing to install.
- **Data is saved in the browser** on this computer. Use the backup/export button (Step 6) to keep it safe.

## Steps

| Step | What we build | Git lesson |
|---|---|---|
| 0 | This plan | Set up git, first commit (`status`, `add`, `commit`, `log`) |
| 1 | Basic timer: description, Start/Stop, running clock | Small commits, good messages, `git diff` |
| 2 | Save entries in a list that survives closing the browser | Branches and merging |
| 3 | Projects with colours | Undoing mistakes (`git restore`, `git revert`) |
| 4 | Edit, delete and manually add entries | Time travel through history, `.gitignore` |
| 5 | Tags (e.g. "meeting", "admin") | Working on two branches at once |
| 6 | Reports and charts, CSV export and backup | Merge conflicts (on purpose), tagging `v1.0` |
| 7 | *(Later, optional)* Put it on GitHub | Remotes, `push`, `pull`, GitHub Pages |

## How we work
- I write the app code; you type the git commands.
- Every change follows the loop: **edit → check (`git status` / `git diff`) → stage (`git add`) → commit (`git commit`)**.
- One step per session, with a short recap of the commands at the end.
