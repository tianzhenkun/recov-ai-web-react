# LingChen Multi-product Frontend

English | [简体中文](./README.zh-CN.md)

This repository contains the shared React, Ant Design Pro, and Umi Max frontend. One source tree produces one `dist/` artifact for shared administration, Recov, Sales, and Billing capabilities. Product sites, login layouts, menus, permissions, and deployment topologies are configured independently rather than being bound one-to-one to source directories.

## Development

```bash
npm install
npm run configure:local
PORT=8001 npm run dev
```

Development always connects to a real backend; there is no runtime-mock mode. Confirm that port 8001 is available and select the single main Gateway in the local configuration wizard. All current browser business requests use the main API; intelligent-outbound data and the `/sys/voice` business configuration do not use a dedicated Voice connection.

## Verification and Build

```bash
npm run lint
npm test -- --runInBand
npm run build
```

`npm run build` creates the single `dist/` artifact. The release repository packages that artifact into the production Web Docker image.

## Source Layout

```text
config/routes/          Route aggregation for admin, recov, sales, and billing
src/api/                Main API, runtime configuration, and request security boundaries
src/app/                App shell, auth, menu, and global extensions
src/branding/           Default branding and theme
src/login-layouts/      Reusable login layouts and their registry
src/modules/admin/      Shared platform administration
src/modules/recov/      Recov business module
src/modules/sales/      Sales business module
src/modules/billing/    Billing capability reusable by multiple products
src/pages/              Thin Umi route entries and remaining shared public pages
src/shared/             Stable cross-module types and shared platform services
src/site-profiles/      Server-side site configuration parsing
```

Business-module page implementations live in their owning module. `src/pages/` supplies Umi file entries and still contains a small number of shared public pages awaiting migration. For signed-in users, ordinary business pages must match the complete raw authorization route tree returned by `/system/menu/getRouters`, including hidden routes; load failures fail closed. `hideInMenu` and `activeMenu` affect presentation only and do not grant authorization; the frontend must not inject menu items or routes omitted by the backend.

## Documentation

- [Frontend module conventions](./docs/前端模块规范.md)
- [Local and production deployment](./docs/部署说明.md)
- [Project cheatsheet](./docs/cheatsheet.en-US.md)
