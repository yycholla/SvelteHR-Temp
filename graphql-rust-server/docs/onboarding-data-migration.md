# Onboarding Data Migration Guide

## Overview

This document describes the data migration from the old ContentBlocks-based onboarding system to the new Forms-based architecture.

## Migration: m20251203_001_migrate_content_blocks_to_forms

### Purpose

Converts existing `onboarding_content_blocks` to the new Forms architecture (`onboarding_forms` and `onboarding_form_blocks`), while preserving all user progress data.

### What the Migration Does

1. **Groups ContentBlocks into Forms**
   - For each onboarding module with existing content blocks:
   - Creates forms containing 4 blocks each (configurable via `BLOCKS_PER_FORM` constant)
   - Maintains the original sequence order of blocks
   - Names forms based on the first block's title, with part numbers if multiple forms are created

2. **Converts ContentBlocks to FormBlocks**
   - Maps old `onboarding_content_blocks` to new `onboarding_form_blocks`
   - Type mapping:
     - `FORM` → `FORM_FIELDS` (renamed for clarity)
     - All other types remain the same: `TEXT`, `DOCUMENT`, `FILE_UPLOAD`, `SIGNATURE`
   - Preserves all block content: text, document URLs, form template IDs, file/signature requirements

3. **Migrates Progress Data**
   - Converts individual block progress (`onboarding_progress`) to form-level progress (`onboarding_form_progress`)
   - Progress status mapping:
     - `COMPLETED` block → `COMPLETED` form (takes precedence)
     - `IN_PROGRESS` block → `IN_PROGRESS` form (if form not already `COMPLETED`)
     - `NOT_STARTED` block → `NOT_STARTED` form (default)
   - Preserves `started_at` and `completed_at` timestamps
   - If multiple blocks in a form have different statuses, the most complete status wins

### Migration Configuration

The migration can be configured by editing the `BLOCKS_PER_FORM` constant in the migration file:

```rust
const BLOCKS_PER_FORM: usize = 4; // Adjust this value to change grouping
```

**Recommended values:**

- `3-4 blocks`: Best for focused, digestible forms
- `5-6 blocks`: Good for comprehensive onboarding modules with related content
- `1 block`: Creates one form per block (1:1 mapping) - use only for very simple modules

## Running the Migration

### Prerequisites

- All previous migrations must be applied
- Database backup recommended before running
- Ensure the Forms architecture tables exist (migration m20251202_007)

### Apply the Migration

```bash
cd graphql-rust-server
cargo run --bin migration up
```

This will:

1. Apply migration m20251203_001 if not already applied
2. Convert all existing ContentBlocks to Forms
3. Migrate all progress data
4. Add a comment to the `onboarding_forms` table indicating successful migration

### Check Migration Status

```bash
cargo run --bin migration status
```

Expected output:

```
Applied at           Migration
2025-12-03 ...       m20251203_001_migrate_content_blocks_to_forms
```

## Rollback (if needed)

⚠️ **WARNING**: Rolling back this migration will **delete all migrated forms and form progress**. Only use this if you need to completely revert to the ContentBlocks system.

```bash
cargo run --bin migration down
```

This will:

1. Delete all `onboarding_form_progress` records created during migration
2. Delete all `onboarding_form_blocks` from migrated forms
3. Delete all `onboarding_forms` where `description = 'Migrated from content blocks'`
4. Preserve all original `onboarding_content_blocks` data (these are never deleted)

## Verification

After running the migration, verify the results:

### 1. Check Form Creation

```sql
SELECT
    f.id,
    f.title,
    f.onboarding_module_id,
    f.sequence_order,
    COUNT(fb.id) as block_count
FROM hr_public.onboarding_forms f
LEFT JOIN hr_public.onboarding_form_blocks fb ON f.id = fb.onboarding_form_id
WHERE f.description = 'Migrated from content blocks'
GROUP BY f.id, f.title, f.onboarding_module_id, f.sequence_order
ORDER BY f.onboarding_module_id, f.sequence_order;
```

Expected: Forms grouped by module with ~4 blocks each (or your configured value)

### 2. Check Block Conversion

```sql
SELECT
    type,
    COUNT(*) as count
FROM hr_public.onboarding_form_blocks fb
JOIN hr_public.onboarding_forms f ON fb.onboarding_form_id = f.id
WHERE f.description = 'Migrated from content blocks'
GROUP BY type
ORDER BY count DESC;
```

Expected: Block types should match original ContentBlocks (with `FORM` → `FORM_FIELDS` mapping)

### 3. Check Progress Migration

```sql
-- Compare old vs new progress counts
SELECT
    'ContentBlocks Progress' as type,
    COUNT(*) as count
FROM hr_public.onboarding_progress
UNION ALL
SELECT
    'Forms Progress' as type,
    COUNT(*) as count
FROM hr_public.onboarding_form_progress fp
JOIN hr_public.onboarding_forms f ON fp.onboarding_form_id = f.id
WHERE f.description = 'Migrated from content blocks';
```

Expected: Forms Progress count should be less than ContentBlocks Progress (due to grouping multiple blocks into forms)

### 4. Verify User Progress Status

