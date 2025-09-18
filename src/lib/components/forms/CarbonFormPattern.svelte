<script lang="ts">
  import { createEventDispatcher, onMount } from 'svelte';
  import {
    Form,
    FormGroup,
    TextInput,
    PasswordInput,
    NumberInput,
    TextArea,
    Select,
    SelectItem,
    Checkbox,
    RadioButtonGroup,
    RadioButton,
    FileUploader,
    DatePicker,
    DatePickerInput,
    Button,
    InlineNotification,
    SkeletonPlaceholder,
    FormLabel
  } from 'carbon-components-svelte';
  import { Email, Calendar, Upload, Information } from 'carbon-icons-svelte';
  import type {
    CarbonFormPatternProps,
    CarbonFormPatternEvents,
    FormField,
    SelectOption
  } from '../../../contracts/component-interface';

  /**
   * Carbon Form Pattern Component
   * Dynamically generates forms based on field configuration
   * Follows Carbon Design System patterns with comprehensive validation
   */

  type $$Props = CarbonFormPatternProps;
  type $$Events = CarbonFormPatternEvents;

  const dispatch = createEventDispatcher<CarbonFormPatternEvents>();

  // Component props with defaults
  export let title: string = '';
  export let subtitle: string = '';
  export let fields: FormField[] = [];
  export let submitText: string = 'Submit';
  export let cancelText: string = 'Cancel';
  export let loading: boolean = false;
  export let disabled: boolean = false;

  // Layout configuration
  export let layout: 'vertical' | 'horizontal' | 'grid' = 'vertical';
  export let columns: 1 | 2 | 3 = 1;

  // Validation configuration
  export let validationMode: 'onChange' | 'onBlur' | 'onSubmit' = 'onBlur';
  export let showValidationSummary: boolean = false;

  // Accessibility configuration
  export let accessibility = {
    formLabel: 'Dynamic form',
    announceValidation: true,
    announceSubmission: true
  };

  // Event handlers
  export let onSubmit: ((data: Record<string, any>) => Promise<boolean>) | undefined = undefined;
  export let onCancel: (() => void) | undefined = undefined;
  export let onValidationChange: ((isValid: boolean, errors: Record<string, string>) => void) | undefined = undefined;
  export let onFieldChange: ((fieldId: string, value: any) => void) | undefined = undefined;

  // Form state
  let formData: Record<string, any> = {};
  let fieldErrors: Record<string, string> = {};
  let isSubmitting = false;
  let hasSubmitted = false;

  // Initialize form data with defaults
  onMount(() => {
    const initialData: Record<string, any> = {};
    fields.forEach(field => {
      if (field.defaultValue !== undefined) {
        initialData[field.id] = field.defaultValue;
      } else if (field.value !== undefined) {
        initialData[field.id] = field.value;
      } else {
        // Set appropriate default based on field type
        switch (field.type) {
          case 'checkbox':
            initialData[field.id] = false;
            break;
          case 'number':
            initialData[field.id] = '';
            break;
          case 'select':
            if (field.multiple) {
              initialData[field.id] = [];
            } else {
              initialData[field.id] = '';
            }
            break;
          case 'file':
            initialData[field.id] = field.multiple ? [] : null;
            break;
          default:
            initialData[field.id] = '';
        }
      }
    });
    formData = initialData;
  });

  // Validation functions
  function validateField(field: FormField, value: any): string {
    // Required validation
    if (field.required) {
      if (value === '' || value === null || value === undefined) {
        return `${field.label} is required`;
      }
      if (Array.isArray(value) && value.length === 0) {
        return `${field.label} is required`;
      }
    }

    // Skip other validations if empty and not required
    if (value === '' || value === null || value === undefined) {
      return '';
    }

    // Type-specific validation
    switch (field.type) {
      case 'email':
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
          return 'Please enter a valid email address';
        }
        break;

      case 'number':
        const numValue = Number(value);
        if (isNaN(numValue)) {
          return 'Please enter a valid number';
        }
        if (field.min !== undefined && numValue < field.min) {
          return `Value must be at least ${field.min}`;
        }
        if (field.max !== undefined && numValue > field.max) {
          return `Value must be no more than ${field.max}`;
        }
        break;

      case 'text':
      case 'textarea':
      case 'password':
        if (field.validation?.minLength && value.length < field.validation.minLength) {
          return `Must be at least ${field.validation.minLength} characters`;
        }
        if (field.validation?.maxLength && value.length > field.validation.maxLength) {
          return `Must be no more than ${field.validation.maxLength} characters`;
        }
        if (field.validation?.pattern && !field.validation.pattern.test(value)) {
          return 'Please enter a valid format';
        }
        break;

      case 'date':
        if (typeof value === 'string') {
          const date = new Date(value);
          if (isNaN(date.getTime())) {
            return 'Please enter a valid date';
          }
          if (field.min && date < new Date(field.min)) {
            return `Date must be after ${field.min}`;
          }
          if (field.max && date > new Date(field.max)) {
            return `Date must be before ${field.max}`;
          }
        }
        break;
    }

    // Custom validation
    if (field.validation?.customValidator) {
      const customError = field.validation.customValidator(value);
      if (customError) return customError;
    }

    return '';
  }

  function validateForm(): boolean {
    const errors: Record<string, string> = {};

    fields.forEach(field => {
      if (!field.disabled) {
        const error = validateField(field, formData[field.id]);
        if (error) {
          errors[field.id] = error;
        }
      }
    });

    fieldErrors = errors;
    const isValid = Object.keys(errors).length === 0;

    onValidationChange?.(isValid, errors);
    dispatch('validationChange', { isValid, errors });

    if (accessibility.announceValidation && Object.keys(errors).length > 0) {
      announceToScreenReader(`Form has ${Object.keys(errors).length} validation errors`);
    }

    return isValid;
  }

  // Event handlers
  function handleFieldChange(fieldId: string, value: any) {
    formData[fieldId] = value;

    // Real-time validation if enabled
    if (validationMode === 'onChange' || (hasSubmitted && validationMode === 'onBlur')) {
      const field = fields.find(f => f.id === fieldId);
      if (field) {
        const error = validateField(field, value);
        if (error) {
          fieldErrors[fieldId] = error;
        } else {
          delete fieldErrors[fieldId];
        }
        fieldErrors = { ...fieldErrors };
      }
    }

    onFieldChange?.(fieldId, value);
    dispatch('fieldChange', { fieldId, value });
  }

  function handleFieldBlur(fieldId: string) {
    if (validationMode === 'onBlur' || hasSubmitted) {
      const field = fields.find(f => f.id === fieldId);
      if (field) {
        const error = validateField(field, formData[fieldId]);
        if (error) {
          fieldErrors[fieldId] = error;
        } else {
          delete fieldErrors[fieldId];
        }
        fieldErrors = { ...fieldErrors };
      }
    }
  }

  async function handleSubmit(event: Event) {
    event.preventDefault();
    hasSubmitted = true;

    if (isSubmitting || loading || disabled || !validateForm()) {
      return;
    }

    isSubmitting = true;

    if (accessibility.announceSubmission) {
      announceToScreenReader('Submitting form');
    }

    dispatch('submit', { data: { ...formData } });

    try {
      const success = onSubmit ? await onSubmit({ ...formData }) : true;

      if (success) {
        if (accessibility.announceSubmission) {
          announceToScreenReader('Form submitted successfully');
        }
      } else {
        if (accessibility.announceSubmission) {
          announceToScreenReader('Form submission failed');
        }
      }
    } catch (error) {
      if (accessibility.announceSubmission) {
        announceToScreenReader('Form submission error');
      }
      console.error('Form submission error:', error);
    } finally {
      isSubmitting = false;
    }
  }

  function handleCancel() {
    onCancel?.();
    dispatch('cancel');
  }

  // Accessibility helper
  function announceToScreenReader(message: string) {
    if (!accessibility.announceValidation) return;

    const announcement = document.createElement('div');
    announcement.setAttribute('aria-live', 'polite');
    announcement.setAttribute('aria-atomic', 'true');
    announcement.className = 'sr-only';
    announcement.textContent = message;

    document.body.appendChild(announcement);

    setTimeout(() => {
      document.body.removeChild(announcement);
    }, 1000);
  }

  // Reactive validation state
  $: isFormValid = Object.keys(fieldErrors).length === 0;
  $: allFieldErrors = Object.values(fieldErrors).filter(Boolean);

  // Layout classes
  $: layoutClass = `carbon-form--${layout}`;
  $: columnClass = layout === 'grid' ? `carbon-form--columns-${columns}` : '';
