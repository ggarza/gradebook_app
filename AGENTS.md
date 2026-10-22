# AGENTS.md

Guidance for AI coding agents working on this repository.

## What this is

A gradebook for an instructor teaching several classes: fast grade entry, a weighted course grade, an at-risk view, email drafts, and CSV import/export with Brightspace. The app is the source of truth; Brightspace only receives exports (and occasionally sends imports back).

- `index.html` — the whole app: HTML, CSS and JavaScript in one file. No build step, no dependencies.
- `gradebook-spec.md` — the specification. It describes every feature, the data model and the wording conventions. **Read it before changing behavior, and update it in the same change** whenever behavior, data shape or UI text it describes changes.

## Hosting: GitHub Pages

The app is served as a static page from GitHub Pages (repository root, default branch).

- Pages serves `index.html` at the site root, which is why the app file is named `index.html`. Don't rename it.
- Everything must work as a plain static file over HTTPS and also when opened from disk (`file://`). No server code, no build step, no bundler, no package manager, no external scripts, fonts or stylesheets, no CDN. Keep it a single self-contained file.
- `.nojekyll` at the root makes Pages serve files as-is. Keep it.
- Use relative paths only (project sites live under `https://<user>.github.io/<repo>/`).

### Storage and origin (important)

- Data lives in `localStorage` under `gradebook-v1`, `gradebook-v1:auto` and `gradebook-v1:unreadable`. Never rename these keys or change the stored shape without a migration that reads the old form.
- `localStorage` is per **origin**. Every project site under `<user>.github.io` shares one origin, so other apps hosted there (for example the Attendance app) can see and collide with these keys. Keep every key prefixed with `gradebook-v1`, and never clear storage wholesale (`localStorage.clear()` is forbidden).
- Data saved while the file was opened from disk is a different origin and does **not** carry over to the Pages site. Moving between them is done with Download backup → Restore from backup (merge). Don't try to "fix" this in code.
- Nothing is ever uploaded. Don't add analytics, telemetry, remote logging, fonts from Google, or any network request that could carry student data.

## Privacy: never commit student data

A GitHub Pages repository is usually public. Student names, IDs, emails and grades must never enter the repository.

- Never commit backups (`*.json` exported by the app), Brightspace CSVs, spreadsheet copies, `.eml` drafts or printed summaries. `.gitignore` ignores every `*.json`, `*.csv`, `*.eml` (and similar) file for this reason. Don't remove those rules or force-add (`git add -f`) such files; if a non-sensitive data file is ever truly needed, add a narrow exception for that one path.
- Test data must be obviously fake (e.g. "Student A", "Test Learner"). Don't paste real rosters into code, comments, issues or commit messages.

## Code conventions

Match the existing code in `index.html`:

- Plain modern JavaScript in one `<script>` with `'use strict'`. No frameworks, no modules, no TypeScript.
- Sections are marked with `/* ================= Name ================= */` and sub-sections with `/* ---- name ---- */`. Put new code in the matching section. Comments are short, plain-English explanations of *why* or *what the rule is*, one line above a function.
- Use the existing helpers rather than new ones: `$`, `$$`, `esc`, `uid`, `clone`, `natCmp`, `fold`, `plural`, `fmtPct`, `fmtDate`, `ago`, `normNum`, etc.
- **Always escape** user and imported text with `esc()` when building HTML strings. Names, notes, item names and CSV contents are untrusted.
- Grade and note changes go through the existing change path (`setGrade` / `setNote` for single cells, `applyCells` for batches) so they are logged in history (`logCell`), undoable and marked as edited. Don't write to a class's `g` or `notes` directly from UI code.
- Save via the debounced `save()`; don't write to `localStorage` directly outside the Storage section.
- Loading old data runs through `migrate`, `fixClass` and `fixTemplates`. New fields get their defaults there.
- CSS uses the custom properties on `:root` (`--bg`, `--panel`, `--accent`, `--amber`, `--red`, …). The app is always dark; don't add a light theme.
- Keep the file self-contained: inline SVG or `data:` URIs for icons.

## UI and wording conventions

- Sentence case everywhere ("Download backup", not "Download Backup").
- Tabs are named as actions (Enter grades, Set up class, Send emails, …).
- Destructive actions: move things to Recently deleted (30 days) and show a toast with **Undo**. Make an automatic copy before restores and imports. Never delete data that couldn't be read.
- Keyboard shortcuts are listed in the spec and in the in-app `?` list. Update both when adding one; check for clashes first.
- Email drafts are only ever opened (mailto), downloaded (.eml) or copied. Never send email.
- Email templates: cordial, supportive, professional, course-focused, neutral closings.

## Data safety rules (don't break these)

- An import never erases a grade: blank cells in a file are ignored.
- `EX` is excused: left out of averages and the missing count, exported as blank.
- A blank counts as 0 only once an item is "given" (any active student has a score on it).
- Unreadable saved data is copied aside and saving pauses rather than overwriting it.
- Restore by merge never removes anything.
- Older backups and older `localStorage` data must still load. When adding fields, default them on load in `migrate` / `fixClass`.

## Testing changes

There is no test suite. Before finishing a change:

1. Open the file in a browser (Chrome or Edge) — from disk and, if relevant, via a local static server (`python3 -m http.server`) to mimic Pages.
2. Check the browser console for errors.
3. Exercise the feature you touched with fake data, plus the paths it could affect: entering grades, undo/redo, Download backup → Restore (merge), Brightspace export CSV.
4. Confirm an existing backup from before the change still restores.

## Deployment

Pushing to the default branch publishes the site. Don't push, force-push, or change GitHub Pages settings unless asked.
