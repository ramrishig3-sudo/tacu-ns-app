# TacU NS Threat Service

This Railway-ready service powers remote domain reputation checks for the Android firewall app.

## Endpoints

- `GET /health`
- `POST /api/v1/threat/lookup`
- `POST /api/v1/threat/explain`
- `GET /api/v1/policies/default`
- `PUT /api/v1/admin/policies/default`

## Required environment variables

- `MONGO_URI`
- `JWT_SECRET`
- `OTX_API_KEY`
- `SAFE_BROWSING_API_KEY`

## Optional

- `GROQ_API_KEY`
- `ALLOWED_ORIGINS`
- `LOOKUP_RATE_LIMIT_WINDOW_MS`
- `LOOKUP_RATE_LIMIT_MAX`

## Secret handling

- Do not place any API key in the Android app.
- Keep all secrets only in Railway environment variables.
- The Android app should only know your public API base URL such as `https://api.tacuns.net`.
- `JWT_SECRET` is only for admin endpoints and must never be shipped in the APK.

## Deployment

1. Deploy `backend/` to Railway.
2. Add the variables from `.env.example`.
3. Point `api.tacuns.net` to Railway.
4. Keep Android `BACKEND_BASE_URL` aligned with that hostname.
