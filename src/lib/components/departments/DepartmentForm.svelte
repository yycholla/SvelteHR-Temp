<script lang="ts">
	import { onMount } from 'svelte';
	import { departmentService, departments } from '$lib/services/departmentService';
	import { userService, users } from '$lib/services/userService';
	import Button from '../base/Button.svelte';
	import Input from '../base/Input.svelte';
	import Textarea from '../base/Textarea.svelte';
	import Select from '../base/Select.svelte';
	import Card from '../base/Card.svelte';
	import type { CreateDepartmentInput, Department, UpdateDepartmentInput } from '$lib/types';

	// Props
	const {
		department = null,
		mode = 'create',
		showCancel = true,
		onsubmit = undefined,
		oncancel = undefined
	}: {
		department?: Department | null;
		mode?: 'create' | 'edit';
		showCancel?: boolean;
		onsubmit?: ((detail: Department) => void) | undefined;
		oncancel?: (() => void) | undefined;
	} = $props();

	// Form data
	const formData = $state({
		name: department?.name || '',
		code: department?.code || '',
		description: department?.description || '',
		parentDepartmentId: department?.parentDepartment?.id || '',
		managerId: department?.manager?.id || '',
		budgetLimit: department?.budgetLimit || null,
		costCenter: department?.costCenter || '',
		location: department?.location || '',
		isRemoteEnabled: department?.isRemoteEnabled || false
	});

	let isSubmitting = $state(false);
	let errors = $state<Record<string, string>>({});

	// Options for dropdowns
	const parentOptions = $derived([
		{ value: '', label: 'No Parent (Root Department)' },
		...$departments
			.filter((dept) => dept.id !== department?.id) // Don't include self as parent
			.map((dept) => ({ value: dept.id, label: dept.name }))
	]);

	const managerOptions = $derived([
		{ value: '', label: 'No Manager Assigned' },
		...$users.map((user: { id: string; display_name?: string; firstName?: string; lastName?: string }) => ({
			value: user.id,
			label: user.display_name || `${user.firstName || ''} ${user.lastName || ''}`.trim()
		}))
	]);

	function validateForm(): boolean {
		errors = {};

		if (!formData.name.trim()) {
			errors.name = 'Department name is required';
		}

		if (!formData.code.trim()) {
			errors.code = 'Department code is required';
		} else if (formData.code.length < 2) {
			errors.code = 'Department code must be at least 2 characters';
		}

		if (formData.budgetLimit && formData.budgetLimit < 0) {
			errors.budgetLimit = 'Budget limit must be positive';
		}

		return Object.keys(errors).length === 0;
	}

	async function handleSubmit(event: Event) {
		event.preventDefault();
		if (!validateForm()) return;

		isSubmitting = true;

		try {
			let result: Department;

			if (mode === 'create') {
				const input: CreateDepartmentInput = {
					name: formData.name.trim(),
					code: formData.code.trim().toUpperCase(),
					description: formData.description.trim() || undefined,
					parentDepartmentId: formData.parentDepartmentId || undefined,
					managerId: formData.managerId || undefined,
					budgetLimit: formData.budgetLimit || undefined,
					costCenter: formData.costCenter.trim() || undefined,
					location: formData.location.trim() || undefined,
					isRemoteEnabled: formData.isRemoteEnabled
				};

				result = await departmentService.createDepartment(input);
			} else {
				const input: UpdateDepartmentInput = {
					name: formData.name.trim(),
					code: formData.code.trim().toUpperCase(),
					description: formData.description.trim() || undefined,
					parentDepartmentId: formData.parentDepartmentId || undefined,
					managerId: formData.managerId || undefined,
					budgetLimit: formData.budgetLimit || undefined,
					costCenter: formData.costCenter.trim() || undefined,
					location: formData.location.trim() || undefined,
					isRemoteEnabled: formData.isRemoteEnabled
				};

				result = await departmentService.updateDepartment(department!.id, input);
			}

			onsubmit?.(result);
		} catch (error: any) {
			errors.submit = error.message || `Failed to ${mode} department`;
		} finally {
			isSubmitting = false;
		}
	}

	function handleCancel() {
		oncancel?.();
	}

	// Load data on mount
	onMount(() => {
		departmentService.loadDepartments({ reset: true });
		userService.loadUsers({ reset: true });
	});
