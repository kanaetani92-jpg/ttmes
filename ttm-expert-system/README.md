# TTM Expert System (Vercel + Firebase + Gemini)

- **Auth**: Firebase Email/Password
- **Data**: Firestore (users/<uid>/assessments/<doc>, prescriptions/<doc>)
- **GenAI**: Gemini (style layer, optional)
- **Deploy**: Vercel
- **Sync**: Optional GitHub webhook to refresh `/data/catalog.json`

## Quickstart

1. `cp .env.example .env.local` and fill values.
2. `npm i`
3. `npm run dev`
4. Create Firestore DB (in Native mode). Suggested collections will be created on write.

## Catalog

Edit `src/data/catalog.json` or set `CATALOG_GITHUB_RAW_URL` and trigger `POST /api/webhooks/github` from your repo to refresh.

## Auth

Email/Password only. Register → Login → Assessment.

## API

- `POST /api/prescription` → run rule engine and (optionally) Gemini style.
- `POST /api/style` → style fixed messages via Gemini (whitelist input only).
- `POST /api/webhooks/github` → pull catalog from GitHub raw URL (verify signature).

## Important

- Server routes verify Firebase ID token (`Authorization: Bearer <idToken>`).
- Keep Gemini prompts constrained; do not allow free-form clinical advice.
