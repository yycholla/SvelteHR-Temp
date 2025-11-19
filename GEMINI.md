# SvelteHR - Gemini Context

## Project Overview
**SvelteHR** is a modern, comprehensive HR management system. It is a full-stack application featuring a **SvelteKit** frontend and a **Rust** GraphQL backend.

*   **Frontend**: SvelteKit 2.22+, Svelte 5 (Runes), TypeScript 5, Tailwind CSS 4.
*   **Backend**: Rust (Axum, Async-GraphQL, SeaORM), PostgreSQL 14+, Redis.
*   **Key Features**: Employee profiles, RBAC, Event Management, Task Tracking, Activity Logging, Notifications.

## Directory Structure
*   **Root**: Frontend (SvelteKit) application.
*   `graphql-rust-server/`: Rust backend application.
*   `src/`: Frontend source code.
    *   `lib/`: Shared utilities, components, stores.
    *   `routes/`: SvelteKit file-based routing.
*   `tests/`: End-to-End (Playwright) and integration tests.
*   `db/`: Database scripts and backups.
*   `dev-containers/`: Docker development environment configurations.

## Core Workflows

### Frontend (Root Directory)
*   **Install Dependencies**: `npm install`
*   **Start Dev Server**:
    *   With Doppler (Secrets): `npm run dev`
    *   Local (No Secrets): `npm run dev:local` (Runs on http://localhost:5173)
*   **Build**: `npm run build`
*   **Type Check**: `npm run check` (Run this before committing!)
*   **Lint/Format**: `npm run lint` / `npm run format`

### Backend (`graphql-rust-server/`)
*   **Run Dev Server**: `cargo run` (Runs on http://localhost:4000)
*   **Test**: `cargo test`

### Database
*   **Migrations**: `npm run db:migrate`
*   **Reset/Rebuild**: `npm run db:rebuild`
*   **Status**: `npm run db:migrate:status`

## Testing
*   **Unit Tests**: `npm run test:unit` (Vitest)
*   **E2E Tests**: `npm run test:e2e` (Playwright)
*   **All Tests**: `npm run test`

## Development Standards & Conventions

### Coding Style
*   **Svelte 5**: Use Runes syntax (`$state`, `$derived`, `$props`, `$bindable`).
*   **TypeScript**: Strict mode enabled. Avoid `any`.
*   **Styling**: Tailwind CSS 4.0 with `skeleton-ui` and `bits-ui`.

### Architecture
*   **Data Fetching**:
    *   **Server-Side Only**: All API calls to the backend must happen in `+page.server.ts` or `+layout.server.ts` using `MountainHRApiClient` with a Bearer token.
    *   **Client-Side**: Components receive data via props (`export let data`). Do not call the backend API directly from `.svelte` files.
*   **Authentication**: Session-based (HTTP-only cookies). Handled by `axum-login` on the backend.
*   **State Management**: Svelte 5 Runes for local state; Svelte Stores for global state (user, theme).

### Important Rules
1.  **Always run `npm run check`** before finalizing changes to catch type errors.
2.  **Respect RBAC**: Ensure code handles permissions (Admin, HR Manager, Manager, Employee) correctly.
3.  **Server-Side API**: Never expose backend API calls in client-side code.

## Current Context (2025-11-19)
*   **Active Feature**: Feature 019 (Events, Tasks, Activity Logs) is ~89% complete.
*   **Migration**: Backend migration from `sqlx` to `SeaORM` is effectively complete for business logic. `sqlx` remains for low-level database utilities and as the driver for SeaORM.
*   **Stack Update**: Recently updated to SvelteKit 2.22 and Svelte 5.
