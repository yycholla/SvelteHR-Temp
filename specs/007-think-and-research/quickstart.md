# Quickstart: Carbon Design System Implementation

**Date**: 2025-01-18
**Feature**: Comprehensive Carbon Design System Implementation
**Status**: Ready for Implementation

## Overview

This quickstart guide provides step-by-step instructions for implementing and validating the Carbon Design System across all pages of the SvelteHR application.

## Prerequisites

### System Requirements
- Node.js 18+ with npm or yarn
- Modern web browser (Chrome 90+, Firefox 88+, Safari 14+, Edge 90+)
- Git for version control
- VS Code or similar editor with TypeScript support

### Existing Dependencies
- SvelteKit framework (already installed)
- TypeScript configuration (already configured)
- Playwright for testing (already installed)
- Existing HR application structure

## Quick Setup (5 minutes)

### 1. Install Carbon Design System Packages
```bash
npm install carbon-components-svelte carbon-icons-svelte carbon-preprocess-svelte @vincjo/datatables
npm install -D @axe-core/playwright lighthouse
```

### 2. Configure Carbon Preprocessor
```javascript
// svelte.config.js
import { optimizeImports } from 'carbon-preprocess-svelte'

export default {
  preprocess: [
    vitePreprocess(),
    optimizeImports()
  ]
}
```

### 3. Import Carbon CSS
```css
/* src/app.css */
@import 'carbon-components-svelte/css/white.css';
```

### 4. Verify Installation
```bash
npm run dev
# Should start without errors
```

## Basic Implementation (15 minutes)

### 1. Create Enhanced Carbon Component
```typescript
// src/lib/components/carbon/CarbonButton.svelte
<script lang="ts">
  import { Button } from 'carbon-components-svelte'
  import type { ButtonProps } from './types'

  export let variant: ButtonProps['variant'] = 'primary'
  export let size: ButtonProps['size'] = 'field'
  export let disabled = false
  export let loading = false
</script>

<Button
  kind={variant}
  {size}
  {disabled}
  {loading}
  on:click
  {...$$restProps}
>
  <slot />
</Button>
```

### 2. Implement Page Layout Pattern
```svelte
<!-- src/lib/components/layouts/PageLayout.svelte -->
<script lang="ts">
  import { Grid, Row, Column, Breadcrumb, BreadcrumbItem } from 'carbon-components-svelte'

  export let title: string
  export let breadcrumbs: BreadcrumbItem[] = []
</script>

<div class="page-layout">
  {#if breadcrumbs.length > 0}
    <Breadcrumb noTrailingSlash>
      {#each breadcrumbs as crumb}
        <BreadcrumbItem href={crumb.href} isCurrentPage={crumb.current}>
          {crumb.label}
        </BreadcrumbItem>
      {/each}
    </Breadcrumb>
  {/if}

  <Grid condensed fullWidth>
    <Row>
      <Column lg={16} md={8} sm={4}>
        <h1 class="page-title">{title}</h1>
        <slot />
      </Column>
    </Row>
  </Grid>
</div>

<style>
  .page-layout {
    padding: var(--cds-spacing-06);
    min-height: 100vh;
    background: var(--cds-background);
  }

  .page-title {
    font-size: var(--cds-productive-heading-04-font-size);
    font-weight: var(--cds-productive-heading-04-font-weight);
    margin-bottom: var(--cds-spacing-05);
    color: var(--cds-text-primary);
  }
</style>
```

### 3. Convert Existing Page
```svelte
<!-- src/routes/dashboard/+page.svelte -->
<script lang="ts">
  import PageLayout from '$lib/components/layouts/PageLayout.svelte'
  import { Tile, Button } from 'carbon-components-svelte'
  import { ChevronRight } from 'carbon-icons-svelte'

  const breadcrumbs = [
    { label: 'Home', href: '/' },
    { label: 'Dashboard', current: true }
  ]
</script>

<PageLayout title="Dashboard" {breadcrumbs}>
  <div class="dashboard-content">
    <Tile class="welcome-tile">
      <h2>Welcome to SvelteHR</h2>
      <p>Your comprehensive HR management system.</p>
      <Button kind="primary" icon={ChevronRight}>
        Get Started
      </Button>
    </Tile>
  </div>
</PageLayout>

<style>
  .dashboard-content {
    display: grid;
    gap: var(--cds-spacing-05);
  }

  .welcome-tile {
    padding: var(--cds-spacing-06);
  }
</style>
```

## Accessibility Validation (10 minutes)

### 1. Install Testing Dependencies
```bash
npm install -D @axe-core/playwright axe-core
```

