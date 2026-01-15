<script lang="ts">
	import { onMount } from 'svelte';
	import { logger } from '$lib/utils/logger';
	import { userService } from '$lib/services/userService';
	import { departmentService, departments } from '$lib/services/departmentService';
	import { Button } from '$lib/components/ui/button';
	import { validateForm } from '$lib/utils/validation';
	import type { CreateUserInput, UpdateUserInput, User } from '$lib/types';

	// Import decomposed components
	import BasicInfo from './form-legacy/BasicInfo.svelte';
	import JobInfo from './form-legacy/JobInfo.svelte';
	import AddressInfo from './form-legacy/AddressInfo.svelte';
	import ContactInfo from './form-legacy/ContactInfo.svelte';
	import AccountInfo from './form-legacy/AccountInfo.svelte';

	const {
		employee = null,
		isEditing = false,
		loading = false,
		onsuccess = undefined,
		onerror = undefined,
		oncancel = undefined
	}: {
		employee?: User | null;
		isEditing?: boolean;
		loading?: boolean;
		onsuccess?: ((detail: { employee: User; action: 'create' | 'update' }) => void) | undefined;
		onerror?: ((detail: { message: string }) => void) | undefined;
		oncancel?: (() => void) | undefined;
	} = $props();

	// Form data
	let formData = $state<{
		firstName: string;
		lastName: string;
		email: string;
		phoneNumber: string;
		jobTitle: string;
		departmentId: string;
		employmentType: string;
		hireDate: string;
		managerId: string;
		salary: string;
		payType: string;
		isRemote: boolean;
		addressStreet: string;
		addressCity: string;
		addressState: string;
		addressZipCode: string;
		emergencyContactName: string;
		emergencyContactPhone: string;
		emergencyContactRelationship: string;
		username?: string;
		password?: string;
		confirmPassword?: string;
		roleIds: string[];
		[key: string]: any;
	}>({
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
		roleIds: []
	});

	// Validation
	let validationErrors = $state<Record<string, string>>({});
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
		$departments.map((dept: any) => ({
			value: dept.id,
			label: dept.name
		}))
	);

	const managerOptions = $derived([
		{ value: '', label: 'No Manager' }
		// TODO: Load actual managers from API
	]);

	// Validation rules
	const validationRules = {
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
	};

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
				label: key, // Simplification
				value: formData[key],
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
			departmentId: employee.department_id || '',
			employmentType: (employee.job_info as any)?.employmentType || 'FULL_TIME',
			hireDate: (employee.job_info as any)?.hireDate || '',
			managerId: employee.manager_id || '',
			salary: (employee.job_info as any)?.annualSalary?.toString() || '',
			payType: (employee.job_info as any)?.payType || 'SALARY',
			isRemote: (employee.job_info as any)?.isRemote || false,
			addressStreet: employee.addresses?.[0]?.address_line_1 || '',
			addressCity: employee.addresses?.[0]?.city || '',
			addressState: employee.addresses?.[0]?.state_province || '',
			addressZipCode: employee.addresses?.[0]?.postal_code || '',
			emergencyContactName: employee.emergency_contact?.name || '',
			emergencyContactPhone: employee.emergency_contact?.phone || '',
			emergencyContactRelationship: employee.emergency_contact?.relationship || '',
			password: '',
			confirmPassword: '',
			roleIds: employee.role_assignments?.map((assignment) => assignment.role.id) || []
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
			return baseData as any as UpdateUserInput;
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
			} as any as CreateUserInput;
		}
	}

	async function handleSubmit(event: Event) {
		event.preventDefault();
		if (!isValid) return;

		try {
			const submissionData = prepareSubmissionData();

			if (isEditing && employee) {
				const updatedEmployee = await userService.updateUser(employee.id, submissionData as any);
				onsuccess?.({ employee: updatedEmployee, action: 'update' });
			} else {
				const newEmployee = await userService.createUser(submissionData as any);
				onsuccess?.({ employee: newEmployee, action: 'create' });
			}
		} catch (error: any) {
			onerror?.({ message: error.message });
		}
	}

	function handleCancel() {
		oncancel?.();
	}

	function handleReset() {
		if (isEditing && employee) {
			populateFormData();
		} else {
			// Reset to empty form
			Object.keys(formData).forEach((key) => {
				if (key === 'roleIds') {
					formData[key] = [];
				} else if (key === 'isRemote') {
					formData[key] = false;
				} else {
					formData[key] = '';
				}
			});
		}
		validationErrors = {};
	}

	onMount(() => {
		// Load departments for the dropdown
		if (departmentService.loadDepartments) {
			departmentService.loadDepartments();
		} else {
			// Fallback if loadDepartments is not available (e.g. mock)
			logger.warn('loadDepartments not available');
		}
	});
</script>

<form onsubmit={handleSubmit} class="employee-form">
	<!-- Basic Information -->
	<BasicInfo
		bind:firstName={formData.firstName}
		bind:lastName={formData.lastName}
		bind:email={formData.email}
		bind:phoneNumber={formData.phoneNumber}
		{validationErrors}
		{isEditing}
	/>

	<!-- Employment Information -->
	<JobInfo
		bind:jobTitle={formData.jobTitle}
		bind:departmentId={formData.departmentId}
		bind:employmentType={formData.employmentType}
		bind:hireDate={formData.hireDate}
		bind:managerId={formData.managerId}
		bind:payType={formData.payType}
		bind:salary={formData.salary}
		bind:isRemote={formData.isRemote}
		{validationErrors}
		{isEditing}
		{departmentOptions}
		{employmentTypeOptions}
		{managerOptions}
		{payTypeOptions}
	/>

	<!-- Address Information -->
	<AddressInfo
		bind:addressStreet={formData.addressStreet}
		bind:addressCity={formData.addressCity}
		bind:addressState={formData.addressState}
		bind:addressZipCode={formData.addressZipCode}
	/>

	<!-- Emergency Contact -->
	<ContactInfo
		bind:emergencyContactName={formData.emergencyContactName}
		bind:emergencyContactPhone={formData.emergencyContactPhone}
		bind:emergencyContactRelationship={formData.emergencyContactRelationship}
		{relationshipOptions}
	/>

	<!-- Authentication (for new employees only) -->
	<AccountInfo
		bind:username={formData.username}
		bind:password={formData.password}
		bind:confirmPassword={formData.confirmPassword}
		bind:roleIds={formData.roleIds}
		{validationErrors}
		{roleOptions}
		{isEditing}
	/>

	<!-- Form Actions -->
	<div class="form-actions">
		<div class="form-actions__left">
			<Button type="button" variant="ghost" onclick={handleReset} disabled={loading}>Reset</Button>
		</div>

		<div class="form-actions__right">
			<Button type="button" variant="outline" onclick={handleCancel} disabled={loading}>
				Cancel
			</Button>

			<Button type="submit" variant="default" disabled={!isValid || loading}>
				{isEditing ? 'Update Employee' : 'Create Employee'}
			</Button>
		</div>
	</div>
</form>
