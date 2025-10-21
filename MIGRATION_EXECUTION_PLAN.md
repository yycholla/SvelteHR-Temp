# PostGraphile to Rust Migration - Execution Plan

**Start Date**: October 20, 2025
**Status**: 🔄 **IN PROGRESS** - Phase 1 Starting

---

## 🎯 Current Priority: Phase 1 - Foundation

### Immediate Action Items (Today)

1. **Fix Critical Dashboard Error** ✅ COMPLETED
   - Removed `icon` field from leaveType query
   - File: `/src/routes/dashboard/+page.server.ts`

2. **Start with Events Operations** (NEXT)
   - File: `/src/lib/graphql/events-operations.ts`
   - High impact, used across multiple pages
   - Estimated time: 3-4 hours

---

## 📋 Phase 1: Core GraphQL Operations (This Week)

### Day 1-2: Events & Tasks Operations

#### Task 1.1: Migrate events-operations.ts
**Priority**: 🔴 CRITICAL
**File**: `/src/lib/graphql/events-operations.ts`
**Estimated Time**: 3-4 hours

**Changes Required**:
1. Remove all `.nodes` access patterns
2. Replace `filter: { field: { equalTo: $var } }` with direct parameters
3. Change `allEvents()` to `events()`
4. Update mutation patterns:
   - `createEvent(input: { event: {...} })` → `createEvent(input: {...})`
   - `updateEventByNodeId()` → `updateEvent(id, input)`
   - `deleteEventByNodeId()` → `deleteEvent(id)`

**Backend Dependencies**:
- ✅ Basic event queries exist
- ❌ Need: `events(upcomingOnly: Boolean)` parameter
- ❌ Need: Event attendee queries
- ❌ Need: Waitlist queries

**Testing**:
- [ ] Event list page loads
- [ ] Event detail page loads
- [ ] Event creation works
- [ ] Event updates work
- [ ] RSVP functionality works

---

#### Task 1.2: Migrate tasks-operations.ts
**Priority**: 🔴 CRITICAL
**File**: `/src/lib/graphql/tasks-operations.ts`
**Estimated Time**: 3-4 hours

**Changes Required**:
1. Remove `.nodes` access
2. Replace filter patterns
3. Change `allTasks()` to `tasks()`
4. Update mutations

**Backend Dependencies**:
- ✅ Basic task queries exist
- ❌ Need: `tasks(assigneeId, status, priority)` advanced filtering
- ❌ Need: Subtask queries
- ❌ Need: Task dependency queries

**Testing**:
- [ ] Task list loads
- [ ] Task detail loads
- [ ] Task creation works
- [ ] Task updates work
- [ ] Subtasks work

---

### Day 3: Supporting Operations

#### Task 1.3: Migrate employee-operations.ts
**Priority**: 🟡 HIGH
**File**: `/src/lib/graphql/employee-operations.ts`
**Estimated Time**: 2 hours

**Changes**:
- Remove `.nodes`
- Update `allEmployees()` → `users()`
- Simplify query patterns

---

#### Task 1.4: Migrate department-operations.ts
**Priority**: 🟡 HIGH
**File**: `/src/lib/graphql/department-operations.ts`
**Estimated Time**: 1.5 hours

**Changes**:
- Remove `.nodes`
- Update `allDepartments()` → `departments()`

---

#### Task 1.5: Migrate leave-management-operations.ts
**Priority**: 🟡 HIGH
**File**: `/src/lib/graphql/leave-management-operations.ts`
**Estimated Time**: 2 hours

**Changes**:
- Remove `.nodes`
- Update filter patterns
- Fix leave type references (no `icon` field)

---

### Day 4: Secondary Operations

#### Task 1.6: Migrate notifications-operations.ts
**Priority**: 🟡 HIGH
**File**: `/src/lib/graphql/notifications-operations.ts`
**Estimated Time**: 2 hours

**Backend Dependencies**:
- ❌ Need: `notifications(userId, unreadOnly)` query
- ❌ Need: Mark as read mutation

---

#### Task 1.7: Migrate activity-logs-operations.ts
**Priority**: 🟢 MEDIUM
**File**: `/src/lib/graphql/activity-logs-operations.ts`
**Estimated Time**: 1.5 hours

---

### Day 5: Final Operations & Testing

#### Task 1.8: Migrate remaining operation files
- `performance-management-operations.ts`
- `goals-okrs-operations.ts`
- `team-management-operations.ts`
- `reports-operations.ts`

**Estimated Time**: 4 hours total

#### Task 1.9: Phase 1 Testing
- Integration testing for all migrated operations
- Verify no `.nodes` remain in operation files
- Check all imports in route files still work

---

## 📋 Phase 2: High-Traffic Pages (Week 2)

### Events System Migration

#### Task 2.1: Events List Page
**File**: `/src/routes/dashboard/events/+page.server.ts`
**Depends On**: Task 1.1 (events-operations.ts)
**Estimated Time**: 2 hours

