# Parallel Hexagonal Module Migrations - Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development with wave-based coordination to implement parallel migrations.

**Goal:** Migrate 3-4 modules simultaneously to hexagonal architecture using coordinated parallel agents, reducing total migration time from ~13 weeks to ~5 weeks while avoiding merge conflicts.

**Architecture:** Wave-based parallel execution with conflict zone coordination. Each wave migrates 3 modules simultaneously with non-overlapping domain spaces. Shared file updates (ServiceContainer, MEMORY.md) are queued and applied serially at wave completion. Each module agent works independently until integration phase.

**Tech Stack:** SvelteKit 2.43+, Svelte 5, TypeScript 5, Vitest 3.2, Hexagonal Architecture (Ports & Adapters), Git worktrees for isolation

---

## Conflict Analysis

### Shared Files (Conflict Zones)

1. **`src/lib/server/services.ts`** - ServiceContainer integration
2. **`src/lib/services/index.ts`** - Factory re-exports (if exists)
3. **MEMORY.md** - Module completion tracking
4. **`docs/architecture/`** - Migration reports (unique filenames, no conflict)

### Isolated Files (No Conflict)

- `src/domain/{ModuleName}/` - Each module has unique directory
- `src/services/{ModuleName}Service.ts` - Unique per module
- `src/adapters/graphql/GraphQL{ModuleName}Adapter.ts` - Unique per module
- `src/lib/services/{moduleName}ServiceFactory.ts` - Unique per module
- Module-specific test files

### Conflict Resolution Strategy

1. **Domain/Service/Adapter**: Fully parallel (no conflicts)
2. **ServiceContainer**: Serial integration at wave end (coordinator merges)
3. **MEMORY.md**: Batch update at wave end (coordinator merges)
4. **Git**: Separate branches per module, merge to integration branch after wave

---

## Wave Assignment (3 Waves × 3-4 Modules Each)

### Wave 1: Foundational Modules (High Priority)

**Parallel Agents (3):**

1. **Attendance Module** (5 days, Time domain)
   - Agent: attendance-migrator
   - Domain: Clock in/out, schedules, shifts

2. **Compensation Module** (5 days, HR domain)
   - Agent: compensation-migrator
   - Domain: Salaries, bonuses, raises

3. **Documents Module** (4 days, Document domain)
   - Agent: documents-migrator
   - Domain: File management, templates

**Rationale:** Different domain spaces (Time, HR, Documents), no shared business logic

### Wave 2: Secondary Modules (Medium Priority)

**Parallel Agents (3):**

1. **Time Off Balance Module** (4 days, Time domain)
   - Agent: time-off-balance-migrator
   - Domain: PTO accrual, balances

2. **Benefits Module** (5 days, HR domain)
   - Agent: benefits-migrator
   - Domain: Health insurance, 401k

3. **Announcements Module** (3 days, Social domain)
   - Agent: announcements-migrator
   - Domain: Company-wide broadcasts

**Rationale:** Builds on Wave 1, different domains, no overlapping concerns

### Wave 3: Remaining Modules (Lower Priority)

**Parallel Agents (4):**

1. **Time Sheets Module** (5 days, Time domain)
   - Agent: timesheets-migrator
   - Domain: Hours tracking, approvals

2. **Onboarding Module** (5 days, HR domain)
   - Agent: onboarding-migrator
   - Domain: New hire workflows

3. **Surveys Module** (4 days, Social domain)
   - Agent: surveys-migrator
   - Domain: Employee feedback

4. **Polls Module** (3 days, Social domain)
   - Agent: polls-migrator
   - Domain: Quick voting

**Rationale:** Final modules, can run 4 in parallel safely

---

## Task 1: Wave 1 Setup - Branch Creation

**Goal:** Create isolated branches for each Wave 1 module to enable parallel work

**Files:**

- No file changes, git operations only

**Step 1: Create integration branch**

