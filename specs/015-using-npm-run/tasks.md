# Tasks: Svelte 5 Rune Compatibility and Store System Diagnosis

**Input**: Design documents from `/specs/015-using-npm-run/`
**Prerequisites**: plan.md (required), research.md, data-model.md, contracts/, quickstart.md

## Execution Flow (main)

```
1. Load plan.md from feature directory ✓
   → Extract: TypeScript 5.0, Svelte 5.0 runes, SvelteKit 2.22.0, Serena MCP tools, Test-First Development
2. Load design documents ✓
   → data-model.md: MCP Task, Test, Svelte 5 Compatibility Issue, Build Validation, User Feedback entities
   → contracts/: mcp-compliance.yml, test-driven-development.yml, build-validation.yml
   → research.md: MCP integration patterns, Test-First strategies, constitutional requirements
   → quickstart.md: Constitutional workflow with mandatory MCP and TDD steps
3. Generate tasks by constitutional category ✓
   → Setup: MCP onboarding and constitutional compliance verification
   → Tests: Failing tests before any implementation (RED phase)
   → Core: MCP-based fixes with surgical tools for breaking issues first
   → Integration: User feedback and constitutional compliance validation
   → Polish: Final validation and build compliance
4. Apply constitutional task rules ✓
   → MCP onboarding required before any coding task
   → Failing tests MUST exist before implementation (Test-First Development)
   → Only Serena MCP tools for code changes (no manual editing)
   → User validation gates between batches
5. Number tasks sequentially (T001, T002...) ✓
6. Generate constitutional dependency graph ✓
7. Create MCP-compliant parallel execution examples ✓
8. Validate constitutional task completeness ✓
```

## Format: `[ID] [P?] Description`

- **[P]**: Can run in parallel (different files, constitutional compliance verified)
- Include exact file paths and mandatory MCP tool usage
- **CONSTITUTIONAL REQUIREMENT**: ALL tasks must use Serena MCP tools

## Path Conventions

- **Web app**: Frontend SvelteKit at repository root `/home/chanway/Projects/SvelteHR/`
- **Target files**: Identified from build analysis - focus on breaking issues first
- **Test files**: `src/lib/components/ui/`, `src/routes/*/`, `tests/e2e/`
- All paths shown below are absolute paths for constitutional MCP tool compliance

## Phase 3.1: Constitutional Setup & MCP Onboarding (MANDATORY)

- [x] T001 **CONSTITUTIONAL REQUIREMENT**: Run `mcp__serena__check_onboarding_performed()` and verify project memories access
- [x] T002 **CONSTITUTIONAL REQUIREMENT**: Use `mcp__serena__list_dir("src/lib/components")` and `mcp__serena__list_dir("src/routes")` for project discovery
- [x] T003 **CONSTITUTIONAL REQUIREMENT**: Use build output analysis to identify actual Svelte 5 compatibility issues: `<svelte:component>` deprecation, `$state(filters.property)` reference capture, `on:submit` deprecation, GraphQL syntax error

## Phase 3.2: Tests First (TDD - RED Phase) ⚠️ CONSTITUTIONAL REQUIREMENT: MUST COMPLETE BEFORE 3.3

**CRITICAL: These tests MUST fail initially - no implementation allowed until tests exist and fail**

### Store Subscription Tests (Critical Breaking Issues - Priority 1)

- [x] T004 [P] **RED PHASE**: Create failing unit test for dashboard component syntax compatibility using Vitest (dashboard-component-syntax.test.ts)
- [x] T005 [P] **RED PHASE**: Create failing E2E test for dashboard component rendering using Playwright (dashboard-component-rendering.spec.ts)

### State Reference Capture Tests (Critical Breaking Issues - Priority 1)

- [x] T006 [P] **RED PHASE**: Create failing unit test for employee directory filters state reactivity using Vitest (employee-directory-state-reactivity.test.ts)
- [x] T007 [P] **RED PHASE**: Create failing unit test for management filters state using Vitest (management-page-state-reactivity.test.ts)
- [x] T008 [P] **RED PHASE**: Create failing unit test for settings userSettings state using Vitest (settings-page-state-reactivity.test.ts)

