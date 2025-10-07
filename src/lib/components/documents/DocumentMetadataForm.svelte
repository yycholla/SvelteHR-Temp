<script lang="ts">
	// DocumentMetadataForm component (Feature 024)
	// Form for editing document metadata with validation

	import type { DocumentMetadata, DocumentCategory, SensitivityLevel } from '$lib/types/document';
	import { documentMetadataSchema } from '$lib/schemas/documentSchemas';

	interface Props {
		metadata?: DocumentMetadata;
		onSubmit?: (metadata: DocumentMetadata) => void;
		onCancel?: () => void;
		isSubmitting?: boolean;
	}

	let {
		metadata = $bindable({
			filename: '',
			category: 'Other',
			sensitivity_level: 'Internal',
			description: ''
		}),
		onSubmit = () => {},
		onCancel = () => {},
		isSubmitting = false
	}: Props = $props();

	// Svelte 5 state
	let errors = $state<Record<string, string>>({});
	let touched = $state<Record<string, boolean>>({});

	// Categories and sensitivity levels
	const categories: DocumentCategory[] = [
		'Contract',
		'Policy',
		'Report',
		'Invoice',
		'Certificate',
		'Payslip',
		'Other'
	];

	const sensitivityLevels: { value: SensitivityLevel; label: string; description: string }[] = [
		{
			value: 'Public',
			label: 'Public',
			description: 'Can be shared externally'
		},
		{
			value: 'Internal',
			label: 'Internal',
			description: 'For internal use only'
		},
		{
			value: 'Confidential',
			label: 'Confidential',
			description: 'Restricted access required'
		},
		{
			value: 'Sensitive-PII',
			label: 'Sensitive (PII)',
			description: 'Contains personally identifiable information'
		}
	];

	// Derived validation state
	let isValid = $derived(Object.keys(errors).length === 0 && metadata.category !== '');
	let canSubmit = $derived(isValid && !isSubmitting);

	// Validate field
	function validateField(field: keyof DocumentMetadata) {
		touched[field] = true;

		try {
			documentMetadataSchema.parse(metadata);
			delete errors[field];
		} catch (error: any) {
			if (error.errors) {
				const fieldError = error.errors.find((e: any) => e.path[0] === field);
				if (fieldError) {
					errors[field] = fieldError.message;
				}
			}
		}
	}

	// Handle form submit
	function handleSubmit(event: Event) {
		event.preventDefault();

		// Mark all fields as touched
		touched = {
			filename: true,
			category: true,
			sensitivity_level: true,
			description: true
		};

		// Validate all fields
		try {
			const validatedData = documentMetadataSchema.parse(metadata);
			errors = {};
			onSubmit(validatedData);
		} catch (error: any) {
			if (error.errors) {
				errors = error.errors.reduce(
					(acc: Record<string, string>, err: any) => {
						acc[err.path[0]] = err.message;
						return acc;
					},
					{}
				);
			}
		}
	}

	// Handle cancel
	function handleCancel() {
		errors = {};
		touched = {};
		onCancel();
	}
</script>

