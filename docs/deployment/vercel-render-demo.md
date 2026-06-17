# Vercel Frontend + Render Backend Demo Deployment

## Backend: Render

Create a Render Blueprint from the repository root. Render will read `render.yaml` and create:

- Web service: `ai-sw-basic-server`
- Web service: `ai-sw-ai-server`
- PostgreSQL database: `ai-sw-basic-db`

After the first deploy, update these Render environment variables:

```env
CLIENT_ORIGIN=https://your-vercel-app.vercel.app
AI_SERVER_BASE_URL=https://your-ai-server.onrender.com
OPENAI_API_KEY=your-openai-api-key
GITHUB_TOKEN=your-github-token
ADMIN_INGEST_TOKEN=your-random-admin-token
```

`AI_SERVER_BASE_URL` belongs to the Nest backend service. `OPENAI_API_KEY`, `GITHUB_TOKEN`, and `ADMIN_INGEST_TOKEN` belong to the FastAPI AI service. `GITHUB_TOKEN` is only required for the GitHub Issue approval flow.

The Nest backend and FastAPI AI server share Render PostgreSQL through `DATABASE_URL`. `DB_HOST`, `DB_PORT`, `DB_USERNAME`, `DB_PASSWORD`, and `DB_DATABASE` are still supported for local Nest development.

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

For the Render backend, the build command installs devDependencies even when `NODE_ENV=production`, because Nest needs `@nestjs/cli` during `pnpm run build`. It intentionally avoids `corepack enable` because Render's system pnpm path can be read-only during builds.

## Demo Checklist

1. Deploy the Render backend first.
2. Confirm both Render services are healthy: `ai-sw-basic-server` and `ai-sw-ai-server`.
3. Copy the Nest Render service URL into Vercel as `VITE_API_BASE_URL`.
4. Deploy the Vercel frontend.
5. Copy the Vercel URL into Render as `CLIENT_ORIGIN`.
6. If the FastAPI URL differs from `https://ai-sw-ai-server.onrender.com`, update Nest `AI_SERVER_BASE_URL`.
7. Redeploy or restart the Render services after changing environment variables.
8. Open both Render service URLs once before the demo to avoid free-plan cold start.

## RAG Ingest Without Render Shell

Render free services do not provide Shell access. Set `ADMIN_INGEST_TOKEN` on `ai-sw-ai-server`, redeploy, then run this from your local terminal:

```bash
curl -X POST https://ai-sw-ai-server.onrender.com/admin/rag/ingest \
  -H "X-Admin-Token: your-random-admin-token"
```

The response should show `document_count` and `embedding_count`.
