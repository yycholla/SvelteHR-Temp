# E2E Test Suite Audit & Updates

## Overview

This document tracks the status of E2E tests and the updates needed to align tests with the current application state.

**Last Updated**: 2025-12-03

---

## Test Suite Status

### ✅ Completed Updates

#### 1. Employee Onboarding Page (`/dashboard/onboarding/[id]/+page.svelte`)

**File**: `src/routes/dashboard/onboarding/[id]/+page.svelte`

**Added data-testid Attributes**:

| Element | data-testid | Line | Purpose |
|---------|-------------|------|---------|
| Forms Navigation Container | `forms-navigation` | 219 | Navigation sidebar container |
| Form Navigation Item | `nav-form-{index}` | 222 | Individual form in sidebar |
| Form Step Number | `form-step-number` | 237 | "Step X" label |
| Form Title (nav) | `form-title` | 238 | Form title in navigation |
| Form Status Icon Container | `form-status-icon` | 240 | Container for status icon |
| Status: Completed | `status-completed` | 230 | Completed form icon |
| Status: In Progress | `status-in-progress` | 232 | In-progress form icon |
| Status: Not Started | `status-not-started` | 234 | Not started icon |
| Form Content Container | `form-content` | 251 | Main form content area |
| Current Form Step Badge | `current-form-step-badge` | 255 | "Step X of Y" badge |
| Current Form Title | `current-form-title` | 256 | Main form title |
| Current Form Description | `current-form-description` | 258 | Form description text |
| Required Field Badge | `required-field` | 262 | "Required" badge |
| Block Container | `block-container-{block.id}` | 270 | Individual block container |
| Block Title | `block-title-{block.id}` | 274 | Block title |
| TEXT Block | `block-TEXT-{block.id}` | 280 | TEXT type block |
| Text Content | `text-content` | 281 | Actual text content |
| DOCUMENT Block | `block-DOCUMENT-{block.id}` | 287 | DOCUMENT type block |
| FORM_FIELDS Block | `block-FORM_FIELDS-{block.id}` | 304 | FORM_FIELDS type block |
| CHECKBOX Block | `block-CHECKBOX-{block.id}` | 330 | CHECKBOX type block |
| SIGNATURE Block | `block-SIGNATURE-{block.id}` | 350 | SIGNATURE type block |
| Signature Field | `signature-field` | 351 | Signature canvas wrapper |
| FILE_UPLOAD Block | `block-FILE_UPLOAD-{block.id}` | 361 | FILE_UPLOAD type block |
| File Size Limit | `file-size-limit` | 368 | File size limit text |
| Accepted File Types | `accepted-file-types` | 373 | Accepted types text |
| Progress Bar | `progress-bar` | 205 | Onboarding progress bar |
| Completed Forms Count | `completed-forms-count` | 207 | Number of completed forms |
| Total Forms Count | `total-forms-count` | 207 | Total forms in module |
| Previous Button | `previous-form-button` | 388 | Navigate to previous form |
| Save Progress Button | `save-progress-button` | 399 | Save current progress |
| Complete Form Button | `complete-form-button` | 406 | Complete & continue button |
| Complete Onboarding Button | `complete-onboarding-button` | 411 | Final completion button |

---

## ⏳ Pending Updates

### 2. Admin Forms Management Page

**Files to Update**:
- `src/routes/dashboard/admin/onboarding/[id]/forms/+page.svelte`

**Required data-testid Attributes**:
- `forms-list` - Forms list container
- `form-card-{id}` - Individual form cards
- `form-title-{id}` - Form titles
- `edit-form-{id}` - Edit form buttons
- `delete-form-{id}` - Delete form buttons
- `move-form-up-{id}` - Move up buttons
- `move-form-down-{id}` - Move down buttons
- `edit-blocks-{id}` - Navigate to form builder
- `form-dialog` - Form create/edit dialog
- `form-title-input` - Form title input
- `form-description-input` - Form description input
- `form-required-checkbox` - Required checkbox
- `save-form-button` - Save form button
- `cancel-form-button` - Cancel button

