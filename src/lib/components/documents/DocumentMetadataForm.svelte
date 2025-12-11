<script lang="ts">
	// DocumentMetadataForm component (Feature 024)
	import { logger } from '$lib/utils/logger';
	// Form for editing document metadata with validation

	import type {
		DocumentCategoryType,
		DocumentMetadata,
		SensitivityLevel
	} from '$lib/types/document';
	import { documentMetadataSchema } from '$lib/schemas/documentSchemas';
	import NativeSelect from '$lib/components/ui/native-select/native-select.svelte';
	import NativeSelectOption from '$lib/components/ui/native-select/native-select-option.svelte';
	import MultiSearchInput from '$lib/components/ui/tag-input/MultiSearchInput.svelte';

	interface Props {
		metadata?: DocumentMetadata;
		assignedEmployeeIds?: string[];
		employeeOptions?: Array<{ value: string; label: string }>;
		onSubmit?: (metadata: DocumentMetadata) => void;
		onCancel?: () => void;
		isSubmitting?: boolean;
		hasRequiredFields?: boolean;
		metadataValid?: boolean;
		showEmployeeAssignment?: boolean;
	}

	let {
		metadata = $bindable({
			filename: '',
			category: 'Other',
			sensitivityLevel: 'Internal',
			metadataTags: {},
			assignToEmployees: [],
			assignToDepartments: []
		}),
		assignedEmployeeIds = $bindable<string[]>([]),
		employeeOptions = [],
		onSubmit = () => {},
		onCancel = () => {},
		isSubmitting = false,
		hasRequiredFields = $bindable(false),
		metadataValid = $bindable(false),
		showEmployeeAssignment = true
	}: Props = $props();

	// Svelte 5 state
	let errors = $state<Record<string, string>>({});
	let touched = $state<Record<string, boolean>>({});
	let description = $state<string>((metadata.metadataTags?.description as string) || '');
	let expirationDateStr = $state<string>(''); // HTML date input value (YYYY-MM-DD)

	// Sync description with metadataTags
	$effect(() => {
		if (!metadata.metadataTags) {
			metadata.metadataTags = {};
		}
		metadata.metadataTags.description = description;
	});

	// Sync assignedEmployeeIds with metadata.assignToEmployees
	$effect(() => {
		metadata.assignToEmployees = assignedEmployeeIds;
	});

	// Convert expirationDateStr to Date object for metadata
	$effect(() => {
		if (expirationDateStr) {
			// Convert string to Date object for Zod validation
			metadata.expirationDate = new Date(expirationDateStr + 'T00:00:00');
		} else {
			metadata.expirationDate = undefined;
		}
	});

	// Update bindable props when metadata or errors change
	$effect(() => {
		hasRequiredFields = !!metadata.category && !!metadata.sensitivityLevel;
		metadataValid = Object.keys(errors).length === 0 && hasRequiredFields;
		logger.info('[DocumentMetadataForm] hasRequiredFields updated:', { hasRequiredFields });
		logger.info('[DocumentMetadataForm] category:', { category: metadata.category });
		logger.info('[DocumentMetadataForm] sensitivityLevel:', { sensitivityLevel: metadata.sensitivityLevel });
	});

	// Categories and sensitivity levels
	const categories: DocumentCategoryType[] = [
		'Contract',
		'Policy',
		'Report',
		'Invoice',
		'Certificate',
		'Payslip',
		'License',
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
	const isValid = $derived(Object.keys(errors).length === 0 && !!metadata.category);

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
			logger.info('[DocumentMetadataForm] validateMetadata called with:', {
				...metadata,
				expirationDate: metadata.expirationDate,
				expirationDateType: typeof metadata.expirationDate,
				expirationDateIsDate: metadata.expirationDate instanceof Date,
				expirationDateValue: metadata.expirationDate?.toString()
			});

			// Test 1: Validate schema itself with hardcoded data
			const testData = {
				filename: 'test.pdf',
				category: 'License',
				sensitivityLevel: 'Internal',
				metadataTags: {},
				assignToEmployees: [],
				assignToDepartments: []
			};

			logger.info('[DocumentMetadataForm] Testing schema with hardcoded data...');
			try {
				documentMetadataSchema.parse(testData);
				logger.info('[DocumentMetadataForm] ✅ Schema test with hardcoded data PASSED');
			} catch (testError: any) {
				logger.error(
					'[DocumentMetadataForm] ❌ Schema test with hardcoded data FAILED:',
					testError
				);
				logger.error('[DocumentMetadataForm] Test error stack:', testError.stack);
			}

			// Test 2: Try manual construction field by field
			const validationData = {
				filename: String(metadata.filename || ''),
				category: String(metadata.category || ''),
				sensitivityLevel: String(metadata.sensitivityLevel || ''),
				metadataTags: {},
				assignToEmployees: [],
				assignToDepartments: [],
				expirationDate: metadata.expirationDate ? new Date(metadata.expirationDate) : undefined
			};

			logger.info('[DocumentMetadataForm] Validating manually constructed object:', { validationData });
			logger.info('[DocumentMetadataForm] Field types:', {
				filenameType: typeof validationData.filename,
				categoryType: typeof validationData.category,
				sensitivityLevelType: typeof validationData.sensitivityLevel,
				metadataTagsType: typeof validationData.metadataTags,
				assignToEmployeesType: typeof validationData.assignToEmployees,
				assignToEmployeesIsArray: Array.isArray(validationData.assignToEmployees),
				expirationDateType: typeof validationData.expirationDate,
				expirationDateIsDate: validationData.expirationDate instanceof Date
			});

			documentMetadataSchema.parse(validationData);
			logger.info('[DocumentMetadataForm] ✅ Validation PASSED!');
			errors = {};
			return true;
		} catch (error: any) {
			logger.error('Catch failed', error as Error);
			logger.error('[DocumentMetadataForm] Error name:', { name: error.name });
			logger.error('[DocumentMetadataForm] Error message:', { message: error.message });
			logger.error('[DocumentMetadataForm] Error stack:', { stack: error.stack });
			if (error.errors) {
				logger.error('[DocumentMetadataForm] Zod errors:', JSON.stringify(error.errors, null, 2));
				errors = error.errors.reduce((acc: Record<string, string>, err: any) => {
					acc[err.path[0]] = err.message;
					return acc;
				}, {});
			}
			return false;
		}
	}

	// Expose metadata state
	export function getMetadataState() {
		return {
			isValid,
			hasRequiredFields: !!metadata.category && !!metadata.sensitivityLevel
		};
	}
