import { test, expect } from '@playwright/test';
import type { Page } from '@playwright/test';
import { setupAccessibilityTesting } from '../../../../tests/accessibility/setup.js';

/**
 * CarbonFormPattern Component Contract Tests
 *
 * Validates that the CarbonFormPattern component:
 * - Implements the expected TypeScript interface
 * - Provides dynamic form generation capabilities
 * - Handles comprehensive validation correctly
 * - Integrates properly with Carbon Design System
 * - Dispatches events correctly
 * - Supports multiple field types and layouts
 */

// Define the expected component interface
interface CarbonFormPatternProps {
  title?: string;
  subtitle?: string;
  fields: FormField[];
  submitText?: string;
  cancelText?: string;
  loading?: boolean;
  disabled?: boolean;
  layout?: 'vertical' | 'horizontal' | 'grid';
  columns?: 1 | 2 | 3;
  validationMode?: 'onChange' | 'onBlur' | 'onSubmit';
  showValidationSummary?: boolean;
  accessibility?: {
    formLabel?: string;
    announceValidation?: boolean;
    announceSubmission?: boolean;
  };
  onSubmit?: (data: Record<string, any>) => Promise<boolean>;
  onCancel?: () => void;
  onValidationChange?: (isValid: boolean, errors: Record<string, string>) => void;
  onFieldChange?: (fieldId: string, value: any) => void;
}

interface FormField {
  id: string;
  type: 'text' | 'email' | 'password' | 'number' | 'date' | 'select' | 'checkbox' | 'radio' | 'textarea' | 'file';
  label: string;
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
  helperText?: string;
  options?: { value: string; label: string; disabled?: boolean }[];
  multiple?: boolean;
  min?: number | string;
  max?: number | string;
  rows?: number;
  accept?: string;
  validation?: {
    pattern?: RegExp;
    minLength?: number;
    maxLength?: number;
    customValidator?: (value: any) => string;
  };
  value?: any;
  defaultValue?: any;
}

interface CarbonFormPatternEvents {
  submit: { data: Record<string, any> };
  cancel: {};
  validationChange: { isValid: boolean; errors: Record<string, string> };
  fieldChange: { fieldId: string; value: any };
}

// Test utilities
class CarbonFormPatternTestUtils {
  constructor(private page: Page) {}

  async getFormElement() {
    return this.page.locator('.carbon-form-pattern form');
  }

  async getFormTitle() {
    return this.page.locator('.carbon-form-title');
  }

  async getFormSubtitle() {
    return this.page.locator('.carbon-form-subtitle');
  }

  async getField(fieldId: string) {
    return this.page.locator(`#${fieldId}`);
  }

  async getFieldError(fieldId: string) {
    return this.page.locator(`.bx--form-requirement`).filter({ hasText: fieldId });
  }

  async getSubmitButton() {
    return this.page.locator('button[type="submit"]');
  }

  async getCancelButton() {
    return this.page.locator('button:has-text("Cancel")');
  }

  async getValidationSummary() {
    return this.page.locator('.bx--inline-notification--error');
  }

  async fillField(fieldId: string, value: string) {
    const field = await this.getField(fieldId);
    await field.fill(value);
  }

  async selectOption(fieldId: string, value: string) {
    const field = await this.getField(fieldId);
    await field.selectOption(value);
  }

  async checkCheckbox(fieldId: string, checked: boolean = true) {
    const field = await this.getField(fieldId);
    if (checked) {
      await field.check();
    } else {
      await field.uncheck();
    }
  }

  async submitForm() {
    const submitButton = await this.getSubmitButton();
    await submitButton.click();
  }

  async cancelForm() {
    const cancelButton = await this.getCancelButton();
    await cancelButton.click();
  }

  async hasLayoutClass(layout: string) {
    const form = this.page.locator('.carbon-form-pattern');
    return form.evaluate((el, layout) =>
      el.classList.contains(`carbon-form--${layout}`), layout);
  }

  async hasColumnClass(columns: number) {
    const form = this.page.locator('.carbon-form-pattern');
    return form.evaluate((el, columns) =>
      el.classList.contains(`carbon-form--columns-${columns}`), columns);
  }
}

