<script lang="ts">
	import { createEventDispatcher, onMount } from 'svelte';
	import { userService } from '$lib/services/userService';
	import { departmentService, departments } from '$lib/services/departmentService';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import * as Select from '$lib/components/ui/select';
	import { Textarea } from '$lib/components/ui/textarea';
	import { Checkbox } from '$lib/components/ui/checkbox';
	import { Switch } from '$lib/components/ui/switch';
	import * as Card from '$lib/components/ui/card';
	import { Label } from '$lib/components/ui/label';
	import { Separator } from '$lib/components/ui/separator';
	import { validateForm } from '$lib/utils/validation';
	import {
		Building,
		DollarSign,
		MapPin,
		Phone,
		RotateCcw,
		Save,
		Shield,
		UserIcon,
		X
	} from '@lucide/svelte';
	import type { ValidationResult } from '$lib/utils/validation';
	import type { CreateUserInput, UpdateUserInput, User } from '$lib/types';

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
		const result = validateForm(formData, validationRules);
		validationErrors = result.errors;
		isValid = result.isValid;
	});

	function populateFormData() {
		if (!employee) return;

		formData = {
			firstName: employee.firstName || '',
			lastName: employee.lastName || '',
			email: employee.email || '',
			phoneNumber: employee.phoneNumber || '',
			jobTitle: employee.jobTitle || '',
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
	<Card.Root>
		<Card.Header>
			<Card.Title class="flex items-center gap-2">
				<UserIcon class="h-5 w-5" />
				Basic Information
			</Card.Title>
			<Card.Description>Personal details and contact information</Card.Description>
		</Card.Header>
		<Card.Content class="space-y-6">
			<div class="grid grid-cols-1 gap-4 md:grid-cols-2">
				<div class="space-y-2">
					<Label for="firstName">First Name *</Label>
					<Input
						id="firstName"
						bind:value={formData.firstName}
						placeholder="Enter first name"
						class={validationErrors.firstName ? 'border-destructive' : ''}
					/>
					{#if validationErrors.firstName}
						<p class="text-sm text-destructive">{validationErrors.firstName}</p>
					{/if}
				</div>

				<div class="space-y-2">
					<Label for="lastName">Last Name *</Label>
					<Input
						id="lastName"
						bind:value={formData.lastName}
						placeholder="Enter last name"
						class={validationErrors.lastName ? 'border-destructive' : ''}
					/>
					{#if validationErrors.lastName}
						<p class="text-sm text-destructive">{validationErrors.lastName}</p>
					{/if}
				</div>

				<div class="space-y-2">
					<Label for="email">Email *</Label>
					<Input
						id="email"
						type="email"
						bind:value={formData.email}
						placeholder="Enter email address"
						disabled={isEditing}
						class={validationErrors.email ? 'border-destructive' : ''}
					/>
					{#if validationErrors.email}
						<p class="text-sm text-destructive">{validationErrors.email}</p>
					{/if}
				</div>

				<div class="space-y-2">
					<Label for="phoneNumber">Phone Number</Label>
					<Input
						id="phoneNumber"
						type="tel"
						bind:value={formData.phoneNumber}
						placeholder="Enter phone number"
						class={validationErrors.phoneNumber ? 'border-destructive' : ''}
					/>
					{#if validationErrors.phoneNumber}
						<p class="text-sm text-destructive">{validationErrors.phoneNumber}</p>
					{/if}
				</div>
			</div>
		</Card.Content>
	</Card.Root>

	<!-- Employment Information -->
	<Card.Root>
		<Card.Header>
			<Card.Title class="flex items-center gap-2">
				<Building class="h-5 w-5" />
				Employment Information
			</Card.Title>
			<Card.Description>Job details, department, and work arrangement</Card.Description>
		</Card.Header>
		<Card.Content class="space-y-6">
			<div class="grid grid-cols-1 gap-4 md:grid-cols-2">
				<div class="space-y-2">
					<Label for="jobTitle">Job Title *</Label>
					<Input
						id="jobTitle"
						bind:value={formData.jobTitle}
						placeholder="Enter job title"
						class={validationErrors.jobTitle ? 'border-destructive' : ''}
					/>
					{#if validationErrors.jobTitle}
						<p class="text-sm text-destructive">{validationErrors.jobTitle}</p>
					{/if}
				</div>

				<div class="space-y-2">
					<Label for="departmentId">Department *</Label>
					<Select.Root
						selected={{
							value: formData.departmentId,
							label: departmentOptions.find((d) => d.value === formData.departmentId)?.label || ''
						}}
						onSelectedChange={(v: { value?: string; label?: string } | undefined) => (formData.departmentId = v?.value || '')}
					>
						<Select.Trigger class={validationErrors.departmentId ? 'border-destructive' : ''}>
							<Select.Value placeholder="Select department" />
						</Select.Trigger>
						<Select.Content>
							{#each departmentOptions as option}
								<Select.Item value={option.value}>{option.label}</Select.Item>
							{/each}
						</Select.Content>
					</Select.Root>
					{#if validationErrors.departmentId}
						<p class="text-sm text-destructive">{validationErrors.departmentId}</p>
					{/if}
				</div>

				<div class="space-y-2">
					<Label for="employmentType">Employment Type</Label>
					<Select.Root
						selected={{
							value: formData.employmentType,
							label:
								employmentTypeOptions.find((o) => o.value === formData.employmentType)?.label || ''
						}}
						onSelectedChange={(v: { value?: string; label?: string } | undefined) => (formData.employmentType = v?.value || 'FULL_TIME')}
					>
						<Select.Trigger>
							<Select.Value placeholder="Select employment type" />
						</Select.Trigger>
						<Select.Content>
							{#each employmentTypeOptions as option}
								<Select.Item value={option.value}>{option.label}</Select.Item>
							{/each}
						</Select.Content>
					</Select.Root>
				</div>

				<div class="space-y-2">
					<Label for="hireDate">Hire Date {!isEditing ? '*' : ''}</Label>
					<Input
						id="hireDate"
						type="date"
						bind:value={formData.hireDate}
						disabled={isEditing}
						class={validationErrors.hireDate ? 'border-destructive' : ''}
					/>
					{#if validationErrors.hireDate}
						<p class="text-sm text-destructive">{validationErrors.hireDate}</p>
					{/if}
				</div>

				<div class="space-y-2">
					<Label for="managerId">Manager</Label>
					<Select.Root
						selected={{
							value: formData.managerId,
							label: managerOptions.find((m) => m.value === formData.managerId)?.label || ''
						}}
						onSelectedChange={(v: { value?: string; label?: string } | undefined) => (formData.managerId = v?.value || '')}
					>
						<Select.Trigger>
							<Select.Value placeholder="Select manager" />
						</Select.Trigger>
						<Select.Content>
							{#each managerOptions as option}
								<Select.Item value={option.value}>{option.label}</Select.Item>
							{/each}
						</Select.Content>
					</Select.Root>
				</div>

				<div class="space-y-2">
					<div class="flex items-center space-x-2">
						<Switch id="isRemote" bind:checked={formData.isRemote} />
						<Label for="isRemote">Remote Work</Label>
					</div>
				</div>
			</div>

			{#if !isEditing}
				<Separator />
				<div class="grid grid-cols-1 gap-4 md:grid-cols-2">
					<div class="space-y-2">
						<Label for="salary">Salary</Label>
						<div class="relative">
							<DollarSign class="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
							<Input
								id="salary"
								type="number"
								bind:value={formData.salary}
								placeholder="Enter salary"
								class="pl-9"
							/>
						</div>
					</div>

					<div class="space-y-2">
						<Label for="payType">Pay Type</Label>
						<Select.Root
							selected={{
								value: formData.payType,
								label: payTypeOptions.find((p) => p.value === formData.payType)?.label || ''
							}}
							onSelectedChange={(v: { value?: string; label?: string } | undefined) => (formData.payType = v?.value || 'SALARY')}
						>
							<Select.Trigger>
								<Select.Value placeholder="Select pay type" />
							</Select.Trigger>
							<Select.Content>
								{#each payTypeOptions as option}
									<Select.Item value={option.value}>{option.label}</Select.Item>
								{/each}
							</Select.Content>
						</Select.Root>
					</div>
				</div>
			{/if}
		</Card.Content>
	</Card.Root>

	<!-- Address Information -->
	<Card.Root>
		<Card.Header>
			<Card.Title class="flex items-center gap-2">
				<MapPin class="h-5 w-5" />
				Address Information
			</Card.Title>
			<Card.Description>Home address and location details</Card.Description>
		</Card.Header>
		<Card.Content class="space-y-4">
			<div class="space-y-2">
				<Label for="addressStreet">Street Address</Label>
				<Input
					id="addressStreet"
					bind:value={formData.addressStreet}
					placeholder="Enter street address"
				/>
			</div>

			<div class="grid grid-cols-1 gap-4 md:grid-cols-3">
				<div class="space-y-2">
					<Label for="addressCity">City</Label>
					<Input id="addressCity" bind:value={formData.addressCity} placeholder="Enter city" />
				</div>

				<div class="space-y-2">
					<Label for="addressState">State</Label>
					<Input id="addressState" bind:value={formData.addressState} placeholder="Enter state" />
				</div>

				<div class="space-y-2">
					<Label for="addressZipCode">ZIP Code</Label>
					<Input
						id="addressZipCode"
						bind:value={formData.addressZipCode}
						placeholder="Enter ZIP code"
					/>
				</div>
			</div>
		</Card.Content>
	</Card.Root>

	<!-- Emergency Contact -->
	<Card.Root>
		<Card.Header>
			<Card.Title class="flex items-center gap-2">
				<Phone class="h-5 w-5" />
				Emergency Contact
			</Card.Title>
			<Card.Description>Emergency contact person details</Card.Description>
		</Card.Header>
		<Card.Content class="space-y-4">
			<div class="grid grid-cols-1 gap-4 md:grid-cols-2">
				<div class="space-y-2">
					<Label for="emergencyContactName">Contact Name</Label>
					<Input
						id="emergencyContactName"
						bind:value={formData.emergencyContactName}
						placeholder="Enter contact name"
					/>
				</div>

				<div class="space-y-2">
					<Label for="emergencyContactPhone">Contact Phone</Label>
					<Input
						id="emergencyContactPhone"
						type="tel"
						bind:value={formData.emergencyContactPhone}
						placeholder="Enter contact phone"
					/>
				</div>

				<div class="space-y-2 md:col-span-2">
					<Label for="emergencyContactRelationship">Relationship</Label>
					<Select.Root
						selected={{
							value: formData.emergencyContactRelationship,
							label:
								relationshipOptions.find((r) => r.value === formData.emergencyContactRelationship)
									?.label || ''
						}}
						onSelectedChange={(v: { value?: string; label?: string } | undefined) => (formData.emergencyContactRelationship = v?.value || '')}
					>
						<Select.Trigger>
							<Select.Value placeholder="Select relationship" />
						</Select.Trigger>
						<Select.Content>
							{#each relationshipOptions as option}
								<Select.Item value={option.value}>{option.label}</Select.Item>
							{/each}
						</Select.Content>
					</Select.Root>
				</div>
			</div>
		</Card.Content>
	</Card.Root>

	<!-- Authentication (only for new employees) -->
	{#if !isEditing}
		<Card.Root>
			<Card.Header>
				<Card.Title class="flex items-center gap-2">
					<Shield class="h-5 w-5" />
					Authentication & Roles
				</Card.Title>
				<Card.Description>User credentials and role assignments</Card.Description>
			</Card.Header>
			<Card.Content class="space-y-4">
				<div class="grid grid-cols-1 gap-4 md:grid-cols-2">
					<div class="space-y-2">
						<Label for="username">Username *</Label>
						<Input
							id="username"
							bind:value={formData.username}
							placeholder="Enter username"
							class={validationErrors.username ? 'border-destructive' : ''}
						/>
						{#if validationErrors.username}
							<p class="text-sm text-destructive">{validationErrors.username}</p>
						{/if}
					</div>

					<div class="space-y-2">
						<Label for="password">Password *</Label>
						<Input
							id="password"
							type="password"
							bind:value={formData.password}
							placeholder="Enter password"
							class={validationErrors.password ? 'border-destructive' : ''}
						/>
						{#if validationErrors.password}
							<p class="text-sm text-destructive">{validationErrors.password}</p>
						{/if}
					</div>

					<div class="space-y-2 md:col-span-2">
						<Label for="confirmPassword">Confirm Password *</Label>
						<Input
							id="confirmPassword"
							type="password"
							bind:value={formData.confirmPassword}
							placeholder="Confirm password"
							class={validationErrors.confirmPassword ? 'border-destructive' : ''}
						/>
						{#if validationErrors.confirmPassword}
							<p class="text-sm text-destructive">{validationErrors.confirmPassword}</p>
						{/if}
					</div>
				</div>

				<Separator />

				<div class="space-y-4">
					<Label>Role Assignments</Label>
					<div class="grid grid-cols-1 gap-4 md:grid-cols-2">
						{#each roleOptions as role}
							<div class="flex items-center space-x-2">
								<Checkbox
									id="role-{role.value}"
									checked={formData.roleIds.includes(role.value)}
									onCheckedChange={(checked) => {
										if (checked) {
											formData.roleIds = [...formData.roleIds, role.value];
										} else {
											formData.roleIds = formData.roleIds.filter((id) => id !== role.value);
										}
									}}
								/>
								<Label for="role-{role.value}" class="text-sm font-normal">
									{role.label}
								</Label>
							</div>
						{/each}
					</div>
				</div>
			</Card.Content>
		</Card.Root>
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
