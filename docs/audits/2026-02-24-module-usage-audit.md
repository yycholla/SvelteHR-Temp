# Module Usage Audit Report

**Generated**: 2026-02-24T14:25:34.309Z
**Compliance**: 98% (152/155 routes)

## Summary

- ✅ **Compliant**: 152 routes
- ❌ **Violations**: 3 routes

## By Module

| Module            | Total | Compliant | Violations | Rate |
| ----------------- | ----- | --------- | ---------- | ---- |
| AuditLog          | 1     | 1         | 0          | 100% |
| Department        | 4     | 4         | 0          | 100% |
| Document          | 4     | 4         | 0          | 100% |
| Employee          | 5     | 5         | 0          | 100% |
| Event             | 5     | 5         | 0          | 100% |
| Notification      | 1     | 1         | 0          | 100% |
| Onboarding        | 2     | 1         | 1          | 50%  |
| PerformanceReview | 3     | 3         | 0          | 100% |
| Task              | 9     | 9         | 0          | 100% |
| Training          | 2     | 2         | 0          | 100% |
| Unknown           | 119   | 117       | 2          | 98%  |

## Violations

### Onboarding Module (1 violations)

- `src/routes/dashboard/onboarding/[id]/+page.server.ts` (direct-import)
  - **Suggestion**: Replace direct GraphQL client imports with: import { createOnboardingService } from '$lib/server/services'

### Unknown Module (2 violations)

- `src/routes/admin/forms/[id]/+page.server.ts` (direct-import)
  - **Suggestion**: Replace direct GraphQL client imports with: import { the appropriate service layer factory } from '$lib/server/services'
- `src/routes/admin/onboarding/[id]/forms/+page.server.ts` (direct-import)
  - **Suggestion**: Replace direct GraphQL client imports with: import { the appropriate service layer factory } from '$lib/server/services'
