# Senior Architect UI Workspace

A monorepo workspace for the Senior Architect UI project.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server (port 5000)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- Required env: `DATABASE_URL` — Postgres connection string

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- API: Express 5
- DB: PostgreSQL + Drizzle ORM
- Validation: Zod (`zod/v4`), `drizzle-zod`
- API codegen: Orval (from OpenAPI spec)
- Build: esbuild (CJS bundle)

## Where things live

- `artifacts/app`: The main React front-end application
- `artifacts/mockup-sandbox`: Mockup sandbox environment for UI/UX testing
- `lib/db`: Database connection and schema definitions
- `lib/api-spec`: OpenAPI specifications and generated types/hooks
- `lib/integrations`: Server-side API integration modules

## Architecture decisions

- Monorepo workspace structure powered by pnpm workspaces
- Shared database connection, validation, and API schemas via local TypeScript libraries

## Product

- Interactive AI Career Copilot for tech professionals

## Gotchas

- Ensure a valid `DATABASE_URL` is set before starting development servers
