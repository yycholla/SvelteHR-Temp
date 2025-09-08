<script lang="ts">
	import { superForm } from 'sveltekit-superforms';
	import { zodClient } from 'sveltekit-superforms/adapters';
	import { createEmployeeSchema } from '$lib/schemas/employee';
	import { DynamicForm } from '$lib/components/forms';
	import type { FormSchema } from '$lib/forms/types';
	import { goto } from '$app/navigation';
	import { Button } from '$lib/components/ui/button';
	import { ArrowLeft } from 'lucide-svelte';

	export let data;

	// Create dynamic form schema from the employee requirements
	const employeeFormSchema: FormSchema = {
		fields: [
			{
				id: 'personal_info',
				name: 'personal_info',
				type: 'section',
				label: 'Personal Information',
				required: false
			},
			{
				id: 'username',
				name: 'username',
				type: 'text',
				label: 'Username',
				required: true,
				validation: { minLength: 3, maxLength: 50 },
				ui_config: { placeholder: 'Enter username', section: 'Personal Information' }
			},
			{
				id: 'firstName',
				name: 'firstName',
				type: 'text',
				label: 'First Name',
				required: true,
				validation: { minLength: 2, maxLength: 50 },
				ui_config: { placeholder: 'Enter first name', section: 'Personal Information' }
			},
			{
				id: 'lastName',
				name: 'lastName',
				type: 'text',
				label: 'Last Name',
				required: true,
				validation: { minLength: 2, maxLength: 50 },
				ui_config: { placeholder: 'Enter last name', section: 'Personal Information' }
			},
			{
				id: 'email',
				name: 'email',
				type: 'email',
				label: 'Email',
				required: false,
				ui_config: { placeholder: 'Enter email address', section: 'Personal Information' }
			},
			{
				id: 'phoneNumber',
				name: 'phoneNumber',
				type: 'phone',
				label: 'Phone Number',
				required: false,
				ui_config: { placeholder: 'Enter phone number', section: 'Personal Information' }
			},
			{
				id: 'job_info',
				name: 'job_info',
				type: 'section',
				label: 'Job Information',
				required: false
			},
			{
				id: 'roleId',
				name: 'roleId',
				type: 'select',
				label: 'Role',
				required: true,
				options:
					data.roles?.map((role) => ({
						value: role.id.toString(),
						label: role.name
					})) || [],
				ui_config: { section: 'Job Information' }
			},
			{
				id: 'departmentId',
				name: 'departmentId',
				type: 'select',
				label: 'Department',
				required: false,
				options:
					data.departments?.map((dept) => ({
						value: dept.id.toString(),
						label: dept.name
					})) || [],
				ui_config: { section: 'Job Information' }
			},
			{
				id: 'jobTitle',
				name: 'jobTitle',
				type: 'text',
				label: 'Job Title',
				required: false,
				ui_config: { placeholder: 'Enter job title', section: 'Job Information' }
			},
			{
				id: 'hireDate',
				name: 'hireDate',
				type: 'date',
				label: 'Hire Date',
				required: false,
				ui_config: { section: 'Job Information' }
			},
			{
				id: 'employmentType',
				name: 'employmentType',
				type: 'select',
				label: 'Employment Type',
				required: false,
				options: [
					{ value: 'Full-time', label: 'Full-time' },
					{ value: 'Part-time', label: 'Part-time' },
					{ value: 'Contract', label: 'Contract' },
					{ value: 'Intern', label: 'Intern' }
				],
				ui_config: { section: 'Job Information' }
			},
			{
				id: 'onboardingStatus',
				name: 'onboardingStatus',
				type: 'select',
				label: 'Status',
				required: false,
				options: [
					{ value: 'PreHire', label: 'Pre-Hire' },
					{ value: 'Onboarding', label: 'Onboarding' },
					{ value: 'Active', label: 'Active' },
					{ value: 'Terminated', label: 'Terminated' }
				],
				ui_config: { section: 'Job Information' }
			}
		],
		ui_config: {
			layout: 'two_column'
		}
	};

	// Create superForm
	const { form, errors, constraints, enhance, submitting, message } = superForm(data.form, {
		validators: zodClient(createEmployeeSchema),
		resetForm: false,
		invalidateAll: true,
		onResult: ({ result }) => {
			if (result.type === 'redirect') {
				// Form submission was successful
				console.log('✅ Employee created successfully');
			}
		},
		onError: ({ result }) => {
			console.error('❌ Form submission failed:', result);
		}
	});

	function handleCancel() {
		goto('/hr/employees');
	}
</script>

<div class="create-employee-page">
	<!-- Header -->
	<div class="page-header mb-8 flex items-center gap-4">
		<Button variant="ghost" size="sm" onclick={handleCancel} class="p-2">
			<ArrowLeft class="h-4 w-4" />
			<span class="sr-only">Back to employees</span>
		</Button>

		<div>
			<h1 class="text-2xl font-bold text-gray-900 dark:text-gray-100">Create New Employee</h1>
			<p class="text-gray-600 dark:text-gray-400">Add a new employee to the system</p>
		</div>
	</div>

	<!-- Error Message -->
	{#if $message}
		<div class="mb-6 rounded-md border border-red-300 bg-red-50 p-4 text-red-700">
			<p>{$message}</p>
		</div>
	{/if}

	<!-- Form -->
	<div class="form-container rounded-lg border bg-white p-8 shadow-sm dark:bg-gray-800">
		<form method="POST" use:enhance>
			<DynamicForm
				schema={employeeFormSchema}
				bind:form={$form}
				errors={$errors}
				constraints={$constraints}
				submitting={$submitting}
				submitText="Create Employee"
				cancelText="Cancel"
				onCancel={handleCancel}
			/>
		</form>
	</div>
</div>

<style>
	.create-employee-page {
		max-width: 4xl;
		margin: 0 auto;
		padding: 2rem;
	}

	.form-container {
		background: white;
	}

	@media (prefers-color-scheme: dark) {
		.form-container {
			background: rgb(31 41 55); /* gray-800 */
		}
	}

	@media (max-width: 768px) {
		.create-employee-page {
			padding: 1rem;
		}

		.form-container {
			padding: 1.5rem;
		}
	}
</style>
