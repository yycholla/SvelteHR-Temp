# Onboarding Forms E2E Test Suite

Comprehensive end-to-end tests for the Forms-based onboarding architecture.

## Test Coverage

### 1. Admin Forms Management (`admin/onboarding-forms-management.spec.ts`)

**Purpose**: Test CRUD operations for onboarding forms within modules

**Test Cases** (12 tests):

- ✅ Display Forms management page
- ✅ Create a new form
- ✅ Edit an existing form
- ✅ Reorder forms using up/down buttons
- ✅ Delete a form with confirmation
- ✅ Cancel form deletion
- ✅ Navigate to Form Builder via "Edit Blocks" button
- ✅ Show required indicator for required forms
- ✅ Display form sequence order
- ✅ Validate form creation with empty title
- ✅ Close form dialog on cancel

**Key Features Tested**:

- Form CRUD operations
- Form reordering
- Validation
- Navigation to Form Builder
- Required form indicators

---

### 2. Admin Form Builder (`admin/form-builder.spec.ts`)

**Purpose**: Test block management (CRUD, reordering) within forms

**Test Cases** (20 tests):

- ✅ Display Form Builder interface
- ✅ Create TEXT block
- ✅ Create FORM_FIELDS block
- ✅ Create DOCUMENT block
- ✅ Create FILE_UPLOAD block
- ✅ Create SIGNATURE block
- ✅ Create CHECKBOX block
- ✅ Edit an existing block
- ✅ Reorder blocks using up/down buttons
- ✅ Delete a block with confirmation
- ✅ Toggle preview mode
- ✅ Update form metadata
- ✅ Display block type icons
- ✅ Validate block creation with empty title
- ✅ Close block dialog on cancel
- ✅ Show block sequence numbers

**Key Features Tested**:

- All 6 block types (TEXT, FORM_FIELDS, DOCUMENT, FILE_UPLOAD, SIGNATURE, CHECKBOX)
- Block CRUD operations
- Block reordering
- Preview mode
- Form metadata editing
- Validation

---

### 3. Employee Onboarding Completion (`employee/onboarding-forms-completion.spec.ts`)

**Purpose**: Test form navigation, progress tracking, and completion flow

**Test Cases** (20 tests):

- ✅ Display onboarding module with forms navigation
- ✅ Show all forms in navigation sidebar
- ✅ Display current form with all blocks
- ✅ Render TEXT block correctly
- ✅ Render DOCUMENT block correctly
- ✅ Render FORM_FIELDS block with form inputs
- ✅ Render CHECKBOX block with checkbox list
- ✅ Render SIGNATURE block with signature canvas
- ✅ Render FILE_UPLOAD block with file input
- ✅ Save progress when clicking "Save Progress" button
- ✅ Navigate to next form using "Complete & Continue" button
- ✅ Navigate to previous form using "Previous" button
- ✅ Jump to specific form using sidebar navigation
- ✅ Update progress bar as forms are completed
- ✅ Show completion status icons in sidebar
- ✅ Show celebration message on final form completion
- ✅ Redirect to dashboard after completing all forms
- ✅ Persist form data across navigation
- ✅ Show required field indicators
- ✅ Disable "Complete & Continue" if required fields are empty

**Key Features Tested**:

- Form-based navigation (not block-based)
- All block types rendering
- Progress tracking
- Form completion flow
- Data persistence during navigation
- Celebration on completion

---

### 4. Form Progress Persistence (`employee/onboarding-progress-persistence.spec.ts`)

**Purpose**: Test that form data persists across sessions, page reloads, and navigation

**Test Cases** (17 tests):

- ✅ Persist text input data after save and reload
- ✅ Persist checkbox states after save and reload
- ✅ Persist textarea data after save and reload
- ✅ Persist select/dropdown selection after save and reload
- ✅ Persist radio button selection after save and reload
- ✅ Persist data when navigating between forms
- ✅ Preserve form status (NOT_STARTED, IN_PROGRESS, COMPLETED)
- ✅ Update completed_at timestamp when form is completed
- ✅ Preserve started_at timestamp across sessions
- ✅ Auto-save form data periodically (if feature exists)
- ✅ Handle concurrent saves (prevent race conditions)
- ✅ Restore form data to last saved state on cancel
- ✅ Save JSONB form data with complex structure
- ✅ Show last saved timestamp
- ✅ Handle network errors gracefully during save