</script>

<div
  class="carbon-form-pattern {layoutClass} {columnClass}"
  role="region"
  aria-label={accessibility.formLabel}
  data-testid="carbon-form-pattern"
>
  <!-- Form Header -->
  {#if title || subtitle}
    <div class="carbon-form-header">
      {#if title}
        <h2 class="carbon-form-title">{title}</h2>
      {/if}
      {#if subtitle}
        <p class="carbon-form-subtitle">{subtitle}</p>
      {/if}
    </div>
  {/if}

  <!-- Validation Summary -->
  {#if showValidationSummary && hasSubmitted && allFieldErrors.length > 0}
    <InlineNotification
      kind="error"
      title="Form Validation Errors"
      subtitle="Please correct the following errors:"
      hideCloseButton={true}
    >
      <ul class="carbon-error-list">
        {#each allFieldErrors as error}
          <li>{error}</li>
        {/each}
      </ul>
    </InlineNotification>
  {/if}

  <Form on:submit={handleSubmit} novalidate>
    <!-- Dynamic Fields -->
    <div class="carbon-form-fields">
      {#if loading}
        <!-- Loading Skeleton -->
        {#each Array(3) as _}
          <FormGroup>
            <SkeletonPlaceholder />
          </FormGroup>
        {/each}
      {:else}
        {#each fields as field}
          <FormGroup>
            <!-- Text Input -->
            {#if field.type === 'text'}
              <TextInput
                id={field.id}
                labelText={field.label}
                placeholder={field.placeholder}
                helperText={field.helperText}
                required={field.required}
                disabled={field.disabled || disabled}
                invalid={!!fieldErrors[field.id]}
                invalidText={fieldErrors[field.id]}
                bind:value={formData[field.id]}
                on:input={(e) => handleFieldChange(field.id, e.detail)}
                on:blur={() => handleFieldBlur(field.id)}
              />

            <!-- Email Input -->
            {:else if field.type === 'email'}
              <TextInput
                id={field.id}
                type="email"
                labelText={field.label}
                placeholder={field.placeholder || 'Enter email address'}
                helperText={field.helperText}
                required={field.required}
                disabled={field.disabled || disabled}
                invalid={!!fieldErrors[field.id]}
                invalidText={fieldErrors[field.id]}
                bind:value={formData[field.id]}
                on:input={(e) => handleFieldChange(field.id, e.detail)}
                on:blur={() => handleFieldBlur(field.id)}
              >
                <Email slot="icon" />
              </TextInput>

            <!-- Password Input -->
            {:else if field.type === 'password'}
              <PasswordInput
                id={field.id}
                labelText={field.label}
                placeholder={field.placeholder}
                helperText={field.helperText}
                required={field.required}
                disabled={field.disabled || disabled}
                invalid={!!fieldErrors[field.id]}
                invalidText={fieldErrors[field.id]}
                bind:value={formData[field.id]}
                on:input={(e) => handleFieldChange(field.id, e.detail)}
                on:blur={() => handleFieldBlur(field.id)}
                showPasswordLabel="Show password"
                hidePasswordLabel="Hide password"
              />

            <!-- Number Input -->
            {:else if field.type === 'number'}
              <NumberInput
                id={field.id}
                label={field.label}
                placeholder={field.placeholder}
                helperText={field.helperText}
                required={field.required}
                disabled={field.disabled || disabled}
                invalid={!!fieldErrors[field.id]}
                invalidText={fieldErrors[field.id]}
                min={field.min}
                max={field.max}
                bind:value={formData[field.id]}
                on:input={(e) => handleFieldChange(field.id, e.detail)}
                on:blur={() => handleFieldBlur(field.id)}
              />

            <!-- Textarea -->
            {:else if field.type === 'textarea'}
              <TextArea
                id={field.id}
                labelText={field.label}
                placeholder={field.placeholder}
                helperText={field.helperText}
                required={field.required}
                disabled={field.disabled || disabled}
                invalid={!!fieldErrors[field.id]}
                invalidText={fieldErrors[field.id]}
                rows={field.rows || 4}
                bind:value={formData[field.id]}
                on:input={(e) => handleFieldChange(field.id, e.detail)}
                on:blur={() => handleFieldBlur(field.id)}
              />

            <!-- Select -->
            {:else if field.type === 'select'}
              <Select
                id={field.id}
                labelText={field.label}
                helperText={field.helperText}
                required={field.required}
                disabled={field.disabled || disabled}
                invalid={!!fieldErrors[field.id]}
                invalidText={fieldErrors[field.id]}
                bind:selected={formData[field.id]}
                on:change={(e) => handleFieldChange(field.id, e.detail)}
                on:blur={() => handleFieldBlur(field.id)}
              >
                {#if !field.required}
                  <SelectItem value="" text="Select an option..." />
                {/if}
                {#each field.options || [] as option}
                  <SelectItem
                    value={option.value}
                    text={option.label}
                    disabled={option.disabled}
                  />
                {/each}
              </Select>

            <!-- Checkbox -->
            {:else if field.type === 'checkbox'}
              <Checkbox
                id={field.id}
                labelText={field.label}
                helperText={field.helperText}
                required={field.required}
                disabled={field.disabled || disabled}
                bind:checked={formData[field.id]}
                on:change={(e) => handleFieldChange(field.id, e.detail)}
                on:blur={() => handleFieldBlur(field.id)}
              />

            <!-- Radio Group -->
            {:else if field.type === 'radio'}
              <FormLabel>{field.label}</FormLabel>
              {#if field.helperText}
                <div class="carbon-helper-text">{field.helperText}</div>
              {/if}
              <RadioButtonGroup
                bind:selected={formData[field.id]}
                on:change={(e) => handleFieldChange(field.id, e.detail)}
                disabled={field.disabled || disabled}
              >
                {#each field.options || [] as option}
                  <RadioButton
                    id="{field.id}-{option.value}"
                    labelText={option.label}
                    value={option.value}
                    disabled={option.disabled}
                  />
                {/each}
              </RadioButtonGroup>
              {#if fieldErrors[field.id]}
                <div class="carbon-field-error">{fieldErrors[field.id]}</div>
              {/if}

            <!-- Date Input -->
            {:else if field.type === 'date'}
              <DatePicker
                datePickerType="single"
                bind:value={formData[field.id]}
                on:change={(e) => handleFieldChange(field.id, e.detail)}
                disabled={field.disabled || disabled}
              >
                <DatePickerInput
                  id={field.id}
                  labelText={field.label}
                  placeholder={field.placeholder || 'mm/dd/yyyy'}
                  helperText={field.helperText}
                  required={field.required}
                  invalid={!!fieldErrors[field.id]}
                  invalidText={fieldErrors[field.id]}
                  on:blur={() => handleFieldBlur(field.id)}
                />
              </DatePicker>

            <!-- File Upload -->
            {:else if field.type === 'file'}
              <FormLabel>{field.label}</FormLabel>
              {#if field.helperText}
                <div class="carbon-helper-text">{field.helperText}</div>
              {/if}
              <FileUploader
                labelTitle="Upload files"
                labelDescription="Choose files to upload"
                buttonLabel="Add files"
                accept={field.accept}
                multiple={field.multiple}
                disabled={field.disabled || disabled}
                on:change={(e) => handleFieldChange(field.id, e.detail)}
              />
              {#if fieldErrors[field.id]}
                <div class="carbon-field-error">{fieldErrors[field.id]}</div>
              {/if}
            {/if}
          </FormGroup>
        {/each}
      {/if}
    </div>

    <!-- Form Actions -->
    <div class="carbon-form-actions">
      {#if onCancel}
        <Button
          kind="secondary"
          on:click={handleCancel}
          disabled={isSubmitting || loading}
        >
          {cancelText}
        </Button>
      {/if}

      <Button
        type="submit"
        disabled={isSubmitting || loading || disabled || (!isFormValid && hasSubmitted)}
        loading={isSubmitting || loading}
      >
        {isSubmitting || loading ? 'Submitting...' : submitText}
      </Button>
    </div>
  </Form>
</div>

<style>
  .carbon-form-pattern {
    width: 100%;
    max-width: 100%;
  }

  /* Form Header */
  .carbon-form-header {
    margin-bottom: var(--cds-spacing-06);
  }

  .carbon-form-title {
    font-size: var(--cds-productive-heading-04-font-size);
    font-weight: var(--cds-productive-heading-04-font-weight);
    line-height: var(--cds-productive-heading-04-line-height);
    color: var(--cds-text-primary);
    margin: 0 0 var(--cds-spacing-03) 0;
  }

  .carbon-form-subtitle {
    font-size: var(--cds-body-short-01-font-size);
    line-height: var(--cds-body-short-01-line-height);
    color: var(--cds-text-secondary);
    margin: 0;
  }

  /* Form Fields */
  .carbon-form-fields {
    display: flex;
    flex-direction: column;
    gap: var(--cds-spacing-05);
  }

  /* Layout Variants */
  .carbon-form--horizontal .carbon-form-fields {
    gap: var(--cds-spacing-04);
  }

  .carbon-form--grid .carbon-form-fields {
    display: grid;
    gap: var(--cds-spacing-05);
  }

  .carbon-form--columns-1.carbon-form--grid .carbon-form-fields {
    grid-template-columns: 1fr;
  }

  .carbon-form--columns-2.carbon-form--grid .carbon-form-fields {
    grid-template-columns: repeat(2, 1fr);
  }

  .carbon-form--columns-3.carbon-form--grid .carbon-form-fields {
    grid-template-columns: repeat(3, 1fr);
  }

  /* Form Actions */
  .carbon-form-actions {
    display: flex;
    gap: var(--cds-spacing-04);
    justify-content: flex-end;
    margin-top: var(--cds-spacing-07);
    padding-top: var(--cds-spacing-05);
    border-top: 1px solid var(--cds-border-subtle-01);
  }

  /* Helper Texts and Errors */
  .carbon-helper-text {
    font-size: var(--cds-helper-text-01-font-size);
    line-height: var(--cds-helper-text-01-line-height);
    color: var(--cds-text-secondary);
    margin-bottom: var(--cds-spacing-03);
  }

  .carbon-field-error {
    font-size: var(--cds-helper-text-01-font-size);
    line-height: var(--cds-helper-text-01-line-height);
    color: var(--cds-support-error);
    margin-top: var(--cds-spacing-02);
  }

  /* Error List */
  .carbon-error-list {
    margin: var(--cds-spacing-03) 0 0 0;
    padding-left: var(--cds-spacing-05);
  }

  .carbon-error-list li {
    font-size: var(--cds-body-short-01-font-size);
    line-height: var(--cds-body-short-01-line-height);
    color: var(--cds-text-primary);
    margin-bottom: var(--cds-spacing-02);
  }

  /* Screen reader only content */
  :global(.sr-only) {
    position: absolute;
    width: 1px;
    height: 1px;
    padding: 0;
    margin: -1px;
    overflow: hidden;
    clip: rect(0, 0, 0, 0);
    white-space: nowrap;
    border: 0;
  }

  /* Form Group Spacing */
  :global(.carbon-form-pattern .bx--form-group) {
    margin-bottom: 0;
  }

  /* High contrast mode support */
  @media (prefers-contrast: high) {
    .carbon-form-actions {
      border-top-color: var(--cds-border-strong);
      border-top-width: 2px;
    }

    .carbon-field-error {
      font-weight: var(--cds-font-weight-semibold);
      border-left: 2px solid var(--cds-support-error);
      padding-left: var(--cds-spacing-02);
    }
  }

  /* Reduced motion support */
  @media (prefers-reduced-motion: reduce) {
    :global(.carbon-form-pattern .bx--loading) {
      animation: none;
    }
  }

  /* Responsive adjustments */
  @media (max-width: 768px) {
    .carbon-form--columns-2.carbon-form--grid .carbon-form-fields,
    .carbon-form--columns-3.carbon-form--grid .carbon-form-fields {
      grid-template-columns: 1fr;
    }

    .carbon-form-actions {
      flex-direction: column-reverse;
    }
  }

  @media (max-width: 1024px) {
    .carbon-form--columns-3.carbon-form--grid .carbon-form-fields {
      grid-template-columns: repeat(2, 1fr);
    }
  }
</style>