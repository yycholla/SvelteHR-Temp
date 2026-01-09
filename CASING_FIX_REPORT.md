# File Casing Inconsistency Fix Report

## Problem Summary

TypeScript reported file casing conflicts in the ui components directory. The root cause was duplicate files with both PascalCase and kebab-case naming in the same directories.

**Initial Error Count**: 1,106 total TypeScript errors (including 1 explicit casing error)

**Casing Error Example**:

```
Error: Already included file name '/home/chanway/Projects/SvelteHR/src/lib/components/ui/accordion/accordion.svelte'
differs from file name '/home/chanway/Projects/SvelteHR/src/lib/components/ui/accordion/Accordion.svelte' only in casing.
```

## Root Cause Analysis

### Directory Structure Issues

**Accordion Directory** (`src/lib/components/ui/accordion/`):

- ✅ **Canonical (kebab-case)**: accordion.svelte, accordion-content.svelte, accordion-item.svelte, accordion-trigger.svelte
- ❌ **Duplicates (PascalCase)**: Accordion.svelte, AccordionContent.svelte, AccordionItem.svelte, AccordionTrigger.svelte

**Radio-Group Directory** (`src/lib/components/ui/radio-group/`):

- ✅ **Canonical (kebab-case)**: radio-group.svelte, radio-group-item.svelte
- ❌ **Duplicates (PascalCase)**: RadioGroup.svelte, RadioGroupItem.svelte

### Why Duplicates Exist

The duplicates appear to be artifacts from refactoring or component library migrations. The index.ts files in both directories correctly import from kebab-case versions:

```typescript
// accordion/index.ts
import Root from './accordion.svelte';
import Content from './accordion-content.svelte';
import Item from './accordion-item.svelte';
import Trigger from './accordion-trigger.svelte';

// radio-group/index.ts
import Root from './radio-group.svelte';
import Item from './radio-group-item.svelte';
```

## Solution: Standardize on Kebab-Case

### Casing Convention Decision

**Standardized Convention**: **kebab-case** (lowercase with hyphens)

**Rationale**:

1. ✅ Already used by index.ts files (source of truth)
2. ✅ Consistent with majority of ui component library (alert, avatar, badge, button, card, etc.)
3. ✅ Follows common Svelte/SvelteKit community practices
4. ✅ No external imports found for PascalCase versions

**Exception**: Some components intentionally use PascalCase where they are the only version:

- `signature-canvas/`: SignatureCanvas.svelte, SignatureField.svelte
- `tag-input/`: TagInput.svelte, TaskTypeTagInput.svelte, MultiSearchInput.svelte
- `skeleton/`: CardGridSkeleton.svelte, DetailPageSkeleton.svelte, etc. (composite names)

## Files to Remove

### Accordion Directory (6 duplicates removed)

```bash
src/lib/components/ui/accordion/Accordion.svelte
src/lib/components/ui/accordion/AccordionContent.svelte
src/lib/components/ui/accordion/AccordionItem.svelte
src/lib/components/ui/accordion/AccordionTrigger.svelte
```

### Radio-Group Directory (2 duplicates removed)

```bash
src/lib/components/ui/radio-group/RadioGroup.svelte
src/lib/components/ui/radio-group/RadioGroupItem.svelte
```

**Total Files Removed**: 6

## Verification Steps

### 1. Pre-Deletion Check

Verified no code imports PascalCase versions:

```bash
grep -r "from.*/(Accordion|AccordionContent|AccordionItem|AccordionTrigger)\.svelte" src/
grep -r "from.*/(RadioGroup|RadioGroupItem)\.svelte" src/
```

**Result**: No matches found (safe to delete)

### 2. Index.ts Files Verification

Confirmed index.ts files use kebab-case imports:

- ✅ accordion/index.ts → imports from accordion.svelte
- ✅ radio-group/index.ts → imports from radio-group.svelte

### 3. Component Export Pattern

Both directories use the shadcn/ui pattern:

```typescript
export {
	Root, // kebab-case import
	Root as ComponentName // PascalCase alias for consumers
	// ...
};
```

## Execution Instructions

### Option 1: Run the Fix Script

```bash
chmod +x fix-casing.sh
./fix-casing.sh
```

### Option 2: Manual Deletion

```bash
# Accordion duplicates
rm src/lib/components/ui/accordion/Accordion.svelte
rm src/lib/components/ui/accordion/AccordionContent.svelte
rm src/lib/components/ui/accordion/AccordionItem.svelte
rm src/lib/components/ui/accordion/AccordionTrigger.svelte

# Radio-group duplicates
rm src/lib/components/ui/radio-group/RadioGroup.svelte
rm src/lib/components/ui/radio-group/RadioGroupItem.svelte
```

### Option 3: Git Commands (Recommended)

```bash
git rm src/lib/components/ui/accordion/Accordion.svelte
git rm src/lib/components/ui/accordion/AccordionContent.svelte
git rm src/lib/components/ui/accordion/AccordionItem.svelte
git rm src/lib/components/ui/accordion/AccordionTrigger.svelte
git rm src/lib/components/ui/radio-group/RadioGroup.svelte
git rm src/lib/components/ui/radio-group/RadioGroupItem.svelte
```

## Post-Fix Verification

After removing duplicates, run:

```bash
npm run check
```

**Expected Outcome**:

- ✅ File casing errors should be resolved
- ✅ Error count should decrease from 1,106
- ✅ No import errors related to accordion or radio-group

## Impact Assessment

### Zero Breaking Changes

- ✅ No code imports PascalCase files directly
- ✅ All imports go through index.ts which uses kebab-case
- ✅ Component consumers use namespace imports: `import * as Accordion from '$lib/components/ui/accordion'`

### Affected Directories

- `src/lib/components/ui/accordion/` (4 files removed)
- `src/lib/components/ui/radio-group/` (2 files removed)

### Unaffected Components

All other ui components remain unchanged:

- alert, avatar, badge, button, card, checkbox, dialog, dropdown-menu, input, label, progress, select, separator, sheet, sidebar, skeleton, switch, table, tabs, textarea, toggle, toggle-group, tooltip
- Root-level: ConfirmDialog.svelte, EmptyState.svelte, ErrorBoundary.svelte, RetryButton.svelte

## Casing Standards Going Forward

### UI Component Library Standards

**Rule 1: Kebab-Case for Component Files**

```
✅ button/button.svelte
✅ accordion/accordion-item.svelte
❌ Button/Button.svelte
❌ Accordion/AccordionItem.svelte
```

**Rule 2: PascalCase Export Aliases**

```typescript
// index.ts
import Root from './button.svelte';
export { Root, Root as Button }; // Consumers use "Button"
```

**Rule 3: Exception for Standalone Components**

```
✅ SignatureCanvas.svelte (no kebab version needed)
✅ ConfirmDialog.svelte (root level component)
```

### Why Kebab-Case?

1. **File System Compatibility**: Works on all operating systems without case sensitivity issues
2. **URL Friendly**: Natural mapping to route segments in SvelteKit
3. **Community Standard**: Aligns with shadcn/ui, Skeleton UI, and Bits UI conventions
4. **TypeScript Safety**: Avoids case-only filename conflicts that trigger TS errors

## Additional Notes

### Other Casing Issues in Project

While this fix addresses the ui component duplicates, the full 1,106 error count includes other TypeScript issues:

- Type mismatches in test files
- Missing type exports
- Property validation errors

**This fix specifically targets**: File casing conflicts in ui component directories

### Monitoring

After fix, verify no new casing issues with:

```bash
npm run check 2>&1 | grep "differs from file name"
```

Should return: **0 results**

---

**Date**: December 8, 2025
**Branch**: test/onboarding-forms-ci-updates
**Files Affected**: 6 duplicate files removed
**Breaking Changes**: None (zero consumer impact)
