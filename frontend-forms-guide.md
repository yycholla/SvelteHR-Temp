# MountainHR Forms System - Frontend Developer Guide

## Overview

This guide provides comprehensive documentation for implementing dynamic forms in the MountainHR frontend using **SvelteKit**, **Zod**, and **SuperForms**. Our backend provides a flexible form system with polymorphic relationships, templates, versioning, and multi-context support.

## Table of Contents

1. [System Architecture](#system-architecture)
2. [Setup and Dependencies](#setup-and-dependencies)
3. [Backend API Integration](#backend-api-integration)
4. [Form Implementation Patterns](#form-implementation-patterns)
5. [Dynamic Form Generation](#dynamic-form-generation)
6. [Validation and Error Handling](#validation-and-error-handling)
7. [Form Context Management](#form-context-management)
8. [Example Implementations](#example-implementations)
9. [Best Practices](#best-practices)

## System Architecture

### Backend Form System Components

Our backend provides these key entities:

- **FormTemplate**: Reusable form definitions with JSON schemas
- **Form**: Individual form instances based on templates
- **FormSubmission**: Form data with multi-context support
- **FormContext**: Maps forms to specific usage contexts
- **FormEnabled**: Abstract type that entities extend to support forms

### Frontend Stack Integration

```
SvelteKit Routes ↔ SuperForms ↔ Zod Schemas ↔ Backend API
```

- **SvelteKit**: Handles routing, SSR, and form actions
- **SuperForms**: Provides reactive form state management
- **Zod**: Validates form data and provides TypeScript types
- **Backend API**: Serves form schemas and handles submissions

## Setup and Dependencies

### Install Required Packages

```bash
npm install sveltekit-superforms zod
npm install -D @types/node
```

### Project Structure

```
src/
├── lib/
│   ├── forms/
│   │   ├── schemas/           # Zod validation schemas
│   │   ├── components/        # Reusable form components
│   │   ├── builders/          # Dynamic form builders
│   │   └── types.ts           # Form-related types
│   ├── api/                   # API integration utilities
│   └── utils/                 # Helper functions
├── routes/
│   ├── forms/
│   │   ├── [formId]/          # Dynamic form routes
│   │   └── create/            # Form creation
│   └── api/                   # API routes (if using SvelteKit API)
```

## Backend API Integration

### API Client Setup

```typescript
// src/lib/api/client.ts
interface ApiResponse<T> {
	success: boolean;
	data?: T;
	error?: string;
}

class FormsApiClient {
	private baseUrl = '/api/v2';

	async getFormTemplates(): Promise<ApiResponse<FormTemplate[]>> {
		const response = await fetch(`${this.baseUrl}/forms/templates`);
		return response.json();
	}

	async getForm(formId: string): Promise<ApiResponse<Form>> {
		const response = await fetch(`${this.baseUrl}/forms/${formId}`);
		return response.json();
	}

	async submitForm(
		formId: string,
		data: any,
		contextData?: FormContextData
	): Promise<ApiResponse<FormSubmission>> {
		const response = await fetch(`${this.baseUrl}/forms/${formId}/submit`, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({
				submission_data: data,
				context_type: contextData?.type,
				context_entity_id: contextData?.entityId,
				context_metadata: contextData?.metadata
			})
		});
		return response.json();
	}

	async createFormFromTemplate(
		templateId: string,
		customizations?: Partial<Form>
	): Promise<ApiResponse<Form>> {
		const response = await fetch(`${this.baseUrl}/forms/templates/${templateId}/create`, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify(customizations)
		});
		return response.json();
	}
}

export const formsApi = new FormsApiClient();
```

### TypeScript Types

```typescript
// src/lib/forms/types.ts
export interface FormTemplate {
	id: string;
	name: string;
	category: string;
	template_schema: FormSchema;
	description?: string;
	is_active: boolean;
	version: number;
}

export interface Form {
	id: string;
	title: string;
	description?: string;
	form_schema: FormSchema;
	is_active: boolean;
	template?: FormTemplate;
	created_by: string;
	created_at: string;
}

export interface FormSchema {
	fields: FormField[];
	validation_rules?: ValidationRule[];
	ui_config?: UiConfig;
}

export interface FormField {
	id: string;
	name: string;
	type: FieldType;
	label: string;
	required: boolean;
	validation?: FieldValidation;
	options?: FieldOption[];
	ui_config?: FieldUiConfig;
}

export type FieldType =
	| 'text'
	| 'textarea'
	| 'email'
	| 'phone'
	| 'number'
	| 'date'
	| 'select'
	| 'multi_select'
	| 'radio'
	| 'checkbox'
	| 'file'
	| 'section'
	| 'divider';

export interface FormContextData {
	type: string; // 'performance_review', 'exit_interview', etc.
	entityId: string; // Related entity ID
	metadata?: any; // Additional context-specific data
}
```

## Form Implementation Patterns

### 1. Page-Level Form Implementation

```svelte
<!-- src/routes/forms/[formId]/+page.svelte -->
<script lang="ts">
	import { superForm } from 'sveltekit-superforms/client';
	import { zodClient } from 'sveltekit-superforms/adapters';
	import { DynamicForm } from '$lib/forms/components';
	import { createFormSchema } from '$lib/forms/builders';

	export let data;

	$: formSchema = createFormSchema(data.form.form_schema);
	$: formStore = superForm(data.formData, {
		validators: zodClient(formSchema),
		onUpdate: ({ form }) => {
			// Handle form updates
			console.log('Form updated:', form.data);
		},
		onError: ({ result }) => {
			// Handle submission errors
			console.error('Form error:', result.error);
		}
	});

	const { form, errors, constraints, enhance, delayed, submitting } = formStore;
</script>

<div class="form-container">
	<h1>{data.form.title}</h1>
	{#if data.form.description}
		<p class="form-description">{data.form.description}</p>
	{/if}

	<form method="POST" use:enhance>
		<DynamicForm
			schema={data.form.form_schema}
			bind:form={$form}
			errors={$errors}
			constraints={$constraints}
		/>

		<div class="form-actions">
			<button type="submit" disabled={$submitting}>
				{$submitting ? 'Submitting...' : 'Submit Form'}
			</button>

			{#if $delayed}
				<span class="loading">Processing...</span>
			{/if}
		</div>
	</form>
</div>
```

### 2. Server-Side Form Loading

```typescript
// src/routes/forms/[formId]/+page.server.ts
import { error, fail } from '@sveltejs/kit';
import { superValidate } from 'sveltekit-superforms/server';
import { zodAdapter } from 'sveltekit-superforms/adapters';
import { formsApi } from '$lib/api/client';
import { createFormSchema } from '$lib/forms/builders';

export async function load({ params, url }) {
	const { formId } = params;
	const contextType = url.searchParams.get('context');
	const entityId = url.searchParams.get('entityId');

	// Fetch form definition from backend
	const formResponse = await formsApi.getForm(formId);

	if (!formResponse.success || !formResponse.data) {
		throw error(404, 'Form not found');
	}

	const form = formResponse.data;

	// Generate Zod schema from backend form schema
	const zodSchema = createFormSchema(form.form_schema);

	// Initialize SuperForms with empty data
	const formData = await superValidate(zodAdapter(zodSchema));

	return {
		form,
		formData,
		context: {
			type: contextType,
			entityId: entityId
		}
	};
}

export const actions = {
	default: async ({ request, params, url }) => {
		const formData = await request.formData();
		const { formId } = params;
		const contextType = url.searchParams.get('context');
		const entityId = url.searchParams.get('entityId');

		// Get form schema for validation
		const formResponse = await formsApi.getForm(formId);
		if (!formResponse.success) {
			return fail(400, { message: 'Form not found' });
		}

		const zodSchema = createFormSchema(formResponse.data.form_schema);
		const form = await superValidate(formData, zodAdapter(zodSchema));

		if (!form.valid) {
			return fail(400, { form });
		}

		// Submit to backend with context
		const contextData =
			contextType && entityId
				? {
						type: contextType,
						entityId: entityId
					}
				: undefined;

		const submitResponse = await formsApi.submitForm(formId, form.data, contextData);

		if (!submitResponse.success) {
			return fail(500, {
				form,
				message: submitResponse.error || 'Submission failed'
			});
		}

		return { form, success: true };
	}
};
```

## Dynamic Form Generation

### Schema-to-Zod Converter

```typescript
// src/lib/forms/builders/schema-builder.ts
import { z } from 'zod';
import type { FormSchema, FormField } from '$lib/forms/types';

export function createFormSchema(formSchema: FormSchema): z.ZodObject<any> {
	const schemaFields: Record<string, z.ZodType<any>> = {};

	formSchema.fields.forEach((field) => {
		let fieldSchema = createFieldSchema(field);

		// Apply field-level validation
		if (field.validation) {
			fieldSchema = applyValidation(fieldSchema, field.validation);
		}

		// Handle required fields
		if (!field.required) {
			fieldSchema = fieldSchema.optional();
		}

		schemaFields[field.name] = fieldSchema;
	});

	let schema = z.object(schemaFields);

	// Apply form-level validation rules
	if (formSchema.validation_rules) {
		schema = applyFormValidationRules(schema, formSchema.validation_rules);
	}

	return schema;
}

function createFieldSchema(field: FormField): z.ZodType<any> {
	switch (field.type) {
		case 'text':
		case 'textarea':
			return z.string();

		case 'email':
			return z.string().email('Invalid email address');

		case 'phone':
			return z.string().regex(/^\+?[\d\s\-\(\)]+$/, 'Invalid phone number format');

		case 'number':
			return z.number();

		case 'date':
			return z.string().pipe(z.coerce.date());

		case 'select':
		case 'radio':
			if (!field.options?.length) {
				throw new Error(`Field ${field.name} requires options`);
			}
			const values = field.options.map((opt) => opt.value);
			return z.enum(values as [string, ...string[]]);

		case 'multi_select':
		case 'checkbox':
			if (!field.options?.length) {
				throw new Error(`Field ${field.name} requires options`);
			}
			const multiValues = field.options.map((opt) => opt.value);
			return z.array(z.enum(multiValues as [string, ...string[]]));

		case 'file':
			return z.instanceof(File).optional();

		default:
			return z.string();
	}
}

function applyValidation(schema: z.ZodType<any>, validation: FieldValidation): z.ZodType<any> {
	if (validation.minLength && schema instanceof z.ZodString) {
		schema = schema.min(
			validation.minLength,
			`Minimum ${validation.minLength} characters required`
		);
	}

	if (validation.maxLength && schema instanceof z.ZodString) {
		schema = schema.max(validation.maxLength, `Maximum ${validation.maxLength} characters allowed`);
	}

	if (validation.minValue && schema instanceof z.ZodNumber) {
		schema = schema.min(validation.minValue, `Minimum value: ${validation.minValue}`);
	}

	if (validation.maxValue && schema instanceof z.ZodNumber) {
		schema = schema.max(validation.maxValue, `Maximum value: ${validation.maxValue}`);
	}

	if (validation.pattern && schema instanceof z.ZodString) {
		schema = schema.regex(
			new RegExp(validation.pattern),
			validation.patternMessage || 'Invalid format'
		);
	}

	return schema;
}
```

### Dynamic Form Component

```svelte
<!-- src/lib/forms/components/DynamicForm.svelte -->
<script lang="ts">
  import type { FormSchema, FormField } from '$lib/forms/types';
  import {
    TextField, SelectField, NumberField, DateField,
    TextAreaField, RadioField, CheckboxField, FileField
  } from './fields';

  export let schema: FormSchema;
  export let form: Record<string, any>;
  export let errors: Record<string, string[]>;
  export let constraints: Record<string, any>;

  function getFieldComponent(fieldType: string) {
    const components = {
      'text': TextField,
      'textarea': TextAreaField,
      'email': TextField,
      'phone': TextField,
      'number': NumberField,
      'date': DateField,
      'select': SelectField,
      'multi_select': SelectField,
      'radio': RadioField,
      'checkbox': CheckboxField,
      'file': FileField
    };

    return components[fieldType] || TextField;
  }

  function organizeFields(fields: FormField[]) {
    const sections: Record<string, FormField[]> = { default: [] };

    fields.forEach(field => {
      const section = field.ui_config?.section || 'default';
      if (!sections[section]) {
        sections[section] = [];
      }
      sections[section].push(field);
    });

    return sections;
  }

  $: fieldSections = organizeFields(schema.fields);
</script>

<div class="dynamic-form">
  {#each Object.entries(fieldSections) as [sectionName, sectionFields]}
    {#if sectionName !== 'default'}
      <div class="form-section">
        <h3 class="section-title">{sectionName}</h3>
        <div class="section-fields">
    {/if}

    {#each sectionFields as field (field.id)}
      {#if field.type === 'section'}
        <div class="form-section-header">
          <h4>{field.label}</h4>
          {#if field.description}
            <p class="section-description">{field.description}</p>
          {/if}
        </div>
      {:else if field.type === 'divider'}
        <hr class="form-divider" />
      {:else}
        <div class="form-field" class:required={field.required}>
          <svelte:component
            this={getFieldComponent(field.type)}
            {field}
            bind:value={form[field.name]}
            errors={errors[field.name]}
            constraints={constraints[field.name]}
          />
        </div>
      {/if}
    {/each}

    {#if sectionName !== 'default'}
        </div>
      </div>
    {/if}
  {/each}
</div>

<style>
  .dynamic-form {
    max-width: 800px;
    margin: 0 auto;
    padding: 1rem;
  }

  .form-section {
    margin-bottom: 2rem;
    padding: 1rem;
    border: 1px solid #e2e8f0;
    border-radius: 0.5rem;
  }

  .section-title {
    margin: 0 0 1rem 0;
    color: #1a202c;
    font-size: 1.25rem;
    font-weight: 600;
  }

  .form-field {
    margin-bottom: 1.5rem;
  }

  .form-field.required label::after {
    content: '*';
    color: #e53e3e;
    margin-left: 0.25rem;
  }

  .form-section-header h4 {
    margin: 1.5rem 0 0.5rem 0;
    color: #2d3748;
    font-size: 1.1rem;
    font-weight: 600;
  }

  .section-description {
    margin: 0.25rem 0 1rem 0;
    color: #4a5568;
    font-size: 0.9rem;
  }

  .form-divider {
    margin: 1.5rem 0;
    border: none;
    border-top: 1px solid #e2e8f0;
  }
</style>
```

## Form Context Management

### Context-Aware Form Usage

```typescript
// Performance Review Form Usage
const performanceReviewFormUrl = `/forms/${formId}?context=performance_review&entityId=${reviewId}`;

// Exit Interview Form Usage
const exitInterviewFormUrl = `/forms/${formId}?context=exit_interview&entityId=${processId}`;

// Onboarding Form Usage
const onboardingFormUrl = `/forms/${formId}?context=onboarding&entityId=${employeeId}`;
```

### Context-Specific Form Loader

```typescript
// src/lib/forms/context-loader.ts
export class FormContextLoader {
	static async loadContextualForm(
		contextType: string,
		entityId: string,
		formType?: string
	): Promise<Form> {
		// Get appropriate form for context
		const contextResponse = await formsApi.getFormForContext(contextType, entityId, formType);

		if (!contextResponse.success) {
			// Fallback to default form for context type
			return this.loadDefaultFormForContext(contextType);
		}

		return contextResponse.data;
	}

	static async loadDefaultFormForContext(contextType: string): Promise<Form> {
		const templatesResponse = await formsApi.getFormTemplates();

		if (!templatesResponse.success) {
			throw new Error('Failed to load form templates');
		}

		// Find appropriate template for context
		const template = templatesResponse.data.find(
			(t) => t.category === contextType || t.name.toLowerCase().includes(contextType.toLowerCase())
		);

		if (!template) {
			throw new Error(`No template found for context: ${contextType}`);
		}

		// Create form from template
		const formResponse = await formsApi.createFormFromTemplate(template.id);

		if (!formResponse.success) {
			throw new Error('Failed to create form from template');
		}

		return formResponse.data;
	}
}
```

## Example Implementations

### 1. Performance Review Form

```svelte
<!-- src/routes/performance/reviews/[reviewId]/form/+page.svelte -->
<script lang="ts">
	import { superForm } from 'sveltekit-superforms/client';
	import { zodClient } from 'sveltekit-superforms/adapters';
	import { DynamicForm } from '$lib/forms/components';
	import { createFormSchema } from '$lib/forms/builders';

	export let data;

	$: formSchema = createFormSchema(data.form.form_schema);
	$: formStore = superForm(data.formData, {
		validators: zodClient(formSchema),
		onUpdate: ({ form }) => {
			// Auto-save draft every 30 seconds
			saveDraft(form.data);
		},
		onResult: ({ result, update }) => {
			if (result.type === 'success') {
				// Redirect to review summary
				goto(`/performance/reviews/${data.reviewId}/summary`);
			} else {
				update();
			}
		}
	});

	const { form, errors, constraints, enhance, submitting } = formStore;

	function saveDraft(formData: any) {
		// Save form data as draft
		fetch(`/api/performance/reviews/${data.reviewId}/draft`, {
			method: 'PUT',
			body: JSON.stringify(formData),
			headers: { 'Content-Type': 'application/json' }
		});
	}
</script>

<div class="performance-review-form">
	<div class="form-header">
		<h1>Performance Review</h1>
		<div class="review-info">
			<p><strong>Employee:</strong> {data.reviewee.full_name}</p>
			<p><strong>Review Period:</strong> {data.review.period}</p>
			<p><strong>Reviewer:</strong> {data.reviewer.full_name}</p>
		</div>
	</div>

	<form method="POST" use:enhance>
		<DynamicForm
			schema={data.form.form_schema}
			bind:form={$form}
			errors={$errors}
			constraints={$constraints}
		/>

		<div class="form-actions">
			<button type="button" onclick="saveDraft($form)"> Save Draft </button>
			<button type="submit" disabled={$submitting}>
				{$submitting ? 'Submitting...' : 'Submit Review'}
			</button>
		</div>
	</form>
</div>
```

### 2. Dynamic Form Builder/Editor

```svelte
<!-- src/routes/forms/builder/+page.svelte -->
<script lang="ts">
	import { writable } from 'svelte/store';
	import type { FormSchema, FormField } from '$lib/forms/types';
	import { FieldEditor, FormPreview } from '$lib/forms/components';

	let formSchema: FormSchema = {
		fields: [],
		validation_rules: []
	};

	const selectedField = writable<FormField | null>(null);

	function addField(fieldType: FieldType) {
		const newField: FormField = {
			id: `field_${Date.now()}`,
			name: `field_${formSchema.fields.length + 1}`,
			type: fieldType,
			label: `New ${fieldType} Field`,
			required: false
		};

		formSchema.fields = [...formSchema.fields, newField];
		$selectedField = newField;
	}

	function removeField(fieldId: string) {
		formSchema.fields = formSchema.fields.filter((f) => f.id !== fieldId);
		if ($selectedField?.id === fieldId) {
			$selectedField = null;
		}
	}

	function updateField(updatedField: FormField) {
		const index = formSchema.fields.findIndex((f) => f.id === updatedField.id);
		if (index !== -1) {
			formSchema.fields[index] = updatedField;
			formSchema = { ...formSchema }; // Trigger reactivity
		}
	}

	async function saveFormTemplate() {
		const templateData = {
			name: formName,
			category: formCategory,
			template_schema: formSchema,
			description: formDescription
		};

		const response = await fetch('/api/forms/templates', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify(templateData)
		});

		if (response.ok) {
			// Redirect to templates list
			goto('/forms/templates');
		}
	}

	let formName = '';
	let formCategory = '';
	let formDescription = '';
</script>

<div class="form-builder">
	<div class="builder-header">
		<h1>Form Builder</h1>
		<div class="form-meta">
			<input bind:value={formName} placeholder="Form Name" />
			<select bind:value={formCategory}>
				<option value="">Select Category</option>
				<option value="hr">HR</option>
				<option value="performance">Performance</option>
				<option value="onboarding">Onboarding</option>
			</select>
		</div>
	</div>

	<div class="builder-content">
		<div class="builder-sidebar">
			<h3>Add Fields</h3>
			<div class="field-buttons">
				<button onclick={() => addField('text')}>Text Input</button>
				<button onclick={() => addField('textarea')}>Text Area</button>
				<button onclick={() => addField('email')}>Email</button>
				<button onclick={() => addField('number')}>Number</button>
				<button onclick={() => addField('date')}>Date</button>
				<button onclick={() => addField('select')}>Select</button>
				<button onclick={() => addField('radio')}>Radio</button>
				<button onclick={() => addField('checkbox')}>Checkbox</button>
			</div>

			{#if $selectedField}
				<FieldEditor
					field={$selectedField}
					on:update={(e) => updateField(e.detail)}
					on:remove={(e) => removeField(e.detail.id)}
				/>
			{/if}
		</div>

		<div class="builder-preview">
			<h3>Preview</h3>
			<FormPreview {formSchema} />
		</div>
	</div>

	<div class="builder-actions">
		<button onclick={saveFormTemplate} disabled={!formName || !formCategory}>
			Save Template
		</button>
	</div>
</div>
```

## Best Practices

### 1. Schema Design

- **Use consistent field naming**: Follow camelCase or snake_case consistently
- **Provide clear labels and help text**: Make forms user-friendly
- **Group related fields**: Use sections to organize complex forms
- **Set appropriate validation**: Balance user experience with data quality

### 2. Error Handling

```typescript
// Comprehensive error handling
const { form, errors, enhance } = superForm(data.formData, {
	validators: zodClient(formSchema),
	onError: ({ result, message }) => {
		// Handle different error types
		if (result.status === 422) {
			// Validation errors - already handled by SuperForms
			console.log('Validation failed');
		} else if (result.status >= 500) {
			// Server errors
			showNotification('Server error. Please try again later.', 'error');
		} else {
			// Other errors
			showNotification(message.text || 'An error occurred', 'error');
		}
	},
	onResult: ({ result }) => {
		if (result.type === 'success') {
			showNotification('Form submitted successfully!', 'success');
		}
	}
});
```

### 3. Performance Optimization

- **Lazy load form schemas**: Only fetch when needed
- **Cache form templates**: Store frequently used templates
- **Debounce auto-save**: Prevent excessive API calls
- **Virtual scrolling**: For forms with many fields

### 4. Accessibility

```svelte
<!-- Accessible form field example -->
<div class="form-field" class:has-error={errors?.[field.name]}>
	<label for={field.id} class:required={field.required}>
		{field.label}
	</label>

	{#if field.description}
		<p id="{field.id}_help" class="field-description">
			{field.description}
		</p>
	{/if}

	<input
		id={field.id}
		name={field.name}
		type={field.type}
		bind:value={form[field.name]}
		required={field.required}
		aria-describedby="{field.id}_help {errors?.[field.name] ? field.id + '_error' : ''}"
		aria-invalid={errors?.[field.name] ? 'true' : 'false'}
	/>

	{#if errors?.[field.name]}
		<div id="{field.id}_error" class="field-error" role="alert">
			{errors[field.name].join(', ')}
		</div>
	{/if}
</div>
```

### 5. Testing

```typescript
// src/lib/forms/__tests__/schema-builder.test.ts
import { describe, it, expect } from 'vitest';
import { createFormSchema } from '../builders/schema-builder';

describe('Form Schema Builder', () => {
	it('creates valid Zod schema from form definition', () => {
		const formSchema = {
			fields: [
				{
					id: '1',
					name: 'email',
					type: 'email' as const,
					label: 'Email',
					required: true
				},
				{
					id: '2',
					name: 'age',
					type: 'number' as const,
					label: 'Age',
					required: false,
					validation: { minValue: 18, maxValue: 100 }
				}
			]
		};

		const zodSchema = createFormSchema(formSchema);

		// Valid data
		const validData = { email: 'test@example.com', age: 25 };
		expect(zodSchema.parse(validData)).toEqual(validData);

		// Invalid email
		expect(() => zodSchema.parse({ email: 'invalid', age: 25 })).toThrow('Invalid email');

		// Age too low
		expect(() => zodSchema.parse({ email: 'test@example.com', age: 17 })).toThrow(
			'Minimum value: 18'
		);
	});
});
```

## Summary

This forms system provides a powerful, flexible foundation for building dynamic forms in your SvelteKit application. The combination of:

- **Backend form schemas** for definition and validation
- **Zod schemas** for runtime validation and TypeScript types
- **SuperForms** for reactive state management
- **Dynamic components** for rendering

Creates a robust system that can handle everything from simple contact forms to complex multi-step processes like performance reviews and onboarding workflows.

The key is to start with the simpler patterns and gradually build up to more complex implementations as your needs grow.