**Status**: ⏳ Not started

---

### 3. Admin Form Builder Page

**Files to Update**:
- `src/routes/dashboard/admin/forms/[id]/+page.svelte`

**Required data-testid Attributes**:
- `blocks-list` - Blocks list container
- `block-card-{id}` - Individual block cards
- `block-title-{id}` - Block titles
- `edit-block-{id}` - Edit block buttons
- `delete-block-{id}` - Delete block buttons
- `move-block-up-{id}` - Move up buttons
- `move-block-down-{id}` - Move down buttons
- `block-dialog` - Block create/edit dialog
- `block-type-{TYPE}` - Block type selectors (TEXT, FORM_FIELDS, etc.)
- `block-title-input` - Block title input
- `block-text-content` - Text content textarea
- `form-template-select` - Form template dropdown
- `block-document-url` - Document URL input
- `save-block-button` - Save block button
- `cancel-block-button` - Cancel button
- `preview-container` - Preview mode container

**Status**: ⏳ Not started

---

### 4. Login Page

**Files to Update**:
- `src/routes/login/+page.svelte`

**Required data-testid Attributes**:
- `email-input` - Email input field
- `password-input` - Password input field
- `login-button` - Login submit button

**Status**: ✅ Likely already exists (tests reference these)

---

### 5. Onboarding Module List Page

**Files to Update**:
- `src/routes/dashboard/onboarding/+page.svelte`

**Required data-testid Attributes**:
- `onboarding-module-{id}` - Module cards

**Status**: ⏳ Needs verification

---

## Test Files Created

### New E2E Test Files (2025-12-02)

1. **`tests/e2e/admin/onboarding-forms-management.spec.ts`**
   - 12 test cases
   - Tests admin CRUD operations for forms
   - **Status**: ✅ Created, ⏳ Awaiting component updates

2. **`tests/e2e/admin/form-builder.spec.ts`**
   - 20 test cases
   - Tests block management and preview
   - **Status**: ✅ Created, ⏳ Awaiting component updates

3. **`tests/e2e/employee/onboarding-forms-completion.spec.ts`**
   - 20 test cases
   - Tests employee onboarding flow
   - **Status**: ✅ Created, ✅ Component updated

4. **`tests/e2e/employee/onboarding-progress-persistence.spec.ts`**
   - 17 test cases
   - Tests data persistence across sessions
   - **Status**: ✅ Created, ✅ Component updated

5. **`tests/e2e/employee/onboarding-form-validation.spec.ts`**
   - 25 test cases
   - Tests form validation and error handling
   - **Status**: ✅ Created, ✅ Component updated

6. **`tests/e2e/ONBOARDING_FORMS_TESTS_README.md`**
   - Complete test documentation
   - **Status**: ✅ Created

**Total**: 94 test cases created

---

## Database Schema Requirements

### Required Tables & Data

For the onboarding forms E2E tests to work, the following database setup is required:

#### 1. Onboarding Modules
```sql
-- Table: hr_public.onboarding_modules
-- Required fields: id, title, description, status
-- Test data: At least 1 active module
```

#### 2. Onboarding Forms
```sql
-- Table: hr_public.onboarding_forms
-- Required fields: id, onboarding_module_id, title, description, is_required, sequence_order
-- Test data: At least 2 forms per module
```

#### 3. Onboarding Blocks
```sql
-- Table: hr_public.onboarding_blocks
-- Required fields: id, onboarding_form_id, type, title, sequence_order, text_content, document_url, etc.
-- Test data: Multiple blocks of each type (TEXT, FORM_FIELDS, DOCUMENT, FILE_UPLOAD, SIGNATURE, CHECKBOX)
```

#### 4. Form Templates
```sql
-- Table: hr_public.form_templates
-- Required fields: id, template_name, fields (JSONB)
-- Test data: At least 1 template with multiple field types
```

