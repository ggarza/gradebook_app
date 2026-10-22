# Gradebook: Specification

## Purpose

A single-file HTML app (`index.html`) for keeping and entering grades for several classes, computing a weighted course grade, and spotting students who are at risk. **This app is the source of truth**; Brightspace is where grades get posted. Grades are exported to Brightspace as an import CSV, and Brightspace exports can be imported back in when needed.

Primary goal: a **quicker, more convenient way to enter and edit grades** than Brightspace or Excel, with fast filtering to the exact students and items being worked on. Second goal: see **how students are doing and who is likely to pass or fail**.

Successor to the Gradebook CSV Editor (learning-target, Pass/Fail). Borrows the interface and data-safety ideas of the Attendance app: dark theme, sentence case, a class switcher in the header, tabs named as actions, automatic copies, a Recently deleted bin, merge restore, email drafts with templates and a log.

## Questions to ask before building

**Basics**
1. Is the app or Brightspace the source of truth? *The app. Brightspace receives exports; imports from Brightspace are occasional.*
2. Where does the data live? *In the browser's local storage. Nothing is uploaded. A downloadable backup file holds everything.*
3. How is the app run? *As a static page on GitHub Pages (Chrome or Edge); the same file also works opened from disk. No server, no external libraries. Works offline once it has been opened online: a service worker (`sw.js`) keeps a copy of the app (never the grades) and uses it when the network is unavailable or slow.*
4. Several classes? *Yes. A Class menu in the header switches between them.*
5. Theme? *Always dark.*

**Grades**
6. What grade types? *Points (out of a maximum: usually 100, sometimes 10 or anything else) and Comment (text, Brightspace "Text Grade").*
7. Can grades exceed the maximum? *Yes, kept as extra credit, shown in amber.*
8. Is there an excused value? *Yes: `EX`. Left out of every average and the missing count; exported to Brightspace as blank.*
9. Notes on grades? *One note per student per item, kept in the app only.*

**Course grade**
10. How is the course grade computed? *Categories with a weight %. Each category's average is weighted; categories whose items aren't graded yet are left out and the remaining weights are rescaled.*
11. How does a blank count? *As 0 once any active classmate has a score on that item ("given"); before that, the item is left out.*
12. Within a category, how do items combine? *Chosen per category: equal weight per item (default) or total points.*
13. Drop lowest? *Per category, by percentage; at least one item always counts.*
14. Without weights? *Course grade = total points over every given points item.*
15. Letter grades and passing? *Editable cutoffs A/B/C/D (default 90/80/70/60, F below D); passing is a chosen letter (default C).*
16. What makes a student At risk? *Any of (each can be turned off): course grade below passing; N or more missing items (default 3); a chosen category's average (default the Exam category) below passing. **Watch**: within M points of passing (default 5) on either grade, or any missing item. Otherwise **On track**; no grades yet → **No grades yet**.*

**Brightspace**
17. On import, when a grade differs, which wins? *The user picks per cell (Keep all app / Use all Brightspace). Default is the app's value.*
18. Can an import erase a grade? *No. Blank cells in the file are ignored.*
19. What does an export contain? *Items the user picks; items changed since their last export are pre-checked.*

**Students**
20. How is a student removed? *Drop (hidden, kept with grades, left out of exports and class statistics; restorable) or delete (to Recently deleted for 30 days).*
21. How are drops found? *Check for drops compares a current class list with the class, with fuzzy name matching.*

**Data safety**
22. What protects against mistakes? *Undo for grades and notes; a permanent change history with Revert and Move; Undo on every destructive toast; a 30-day Recently deleted bin; automatic copies (start of each day, last 7; before each restore or import, last 5); data that can't be read is set aside, never overwritten.*
23. How do two computers stay in step? *Backups restore by merge (default) or replace.*

**Email**
24. How does email work? *Drafts open in the mail app (mailto), download as .eml, or copy. Never sent automatically. One BCC email or separate personal emails.*
25. Template tone? *Cordial, supportive, professional, course-focused, neutral closings.*

## Data model

