# Gantt Timelines

Monorepo (**npm workspaces**):

- `@gantt/web` — Next.js UI
- `@gantt/api` — NestJS API (Google / LinkedIn OAuth redirect + Cosmos CRUD)

**SSO is handled by Nest** with a full browser redirect (authorization
code). Google and LinkedIn are both supported. Suitable for public end users
once each provider’s consent / app review is complete.

## Run locally

```bash
npm install
cp apps/web/.env.local.example apps/web/.env.local
cp apps/api/.env.example apps/api/.env
# fill Google and/or LinkedIn + Cosmos + JWT_SECRET — see docs/google-oauth.md
npm run dev
```

| Script | Purpose |
| ------ | ------- |
| `npm run dev` | Web (:3010) + API (:3001) |
| `npm run build` | Build both |

Web uses **3010** so port **3000** can stay free for other local tools (e.g. Grafana).

## Auth flow

1. `/api/auth/google` or `/api/auth/linkedin` → Nest → provider
2. Provider → Nest `/auth/google/callback` or `/auth/linkedin/callback`
3. Nest → web `/auth/callback?code=...`
4. Web → Nest `POST /auth/exchange` → session JWT
5. Timeline calls `/api/timelines/me` with Bearer JWT

Setup details (local + production): [`docs/google-oauth.md`](./docs/google-oauth.md)

Cosmos: [`docs/cosmos-setup.md`](./docs/cosmos-setup.md)
