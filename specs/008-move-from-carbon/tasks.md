# Tasks: Migration from Carbon Design to shadcn-svelte UI System

**Input**: Design documents from `/specs/008-move-from-carbon/`
**Prerequisites**: plan.md, research.md, data-model.md, contracts/, quickstart.md
**Context**: Building out the full site in spec with our PostGraphile API

## Format: `[ID] [P?] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **Project Type**: Web application - SvelteKit frontend with PostgreSQL backend
- **Base Path**: `/src/` for all frontend code

## Phase 3.1: Setup & Dependencies

- [ ] T001 Initialize shadcn-svelte in project with `pnpm dlx shadcn-svelte@latest init`
- [ ] T002 [P] Install core shadcn-svelte components: sidebar, button, card, data-table, input, label, form, select, checkbox
- [ ] T003 [P] Install Lucide Svelte icons for consistent iconography
- [ ] T004 Configure TailwindCSS with shadcn CSS variables theming in `tailwind.config.js`
- [ ] T005 [P] Update `src/app.css` to include shadcn base styles and CSS variables
- [ ] T006 [P] Configure TypeScript types for shadcn components in `src/lib/types/ui.ts`

## Phase 3.2: Layout Component Tests (TDD) ⚠️ MUST COMPLETE BEFORE 3.3

**CRITICAL: These tests MUST be written and MUST FAIL before ANY implementation**

- [ ] T007 [P] Layout component contract test in `tests/components/layout/ShadcnLayout.test.ts`
- [ ] T008 [P] Sidebar component contract test in `tests/components/layout/Sidebar.test.ts`
- [ ] T009 [P] Header component contract test in `tests/components/layout/Header.test.ts`
- [ ] T010 [P] Navigation state management test in `tests/components/layout/NavigationState.test.ts`
- [ ] T011 [P] Theme switching functionality test in `tests/components/layout/ThemeState.test.ts`

## Phase 3.3: Data Component Tests (TDD) ⚠️ MUST COMPLETE BEFORE 3.4

- [ ] T012 [P] Data table component contract test in `tests/components/data/DataTable.test.ts`
- [ ] T013 [P] Card component contract test in `tests/components/data/Card.test.ts`
- [ ] T014 [P] Metric card component test in `tests/components/data/MetricCard.test.ts`
- [ ] T015 [P] Progress component test in `tests/components/data/Progress.test.ts`
- [ ] T016 [P] List component contract test in `tests/components/data/List.test.ts`

## Phase 3.4: Layout Components Implementation (ONLY after tests are failing)

- [ ] T017 [P] Create base layout structure in `src/lib/components/layout/ShadcnLayout.svelte`
- [ ] T018 [P] Implement Sidebar component in `src/lib/components/layout/Sidebar.svelte`
- [ ] T019 [P] Create Header component in `src/lib/components/layout/Header.svelte`
- [ ] T020 [P] Navigation state store in `src/lib/stores/navigation.ts`
- [ ] T021 [P] Theme state management in `src/lib/stores/theme.ts`
- [ ] T022 Layout responsive breakpoint utilities in `src/lib/utils/responsive.ts`

## Phase 3.5: Data Display Components Implementation

- [ ] T023 [P] Implement enhanced Data Table in `src/lib/components/data/DataTable.svelte`
- [ ] T024 [P] Create Card component variants in `src/lib/components/data/Card.svelte`
- [ ] T025 [P] Build Metric Card component in `src/lib/components/data/MetricCard.svelte`
- [ ] T026 [P] Implement Progress component in `src/lib/components/data/Progress.svelte`
- [ ] T027 [P] Create List component in `src/lib/components/data/List.svelte`

## Phase 3.6: Page Migrations (Sequential - sharing route files)

