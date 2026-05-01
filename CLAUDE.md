# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

A stock/order management web app for a restaurant kitchen. Built with vanilla HTML, CSS, and JavaScript — no build step, no framework, no package manager. Data persistence is handled entirely via Google Sheets (read via OpenSheet API, write via Google Forms submission).

## Running the App

The JS source uses ES modules (`type="module"`), so files **must be served over HTTP** — opening via `file://` is blocked by the browser's CORS policy.

```bash
# Python
python -m http.server 8000

# Node (if available)
npx serve .
```

Then open `http://localhost:8000`. No build or install step required.

## Architecture

### Pages

| File | Purpose |
|---|---|
| `index.html` | Dashboard — displays current order list |
| `add-new-item.html` | Add a new item to the master inventory |
| `edit-current-list.html` | Select items + quantities for current order |
| `mark-delivered-items.html` | Mark ordered items as delivered |

### Data Layer (Google Sheets)

**Spreadsheet ID:** `1vcItq-vwIjsCMrcGKa111moXmEU4usUkS_BjQYTlcgk`

Reads are done via the OpenSheet API: `https://opensheet.elk.sh/{spreadsheetId}/{sheetName}`

| Sheet | Columns |
|---|---|
| `Items` | ID, Item Name, Category, Disabled, Increment Value, Unit Label |
| `Order List History` | Timestamp, (item IDs with optional quantities, newline-separated) |

Item data format in the order column: `itemId` or `itemId x quantity`, one per line.

### Write Pattern (Google Forms → Sheets)

All writes go through Google Forms submission using a hidden `<iframe>` to avoid page reload. After submission, JavaScript polls the OpenSheet API every 5 seconds (90-second timeout) to verify the new data landed before redirecting.

Two Google Forms:
- **Add Item form** ID: `11jy4lLinqoCPZ6HFNcIBU6wp_4ujURUeBduhj7DYnws`
- **Update Orders form** ID: `1otM5e3lonI_X9W0-f3Zkd1fmXPmhphDIg68gnxKxPpE`

### Patterns Used Across All Pages

1. **Fetch + render** — page load fetches items from OpenSheet, builds DOM dynamically
2. **Form submit → iframe** — writes via hidden `<form target="hidden_iframe">` pointed at a Google Form action URL
3. **Poll to confirm** — after submit, polls OpenSheet until the new data appears (or 90s timeout)
4. **Categories** — items are grouped: Front, Vegetables, Kitchen, Meat, Starters
5. **Disabled items** — items with `Disabled = TRUE` in the sheet are hidden from selection
6. **Quantity selection** — some items have `Increment Value` and `Unit Label` set, enabling a stepper UI

## Key IDs (hardcoded in JS)

These are referenced directly in the HTML files — there is no `.env` or config file:

```
Spreadsheet: 1vcItq-vwIjsCMrcGKa111moXmEU4usUkS_BjQYTlcgk
Add Item form: 11jy4lLinqoCPZ6HFNcIBU6wp_4ujURUeBduhj7DYnws
Update Orders form: 1otM5e3lonI_X9W0-f3Zkd1fmXPmhphDIg68gnxKxPpE
```

## Code Style

- **Indentation:** 4 spaces across all file types (HTML, CSS, JS). This matches the project's `.editorconfig` — if your editor doesn't pick it up automatically, set tab size to 4 and indent with spaces.

## Target Platform

The app is primarily used on **mobile**. Keep this in mind for all UI work: touch-friendly tap targets, readable font sizes, and single-column layouts.

## Branches

- `main` — production
- `redesign` — current active development (UI/UX overhaul)
