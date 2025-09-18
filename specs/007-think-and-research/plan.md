# Implementation Plan: Comprehensive Carbon Design System Implementation

**Branch**: `007-think-and-research` | **Date**: 2025-01-18 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/home/chanway/Projects/SvelteHR/specs/007-think-and-research/spec.md`

## Execution Flow (/plan command scope)
```
1. Load feature spec from Input path
   → If not found: ERROR "No feature spec at {path}"
2. Fill Technical Context (scan for NEEDS CLARIFICATION)
   → Detect Project Type from context (web=frontend+backend, mobile=app+api)
   → Set Structure Decision based on project type
3. Evaluate Constitution Check section below
   → If violations exist: Document in Complexity Tracking
   → If no justification possible: ERROR "Simplify approach first"
   → Update Progress Tracking: Initial Constitution Check
4. Execute Phase 0 → research.md
   → If NEEDS CLARIFICATION remain: ERROR "Resolve unknowns"
5. Execute Phase 1 → contracts, data-model.md, quickstart.md, agent-specific template file (e.g., `CLAUDE.md` for Claude Code, `.github/copilot-instructions.md` for GitHub Copilot, or `GEMINI.md` for Gemini CLI).
6. Re-evaluate Constitution Check section
   → If new violations: Refactor design, return to Phase 1
   → Update Progress Tracking: Post-Design Constitution Check