**Key Features Tested**:

- Data persistence across page reloads
- Data persistence across browser sessions
- Data persistence during navigation
- Status tracking (NOT_STARTED, IN_PROGRESS, COMPLETED)
- Timestamp preservation
- JSONB storage
- Error handling

---

### 5. Form Validation (`employee/onboarding-form-validation.spec.ts`)

**Purpose**: Test input validation, error messages, and form submission rules

**Test Cases** (25 tests):

- ✅ Validate required text fields
- ✅ Validate email format
- ✅ Validate phone number format
- ✅ Validate number range
- ✅ Validate text length (maxlength)
- ✅ Validate required checkboxes in CHECKBOX block
- ✅ Validate file upload size limit
- ✅ Validate file upload type restrictions
- ✅ Validate required signature
- ✅ Prevent form completion with validation errors
- ✅ Show validation summary with all errors
- ✅ Validate date fields (min/max dates)
- ✅ Validate SSN format (if applicable)
- ✅ Validate address fields completeness
- ✅ Validate custom regex patterns
- ✅ Show inline validation errors as user types
- ✅ Clear validation errors when field becomes valid
- ✅ Validate form on save progress (soft validation)
- ✅ Prevent form completion with invalid data (hard validation)
- ✅ Highlight fields with validation errors
- ✅ Scroll to first validation error

**Key Features Tested**:

- Field-level validation (required, format, range, length)
- Block-level validation (checkboxes, signatures, file uploads)
- Form-level validation
- Soft vs hard validation
- Error display and clearing
- User experience (highlighting, scrolling, inline errors)

---

## Running the Tests

### Prerequisites

1. Ensure the GraphQL backend is running
2. Ensure the SvelteKit dev server is running
3. Database should have test data (onboarding modules with forms)

### Run All Onboarding Forms Tests

```bash
# Run all e2e tests
npm run test:e2e

# Run only onboarding forms tests
npx playwright test tests/e2e/admin/onboarding-forms-management.spec.ts
npx playwright test tests/e2e/admin/form-builder.spec.ts
npx playwright test tests/e2e/employee/onboarding-forms-completion.spec.ts
npx playwright test tests/e2e/employee/onboarding-progress-persistence.spec.ts
npx playwright test tests/e2e/employee/onboarding-form-validation.spec.ts

# Run with UI (interactive mode)
npx playwright test --ui

# Run in headed mode (see browser)
npx playwright test --headed

# Run specific test file
npx playwright test tests/e2e/admin/onboarding-forms-management.spec.ts

# Run specific test
npx playwright test -g "should create a new form"
```

### Debug Tests

```bash
# Debug mode
npx playwright test --debug

# Debug specific test
npx playwright test --debug -g "should save progress"

# Generate test report
npx playwright show-report
```

### Test Configuration

Tests are configured in `playwright.config.ts` with:

- **Browsers**: Chromium, Firefox, WebKit
- **Timeout**: 30 seconds per test
- **Retries**: 2 retries on CI, 0 locally
- **Base URL**: http://localhost:5173

## Test Data Requirements

### Required Test Users

```typescript
// Admin user (for admin tests)
{
  email: 'admin@example.com',
  password: 'admin',
  role: 'Admin'
}

// Employee user (for employee tests)
{
  email: 'employee@example.com',
  password: 'password',
  role: 'Employee'
}
```

### Required Test Data

1. **Onboarding Module** with:
   - At least 2 forms
   - Forms with various block types
   - Both required and optional forms

2. **Form Templates** (for FORM_FIELDS blocks):
   - At least 1 form template with multiple fields
   - Field types: TEXT, EMAIL, PHONE, DATE, etc.

3. **User Assignment**:
   - Employee should be assigned to an onboarding module
   - Module should be in "active" status

## Test Data Attributes

The tests rely on `data-testid` attributes in the UI components. Ensure these are present:

