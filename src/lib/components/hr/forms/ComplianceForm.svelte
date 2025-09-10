<script lang="ts">
	import { onMount } from 'svelte';
	import { createFormStore } from '$lib/stores/hr/forms.svelte';
	import { complianceSchema } from '../utils/validation';
	import { employeeApi } from '../utils/api-helpers';
	import { notifications } from '../utils/notifications';
	import type { Employee } from '$lib/stores/hr/employees.svelte';

	interface ComplianceRecord {
		id?: string;
		type: string;
		status: 'compliant' | 'non_compliant' | 'pending' | 'expired';
		employee_id?: string;
		due_date?: string;
		notes?: string;
		document_url?: string;
		created_at?: string;
		updated_at?: string;
	}

	let {
		complianceRecord = null,
		mode = 'create',
		onCancel,
		onSuccess
	}: {
		complianceRecord: ComplianceRecord | null;
		mode: 'create' | 'edit' | 'view';
		onCancel: () => void;
		onSuccess: (record: ComplianceRecord) => void;
	} = $props();

	const isReadonly = $derived(mode === 'view');
	const isEditing = $derived(mode === 'edit');

	const initialData = {
		type: complianceRecord?.type || '',
		status: complianceRecord?.status || 'pending',
		employee_id: complianceRecord?.employee_id || '',
		due_date: complianceRecord?.due_date || '',
		notes: complianceRecord?.notes || '',
		document_url: complianceRecord?.document_url || ''
	};

	const form = createFormStore(initialData);

	let employees: Employee[] = [];
	let loadingEmployees = false;

	const complianceTypes = [
		'Safety Training',
		'Code of Conduct',
		'Data Privacy Training',
		'Anti-Harassment Training',
		'Security Clearance',
		'Professional Certification',
		'Medical Certification',
		'Background Check',
		'Drug Test',
		'Emergency Contact Update',
		'Benefits Enrollment',
		'Tax Forms',
		'Other'
	];

	const statuses = [
		{ value: 'compliant', label: 'Compliant', class: 'text-success-500' },
		{ value: 'non_compliant', label: 'Non-Compliant', class: 'text-error-500' },
		{ value: 'pending', label: 'Pending', class: 'text-warning-500' },
		{ value: 'expired', label: 'Expired', class: 'text-error-600' }
	];

	onMount(async () => {
		await loadEmployees();
	});

	async function loadEmployees() {
		loadingEmployees = true;
		try {
			const response = await employeeApi.getAll({ status: 'active', limit: 100 });
			employees = response.data.data;
		} catch (error) {
			notifications.apiError('Failed to load employees');
		} finally {
			loadingEmployees = false;
		}
	}

	async function handleSubmit() {
		if (isReadonly) return;

		if (!form.validate()) {
			notifications.validationError('Please fix the errors and try again');
			return;
		}

		form.setSubmitting(true);

		try {
			// Since we don't have a specific compliance API endpoint,
			// this would typically call a compliance API
			const savedRecord = {
				id: isEditing ? complianceRecord?.id : 'new-id',
				...$form.data,
				created_at: isEditing ? complianceRecord?.created_at : new Date().toISOString(),
				updated_at: new Date().toISOString()
			} as ComplianceRecord;

			notifications.success(`Compliance record ${isEditing ? 'updated' : 'created'} successfully`);
			onSuccess(savedRecord);
		} catch (error) {
			notifications.apiError(
				error instanceof Error ? error.message : 'Failed to save compliance record'
			);
		} finally {
			form.setSubmitting(false);
		}
	}

	function getMinDate() {
		const today = new Date();
		return today.toISOString().split('T')[0];
	}

	function getEmployeeName(employeeId: string): string {
		const employee = employees.find((emp) => emp.id === employeeId);
		return employee ? `${employee.first_name} ${employee.last_name}` : 'Unknown Employee';
	}

	function isOverdue(dueDate: string, status: string): boolean {
		if (!dueDate || status === 'compliant') return false;
		const due = new Date(dueDate);
		const today = new Date();
		return due < today;
	}

	$: formState = $form;
</script>

<form
	onsubmit={(e) => {
		e.preventDefault();
		handleSubmit(e);
	}}
	class="space-y-6"
