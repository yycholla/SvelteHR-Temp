<script lang="ts">
	/**
	 * Form Field Editor Dialog
	 * Dialog for adding or editing individual form field definitions
	 */
	import * as Dialog from '$lib/components/ui/dialog';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import { Textarea } from '$lib/components/ui/textarea';
	import { Checkbox } from '$lib/components/ui/checkbox';
	import { Settings2, Plus } from '@lucide/svelte';
	import type { FormFieldDefinition, FormFieldType } from '$lib/graphql/form-operations';

	interface Props {
		open: boolean;
		field?: FormFieldDefinition | null;
		existingFieldNames?: string[];
		onSave: (field: FormFieldDefinition) => void;
		onCancel: () => void;
	}

	let {
		open = $bindable(false),
		field = null,
		existingFieldNames = [],
		onSave,
		onCancel
	}: Props = $props();

	// Field types with descriptions
	const fieldTypes: { value: FormFieldType; label: string; description: string }[] = [
		{ value: 'TEXT', label: 'Text', description: 'Single-line text input' },
		{ value: 'EMAIL', label: 'Email', description: 'Email address with validation' },
		{ value: 'PHONE', label: 'Phone', description: 'Phone number input' },
		{ value: 'TEXTAREA', label: 'Text Area', description: 'Multi-line text input' },
		{ value: 'NUMBER', label: 'Number', description: 'Numeric input' },
		{ value: 'DATE', label: 'Date', description: 'Date picker' },
		{ value: 'SELECT', label: 'Dropdown', description: 'Dropdown selection' },
		{ value: 'CHECKBOX', label: 'Checkbox', description: 'Checkbox input' }
	];

	// Form state
	let name = $state('');
	let label = $state('');
	let type = $state<FormFieldType>('TEXT');
	let required = $state(false);
	let placeholder = $state('');

	// Validation state
	let minLength = $state<number | undefined>(undefined);
	let maxLength = $state<number | undefined>(undefined);
	let min = $state<number | undefined>(undefined);
	let max = $state<number | undefined>(undefined);
	let pattern = $state('');
	let options = $state<string[]>([]);
	let newOption = $state('');

	// Error state
	let formErrors = $state<Record<string, string>>({});

	// Initialize form when field changes
	$effect(() => {
		if (field) {
			name = field.name;
			label = field.label;
			type = field.type;
			required = field.required ?? false;
			placeholder = field.placeholder ?? '';

			// Initialize validation
			if (field.validation) {
				minLength = field.validation.minLength;
				maxLength = field.validation.maxLength;
				min = field.validation.min;
				max = field.validation.max;
				pattern = field.validation.pattern ?? '';
				options = field.validation.options ? [...field.validation.options] : [];
			}
		} else {
			resetForm();
		}
	});

	// Validation helpers
	const isTextType = $derived(['TEXT', 'TEXTAREA', 'EMAIL', 'PHONE'].includes(type));
	const isNumberType = $derived(type === 'NUMBER');
	const isDateType = $derived(type === 'DATE');
	const isSelectType = $derived(type === 'SELECT');

	function validateForm(): boolean {
		const errors: Record<string, string> = {};

		// Validate name (required, alphanumeric + underscore)
		if (!name.trim()) {
			errors.name = 'Field name is required';
		} else if (!/^[a-zA-Z][a-zA-Z0-9_]*$/.test(name)) {
			errors.name = 'Field name must start with a letter and contain only letters, numbers, and underscores';
		} else if (existingFieldNames.includes(name) && name !== field?.name) {
			errors.name = 'A field with this name already exists';
		}

		// Validate label
		if (!label.trim()) {
			errors.label = 'Field label is required';
		}

		// Validate SELECT options
		if (isSelectType && options.length === 0) {
			errors.options = 'At least one option is required for dropdown fields';
		}

		// Validate number range
		if (isNumberType && min !== undefined && max !== undefined && min > max) {
			errors.min = 'Minimum value cannot be greater than maximum value';
		}

		formErrors = errors;
		return Object.keys(errors).length === 0;
	}

	function handleSave() {
		if (!validateForm()) {
			return;
		}

		// Build validation object based on field type
		const validation: FormFieldDefinition['validation'] = {};

		if (isTextType) {
			if (minLength !== undefined) validation.minLength = minLength;
			if (maxLength !== undefined) validation.maxLength = maxLength;
			if (pattern) validation.pattern = pattern;
		}

		if (isNumberType || isDateType) {
			if (min !== undefined) validation.min = min;
			if (max !== undefined) validation.max = max;
		}

		if (isSelectType) {
			validation.options = [...options];
		}

		const fieldDefinition: FormFieldDefinition = {
			name: name.trim(),
			label: label.trim(),
			type,
			required,
			placeholder: placeholder.trim() || undefined,
			validation: Object.keys(validation).length > 0 ? validation : undefined
		};

		onSave(fieldDefinition);
		resetForm();
		open = false;
	}

	function handleCancel() {
		resetForm();
		onCancel();
		open = false;
	}

	function resetForm() {
		name = '';
		label = '';
		type = 'TEXT';
		required = false;
		placeholder = '';
		minLength = undefined;
		maxLength = undefined;
		min = undefined;
		max = undefined;
		pattern = '';
		options = [];
		newOption = '';
		formErrors = {};
	}

	// Options management for SELECT type
	function addOption() {
		const trimmed = newOption.trim();
		if (trimmed && !options.includes(trimmed)) {
			options = [...options, trimmed];
			newOption = '';
		}
	}

	function removeOption(index: number) {
		options = options.filter((_, i) => i !== index);
	}

	// Clear validation when type changes
	$effect(() => {
		// Reset validation when field type changes
		minLength = undefined;
		maxLength = undefined;
		min = undefined;
		max = undefined;
		pattern = '';
		if (!isSelectType) {
			options = [];
		}
	});