// Mock component for testing
const mockCarbonFormPatternComponent = `
<script>
  import CarbonFormPattern from '$lib/components/forms/CarbonFormPattern.svelte';

  let events = [];
  let formRef;

  function handleSubmit(event) {
    events.push({ type: 'submit', detail: event.detail });
    return Promise.resolve(true);
  }

  function handleCancel(event) {
    events.push({ type: 'cancel', detail: event.detail });
  }

  function handleValidationChange(event) {
    events.push({ type: 'validationChange', detail: event.detail });
  }

  function handleFieldChange(event) {
    events.push({ type: 'fieldChange', detail: event.detail });
  }

  // Test configurations
  export let testConfig = {
    title: 'Employee Information',
    subtitle: 'Please fill out the form below',
    fields: [
      {
        id: 'firstName',
        type: 'text',
        label: 'First Name',
        placeholder: 'Enter first name',
        required: true,
        helperText: 'Your legal first name'
      },
      {
        id: 'email',
        type: 'email',
        label: 'Email Address',
        placeholder: 'Enter email',
        required: true
      },
      {
        id: 'department',
        type: 'select',
        label: 'Department',
        required: true,
        options: [
          { value: 'hr', label: 'Human Resources' },
          { value: 'it', label: 'Information Technology' },
          { value: 'finance', label: 'Finance' }
        ]
      },
      {
        id: 'bio',
        type: 'textarea',
        label: 'Biography',
        placeholder: 'Tell us about yourself',
        required: false,
        rows: 4
      },
      {
        id: 'subscribe',
        type: 'checkbox',
        label: 'Subscribe to newsletter',
        required: false
      }
    ],
    submitText: 'Save Employee',
    cancelText: 'Cancel',
    loading: false,
    disabled: false,
    layout: 'vertical',
    columns: 1,
    validationMode: 'onBlur',
    showValidationSummary: false
  };

  // Expose events for testing
  if (typeof window !== 'undefined') {
    window.testEvents = events;
  }
</script>

<CarbonFormPattern
  bind:this={formRef}
  {...testConfig}
  onSubmit={handleSubmit}
  onCancel={handleCancel}
  on:submit={handleSubmit}
  on:cancel={handleCancel}
  on:validationChange={handleValidationChange}
  on:fieldChange={handleFieldChange}
/>
`;

