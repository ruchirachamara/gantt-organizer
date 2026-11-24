# Security notes (auth)

## Console messages you may see

These are **not** vulnerabilities in Gantt Timelines:

1. **`WARNING! … Self-XSS`** (`m=b,_tp:…`)  
   Injected by **Google** on the Google accounts / OAuth pages to stop people pasting malicious JS into DevTools. It is not emitted by this app.

2. **`Permissions policy violation: unload` from `Grammarly.js`**  
   Comes from the **Grammarly browser extension**, not from our code. Disable Grammarly on localhost if you want a quieter console.

## App hardening in place

- Nest: `helmet` security headers, strict CORS allowlist, validated DTOs
- Next: `X-Frame-Options: DENY`, `nosniff`, `Referrer-Policy`, locked-down `Permissions-Policy`
- Auth callback: one-time exchange code, stripped from the URL immediately; `no-referrer` + `no-store` on `/auth/*`
- Google OAuth: Nest-owned redirect + authorization code (client secret stays server-side)

## Practices for production

- Keep `GOOGLE_CLIENT_SECRET` and `JWT_SECRET` only in server env (never `NEXT_PUBLIC_*`)
- Publish the Google OAuth consent screen only when ready for public users
- Rotate the client secret if it was ever shared outside a private password manager
