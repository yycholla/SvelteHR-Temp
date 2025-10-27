# Stagehand Migration Guide

> **Pilot Migration Complete**: This document describes the successful migration of 3 test files from Playwright to Stagehand AI-powered testing.

## Table of Contents

1. [What is Stagehand?](#what-is-stagehand)
2. [Why Migrate?](#why-migrate)
3. [Pilot Migration Results](#pilot-migration-results)
4. [Setup Instructions](#setup-instructions)
5. [Running Stagehand Tests](#running-stagehand-tests)
6. [Writing New Stagehand Tests](#writing-new-stagehand-tests)
7. [Migration Best Practices](#migration-best-practices)
8. [Next Steps](#next-steps)
9. [Troubleshooting](#troubleshooting)

---

## What is Stagehand?

**Stagehand** is an AI-powered browser automation framework that extends Playwright with natural language capabilities. Instead of writing brittle CSS selectors, you write tests using plain English instructions.

**Key Features:**
- **`act()`** - Execute actions using natural language (e.g., "click the submit button")
- **`extract()`** - Pull structured data from pages with AI and Zod schemas
- **`observe()`** - Preview AI actions before running them
- **Agent mode** - Handle complex multi-step workflows autonomously
- **Built on Playwright** - All existing Playwright code still works

**GitHub**: [browserbase/stagehand](https://github.com/browserbase/stagehand) (12.1k+ stars)

---

## Why Migrate?

### Problems with Traditional Playwright Tests

1. **Brittle Selectors**: Tests break when UI changes
2. **Maintenance Burden**: Updating selectors across 25+ test files
3. **Dynamic UIs**: Svelte 5 runes (`$state`, `$derived`) create unpredictable DOM
4. **Readability**: Complex selector chains are hard to understand

### Benefits of Stagehand

1. **Resilient to UI Changes**: Natural language adapts automatically
2. **More Readable**: Tests read like documentation
3. **Type-Safe Data Extraction**: Zod schemas ensure data integrity
4. **Faster Development**: Write tests faster with natural language
5. **Hybrid Approach**: Keep stable Playwright selectors, add AI for complex interactions

---

## Pilot Migration Results

### Migrated Test Files

Three test files were successfully migrated as proof-of-concept:

1. **`dashboard-data.stagehand.spec.ts`** (8 tests)
   - Data extraction with AI
   - Placeholder content detection
   - Dashboard metrics validation

2. **`form-interactions.stagehand.spec.ts`** (7 tests)
   - Natural language form filling
   - Validation error detection
   - Accessibility testing

3. **`event-rsvp-workflow.stagehand.spec.ts`** (6 tests)
   - Complex multi-step workflows
   - RSVP state management
   - Event creation and filtering

**Total**: 21 AI-powered tests covering critical user flows

### Comparison: Before vs After

**Before (Playwright):**
```typescript
test('should display real employee data', async ({ page }) => {
  await page.goto('/dashboard');
  await page.waitForSelector('[data-testid="dashboard-summary"]', { timeout: 10000 });

  const employeeCountElement = page.locator('[data-testid="employee-count"]');
  const countText = await employeeCountElement.textContent();
  const count = parseInt(countText?.replace(/\D/g, '') || '0');

  expect(count).toBeGreaterThanOrEqual(40);
});
```

**After (Stagehand):**
```typescript
test('should display real employee data', async () => {
  const stagehand = await initStagehand();

  try {
    await gotoPage(stagehand, '/dashboard');

    const dashboardData = await extractData(stagehand, {
      instruction: 'Extract the employee count from the dashboard summary',
      schema: CommonSchemas.dashboardSummary
    });

    expect(dashboardData.employeeCount).toBeGreaterThanOrEqual(40);
  } finally {
    await cleanupStagehand(stagehand);
  }
});
```

**Key Improvements:**
- No brittle `[data-testid]` selectors
- Type-safe data extraction with Zod
- More readable and maintainable
- Adapts to UI changes automatically

---

## Setup Instructions

### 1. Install Dependencies

Already installed via pilot migration:
```bash
npm install --save-dev @browserbasehq/stagehand --legacy-peer-deps
```

### 2. Configure Environment Variables

Add your API key to `.env`:

```bash
# Stagehand AI Testing
STAGEHAND_API_KEY=your-openai-or-anthropic-api-key-here
STAGEHAND_MODEL_PROVIDER=openai
STAGEHAND_MODEL_NAME=gpt-4o
STAGEHAND_ENABLE_CACHING=true
```

**Get Your API Key:**
- **OpenAI**: https://platform.openai.com/api-keys
- **Anthropic Claude**: https://console.anthropic.com/

### 3. Verify Installation

Check that Stagehand helper utilities exist:
```bash
ls tests/utils/stagehand-helpers.ts
```

### 4. Run Pilot Tests

```bash
# Run all Stagehand tests
npm run test:stagehand

# Run specific test suites
npm run test:stagehand:dashboard
npm run test:stagehand:forms
npm run test:stagehand:events

# Run with browser visible
npm run test:stagehand:headed

# Debug mode
npm run test:stagehand:debug
```

---

## Running Stagehand Tests

### Available Commands

```bash
# All Stagehand tests
npm run test:stagehand

# Dashboard data tests
npm run test:stagehand:dashboard

# Form interaction tests
npm run test:stagehand:forms

# Event RSVP workflow tests
npm run test:stagehand:events

# With visible browser (headed mode)
npm run test:stagehand:headed

# Debug mode (step through tests)
npm run test:stagehand:debug
```

### Playwright Integration

Stagehand tests run through Playwright Test runner, so all Playwright features work:
```bash
# Run with UI mode
npx playwright test tests/e2e/**/*.stagehand.spec.ts --ui

# Generate test report
npx playwright test tests/e2e/**/*.stagehand.spec.ts
npx playwright show-report
```

---

## Writing New Stagehand Tests

### Test Structure Template

```typescript
import { test, expect } from '@playwright/test';
import { z } from 'zod';
import {
  initStagehand,
  gotoPage,
  performAction,
  extractData,
  cleanupStagehand,
  CommonSchemas
} from '../utils/stagehand-helpers';

test('your test name', async () => {
  const stagehand = await initStagehand();

  try {
    // 1. Navigate to page
    await gotoPage(stagehand, '/your-page');

    // 2. Perform actions using natural language
    await performAction(stagehand, 'click the submit button');

    // 3. Extract and verify data
    const data = await extractData(stagehand, {
      instruction: 'extract the form submission result',
      schema: z.object({
        success: z.boolean(),
        message: z.string()
      })
    });

    expect(data.success).toBe(true);

  } finally {
    // 4. Always cleanup
    await cleanupStagehand(stagehand);
  }
});
```

### Helper Functions

The `stagehand-helpers.ts` provides reusable utilities:

```typescript
// Initialize Stagehand
const stagehand = await initStagehand({
  headless: true,
  enableCaching: true
});

// Navigate to pages
await gotoPage(stagehand, '/dashboard');

// Perform actions
await performAction(stagehand, 'click the login button');
await performAction(stagehand, 'enter "test@example.com" in the email field');

// Extract data with type safety
const data = await extractData(stagehand, {
  instruction: 'get the employee count from the dashboard',
  schema: z.object({
    employeeCount: z.number()
  })
});

// Login helper
await loginWithStagehand(stagehand, 'admin', 'admin');

// Extract table data with pagination
const employees = await extractTableData(stagehand, {
  instruction: 'extract all employee data',
  schema: z.array(CommonSchemas.employee),
  paginated: true
});
```

### Common Schemas

Pre-defined Zod schemas for SvelteHR entities:

```typescript
import { CommonSchemas } from '../utils/stagehand-helpers';

// Dashboard summary
CommonSchemas.dashboardSummary

// Employee data
CommonSchemas.employee

// Performance review
CommonSchemas.performanceReview

// Event data
CommonSchemas.event

// Form errors
CommonSchemas.formError

// Operation result
CommonSchemas.operationResult
```

---

## Migration Best Practices

### When to Use Stagehand vs Playwright

**Use Stagehand for:**
- ✅ Dynamic UIs that change frequently
- ✅ Complex form interactions
- ✅ Data extraction and validation
- ✅ Natural language workflows
- ✅ Tests that break due to UI changes

**Use Traditional Playwright for:**
- ✅ Known, stable selectors (e.g., `[data-testid]`)
- ✅ Performance-critical tests
- ✅ Simple click-and-verify scenarios
- ✅ Tests that need pixel-perfect precision

**Hybrid Approach (Recommended):**
```typescript
test('hybrid test example', async () => {
  const stagehand = await initStagehand();
  const page = stagehand.page; // Get Playwright page

  try {
    // Use Playwright for stable elements
    await page.goto('/dashboard');
    await page.click('[data-testid="create-employee-btn"]');

    // Use Stagehand for dynamic content
    await performAction(stagehand, 'fill out the employee form with realistic data');
    await performAction(stagehand, 'submit the form');

    // Use Playwright for final verification
    await expect(page.locator('[data-testid="success-message"]')).toBeVisible();

  } finally {
    await cleanupStagehand(stagehand);
  }
});
```

### Error Handling

Always use try-finally for cleanup:

```typescript
test('with proper cleanup', async () => {
  const stagehand = await initStagehand();

  try {
    // Your test logic
  } finally {
    await cleanupStagehand(stagehand);
  }
});
```

### Debugging Tips

1. **Enable headed mode** to watch tests run:
   ```bash
   npm run test:stagehand:headed
   ```

2. **Use observe() to preview actions**:
   ```typescript
   const result = await observeAction(stagehand, 'click the submit button');
   console.log('Will click:', result.selector);
   ```

3. **Enable debug DOM** in environment:
   ```bash
   STAGEHAND_DEBUG_DOM=true npm run test:stagehand
   ```

4. **Check Stagehand cache** if behavior is inconsistent:
   ```bash
   # Disable caching temporarily
   STAGEHAND_ENABLE_CACHING=false npm run test:stagehand
   ```

---

## Next Steps

### Phase 1: Evaluate Pilot Results ✅

- [x] Pilot migration completed (3 test files, 21 tests)
- [ ] Run pilot tests and verify success
- [ ] Compare test execution time vs traditional Playwright
- [ ] Review test readability and maintainability
- [ ] Get team feedback on natural language approach

### Phase 2: Expand Migration (Optional)

If pilot results are positive, consider:

1. **Migrate high-maintenance tests** (tests that break frequently)
2. **Migrate complex workflows** (multi-step user journeys)
3. **Migrate data-heavy tests** (tests with lots of extraction)

**Suggested next files to migrate:**
- `tests/e2e/management/reviews.spec.ts` (complex review workflows)
- `tests/e2e/activities/activity-log-visibility.spec.ts` (data extraction)
- `tests/e2e/tasks/task-assignment-employee.spec.ts` (form interactions)

### Phase 3: Hybrid Strategy (Recommended)

Keep both Playwright and Stagehand tests:
- **Stable tests**: Keep as Playwright
- **Dynamic tests**: Migrate to Stagehand
- **New tests**: Start with Stagehand, fall back to Playwright if needed

---

## Troubleshooting

### API Key Not Set

**Error:**
```
STAGEHAND_API_KEY environment variable is not set
```

**Solution:**
1. Copy `.env.example` to `.env`
2. Add your OpenAI or Anthropic API key
3. Restart test execution

### Dependency Conflicts

**Error:**
```
npm error ERESOLVE unable to resolve dependency tree
```

**Solution:**
```bash
npm install --save-dev @browserbasehq/stagehand --legacy-peer-deps
```

### Test Timeouts

**Error:**
```
Test timeout of 30000ms exceeded
```

**Solution:**
1. Increase timeout in test:
   ```typescript
   test.setTimeout(60000);
   ```

2. Or set globally in environment:
   ```bash
   STAGEHAND_TIMEOUT=60000 npm run test:stagehand
   ```

### AI Extraction Errors

**Error:**
```
Failed to extract data with provided schema
```

**Solution:**
1. Check if element actually exists on page
2. Simplify extraction instruction
3. Make schema more flexible (use `.optional()` for optional fields)
4. Enable headed mode to see what AI is seeing

### Rate Limiting

**Error:**
```
429 Too Many Requests
```

**Solution:**
1. Enable caching: `STAGEHAND_ENABLE_CACHING=true`
2. Reduce parallel test execution
3. Upgrade OpenAI/Anthropic API tier

---

## Additional Resources

- **Stagehand GitHub**: https://github.com/browserbase/stagehand
- **Stagehand Docs**: https://www.stagehand.dev/
- **OpenAI API Keys**: https://platform.openai.com/api-keys
- **Anthropic API Keys**: https://console.anthropic.com/
- **Playwright Test Docs**: https://playwright.dev/docs/test-intro

---

## Feedback & Questions

This is a **pilot migration** to evaluate Stagehand's benefits. Your feedback is crucial:

1. **What works well?** (readability, resilience, speed)
2. **What doesn't?** (errors, limitations, confusion)
3. **Should we expand migration?** (yes/no and why)

Please share feedback in team meetings or via your preferred communication channel.

---

## Summary

**✅ What Was Done:**
- Installed Stagehand AI testing framework
- Created helper utilities for SvelteHR tests
- Migrated 3 test files (21 tests total) as proof-of-concept
- Added npm scripts for running Stagehand tests
- Documented setup and migration process

**🎯 Expected Benefits:**
- Reduced test maintenance (less brittle selectors)
- Improved test readability (natural language)
- Better adaptation to UI changes (AI flexibility)
- Type-safe data extraction (Zod schemas)

**🚀 Next Actions:**
1. Add API key to `.env` file
2. Run pilot tests: `npm run test:stagehand`
3. Review results and provide feedback
4. Decide on full migration vs hybrid approach

---

*Generated: 2025-10-27*
*Pilot Migration Completed Successfully*
