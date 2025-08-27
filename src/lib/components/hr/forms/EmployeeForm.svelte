<script lang="ts">
	import { createEmployeeForm, updateEmployeeForm } from '$lib/forms/employee-form';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import { ApiServices } from '$lib/api/services';
	import type { Employee, Role, Department } from '$lib/api/types-v2';
	import { onMount } from 'svelte';

	let {
		employee = null,
		mode = 'create',
		onCancel,
		onSuccess,
		availableRoles = [],
		availableDepartments = []
	}: {
		employee: Employee | null;
		mode: 'create' | 'edit' | 'view';
		onCancel: () => void;
		onSuccess: (employee: Employee) => void;
		availableRoles?: Role[];
		availableDepartments?: Department[];
	} = $props();

	const isReadonly = $derived(mode === 'view');
	const isEditing = $derived(mode === 'edit');

	// State for roles and departments
	let roles: Role[] = $state(availableRoles);
	let departments: Department[] = $state(availableDepartments);
	let loadingOptions = $state(availableRoles.length === 0 || availableDepartments.length === 0);
	let errorLoadingOptions = $state(false);

	// Create appropriate form based on mode
	const form = isEditing && employee 
		? updateEmployeeForm(parseInt(employee.id), {
			username: employee.username || '',
			firstName: employee.first_name || '',
			lastName: employee.last_name || '',
			email: employee.email || '',
			roleId: employee.role_id ? parseInt(employee.role_id) : 1,
			departmentId: employee.department_id ? parseInt(employee.department_id) : undefined,
			jobTitle: employee.job_title || '',
			hireDate: employee.hire_date || new Date().toISOString().split('T')[0],
			employmentType: employee.employment_type || 'Full-time',
			onboardingStatus: employee.status || 'PreHire'
		}, { 
			onSuccess: (emp) => onSuccess(emp),
			onError: (error) => console.error('Update error:', error)
		})
		: createEmployeeForm({ 
			onSuccess: (emp) => onSuccess(emp),
			onError: (error) => console.error('Create error:', error)
		});

	const { form: formData, errors, enhance, submitting } = form;

	// Load roles and departments on mount if not provided
	onMount(async () => {
		// If data is already provided, no need to load
		if (availableRoles.length > 0 && availableDepartments.length > 0) {
			loadingOptions = false;
			return;
		}

		try {
			const promises = [];
			
			// Only load roles if not provided
			if (availableRoles.length === 0) {
				promises.push(ApiServices.roles.list());
			} else {
				promises.push(Promise.resolve(availableRoles));
			}
			
			// Only load departments if not provided
			if (availableDepartments.length === 0) {
				promises.push(ApiServices.departments.list());
			} else {
				promises.push(Promise.resolve(availableDepartments));
			}

			const [rolesData, departmentsData] = await Promise.all(promises);
			roles = rolesData;
			departments = departmentsData;
			errorLoadingOptions = false;
		} catch (error) {
			console.error('Failed to load form options:', error);
			errorLoadingOptions = true;
			
			// If API fails, set fallback data if available
			if (availableRoles.length > 0) roles = availableRoles;
			if (availableDepartments.length > 0) departments = availableDepartments;
		} finally {
			loadingOptions = false;
		}
	});

</script>

{#if isReadonly && employee}
	<!-- View Mode - Read-only display -->
	<div class="space-y-6">
		<div class="grid grid-cols-1 md:grid-cols-2 gap-6">
			<div>
				<Label>Name</Label>
				<p class="font-medium text-lg">{employee.first_name} {employee.last_name}</p>
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
				<p>{employee.job_title || employee.role_name || 'N/A'}</p>
			</div>
			<div>
				<Label>Department</Label>
				<p>{employee.department?.name || employee.department_name || 'N/A'}</p>
			</div>
			<div>
				<Label>Role</Label>
				<p>{employee.roles?.[0]?.display_name || employee.roles?.[0]?.name || employee.role_name || 'N/A'}</p>
			</div>
			<div>
				<Label>Hire Date</Label>
				<p>{employee.hire_date || 'N/A'}</p>
			</div>
			<div>
				<Label>Status</Label>
				<p>{employee.status || 'N/A'}</p>
			</div>
			<div>
				<Label>Employment Type</Label>
				<p>{employee.employment_type || 'N/A'}</p>
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

			<!-- Role -->
			<div>
				<Label for="roleId">Role *</Label>
				{#if loadingOptions}
					<div class="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm items-center text-muted-foreground">
						Loading roles...
					</div>
				{:else if errorLoadingOptions && roles.length === 0}
					<div class="flex h-9 w-full rounded-md border border-destructive bg-transparent px-3 py-1 text-sm items-center text-destructive">
						Failed to load roles. Please refresh the page.
					</div>
				{:else}
					<select
						id="roleId"
						name="roleId"
						class="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
						bind:value={$formData.roleId}
						class:border-destructive={$errors.roleId}
					>
						<option value="">Select a role</option>
						{#each roles as role}
							<option value={parseInt(role.id)}>{role.name}</option>
						{/each}
					</select>
					{#if $errors.roleId}
						<p class="text-sm font-medium text-destructive mt-1">{$errors.roleId}</p>
					{/if}
				{/if}
			</div>

			<!-- Department -->
			<div>
				<Label for="departmentId">Department</Label>
				{#if loadingOptions}
					<div class="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm items-center text-muted-foreground">
						Loading departments...
					</div>
				{:else if errorLoadingOptions && departments.length === 0}
					<div class="flex h-9 w-full rounded-md border border-destructive bg-transparent px-3 py-1 text-sm items-center text-destructive">
						Failed to load departments. Please refresh the page.
					</div>
				{:else}
					<select
						id="departmentId"
						name="departmentId"
						class="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
						bind:value={$formData.departmentId}
					>
						<option value="">Select a department (optional)</option>
						{#each departments as department}
							<option value={parseInt(department.id)}>{department.name}</option>
						{/each}
					</select>
				{/if}
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

