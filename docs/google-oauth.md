# SSO (Nest redirect) — Google & LinkedIn

Sign-in is owned by the Nest API (authorization-code redirect). No Supabase.
Google and LinkedIn use the same exchange → app JWT pattern.

## Flow

1. User clicks **Continue with Google** or **Continue with LinkedIn** →  
   `/api/auth/google` or `/api/auth/linkedin`
2. Nest redirects to the provider
3. Provider redirects to Nest  
   `GET /auth/google/callback` or `GET /auth/linkedin/callback`
4. Nest exchanges the code, creates a short-lived exchange code, redirects to  
   `{FRONTEND_ORIGIN}/auth/callback?code=...`
5. Web app calls `POST /api/auth/exchange` → stores app JWT → opens the Gantt UI

You can enable either provider or both. Buttons for missing env vars stay disabled.

---

## Google Cloud setup

1. [Google Cloud Console](https://console.cloud.google.com/) → **APIs & Services → OAuth consent screen**
   - User type: **External**
   - App name, support email, developer contact
   - Scopes: `openid`, `email`, `profile`
   - For real end users: set Publishing status to **In production**  
     (Testing mode only allows listed test users)
2. **Credentials → Create OAuth client → Web application**
3. **Authorized JavaScript origins** (optional for redirect flow, good to add):
   - `http://localhost:3010`
   - `https://your-production-domain.com`
4. **Authorized redirect URIs** (required):
   - Local: `http://localhost:3001/auth/google/callback`
   - Production API: `https://api.your-production-domain.com/auth/google/callback`
5. Copy **Client ID** and **Client Secret**

The redirect URI in Google Cloud must match `GOOGLE_REDIRECT_URI` **exactly**.

---

## LinkedIn Developer setup

1. [LinkedIn Developer Portal](https://www.linkedin.com/developers/apps) → **Create app**
2. Fill in app name, LinkedIn Page, and privacy policy URL
3. Under **Products**, request **Sign In with LinkedIn using OpenID Connect**
4. **Auth** tab → **Authorized redirect URLs for your app** (must match exactly):
   - Local: `http://localhost:3010/api/auth/linkedin/callback`
   - Production: `https://your-app.example.com/api/auth/linkedin/callback`
5. Copy **Client ID** and **Primary Client Secret** from the Auth tab

Scopes used: `openid`, `profile`, `email` (OpenID Connect).

The redirect URL in LinkedIn must match `LINKEDIN_REDIRECT_URI` **exactly**
(including host, port, and `/api` path). LinkedIn callbacks go through the
Next.js `/api` proxy to Nest.

LinkedIn user ids are stored as `linkedin:{sub}` so they never collide with Google subjects.

---

## Env

`apps/web/.env.local`:

```env
NEXT_PUBLIC_GOOGLE_CLIENT_ID=<google-client-id>
NEXT_PUBLIC_LINKEDIN_CLIENT_ID=<linkedin-client-id>
NEXT_PUBLIC_API_URL=/api
API_PROXY_TARGET=http://localhost:3001
```

`apps/api/.env`:

```env
FRONTEND_ORIGIN=http://localhost:3010
API_PUBLIC_URL=http://localhost:3001
GOOGLE_REDIRECT_URI=http://localhost:3001/auth/google/callback
LINKEDIN_REDIRECT_URI=http://localhost:3010/api/auth/linkedin/callback
GOOGLE_CLIENT_ID=<google-client-id>
GOOGLE_CLIENT_SECRET=<google-client-secret>
LINKEDIN_CLIENT_ID=<linkedin-client-id>
LINKEDIN_CLIENT_SECRET=<linkedin-client-secret>
JWT_SECRET=<long-random-secret>
```

Production example:

```env
FRONTEND_ORIGIN=https://your-app.example.com
FRONTEND_ORIGINS=https://your-app.example.com
API_PUBLIC_URL=https://api.your-app.example.com
GOOGLE_REDIRECT_URI=https://api.your-app.example.com/auth/google/callback
LINKEDIN_REDIRECT_URI=https://your-app.example.com/api/auth/linkedin/callback
```