#### 5. User Onboarding Progress
```sql
-- Table: hr_public.user_onboarding_progress
-- Required fields: user_id, onboarding_form_id, status, form_data, started_at, completed_at
```

#### 6. Test Users
```sql
-- Admin user: admin@example.com / admin
-- Employee user: employee@example.com / password
```

**Status**: ⏳ Needs verification and test data seeding

---

## GraphQL/API Requirements

### Required Operations

The following GraphQL operations or API endpoints must exist:

1. **Get Onboarding Module with Forms**
   - Query: Get module + forms + blocks + templates
   - Used by: Employee onboarding page

2. **Save Onboarding Progress**
   - Mutation: Save form data and status
   - Used by: "Save Progress" button

3. **Complete Onboarding Form**
   - Mutation: Mark form as completed
   - Used by: "Complete & Continue" button

4. **Get User's Onboarding Assignments**
   - Query: Get modules assigned to user
   - Used by: Onboarding list page

5. **Admin: CRUD Operations for Forms**
   - Create/Update/Delete forms
   - Reorder forms

6. **Admin: CRUD Operations for Blocks**
   - Create/Update/Delete blocks
   - Reorder blocks

**Status**: ⏳ Needs verification

---

## Backend Server (+page.server.ts) Requirements

### Employee Onboarding Page

**File**: `src/routes/dashboard/onboarding/[id]/+page.server.ts`

**Required Load Function**:
```typescript
export const load: PageServerLoad = async ({ params, locals }) => {
  const moduleId = params.id;

  return {
    module: /* onboarding module data */,
    forms: /* array of forms with blocks and progress */,
    formTemplates: /* Map of templates */,
    completedForms: /* count */,
    totalForms: /* count */
  };
};
```

**Required Actions**:
```typescript
export const actions = {
  saveProgress: async ({ request }) => {
    // Save formData to user_onboarding_progress
    // Update status to IN_PROGRESS
  },

  completeForm: async ({ request }) => {
    // Save formData
    // Update status to COMPLETED
    // Set completed_at timestamp
  }
};
```

**Status**: ⏳ Needs implementation verification

---

## Component Validation Requirements

### SignatureField Component

**Issue Found**: The onboarding page was using `bind:signatureData` but `SignatureField` expects `bind:value`.

**Fix Applied**: Updated to use correct props:
```svelte
<SignatureField
  name="signature-{block.id}"
  label={block.title || 'Signature'}
  bind:value={signatureData[block.id]}
  width={600}
  height={200}
  required={block.required || false}
/>
```

**Status**: ✅ Fixed

---

## Test Execution Issues

### Known Issues

1. **Permission Error** - `.svelte-kit/tsconfig.json`
   - **Error**: `EACCES: permission denied`
   - **Solution**: Rebuild SvelteKit with `npm run dev` or `npm run build`
   - **Status**: ⏳ Needs fix

2. **Backend Server Not Running**
   - **Error**: Tests fail if GraphQL backend not running
   - **Solution**: Ensure `graphql-rust-server` is running before E2E tests
   - **Status**: ✅ Fixed in CI workflow

3. **Test Data Missing**
   - **Error**: Tests expect specific test users and modules
   - **Solution**: Create test data seeding script
   - **Status**: ⏳ Needs creation

---

## Test Data Seeding

### Required Seed Script

Create a script to seed test data for E2E tests:

**File**: `scripts/test-db/seed-onboarding-test-data.sh`

**Requirements**:
1. Create admin user (admin@example.com)
2. Create employee user (employee@example.com)
3. Create 1 onboarding module ("New Employee Onboarding")
4. Create 3 forms in the module
5. Create blocks of each type in the forms
6. Create 1 form template with multiple field types
7. Assign module to employee user

**Status**: ⏳ Not created

---

## Running Tests Locally

### Prerequisites

