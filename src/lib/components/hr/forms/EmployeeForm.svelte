<script lang="ts">
	import { createEmployeeForm, updateEmployeeForm } from '$lib/forms/employee-form';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import type { Employee } from '$lib/schemas/employee';

	let {
		employee = null,
		mode = 'create',
		onCancel,
		onSuccess
	}: {
		employee: Employee | null;
		mode: 'create' | 'edit' | 'view';
		onCancel: () => void;
		onSuccess: (employee: Employee) => void;
	} = $props();

	const isReadonly = $derived(mode === 'view');
	const isEditing = $derived(mode === 'edit');

	// Create appropriate form based on mode
	const form = isEditing && employee 
		? updateEmployeeForm(parseInt(employee.id), { 
			onSuccess: (emp) => onSuccess(emp),
			onError: (error) => console.error('Update error:', error)
		})
		: createEmployeeForm({ 
			onSuccess: (emp) => onSuccess(emp),
			onError: (error) => console.error('Create error:', error)
		});

	const { form: formData, errors, enhance, submitting } = form;

	// Initialize form data for edit mode
	$effect(() => {
		if (isEditing && employee) {
			$formData = {
				username: employee.username || '',
				firstName: employee.firstName || '',
				lastName: employee.lastName || '',
				email: employee.email || '',
				roleId: parseInt(employee.roleId) || 1,
				departmentId: parseInt(employee.departmentId) || 1,
				jobTitle: employee.jobTitle || '',
				hireDate: employee.hireDate || new Date().toISOString().split('T')[0],
				employmentType: employee.employmentType || 'Full-time',
				onboardingStatus: employee.status || 'PreHire'
			};
		}
	});
</script>

{#if isReadonly && employee}
	<!-- View Mode - Read-only display -->
	<div class="space-y-6">
		<div class="grid grid-cols-1 md:grid-cols-2 gap-6">
			<div>
				<Label>Name</Label>
				<p class="font-medium text-lg">{employee.firstName} {employee.lastName}</p>
			</div>
			<div>
				<Label>Username</Label>
				<p>{employee.username}</p>
			</div>
			<div>
				<Label>Email</Label>
				<p>{employee.email}</p>
			</div>
			<div>
				<Label>Job Title</Label>
				<p>{employee.jobTitle || 'N/A'}</p>
			</div>
			<div>
				<Label>Department</Label>
				<p>{employee.department?.name || 'N/A'}</p>
			</div>
			<div>
				<Label>Hire Date</Label>
				<p>{employee.hireDate || 'N/A'}</p>
			</div>
			<div>
				<Label>Status</Label>
				<p>{employee.status || 'N/A'}</p>
			</div>
			<div>
				<Label>Employment Type</Label>
				<p>{employee.employmentType || 'N/A'}</p>
			</div>
		</div>
		<div class="flex justify-end pt-6 border-t">
			<Button variant="outline" onclick={onCancel}>
				Close
			</Button>
		</div>
	</div>
{:else}
	<!-- Create/Edit Mode - Form -->
	<form method="POST" use:enhance class="space-y-6">
		<div class="grid grid-cols-1 md:grid-cols-2 gap-6">
			<!-- Username -->
			<div>
				<Label for="username">Username *</Label>
				<Input
					id="username"
					name="username"
					type="text"
					bind:value={$formData.username}
					placeholder="Enter username"
					error={$errors.username}
				/>
			</div>

			<!-- Email -->
			<div>
				<Label for="email">Email *</Label>
				<Input
					id="email"
					name="email"
					type="email"
					bind:value={$formData.email}
					placeholder="Enter email"
					error={$errors.email}
				/>
			</div>

			<!-- First Name -->
			<div>
				<Label for="firstName">First Name *</Label>
				<Input
					id="firstName"
					name="firstName"
					type="text"
					bind:value={$formData.firstName}
					placeholder="Enter first name"
					error={$errors.firstName}
				/>
			</div>

			<!-- Last Name -->
			<div>
				<Label for="lastName">Last Name *</Label>
				<Input
					id="lastName"
					name="lastName"
					type="text"
					bind:value={$formData.lastName}
					placeholder="Enter last name"
					error={$errors.lastName}
				/>
			</div>

			<!-- Job Title -->
			<div>
				<Label for="jobTitle">Job Title</Label>
				<Input
					id="jobTitle"
					name="jobTitle"
					type="text"
					bind:value={$formData.jobTitle}
					placeholder="Enter job title"
				/>
			</div>

			<!-- Employment Type -->
			<div>
				<Label for="employmentType">Employment Type</Label>
				<select
					id="employmentType"
					name="employmentType"
					class="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
					bind:value={$formData.employmentType}
				>
					<option value="Full-time">Full-time</option>
					<option value="Part-time">Part-time</option>
					<option value="Contract">Contract</option>
					<option value="Intern">Intern</option>
				</select>
			</div>

			<!-- Role ID -->
			<div>
				<Label for="roleId">Role ID *</Label>
				<Input
					id="roleId"
					name="roleId"
					type="number"
					bind:value={$formData.roleId}
					placeholder="Enter role ID"
					error={$errors.roleId}
				/>
			</div>

			<!-- Department ID -->
			<div>
				<Label for="departmentId">Department ID</Label>
				<Input
					id="departmentId"
					name="departmentId"
					type="number"
					bind:value={$formData.departmentId}
					placeholder="Enter department ID"
				/>
			</div>

			<!-- Hire Date -->
			<div>
				<Label for="hireDate">Hire Date</Label>
				<Input
					id="hireDate"
					name="hireDate"
					type="date"
					bind:value={$formData.hireDate}
				/>
			</div>

			<!-- Onboarding Status -->
			<div>
				<Label for="onboardingStatus">Status</Label>
				<select
					id="onboardingStatus"
					name="onboardingStatus"
					class="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
					bind:value={$formData.onboardingStatus}
				>
					<option value="PreHire">Pre-Hire</option>
					<option value="Onboarding">Onboarding</option>
					<option value="Active">Active</option>
					<option value="Terminated">Terminated</option>
				</select>
			</div>
		</div>

		<!-- Form Actions -->
		<div class="flex justify-end gap-4 pt-6 border-t">
			<Button
				type="button"
				variant="outline"
				onclick={onCancel}
				disabled={$submitting}
			>
				Cancel
			</Button>
			<Button
				type="submit"
				disabled={$submitting}
			>
				{#if $submitting}
					<span class="animate-pulse">Saving...</span>
				{:else}
					{isEditing ? 'Update Employee' : 'Create Employee'}
				{/if}
			</Button>
		</div>
	</form>
{/if}

