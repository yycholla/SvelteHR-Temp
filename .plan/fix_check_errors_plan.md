# Fix Plan for Svelte Check Errors

We encountered errors in `svelte-check` after the recent `any` removal refactoring. We need to address these issues.

## Issues & Fixes

### `src/lib/server/tasks/subtask-progress.ts`

- **Error**: `Cannot find name 'getGraphQLEndpoint'`.
- **Reason**: I missed importing `getGraphQLEndpoint` or I accidentally removed the import during refactoring.
- **Fix**: Re-add the import `import { getGraphQLEndpoint } from '$lib/server/api-url';`.

### `src/routes/dashboard/+page.server.ts`

- **Error**: `Property 'isAllDay' does not exist on type 'ApiEvent'. Did you mean 'allDay'?`.
- **Reason**: `ApiEvent` interface defines `allDay: boolean`, but code uses `isAllDay`.
- **Fix**: Rename `isAllDay` to `allDay` in `ApiEvent` definition OR map `allDay` to `isAllDay` in the transformer function. The GraphQL query asks for `allDay`, so `ApiEvent` should probably stick to that or be mapped.

### `src/routes/dashboard/events/+page.server.ts`

- **Error**: `Cannot find name 'Client'`.
- **Reason**: I tried to use `Client` type but didn't import it.
- **Fix**: Import `Client` from `@urql/core`.
- **Error**: `No overload matches this call... Types of parameters 'a' and 'value' are incompatible`.
- **Reason**: The `EventAttendee` type from `$lib/graphql/types` has more fields (`createdAt`, `eventId`, etc.) than the object structure inferred from the GraphQL query result which might be missing some fields or having them optional in a way that TypeScript doesn't like for the `find` predicate.
- **Fix**:
  1.  Ensure the GraphQL query fetches all fields required by `EventAttendee` OR
  2.  Define a local `PartialEventAttendee` type that matches what we actually get from the query and use that in the `find` callback.

## Execution Order

1.  Fix `subtask-progress.ts` imports.
2.  Fix `Client` import in `events/+page.server.ts`.
3.  Fix `ApiEvent` type in `dashboard/+page.server.ts`.
4.  Fix `EventAttendee` mismatch in `events/+page.server.ts` by defining a compatible local interface matching the query.