<form class="metadata-form" onsubmit={handleSubmit}>
	<div class="form-header">
		<h3 class="form-title">Document Metadata</h3>
		<p class="form-description">Provide information about this document</p>
	</div>

	<!-- Category -->
	<div class="form-field">
		<label for="category" class="field-label">
			Category <span class="required">*</span>
		</label>
		<select
			id="category"
			bind:value={metadata.category}
			onblur={() => validateField('category')}
			class="field-input"
			class:error={touched.category && errors.category}
			required
		>
			<option value="">Select a category...</option>
			{#each categories as category}
				<option value={category}>{category}</option>
			{/each}
		</select>
		{#if touched.category && errors.category}
			<p class="field-error">{errors.category}</p>
		{/if}
	</div>

	<!-- Sensitivity Level -->
	<div class="form-field">
		<label for="sensitivity" class="field-label">
			Sensitivity Level <span class="required">*</span>
		</label>
		<div class="sensitivity-options">
			{#each sensitivityLevels as level}
				<label class="sensitivity-option">
					<input
						type="radio"
						name="sensitivity_level"
						value={level.value}
						bind:group={metadata.sensitivity_level}
						onchange={() => validateField('sensitivity_level')}
					/>
					<div class="sensitivity-content">
						<span class="sensitivity-label">{level.label}</span>
						<span class="sensitivity-description">{level.description}</span>
					</div>
				</label>
			{/each}
		</div>
		{#if touched.sensitivity_level && errors.sensitivity_level}
			<p class="field-error">{errors.sensitivity_level}</p>
		{/if}
	</div>

	<!-- Description (optional) -->
	<div class="form-field">
		<label for="description" class="field-label">
			Description <span class="optional">(optional)</span>
		</label>
		<textarea
			id="description"
			bind:value={metadata.description}
			onblur={() => validateField('description')}
			class="field-textarea"
			class:error={touched.description && errors.description}
			placeholder="Add a description or notes about this document..."
			rows="4"
		></textarea>
		{#if touched.description && errors.description}
			<p class="field-error">{errors.description}</p>
		{/if}
		<p class="field-hint">Maximum 500 characters</p>
	</div>

	<!-- Form actions -->
	<div class="form-actions">
		<button
			type="button"
			class="cancel-button"
			onclick={handleCancel}
			disabled={isSubmitting}
		>
			Cancel
		</button>
		<button
			type="submit"
			class="submit-button"
			disabled={!canSubmit}
		>
			{isSubmitting ? 'Saving...' : 'Save Metadata'}
		</button>
	</div>
</form>

<style>
	.metadata-form {
		width: 100%;
		max-width: 600px;
	}

	.form-header {
		margin-bottom: 2rem;
	}

	.form-title {
		font-size: 1.5rem;
		font-weight: 700;
		color: #2d3748;
		margin: 0 0 0.5rem 0;
	}

	.form-description {
		font-size: 0.875rem;
		color: #718096;
		margin: 0;
	}

	.form-field {
		margin-bottom: 1.5rem;
	}

	.field-label {
		display: block;
		font-size: 0.875rem;
		font-weight: 600;
		color: #2d3748;
		margin-bottom: 0.5rem;
	}

	.required {
		color: #f56565;
	}

	.optional {
		color: #a0aec0;
		font-weight: 400;
	}

	.field-input,
	.field-textarea {
		width: 100%;
		padding: 0.75rem;
		border: 1px solid #cbd5e0;
		border-radius: 4px;
		font-size: 0.875rem;
		font-family: inherit;
		transition: all 0.2s;
	}

	.field-input:focus,
	.field-textarea:focus {
		outline: none;
		border-color: #4299e1;
		box-shadow: 0 0 0 3px rgba(66, 153, 225, 0.1);
	}

	.field-input.error,
	.field-textarea.error {
		border-color: #f56565;
	}

	.field-textarea {
		resize: vertical;
		min-height: 100px;
	}

	.field-error {
		margin: 0.5rem 0 0 0;
		font-size: 0.75rem;
		color: #f56565;
	}

	.field-hint {
		margin: 0.5rem 0 0 0;
		font-size: 0.75rem;
		color: #a0aec0;
	}

	/* Sensitivity options */
	.sensitivity-options {
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
	}

	.sensitivity-option {
		display: flex;
		align-items: flex-start;
		gap: 0.75rem;
		padding: 1rem;
		border: 2px solid #e2e8f0;
		border-radius: 6px;
		cursor: pointer;
		transition: all 0.2s;
	}

	.sensitivity-option:hover {
		border-color: #cbd5e0;
		background: #f7fafc;
	}

	.sensitivity-option:has(input:checked) {
		border-color: #4299e1;
		background: #ebf8ff;
	}

	.sensitivity-option input[type='radio'] {
		margin-top: 0.25rem;
		cursor: pointer;
	}

	.sensitivity-content {
		flex: 1;
		display: flex;
		flex-direction: column;
		gap: 0.25rem;
	}

	.sensitivity-label {
		font-weight: 600;
		color: #2d3748;
		font-size: 0.875rem;
	}

	.sensitivity-description {
		font-size: 0.75rem;
		color: #718096;
	}

	/* Form actions */
	.form-actions {
		display: flex;
		gap: 1rem;
		justify-content: flex-end;
		margin-top: 2rem;
		padding-top: 1.5rem;
		border-top: 1px solid #e2e8f0;
	}

	.cancel-button,
	.submit-button {
		padding: 0.75rem 1.5rem;
		border: none;
		border-radius: 4px;
		font-size: 0.875rem;
		font-weight: 600;
		cursor: pointer;
		transition: all 0.2s;
	}

	.cancel-button {
		background: white;
		color: #4a5568;
		border: 1px solid #cbd5e0;
	}

	.cancel-button:hover:not(:disabled) {
		background: #f7fafc;
	}

	.submit-button {
		background: #4299e1;
		color: white;
	}

	.submit-button:hover:not(:disabled) {
		background: #3182ce;
	}

	.cancel-button:disabled,
	.submit-button:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}
</style>
