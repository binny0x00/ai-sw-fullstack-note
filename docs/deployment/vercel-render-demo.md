# Vercel Frontend + Render Backend Demo Deployment

## Backend: Render

Create a Render Blueprint from the repository root. Render will read `render.yaml` and create:

- Web service: `ai-sw-basic-server`
- PostgreSQL database: `ai-sw-basic-db`

After the first deploy, update these Render environment variables:

```env
CLIENT_ORIGIN=https://your-vercel-app.vercel.app
AI_SERVER_BASE_URL=https://your-ai-server.example.com
```

If the AI server is not part of the demo, leave `AI_SERVER_BASE_URL` as a placeholder and avoid AI routes during the demonstration.

The backend uses `DATABASE_URL` when Render provides it. `DB_HOST`, `DB_PORT`, `DB_USERNAME`, `DB_PASSWORD`, and `DB_DATABASE` are still supported for local development.

## Frontend: Vercel

Import `client/basic-client` as the Vercel project root.

Set the Vercel environment variable:

```env
VITE_API_BASE_URL=https://your-render-service.onrender.com
```

Build settings are already captured in `client/basic-client/vercel.json`:

- Install command: `corepack enable && pnpm install --frozen-lockfile`
- Build command: `pnpm run build`
- Output directory: `dist`

## Demo Checklist

1. Deploy the Render backend first.
2. Copy the Render service URL into Vercel as `VITE_API_BASE_URL`.
3. Deploy the Vercel frontend.
4. Copy the Vercel URL into Render as `CLIENT_ORIGIN`.
5. Redeploy or restart the Render service after changing `CLIENT_ORIGIN`.
6. Open the Render service once before the demo to avoid free-plan cold start.