```bash
git checkout feat/seaorm-migration-optimization
git checkout -b feat/wave1-hexagonal-migrations
git push -u origin feat/wave1-hexagonal-migrations
```

Expected: New integration branch created

**Step 2: Create module branches**

```bash
# Branch 1: Attendance
git checkout -b feat/attendance-hexagonal-migration feat/wave1-hexagonal-migrations

# Branch 2: Compensation
git checkout feat/wave1-hexagonal-migrations
git checkout -b feat/compensation-hexagonal-migration

# Branch 3: Documents
git checkout feat/wave1-hexagonal-migrations
git checkout -b feat/documents-hexagonal-migration
```

Expected: 3 module branches created from integration branch

**Step 3: Verify branch structure**

```bash
git branch | grep -E "(wave1|attendance|compensation|documents)"
```

Expected: See all 4 branches listed

**Step 4: Document branch strategy**

Create `docs/plans/wave1-branch-strategy.md`:

```markdown
# Wave 1 Branch Strategy

**Integration Branch:** `feat/wave1-hexagonal-migrations`
**Module Branches:**

- `feat/attendance-hexagonal-migration` (Agent: attendance-migrator)
- `feat/compensation-hexagonal-migration` (Agent: compensation-migrator)
- `feat/documents-hexagonal-migration` (Agent: documents-migrator)

**Merge Order:**

1. All agents complete domain/service/adapter work independently
2. Agents signal completion (all tests passing)
3. Coordinator merges modules to integration branch sequentially
4. Coordinator resolves ServiceContainer conflicts
5. Coordinator updates MEMORY.md with all 3 completions
6. Integration branch merged to main feature branch

**Conflict Resolution:**

- Domain/Service/Adapter: No conflicts (separate directories)
- ServiceContainer: Coordinator manually merges in sequence
- MEMORY.md: Coordinator combines updates from all modules
```

**Step 5: Commit branch strategy**

```bash
git checkout feat/wave1-hexagonal-migrations
git add docs/plans/wave1-branch-strategy.md
git commit -m "docs: add Wave 1 parallel migration branch strategy"
git push origin feat/wave1-hexagonal-migrations
```

Expected: Branch strategy documented and pushed

---

## Task 2: Attendance Module - Parallel Agent Assignment

**Goal:** Dispatch parallel agent to migrate Attendance module on dedicated branch

**Pre-requisites:**

- Branch `feat/attendance-hexagonal-migration` exists
- Agent has access to reference implementations (Employee, Events, Notifications)

**Module Specifications:**

**Attendance Module (5 days, ~180 tests target):**

**Domain Layer (7 value objects + 1 entity):**

- `ClockInTime` - Timestamp validation
- `ClockOutTime` - Timestamp validation, must be after ClockInTime
- `ShiftType` - Enum (morning, afternoon, night, split)
- `AttendanceStatus` - Enum (present, absent, late, half_day, on_leave)
- `LateReason` - Optional text with max 500 chars
- `WorkHours` - Calculated duration with validation
- `OvertimeHours` - Hours beyond standard shift
- `AttendanceRecord` entity - Aggregate root

**Service Layer:**

- `AttendanceService` - CRUD + clock in/out logic + overtime calculation
- `AttendanceRepository` port - 12 methods

**Adapter Layer:**

- `GraphQLAttendanceAdapter` - Implements repository port

**Integration:**

- `attendanceServiceFactory` - DI with 2 variants
- ServiceContainer integration (queued for coordinator)

**Step 1: Dispatch attendance-migrator agent**

Use Task tool with `subagent_type: coder` and `team_name: wave1-migration`:

```typescript
// Agent prompt:
**Task: Migrate Attendance Module to Hexagonal Architecture**

**Branch:** `feat/attendance-hexagonal-migration`

**Reference Implementations:**
- Employee Module: `src/domain/Employee/`
- Events Module: `src/domain/Event/`
- Notifications Module: `src/domain/Notification/`

**Specifications:** [Full specs from above]

**Requirements:**
1. Follow TDD (tests first, verify fail, implement, verify pass)
2. Use Result<T, E> pattern throughout
3. Private constructor + static create() for value objects
4. Immutable entities (methods return new instances)
5. Commit after each component (value object, entity, service, adapter)
6. Target: 180+ tests, 90/100 architecture score
7. **DO NOT update ServiceContainer** - leave note for coordinator
8. **DO NOT update MEMORY.md** - leave note for coordinator

**Deliverables:**
- All domain/service/adapter/factory code committed to branch
- Migration completion report in `docs/architecture/attendance-module-hexagonal-migration-completion.md`
- Signal completion with test count and architecture score
```

Expected: Agent dispatched, working independently on attendance branch

**Step 2: Monitor agent progress**

Agent will commit incrementally:

- Value object commits (7)
- Entity commit (1)
- Repository port commit (1)
- Service commit (1)
- Adapter commit (1)
- Factory commit (1)
- Report commit (1)
  Total: ~13 commits

**Step 3: Agent completion signal**

Agent reports:

```
Attendance Module Complete:
- Tests: 182/182 passing
- Architecture Score: 90/100
- Branch: feat/attendance-hexagonal-migration (13 commits)
- ServiceContainer update needed: YES (queued)
- MEMORY.md update needed: YES (queued)
```

---

## Task 3: Compensation Module - Parallel Agent Assignment

**Goal:** Dispatch parallel agent to migrate Compensation module simultaneously with Attendance

**Module Specifications:**

**Compensation Module (5 days, ~180 tests target):**

**Domain Layer (8 value objects + 1 entity):**

- `Salary` - Amount with currency validation
- `SalaryGrade` - Enum (entry, mid, senior, lead, principal)
- `PayFrequency` - Enum (weekly, biweekly, monthly, annually)
- `BonusAmount` - Optional amount with validation
- `BonusType` - Enum (performance, retention, signing, referral)
- `RaisePercentage` - Percentage (0-100) with validation
- `EffectiveDate` - Future date validation
- `SalaryHistory` - Collection of historical changes
- `CompensationPackage` entity - Aggregate root

**Service Layer:**

- `CompensationService` - CRUD + salary adjustment + bonus calculation
- `CompensationRepository` port - 14 methods

**Adapter Layer:**

- `GraphQLCompensationAdapter` - Implements repository port

**Integration:**

- `compensationServiceFactory` - DI with 2 variants
- ServiceContainer integration (queued)

**Step 1: Dispatch compensation-migrator agent**

Same pattern as Task 2, different module specs

**Step 2: Monitor progress**

Expected: ~14 commits on `feat/compensation-hexagonal-migration`

**Step 3: Agent completion signal**

Expected:

```
Compensation Module Complete:
- Tests: 185/185 passing
- Architecture Score: 90/100
- Branch: feat/compensation-hexagonal-migration (14 commits)
- ServiceContainer update queued
- MEMORY.md update queued
```

---

## Task 4: Documents Module - Parallel Agent Assignment

**Goal:** Dispatch third parallel agent for Documents module

**Module Specifications:**

**Documents Module (4 days, ~150 tests target):**

**Domain Layer (6 value objects + 1 entity):**

- `DocumentTitle` - Max 200 chars
- `DocumentType` - Enum (policy, handbook, form, template, contract)
- `FileSize` - Size with max limit (50MB)
- `MimeType` - Valid MIME type validation
- `UploadedBy` - User ID reference
- `DocumentStatus` - Enum (draft, published, archived, deleted)
- `Document` entity - Aggregate root

**Service Layer:**

- `DocumentService` - CRUD + upload/download + version tracking
- `DocumentRepository` port - 11 methods

**Adapter Layer:**

- `GraphQLDocumentAdapter` - Implements repository port

**Integration:**

- `documentServiceFactory` - DI with 2 variants
- ServiceContainer integration (queued)

**Step 1: Dispatch documents-migrator agent**

Same pattern, Documents specs

**Step 2: Monitor progress**