- **Database** (`localStorage` key `gradebook-v1`): `classes[]`, `cur`, `lastBackupAt`, `editsSinceBackup`, `bin[]`, `templates[]`, `removedStarters[]`, `tplVersion`, `work` (the email draft), `me` (instructor name, office hours, office, BCC "To"), `ui` (last tab; per class: grid sort, category filter, missing filter, show dropped, item search, active cell, Course grades filter/sort, email filter settings).
- **Class:** `id`, `name`, `bsImportUrl`, `students[]`, `items[]`, `g` (`g[sid][iid] = "88"` or `"EX"`), `mod` (last-edit time per cell), `notes` (`notes[sid][iid] = {text, at}`), `emails[]` (log), `grading`.
- **Student:** `first`, `last`, `username`, `orgId`, `email`, `dropped`, `droppedAt`.
- **Item:** `name`, `cat`, `type` (`num`/`text`), `max`, `bsHeader`, `bsName`, `exportedAt`.
- **Grading:** `cats[]` (`name`, `weight`, `drop`, `mode` = `equal`/`points`), `cut` {A,B,C,D}, `pass` (letter), `risk` {`pct`, `missing`, `missingN`, `exam`, `examCat`, `margin`}.
- Item categories are automatic from the name ("Quiz 3" → Quiz) and editable; every category used by a points item gets a row in the course-grade setup (weight 0 until set). The Exam category is detected automatically for the at-risk rule.
- **History** (`hist[classId]`): every grade and note change as `{t, s, i, k (g/n), a (from), z (to), src, sn, in, bt?, bl?}`: time, student, item, before, after, how (typed, undo, redo, import, merge, restore, revert, move), the student's and item's names at the time, and a batch id and label for changes made together. The most recent 5,000 per class. Kept outside the class, so restoring a class never erases it; included in backups (merged by time on restore); left out of automatic copies to save room. If storage fills, the oldest half is trimmed first.
- **Other keys:** `gradebook-v1:auto` (automatic copies), `gradebook-v1:unreadable` (data set aside, last 3).
- Saves automatically (debounced) and on closing the tab. Changes from another tab of the app reload automatically (UI-only changes are ignored). Requests persistent storage.

## Layout

1. **Header:** app name; **Class** menu (alphabetical, plus "Rename or manage classes…"); **＋ New class**; save status ("Saved in this browser · backed up 3 days ago", amber and clickable after a week of changes without a backup; red if saving is paused or failed); **Help**.
2. **Tabs:** Enter grades · Course grades · Set up class · Send emails · Export & import · Manage data, plus **⌨ Shortcuts ?**.
3. **Banner** (only when needed): saved data couldn't be read, or the browser has no gradebook but automatic copies exist.
4. The app reopens on the last tab used, with each class's filters and sort as they were left.

## Enter grades

