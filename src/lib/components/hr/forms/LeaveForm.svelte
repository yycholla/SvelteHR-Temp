<script lang="ts">
	import { onMount } from 'svelte';
	import { createFormStore } from '$lib/stores/hr/forms';
	import { leaveRequestSchema } from '../utils/validation';
	import { leaveApi, employeeApi } from '../utils/api-helpers';
	import { notifications } from '../utils/notifications';
	import type { Employee } from '$lib/stores/hr/employees';

	interface LeaveRequest {
		id?: string;
		employee_id: string;
		type: 'vacation' | 'sick' | 'personal' | 'maternity' | 'paternity' | 'other';
		start_date: string;
		end_date: string;
		reason: string;
		notes?: string;
		status?: 'pending' | 'approved' | 'denied';
		created_at?: string;
		updated_at?: string;
	}

	let {
		leaveRequest = null,
		mode = 'create',
		onCancel,
		onSuccess
	}: {
		leaveRequest: LeaveRequest | null;
		mode: 'create' | 'edit' | 'view';
		onCancel: () => void;
		onSuccess: (leaveRequest: LeaveRequest) => void;
	} = $props();

	const isReadonly = $derived(mode === 'view');
	const isEditing = $derived(mode === 'edit');

	const initialData = {
		employee_id: leaveRequest?.employee_id || '',
		type: leaveRequest?.type || 'vacation',
		start_date: leaveRequest?.start_date || '',
		end_date: leaveRequest?.end_date || '',
		reason: leaveRequest?.reason || '',
		notes: leaveRequest?.notes || ''
	};

	const form = createFormStore(initialData);

	let employees: Employee[] = [];
	let loadingEmployees = false;
	let calculatedDays = 0;

	const leaveTypes = [
		{ value: 'vacation', label: 'Vacation' },
		{ value: 'sick', label: 'Sick Leave' },
		{ value: 'personal', label: 'Personal Leave' },
		{ value: 'maternity', label: 'Maternity Leave' },
		{ value: 'paternity', label: 'Paternity Leave' },
		{ value: 'other', label: 'Other' }
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

	function calculateDays() {
		const { start_date, end_date } = $form.data;
		if (start_date && end_date) {
			const start = new Date(start_date);
			const end = new Date(end_date);
			const diffTime = Math.abs(end.getTime() - start.getTime());
			calculatedDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1; // Include both start and end dates
		} else {
			calculatedDays = 0;
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
			const response = await leaveApi.create($form.data);
			const savedLeaveRequest = response.data;
			notifications.leaveRequestSubmitted();
			onSuccess(savedLeaveRequest);
		} catch (error) {
			notifications.apiError(error instanceof Error ? error.message : 'Failed to submit leave request');
		} finally {
			form.setSubmitting(false);
		}
	}

	function getMinDate() {
		const today = new Date();
		return today.toISOString().split('T')[0];
	}

	function getEmployeeName(employeeId: string): string {
		const employee = employees.find(emp => emp.id === employeeId);
		return employee ? `${employee.first_name} ${employee.last_name}` : 'Unknown Employee';
	}

	// Recalculate days when dates change
	$effect(() => {
		if ($form.data.start_date || $form.data.end_date) {
			calculateDays();
		}
	});

	const formState = $derived($form);
</script>

<form on:submit|preventDefault={handleSubmit} class="space-y-6">
	<!-- Employee Selection -->
	<div>
		<label class="label" for="employee_id">
			<span>Employee *</span>
		</label>
		{#if loadingEmployees}
			<div class="placeholder animate-pulse h-12 rounded"></div>
		{:else}
			<select
				id="employee_id"
				class="select"
				class:input-error={formState.errors.employee_id && formState.touched.employee_id}
				bind:value={formState.data.employee_id}
				on:change={(e) => form.updateField('employee_id', e.currentTarget.value)}
				on:blur={() => form.touchField('employee_id')}
				disabled={isReadonly}
			>
				<option value="">Select employee</option>
				{#each employees as employee}
					<option value={employee.id}>
						{employee.first_name} {employee.last_name} - {employee.department}
					</option>
				{/each}
			</select>
		{/if}
		{#if formState.errors.employee_id && formState.touched.employee_id}
			<div class="text-error-500 text-sm mt-1">
				{formState.errors.employee_id[0]}
			</div>
		{/if}
	</div>

	<!-- Leave Type -->
	<div>
		<label class="label" for="type">
			<span>Leave Type *</span>
		</label>
		<select
			id="type"
			class="select"
			bind:value={formState.data.type}
			on:change={(e) => form.updateField('type', e.currentTarget.value)}
			disabled={isReadonly}
		>
			{#each leaveTypes as type}
				<option value={type.value}>{type.label}</option>
			{/each}
		</select>
	</div>

	<div class="grid grid-cols-1 md:grid-cols-2 gap-6">
		<!-- Start Date -->
		<div>
			<label class="label" for="start_date">
				<span>Start Date *</span>
			</label>
			<input
				id="start_date"
				type="date"
				class="input"
				class:input-error={formState.errors.start_date && formState.touched.start_date}
				bind:value={formState.data.start_date}
				on:input={(e) => form.updateField('start_date', e.currentTarget.value)}
				on:blur={() => form.touchField('start_date')}
				disabled={isReadonly}
				min={getMinDate()}
			/>
			{#if formState.errors.start_date && formState.touched.start_date}
				<div class="text-error-500 text-sm mt-1">
					{formState.errors.start_date[0]}
				</div>
			{/if}
		</div>

		<!-- End Date -->
		<div>
			<label class="label" for="end_date">
				<span>End Date *</span>
			</label>
			<input
				id="end_date"
				type="date"
				class="input"
				class:input-error={formState.errors.end_date && formState.touched.end_date}
				bind:value={formState.data.end_date}
				on:input={(e) => form.updateField('end_date', e.currentTarget.value)}
				on:blur={() => form.touchField('end_date')}
				disabled={isReadonly}
				min={formState.data.start_date || getMinDate()}
			/>
			{#if formState.errors.end_date && formState.touched.end_date}
				<div class="text-error-500 text-sm mt-1">
					{formState.errors.end_date[0]}
				</div>
			{/if}
		</div>
	</div>

	<!-- Days Calculation -->
	{#if calculatedDays > 0}
		<div class="card p-4 bg-primary-100-800-token">
			<div class="flex items-center gap-2">
				<span class="text-primary-600-300-token font-semibold">Total Days:</span>
				<span class="text-lg font-bold">{calculatedDays}</span>
				<span class="text-sm text-surface-600-300-token">
					({calculatedDays === 1 ? 'day' : 'days'})
				</span>
			</div>
		</div>
	{/if}

	<!-- Reason -->
	<div>
		<label class="label" for="reason">
			<span>Reason *</span>
		</label>
		<textarea
			id="reason"
			class="textarea"
			class:input-error={formState.errors.reason && formState.touched.reason}
			bind:value={formState.data.reason}
			on:input={(e) => form.updateField('reason', e.currentTarget.value)}
			on:blur={() => form.touchField('reason')}
			disabled={isReadonly}
			placeholder="Enter reason for leave request"
			rows="3"
		></textarea>
		{#if formState.errors.reason && formState.touched.reason}
			<div class="text-error-500 text-sm mt-1">
				{formState.errors.reason[0]}
			</div>
		{/if}
	</div>

	<!-- Notes -->
	<div>
		<label class="label" for="notes">
			<span>Additional Notes</span>
		</label>
		<textarea
			id="notes"
			class="textarea"
			bind:value={formState.data.notes}
			on:input={(e) => form.updateField('notes', e.currentTarget.value)}
			disabled={isReadonly}
			placeholder="Enter any additional notes (optional)"
			rows="2"
		></textarea>
	</div>

	<!-- Status Display (View mode) -->
	{#if isReadonly && leaveRequest}
		<div class="card p-4 bg-surface-100-800-token">
			<h4 class="h4 mb-2">Request Status</h4>
			<div class="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
				<div>
					<span class="font-semibold">Status:</span>
					<span class="badge variant-filled capitalize"
						class:variant-filled-success={leaveRequest.status === 'approved'}
						class:variant-filled-error={leaveRequest.status === 'denied'}
						class:variant-filled-warning={leaveRequest.status === 'pending'}
					>
						{leaveRequest.status}
					</span>
				</div>
				<div>
					<span class="font-semibold">Submitted:</span>
					{new Date(leaveRequest.created_at!).toLocaleDateString()}
				</div>
				<div>
					<span class="font-semibold">Employee:</span>
					{getEmployeeName(leaveRequest.employee_id)}
				</div>
				<div>
					<span class="font-semibold">Total Days:</span>
					{calculatedDays}
				</div>
			</div>
		</div>
	{/if}

	<!-- Form Actions -->
	{#if !isReadonly}
		<div class="flex justify-end gap-4 pt-6 border-t">
			<button
				type="button"
				class="btn variant-ghost-surface"
				on:click={onCancel}
				disabled={formState.isSubmitting}
			>
				Cancel
			</button>
			<button
				type="submit"
				class="btn variant-filled-primary"
				disabled={formState.isSubmitting || !formState.isValid}
			>
				{#if formState.isSubmitting}
					<span class="animate-pulse">Submitting...</span>
				{:else}
					Submit Leave Request
				{/if}
			</button>
		</div>
	{:else}
		<div class="flex justify-end pt-6 border-t">
			<button
				type="button"
				class="btn variant-ghost-surface"
				on:click={onCancel}
			>
				Close
			</button>
		</div>
	{/if}
</form>

<style>
	.input-error {
		@apply !border-error-500 !bg-error-50 dark:!bg-error-900/20;
	}
</style>