### Admin Forms Management

- `forms-list`
- `form-card-{id}`
- `form-title-{id}`
- `edit-form-{id}`
- `delete-form-{id}`
- `move-form-up-{id}`
- `move-form-down-{id}`
- `edit-blocks-{id}`
- `form-dialog`
- `form-title-input`
- `form-description-input`
- `form-required-checkbox`
- `save-form-button`
- `cancel-form-button`

### Form Builder

- `blocks-list`
- `block-card-{id}`
- `block-title-{id}`
- `edit-block-{id}`
- `delete-block-{id}`
- `move-block-up-{id}`
- `move-block-down-{id}`
- `block-dialog`
- `block-type-{TYPE}`
- `block-title-input`
- `block-text-content`
- `form-template-select`
- `block-document-url`
- `save-block-button`
- `cancel-block-button`
- `preview-container`

### Employee Onboarding

- `forms-navigation`
- `nav-form-{index}`
- `form-step-number`
- `form-status-icon`
- `status-completed`
- `status-in-progress`
- `form-content`
- `current-form-title`
- `current-form-step-badge`
- `block-container-{id}`
- `block-TEXT-{id}`
- `block-DOCUMENT-{id}`
- `block-FORM_FIELDS-{id}`
- `block-CHECKBOX-{id}`
- `block-SIGNATURE-{id}`
- `block-FILE_UPLOAD-{id}`
- `save-progress-button`
- `complete-form-button`
- `complete-onboarding-button`
- `previous-form-button`
- `progress-bar`

## CI/CD Integration

These tests can be integrated into CI/CD pipelines:

```yaml
# Example GitHub Actions workflow
name: E2E Tests
on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '20'
      - run: npm ci
      - run: npx playwright install
      - run: npm run test:e2e
      - uses: actions/upload-artifact@v3
        if: always()
        with:
          name: playwright-report
          path: playwright-report/
```

## Coverage Metrics

**Total Tests**: 94 test cases

**Coverage by Category**:

- Admin Features: 32 tests (34%)
- Employee Features: 62 tests (66%)

**Coverage by Functionality**:

- CRUD Operations: 20 tests
- Block Management: 16 tests
- Navigation & Flow: 18 tests
- Data Persistence: 17 tests
- Validation: 23 tests

## Maintenance Guidelines

### Adding New Tests

1. Create test file in appropriate directory (`admin/` or `employee/`)
2. Use existing test patterns for consistency
3. Add `data-testid` attributes to new UI components
4. Document new tests in this README
5. Ensure tests are independent and can run in any order

### Updating Tests

1. Update test if UI components change
2. Update `data-testid` attributes if selectors change
3. Update this README with changes
4. Run full test suite to ensure no regressions

### Best Practices

- **Independence**: Each test should be independent
- **Cleanup**: Tests should clean up after themselves
- **Specificity**: Use specific selectors (`data-testid` > CSS selectors)
- **Assertions**: Use meaningful assertions with clear error messages
- **Waits**: Use explicit waits (`waitForSelector`) over arbitrary timeouts
- **Data**: Use realistic test data, not placeholders

## Troubleshooting

### Common Issues

**Issue**: Tests fail with timeout errors
**Solution**: Increase timeout in test configuration or check if server is running

**Issue**: Element not found errors
**Solution**: Verify `data-testid` attributes exist in UI components

**Issue**: Tests pass locally but fail in CI
**Solution**: Check CI environment (database, test data, environment variables)

**Issue**: Flaky tests
**Solution**: Add explicit waits, check for race conditions, ensure test independence

## Future Enhancements

- [ ] Add visual regression testing
- [ ] Add accessibility testing (axe-core)
- [ ] Add performance testing (Lighthouse)
- [ ] Add API contract testing
- [ ] Add cross-browser testing matrix
- [ ] Add mobile viewport testing
- [ ] Add test data seeding scripts
- [ ] Add test coverage reporting

## Resources

- [Playwright Documentation](https://playwright.dev/)
- [SvelteKit Testing Guide](https://kit.svelte.dev/docs/testing)
- [Test Best Practices](https://playwright.dev/docs/best-practices)
