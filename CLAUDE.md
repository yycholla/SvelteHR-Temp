# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

# SvelteKit HR Application

A modern HR management system built with **SvelteKit 2.43+**, **Svelte 5 (Runes)**, **TypeScript 5**, and **Tailwind CSS 4**, integrated with a **Rust GraphQL backend** (Async-GraphQL + SeaORM).

## Core Mandates

- DO NOT USE ANY, default to defined types, use unknown if unable to use defined type. Only use any for approved cases.
- **Svelte 5 Runes:** Use `$state`, `$derived`, `$props`, `$bindable`, `$effect`. Avoid legacy stores where possible.
- **Server-Side Data Fetching:** ALL data fetching MUST happen in `+page.server.ts` or `+layout.server.ts`. NEVER fetch data directly in components.
- **Strict Types:** No `any`. Use strict TypeScript interfaces.
- **Session Auth:** Authentication is session-based (HTTP-only cookies). Always forward cookies in server-side requests.

## Tech Stack (2025)

- **Frontend:** SvelteKit 2.43.5+, Svelte 5.39+, Vite 7.1.7
- **Styling:** Tailwind CSS 4.1.16, Bits UI 2.14, Skeleton UI
- **Backend:** Rust (Axum, Async-GraphQL, SeaORM)
- **Data:** PostgreSQL 14+, Redis
- **Testing:** Vitest 3.2.3 (Unit/Integration), Playwright 1.55 (E2E)

## Development Commands

**Svelte 5 MCP:**

- Use `list-sections` to discover docs.
- Use `get-documentation` to read specific sections.
- Use `svelte-autofixer` before finalizing Svelte code.
- Use `playground-link` only upon request.

**Core:**

- `npm run dev` - Start dev server (use `npm run dev:local` for local backend)
- `npm run build` - Production build
- `npm run check` - TypeScript/Svelte check (CRITICAL before commits)
- `npm run lint` / `npm run format` - Linting and formatting
- `npm run test` - Run all tests
- `npm run test:unit` - Run unit tests
- `npm run test:e2e` - Run E2E tests

## Architecture & Data Flow

### Directory Structure

- `src/lib/components/` - Reusable UI components
- `src/lib/graphql/` - GraphQL client and operations
- `src/lib/stores/` - Global state (avoid if local state suffices)
- `src/lib/utils/` - Shared utilities
- `src/routes/` - SvelteKit file-based routing
- `src/routes/api/` - Server-side API endpoints

### Data Fetching Patterns

**1. Preferred (New Code) - Direct Client:**

```typescript
import { client } from '$lib/graphql/client';
import { GET_DATA } from '$lib/graphql/queries';

export const load: PageServerLoad = async () => {
	const result = await client.query(GET_DATA, { limit: 20 });

	if (result.error) {
		console.error(result.error);
		return { data: [] };
	}

	return { data: result.data?.items ?? [] };
};
```

**2. With Authentication (Server-Side):**

```typescript
import { createUrqlClient, serializeCookies } from '$lib/graphql/client';
import { GET_EMPLOYEES } from '$lib/graphql/queries';

export const load: PageServerLoad = async ({ fetch, cookies }) => {
	// Create authenticated client with cookies
	const client = createUrqlClient(fetch, undefined, undefined, serializeCookies(cookies));

	const result = await client.query(GET_EMPLOYEES, { limit: 20 }).toPromise();

	if (result.error) {
		console.error(result.error);
		return { employees: [] };
	}

	return {
		employees: result.data.employees
	};
};
```

**2. Client-Side Consumption (`+page.svelte`):**

```svelte
<script lang="ts">
	let { data } = $props(); // Receive data from load function
	let employees = $derived(data.employees);
</script>

{#each employees as employee}
	<p>{employee.name}</p>
{/each}
```

**IMPORTANT:**

- The backend often returns full datasets; client-side filtering/sorting is common due to current backend limitations.
- Use `src/lib/graphql/client.ts` utilities.
- Do NOT use `MountainHRApiClient` (deprecated/removed).

### Employee Module Architecture (Hexagonal/Clean Architecture)

The employee module follows **hexagonal architecture** (ports & adapters pattern) with clear layer separation:

**Domain Layer** (`src/domain/Employee/`):

- `Employee` entity with business logic and invariants
- Value objects: `Email`, `PersonName`, `HireDate`, `EmployeeStatus`
- Domain errors: `EmployeeNotFoundError`, `EmployeeAlreadyExistsError`, etc.
- `Result<T, E>` pattern for type-safe error handling
- **Zero dependencies** on external frameworks (pure TypeScript)

**Service Layer** (`src/services/`):

- `EmployeeService` orchestrates employee operations (CRUD + bulk)
- Depends on `EmployeeRepository` port (interface, not implementation)
- Returns `Result<T, DomainError>` for all operations
- Business workflows: duplicate detection, validation, status management
- **156 comprehensive tests** (100% passing)

**Adapter Layer** (`src/adapters/`):

- `GraphQLEmployeeAdapter` implements `EmployeeRepository` port
- Translates between GraphQL schema and domain entities
- Data sanitization at boundary (phone validation, hire date validation)
- Resilient error handling (returns null for invalid data instead of throwing)

**Route Integration:**

- Server load functions use `createEmployeeService(event)` factory
- Domain entities mapped to serializable data for components
- All business logic in domain/service layers (NOT in components)
- GraphQL operations marked `@deprecated` - use EmployeeService instead

**Usage Example:**

```typescript
// src/routes/dashboard/employees/new/+page.server.ts
import { createEmployeeService } from '$lib/server/services';

export const actions = {
	default: async (event) => {
		const employeeService = createEmployeeService(event);
		const result = await employeeService.createEmployee(data);

		if (result.isError) {
			// Map domain errors to user-friendly messages
			return fail(400, { error: result.error.message });
		}

		return { employee: result.value };
	}
};
```

**Benefits:**

- **Type Safety:** Zero `any` types throughout employee module
- **Testability:** Domain layer tests run in milliseconds (no I/O)
- **Maintainability:** Changes to GraphQL schema isolated to adapter
- **Validation:** Domain rules enforced at entity creation (email format, hire dates, etc.)

## RBAC & Permissions

- **Roles:** Admin > HR Manager > Manager > Employee.
- **Enforcement:**
  - **Server-Side:** Check permissions in `+page.server.ts` using `locals.user.permissions`.
  - **Client-Side:** UI elements hidden based on `data.user.permissions`.
  - **Backend:** Rust backend enforces RLS and field-level security.

## Testing Strategy

- **E2E (Playwright):** `tests/e2e/` - Focus on critical flows (auth, dashboard, forms).
- **Unit (Vitest):** `src/**/*.test.ts` - Logic, utils, and component rendering.
- **Browser Tests:** `vitest-browser-svelte` is configured for component testing.
