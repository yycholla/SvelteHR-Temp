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
		hasRequiredFields?: boolean;
		metadataValid?: boolean;
	}

	let {
		metadata = $bindable({
			filename: '',
			category: 'Other',
			sensitivityLevel: 'Internal',
			metadataTags: {}
		}),
		onSubmit = () => {},
		onCancel = () => {},
		isSubmitting = false,
		hasRequiredFields = $bindable(false),
		metadataValid = $bindable(false)
	}: Props = $props();

	// Svelte 5 state
	let errors = $state<Record<string, string>>({});
	let touched = $state<Record<string, boolean>>({});
	let description = $state<string>((metadata.metadataTags?.description as string) || '');

	// Sync description with metadataTags
	$effect(() => {
		if (!metadata.metadataTags) {
			metadata.metadataTags = {};
		}
		metadata.metadataTags.description = description;
	});

	// Update bindable props when metadata or errors change
	$effect(() => {
		hasRequiredFields = metadata.category !== '' && metadata.sensitivityLevel !== '';
		metadataValid = Object.keys(errors).length === 0 && hasRequiredFields;
		console.log('[DocumentMetadataForm] hasRequiredFields updated:', hasRequiredFields,
			'category:', metadata.category, 'sensitivityLevel:', metadata.sensitivityLevel);
	});

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

	// Expose validation function for parent component
	export function validateMetadata(): boolean {
		// Mark all fields as touched
		touched = {
			filename: true,
			category: true,
			sensitivityLevel: true
		};

		// Validate all fields
		try {
			documentMetadataSchema.parse(metadata);
			errors = {};
			return true;
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
			return false;
		}
	}

	// Expose metadata state
	export function getMetadataState() {
		return {
			isValid,
			hasRequiredFields: metadata.category !== '' && metadata.sensitivityLevel !== ''
		};
	}
</script>

<div class="metadata-form">
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
		<label for="sensitivityLevel" class="field-label">
			Sensitivity Level <span class="required">*</span>
		</label>
		<select
			id="sensitivityLevel"
			bind:value={metadata.sensitivityLevel}
			onblur={() => validateField('sensitivityLevel')}
			class="field-input"
			class:error={touched.sensitivityLevel && errors.sensitivityLevel}
			required
		>
			{#each sensitivityLevels as level}
				<option value={level.value}>
					{level.label} - {level.description}
				</option>
			{/each}
		</select>
		{#if touched.sensitivityLevel && errors.sensitivityLevel}
			<p class="field-error">{errors.sensitivityLevel}</p>
		{/if}
	</div>

	<!-- Description (optional) -->
	<div class="form-field">
		<label for="description" class="field-label">
			Description <span class="optional">(optional)</span>
		</label>
		<textarea
			id="description"
			bind:value={description}
			class="field-textarea"
			placeholder="Add a description or notes about this document..."
			rows="4"
		></textarea>
		<p class="field-hint">Maximum 500 characters</p>
	</div>
</div>

<style>
	.metadata-form {
		width: 100%;
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

	.field-input.error {
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
</style>