</script>

<Dialog.Root bind:open>
	<Dialog.Content class="max-w-2xl max-h-[90vh] overflow-y-auto">
		<Dialog.Header>
			<div class="flex items-center gap-3">
				<div class="rounded-lg bg-primary/10 p-2">
					{#if field}
						<Settings2 class="h-5 w-5 text-primary" />
					{:else}
						<Plus class="h-5 w-5 text-primary" />
					{/if}
				</div>
				<div>
					<Dialog.Title>{field ? 'Edit' : 'Add'} Form Field</Dialog.Title>
					<Dialog.Description>
						{field ? 'Update' : 'Configure'} the field settings and validation rules
					</Dialog.Description>
				</div>
			</div>
		</Dialog.Header>

		<div class="space-y-6">
			<!-- Field Type -->
			<div class="space-y-2">
				<Label for="fieldType">
					Field Type <span class="text-destructive">*</span>
				</Label>
				<select
					id="fieldType"
					bind:value={type}
					class="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
				>
					{#each fieldTypes as fieldType}
						<option value={fieldType.value}>
							{fieldType.label} - {fieldType.description}
						</option>
					{/each}
				</select>
			</div>

			<!-- Basic Settings -->
			<div class="space-y-4 border-t pt-4">
				<h3 class="text-sm font-medium">Basic Settings</h3>

				<!-- Field Name (Internal) -->
				<div class="space-y-2">
					<Label for="fieldName">
						Field Name (Internal) <span class="text-destructive">*</span>
					</Label>
					<Input
						id="fieldName"
						bind:value={name}
						placeholder="e.g., firstName, emergencyContact"
						class={formErrors.name ? 'border-destructive' : ''}
					/>
					{#if formErrors.name}
						<p class="text-sm text-destructive">{formErrors.name}</p>
					{:else}
						<p class="text-sm text-muted-foreground">
							Used to identify this field in the data. Must start with a letter.
						</p>
					{/if}
				</div>

				<!-- Field Label (Display) -->
				<div class="space-y-2">
					<Label for="fieldLabel">
						Field Label <span class="text-destructive">*</span>
					</Label>
					<Input
						id="fieldLabel"
						bind:value={label}
						placeholder="e.g., First Name, Emergency Contact"
						class={formErrors.label ? 'border-destructive' : ''}
					/>
					{#if formErrors.label}
						<p class="text-sm text-destructive">{formErrors.label}</p>
					{:else}
						<p class="text-sm text-muted-foreground">Shown to users filling out the form</p>
					{/if}
				</div>

				<!-- Placeholder -->
				<div class="space-y-2">
					<Label for="fieldPlaceholder">Placeholder</Label>
					<Input id="fieldPlaceholder" bind:value={placeholder} placeholder="e.g., Enter your name" />
					<p class="text-sm text-muted-foreground">Optional hint text shown in the field</p>
				</div>

				<!-- Required Checkbox -->
				<div class="flex items-center space-x-2">
					<Checkbox id="fieldRequired" bind:checked={required} />
					<Label for="fieldRequired" class="font-normal">Required field</Label>
				</div>
			</div>

			<!-- Validation Settings (Conditional) -->
			{#if isTextType || isNumberType || isDateType || isSelectType}
				<div class="space-y-4 border-t pt-4">
					<h3 class="text-sm font-medium">Validation Rules</h3>

					<!-- Text-based validation -->
					{#if isTextType}
						<div class="grid gap-4 md:grid-cols-2">
							<div class="space-y-2">
								<Label for="minLength">Minimum Length</Label>
								<Input
									id="minLength"
									type="number"
									bind:value={minLength}
									placeholder="e.g., 2"
									min="0"
								/>
							</div>
							<div class="space-y-2">
								<Label for="maxLength">Maximum Length</Label>
								<Input
									id="maxLength"
									type="number"
									bind:value={maxLength}
									placeholder="e.g., 50"
									min="0"
								/>
							</div>
						</div>

						<div class="space-y-2">
							<Label for="pattern">Pattern (Regex)</Label>
							<Input
								id="pattern"
								bind:value={pattern}
								placeholder="e.g., ^[A-Z][a-z]+ for capitalized words"
							/>
							<p class="text-sm text-muted-foreground">
								Optional regular expression for custom validation
							</p>
						</div>
					{/if}

					<!-- Number/Date validation -->
					{#if isNumberType || isDateType}
						<div class="grid gap-4 md:grid-cols-2">
							<div class="space-y-2">
								<Label for="min">
									{isNumberType ? 'Minimum Value' : 'Minimum Date'}
								</Label>
								<Input
									id="min"
									type={isNumberType ? 'number' : 'date'}
									bind:value={min}
									placeholder={isNumberType ? 'e.g., 0' : ''}
								/>
							</div>
							<div class="space-y-2">
								<Label for="max">
									{isNumberType ? 'Maximum Value' : 'Maximum Date'}
								</Label>
								<Input
									id="max"
									type={isNumberType ? 'number' : 'date'}
									bind:value={max}
									placeholder={isNumberType ? 'e.g., 100' : ''}
									class={formErrors.min ? 'border-destructive' : ''}
								/>
								{#if formErrors.min}
									<p class="text-sm text-destructive">{formErrors.min}</p>
								{/if}
							</div>
						</div>
					{/if}

					<!-- SELECT options -->
					{#if isSelectType}
						<div class="space-y-3">
							<Label>
								Options <span class="text-destructive">*</span>
							</Label>

							<!-- Options list -->
							{#if options.length > 0}
								<div class="space-y-2">
									{#each options as option, index}
										<div class="flex items-center gap-2">
											<Input value={option} readonly class="flex-1" />
											<Button
												type="button"
												variant="ghost"
												size="sm"
												onclick={() => removeOption(index)}
											>
												Remove
											</Button>
										</div>
									{/each}
								</div>
							{:else}
								<p class="text-sm text-muted-foreground">No options added yet</p>
							{/if}

							<!-- Add option -->
							<div class="flex gap-2">
								<Input
									bind:value={newOption}
									placeholder="Enter option text"
									class="flex-1"
									onkeydown={(e) => {
										if (e.key === 'Enter') {
											e.preventDefault();
											addOption();
										}
									}}
								/>
								<Button type="button" onclick={addOption}>Add Option</Button>
							</div>

							{#if formErrors.options}
								<p class="text-sm text-destructive">{formErrors.options}</p>
							{/if}
						</div>
					{/if}
				</div>
			{/if}
		</div>

		<!-- Form Actions -->
		<Dialog.Footer>
			<Button type="button" variant="outline" onclick={handleCancel}>Cancel</Button>
			<Button type="button" onclick={handleSave}>
				{field ? 'Update' : 'Add'} Field
			</Button>
		</Dialog.Footer>
	</Dialog.Content>
</Dialog.Root>