Expected: ~12 commits on `feat/documents-hexagonal-migration`

**Step 3: Agent completion signal**

Expected:

```
Documents Module Complete:
- Tests: 155/155 passing
- Architecture Score: 90/100
- Branch: feat/documents-hexagonal-migration (12 commits)
- ServiceContainer update queued
- MEMORY.md update queued
```

---

## Task 5: Wave 1 Coordination - Parallel Monitoring

**Goal:** Monitor all 3 parallel agents and coordinate completion

**Monitoring Dashboard:**

```markdown
## Wave 1 Progress

**Attendance Module:**

- Status: In Progress (Day 3/5)
- Commits: 8/13
- Current: AttendanceService implementation
- Tests: 120/182 passing

**Compensation Module:**

- Status: In Progress (Day 3/5)
- Commits: 9/14
- Current: CompensationService tests
- Tests: 135/185 passing

**Documents Module:**

- Status: In Progress (Day 2/4)
- Commits: 7/12
- Current: Document entity
- Tests: 85/155 passing
```

**Step 1: Check all agents daily**

```bash
# Check Attendance progress
git log feat/attendance-hexagonal-migration --oneline | wc -l

# Check Compensation progress
git log feat/compensation-hexagonal-migration --oneline | wc -l

# Check Documents progress
git log feat/documents-hexagonal-migration --oneline | wc -l
```

**Step 2: Verify no blocking issues**

Each agent should signal if blocked:

- Type errors
- Missing dependencies
- Test failures
- Architectural questions

**Step 3: All agents complete signal**

When all 3 agents signal completion:

```
✅ Attendance: Complete (182 tests, 90/100)
✅ Compensation: Complete (185 tests, 90/100)
✅ Documents: Complete (155 tests, 90/100)

Total: 522 tests, 3 modules ready for integration
```

---

## Task 6: Wave 1 Integration - ServiceContainer Merge

**Goal:** Coordinator merges all ServiceContainer updates sequentially to avoid conflicts

**Files:**

- Modify: `src/lib/server/services.ts` (3 updates)

**Step 1: Checkout integration branch**

```bash
git checkout feat/wave1-hexagonal-migrations
git pull origin feat/wave1-hexagonal-migrations
```

**Step 2: Merge Attendance first**

```bash
git merge feat/attendance-hexagonal-migration --no-ff -m "feat: integrate Attendance module (182 tests)"
```

Expected: Domain/service/adapter files merge cleanly
Conflict: `src/lib/server/services.ts` (manual resolution needed)

**Step 3: Resolve ServiceContainer conflict (Attendance)**

Read `feat/attendance-hexagonal-migration` version of ServiceContainer, extract:

- Import statement for `createAttendanceService`
- Import statement for `AttendanceService` type
- Private field `_attendanceService`
- Public getter `attendanceService`
- Convenience function `createAttendanceService()`

Manually add to integration branch ServiceContainer in correct locations.

**Step 4: Test Attendance integration**

```bash
npm run test:unit src/lib/services/attendanceServiceFactory.test.ts
npm run check
```

Expected: All tests passing, no type errors

**Step 5: Commit Attendance integration**

```bash
git add src/lib/server/services.ts
git commit -m "feat: integrate AttendanceService into ServiceContainer"
```

**Step 6: Merge Compensation second**

```bash
git merge feat/compensation-hexagonal-migration --no-ff -m "feat: integrate Compensation module (185 tests)"
```

Resolve ServiceContainer conflict same way.

**Step 7: Merge Documents third**

```bash
git merge feat/documents-hexagonal-migration --no-ff -m "feat: integrate Documents module (155 tests)"
```

Resolve ServiceContainer conflict same way.

**Step 8: Verify all integrations**

```bash
npm run test
npm run check
```

Expected: All 522+ tests passing, no type errors

---

## Task 7: Wave 1 Completion - MEMORY.md Update

**Goal:** Coordinator updates MEMORY.md with all 3 completed modules

**Files:**