</script>

<div class="metadata-form">
	<!-- Filename -->
	<div class="form-field">
		<label for="filename" class="field-label">
			Filename <span class="optional">(auto-populated from file)</span>
		</label>
		<input
			type="text"
			id="filename"
			bind:value={metadata.filename}
			class="field-input"
			placeholder="Document filename"
		/>
		<p class="field-hint">Auto-filled when you select a file</p>
	</div>

	<!-- Category -->
	<div class="form-field">
		<label for="category" class="field-label">
			Category <span class="required">*</span>
		</label>
		<NativeSelect
			id="category"
			bind:value={metadata.category}
			onblur={() => validateField('category')}
			class={touched.category && errors.category ? 'border-red-500' : ''}
			required
		>
			{#each categories as category}
				<NativeSelectOption value={category}>{category}</NativeSelectOption>
			{/each}
		</NativeSelect>
		{#if touched.category && errors.category}
			<p class="field-error">{errors.category}</p>
		{/if}
	</div>

	<!-- Sensitivity Level -->
	<div class="form-field">
		<label for="sensitivityLevel" class="field-label">
			Sensitivity Level <span class="required">*</span>
		</label>
		<NativeSelect
			id="sensitivityLevel"
			bind:value={metadata.sensitivityLevel}
			onblur={() => validateField('sensitivityLevel')}
			class={touched.sensitivityLevel && errors.sensitivityLevel ? 'border-red-500' : ''}
			required
		>
			{#each sensitivityLevels as level}
				<NativeSelectOption value={level.value}>
					{level.label} - {level.description}
				</NativeSelectOption>
			{/each}
		</NativeSelect>
		{#if touched.sensitivityLevel && errors.sensitivityLevel}
			<p class="field-error">{errors.sensitivityLevel}</p>
		{/if}
	</div>

	<!-- Expiration Date (optional) -->
	<div class="form-field">
		<label for="expirationDate" class="field-label">
			Expiration Date <span class="optional">(optional)</span>
		</label>
		<input
			type="date"
			id="expirationDate"
			bind:value={expirationDateStr}
			class="field-input"
			min={new Date().toISOString().split('T')[0]}
		/>
		<p class="field-hint">For time-sensitive documents (e.g., licenses, certificates)</p>
	</div>

	<!-- Assign to Employees (optional) -->
	{#if showEmployeeAssignment}
		<div class="form-field">
			<label for="assignEmployees" class="field-label">
				Assign to Employees <span class="optional">(optional)</span>
			</label>
			{#if employeeOptions.length > 0}
				<MultiSearchInput
					bind:searchTerms={assignedEmployeeIds}
					options={employeeOptions}
					placeholder="Search and select employees..."
					allowCustomTerms={false}
				/>
				<p class="field-hint">Document will be assigned to selected employees with read access</p>
			{:else}
				<p class="field-hint text-muted-foreground">Employee list is loading...</p>
			{/if}
		</div>
	{/if}

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
