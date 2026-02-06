# Consolidated Sync API (v2)

This is the new consolidated sync API that replaces the old fragmented endpoints in `/api/intuit/`.

## Endpoint

**POST `/api/sync`**

## Features

- ✅ Unified endpoint for all sync operations
- ✅ Uses new hexagonal architecture backend (`sync_v2`)
- ✅ Supports push, pull, and bidirectional sync
- ✅ Built-in conflict resolution strategies
- ✅ Full and incremental sync modes
- ✅ Comprehensive error reporting
- ✅ Type-safe with TypeScript

## Request Body

```typescript
{
  // REQUIRED: Type of entity to sync
  entity_type: 'EMPLOYEE' | 'DEPARTMENT',

  // REQUIRED: Direction of sync
  direction: 'PUSH' | 'PULL' | 'BIDIRECTIONAL',

  // OPTIONAL: Sync mode (default: INCREMENTAL)
  mode?: 'FULL' | 'INCREMENTAL',

  // OPTIONAL: Conflict resolution strategy (default: LAST_WRITE_WINS)
  // Only used for bidirectional sync
  conflict_strategy?: 'LOCAL_WINS' | 'REMOTE_WINS' | 'LAST_WRITE_WINS' | 'MANUAL'
}
```

## Response

```typescript
{
  success: boolean;
  entity_type: 'EMPLOYEE' | 'DEPARTMENT';
  direction: 'PUSH' | 'PULL' | 'BIDIRECTIONAL';
  mode: 'FULL' | 'INCREMENTAL';
  status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'COMPLETED_WITH_ERRORS' | 'FAILED';
  started_at: string;          // ISO 8601 timestamp
  completed_at: string | null; // ISO 8601 timestamp
  duration_ms: number | null;  // Duration in milliseconds
  pushed_count: number;        // Items pushed to QuickBooks
  pulled_count: number;        // Items pulled from QuickBooks
  conflicts_count: number;     // Conflicts detected and resolved
  errors: string[];           // List of error messages
  message: string;            // Human-readable summary
}
```

## Examples

### Pull Employees (Incremental)

```bash
curl -X POST http://localhost:5173/api/sync \
  -H "Content-Type: application/json" \
  -d '{
    "entity_type": "EMPLOYEE",
    "direction": "PULL",
    "mode": "INCREMENTAL"
  }'
```

### Push Departments (Full)

```bash
curl -X POST http://localhost:5173/api/sync \
  -H "Content-Type: application/json" \
  -d '{
    "entity_type": "DEPARTMENT",
    "direction": "PUSH",
    "mode": "FULL"
  }'
```

### Bidirectional Sync with Conflict Resolution

```bash
curl -X POST http://localhost:5173/api/sync \
  -H "Content-Type: application/json" \
  -d '{
    "entity_type": "EMPLOYEE",
    "direction": "BIDIRECTIONAL",
    "mode": "INCREMENTAL",
    "conflict_strategy": "LAST_WRITE_WINS"
  }'
```

## Using in Svelte Components

```typescript
import { syncEmployeesBidirectional, isSyncSuccessful } from '$lib/api/sync';

async function handleSync() {
	const result = await syncEmployeesBidirectional('INCREMENTAL', 'LAST_WRITE_WINS');

	if (isSyncSuccessful(result)) {
		console.log(`Synced ${result.pushed_count} pushed, ${result.pulled_count} pulled`);
	} else {
		console.error(`Sync failed: ${result.error}`);
	}
}
```

## Migration from Old Endpoints

| Old Endpoint                             | New Request                                                                                     |
| ---------------------------------------- | ----------------------------------------------------------------------------------------------- |
| `POST /api/intuit/sync`                  | `{ entity_type: 'EMPLOYEE', direction: 'PULL' }`                                                |
| `POST /api/intuit/pull?type=employees`   | `{ entity_type: 'EMPLOYEE', direction: 'PULL' }`                                                |
| `POST /api/intuit/pull?type=departments` | `{ entity_type: 'DEPARTMENT', direction: 'PULL' }`                                              |
| `POST /api/intuit/push?type=employees`   | `{ entity_type: 'EMPLOYEE', direction: 'PUSH' }`                                                |
| `POST /api/intuit/push?type=departments` | `{ entity_type: 'DEPARTMENT', direction: 'PUSH' }`                                              |
| `POST /api/intuit/sync-bidirectional`    | `{ entity_type: 'EMPLOYEE', direction: 'BIDIRECTIONAL', conflict_strategy: 'LAST_WRITE_WINS' }` |

## Conflict Resolution Strategies

- **LOCAL_WINS**: Always keep local changes, discard remote changes
- **REMOTE_WINS**: Always keep remote changes, discard local changes
- **LAST_WRITE_WINS**: Keep the most recently updated version (recommended)
- **MANUAL**: Mark conflicts for manual resolution, don't auto-resolve

## Error Handling

Errors are returned in the `errors` array in the response. The `status` field indicates:

- `COMPLETED`: All operations succeeded
- `COMPLETED_WITH_ERRORS`: Some operations succeeded, some failed
- `FAILED`: The entire sync operation failed

Example error response:

```json
{
	"error": "entity_type is required",
	"status": 400
}
```

## Backend Architecture

This endpoint uses the new hexagonal architecture backend:

- **Domain Layer**: Pure business logic (entities, value objects, services)
- **Application Layer**: `SyncService` orchestrating sync operations
- **Adapter Layer**: `QuickBooksAdapter`, `SeaOrmSyncRepository`
- **GraphQL Layer**: `sync_v2.sync()` mutation

For more details, see the backend documentation in `/graphql-rust-server/src/domain/sync/`.
