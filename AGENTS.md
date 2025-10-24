# SvelteHR Development Guidelines

## Technology Stack

- **Frontend**: SvelteKit 2.22.0, Svelte 5.0, TypeScript 5.0, Tailwind CSS 4.0, Vite 7.0.4
- **Backend**: Rust GraphQL (async-graphql + SeaORM + axum-login), Go backend (MountainHR API)
- **Testing**: Vitest 3.2.3, Playwright 1.49.1, Storybook 9.1.1
- **Auth**: Session-based with axum-login, HTTP-only cookies, RBAC permissions

## Build/Lint/Test Commands

### Frontend (SvelteKit/TypeScript)

- **Build**: `npm run build`
- **Dev server**: `npm run dev`
- **Type check**: `npm run check`
- **Lint**: `npm run lint`
- **Format**: `npm run format`
- **All tests**: `npm run test`
- **Unit tests**: `npm run test:unit` or `npm run test:unit:server` / `npm run test:unit:client`
- **Integration tests**: `npm run test:integration`
- **Contract tests**: `npm run test:contract`
- **GraphQL tests**: `npm run test:graphql`
- **E2E tests**: `npm run test:e2e`
- **Single test**: `vitest <path/to/test.spec.ts>` or `vitest --run <path/to/test.spec.ts>`

### Backend (Rust)

- **Build**: `cargo build` (in graphql-rust-server/)
- **Test**: `cargo test` (in graphql-rust-server/)
- **Lint**: `cargo clippy` (in graphql-rust-server/)
- **Single test**: `cargo test <test_name>` (in graphql-rust-server/)

### Database

- **Migrate**: `npm run db:migrate`
- **Create migration**: `npm run db:new-migration`
- **Verify schema**: `npm run db:verify`

## Code Style Guidelines

### TypeScript/JavaScript

- **Formatting**: Prettier with tabs, single quotes, no trailing commas, 100 char width
- **Linting**: ESLint with TypeScript rules, strict for auth/audit/security code
- **Imports**: Sorted imports, prefer named imports over default
- **Naming**: camelCase for variables/functions, PascalCase for types/interfaces/classes
- **Types**: Strict TypeScript, no `any` in security-critical code (auth/audit)
- **Error handling**: Prefer nullish coalescing (`??`) and optional chaining (`?.`)
- **Async**: Use async/await, avoid floating promises in security code

### Svelte Components

- **File naming**: PascalCase with .svelte extension
- **Props**: Use TypeScript interfaces, destructure with `$props()`
- **Events**: Use Svelte 5 event handling patterns
- **Styling**: Tailwind CSS with custom CSS variables
- **Testing**: Use Storybook for component stories

### Rust

- **Formatting**: Standard Rust formatting (`cargo fmt`)
- **Linting**: `cargo clippy` with strict rules
- **Naming**: snake_case for variables/functions, PascalCase for types/structs
- **Error handling**: Use `Result<T, E>` and `?` operator, custom error types with `thiserror`
- **Async**: Tokio runtime, use async/await patterns

### File Organization

- **Components**: `src/lib/components/` with feature-based subdirectories
- **Utilities**: `src/lib/utils/` for shared functions
- **Types**: `src/lib/models/` for data models and interfaces
- **Stores**: `src/lib/stores/` for Svelte stores
- **Server code**: `src/lib/server/` for server-side utilities

## Critical Architectural Rules

### Server-Side RBAC API Calls (MANDATORY)

- **ALL API calls to MountainHR backend MUST be made server-side with session cookies**
- **NEVER make API calls directly from client-side components**
- **Use `+page.server.ts` and `+layout.server.ts` for all RBAC-aware data fetching**
- **ALWAYS verify user permissions server-side via session authentication**
- **Client components receive filtered data based on user's RBAC permissions**

### Archon Integration & Workflow (MANDATORY)

- **Always complete the full Archon task cycle before any coding**
- **Check current task → Research → Implement → Update status → Get next task**
- **Move tasks from "todo" → "doing" → "review" (not directly to complete)**
- **DO NOT make assumptions - check project documentation first**

## Security Guidelines

- **Auth/Audit code**: Strict linting, no `any` types, explicit return types, no console.log
- **Session management**: HTTP-only cookies via axum-login, secure session handling
- **Input validation**: Use Zod schemas for validation
- **Error handling**: Never expose sensitive information in errors
