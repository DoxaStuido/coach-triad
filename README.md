# Coach a Coach

Global Peer Coaching Exchange triad matching engine and bilingual review workspace.

## What it does

- Deterministic triad matching with common-language and 60-minute overlap constraints
- Bilingual (EN / ZH-TW) review workspace for coordinators
- Read-only Excel adapter with hashed participant IDs
- Independent result checker and data-hold management

## Quick start

```bash
npm install
npm test          # run all matching and normalization tests
npm run dev       # start the Next.js dev server
```

Open `http://localhost:3000` for the review workspace (fictional demo data).

## Preview the original mockup

Open `public/mockup/index.html` in a browser, or:

```bash
python3 -m http.server 4173
```

Then visit `http://localhost:4173/mockup/index.html`.

## Privacy

Participant data stays in the browser's memory. Nothing is uploaded or automatically saved. The publicly deployed viewer contains only fictional data.
