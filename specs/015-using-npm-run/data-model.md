# Data Model: Svelte 5 Compatibility with MCP-First and Test-First Development

**Branch**: `015-using-npm-run` | **Date**: 2025-09-26 | **Phase**: 1

## Core Entities

### 1. MCP Task Entity

**Purpose**: Track MCP tool usage and constitutional compliance for each fix

**Fields**:

- `task_id`: string - Unique identifier for the task
- `mcp_phase`: "onboarding" | "discovery" | "analysis" | "implementation" | "verification" - Current MCP workflow phase
- `serena_tools_used`: string[] - Array of Serena MCP tools used (e.g., ["check_onboarding_performed", "list_dir"])
- `constitutional_compliance`: boolean - Whether task follows constitutional requirements
- `file_path`: string - Absolute path to target file
- `task_status`: "pending" | "mcp_discovery" | "test_written" | "test_failing" | "implementation" | "test_passing" | "complete"

**Validation Rules**:

- `mcp_phase` must progress through required phases per constitution
- `serena_tools_used` must include mandatory tools for each phase
- `constitutional_compliance` must be true before implementation
- `task_status` must follow TDD cycle (test_written → test_failing → implementation → test_passing)

**State Transitions**:

- `pending` → `mcp_discovery` → `test_written` → `test_failing` → `implementation` → `test_passing` → `complete`

### 2. Test Entity (Constitutional Requirement)

**Purpose**: Failing tests that must be written before any implementation

**Fields**:

- `test_id`: string - Unique identifier for the test
- `test_type`: "unit" | "integration" | "e2e" - Type of test (Vitest vs Playwright)
- `test_category`: "store_subscription" | "state_reference" | "event_handler" | "component_syntax" | "build_error"
- `file_path`: string - Absolute path to test file
- `target_component`: string - Component or feature being tested
- `test_status`: "not_written" | "written" | "failing" | "passing" - TDD cycle status
- `failure_reason`: string - Why test should fail initially
- `success_criteria`: string - What makes test pass after implementation

**Validation Rules**:

- `test_status` must be "failing" before any implementation begins
- `test_type` must match component type (unit for components, e2e for user journeys)
- `target_component` must exist in codebase
- `failure_reason` must describe expected failure before fix

**State Transitions**:

- `not_written` → `written` → `failing` → (implementation) → `passing`

### 3. Svelte 5 Compatibility Issue Entity

**Purpose**: Specific compatibility issues identified by build output and MCP analysis

**Fields**:

- `issue_id`: string - Unique identifier for the compatibility issue
- `issue_type`: "store_subscription" | "state_reference_capture" | "event_handler_deprecation" | "component_syntax_deprecation" | "build_error"
- `severity`: "critical" | "breaking" | "warning" - Impact level (focus on critical/breaking first)
- `file_path`: string - Absolute path to affected file
- `line_number`: number - Specific line with issue
- `current_syntax`: string - Current problematic code
- `corrected_syntax`: string - Svelte 5 compatible code
- `mcp_analysis_complete`: boolean - Whether Serena MCP analysis completed
- `test_coverage`: boolean - Whether failing test exists for this issue
- `priority`: number - Fix priority (1=highest, critical runtime errors)

**Validation Rules**:

- `severity` determines priority order (critical → breaking → warning)
- `mcp_analysis_complete` must be true before fix attempt
- `test_coverage` must be true per constitutional requirement
- `corrected_syntax` must be validated Svelte 5 syntax

**State Transitions**:

- `identified` → `mcp_analyzed` → `test_covered` → `fixing` → `testing` → `validated` → `complete`

### 4. Build Validation Entity

**Purpose**: Track build system compliance with zero tolerance requirement

**Fields**:

- `build_id`: string - Unique identifier for build validation
- `build_timestamp`: Date - When build was executed
- `warning_count`: number - Number of warnings (must be 0)
- `error_count`: number - Number of errors (must be 0)
- `warnings`: string[] - Array of warning messages
- `errors`: string[] - Array of error messages
- `zero_tolerance_met`: boolean - Whether zero tolerance requirement satisfied
- `issues_identified`: string[] - Array of issue_ids that need fixing
- `mcp_analysis_performed`: boolean - Whether MCP tools analyzed build output

**Validation Rules**:

- `zero_tolerance_met` must be true for completion
- `warning_count` and `error_count` must both be 0
- `mcp_analysis_performed` must be true per constitutional requirement
- `issues_identified` must map to valid Svelte 5 Compatibility Issue entities

**State Transitions**:

- `building` → `analyzed` → `issues_mapped` → `fixing_in_progress` → `retesting` → `validated`

### 5. User Feedback Entity

**Purpose**: Track user validation and feedback during batch testing

**Fields**:

- `feedback_id`: string - Unique identifier for feedback session
- `batch_type`: "store_fixes" | "state_fixes" | "event_fixes" | "component_fixes" | "build_errors"
- `files_modified`: string[] - Array of file paths modified in batch
- `user_response`: "PASS" | "FAIL" | "PENDING" - User validation result
- `issues_reported`: string[] - Array of issues found during user testing
- `pages_tested`: string[] - Array of page routes tested by user
- `console_errors_found`: string[] - JavaScript errors reported by user
- `functionality_preserved`: boolean - Whether existing functionality still works

**Validation Rules**:

- `user_response` must be "PASS" before proceeding to next batch
- `issues_reported` must be empty for "PASS" response
- `pages_tested` must include relevant pages for the batch type
- `functionality_preserved` must be true for "PASS" response

**State Transitions**:

- `pending` → `testing` → `pass`/`fail` → (if fail) `fixing` → `retesting`

## Entity Relationships

### MCP Task → Test Entity

- **Type**: One-to-One
- **Description**: Each MCP task must have corresponding failing test before implementation
- **Constraint**: Constitutional requirement - no implementation without failing test

### MCP Task → Svelte 5 Compatibility Issue

- **Type**: One-to-Many
- **Description**: One MCP task may address multiple related compatibility issues
- **Constraint**: All issues in task must be analyzed with Serena MCP tools first

### Test Entity → Svelte 5 Compatibility Issue

- **Type**: One-to-One or One-to-Many
- **Description**: Each test covers one or more specific compatibility issues
- **Constraint**: Test must fail initially due to the compatibility issue

### Build Validation → Svelte 5 Compatibility Issue

- **Type**: One-to-Many
- **Description**: Build validation identifies multiple compatibility issues
- **Constraint**: All identified issues must be tracked and addressed

### User Feedback → MCP Task

- **Type**: One-to-Many
- **Description**: User feedback validates multiple completed MCP tasks in batch
- **Constraint**: User must validate before proceeding to next batch

## Data Flow Patterns

### Constitutional Compliance Flow

1. **MCP Discovery**: Use Serena MCP tools for code analysis
2. **Test-First**: Write failing tests before any implementation
3. **Implementation**: Use MCP tools for surgical modifications
4. **Validation**: User feedback and build validation

### Priority-Based Fix Flow

1. **Critical Issues** (Priority 1): Store subscription errors, state reference capture
2. **Breaking Issues** (Priority 2): Event handler deprecations, component syntax
3. **Build Errors** (Priority 3): GraphQL syntax, CSS cleanup

### Test-Driven Development Flow

1. **RED**: Write failing test that demonstrates the issue
2. **GREEN**: Use MCP tools to implement minimal fix that makes test pass
3. **REFACTOR**: Use MCP tools to improve code while keeping tests passing

## MCP Tool Integration Patterns

### Discovery Pattern

```
mcp__serena__check_onboarding_performed()
→ mcp__serena__list_dir("target_directory")
→ mcp__serena__find_file("pattern", "directory")
→ mcp__serena__get_symbols_overview("file_path")
```

### Analysis Pattern

```
mcp__serena__search_for_pattern("error_pattern", {context_lines: 2})
→ mcp__serena__find_symbol("symbol_name", {include_body: true})
→ mcp__serena__find_referencing_symbols("symbol_name", "file_path")
```

### Implementation Pattern

```
mcp__serena__think_about_task_adherence()
→ mcp__serena__replace_symbol_body("symbol_name", "file_path", "new_content")
→ mcp__serena__find_referencing_symbols("symbol_name", "file_path")
→ mcp__serena__think_about_whether_you_are_done()
```

## Validation States

### Build Level Validation

- **Zero Tolerance**: warning_count = 0 AND error_count = 0
- **MCP Analysis**: All build output analyzed with Serena MCP tools
- **Issue Mapping**: All warnings/errors mapped to compatibility issues

### Test Level Validation

- **Test Coverage**: Every compatibility issue has failing test
- **TDD Cycle**: RED → GREEN → REFACTOR followed strictly
- **Test Types**: Unit tests (Vitest) + E2E tests (Playwright)

### Constitutional Compliance Validation

- **MCP-First**: All code changes use Serena MCP tools
- **Test-First**: All implementations have prior failing tests
- **Quality Gates**: All constitutional requirements verified

### User Validation

- **Functionality**: Existing features continue to work
- **Error-Free**: No JavaScript errors in browser console
- **Performance**: Page load times not regressed

## Error Recovery Patterns

### MCP Tool Failure Recovery

- If MCP tool fails → Document issue, use alternative MCP approach
- If analysis incomplete → Retry with different MCP tool parameters
- Never fall back to manual editing (constitutional violation)

### Test Failure Recovery

- If test won't fail initially → Review test implementation, ensure it captures the actual issue
- If test fails after fix → Analyze with MCP tools, adjust implementation
- If test becomes flaky → Rewrite with more stable patterns

### Build Validation Failure Recovery

- If zero tolerance not met → Use MCP tools to analyze remaining issues
- If new issues introduced → Rollback and re-analyze with MCP tools
- If performance regression → Use MCP tools to identify optimization opportunities