test.describe('CarbonFormPattern Component Contract', () => {
  let accessibility: Awaited<ReturnType<typeof setupAccessibilityTesting>>;
  let utils: CarbonFormPatternTestUtils;

  test.beforeEach(async ({ page }) => {
    accessibility = await setupAccessibilityTesting(page);
    utils = new CarbonFormPatternTestUtils(page);

    // Create a test page with the component
    await page.setContent(`
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>CarbonFormPattern Test</title>
        <link rel="stylesheet" href="/src/app.css">
      </head>
      <body>
        <div id="app">${mockCarbonFormPatternComponent}</div>
      </body>
      </html>
    `);

    await page.waitForSelector('.carbon-form-pattern');
  });

  test.describe('Component Structure', () => {
    test('should render form with title and subtitle', async () => {
      const form = await utils.getFormElement();
      await expect(form).toBeVisible();

      const title = await utils.getFormTitle();
      await expect(title).toBeVisible();
      await expect(title).toContainText('Employee Information');

      const subtitle = await utils.getFormSubtitle();
      await expect(subtitle).toBeVisible();
      await expect(subtitle).toContainText('Please fill out the form below');
    });

    test('should render all field types', async () => {
      // Text input
      const firstName = await utils.getField('firstName');
      await expect(firstName).toBeVisible();
      await expect(firstName).toHaveAttribute('type', 'text');

      // Email input
      const email = await utils.getField('email');
      await expect(email).toBeVisible();
      await expect(email).toHaveAttribute('type', 'email');

      // Select field
      const department = await utils.getField('department');
      await expect(department).toBeVisible();

      // Textarea
      const bio = await utils.getField('bio');
      await expect(bio).toBeVisible();

      // Checkbox
      const subscribe = await utils.getField('subscribe');
      await expect(subscribe).toBeVisible();
      await expect(subscribe).toHaveAttribute('type', 'checkbox');
    });

    test('should render submit and cancel buttons', async () => {
      const submitButton = await utils.getSubmitButton();
      await expect(submitButton).toBeVisible();
      await expect(submitButton).toContainText('Save Employee');

      const cancelButton = await utils.getCancelButton();
      await expect(cancelButton).toBeVisible();
      await expect(cancelButton).toContainText('Cancel');
    });
  });

  test.describe('Field Types and Validation', () => {
    test('should handle text input fields', async () => {
      const firstName = await utils.getField('firstName');

      await utils.fillField('firstName', 'John');
      await expect(firstName).toHaveValue('John');

      // Test required validation
      await utils.fillField('firstName', '');
      await firstName.blur();

      // Should show error for required field
      const errorElement = utils.page.locator('.bx--form-requirement');
      await expect(errorElement).toBeVisible();
    });

    test('should handle email validation', async () => {
      const email = await utils.getField('email');

      // Test invalid email
      await utils.fillField('email', 'invalid-email');
      await email.blur();

      // Should show validation error
      const errorElement = utils.page.locator('.bx--form-requirement');
      await expect(errorElement).toBeVisible();

      // Test valid email
      await utils.fillField('email', 'john@example.com');
      await email.blur();

      // Error should be cleared
      await expect(errorElement).not.toBeVisible();
    });

    test('should handle select fields', async () => {
      const department = await utils.getField('department');

      await utils.selectOption('department', 'hr');
      await expect(department).toHaveValue('hr');

      // Test that options are available
      const options = department.locator('option');
      await expect(options).toHaveCount(4); // Including default option
    });

    test('should handle textarea fields', async () => {
      const bio = await utils.getField('bio');

      await utils.fillField('bio', 'This is my biography');
      await expect(bio).toHaveValue('This is my biography');
    });

    test('should handle checkbox fields', async () => {
      const subscribe = await utils.getField('subscribe');

      await utils.checkCheckbox('subscribe', true);
      await expect(subscribe).toBeChecked();

      await utils.checkCheckbox('subscribe', false);
      await expect(subscribe).not.toBeChecked();
    });
  });

  test.describe('Layout Variants', () => {
    test('should handle vertical layout', async () => {
      expect(await utils.hasLayoutClass('vertical')).toBe(true);
    });

    test('should handle grid layout', async ({ page }) => {
      await page.evaluate(() => {
        window.testConfig = {
          ...window.testConfig,
          layout: 'grid',
          columns: 2
        };
      });
      await page.reload();
      await page.waitForSelector('.carbon-form-pattern');

      expect(await utils.hasLayoutClass('grid')).toBe(true);
      expect(await utils.hasColumnClass(2)).toBe(true);
    });

    test('should handle horizontal layout', async ({ page }) => {
      await page.evaluate(() => {
        window.testConfig = {
          ...window.testConfig,
          layout: 'horizontal'
        };
      });
      await page.reload();
      await page.waitForSelector('.carbon-form-pattern');

      expect(await utils.hasLayoutClass('horizontal')).toBe(true);
    });
  });

  test.describe('Validation Modes', () => {
    test('should validate on blur', async () => {
      // Default is onBlur validation
      const firstName = await utils.getField('firstName');

      await firstName.focus();
      await firstName.blur();

      // Should show required field error
      const errorElement = utils.page.locator('.bx--form-requirement');
      await expect(errorElement).toBeVisible();
    });

    test('should validate on change', async ({ page }) => {
      await page.evaluate(() => {
        window.testConfig = {
          ...window.testConfig,
          validationMode: 'onChange'
        };
      });
      await page.reload();
      await page.waitForSelector('.carbon-form-pattern');

      const firstName = await utils.getField('firstName');

      await utils.fillField('firstName', '');

      // Should show error immediately on change
      const errorElement = utils.page.locator('.bx--form-requirement');
      await expect(errorElement).toBeVisible();
    });

    test('should show validation summary', async ({ page }) => {
      await page.evaluate(() => {
        window.testConfig = {
          ...window.testConfig,
          showValidationSummary: true
        };
      });
      await page.reload();
      await page.waitForSelector('.carbon-form-pattern');

      // Submit form with errors
      await utils.submitForm();

      // Should show validation summary
      const summary = await utils.getValidationSummary();
      await expect(summary).toBeVisible();
      await expect(summary).toContainText('Form Validation Errors');
    });
  });

  test.describe('Form Submission', () => {
    test('should handle successful form submission', async () => {
      // Fill out valid form
      await utils.fillField('firstName', 'John');
      await utils.fillField('email', 'john@example.com');
      await utils.selectOption('department', 'hr');

      await utils.submitForm();

      // Check that submit event was dispatched
      const events = await utils.page.evaluate(() => window.testEvents || []);
      const submitEvent = events.find((e: any) => e.type === 'submit');
      expect(submitEvent).toBeDefined();
    });

    test('should prevent submission with validation errors', async () => {
      // Try to submit without required fields
      await utils.submitForm();

      // Should show validation errors
      const errorElements = utils.page.locator('.bx--form-requirement');
      await expect(errorElements.first()).toBeVisible();

      // Should not dispatch submit event
      const events = await utils.page.evaluate(() => window.testEvents || []);
      const submitEvents = events.filter((e: any) => e.type === 'submit');
      expect(submitEvents.length).toBe(0);
    });

    test('should handle form cancellation', async () => {
      await utils.cancelForm();

      // Check that cancel event was dispatched
      const events = await utils.page.evaluate(() => window.testEvents || []);
      const cancelEvent = events.find((e: any) => e.type === 'cancel');
      expect(cancelEvent).toBeDefined();
    });
  });

  test.describe('Loading and Disabled States', () => {
    test('should handle loading state', async ({ page }) => {
      await page.evaluate(() => {
        window.testConfig = {
          ...window.testConfig,
          loading: true
        };
      });
      await page.reload();
      await page.waitForSelector('.carbon-form-pattern');

      // Should show skeleton placeholders
      const skeleton = utils.page.locator('.bx--skeleton');
      await expect(skeleton.first()).toBeVisible();

      // Submit button should be disabled
      const submitButton = await utils.getSubmitButton();
      await expect(submitButton).toBeDisabled();
    });

    test('should handle disabled state', async ({ page }) => {
      await page.evaluate(() => {
        window.testConfig = {
          ...window.testConfig,
          disabled: true
        };
      });
      await page.reload();
      await page.waitForSelector('.carbon-form-pattern');

      // All fields should be disabled
      const firstName = await utils.getField('firstName');
      await expect(firstName).toBeDisabled();

      const submitButton = await utils.getSubmitButton();
      await expect(submitButton).toBeDisabled();
    });
  });

  test.describe('Event Dispatch', () => {
    test('should dispatch field change events', async () => {
      await utils.fillField('firstName', 'John');

      const events = await utils.page.evaluate(() => window.testEvents || []);
      const fieldChangeEvent = events.find((e: any) =>
        e.type === 'fieldChange' && e.detail.fieldId === 'firstName'
      );
      expect(fieldChangeEvent).toBeDefined();
      expect(fieldChangeEvent.detail.value).toBe('John');
    });

    test('should dispatch validation change events', async () => {
      // Trigger validation by trying to submit
      await utils.submitForm();

      const events = await utils.page.evaluate(() => window.testEvents || []);
      const validationEvent = events.find((e: any) => e.type === 'validationChange');
      expect(validationEvent).toBeDefined();
      expect(validationEvent.detail.isValid).toBe(false);
    });
  });

  test.describe('Carbon Design Integration', () => {
    test('should use Carbon form components', async () => {
      await expect(utils.page.locator('.bx--form')).toBeVisible();
      await expect(utils.page.locator('.bx--text-input')).toBeVisible();
      await expect(utils.page.locator('.bx--select')).toBeVisible();
      await expect(utils.page.locator('.bx--text-area')).toBeVisible();
      await expect(utils.page.locator('.bx--checkbox')).toBeVisible();
      await expect(utils.page.locator('.bx--btn')).toBeVisible();
    });

    test('should apply Carbon design tokens', async () => {
      const form = utils.page.locator('.carbon-form-pattern');

      // Check spacing
      const spacing = await form.evaluate(el =>
        window.getComputedStyle(el.querySelector('.carbon-form-fields')).gap
      );
      expect(spacing).toMatch(/\d+px/);

      // Check typography
      const title = utils.page.locator('.carbon-form-title');
      const fontSize = await title.evaluate(el =>
        window.getComputedStyle(el).fontSize
      );
      expect(fontSize).toMatch(/\d+px/);
    });
  });

  test.describe('Accessibility Compliance', () => {
    test('should meet WCAG 2.1 AA standards', async () => {
      await accessibility.audit();
      await accessibility.assertNoViolations();
    });

    test('should have proper form semantics', async () => {
      const form = await utils.getFormElement();
      await expect(form).toHaveAttribute('novalidate');

      const formWrapper = utils.page.locator('.carbon-form-pattern');
      await expect(formWrapper).toHaveAttribute('role', 'region');
      await expect(formWrapper).toHaveAttribute('aria-label');
    });

    test('should have proper field labeling', async () => {
      const firstName = await utils.getField('firstName');
      const label = utils.page.locator('label[for="firstName"]');

      await expect(label).toBeVisible();
      await expect(firstName).toHaveAttribute('id', 'firstName');
    });

    test('should support keyboard navigation', async () => {
      await accessibility.testKeyboardNavigation();

      // Test tab order through form fields
      await utils.page.keyboard.press('Tab');
      await expect(utils.getField('firstName')).toBeFocused();

      await utils.page.keyboard.press('Tab');
      await expect(utils.getField('email')).toBeFocused();

      await utils.page.keyboard.press('Tab');
      await expect(utils.getField('department')).toBeFocused();
    });

    test('should announce validation errors', async () => {
      const firstName = await utils.getField('firstName');

      await firstName.focus();
      await firstName.blur();

      // Error message should have proper ARIA attributes
      const errorElement = utils.page.locator('.bx--form-requirement');
      await expect(errorElement).toBeVisible();
      await expect(firstName).toHaveAttribute('aria-invalid', 'true');
    });
  });

  test.describe('Responsive Design', () => {
    test('should adapt to mobile viewport', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 });

      const form = utils.page.locator('.carbon-form-pattern');
      await expect(form).toBeVisible();

      // Grid layout should collapse to single column
      const fields = utils.page.locator('.carbon-form-fields');
      const gridColumns = await fields.evaluate(el =>
        window.getComputedStyle(el).gridTemplateColumns
      );

      // Should be single column or flex direction
      expect(gridColumns).toBeDefined();
    });

    test('should maintain usability on tablet', async ({ page }) => {
      await page.setViewportSize({ width: 768, height: 1024 });

      const form = utils.page.locator('.carbon-form-pattern');
      await expect(form).toBeVisible();

      // Form should remain functional
      await utils.fillField('firstName', 'John');
      const firstName = await utils.getField('firstName');
      await expect(firstName).toHaveValue('John');
    });
  });

  test.describe('Performance', () => {
    test('should render within acceptable time', async ({ page }) => {
      const startTime = Date.now();

      await page.reload();
      await page.waitForSelector('.carbon-form-pattern');

      const renderTime = Date.now() - startTime;
      expect(renderTime).toBeLessThan(2000);
    });

    test('should handle large forms efficiently', async ({ page }) => {
      // Create a form with many fields
      await page.evaluate(() => {
        const manyFields = Array.from({ length: 20 }, (_, i) => ({
          id: `field${i}`,
          type: 'text',
          label: `Field ${i + 1}`,
          required: false
        }));

        window.testConfig = {
          ...window.testConfig,
          fields: manyFields
        };
      });

      await page.reload();
      const startTime = Date.now();
      await page.waitForSelector('.carbon-form-pattern');

      const renderTime = Date.now() - startTime;
      expect(renderTime).toBeLessThan(3000); // Allow more time for larger forms
    });
  });
});