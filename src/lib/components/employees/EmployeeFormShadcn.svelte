<script lang="ts">
	import { createEventDispatcher, onMount } from 'svelte';
	import { userService } from '$lib/services/userService';
	import { departmentService, departments } from '$lib/services/departmentService';
	import { Button } from '$lib/components/ui/button';
	import * as Card from '$lib/components/ui/card';
	import { validateForm } from '$lib/utils/validation';
	import { RotateCcw, Save, X } from '@lucide/svelte';
	import type { CreateUserInput, UpdateUserInput, User } from '$lib/types';

	// Import decomposed components
	import EmployeeFormBasic from './form/EmployeeFormBasic.svelte';
	import EmployeeFormEmployment from './form/EmployeeFormEmployment.svelte';
	import EmployeeFormAddress from './form/EmployeeFormAddress.svelte';
	import EmployeeFormContact from './form/EmployeeFormContact.svelte';
	import EmployeeFormCredentials from './form/EmployeeFormCredentials.svelte';

	const dispatch = createEventDispatcher();

	// Props
	const {
		employee = null,
		isEditing = false,
		loading = false
	}: {
		employee: User | null;
		isEditing?: boolean;
		loading?: boolean;
	} = $props();

	// Form data
	let formData = $state({
		// Basic Information
		firstName: '',
		lastName: '',
		email: '',
		phoneNumber: '',

		// Employment Information
		jobTitle: '',
		departmentId: '',
		employmentType: 'FULL_TIME',
		hireDate: '',
		managerId: '',
		salary: '',
		payType: 'SALARY',
		isRemote: false,

		// Address Information
		addressStreet: '',
		addressCity: '',
		addressState: '',
		addressZipCode: '',

		// Emergency Contact
		emergencyContactName: '',
		emergencyContactPhone: '',
		emergencyContactRelationship: '',

		// Authentication (only for new employees)
		username: '',
		password: '',
		confirmPassword: '',
		roleIds: [] as string[]
	});

	// Validation
	let validationErrors: Record<string, string> = $state({});
	let isValid = $state(false);

	// Options
	const employmentTypeOptions = [
		{ value: 'FULL_TIME', label: 'Full Time' },
		{ value: 'PART_TIME', label: 'Part Time' },
		{ value: 'CONTRACT', label: 'Contract' },
		{ value: 'INTERN', label: 'Intern' }
	];

	const payTypeOptions = [
		{ value: 'SALARY', label: 'Salary' },
		{ value: 'HOURLY', label: 'Hourly' }
	];

	const roleOptions = [
		{ value: 'employee', label: 'Employee' },
		{ value: 'manager', label: 'Manager' },
		{ value: 'hr_manager', label: 'HR Manager' },
		{ value: 'admin', label: 'Administrator' }
	];

	const relationshipOptions = [
		{ value: 'spouse', label: 'Spouse' },
		{ value: 'parent', label: 'Parent' },
		{ value: 'sibling', label: 'Sibling' },
		{ value: 'child', label: 'Child' },
		{ value: 'friend', label: 'Friend' },
		{ value: 'other', label: 'Other' }
	];

	// Computed values
	const departmentOptions = $derived(
		$departments.map((dept) => ({
			value: dept.id,
			label: dept.name
		}))
	);

	const managerOptions = $derived([
		{ value: '', label: 'No Manager' }
		// TODO: Load actual managers from API
	]);

	// Validation rules
	const validationRules = $derived({
		firstName: { required: true },
		lastName: { required: true },
		email: { required: true, email: true },
		jobTitle: { required: true },
		departmentId: { required: true },
		hireDate: { required: true },
		...(!isEditing && {
			username: { required: true, minLength: 3 },
			password: { required: true, minLength: 8 },
			confirmPassword: { required: true, matches: 'password' }
		})
	});

	// Load form data if editing
	$effect(() => {
		if (employee && isEditing) {
			populateFormData();
		}
	});

	// Validate form when data changes
	$effect(() => {
		const fields: Record<string, any> = {};
		for (const key in formData) {
			fields[key] = {
				name: key,
				label: key,
				value: (formData as any)[key],
				rules: (validationRules as any)[key]
			};
		}
		const result = validateForm(fields);
		validationErrors = result.errors;
		isValid = result.isValid;
	});

	function populateFormData() {
		if (!employee) return;

		formData = {
			firstName: employee.first_name || '',
			lastName: employee.last_name || '',
			email: employee.email || '',
			phoneNumber: employee.phone_number || '',
			jobTitle: employee.job_title || '',
			departmentId: employee.department?.id || '',
			employmentType: employee.job_info?.employmentType || 'FULL_TIME',
			hireDate: employee.job_info?.hireDate || '',
			managerId: employee.manager?.id || '',
			salary: employee.job_info?.salary?.toString() || '',
			payType: employee.job_info?.payType || 'SALARY',
			isRemote: employee.job_info?.isRemote || false,
			addressStreet: employee.addresses?.[0]?.address_line_1 || '',
			addressCity: employee.addresses?.[0]?.city || '',
			addressState: employee.addresses?.[0]?.state_province || '',
			addressZipCode: employee.addresses?.[0]?.postal_code || '',
			emergencyContactName: employee.emergency_contact?.name || '',
			emergencyContactPhone: employee.emergency_contact?.phone || '',
			emergencyContactRelationship: employee.emergency_contact?.relationship || '',
			username: employee.username || '',
			password: '',
			confirmPassword: '',
			roleIds: employee.role ? [employee.role] : []
		};
	}

	function prepareSubmissionData(): CreateUserInput | UpdateUserInput {
		const baseData = {
			firstName: formData.firstName,
			lastName: formData.lastName,
			jobTitle: formData.jobTitle,
			departmentId: formData.departmentId,
			phoneNumber: formData.phoneNumber || undefined,
			addressStreet: formData.addressStreet || undefined,
			addressCity: formData.addressCity || undefined,
			addressState: formData.addressState || undefined,
			addressZipCode: formData.addressZipCode || undefined,
			emergencyContactName: formData.emergencyContactName || undefined,
			emergencyContactPhone: formData.emergencyContactPhone || undefined,
			emergencyContactRelationship: formData.emergencyContactRelationship || undefined,
			managerId: formData.managerId || undefined
		};

		if (isEditing) {
			return baseData as unknown as UpdateUserInput;
		} else {
			return {
				...baseData,
				email: formData.email,
				username: formData.username,
				password: formData.password,
				hireDate: formData.hireDate,
				employmentType: formData.employmentType,
				isRemote: formData.isRemote,
				roleIds: formData.roleIds,
				salary: formData.salary ? parseFloat(formData.salary) : undefined,
				payType: formData.payType
			} as unknown as CreateUserInput;
		}
	}

	async function handleSubmit() {
		if (!isValid) return;

		try {
			const submissionData = prepareSubmissionData();

			if (isEditing && employee) {
				const updatedEmployee = await userService.updateUser(
					employee.id,
					submissionData as UpdateUserInput
				);
				dispatch('success', { employee: updatedEmployee, action: 'update' });
			} else {
				const newEmployee = await userService.createUser(submissionData as CreateUserInput);
				dispatch('success', { employee: newEmployee, action: 'create' });
			}
		} catch (error: any) {
			dispatch('error', { message: error.message });
		}
	}

	function handleCancel() {
		dispatch('cancel');
	}

	function handleReset() {
		if (isEditing && employee) {
			populateFormData();
		} else {
			// Reset to empty form
			formData = {
				firstName: '',
				lastName: '',
				email: '',
				phoneNumber: '',
				jobTitle: '',
				departmentId: '',
				employmentType: 'FULL_TIME',
				hireDate: '',
				managerId: '',
				salary: '',
				payType: 'SALARY',
				isRemote: false,
				addressStreet: '',
				addressCity: '',
				addressState: '',
				addressZipCode: '',
				emergencyContactName: '',
				emergencyContactPhone: '',
				emergencyContactRelationship: '',
				username: '',
				password: '',
				confirmPassword: '',
				roleIds: []
			};
		}
		validationErrors = {};
	}

	// Helper for basic info validation (passed to child)
	function clearFieldError(field: string) {
		if (validationErrors[field]) {
			const { [field]: _, ...rest } = validationErrors;
			validationErrors = rest;
		}
	}

	function validateField(field: string, value: string) {
		// This uses the reactive effect to validate, but we can trigger it or just rely on reactivity
		// Since validationRules is derived, we can manually check specific field if needed
		// but the effect should handle it.
		// However, for onblur, we might want immediate feedback if not dirty?
		// The effect runs on every change.
	}

	// Helper for phone input (passed to child)
	function handlePhoneInput(event: Event) {
		const inputElement = event.target as HTMLInputElement;
		// Simple update, formatting logic could be moved here if needed
		formData.phoneNumber = inputElement.value;
	}

	onMount(() => {
		// Load departments for the dropdown
		departmentService.loadDepartments();
	});