### 2. Create Accessibility Test
```typescript
// tests/accessibility/carbon-components.spec.ts
import { test, expect } from '@playwright/test'
import { injectAxe, checkA11y } from 'axe-playwright'

test.describe('Carbon Components Accessibility', () => {
  test('Dashboard page meets WCAG 2.1 AA standards', async ({ page }) => {
    await page.goto('/dashboard')
    await injectAxe(page)

    await checkA11y(page, null, {
      detailedReport: true,
      detailedReportOptions: { html: true }
    })
  })

  test('Navigation is keyboard accessible', async ({ page }) => {
    await page.goto('/dashboard')

    // Test keyboard navigation
    await page.keyboard.press('Tab')
    const focusedElement = await page.locator(':focus')
    await expect(focusedElement).toBeVisible()

    // Test skip links
    await page.keyboard.press('Tab')
    const skipLink = page.getByRole('link', { name: /skip to main content/i })
    if (await skipLink.isVisible()) {
      await expect(skipLink).toBeFocused()
    }
  })
})
```

### 3. Run Accessibility Tests
```bash
npx playwright test tests/accessibility/
```

## Performance Validation (5 minutes)

### 1. Create Performance Test
```typescript
// tests/performance/bundle-size.spec.ts
import { test, expect } from '@playwright/test'

test('Carbon CSS bundle size within budget', async ({ page }) => {
  const response = await page.goto('/dashboard')

  // Check CSS bundle size
  const cssResources = await page.evaluate(() => {
    return Array.from(document.styleSheets)
      .map(sheet => sheet.href)
      .filter(href => href && href.includes('carbon'))
  })

  // Verify CSS is loaded
  expect(cssResources.length).toBeGreaterThan(0)

  // Check first paint timing
  const performanceMetrics = await page.evaluate(() => {
    return JSON.parse(JSON.stringify(performance.getEntriesByType('paint')))
  })

  const firstPaint = performanceMetrics.find(metric => metric.name === 'first-paint')
  expect(firstPaint.startTime).toBeLessThan(100) // 100ms budget
})
```

### 2. Visual Regression Test
```typescript
// tests/visual/carbon-consistency.spec.ts
import { test, expect } from '@playwright/test'

test('Carbon components visual consistency', async ({ page }) => {
  await page.goto('/dashboard')

  // Wait for Carbon styles to load
  await page.waitForLoadState('networkidle')

  // Take full page screenshot
  await expect(page).toHaveScreenshot('dashboard-carbon.png', {
    fullPage: true,
    threshold: 0.2 // 20% threshold for changes
  })

  // Test responsive design
  await page.setViewportSize({ width: 768, height: 1024 })
  await expect(page).toHaveScreenshot('dashboard-carbon-tablet.png')

  await page.setViewportSize({ width: 375, height: 667 })
  await expect(page).toHaveScreenshot('dashboard-carbon-mobile.png')
})
```

## Component Migration (20 minutes)

### 1. Identify Components to Migrate
```bash
# Find custom components that need Carbon conversion
find src -name "*.svelte" -exec grep -l "class=" {} \; | head -10
```

### 2. Create Migration Checklist
- [ ] Replace custom buttons with Carbon Button
- [ ] Convert forms to Carbon form components
- [ ] Update tables to use CarbonDataTable
- [ ] Replace custom modals with Carbon Modal
- [ ] Update navigation with Carbon HeaderNav
- [ ] Convert cards to Carbon Tile components

### 3. Example: Button Migration
```svelte
<!-- Before: Custom button -->
<button class="btn btn-primary" on:click={handleClick}>
  {label}
</button>

<!-- After: Carbon button -->
<script>
  import { Button } from 'carbon-components-svelte'
</script>

<Button kind="primary" on:click={handleClick}>
  {label}
</Button>
```

### 4. Validate Migration
```typescript
// tests/integration/component-migration.spec.ts
test('Migrated components maintain functionality', async ({ page }) => {
  await page.goto('/dashboard')

  // Test button functionality
  const carbonButton = page.getByRole('button', { name: 'Get Started' })
  await expect(carbonButton).toBeVisible()
  await carbonButton.click()

  // Verify Carbon classes are applied
  const buttonClasses = await carbonButton.getAttribute('class')
  expect(buttonClasses).toContain('bx--btn')
})
```

## Testing Strategy (10 minutes)