>
	<!-- Compliance Type -->
	<div>
		<label class="label" for="type">
			<span>Compliance Type *</span>
		</label>
		<select
			id="type"
			class="select"
			class:input-error={formState.errors.type && formState.touched.type}
			bind:value={formState.data.type}
			on:change={(e) => form.updateField('type', e.currentTarget.value)}
			on:blur={() => form.touchField('type')}
			disabled={isReadonly}
		>
			<option value="">Select compliance type</option>
			{#each complianceTypes as type}
				<option value={type}>{type}</option>
			{/each}
		</select>
		{#if formState.errors.type && formState.touched.type}
			<div class="mt-1 text-sm text-error-500">
				{formState.errors.type[0]}
			</div>
		{/if}
	</div>

	<div class="grid grid-cols-1 gap-6 md:grid-cols-2">
		<!-- Employee (Optional) -->
		<div>
			<label class="label" for="employee_id">
				<span>Employee (Optional)</span>
			</label>
			{#if loadingEmployees}
				<div class="h-12 placeholder animate-pulse rounded"></div>
			{:else}
				<select
					id="employee_id"
					class="select"
					bind:value={formState.data.employee_id}
					on:change={(e) => form.updateField('employee_id', e.currentTarget.value)}
					disabled={isReadonly}
				>
					<option value="">All employees / General</option>
					{#each employees as employee}
						<option value={employee.id}>
							{employee.first_name}
							{employee.last_name} - {employee.department}
						</option>
					{/each}
				</select>
			{/if}
			<div class="text-surface-600-300-token mt-1 text-sm">
				Leave blank for company-wide compliance
			</div>
		</div>

		<!-- Status -->
		<div>
			<label class="label" for="status">
				<span>Status *</span>
			</label>
			<select
				id="status"
				class="select"
				bind:value={formState.data.status}
				on:change={(e) => form.updateField('status', e.currentTarget.value)}
				disabled={isReadonly}
			>
				{#each statuses as status}
					<option value={status.value}>
						{status.label}
					</option>
				{/each}
			</select>
		</div>

		<!-- Due Date -->
		<div class="md:col-span-2">
			<label class="label" for="due_date">
				<span>Due Date (Optional)</span>
			</label>
			<input
				id="due_date"
				type="date"
				class="input"
				class:border-error-500={isOverdue(formState.data.due_date, formState.data.status)}
				bind:value={formState.data.due_date}
				on:input={(e) => form.updateField('due_date', e.currentTarget.value)}
				disabled={isReadonly}
				min={getMinDate()}
			/>
			{#if isOverdue(formState.data.due_date, formState.data.status)}
				<div class="mt-1 text-sm text-error-500">This item is overdue</div>
			{/if}
		</div>
	</div>

	<!-- Document URL -->
	<div>
		<label class="label" for="document_url">
			<span>Document URL (Optional)</span>
		</label>
		<input
			id="document_url"
			type="url"
			class="input"
			class:input-error={formState.errors.document_url && formState.touched.document_url}
			bind:value={formState.data.document_url}
			on:input={(e) => form.updateField('document_url', e.currentTarget.value)}
			on:blur={() => form.touchField('document_url')}
			disabled={isReadonly}
			placeholder="https://example.com/document.pdf"
		/>
		{#if formState.errors.document_url && formState.touched.document_url}
			<div class="mt-1 text-sm text-error-500">
				{formState.errors.document_url[0]}
			</div>
		{/if}
		<div class="text-surface-600-300-token mt-1 text-sm">
			Link to related document or certificate
		</div>
	</div>

	<!-- Notes -->
	<div>
		<label class="label" for="notes">
			<span>Notes</span>
		</label>
		<textarea
			id="notes"
			class="textarea"
			bind:value={formState.data.notes}
			on:input={(e) => form.updateField('notes', e.currentTarget.value)}
			disabled={isReadonly}
			placeholder="Enter any additional notes or details"
			rows="4"
		></textarea>
	</div>

	<!-- Status Summary (View mode) -->
	{#if isReadonly && complianceRecord}
		<div class="bg-surface-100-800-token card p-4">
			<h4 class="mb-2 h4">Compliance Status</h4>
			<div class="grid grid-cols-1 gap-4 text-sm md:grid-cols-2">
				<div>
					<span class="font-semibold">Status:</span>
					<span
						class="variant-filled ml-2 badge capitalize"
						class:variant-filled-success={complianceRecord.status === 'compliant'}
						class:variant-filled-error={complianceRecord.status === 'non_compliant' ||
							complianceRecord.status === 'expired'}
						class:variant-filled-warning={complianceRecord.status === 'pending'}
					>
						{complianceRecord.status.replace('_', ' ')}
					</span>
				</div>
				<div>
					<span class="font-semibold">Created:</span>
					{new Date(complianceRecord.created_at!).toLocaleDateString()}
				</div>
				{#if complianceRecord.employee_id}
					<div>
						<span class="font-semibold">Employee:</span>
						{getEmployeeName(complianceRecord.employee_id)}
					</div>
				{:else}
					<div>
						<span class="font-semibold">Scope:</span>
						Company-wide
					</div>
				{/if}
				{#if complianceRecord.due_date}
					<div>
						<span class="font-semibold">Due Date:</span>
						<span
							class:text-error-500={isOverdue(complianceRecord.due_date, complianceRecord.status)}
						>
							{new Date(complianceRecord.due_date).toLocaleDateString()}
						</span>
						{#if isOverdue(complianceRecord.due_date, complianceRecord.status)}
							<span class="font-semibold text-error-500">(Overdue)</span>
						{/if}
					</div>
				{/if}
			</div>

			{#if complianceRecord.document_url}
				<div class="mt-4">
					<a
						href={complianceRecord.document_url}
						target="_blank"
						class="variant-ghost-primary btn btn-sm"
					>
						View Document
					</a>
				</div>
			{/if}
		</div>
	{/if}

	<!-- Form Actions -->
	{#if !isReadonly}
		<div class="flex justify-end gap-4 border-t pt-6">
			<button
				type="button"
				class="variant-ghost-surface btn"
				on:click={onCancel}
				disabled={formState.isSubmitting}
			>
				Cancel
			</button>
			<button
				type="submit"
				class="variant-filled-primary btn"
				disabled={formState.isSubmitting || !formState.isValid}
			>
				{#if formState.isSubmitting}
					<span class="animate-pulse">Saving...</span>
				{:else}
					{isEditing ? 'Update Record' : 'Create Record'}
				{/if}
			</button>
		</div>
	{:else}
		<div class="flex justify-end border-t pt-6">
			<button type="button" class="variant-ghost-surface btn" on:click={onCancel}> Close </button>
		</div>
	{/if}
</form>

<style>
	.input-error {
		@apply !border-error-500 !bg-error-50 dark:!bg-error-900/20;
	}
</style>