1. ✅ Backend server running (`cd graphql-rust-server && cargo run`)
2. ⏳ Test data seeded
3. ✅ Frontend dev server running (`npm run dev`)
4. ✅ Playwright browsers installed (`npx playwright install`)

### Commands

```bash
# Run all onboarding E2E tests
npx playwright test tests/e2e/employee/
npx playwright test tests/e2e/admin/onboarding-forms-management.spec.ts
npx playwright test tests/e2e/admin/form-builder.spec.ts

# Run with UI
npx playwright test --ui

# Run specific test
npx playwright test -g "should save progress"

# Debug mode
npx playwright test --debug
```

---

## CI/CD Integration

### GitHub Actions Status

**Workflow**: `.github/workflows/ci.yml`

**E2E Test Job**: ✅ Configured with:
- PostgreSQL service container
- Backend server lifecycle management
- Frontend dev server
- Playwright browser installation
- Test execution
- Artifact uploads (reports, logs)

**Status**: ✅ Workflow updated and ready

---

## Next Steps

### Priority 1 - Critical for Tests to Run

1. ⏳ **Fix `.svelte-kit` permission issue**
   - Run `npm run dev` or `npm run build` to regenerate

2. ⏳ **Verify backend GraphQL operations exist**
   - Check mutations: `saveOnboardingProgress`, `completeOnboardingForm`
   - Check queries: `getOnboardingModule`, `getUserOnboardingAssignments`

3. ⏳ **Create test data seeding script**
   - Script to create required test users and modules
   - Add to CI workflow before E2E tests

4. ⏳ **Update admin pages with data-testid attributes**
   - Forms management page
   - Form builder page

### Priority 2 - Nice to Have

5. ⏳ **Add missing server-side actions**
   - Verify +page.server.ts has saveProgress and completeForm actions

6. ⏳ **Create validation tests**
   - Ensure validation rules work as expected

7. ⏳ **Add accessibility tests**
   - Keyboard navigation
   - Screen reader support

---

## Test Coverage Matrix

| Feature | Unit Tests | Integration Tests | E2E Tests | Status |
|---------|-----------|------------------|-----------|--------|
| Employee Onboarding Flow | ❌ | ❌ | ✅ | ⏳ Needs component updates |
| Forms Management (Admin) | ❌ | ❌ | ✅ | ⏳ Needs component updates |
| Form Builder (Admin) | ❌ | ❌ | ✅ | ⏳ Needs component updates |
| Progress Persistence | ❌ | ❌ | ✅ | ⏳ Needs backend verification |
| Form Validation | ❌ | ❌ | ✅ | ⏳ Needs backend verification |

---

## Documentation

### Related Documentation

- **Test Suite README**: `tests/e2e/ONBOARDING_FORMS_TESTS_README.md`
- **CI Workflow Changes**: `.github/workflows/CI_WORKFLOW_CHANGES.md`
- **Migration Guide**: `graphql-rust-server/docs/onboarding-data-migration.md`
- **Forms Architecture**: `graphql-rust-server/docs/onboarding-forms-architecture.md`

---

## Changelog

### 2025-12-03
- ✅ Added all required data-testid attributes to employee onboarding page
- ✅ Fixed SignatureField component prop usage
- ✅ Created this test audit document
- ✅ Updated CI workflow to support full-stack testing

### 2025-12-02
- ✅ Created 5 new E2E test files (94 test cases)
- ✅ Created comprehensive test documentation
- ✅ Completed data migration implementation

---

## Summary

**Total Test Files**: 5 files, 94 test cases
**Component Updates**: 1 of 3 completed (33%)
**Backend Readiness**: ⏳ Needs verification
**CI/CD Integration**: ✅ Complete
**Test Data**: ⏳ Needs creation

**Overall Status**: 🟡 In Progress - 40% Complete

The employee onboarding page has been fully updated with all required test IDs. Admin pages still need updates. Backend operations and test data seeding are pending verification/creation.