</script>

<form
	onsubmit={(e) => {
		e.preventDefault();
		handleSubmit();
	}}
	class="space-y-6"
>
	<!-- Basic Information -->
	<EmployeeFormBasic
		bind:firstName={formData.firstName}
		bind:lastName={formData.lastName}
		bind:email={formData.email}
		bind:phoneNumber={formData.phoneNumber}
		{validationErrors}
		{isEditing}
	/>

	<!-- Employment Information -->
	<EmployeeFormEmployment
		bind:jobTitle={formData.jobTitle}
		bind:departmentId={formData.departmentId}
		bind:employmentType={formData.employmentType}
		bind:hireDate={formData.hireDate}
		bind:managerId={formData.managerId}
		bind:isRemote={formData.isRemote}
		bind:salary={formData.salary}
		bind:payType={formData.payType}
		{validationErrors}
		{isEditing}
		{departmentOptions}
		{managerOptions}
		{employmentTypeOptions}
		{payTypeOptions}
	/>

	<!-- Address Information -->
	<EmployeeFormAddress
		bind:addressStreet={formData.addressStreet}
		bind:addressCity={formData.addressCity}
		bind:addressState={formData.addressState}
		bind:addressZipCode={formData.addressZipCode}
	/>

	<!-- Emergency Contact -->
	<EmployeeFormContact
		bind:emergencyContactName={formData.emergencyContactName}
		bind:emergencyContactPhone={formData.emergencyContactPhone}
		bind:emergencyContactRelationship={formData.emergencyContactRelationship}
		{relationshipOptions}
	/>

	<!-- Authentication (only for new employees) -->
	{#if !isEditing}
		<EmployeeFormCredentials
			bind:username={formData.username}
			bind:password={formData.password}
			bind:confirmPassword={formData.confirmPassword}
			bind:roleIds={formData.roleIds}
			{validationErrors}
			{roleOptions}
		/>
	{/if}

	<!-- Form Actions -->
	<Card.Root>
		<Card.Content class="pt-6">
			<div class="flex flex-col gap-3 sm:flex-row sm:justify-end">
				<Button type="button" variant="outline" onclick={handleReset}>
					<RotateCcw class="mr-2 h-4 w-4" />
					Reset
				</Button>
				<Button type="button" variant="outline" onclick={handleCancel}>
					<X class="mr-2 h-4 w-4" />
					Cancel
				</Button>
				<Button type="submit" disabled={!isValid || loading}>
					<Save class="mr-2 h-4 w-4" />
					{isEditing ? 'Update Employee' : 'Create Employee'}
				</Button>
			</div>
		</Card.Content>
	</Card.Root>
</form>