**Changes**:
```typescript
// BEFORE
const data = await graphqlClient.query(GET_EVENTS);
const events = data?.allEvents?.nodes || [];

// AFTER
const data = await graphqlClient.query(GET_EVENTS);
const events = data?.events || [];
```

---

#### Task 2.2: Event Detail Page
**File**: `/src/routes/dashboard/events/[id]/+page.server.ts`
**Estimated Time**: 2 hours

**Changes**:
- Update event query
- Fix attendee loading (`.nodes` removal)
- Update waitlist query

---

#### Task 2.3: Event Edit Page
**File**: `/src/routes/dashboard/events/[id]/edit/+page.server.ts`
**Estimated Time**: 2 hours

**Changes**:
- Update form mutations
- Remove `ByNodeId` patterns
- Update `Patch` patterns

---

#### Task 2.4: Event Create Page
**File**: `/src/routes/dashboard/events/create/+page.server.ts`
**Estimated Time**: 1.5 hours

---

#### Task 2.5: Event Settings Page
**File**: `/src/routes/dashboard/events/settings/+page.server.ts`
**Estimated Time**: 1 hour

---

### Tasks System Migration

#### Task 2.6: Tasks List Page
**File**: `/src/routes/dashboard/tasks/+page.server.ts`
**Depends On**: Task 1.2 (tasks-operations.ts)
**Estimated Time**: 2 hours

---

#### Task 2.7: Task Detail Page
**File**: `/src/routes/dashboard/tasks/[id]/+page.server.ts`
**Estimated Time**: 2 hours

---

#### Task 2.8: Task Edit Page
**File**: `/src/routes/dashboard/tasks/[id]/edit/+page.server.ts`
**Estimated Time**: 2 hours

---

#### Task 2.9: My Tasks Page
**File**: `/src/routes/dashboard/tasks/my-tasks/+page.server.ts`
**Estimated Time**: 1.5 hours

---

#### Task 2.10: Team Tasks Page
**File**: `/src/routes/dashboard/tasks/team-tasks/+page.server.ts`
**Estimated Time**: 1.5 hours

---

#### Task 2.11: Department Tasks Page
**File**: `/src/routes/dashboard/tasks/department/+page.server.ts`
**Estimated Time**: 1.5 hours

---

### Performance Reviews Migration

#### Task 2.12: Reviews List Page
**File**: `/src/routes/dashboard/reviews/+page.server.ts`
**Estimated Time**: 2 hours

---

#### Task 2.13: Review Detail Page
**File**: `/src/routes/dashboard/reviews/[id]/+page.server.ts`
**Estimated Time**: 2 hours

---

#### Task 2.14: Create Review Page
**File**: `/src/routes/dashboard/reviews/create/+page.server.ts`
**Estimated Time**: 2 hours

---

## 📋 Phase 3: Admin & Management (Week 3)

### Admin Pages

#### Task 3.1: Admin Audit Page
**File**: `/src/routes/dashboard/admin/audit/+page.server.ts`
**Estimated Time**: 2 hours

---

#### Task 3.2: Admin Analytics Page
**File**: `/src/routes/dashboard/admin/analytics/+page.server.ts`
**Estimated Time**: 2.5 hours

---

#### Task 3.3: Admin Compliance Page
**File**: `/src/routes/dashboard/admin/compliance/+page.server.ts`
**Estimated Time**: 2 hours

---

#### Task 3.4: Admin Settings Page
**File**: `/src/routes/dashboard/admin/settings/+page.server.ts`
**Estimated Time**: 2 hours

---

#### Task 3.5: Admin Users Page
**File**: `/src/routes/dashboard/admin/users/+page.server.ts`
**Estimated Time**: 2 hours

---

### Management Pages

#### Task 3.6: Management Goals Page
**File**: `/src/routes/dashboard/management/goals/+page.server.ts`
**Estimated Time**: 2 hours

---

#### Task 3.7: Leave Approvals Page
**File**: `/src/routes/dashboard/management/leave-approvals/+page.server.ts`
**Estimated Time**: 2 hours

---

#### Task 3.8: Management Reports Page
**File**: `/src/routes/dashboard/management/reports/+page.server.ts`
**Estimated Time**: 2 hours

---

#### Task 3.9: Management Reviews Page
**File**: `/src/routes/dashboard/management/reviews/+page.server.ts`
**Estimated Time**: 2 hours

---

### Departments & Teams

#### Task 3.10: Departments List
**File**: `/src/routes/dashboard/departments/+page.server.ts`
**Estimated Time**: 1.5 hours

---

#### Task 3.11: Department Detail
**File**: `/src/routes/dashboard/departments/[id]/+page.server.ts`
**Estimated Time**: 2 hours

---

#### Task 3.12: Teams Page
**File**: `/src/routes/dashboard/teams/+page.server.ts`
**Estimated Time**: 1.5 hours

---

## 📋 Phase 4: Components (Week 4)

### Event Components

#### Task 4.1: EventCalendar.svelte
**Estimated Time**: 3 hours
**Complexity**: High (FullCalendar integration)