- **Grid:** sticky header row; sticky Student, **Avg %** (points earned ÷ possible over the items shown, scored items only) and **Course** (course % and letter; tooltip gives the status and reasons) columns.
- **Item headers:** name and `/max · graded/total · class average %`. Double-click to edit the item.
- **Fixed column widths** that never shift when filtering.
- **Cell marks:** amber background = changed this session; blue dot = changed since last export; amber triangle = note; amber number = over the maximum; italic EX = excused.
- **Filters:** Find student (`/`), Find items (`\`, commas = or), category chips, Only missing [item], Show dropped, Clear filters.
- **Sorting:** click a header (ascending, descending, clear); Shift+click adds a second sort; Course is sortable. Rows stay put while editing; a **Re-sort** button (Alt+R) appears when edits have made the order stale.
- **Editing:** type a number (or EX); Enter saves and moves down, Shift+Enter up, Tab right, Esc cancels; Delete clears.
- **Notes:** N (Alt+N on comment items) or the 📝 Note button opens the note for the selected cell. Undoable.
- **Summary:** click a student's name, press I (Alt+I), or use the Summary button.
- **Undo/redo** for grades and notes (500 steps per session, cleared on class switch).

## Change history

- **Open it:** 🕘 History under the grid (whole class), **H** on a cell (that student and item), Alt+H (whole class), **History** in a student's summary (that student), or Manage data → Change history.
- **Filters:** Student, Item, When (last hour, today, 7 days, 30 days, all), Show (all changes, typed, undo/redo, imports & restores, reverts & moves, notes).
- **Rows**, newest first: when, student, item, before → after (blank shown as "blank"; notes marked), how, and **Now** ("same", or the current value in amber if it changed again). Changes made together (an import, a merge or restore, an undo of several cells, a move, a batch revert) are one row with **Show** and **Revert all…**. Revert all puts back only the cells that haven't changed since and says how many it left. The list shows 300 rows at a time, with Show more.
- **Revert:** puts the cell back to its value before that change (asks first if it has changed since).
- **Move…** (grades entered into a cell): pick the right student and/or item. The grade goes there (asks before replacing a value), and the original cell goes back to what it was, unless it has changed since. One undoable step.
- Reverts and moves are themselves logged and undoable (Ctrl/⌘+Z). Students and items that were removed still show by the name they had.

## Course grades (at-risk view)

- **Stat tiles:** students, class average course %, At risk, Watch, On track, letter-grade distribution bars.
- A line describing the weighting (or a warning that weights aren't set), passing grade and the blank/EX rule.
- **Filters:** Find student, chips All / At risk / Watch / On track (with counts).
- **Table:** Student, Course %, Letter, Status pill, Missing count, each weighted category's average (red below passing), the exam category (if not weighted), Lowest category, Why (reasons). Sortable headers (remembered). Dropped students excluded.
- **Actions:** click a row for the summary (Previous/Next steps through this list); **Email these N** (selects them in Send emails, separate emails); **Print summaries** (one page per student).

## Student summary

- Name, username, email, ID, class, date; tiles for course grade and letter, status, missing count, graded count; reasons list.
- Item table grouped by weighted category (category average and weight in the group row; dropped items struck through and labeled), then "Not in the course grade". Each item: score / max, %, class average, note. Missing items show "missing (0)"; items not yet given show "not graded yet"; EX shows "EX (excused)".
- Emails sent to the student (from the log).
- **Previous / Next**, **Email this student**, **Print** (clean light page via a hidden frame), Close.

## Set up class

- **Course grade card:** category table (name, weight %, drop lowest, combine by, item count, remove when unused), running total (green at 100%, amber otherwise, with an explanation), **＋ Add category**. Renaming a category renames it on its items. Letter cutoffs, passing grade, at-risk rules and the Watch margin. Changes re-render without losing the field Tab moved to.
- **Grade items card:** order (↑/↓), name, category, type, out of, graded · average, Brightspace status, Edit. Add/edit dialog with numbered series (Quiz 1 … Quiz 10), type locked once graded, Brightspace link with Unlink, Delete (to Recently deleted, with Undo).
- **Students card:** name, username, ID, email, dropped date; Summary, Edit, Drop/Restore; **＋ Add student**; **Check for drops…**; Delete permanently (inside Edit; to Recently deleted, with Undo). Usernames unique; emails validated.

### Check for drops
- Input: a CSV (Brightspace classlist or grades export; non-student roles skipped) or pasted names ("Last, First" or "First Last", one per line).
- Matching: username → OrgDefinedId → email → name key (accents, case and order ignored). Then near matches: shares a first and a last name (extra surnames OK), or names within 2 letters.
- Results: matched count; **Check these** (near matches, checked = same person); **Not on the new list** (with score count and course %; checked = drop); **On the new list but not in this class** (checked = add); **Dropped here, but on the new list** (checked = restore). Unchecking a near match moves both sides into the drop/add lists.
- Apply shows "Dropped N, added N, restored N" with Undo.

## Send emails

- **Message (left):** template menu (edited starters marked "(edited)"), template name, subject, message, placeholder buttons that insert at the cursor, **Your details** (name, office hours, office). The editor is a working draft until saved: Save template, Save as new, Revert, Delete (to Recently deleted), Restore original wording (edited starters), Restore deleted starters.
- **Placeholders:** {first} {last} {name} {class} {item} {score} {max} {percent} {course} {letter} {missing} {instructor} {officehours} {office}. A line whose instructor detail, score, percent or course grade is blank is left out. {missing} reads "none" when nothing is missing.
- **Recipients (right):** Item, Score below %, Course grade below % (defaults to passing). Chips: All · Missing [item] · Below N% on [item] · Course grade below N% · At risk (counts). A chip lists and selects its students; All lists everyone and keeps the selection. Search, Select all shown, Clear, Shift-click ranges. Rows show email (or "no email on file"), the note on the chosen item, score on the item, course % and letter, At risk / Watch pill, and "✉ sent" if emailed about this item.
- **One email (BCC):** optional To, BCC list, subject and message with names removed ("Hi {first}," → "Hi,"). Templates that use a student's own details ({score}, {percent}, {course}, {letter}, {missing}) can't be sent as BCC; a prompt offers Separate emails. Open in mail app (warns when the link is long), Download .eml, Copy BCC list, Copy message.
- **Separate emails:** one draft per student with Open in mail app, Download .eml, Copy.
- **Email log:** opening, downloading or copying records time, item (when the message is about one), template, subject, recipients, mode and how. Repeats within 10 minutes merge. A warning lists students already emailed about the item. Entries can be removed.
- **12 starter templates:** Missing work · Several missing items · Missed exam or quiz · Low score check-in · Course grade check-in · Progress update · Nice work · Grades posted · Grade updated · Preparing for an exam · Support is available · Office hours invitation. New starters in later versions are added once; deleted ones aren't re-added.

## Export & import

### Import from Brightspace
- Choose or drop a CSV. Recognized: `OrgDefinedId`, `Username`, `Last Name`, `First Name`, `Email`, `End-of-Line Indicator`; `… Points Grade [<Numeric …>]` and `… Text Grade`. MaxPoints read from the tag (else 100). Comma, semicolon or tab separated.
- Skipped and listed: Pass/Fail, Grade Symbol / Scheme Symbol, final-grade columns, duplicates.
- **Preview:** target class (best roster match, any class, or new), students matched/new/missing (missing ones point to Check for drops), column include/map, counts of fills and matches, conflict table with per-cell choice.
- Applying makes an automatic copy first, links items to their Brightspace headers, and shows **Undo import**.

### Export for Brightspace
- **Export comes first** on the tab (it's the common task); Import is a one-line card below it (Choose CSV…, or drop a file anywhere; the Brightspace export steps are folded away). An import preview, when one is open, appears at the top.
- **⌘B / Ctrl+B** opens the same export list as an overlay from any tab (it finishes a cell being typed first): the same search, category and status filters, sort, checkboxes, Download CSV and Open Brightspace import. The overlay keeps its own search, filters and sort (remembered per class) and starts **sorted by Last edited, newest first**; the tab starts in column order. The search box has focus; ⌘B again or Esc closes it (Esc first clears a search), and **Go to Export & import** switches to the tab. It stays open after a download so you can open Brightspace next.
- **Open Brightspace import after downloading** (checkbox beside Download CSV, shared by the tab and the overlay, remembered): when on, Download CSV also opens the import page in a new tab (asks for the link first if the class has none).
- Browsers don't let a page open a tab in the background, but ⌘-click / Ctrl+click on any Open Brightspace import button does (the buttons are real links; a hint says so). Toasts show above open dialogs so their buttons can be clicked.
- **Open Brightspace import ↗** (top right of the card, next to Download CSV, and in the toast after a download) opens the class's Brightspace Grades → Import page in a new tab. Each course has its own address, so the first click asks for it once (open Grades → Import in Brightspace and paste the address bar); it's saved with the class (Change link / Remove link). Merging a backup fills it in if this class has none; copying a class's setup doesn't copy it.
- Item checklist with Category, Graded, Status (not exported yet / N changes since last export / up to date), **Last edited** (the most recent grade edit made in this app on that item; imported values don't count) and Last exported columns. Last edited and Last exported sort newest first on the first click.
- **Find items** (`/`, commas = or), category chips (multi-select), Status filter (All · Changed · Not exported yet · Up to date · Checked, with counts), Clear filters. Sortable headers (Item, Category, Graded, Status, Last exported): click for ascending, again for descending, a third time back to column order. Search, filters and sort are remembered per class.
- Select changed · Select all shown · Clear shown · Clear all. A count shows how many are checked and how many checked items are hidden by the filters (they're still exported). Filtering and sorting never change the file: it always lists items in the class's column order. Include dropped; warnings for students without IDs, items new to Brightspace, EX exported as blank, and blanks not erasing grades.
- File: OrgDefinedId and/or Username, Last/First Name and Email when present, chosen items, `End-of-Line Indicator` = `#`. Exporting marks items exported.

## Manage data

- **Backup** (top, prominent): Download backup (also Ctrl/⌘+S anywhere), Restore from backup (or drop the .json), last backup and changes since.
- **Restore dialog:** Merge (default) or Replace.
  - Merge never removes anything. Per class (matched by id, then name): adds new students (matched by username/ID/email/name), new items, grades and notes for empty cells, email log entries; templates, Recently deleted entries and blank instructor details are added too. Differing cells (grades and notes) are listed with both values and edit times; the newer edit is preselected; Keep all here / Use all backup. Options: drop students dropped in the backup (on), restore students dropped here but active in the backup (off). Course-grade setup is taken from the backup only if this class has no weights.
  - Replace swaps checked classes; "Replace everything" also removes unchecked classes and takes templates and settings from the backup.
  - An automatic copy is made first; the result toast has Undo.
- **Classes:** each name is an editable box, as in Attendance: type and press Enter (or leave the box) to rename, Esc to cancel; blank and duplicate names are refused, and the toast has Undo. The Class menu's last option, **Rename or manage classes…**, opens this list. Also open, delete (to Recently deleted, with Undo), new class (optionally copying another class's items and course-grade setup).
- **Recently deleted:** classes, students, grade items, templates (and edited starters replaced by the original wording), with what was in them and days left; Restore, Delete forever, Empty. Restoring an item or student needs its class; name/username clashes are handled.
- **Automatic copies:** "Start of <day>" (last 7) and "Before restoring/importing …" (last 5), each with Restore… (opens the restore dialog, Replace preselected) and Download (as a backup file). Data that couldn't be read is listed with Download and Delete. If the browser runs out of room, the oldest copies are dropped first.
- **Spreadsheet copy:** CSV for Excel with every item, course %, letter, standing and missing count.
- **Where the data is kept:** browser storage explained; the file can be moved without losing data; persistent-storage status.

