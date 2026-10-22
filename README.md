# Gradebook

A quick way to enter and edit grades for several classes, compute a weighted course grade, and spot students who are at risk. Grades are exported to Brightspace as an import CSV.

**Open it:** https://ggarza.github.io/gradebook_app/

## How it works

- One HTML file (`index.html`), no server, no external libraries. Use Chrome or Edge.
- Grades are saved in your browser's local storage. **Nothing is uploaded.**
- Works offline once it has been opened online (`sw.js` keeps a copy of the app, never the grades).
- Download a backup often (Manage data → Download backup, or ⌘S / Ctrl+S). To move grades to another computer or browser, restore that backup there; merge is the default.

## Features

- Fast grade grid with keyboard entry, filters, notes, undo/redo and a full change history
- Weighted categories, drop lowest, letter cutoffs, and an at-risk view
- Student summaries you can print
- Email drafts from templates (opened in your mail app, never sent automatically)
- Brightspace CSV export and import
- Automatic copies and a 30-day Recently deleted bin

See [gradebook-spec.md](gradebook-spec.md) for the full specification.

## Privacy

Backups, exports, printed summaries and email drafts contain student grades. Store them carefully, and never commit them to this repository: `.gitignore` keeps `.json`, `.csv` and `.eml` files out.

## Development

Edit `index.html` and open it in a browser (from disk, or with `python3 -m http.server` to test offline support). Pushing to `main` publishes the site. Guidance for AI coding agents is in [AGENTS.md](AGENTS.md).