- Modify: `.claude/projects/-home-chanway-Documents-SvelteHR/memory/MEMORY.md`

**Step 1: Read completion reports**

```bash
cat docs/architecture/attendance-module-hexagonal-migration-completion.md
cat docs/architecture/compensation-module-hexagonal-migration-completion.md
cat docs/architecture/documents-module-hexagonal-migration-completion.md
```

**Step 2: Update MEMORY.md Hexagonal Architecture Status**

```markdown
**Completed Modules (13/23):**

- Employee (95/100) - Gold standard, 156 tests
- Department (95/100) - 184 tests
- Leave Request - Complete
- Auth/JWT (90/100) - Migrated 2026-02-11, 87 tests
- Tasks (90/100) - Complete
- RBAC (90/100) - Complete
- Performance Reviews (90/100) - Complete
- Goals (90/100) - Complete
- Events (90/100) - 226 tests
- Notifications (90/100) - Migrated 2026-02-13, 233 tests
- **Attendance (90/100) - Migrated 2026-02-13, 182 tests** ✨ Wave 1
- **Compensation (90/100) - Migrated 2026-02-13, 185 tests** ✨ Wave 1
- **Documents (90/100) - Migrated 2026-02-13, 155 tests** ✨ Wave 1

**Remaining:** 10 modules, ~8-10 person-weeks total (with Wave 2 & 3 in parallel)
```

**Step 3: Add Wave 1 Summary Section**

```markdown
## Wave 1 Parallel Hexagonal Migration (Completed 2026-02-13)

**Duration:** 5 days (parallel execution) vs 14 days (sequential)
**Efficiency Gain:** 64% time reduction

**Modules Migrated:**

1. Attendance (182 tests, 90/100)
2. Compensation (185 tests, 90/100)
3. Documents (155 tests, 90/100)

**Total:** 522 tests, 3 modules, 39 commits

**Key Success Factors:**

- Wave-based branch strategy prevented conflicts
- Domain isolation enabled true parallelism
- Coordinator-managed ServiceContainer integration avoided merge chaos
- Batch MEMORY.md update at wave end
```

**Step 4: Update Architecture Reports list**

```markdown
- `attendance-module-hexagonal-migration-completion.md` - 90/100, 182 tests
- `compensation-module-hexagonal-migration-completion.md` - 90/100, 185 tests
- `documents-module-hexagonal-migration-completion.md` - 90/100, 155 tests
```

**Step 5: Commit MEMORY.md update**

```bash
git add .claude/projects/-home-chanway-Documents-SvelteHR/memory/MEMORY.md
git commit -m "docs(memory): add Wave 1 completion (Attendance, Compensation, Documents - 522 tests)"
```

---

## Task 8: Wave 1 Finalization - Push and PR

**Goal:** Push integrated Wave 1 work and create PR for review

**Step 1: Push integration branch**

```bash
git push origin feat/wave1-hexagonal-migrations
```

Expected: All Wave 1 work pushed (3 modules + integrations)

**Step 2: Create PR (optional)**

If doing PR-based workflow:

```bash
gh pr create \
  --base feat/seaorm-migration-optimization \
  --head feat/wave1-hexagonal-migrations \
  --title "feat: Wave 1 Hexagonal Migrations (Attendance, Compensation, Documents)" \
  --body "$(cat <<'EOF'
## Summary
Parallel hexagonal migration of 3 modules using wave-based coordination:
- ✅ Attendance Module (182 tests, 90/100)
- ✅ Compensation Module (185 tests, 90/100)
- ✅ Documents Module (155 tests, 90/100)

## Metrics
- **Total Tests:** 522 (100% passing)
- **Architecture Score:** 90/100 (all modules)
- **Duration:** 5 days parallel vs 14 days sequential (64% faster)
- **Commits:** 39 (13 + 14 + 12)

## Architecture
- Hexagonal architecture (ports & adapters)
- Result<T, E> pattern throughout
- Comprehensive TDD coverage
- Zero `any` types

## Test Plan
- [x] All unit tests passing (522/522)
- [x] TypeScript compilation clean
- [x] ServiceContainer integration verified
- [x] Migration reports completed

## Next Steps
- Wave 2: Time Off Balance, Benefits, Announcements (3 modules)
- Wave 3: Time Sheets, Onboarding, Surveys, Polls (4 modules)
EOF
)"
```

