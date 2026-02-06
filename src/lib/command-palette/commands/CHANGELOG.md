# Command Palette Changes - QuickBooks Sync v2

## Summary

Updated QuickBooks command palette commands to use the new consolidated sync API (`/api/sync`) powered by the hexagonal architecture backend (`sync_v2`).

## Changes

### Updated Commands

1. **qb-sync-employees** → **Pull Employees from QuickBooks**
   - Now calls `pullEmployees('INCREMENTAL')` using the new API
   - Provides immediate feedback via alert with sync results
   - Shows pulled count and any errors

2. **qb-sync-departments** → **Pull Departments from QuickBooks**
   - Now calls `pullDepartments('INCREMENTAL')` using the new API
   - Provides immediate feedback via alert with sync results

3. **qb-sync-bidirectional** → **Bidirectional Sync (Employees)**
   - Now calls `syncEmployeesBidirectional('INCREMENTAL', 'LAST_WRITE_WINS')`
   - Shows detailed results: pushed count, pulled count, conflicts count

4. **qb-force-full-sync** → **Force Full Sync (Employees)**
   - Updated to use `syncEmployeesBidirectional('FULL', 'LAST_WRITE_WINS')`
   - Includes confirmation dialog before execution
   - Shows comprehensive sync results

### New Commands

5. **qb-force-full-sync-departments** - **Force Full Sync (Departments)**
   - Full refresh of all department data
   - Uses `syncDepartmentsBidirectional('FULL', 'LAST_WRITE_WINS')`

6. **qb-sync-local-wins** - **Sync (Local Changes Win)**
   - Bidirectional sync with `LOCAL_WINS` conflict strategy
   - Keeps local changes when conflicts occur

7. **qb-sync-remote-wins** - **Sync (Remote Changes Win)**
   - Bidirectional sync with `REMOTE_WINS` conflict strategy
   - Keeps QuickBooks changes when conflicts occur

8. **qb-sync-manual-conflicts** - **Sync (Manual Resolution)**
   - Bidirectional sync with `MANUAL` conflict strategy
   - Detects conflicts but doesn't auto-resolve them
   - Automatically navigates to conflicts page if conflicts are detected

### Removed Commands

- **qb-incremental-sync** - Removed (replaced by updated sync commands with mode parameter)

## Technical Details

### New Imports

```typescript
import {
	syncEmployeesBidirectional,
	syncDepartmentsBidirectional,
	pullEmployees,
	pullDepartments,
	isSyncSuccessful
} from '$lib/api/sync';
```

### Response Handling

All sync commands now:

- Use `isSyncSuccessful()` helper to check results
- Display user-friendly alerts with operation details
- Show counts for pushed, pulled, and resolved conflicts
- Handle errors gracefully with fallback messages

### User Experience

Commands now provide **immediate feedback** instead of just navigating to pages:

- ✅ Success messages with sync statistics
- ❌ Error messages with clear descriptions
- ⚠️ Warnings for manual conflict resolution needed
- Confirmation dialogs for destructive operations (full sync)

## Migration Notes

Old behavior: Commands navigated to integration pages and relied on page components to trigger syncs.

New behavior: Commands directly call the sync API and provide immediate feedback, making them more useful in quick workflows.

## Next Steps

Future enhancements:

- Add progress indicators for long-running syncs
- Add support for selective sync (specific employees/departments)
- Add undo/rollback commands
- Add sync scheduling commands
