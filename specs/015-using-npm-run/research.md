# Research: Svelte 5 Rune Compatibility with MCP-First and Test-First Development

**Branch**: `015-using-npm-run` | **Date**: 2025-09-26 | **Phase**: 0

## Research Findings

### Serena MCP Tool Integration for Svelte 5 Fixes

**Decision**: Use Serena MCP tools for all code discovery, analysis, and surgical modifications
**Rationale**:

- Constitutional requirement VI: MCP-First Development is NON-NEGOTIABLE
- Serena MCP provides semantic code analysis and safe refactoring
- `mcp__serena__replace_symbol_body()` enables surgical edits without breaking references
- `mcp__serena__find_referencing_symbols()` validates impact before changes

**Key MCP Integration Patterns**:

1. **Code Discovery Phase**:

   ```typescript
   // MANDATORY: Before any fixes
   mcp__serena__check_onboarding_performed();
   mcp__serena__list_dir('src/lib/components/ui');
   mcp__serena__find_file('*.svelte', 'src/routes');
   mcp__serena__get_symbols_overview('src/lib/components/ui/toast-container.svelte');
   ```

2. **Analysis Before Editing**:

   ```typescript
   // MANDATORY: Before modifications
   mcp__serena__search_for_pattern('\\$errorStore\\.errors', { context_lines_after: 2 });
   mcp__serena__find_symbol('errorStore', { include_body: true });
   mcp__serena__find_referencing_symbols('errorStore', 'src/lib/stores/error.ts');
   ```

3. **Surgical Implementation**:
   ```typescript
   // MANDATORY: Use instead of manual editing
   mcp__serena__replace_symbol_body(
   	'script',
   	'src/lib/components/ui/toast-container.svelte',
   	corrected_script_content
   );
   mcp__serena__insert_after_symbol(
   	'import',
   	'src/routes/dashboard/+page.svelte',
   	new_import_statement
   );
   ```

### Test-First Development for Svelte 5 Compatibility

**Decision**: Write failing tests for each compatibility fix category before implementation
**Rationale**:

- Constitutional requirement I: Test-First Development is NON-NEGOTIABLE
- RED-GREEN-REFACTOR cycle ensures fixes don't break existing functionality
- E2E tests with Playwright verify runtime behavior
- Unit tests with Vitest validate component behavior

**Test Strategy by Fix Category**:

1. **Store Subscription Tests (Vitest)**:

   ```typescript
   // MUST FAIL before implementation
   describe('Store Subscription Compatibility', () => {
   	test('errorStore subscription works with Svelte 5 runes', () => {
   		const component = render(ToastContainer);
   		// Test that errors are properly subscribed and reactive
   		expect(component.queryByText('Test error')).not.toBeInTheDocument();
   		errorStore.errors.add({ id: 'test', message: 'Test error' });
   		expect(component.getByText('Test error')).toBeInTheDocument();
   	});
   });
   ```

2. **State Reference Capture Tests (Vitest)**:

   ```typescript
   // MUST FAIL before implementation
   describe('State Reference Capture', () => {
   	test('filters state reactivity works correctly', () => {
   		const component = render(EmployeeDirectory, { filters: mockFilters });
   		// Test that state changes are properly captured and reactive
   		expect(component.getByDisplayValue('')).toBeInTheDocument();
   		// Simulate filter change and verify reactivity
   	});
   });
   ```

3. **Runtime Error Prevention (Playwright E2E)**:

   ```typescript
   // MUST FAIL before implementation
   test('Dashboard loads without JavaScript errors', async ({ page }) => {
   	const consoleErrors = [];
   	page.on('console', (msg) => {
   		if (msg.type() === 'error') consoleErrors.push(msg.text());
   	});

   	await page.goto('/dashboard');
   	await page.waitForLoadState('networkidle');

   	// This should fail initially due to store subscription errors
   	expect(consoleErrors).toHaveLength(0);
   });
   ```

### Build System Integration

**Decision**: Integrate MCP tools with build validation process
**Rationale**:

- Zero tolerance requirement needs automated validation
- Build errors must be systematically tracked and resolved
- MCP tools can analyze build output and identify patterns

**Build Integration Pattern**:

1. Use `mcp__serena__search_for_pattern()` to find deprecated syntax
2. Use `mcp__serena__think_about_task_adherence()` before each fix
3. Use `mcp__serena__think_about_whether_you_are_done()` after fixes

### Svelte 5 Runes Migration Patterns

**Decision**: Maintain existing patterns from previous research, enhanced with MCP workflow
**Rationale**:

- Previous Context7 research identified correct patterns
- MCP tools ensure safe application of patterns
- Constitutional compliance requires systematic approach

**Enhanced Migration Patterns**:

1. **Store Subscriptions with MCP Validation**:

   ```typescript
   // OLD (identified via mcp__serena__search_for_pattern):
   $: errors = $errorStore.errors;

   // NEW (applied via mcp__serena__replace_symbol_body):
   $: errors = errorStore.errors; // where errorStore.errors is the actual store
   ```

2. **State Reference Capture with MCP Analysis**:

   ```typescript
   // OLD (identified via mcp__serena__find_symbol):
   let searchTerm = $state(filters.searchTerm);

   // NEW (applied via mcp__serena__replace_symbol_body):
   let searchTerm = $state('');
   $effect(() => {
   	searchTerm = filters.searchTerm;
   });
   ```

## Alternatives Considered

### Alternative 1: Manual Code Editing

**Rejected**: Violates constitutional MCP-First Development requirement

### Alternative 2: Skip Test-First Development for Simple Fixes

**Rejected**: Violates constitutional Test-First Development requirement

### Alternative 3: Fix All Warnings and Errors Together

**Rejected**: User explicitly requested focus on breaking issues first, FR08/09 deprioritized

## Implementation Approach

Based on research findings and constitutional requirements:

1. **Phase 0**: MCP onboarding and code discovery
2. **Phase 1**: Write failing tests for each fix category using Vitest/Playwright
3. **Phase 2**: Systematic MCP-based fixes with validation
4. **Phase 3**: User feedback collection with constitutional compliance

Each phase must use MCP tools and follow Test-First Development principles.