7. Plan Phase 2 → Describe task generation approach (DO NOT create tasks.md)
8. STOP - Ready for /tasks command
```

**IMPORTANT**: The /plan command STOPS at step 7. Phases 2-4 are executed by other commands:
- Phase 2: /tasks command creates tasks.md
- Phase 3-4: Implementation execution (manual or via tools)

## Summary
Implement comprehensive Carbon Design System across all pages of the SvelteHR application to provide consistent, professional, and accessible user interface patterns. This includes unified typography, spacing, color schemes, navigation patterns, form behaviors, data display components, and accessibility features that meet WCAG 2.1 AA standards. The implementation will ensure responsive design across all devices while maintaining enterprise-grade visual appeal and reducing cognitive load for users.

## Technical Context
**Language/Version**: TypeScript 5.x with SvelteKit framework
**Primary Dependencies**: carbon-components-svelte, carbon-icons-svelte, carbon-preprocess-svelte, @vincjo/datatables
**Storage**: PostgreSQL (existing) - not directly impacted by design system
**Testing**: Playwright for E2E, Vitest for component testing, accessibility testing with axe-core
**Target Platform**: Modern web browsers (Chrome 90+, Firefox 88+, Safari 14+, Edge 90+)
**Project Type**: web - frontend design system implementation
**Performance Goals**: <100ms first paint, <200ms interaction response, maintain 60fps animations, CSS bundle <50KB gzipped
**Constraints**: Must maintain existing functionality, backward compatible with current components, WCAG 2.1 AA compliance required
**Scale/Scope**: ~15 existing pages/routes, 25+ reusable components, support for 500+ concurrent users

## Constitution Check
*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*
*RE-EVALUATION: ✓ CONFIRMED - Design phase validates constitutional compliance*

**Simplicity**:
- Projects: 1 (frontend design system only)
- Using framework directly? YES (Carbon Design System components directly, no custom wrappers)
- Single data model? YES (UI component patterns and design tokens)
- Avoiding patterns? YES (no unnecessary abstractions, direct component usage)

**Architecture**:
- EVERY feature as library? PARTIAL - Design system components as reusable libraries
- Libraries listed: carbon-design-system-theme (theming), carbon-layout-system (grids/spacing), carbon-component-library (enhanced components)
- CLI per library: N/A for design system (browser-based)
- Library docs: YES - component documentation and usage patterns

**Testing (NON-NEGOTIABLE)**:
- RED-GREEN-Refactor cycle enforced? YES - accessibility and visual regression tests first
- Git commits show tests before implementation? YES - test-driven development for components
- Order: Contract→Integration→E2E→Unit strictly followed? YES - visual contracts, component integration, E2E flows, unit component tests
- Real dependencies used? YES - actual browser rendering, real screen readers
- Integration tests for: component consistency, accessibility compliance, responsive behavior
- FORBIDDEN: Implementation before test, skipping RED phase - ENFORCED

**Observability**:
- Structured logging included? YES - accessibility warnings, performance metrics
- Frontend logs → backend? YES - usage analytics and accessibility issues
- Error context sufficient? YES - component errors and fallback patterns

**Versioning**:
- Version number assigned? 1.0.0 (new design system implementation)
- BUILD increments on every change? YES
- Breaking changes handled? YES - gradual migration plan with parallel support

## Project Structure

### Documentation (this feature)
```
specs/[###-feature]/
├── plan.md              # This file (/plan command output)
├── research.md          # Phase 0 output (/plan command)
├── data-model.md        # Phase 1 output (/plan command)
├── quickstart.md        # Phase 1 output (/plan command)
├── contracts/           # Phase 1 output (/plan command)
└── tasks.md             # Phase 2 output (/tasks command - NOT created by /plan)
```

### Source Code (repository root)
```
# Option 1: Single project (DEFAULT)
src/
├── models/
├── services/
├── cli/
└── lib/

tests/
├── contract/
├── integration/
└── unit/

# Option 2: Web application (when "frontend" + "backend" detected)
backend/
├── src/
│   ├── models/
│   ├── services/
│   └── api/
└── tests/

frontend/
├── src/
│   ├── components/
│   ├── pages/
│   └── services/
└── tests/

# Option 3: Mobile + API (when "iOS/Android" detected)
api/
└── [same as backend above]

ios/ or android/
└── [platform-specific structure]
```

**Structure Decision**: Option 2 (Web application) - frontend design system with existing backend

## Phase 0: Outline & Research
1. **Extract unknowns from Technical Context** above:
   - For each NEEDS CLARIFICATION → research task
   - For each dependency → best practices task
   - For each integration → patterns task

2. **Generate and dispatch research agents**:
   ```
   For each unknown in Technical Context:
     Task: "Research {unknown} for {feature context}"
   For each technology choice:
     Task: "Find best practices for {tech} in {domain}"
   ```

3. **Consolidate findings** in `research.md` using format:
   - Decision: [what was chosen]
   - Rationale: [why chosen]
   - Alternatives considered: [what else evaluated]

**Output**: research.md with all NEEDS CLARIFICATION resolved

## Phase 1: Design & Contracts
*Prerequisites: research.md complete*

1. **Extract entities from feature spec** → `data-model.md`:
   - Entity name, fields, relationships
   - Validation rules from requirements
   - State transitions if applicable

2. **Generate API contracts** from functional requirements:
   - For each user action → endpoint
   - Use standard REST/GraphQL patterns
   - Output OpenAPI/GraphQL schema to `/contracts/`

3. **Generate contract tests** from contracts:
   - One test file per endpoint
   - Assert request/response schemas
   - Tests must fail (no implementation yet)

4. **Extract test scenarios** from user stories:
   - Each story → integration test scenario
   - Quickstart test = story validation steps

5. **Update agent file incrementally** (O(1) operation):
   - Run `/scripts/update-agent-context.sh [claude|gemini|copilot]` for your AI assistant
   - If exists: Add only NEW tech from current plan
   - Preserve manual additions between markers
   - Update recent changes (keep last 3)
   - Keep under 150 lines for token efficiency
   - Output to repository root

**Output**: data-model.md, /contracts/*, failing tests, quickstart.md, agent-specific file

## Phase 2: Task Planning Approach
*This section describes what the /tasks command will do - DO NOT execute during /plan*

**Task Generation Strategy**:
- Generate tasks from Phase 1 design docs (contracts, data-model.md, quickstart.md, frontend-developer-focus.md)
- Component contract → accessibility test + visual regression test [P]
- Enhanced component → implementation task with Carbon integration
- Page layout → responsive design task with Grid system
- Performance requirement → optimization task with metrics validation
- Accessibility feature → WCAG compliance task with axe-core testing

**Ordering Strategy**:
- TDD order: Tests before implementation (accessibility, visual regression, performance)
- Foundation first: Carbon setup, preprocessor, design tokens
- Component layer: Enhanced Carbon components (CarbonDataTable, CarbonLoginForm, etc.)
- Layout layer: Page layouts with Grid system
- Integration layer: Cross-component interactions and patterns
- Optimization layer: Performance tuning and bundle optimization
- Mark [P] for parallel execution (independent component implementations)

**Estimated Output**: 30-35 numbered, ordered tasks in tasks.md focusing on frontend implementation

**IMPORTANT**: This phase is executed by the /tasks command, NOT by /plan

## Phase 3+: Future Implementation
*These phases are beyond the scope of the /plan command*

**Phase 3**: Task execution (/tasks command creates tasks.md)  
**Phase 4**: Implementation (execute tasks.md following constitutional principles)  
**Phase 5**: Validation (run tests, execute quickstart.md, performance validation)

## Complexity Tracking
*Fill ONLY if Constitution Check has violations that must be justified*

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| [e.g., 4th project] | [current need] | [why 3 projects insufficient] |
| [e.g., Repository pattern] | [specific problem] | [why direct DB access insufficient] |


## Progress Tracking
*This checklist is updated during execution flow*

**Phase Status**:
- [ ] Phase 0: Research complete (/plan command)
- [ ] Phase 1: Design complete (/plan command)
- [ ] Phase 2: Task planning complete (/plan command - describe approach only)
- [ ] Phase 3: Tasks generated (/tasks command)
- [ ] Phase 4: Implementation complete
- [ ] Phase 5: Validation passed

**Gate Status**:
- [ ] Initial Constitution Check: PASS
- [ ] Post-Design Constitution Check: PASS
- [ ] All NEEDS CLARIFICATION resolved
- [ ] Complexity deviations documented

---
*Based on Constitution v2.1.1 - See `/memory/constitution.md`*