## Unreadable data

If the saved data can't be parsed, it is copied to `gradebook-v1:unreadable` and the app starts empty with a banner: Download the unreadable data, Restore an automatic copy, Dismiss. If the copy can't be made, **saving pauses** (header shows "⚠ Saving paused") and the banner adds **Start fresh** (with a warning) so nothing overwrites it.

## Keyboard shortcuts

- `/` find student · `\` find items · Esc clears both and returns to the grid. On Course grades and Send emails, `/` jumps to that tab's search.
- Arrows / Tab / Home / End / PgUp / PgDn move; Ctrl/⌘+arrow jumps to an edge.
- Type a number (or EX) to enter a score; Enter / F2 edits; Delete clears.
- N / Alt+N note · I / Alt+I summary · H cell history / Alt+H class history · Alt+R re-sort.
- Ctrl/⌘+Z undo; Ctrl/⌘+Shift+Z or Ctrl+Y redo; Ctrl/⌘+S download a backup; Ctrl/⌘+B export overlay.
- Alt+1–6 switch tabs; Alt+C Class menu; `?` lists shortcuts.

## Later (not built)

- Grade trend (recent items vs earlier) as an at-risk signal.
- Plus/minus letter grades.
- Bringing absences from the Attendance app into the at-risk view.

## Privacy

Student grade data stays in this browser. Nothing is uploaded. Backups, exports, printed summaries and .eml drafts contain grades and should be stored accordingly.