### 1. Unit Tests for Components
```typescript
// src/lib/components/__tests__/CarbonButton.test.ts
import { render, screen } from '@testing-library/svelte'
import { describe, it, expect } from 'vitest'
import CarbonButton from '../CarbonButton.svelte'

describe('CarbonButton', () => {
  it('renders with correct Carbon classes', () => {
    render(CarbonButton, { props: { variant: 'primary' } })

    const button = screen.getByRole('button')
    expect(button).toHaveClass('bx--btn', 'bx--btn--primary')
  })

  it('supports accessibility attributes', () => {
    render(CarbonButton, {
      props: { 'aria-label': 'Save document' }
    })

    const button = screen.getByRole('button')
    expect(button).toHaveAttribute('aria-label', 'Save document')
  })
})
```

### 2. Integration Tests
```typescript
// tests/integration/carbon-integration.spec.ts
test('Carbon components work together', async ({ page }) => {
  await page.goto('/dashboard')

  // Test form submission with Carbon components
  await page.getByRole('textbox', { name: 'Search' }).fill('test query')
  await page.getByRole('button', { name: 'Search' }).click()

  // Verify results display in Carbon DataTable
  const table = page.getByRole('table')
  await expect(table).toBeVisible()

  // Check Carbon table classes
  const tableClasses = await table.getAttribute('class')
  expect(tableClasses).toContain('bx--data-table')
})
```

## Validation Checklist

### Functional Requirements
- [ ] **FR-001**: Consistent visual design language implemented ✓
- [ ] **FR-002**: WCAG 2.1 AA accessibility standards met ✓
- [ ] **FR-003**: Typography, spacing, and colors consistent ✓
- [ ] **FR-004**: Responsive layouts adapt properly ✓
- [ ] **FR-005**: Keyboard navigation functional ✓
- [ ] **FR-006**: Form patterns consistent ✓
- [ ] **FR-007**: Loading/error states consistent ✓
- [ ] **FR-008**: Navigation patterns consistent ✓
- [ ] **FR-009**: Data display patterns consistent ✓
- [ ] **FR-010**: Screen reader support functional ✓

### Performance Requirements
- [ ] **PR-001**: CSS bundle < 50KB gzipped ✓
- [ ] **PR-002**: First paint < 100ms ✓
- [ ] **PR-003**: Interaction response < 200ms ✓

### Accessibility Requirements
- [ ] **AR-001**: Keyboard navigation working ✓
- [ ] **AR-002**: Focus indicators visible ✓
- [ ] **AR-003**: Contrast ratios ≥ 4.5:1 ✓
- [ ] **AR-004**: Skip links functional ✓
- [ ] **AR-005**: Form labels descriptive ✓
- [ ] **AR-006**: Dynamic content announced ✓

## Common Issues and Solutions

### Issue: Carbon styles not loading
**Solution**: Verify CSS import order and preprocessor configuration
```css
/* Ensure Carbon CSS is imported first */
@import 'carbon-components-svelte/css/white.css';
/* Then your custom styles */
@import './custom-styles.css';
```

### Issue: TypeScript errors with Carbon components
**Solution**: Install and configure Carbon TypeScript definitions
```bash
npm install -D @carbon/type
```

### Issue: Bundle size too large
**Solution**: Enable tree-shaking and component importing
```typescript
// Import specific components instead of entire library
import { Button } from 'carbon-components-svelte'
// Instead of: import * as Carbon from 'carbon-components-svelte'
```

### Issue: Accessibility violations
**Solution**: Use built-in Carbon accessibility features
```svelte
<!-- Always provide proper labels -->
<Button iconDescription="Save document" kind="primary">
  Save
</Button>

<!-- Use semantic HTML -->
<main role="main">
  <h1>Page Title</h1>
  <!-- Content -->
</main>
```

## Success Metrics

### Immediate Validation (after implementation)
- All pages load without Console errors: ✓/✗
- Accessibility tests pass: ✓/✗
- Visual regression tests pass: ✓/✗
- Performance budgets met: ✓/✗

### User Experience Validation (after deployment)
- Task completion time reduced by >20%: ⏱️
- User satisfaction increased: 📊
- Training time for new users reduced by >50%: 📚
- Support tickets decreased: 📉

## Next Steps

1. **Complete Implementation**: Follow task list from `/tasks` command
2. **Conduct User Testing**: Test with actual HR users
3. **Performance Monitoring**: Set up continuous performance monitoring
4. **Documentation**: Create component usage guidelines
5. **Training**: Develop user training materials

## Support Resources

- [Carbon Design System Documentation](https://carbondesignsystem.com/)
- [Carbon Components Svelte](https://carbon-components-svelte.onrender.com/)
- [WCAG 2.1 Guidelines](https://www.w3.org/WAI/WCAG21/quickref/)
- [Accessibility Testing Tools](https://www.deque.com/axe/)

---

**Quickstart Complete**: Ready for full implementation and testing
**Estimated Time**: 65 minutes for complete setup and validation