- [ ] T028 Update Dashboard page to use shadcn layout in `src/routes/dashboard/+page.svelte`
- [ ] T029 Migrate Employee list page in `src/routes/employees/+page.svelte`
- [ ] T030 Convert Employee detail page in `src/routes/employees/[id]/+page.svelte`
- [ ] T031 Update Employee edit form in `src/routes/employees/[id]/edit/+page.svelte`
- [ ] T032 Migrate new Employee form in `src/routes/employees/new/+page.svelte`
- [ ] T033 Convert Leave request page in `src/routes/leave/new/+page.svelte`
- [ ] T034 Update Admin dashboard in `src/routes/admin/+page.svelte`
- [ ] T035 Migrate Login page styling in `src/routes/login/+page.svelte`

## Phase 3.7: Form Components & Interactions

- [ ] T036 [P] Enhanced form components in `src/lib/components/forms/FormField.svelte`
- [ ] T037 [P] Form validation utilities in `src/lib/utils/validation.ts`
- [ ] T038 [P] Modal and dialog components in `src/lib/components/ui/Dialog.svelte`
- [ ] T039 [P] Toast notification system in `src/lib/components/ui/Toast.svelte`
- [ ] T040 Employee form with shadcn components in `src/lib/components/employees/EmployeeForm.svelte`

## Phase 3.8: Integration & API Connectivity

- [ ] T041 Update GraphQL client integration for new components in `src/lib/graphql/client.ts`
- [ ] T042 Enhance auth service integration in `src/lib/services/authService.ts`
- [ ] T043 Update employee service for new UI in `src/lib/services/employeeService.ts`
- [ ] T044 Department service integration in `src/lib/services/departmentService.ts`
- [ ] T045 Leave management service updates in `src/lib/services/leaveService.ts`

## Phase 3.9: Accessibility & Performance Tests

- [ ] T046 [P] Accessibility audit with Playwright in `tests/accessibility/ShadcnAccessibility.test.ts`
- [ ] T047 [P] Keyboard navigation tests in `tests/accessibility/KeyboardNavigation.test.ts`
- [ ] T048 [P] Screen reader compatibility tests in `tests/accessibility/ScreenReader.test.ts`
- [ ] T049 [P] Performance benchmarks in `tests/performance/PageLoad.test.ts`
- [ ] T050 [P] Bundle size analysis in `tests/performance/BundleSize.test.ts`

## Phase 3.10: Visual Regression & E2E Tests

- [ ] T051 [P] Dashboard visual regression tests in `tests/e2e/Dashboard.visual.test.ts`
- [ ] T052 [P] Employee workflow E2E tests in `tests/e2e/EmployeeWorkflow.test.ts`
- [ ] T053 [P] Leave request E2E tests in `tests/e2e/LeaveWorkflow.test.ts`
- [ ] T054 [P] Admin functionality E2E tests in `tests/e2e/AdminWorkflow.test.ts`
- [ ] T055 [P] Mobile responsive tests in `tests/e2e/ResponsiveLayout.test.ts`

## Phase 3.11: Documentation & Polish

- [ ] T056 [P] Component usage documentation in `docs/components/shadcn-guide.md`
- [ ] T057 [P] Migration guide from Carbon in `docs/migration/carbon-to-shadcn.md`
- [ ] T058 [P] Design system documentation in `docs/design-system/shadcn-tokens.md`
- [ ] T059 [P] Accessibility standards documentation in `docs/accessibility/wcag-compliance.md`
- [ ] T060 Update main README with new UI stack in `README.md`

## Phase 3.12: Theme & Customization

- [ ] T061 [P] Light/dark mode implementation in `src/lib/styles/themes.css`
- [ ] T062 [P] HR-specific color palette in `src/lib/styles/hr-colors.css`
- [ ] T063 [P] Component theming utilities in `src/lib/utils/theme.ts`
- [ ] T064 Theme persistence service in `src/lib/services/themeService.ts`

## Phase 3.13: Final Integration & Cleanup