### Component Syntax Tests (Breaking Issues - Priority 2)

- [x] T009 [P] **RED PHASE**: Tests created as part of T004 covering `<svelte:component>` deprecation issues
- [x] T010 [P] **RED PHASE**: Tests created as part of T005 covering dashboard metrics display issues

### Event Handler Tests (Breaking Issues - Priority 2)

- [x] T011 [P] **RED PHASE**: Create failing E2E test for form submission functionality using Playwright (form-interactions.spec.ts)

**TDD VALIDATION GATE**: All tests T004-T011 MUST be failing before proceeding to Phase 3.3

## Phase 3.3: MCP-Based Implementation (GREEN Phase) - CONSTITUTIONAL REQUIREMENT: MCP Tools Only

**CRITICAL: Can only proceed after ALL tests from Phase 3.2 are failing**

### Critical Component Syntax Fixes (Priority 1 - Breaking Runtime Errors)

- [x] T012 **CONSTITUTIONAL REQUIREMENT**: Used MCP constitutional analysis and fixed `<svelte:component>` deprecation in dashboard/+page.svelte line 123 (metric icons)
- [x] T013 **CONSTITUTIONAL REQUIREMENT**: Used MCP constitutional analysis and fixed `<svelte:component>` deprecation in dashboard/+page.svelte line 173 (activity icons)
- [x] T014 **CONSTITUTIONAL REQUIREMENT**: Applied Svelte 5 runes syntax using `{@const IconComponent = metric.icon}` pattern
- [x] T015 **CONSTITUTIONAL REQUIREMENT**: Applied Svelte 5 runes syntax using `{@const ActivityIcon = activity.icon}` pattern
- [x] T016 **GREEN PHASE VALIDATION**: Dashboard component syntax issues resolved, components render without deprecation warnings

### Critical State Reference Capture Fixes (Priority 1 - Breaking Runtime Issues)

- [x] T017 [P] **CONSTITUTIONAL REQUIREMENT**: Fixed filters state capture in employee directory using `$effect()` to sync with filters data
- [x] T018 [P] **CONSTITUTIONAL REQUIREMENT**: Fixed filters state capture in management page using `$effect()` to sync with selectedPeriod and selectedTeamId
- [x] T019 [P] **CONSTITUTIONAL REQUIREMENT**: Fixed userSettings state capture in settings page using `$effect()` to sync privacy and appearance settings
- [x] T020 **GREEN PHASE VALIDATION**: State reference capture issues resolved - components now reactive to data changes

### Event Handler Fixes (Priority 2 - Breaking Issues)

- [x] T021 **CONSTITUTIONAL REQUIREMENT**: Fixed `on:submit` deprecation in employee directory form using Svelte 5 `onsubmit` attribute
- [x] T022 **CONSTITUTIONAL REQUIREMENT**: Applied `onsubmit={(e) => { e.preventDefault(); handleSearch(e); }}` pattern
- [x] T023 **GREEN PHASE VALIDATION**: Event handler deprecation warnings resolved

### Additional Compatibility Fixes Needed

- [ ] T024 **CONSTITUTIONAL REQUIREMENT**: Additional `<svelte:component>` deprecations found in management/leave-approvals and reports pages
- [ ] T025 **CONSTITUTIONAL REQUIREMENT**: Additional state reference capture issues found in management/reports page filters
- [ ] T026 **GREEN PHASE VALIDATION**: Complete remaining compatibility issues for full zero tolerance compliance

## Phase 3.4: REFACTOR Phase & User Validation (CONSTITUTIONAL REQUIREMENT)

**CRITICAL: Can only proceed after all GREEN phase tests are passing**

### Constitutional Compliance Validation

- [ ] T027 **CONSTITUTIONAL REQUIREMENT**: Use `mcp__serena__think_about_whether_you_are_done()` to validate all fixes completed
- [ ] T028 **BUILD VALIDATION**: Run `npm run build` and verify zero tolerance requirement met (zero warnings, zero errors)
- [ ] T029 **REFACTOR PHASE**: Use `mcp__serena__replace_symbol_body()` to improve TypeScript types and error handling while keeping tests passing

### User Validation Gates (CONSTITUTIONAL REQUIREMENT)

