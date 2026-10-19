# Remal frontend (Member 2)

React + Vite + Tailwind v4 + Leaflet.

```bash
npm install
npm run dev          # http://localhost:5173
npm run test:match   # sanity-checks the offline match engine
npm run build
```

- Works with no backend: the offline engine (`src/lib/localMatch.js`) mirrors `POST /api/match`.
- With Member 1's FastAPI on :8000, `/api/*` is proxied automatically (see `CONTRACT.md`).
- Map tiles need internet; with no connection the pins, animated route and KPIs still work on a grid background.
- `src/lib/nodes.js`: 20 PLACEHOLDER nodes. Verify coordinates and replace fees/prices/demand with real figures.