**Step 3: Or merge directly**

```bash
git checkout feat/seaorm-migration-optimization
git merge feat/wave1-hexagonal-migrations --no-ff -m "feat: Wave 1 parallel migrations (Attendance, Compensation, Documents - 522 tests)"
git push origin feat/seaorm-migration-optimization
```

---

## Task 9: Wave 2 Setup (Optional - if continuing)

**Goal:** Set up Wave 2 parallel migrations

**Modules:**

1. Time Off Balance (4 days, ~150 tests)
2. Benefits (5 days, ~180 tests)
3. Announcements (3 days, ~120 tests)

**Same process as Wave 1:**

1. Create `feat/wave2-hexagonal-migrations` integration branch
2. Create 3 module branches
3. Dispatch 3 parallel agents
4. Monitor progress
5. Coordinator integrates sequentially
6. Update MEMORY.md
7. Push/PR

**Estimated completion:** 5 days (parallel)

---

## Task 10: Wave 3 Setup (Optional - if continuing)

**Goal:** Set up Wave 3 parallel migrations (final wave)

**Modules:**

1. Time Sheets (5 days, ~180 tests)
2. Onboarding (5 days, ~180 tests)
3. Surveys (4 days, ~150 tests)
4. Polls (3 days, ~120 tests)

**Can run 4 in parallel** (different domains, no conflicts)

**Estimated completion:** 5 days (parallel)

---

## Summary Timeline

**Sequential Migration (Old Approach):**

- 13 remaining modules × ~4.5 days average = **~58 days (~12 weeks)**

**Parallel Migration (New Approach):**

- Wave 1: 5 days (3 modules)
- Wave 2: 5 days (3 modules)
- Wave 3: 5 days (4 modules)
- Remaining 3 modules: 5 days (parallel)
- **Total: ~20 days (~4 weeks)**

**Time Savings: 70%** 🚀

---

## Conflict Avoidance Checklist

**Per-Module (No Conflicts):**

- ✅ Domain layer (`src/domain/{ModuleName}/`)
- ✅ Service layer (`src/services/{ModuleName}Service.ts`)
- ✅ Adapter layer (`src/adapters/graphql/`)
- ✅ Factory (`src/lib/services/{moduleName}ServiceFactory.ts`)
- ✅ Tests (module-specific test files)
- ✅ Reports (`docs/architecture/{module}-completion.md`)

**Shared Files (Coordinator Manages):**

- ⚠️ ServiceContainer (`src/lib/server/services.ts`) - Sequential merge
- ⚠️ MEMORY.md - Batch update at wave end
- ⚠️ Git branch strategy - Integration branch merges

**Agent Instructions:**

- ✅ DO commit domain/service/adapter/factory code
- ✅ DO write migration completion report
- ✅ DO signal completion with metrics
- ❌ DO NOT update ServiceContainer (leave note for coordinator)
- ❌ DO NOT update MEMORY.md (leave note for coordinator)
- ❌ DO NOT merge to main branch (coordinator handles)

---

## Execution

Plan saved to `docs/plans/2026-02-13-parallel-hexagonal-migrations.md`.

**Execution approach:**

**Wave 1 (Immediate)** - Dispatch 3 parallel coder agents:

1. Attendance module agent
2. Compensation module agent
3. Documents module agent

**Coordinator (You):**

- Monitor all 3 agents
- Integrate ServiceContainer sequentially when complete
- Update MEMORY.md with all 3 completions
- Push integrated work

**Expected Wave 1 completion:** 5 days (vs 14 days sequential) = **64% faster**

Ready to start Wave 1?