```sql
-- Check that completed progress was preserved
SELECT
    fp.user_id,
    f.title as form_title,
    fp.status,
    fp.started_at,
    fp.completed_at
FROM hr_public.onboarding_form_progress fp
JOIN hr_public.onboarding_forms f ON fp.onboarding_form_id = f.id
WHERE f.description = 'Migrated from content blocks'
  AND fp.status = 'COMPLETED'
ORDER BY fp.user_id, f.sequence_order
LIMIT 10;
```

Expected: Completed forms should have `completed_at` timestamps from original progress

## Post-Migration Tasks

### 1. Review Form Titles

Migrated forms use the first block's title with "Part N -" prefix. You may want to rename these for clarity:

```sql
-- Example: Update form titles
UPDATE hr_public.onboarding_forms
SET title = 'Welcome & Company Overview',
    description = 'Introduction to the company'
WHERE id = 'your-form-id';
```

### 2. Adjust Form Grouping (Optional)

If the automated 4-block grouping doesn't work well for your content, you can:

1. Manually regroup blocks by updating `onboarding_form_id`:

```sql
-- Move block to different form
UPDATE hr_public.onboarding_form_blocks
SET onboarding_form_id = 'new-form-id',
    sequence_order = 0
WHERE id = 'block-id';
```

2. Update sequence orders to maintain proper ordering
3. Use the Form Builder UI to adjust forms going forward

### 3. Test Onboarding Flow

1. Navigate to `/dashboard/onboarding` as an employee
2. Verify forms display correctly with all blocks
3. Test "Save Progress" and "Complete & Continue" functionality
4. Verify progress persistence across sessions

### 4. Admin Testing

1. Navigate to `/dashboard/admin/onboarding/[id]` as an admin
2. Click "Manage Forms"
3. Verify forms and blocks are displayed correctly
4. Test editing forms and blocks
5. Test creating new forms

## Architecture Benefits

The new Forms-based system provides several advantages:

1. **Better Navigation**: Users navigate by forms (logical groups) instead of individual blocks
2. **Efficient Progress Tracking**: One progress record per form instead of per block
3. **Improved UX**: All blocks in a form displayed together for context
4. **Flexible Grouping**: Admins can create meaningful form groupings
5. **Backward Compatible**: Old ContentBlocks system still works during transition

## Migration Strategy Notes

### Why 4 Blocks Per Form?

Research shows that:

- 3-5 items per page is ideal for user comprehension
- Too few blocks = excessive clicking
- Too many blocks = overwhelming content

You can adjust `BLOCKS_PER_FORM` in the migration file if different grouping works better for your organization.

### Progress Status Priority

When multiple blocks in a form have different progress statuses, the migration uses this priority:

1. **COMPLETED** (highest priority) - If any block is completed, the form is marked completed
2. **IN_PROGRESS** - If no blocks are completed but at least one is in progress
3. **NOT_STARTED** (default) - If all blocks are not started

This ensures users don't lose progress while migrating to the new system.

### Timestamp Preservation

The migration preserves:

- `started_at`: Uses the earliest `started_at` from any block in the form
- `completed_at`: Uses the latest `completed_at` from completed blocks

This accurately reflects when users first started and last completed content in each form.

## Troubleshooting

### Migration Fails with SQL Error

1. Check that all previous migrations are applied: `cargo run --bin migration status`
2. Verify the database connection is working
3. Check the migration logs for specific SQL errors
4. Ensure no forms exist with `description = 'Migrated from content blocks'` (indicates partial migration)

### Duplicate Form Progress Error

This occurs if the migration is run multiple times. To fix:

```sql
-- Delete duplicate form progress
DELETE FROM hr_public.onboarding_form_progress
WHERE id NOT IN (
    SELECT MIN(id)
    FROM hr_public.onboarding_form_progress
    GROUP BY user_id, onboarding_form_id
);
```

### Missing Progress After Migration

Check if the progress was successfully migrated:

```sql
-- Find missing progress
SELECT DISTINCT op.user_id, op.content_block_id
FROM hr_public.onboarding_progress op
LEFT JOIN hr_public.onboarding_form_blocks fb ON fb.id = op.content_block_id  -- This won't work directly
WHERE NOT EXISTS (
    SELECT 1 FROM hr_public.onboarding_form_progress fp
    WHERE fp.user_id = op.user_id
);
```

If progress is missing, the migration may have failed partially. Run the rollback and re-apply:

```bash
cargo run --bin migration down
cargo run --bin migration up
```

## Future Enhancements

Potential improvements to consider:

1. **Smart Grouping**: Group blocks by content type or tags instead of fixed count
2. **Preserve Original Blocks**: Option to keep ContentBlocks as a backup
3. **Custom Form Templates**: Allow admins to define grouping rules per module
4. **Partial Migration**: Migrate specific modules instead of all at once
5. **Progress Reconciliation**: More sophisticated progress merging logic

## Support

For issues or questions about the migration:

1. Check this documentation
2. Review the migration source code: `migration/m20251203_001_migrate_content_blocks_to_forms.rs`
3. Contact the development team
4. File an issue in the project repository
