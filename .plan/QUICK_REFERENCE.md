# Quick Reference Card: Error Resolution

**Total Errors**: 910 errors + 1 warning
**Estimated Time**: 14-20 hours
**Success Rate**: High (well-categorized, mostly mechanical)

## TL;DR

The codebase has 910 compilation errors from an incomplete logger refactoring. **60% can be fixed with automated scripts in 3 hours**. The remaining 40% requires manual work but follows clear patterns.

## The 5-Phase Fix

| #   | Phase              | Errors | Time  | Type      | Start Here                                   |
| --- | ------------------ | ------ | ----- | --------- | -------------------------------------------- |
| 1   | Add Logger Imports | 450    | 2h    | 🤖 Auto   | [Plan](./phase1_missing_imports_plan.md)     |
| 2   | Fix Syntax Errors  | 120    | 1h    | 🤖 Auto   | [Plan](./phase2_syntax_errors_plan.md)       |
| 3   | Fix Logger API     | 86     | 3-4h  | 👤 Manual | [Plan](./phase3_logger_api_fixes_plan.md)    |
| 4   | Specific Fixes     | 8      | 0.5h  | 👤 Manual | [Plan](./phase4_specific_fixes_plan.md)      |
| 5   | Complex Types      | 247    | 8-12h | 👤 Manual | [Plan](./phase5_complex_type_errors_plan.md) |

## Day-by-Day Timeline

### Day 1: Phases 1-2 (3-4 hours)

- Run automated scripts for imports and syntax
- Reduce errors: 910 → 340 (63% done)
- Commit and test

### Day 2: Phase 3 (4 hours)

- Fix logger API type errors manually
- Reduce errors: 340 → 254 (72% done)
- Commit and test

### Day 3: Phase 4-5 Start (4 hours)

- Quick specific fixes
- Begin complex type errors
- Reduce errors: 254 → ~200 (78% done)

### Days 4-6: Phase 5 Complete (8-12 hours)

- Finish complex type errors
- Reduce errors: ~200 → 0 (100% done)
- Final testing and documentation

## Logger API Cheat Sheet

### Correct Signatures

```typescript
logger.debug(message: string, meta?: LogMeta): void
logger.info(message: string, meta?: LogMeta): void
logger.warn(message: string, meta?: LogMeta): void
logger.error(message: string, error?: Error, meta?: LogMeta): void
```

### Common Fixes

#### ❌ Wrong → ✅ Right

```typescript
// Missing import
❌ logger.info('Message');
✅ import { logger } from '$lib/utils/logger';
   logger.info('Message');

// Syntax error
❌ logger.info(`Loading:: ${id}`;
✅ logger.info(`Loading: ${id}`);

// Wrong parameter type
❌ logger.info('Message', userId);
✅ logger.info('Message', { userId });

// String as Error
❌ logger.error('Failed', errorMessage);
✅ logger.error('Failed', new Error(errorMessage));

// Too many args
❌ logger.error('Error at:', location, 'reason:', reason);
✅ logger.error('Error occurred', reason as Error, { location });
```

## Verification Commands

```bash
# Check total errors
npm run check 2>&1 | grep "found.*errors"

# Count by category
npm run check 2>&1 | grep "Cannot find name 'logger'" | wc -l  # Missing imports
npm run check 2>&1 | grep "')' expected" | wc -l               # Syntax errors
npm run check 2>&1 | grep "Argument of type" | wc -l           # Type errors

# Run full check
npm run check

# Test build
npm run build

# Run tests
npm run test:unit -- --run
```

## Automation Scripts

### Find Files Missing Logger Import

```bash
grep -r "logger\." src/ --include="*.ts" --include="*.svelte" \
  | cut -d: -f1 | sort -u \
  | while read file; do
      if ! grep -q "import.*logger.*from.*logger" "$file"; then
        echo "$file"
      fi
    done
```

### Fix Missing Parentheses

```bash
# Search for: logger.info(`message: ${var}`;
# Replace with: logger.info(`message: ${var}`);

find src -type f \( -name "*.ts" -o -name "*.svelte" \) \
  -exec sed -i 's/\(logger\.[a-z]*(`[^`]*`\);/\1);/g' {} \;
```

## Files by Priority

### High Priority (Fix First)

- `src/lib/graphql/client.ts` - API communication
- `src/lib/server/db.ts` - Database queries
- `src/lib/auth/jwt-utils.ts` - Authentication
- `src/lib/utils/error-handling.ts` - Error handling

### Medium Priority

- Components in `src/lib/components/`
- Routes in `src/routes/dashboard/`
- GraphQL queries in `src/lib/graphql/queries/`

### Low Priority

- Example pages
- Development utilities
- Non-critical features

## Success Criteria

✅ Phase complete when:

- Expected error reduction achieved
- `npm run check` passes for that category
- Changes committed
- Build succeeds (after Phase 2+)

✅ Project complete when:

- 0 errors: `npm run check` shows no errors
- Build works: `npm run build` succeeds
- Tests pass: All tests green
- Server runs: Dev server starts without errors

## Emergency Rollback

```bash
# If something goes wrong
git status                    # Check what changed
git diff src/                 # Review changes
git checkout -- src/file.ts   # Rollback specific file
git reset --hard HEAD~1       # Rollback last commit
```

## Common Gotchas

1. **Don't skip phases** - They build on each other
2. **Commit after each phase** - Don't do all at once
3. **Test incrementally** - Verify after each phase
4. **Use type guards** - Don't force type conversions
5. **Wrap primitives** - Logger metadata must be objects

## Need Help?

1. **Check phase plan** - Detailed examples for each phase
2. **Review issue_analysis.md** - Complete categorization
3. **Search codebase** - Find similar patterns
4. **Ask team** - Share blockers early

## Quality Code Examples

### ✅ Good Logger Usage

```typescript
import { logger } from '$lib/utils/logger';

// Simple message
logger.info('User logged in');

// With metadata
logger.info('User logged in', {
	userId: user.id,
	role: user.role,
	timestamp: Date.now()
});

// Error with context
try {
	await riskyOperation();
} catch (error) {
	logger.error('Operation failed', error as Error, {
		operation: 'riskyOperation',
		userId: user.id
	});
	throw error;
}
```

### ✅ Good Type Safety

```typescript
// Type guard for unknown errors
function toError(error: unknown): Error {
  if (error instanceof Error) return error;
  return new Error(String(error));
}

// Usage
catch (error: unknown) {
  logger.error('Failed', toError(error));
}
```

## File Structure

```
.plan/
├── README.md                          # Start here for overview
├── MASTER_EXECUTION_PLAN.md           # Complete timeline
├── QUICK_REFERENCE.md                 # This file
├── issue_analysis.md                  # Detailed analysis
├── phase1_missing_imports_plan.md
├── phase2_syntax_errors_plan.md
├── phase3_logger_api_fixes_plan.md
├── phase4_specific_fixes_plan.md
└── phase5_complex_type_errors_plan.md
```

## Progress Tracking

| Milestone         | Errors | % Complete  |
| ----------------- | ------ | ----------- |
| Start             | 910    | 0%          |
| After Phase 1     | 460    | 49%         |
| After Phase 2     | 340    | 63%         |
| After Phase 3     | 254    | 72%         |
| After Phase 4     | 247    | 73%         |
| **After Phase 5** | **0**  | **100%** ✅ |

---

**Ready?** Start with [MASTER_EXECUTION_PLAN.md](./MASTER_EXECUTION_PLAN.md) for the complete guide.

**In a hurry?** Jump directly to [Phase 1](./phase1_missing_imports_plan.md) and start executing.
