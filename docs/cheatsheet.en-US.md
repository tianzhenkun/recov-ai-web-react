# Frontend Project Cheatsheet

This project uses React, Ant Design Pro, and Umi Max, but business code no longer follows the Ant Design Pro demo layout. See [Frontend Module Conventions](./前端模块规范.md) for boundaries and extension rules, and [Deployment Guide](./部署说明.md) for local and production deployment.

## Common Commands

| Command | Purpose |
| --- | --- |
| `npm run configure:local` | Generate local configuration for a real backend |
| `PORT=8001 npm run dev` | Start development with the real backend proxy |
| `npm run lint` | Run Biome and TypeScript checks |
| `npm test -- --runInBand` | Run the complete Jest suite serially |
| `npm run build` | Generate the production `dist/` artifact |

There is no runtime-mock start mode. Jest mocks are only used for unit-test isolation and never participate in development or production runtime behavior.

## Directory Layout

```text
config/routes/          Module route registration
src/api/                Main API, runtime configuration, and request security boundaries
src/app/                Application shell, auth, menu, and extensions
src/branding/           Default branding and theme
src/login-layouts/      Login layouts and their registry
src/modules/admin/      Shared platform administration
src/modules/recov/      Recov business module
src/modules/sales/      Sales business module
src/modules/billing/    Shared Billing capability
src/pages/              Thin Umi route entries
src/shared/             Stable cross-module types and shared platform services
src/site-profiles/      Server-side site configuration parsing
```

## Adding a Page

1. Implement the page under `src/modules/<module>/pages/`.
2. Add a one-line Umi entry under `src/pages/`.
3. Register the route in `config/routes/<module>.ts`.
4. Make the complete authorization tree from `/system/menu/getRouters` explicitly return the business path; hidden routes must also exist in the raw tree.
5. Configure and verify menu presentation, Umi `access`, button permission codes, and backend endpoint authorization independently.

`hideInMenu` and backend `activeMenu` affect presentation only and do not grant authorization. Authorization-load failures for ordinary business pages fail closed. The frontend must not infer or inject backend menu items or routes from directories, parent paths, or product codes.

## APIs

- All current business calls use `src/api/main.ts` through the main Gateway.
- `adminApi` is parsed only for formal-release compatibility and is ignored by business requests.
- Do not pre-create API types by product. A new product that can reuse the main API needs no new channel.
- Only after a new upstream is proven unable to pass through the main Gateway may its owning module design a direct API together with same-origin proxying, authentication, auditing, release, and deployment verification contracts.

## Build and Deployment

`npm run build` creates one `dist/` artifact. Production packages that artifact into the Web Docker image. The server-side site configuration selects the login layout. Installing the fixed Infra and App packages on one host or placing them on separate infrastructure and application hosts changes only package placement, not source directories.