</script>

<Card padding="lg" class="department-form">
	<div class="form-header">
		<h2 class="text-xl font-semibold text-gray-900">
			{mode === 'create' ? 'Create Department' : 'Edit Department'}
		</h2>
		<p class="text-sm text-gray-600">
			{mode === 'create'
				? 'Set up a new department in your organization'
				: 'Update department information and settings'}
		</p>
	</div>

	<form onsubmit={handleSubmit} class="form-content">
		<div class="form-grid">
			<!-- Basic Information -->
			<div class="form-section">
				<h3 class="section-title">Basic Information</h3>

				<div class="input-group">
					<Input
						label="Department Name"
						bind:value={formData.name}
						error={errors.name}
						placeholder="e.g., Engineering, Marketing"
						required
					/>
				</div>

				<div class="input-group">
					<Input
						label="Department Code"
						bind:value={formData.code}
						error={errors.code}
						placeholder="e.g., ENG, MKT"
						help="Unique identifier for the department"
						required
					/>
				</div>

				<div class="input-group">
					<Textarea
						label="Description"
						bind:value={formData.description}
						placeholder="Brief description of the department's purpose and responsibilities"
						rows={3}
					/>
				</div>
			</div>

			<!-- Hierarchy & Management -->
			<div class="form-section">
				<h3 class="section-title">Hierarchy & Management</h3>

				<div class="input-group">
					<Select
						label="Parent Department"
						options={parentOptions}
						bind:value={formData.parentDepartmentId}
						placeholder="Select parent department"
						help="Choose the parent department in the organizational hierarchy"
					/>
				</div>

				<div class="input-group">
					<Select
						label="Department Manager"
						options={managerOptions}
						bind:value={formData.managerId}
						placeholder="Select department manager"
						help="Employee responsible for managing this department"
					/>
				</div>
			</div>

			<!-- Budget & Operations -->
			<div class="form-section">
				<h3 class="section-title">Budget & Operations</h3>

				<div class="input-group">
					<Input
						type="number"
						label="Budget Limit"
						bind:value={formData.budgetLimit}
						error={errors.budgetLimit}
						placeholder="0"
						help="Annual budget limit in dollars"
						step="1000"
					/>
				</div>

				<div class="input-group">
					<Input
						label="Cost Center"
						bind:value={formData.costCenter}
						placeholder="e.g., CC-001"
						help="Cost center code for financial tracking"
					/>
				</div>

				<div class="input-group">
					<Input
						label="Location"
						bind:value={formData.location}
						placeholder="e.g., New York Office, Remote"
						help="Primary location or office for this department"
					/>
				</div>

				<div class="input-group">
					<label class="checkbox-group">
						<input type="checkbox" bind:checked={formData.isRemoteEnabled} class="checkbox" />
						<span class="checkbox-label">Remote work enabled</span>
						<span class="checkbox-help">Allow employees in this department to work remotely</span>
					</label>
				</div>
			</div>
		</div>

		{#if errors.submit}
			<div class="form-error">
				<i class="icon-alert-circle h-5 w-5 text-red-500"></i>
				<span class="error-text">{errors.submit}</span>
			</div>
		{/if}

		<div class="form-actions">
			{#if showCancel}
				<Button
					type="button"
					variant="secondary"
					size="md"
					onclick={handleCancel}
					disabled={isSubmitting}
				>
					Cancel
				</Button>
			{/if}

			<Button
				type="submit"
	variant="primary"
				size="md"
				loading={isSubmitting}
				leftIcon={mode === 'create' ? 'plus' : 'save'}
			>
				{mode === 'create' ? 'Create Department' : 'Save Changes'}
			</Button>
		</div>
	</form>
</Card>
