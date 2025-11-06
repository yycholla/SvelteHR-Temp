<script lang="ts">
	import { onMount } from 'svelte';
	import { userService } from '$lib/services/userService';
	import { departmentService, departments } from '$lib/services/departmentService';
	import Button from '../base/Button.svelte';
	import Input from '../base/Input.svelte';
	import Select from '../base/Select.svelte';
	import Textarea from '../base/Textarea.svelte';
	import Card from '../base/Card.svelte';
	import { validateForm } from '$lib/utils/validation';
	import type { ValidationResult } from '$lib/utils/validation';
	import type { User, CreateUserInput, UpdateUserInput } from '$lib/types';

	let {
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
	let departmentOptions = $derived(
		$departments.map((dept) => ({
			value: dept.id,
			label: dept.name
		}))
	);

	let managerOptions = $derived([
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
		const result = validateForm(formData, validationRules);
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
			employmentType: employee.job_info?.employmentType || 'FULL_TIME',
			hireDate: employee.job_info?.hireDate || '',
			managerId: employee.manager_id || '',
			salary: employee.job_info?.annualSalary?.toString() || '',
			payType: employee.job_info?.payType || 'SALARY',
			isRemote: employee.job_info?.isRemote || false,
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
			return baseData as UpdateUserInput;
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
			} as CreateUserInput;
		}
	}

	async function handleSubmit(event: Event) {
		event.preventDefault();
		if (!isValid) return;

		try {
			const submissionData = prepareSubmissionData();

			if (isEditing && employee) {
				const updatedEmployee = await userService.updateUser(
					employee.id,
					submissionData as UpdateUserInput
				);
				onsuccess?.({ employee: updatedEmployee, action: 'update' });
			} else {
				const newEmployee = await userService.createUser(submissionData as CreateUserInput);
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
		departmentService.loadDepartments();
	});
</script>

<form onsubmit={handleSubmit} class="employee-form">
	<!-- Basic Information -->
	<Card>
		<div class="form-section">
			<h3 class="form-section__title">Basic Information</h3>

			<div class="form-grid">
				<div class="form-field">
					<Input
						label="First Name"
						bind:value={formData.firstName}
						required
						errorText={validationErrors.firstName}
						placeholder="Enter first name"
					/>
				</div>

				<div class="form-field">
					<Input
						label="Last Name"
						bind:value={formData.lastName}
						required
						errorText={validationErrors.lastName}
						placeholder="Enter last name"
					/>
				</div>

				<div class="form-field">
					<Input
						label="Email"
						type="email"
						bind:value={formData.email}
						required
						disabled={isEditing}
						errorText={validationErrors.email}
						placeholder="Enter email address"
					/>
				</div>

				<div class="form-field">
					<Input
						label="Phone Number"
						type="tel"
						bind:value={formData.phoneNumber}
						errorText={validationErrors.phoneNumber}
						placeholder="Enter phone number"
					/>
				</div>
			</div>
		</div>
	</Card>

	<!-- Employment Information -->
	<Card>
		<div class="form-section">
			<h3 class="form-section__title">Employment Information</h3>

			<div class="form-grid">
				<div class="form-field">
					<Input
						label="Job Title"
						bind:value={formData.jobTitle}
						required
						errorText={validationErrors.jobTitle}
						placeholder="Enter job title"
					/>
				</div>

				<div class="form-field">
					<Select
						label="Department"
						options={departmentOptions}
						bind:value={formData.departmentId}
						required
						errorText={validationErrors.departmentId}
						placeholder="Select department"
					/>
				</div>

				<div class="form-field">
					<Select
						label="Employment Type"
						options={employmentTypeOptions}
						bind:value={formData.employmentType}
						required
					/>
				</div>

				<div class="form-field">
					<Input
						label="Hire Date"
						type="date"
						bind:value={formData.hireDate}
						required={!isEditing}
						disabled={isEditing}
						errorText={validationErrors.hireDate}
					/>
				</div>

				<div class="form-field">
					<Select
						label="Manager"
						options={managerOptions}
						bind:value={formData.managerId}
						placeholder="Select manager (optional)"
					/>
				</div>

				<div class="form-field">
					<Select label="Pay Type" options={payTypeOptions} bind:value={formData.payType} />
				</div>

				<div class="form-field">
					<Input
						label="Salary"
						type="number"
						bind:value={formData.salary}
						placeholder="Enter salary amount"
						helperText="Annual salary or hourly rate"
					/>
				</div>

				<div class="form-field form-field--checkbox">
					<label class="checkbox-label">
						<input type="checkbox" bind:checked={formData.isRemote} class="checkbox-input" />
						<span class="checkbox-text">Remote Employee</span>
					</label>
				</div>
			</div>
		</div>
	</Card>

	<!-- Address Information -->
	<Card>
		<div class="form-section">
			<h3 class="form-section__title">Address Information</h3>

			<div class="form-grid">
				<div class="form-field form-field--full-width">
					<Input
						label="Street Address"
						bind:value={formData.addressStreet}
						placeholder="Enter street address"
					/>
				</div>

				<div class="form-field">
					<Input label="City" bind:value={formData.addressCity} placeholder="Enter city" />
				</div>

				<div class="form-field">
					<Input label="State" bind:value={formData.addressState} placeholder="Enter state" />
				</div>

				<div class="form-field">
					<Input
						label="ZIP Code"
						bind:value={formData.addressZipCode}
						placeholder="Enter ZIP code"
					/>
				</div>
			</div>
		</div>
	</Card>

	<!-- Emergency Contact -->
	<Card>
		<div class="form-section">
			<h3 class="form-section__title">Emergency Contact</h3>

			<div class="form-grid">
				<div class="form-field">
					<Input
						label="Contact Name"
						bind:value={formData.emergencyContactName}
						placeholder="Enter emergency contact name"
					/>
				</div>

				<div class="form-field">
					<Input
						label="Contact Phone"
						type="tel"
						bind:value={formData.emergencyContactPhone}
						placeholder="Enter emergency contact phone"
					/>
				</div>

				<div class="form-field">
					<Select
						label="Relationship"
						options={relationshipOptions}
						bind:value={formData.emergencyContactRelationship}
						placeholder="Select relationship"
					/>
				</div>
			</div>
		</div>
	</Card>

	<!-- Authentication (for new employees only) -->
	{#if !isEditing}
		<Card>
			<div class="form-section">
				<h3 class="form-section__title">Account Information</h3>

				<div class="form-grid">
					<div class="form-field">
						<Input
							label="Username"
							bind:value={formData.username}
							required
							errorText={validationErrors.username}
							placeholder="Enter username"
						/>
					</div>

					<div class="form-field">
						<Select
							label="Role"
							options={roleOptions}
							bind:value={formData.roleIds[0]}
							required
							placeholder="Select role"
						/>
					</div>

					<div class="form-field">
						<Input
							label="Password"
							type="password"
							bind:value={formData.password}
							required
							errorText={validationErrors.password}
							placeholder="Enter password"
							helperText="Minimum 8 characters"
						/>
					</div>

					<div class="form-field">
						<Input
							label="Confirm Password"
							type="password"
							bind:value={formData.confirmPassword}
							required
							errorText={validationErrors.confirmPassword}
							placeholder="Confirm password"
						/>
					</div>
				</div>
			</div>
		</Card>
	{/if}

	<!-- Form Actions -->
	<div class="form-actions">
		<div class="form-actions__left">
			<Button type="button" variant="ghost" onclick={handleReset} disabled={loading}>Reset</Button>
		</div>

		<div class="form-actions__right">
			<Button type="button" variant="tertiary" onclick={handleCancel} disabled={loading}>
				Cancel
			</Button>

			<Button type="submit" variant="primary" disabled={!isValid || loading} {loading}>
				{isEditing ? 'Update Employee' : 'Create Employee'}
			</Button>
		</div>
	</div>
</form>