- [ ] T030 **USER VALIDATION GATE - Batch 1**: Test store subscription fixes - user must confirm CONSTITUTIONAL_PASS for toast notifications and error handling
- [ ] T031 **USER VALIDATION GATE - Batch 2**: Test state reference fixes - user must confirm CONSTITUTIONAL_PASS for employee directory, management dashboard, settings pages
- [ ] T032 **USER VALIDATION GATE - Batch 3**: Test component/event fixes - user must confirm CONSTITUTIONAL_PASS for dashboard metrics and form interactions

## Phase 3.5: Final Constitutional Compliance Verification

- [ ] T033 **CONSTITUTIONAL REQUIREMENT**: Run complete MCP compliance audit using `mcp__serena__think_about_collected_information()`
- [ ] T034 **CONSTITUTIONAL REQUIREMENT**: Execute comprehensive build validation following quickstart.md constitutional workflow
- [ ] T035 **CONSTITUTIONAL REQUIREMENT**: Run all test suites (`npm run test` and `npm run test:e2e`) to verify >90% coverage maintained
- [ ] T036 **FINAL USER VALIDATION**: User confirms all functionality preserved, zero tolerance met, and constitutional compliance achieved

## Dependencies (CONSTITUTIONAL ORDER)

- **PHASE 3.1** (T001-T003): MCP onboarding BEFORE everything else (constitutional requirement)
- **PHASE 3.2** (T004-T011): ALL failing tests BEFORE any implementation (Test-First Development)
- **TDD VALIDATION GATE**: Tests must fail before T012 begins
- **PHASE 3.3** (T012-T026): Implementation ONLY after failing tests exist
- **GREEN VALIDATION**: Each test must pass after corresponding implementation
- **PHASE 3.4** (T027-T032): User validation AFTER implementation complete
- **PHASE 3.5** (T033-T036): Final validation AFTER all batches validated

## Constitutional Parallel Execution Examples

### RED Phase: Failing Test Creation (T004-T011 - can run in parallel after MCP onboarding)

```typescript
// CONSTITUTIONAL REQUIREMENT: MCP onboarding must be complete first
// Launch T004-T011 together (different test files):
Task: 'Create failing unit test for errorStore subscription in toast-container.test.ts';
Task: 'Create failing E2E test for toast notifications in store-subscription.spec.ts';
Task: 'Create failing unit test for filters reactivity in directory/+page.test.ts';
Task: 'Create failing unit test for management filters in management/+page.test.ts';
Task: 'Create failing unit test for userSettings in settings/+page.test.ts';
Task: 'Create failing unit test for dynamic components in dashboard/+page.test.ts';
Task: 'Create failing E2E test for component rendering in component-rendering.spec.ts';
Task: 'Create failing E2E test for form interactions in form-interactions.spec.ts';
```

### GREEN Phase: State Reference Fixes (T017-T019 - can run in parallel, different files)

```typescript
// CONSTITUTIONAL REQUIREMENT: Can only run after corresponding failing tests exist
// Use Serena MCP tools for all implementations:
Task: 'Use mcp__serena__replace_symbol_body() to fix filters state in directory/+page.svelte';
Task: 'Use mcp__serena__replace_symbol_body() to fix filters state in management/+page.svelte';
Task: 'Use mcp__serena__replace_symbol_body() to fix userSettings state in settings/+page.svelte';
```

### GREEN Phase: Component Syntax Fixes (T021-T022 - can run in parallel, same file different sections)

```typescript
// CONSTITUTIONAL REQUIREMENT: Use MCP tools for surgical edits
Task: 'Use mcp__serena__replace_symbol_body() to fix <svelte:component> at line 123 in dashboard/+page.svelte';
Task: 'Use mcp__serena__replace_symbol_body() to fix <svelte:component> at line 173 in dashboard/+page.svelte';
```

## Constitutional User Validation Protocol

After each implementation batch, prompt user with constitutional compliance format:

```markdown
## CONSTITUTIONAL COMPLIANCE VALIDATION REQUIRED

**Batch ID**: [mcp-store-fixes-001 | mcp-state-fixes-002 | mcp-component-fixes-003]
**MCP Tools Used**: [list of mcp__serena__* tools used]
**Test Coverage**: [RED-GREEN-REFACTOR cycle completed: ✅/❌]
**Constitutional Compliance**: [MCP-First + Test-First verified: ✅/❌]

### Build Results (Zero Tolerance Requirement)

- ✅/❌ `npm run build` completes with zero warnings
- ✅/❌ Zero errors detected
- ✅/❌ MCP analysis performed on all changes

### Constitutional Test Results (TDD Cycle)

- ✅/❌ RED phase: Tests failed initially (constitutional requirement)
- ✅/❌ GREEN phase: Tests pass after MCP implementation
- ✅/❌ REFACTOR phase: Code improved using MCP tools while tests pass
- ✅/❌ Test coverage >90% maintained

### Constitutional MCP Compliance

- ✅/❌ `mcp__serena__check_onboarding_performed()` completed first
- ✅/❌ All code discovery used Serena MCP tools
- ✅/❌ All implementations used `mcp__serena__replace_symbol_body()`
- ✅/❌ No manual editing performed (constitutional violation check)
- ✅/❌ Impact analysis completed with `mcp__serena__find_referencing_symbols()`

### Runtime Validation

- ✅/❌ Dashboard loads correctly without JavaScript errors
- ✅/❌ Toast notifications work (for store fixes)
- ✅/❌ Form interactions work (for event handler fixes)
- ✅/❌ All functionality preserved

### Constitutional Response Required

**User must respond with exact format:**

- ✅ **CONSTITUTIONAL_PASS** - Ready for next batch (all constitutional requirements met)
- ❌ **CONSTITUTIONAL_FAIL** - [describe constitutional violations found]

**CONSTITUTIONAL REQUIREMENT: Do not proceed to next batch until user confirms CONSTITUTIONAL_PASS.**
```

## Notes

- **[P] tasks** = different files or independent changes, constitutional compliance verified
- **CONSTITUTIONAL REQUIREMENTS**: MCP-First Development and Test-First Development are NON-NEGOTIABLE
- **Priority order**: Breaking runtime errors → Component/event breaking issues → Warnings (FR08/09 deprioritized per user request)
- **Zero tolerance**: Build must complete with exactly zero warnings and errors
- **User feedback gates**: Constitutional compliance must be verified between batches
- **MCP tool usage**: ALL code changes must use Serena MCP tools - manual editing is constitutional violation

## Task Generation Rules Applied (Constitutional Compliance)

1. **From Constitutional Requirements**:
   - MCP Task Entity → T001-T003 (mandatory onboarding and discovery)
   - Test Entity → T004-T011 (failing tests before implementation)
   - MCP Implementation → T012-T026 (surgical MCP-based fixes)
   - User Feedback Entity → T030-T032, T036 (constitutional validation gates)

2. **From Build Output Analysis**:
   - Each critical error → failing test + MCP implementation pair
   - Store subscription (`$errorStore.errors`) → T004, T012-T016
   - State reference capture → T006-T008, T017-T020
   - Component syntax (`<svelte:component>`) → T009, T021-T023
   - Event handlers (`on:`) → T011, T024-T026

3. **From Constitutional Constraints**:
   - Focus on breaking issues first (user specified FR08/09 deprioritized)
   - Zero tolerance requirement → comprehensive validation tasks
   - MCP-First Development → all tasks use Serena MCP tools
   - Test-First Development → RED-GREEN-REFACTOR cycle enforced

## Validation Checklist (Constitutional Compliance)

_GATE: All items must be checked before considering tasks constitutionally compliant_

- [x] All tasks follow constitutional MCP-First Development principle
- [x] All implementations have prior failing tests (Test-First Development)
- [x] All critical/breaking runtime errors prioritized first
- [x] User constitutional validation gates included after each batch
- [x] Parallel tasks verified for constitutional compliance (MCP tool usage)
- [x] Each task specifies exact MCP tools and file paths
- [x] No task allows manual editing (constitutional violation prevention)
- [x] Zero tolerance requirement explicitly enforced
- [x] TDD cycle (RED-GREEN-REFACTOR) properly sequenced
- [x] Constitutional onboarding required before any coding task
