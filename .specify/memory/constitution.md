<!--
Sync Impact Report:
- Version change: 1.0.0 → 1.1.0 (Added MCP tools integration principles)
- Modified principles: Added VI. MCP-First Development, enhanced existing principles with MCP tools
- Added sections: Enhanced Development Workflow with MCP tool requirements
- Templates requiring updates: ✅ All aligned with new constitution
- Follow-up TODOs: None - all placeholders resolved
-->

# SvelteHR Constitution

## Core Principles

### I. Test-First Development (NON-NEGOTIABLE)
Test-Driven Development is MANDATORY for all feature development. Tests MUST be written first, fail initially (RED phase), then implementation makes them pass (GREEN phase), followed by refactoring (REFACTOR phase). E2E tests using Playwright cover user journeys, unit tests using Vitest cover component and business logic. No feature is considered complete without comprehensive test coverage >90%. All testing workflows MUST integrate with Serena MCP tools for semantic code analysis and task tracking.

### II. Type Safety First
TypeScript 5.0 MUST be used throughout with strict mode enabled. No `any` types permitted except in exceptional circumstances with explicit justification. All API responses, component props, and data structures MUST have proper type definitions. GraphQL operations require generated types from schema. Type errors MUST be resolved before code review.

### III. Security by Design
All data access MUST implement Row-Level Security (RLS) at the database level. JWT authentication with 4-tier RBAC (Admin 100, HR 80, Manager 60, Employee 20) enforced on every request. Input validation using Zod schemas required. Audit logging mandatory for all sensitive operations. No sensitive data in client-side code or logs.

### IV. Performance Standards
GraphQL operations MUST complete in <200ms. Page load times MUST be under 1 second. Database queries MUST use proper indexing. Redis caching required for frequently accessed data. Performance regression tests required for datasets >1000 records. Bundle size optimization mandatory with code splitting.

### V. Component Architecture
UI components MUST follow established shadcn/ui patterns. Svelte 5 runes (`$state`, `$derived`, `$props`, `$bindable`) required for all reactive state. Components MUST be self-contained, reusable, and documented in Storybook. No direct API calls from components - use server-side data loading or tRPC. Consistent error handling and loading states across all components. Use Serena MCP `replace_symbol_body` and `find_referencing_symbols` for safe refactoring.

### VI. MCP-First Development (NON-NEGOTIABLE)
BEFORE any coding task, developers MUST use MCP tools in this order:
1. **Serena MCP onboarding**: Use `mcp__serena__check_onboarding_performed()` and read relevant memories
2. **Task Management**: Use Archon MCP as primary task system per CLAUDE.md, TodoWrite only for secondary tracking
3. **Code Discovery**: Use `mcp__serena__list_dir()`, `mcp__serena__find_file()`, `mcp__serena__get_symbols_overview()` before changes
4. **Implementation**: Use `mcp__serena__replace_symbol_body()`, `mcp__serena__insert_after_symbol()` for surgical modifications
5. **Verification**: Use `mcp__serena__find_referencing_symbols()` to validate impact, `mcp__serena__think_about_task_adherence()` before implementation

VIOLATION: Using TodoWrite before Archon MCP or making code changes without Serena MCP analysis violates this principle.

## Security Requirements

All development MUST adhere to enterprise security standards. PostGraphile provides automatic SQL injection protection. XSS prevention through proper input sanitization. CORS policies properly configured. No credentials in source code - use environment variables. Regular security audits required using MCP tools for comprehensive analysis. Role-based access control validated at both API and UI levels. Use Serena MCP `search_for_pattern` to identify security vulnerabilities and ensure JWT token handling compliance.

## Quality Standards

Code quality gates MUST pass before merge: TypeScript compilation without errors, ESLint and Prettier checks passing, all tests passing with >90% coverage, security scan approval using MCP tools. Code reviews required for all changes with MCP-assisted analysis. Performance benchmarks must not regress. Accessibility standards (WCAG 2.1 AA) compliance required for all UI components. Use Serena MCP `think_about_task_adherence` before implementation and `think_about_whether_you_are_done` upon completion.

## Development Workflow

All development MUST follow the MCP-enhanced workflow based on project context:

### Project Discovery Phase
1. **Onboarding Check**: Use `mcp__serena__check_onboarding_performed()`
2. **Context Gathering**: Read relevant memories (`project_overview`, `codebase_architecture`, `code_style_conventions`)
3. **Directory Analysis**: Use `mcp__serena__list_dir()` to understand current project structure
4. **File Discovery**: Use `mcp__serena__find_file()` to locate relevant components

### Implementation Phase
1. **Symbol Analysis**: Use `mcp__serena__get_symbols_overview()` to understand target files
2. **Code Search**: Use `mcp__serena__search_for_pattern()` for finding existing patterns
3. **Surgical Editing**: Use `mcp__serena__replace_symbol_body()` or `mcp__serena__insert_after_symbol()` for precise changes
4. **Impact Validation**: Use `mcp__serena__find_referencing_symbols()` to verify change impact

### Verification Phase
1. **Task Adherence**: Use `mcp__serena__think_about_task_adherence()` before major changes
2. **Information Review**: Use `mcp__serena__think_about_collected_information()` to validate approach
3. **Completion Check**: Use `mcp__serena__think_about_whether_you_are_done()` before finishing

### Memory Management
- Use `mcp__serena__write_memory()` for complex features spanning multiple sessions
- Use `mcp__serena__read_memory()` to access project context and lessons learned
- Update memories when architectural decisions are made

## Governance

This constitution supersedes all other development practices and guidelines. All feature specifications, implementation plans, and pull requests MUST verify constitutional compliance using MCP tools for automated validation. Any deviation from core principles requires explicit justification and approval. Constitution amendments require documentation of rationale, impact assessment, and migration plan for existing code.

Version control follows semantic versioning for the SvelteHR application. Breaking changes to APIs or data models require MAJOR version increment. New features require MINOR increment. Bug fixes and patches require PATCH increment. All changes must maintain backward compatibility where possible.

MCP tool usage is tracked and compliance verified through automated tooling. Non-compliance with MCP-First Development principle results in automatic task blocking until proper workflow is followed. The CLAUDE.md file serves as the primary runtime guidance for MCP tool integration.

**Version**: 1.1.0 | **Ratified**: 2025-01-27 | **Last Amended**: 2025-01-27