---

#### Task 4.2: EventDetailsDialog.svelte
**Estimated Time**: 2 hours

---

#### Task 4.3: EventCard.svelte
**Estimated Time**: 1 hour

---

### Task Components

#### Task 4.4: TaskList.svelte
**Estimated Time**: 2 hours

---

#### Task 4.5: TaskCard.svelte
**Estimated Time**: 1.5 hours

---

#### Task 4.6: TaskForm.svelte
**Estimated Time**: 2.5 hours

---

#### Task 4.7: SubtaskProgress.svelte
**Estimated Time**: 2 hours

---

#### Task 4.8: TaskDependencies.svelte
**Estimated Time**: 2 hours

---

#### Task 4.9: TaskHierarchy.svelte
**Estimated Time**: 2 hours

---

### Employee & Org Components

#### Task 4.10: EmployeeList Components
**Estimated Time**: 2 hours

---

#### Task 4.11: Org Chart Components
**Estimated Time**: 4 hours (4 components)

---

### Page-Level Components

#### Task 4.12: Route Components
**Estimated Time**: 8 hours (multiple files)

---

## 📋 Phase 5: Utilities & Cleanup (Week 5)

### Server Utilities

#### Task 5.1: Task Management Utilities
**Files**:
- `task-reminder-scheduler.ts`
- `subtask-progress.ts`
- `resource-validation.ts`
- `organizational-change-handlers.ts`

**Estimated Time**: 6 hours

---

#### Task 5.2: General Utilities
**Files**:
- `audit-logger.ts`
- `permission-refresh.ts`

**Estimated Time**: 3 hours

---

### GraphQL Utilities

#### Task 5.3: Query Optimizer
**File**: `tasks-query-optimizer.ts`
**Estimated Time**: 2 hours

---

#### Task 5.4: Performance Monitor
**File**: `performance-monitor.ts`
**Estimated Time**: 2 hours

---

#### Task 5.5: N+1 Detector
**File**: `n-plus-one-detector.ts`
**Estimated Time**: 2 hours

---

### Cleanup

#### Task 5.6: Remove PostGraphile Files
- Delete `postgraphile-operations.ts`
- Delete `/graphql/graphql/*` duplicates
- Remove unused imports

**Estimated Time**: 2 hours

---

#### Task 5.7: Update Generated Types
- Regenerate GraphQL types
- Update type imports
- Fix type mismatches

**Estimated Time**: 3 hours

---

#### Task 5.8: Final Testing
- Full regression testing
- Performance benchmarks
- User acceptance testing

**Estimated Time**: 8 hours

---

## 📊 Progress Tracking

### Week 1: Foundation
- [ ] Day 1-2: Events & Tasks operations (8hrs)
- [ ] Day 3: Supporting operations (5.5hrs)
- [ ] Day 4: Secondary operations (3.5hrs)
- [ ] Day 5: Final operations & testing (4hrs)

**Total**: 21 hours

### Week 2: High-Traffic Pages
- [ ] Days 1-2: Events pages (10hrs)
- [ ] Days 3-4: Tasks pages (11hrs)
- [ ] Day 5: Reviews pages (6hrs)

**Total**: 27 hours

### Week 3: Admin & Management
- [ ] Days 1-2: Admin pages (10.5hrs)
- [ ] Days 3-4: Management pages (8hrs)
- [ ] Day 5: Departments & Teams (5hrs)

**Total**: 23.5 hours

### Week 4: Components
- [ ] Day 1: Event components (6hrs)
- [ ] Days 2-3: Task components (12hrs)
- [ ] Day 4: Employee/Org components (6hrs)
- [ ] Day 5: Page components (8hrs)

**Total**: 32 hours

### Week 5: Utilities & Cleanup
- [ ] Days 1-2: Server utilities (9hrs)
- [ ] Day 3: GraphQL utilities (6hrs)
- [ ] Day 4: Cleanup (5hrs)
- [ ] Day 5: Final testing (8hrs)

**Total**: 28 hours

---

## 🎯 Success Criteria

### Per Task
- [ ] No PostGraphile patterns remain
- [ ] All tests pass
- [ ] No console errors
- [ ] Data loads correctly
- [ ] Mutations work correctly

### Per Phase
- [ ] All phase tasks completed
- [ ] Integration tests pass
- [ ] No regressions introduced
- [ ] Performance acceptable

### Overall Project
- [ ] Zero PostGraphile dependencies
- [ ] All features working
- [ ] Performance improved or maintained
- [ ] Code quality high
- [ ] Documentation updated

---

## 🚨 Risk Mitigation

### High-Risk Areas
1. **Real-time features** - May need GraphQL subscriptions
2. **Complex filtering** - Backend may need additional query support
3. **Batch operations** - Need bulk mutation support

### Contingency Plans
- Keep PostGraphile running in parallel during migration
- Implement feature flags for gradual rollout
- Have rollback plan for each phase

---

**Last Updated**: October 20, 2025
**Next Update**: After Phase 1 completion