- [ ] T065 Remove Carbon Design System dependencies from `package.json`
- [ ] T066 Clean up unused Carbon components from `src/lib/components/`
- [ ] T067 Update build configuration for shadcn optimization in `vite.config.ts`
- [ ] T068 Final bundle size optimization and tree-shaking verification
- [ ] T069 Production deployment verification and smoke tests

## Dependencies

- Setup (T001-T006) before all other phases
- Layout tests (T007-T011) before layout implementation (T017-T022)
- Data tests (T012-T016) before data implementation (T023-T027)
- Components before page migrations (T017-T027 before T028-T035)
- Basic components before forms (T017-T027 before T036-T040)
- Implementation before integration (T017-T040 before T041-T045)
- Core functionality before testing (T017-T045 before T046-T055)
- Features before documentation (T017-T055 before T056-T060)
- Everything before cleanup (T001-T064 before T065-T069)

## Parallel Execution Examples

### Phase 3.2 - All layout tests can run together:

```bash
# Launch T007-T011 together (different test files):
Task: "Layout component contract test in tests/components/layout/ShadcnLayout.test.ts"
Task: "Sidebar component contract test in tests/components/layout/Sidebar.test.ts"
Task: "Header component contract test in tests/components/layout/Header.test.ts"
Task: "Navigation state management test in tests/components/layout/NavigationState.test.ts"
Task: "Theme switching functionality test in tests/components/layout/ThemeState.test.ts"
```

### Phase 3.4 - Layout components implementation:

```bash
# Launch T017-T021 together (different component files):
Task: "Create base layout structure in src/lib/components/layout/ShadcnLayout.svelte"
Task: "Implement Sidebar component in src/lib/components/layout/Sidebar.svelte"
Task: "Create Header component in src/lib/components/layout/Header.svelte"
Task: "Navigation state store in src/lib/stores/navigation.ts"
Task: "Theme state management in src/lib/stores/theme.ts"
```

### Phase 3.9 - Testing can run in parallel:

```bash
# Launch T046-T050 together (different test files):
Task: "Accessibility audit with Playwright in tests/accessibility/ShadcnAccessibility.test.ts"
Task: "Keyboard navigation tests in tests/accessibility/KeyboardNavigation.test.ts"
Task: "Screen reader compatibility tests in tests/accessibility/ScreenReader.test.ts"
Task: "Performance benchmarks in tests/performance/PageLoad.test.ts"
Task: "Bundle size analysis in tests/performance/BundleSize.test.ts"
```

## Notes

- [P] tasks = different files, no dependencies, can run simultaneously
- Verify all tests fail before implementing (TDD approach)
- Maintain PostGraphile API integration throughout migration
- Preserve all existing HR functionality and user workflows
- Focus on data presentation and clean navigation as specified
- Each task includes exact file paths for implementation
- Component contracts ensure API compatibility with existing backend

## Task Generation Rules Applied

1. **From Layout Contracts**: T007-T022 (tests + implementation for sidebar, header, layout)
2. **From Data Contracts**: T012-T027 (tests + implementation for tables, cards, metrics)
3. **From UI Entities**: T020-T021, T036-T040, T061-T064 (state management, forms, theming)
4. **From User Stories**: T028-T035, T051-T055 (page migrations, E2E workflows)
5. **From Performance Goals**: T046-T050, T068 (accessibility, performance, bundle size)
6. **From Documentation Focus**: T056-T060 (comprehensive shadcn component docs)

## Validation Checklist ✅

- [x] All contracts have corresponding tests (T007-T016)
- [x] All entities have implementation tasks (Layout, Navigation, DataTable, etc.)
- [x] All tests come before implementation (Phase 3.2-3.3 before 3.4-3.5)
- [x] Parallel tasks are truly independent (different files marked [P])
- [x] Each task specifies exact file path
- [x] No task modifies same file as another [P] task
- [x] Full site buildout with PostGraphile API integration maintained
- [x] Focus on data presentation and modern sidebar/topbar layout as specified
