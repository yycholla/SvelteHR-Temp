<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import { Textarea } from '$lib/components/ui/textarea';
	import { Switch } from '$lib/components/ui/switch';
	import { Checkbox } from '$lib/components/ui/checkbox';
	import * as Card from '$lib/components/ui/card';
	import * as Select from '$lib/components/ui/select';
	import * as Alert from '$lib/components/ui/alert';
	import {
		UserPlus,
		User,
		Mail,
		Phone,
		Calendar,
		MapPin,
		Building2,
		Shield,
		Key,
		Save,
		X,
		ArrowLeft,
		AlertCircle,
		CheckCircle
	} from 'lucide-svelte';
	import { goto } from '$app/navigation';
	import { createUser as createUserAPI } from '$lib/graphql/user-operations.js';

	// Form data
	let newUser = $state({
		// Personal Information
		firstName: '',
		lastName: '',
		email: '',
		phone: '',
		dateOfBirth: '',

		// Address
		address: '',
		city: '',
		state: '',
		zipCode: '',
		country: 'United States',

		// Employment
		employeeId: '',
		department: '',
		position: '',
		manager: '',
		startDate: '',
		salary: '',
		employmentType: 'full-time',

		// System Access
		role: 'employee',
		isActive: true,
		requirePasswordReset: true,
		sendWelcomeEmail: true,

		// Permissions
		permissions: {
			canViewReports: false,
			canManageLeave: false,
			canEditProfile: true,
			canAccessPayroll: false,
			canManageTeam: false
		},

		// Notes
		notes: ''
	});

	let loading = $state(false);
	let formErrors = $state<Record<string, string>>({});
	let showSuccess = $state(false);

	// Department options
	const departments = [
		'Human Resources',
		'Engineering',
		'Marketing',
		'Sales',
		'Finance',
		'Operations',
		'Legal',
		'IT Support'
	];

	// Role options
	const roles = [
		{ value: 'admin', label: 'Administrator', description: 'Full system access' },
		{ value: 'hr', label: 'HR', description: 'HR management access' },
		{ value: 'manager', label: 'Manager', description: 'Team management access' },
		{ value: 'employee', label: 'Employee', description: 'Standard user access' }
	];

	// Employment types
	const employmentTypes = [
		'full-time',
		'part-time',
		'contract',
		'intern',
		'consultant'
	];

	function validateForm() {
		const errors: Record<string, string> = {};

		// Required fields
		if (!newUser.firstName.trim()) errors.firstName = 'First name is required';
		if (!newUser.lastName.trim()) errors.lastName = 'Last name is required';
		if (!newUser.email.trim()) errors.email = 'Email is required';
		if (!newUser.department) errors.department = 'Department is required';
		if (!newUser.position.trim()) errors.position = 'Position is required';
		if (!newUser.startDate) errors.startDate = 'Start date is required';

		// Email validation
		if (newUser.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(newUser.email)) {
			errors.email = 'Please enter a valid email address';
		}

		// Phone validation (if provided)
		if (newUser.phone && !/^\+?[\d\s\-\(\)]{10,}$/.test(newUser.phone)) {
			errors.phone = 'Please enter a valid phone number';
		}

		// Salary validation (if provided)
		if (newUser.salary && (isNaN(Number(newUser.salary)) || Number(newUser.salary) < 0)) {
			errors.salary = 'Please enter a valid salary amount';
		}

		formErrors = errors;
		return Object.keys(errors).length === 0;
	}

	function generateEmployeeId() {
		const prefix = newUser.department.substring(0, 2).toUpperCase() || 'EMP';
		const timestamp = Date.now().toString().slice(-6);
		newUser.employeeId = `${prefix}${timestamp}`;
	}

	async function createUser() {
		if (!validateForm()) return;

		loading = true;

		try {
			// Generate employee ID if not provided
			if (!newUser.employeeId) {
				generateEmployeeId();
			}

			// Create the user via GraphQL API
			const userData = {
				email: newUser.email,
				displayName: `${newUser.firstName} ${newUser.lastName}`.trim(),
				role: newUser.role,
				isActive: newUser.isActive
			};

			console.log('Creating user with data:', userData);
			const createdUser = await createUserAPI(userData);
			console.log('User created successfully:', createdUser);

			showSuccess = true;

			// Reset form after successful creation
			setTimeout(() => {
				goto('/dashboard/admin/users');
			}, 2000);

		} catch (error) {
			console.error('Error creating user:', error);
			formErrors.general = 'Failed to create user. Please try again.';
		} finally {
			loading = false;
		}
	}

	function cancelCreation() {
		goto('/dashboard/admin/users');
	}

	function clearForm() {
		newUser = {
			firstName: '',
			lastName: '',
			email: '',
			phone: '',
			dateOfBirth: '',
			address: '',
			city: '',
			state: '',
			zipCode: '',
			country: 'United States',
			employeeId: '',
			department: '',
			position: '',
			manager: '',
			startDate: '',
			salary: '',
			employmentType: 'full-time',
			role: 'employee',
			isActive: true,
			requirePasswordReset: true,
			sendWelcomeEmail: true,
			permissions: {
				canViewReports: false,
				canManageLeave: false,
				canEditProfile: true,
				canAccessPayroll: false,
				canManageTeam: false
			},
			notes: ''
		};
		formErrors = {};
	}
</script>

<svelte:head>
	<title>Add New User - Admin Dashboard</title>
</svelte:head>

<div class="space-y-6">
	<!-- Header -->
	<div class="flex items-center justify-between">
		<div>
			<div class="flex items-center gap-3 mb-2">
				<Button variant="ghost" size="sm" href="/dashboard/admin/users" class="p-2">
					<ArrowLeft class="h-4 w-4" />
				</Button>
				<h1 class="text-3xl font-bold tracking-tight flex items-center gap-3">
					<UserPlus class="h-8 w-8" />
					Add New User
				</h1>
			</div>
			<p class="text-muted-foreground">
				Create a new user account and set up their profile
			</p>
		</div>
		<div class="flex items-center gap-3">
			<Button variant="outline" onclick={clearForm}>
				<X class="h-4 w-4 mr-2" />
				Clear Form
			</Button>
			<Button variant="outline" onclick={cancelCreation}>
				Cancel
			</Button>
			<Button onclick={createUser} disabled={loading}>
				{#if loading}
					<div class="h-4 w-4 mr-2 animate-spin rounded-full border-2 border-current border-t-transparent"></div>
				{:else}
					<Save class="h-4 w-4 mr-2" />
				{/if}
				Create User
			</Button>
		</div>
	</div>

	<!-- Success Alert -->
	{#if showSuccess}
		<Alert.Root class="border-green-200 bg-green-50">
			<CheckCircle class="h-4 w-4 text-green-600" />
			<Alert.Title class="text-green-800">User Created Successfully!</Alert.Title>
			<Alert.Description class="text-green-700">
				The new user account has been created and a welcome email has been sent.
			</Alert.Description>
		</Alert.Root>
	{/if}

	<!-- General Error Alert -->
	{#if formErrors.general}
		<Alert.Root variant="destructive">
			<AlertCircle class="h-4 w-4" />
			<Alert.Title>Error</Alert.Title>
			<Alert.Description>{formErrors.general}</Alert.Description>
		</Alert.Root>
	{/if}

	<!-- Form Content -->
	<div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
		<!-- Personal Information -->
		<Card.Root>
			<Card.Header>
				<Card.Title class="flex items-center gap-2">
					<User class="h-5 w-5" />
					Personal Information
				</Card.Title>
			</Card.Header>
			<Card.Content class="space-y-4">
				<div class="grid grid-cols-2 gap-4">
					<div class="space-y-2">
						<Label for="firstName">First Name *</Label>
						<Input
							id="firstName"
							bind:value={newUser.firstName}
							placeholder="John"
							class={formErrors.firstName ? 'border-red-500' : ''}
						/>
						{#if formErrors.firstName}
							<p class="text-sm text-red-600">{formErrors.firstName}</p>
						{/if}
					</div>
					<div class="space-y-2">
						<Label for="lastName">Last Name *</Label>
						<Input
							id="lastName"
							bind:value={newUser.lastName}
							placeholder="Doe"
							class={formErrors.lastName ? 'border-red-500' : ''}
						/>
						{#if formErrors.lastName}
							<p class="text-sm text-red-600">{formErrors.lastName}</p>
						{/if}
					</div>
				</div>
				<div class="space-y-2">
					<Label for="email">Email Address *</Label>
					<Input
						id="email"
						type="email"
						bind:value={newUser.email}
						placeholder="john.doe@company.com"
						class={formErrors.email ? 'border-red-500' : ''}
					/>
					{#if formErrors.email}
						<p class="text-sm text-red-600">{formErrors.email}</p>
					{/if}
				</div>
				<div class="space-y-2">
					<Label for="phone">Phone Number</Label>
					<Input
						id="phone"
						bind:value={newUser.phone}
						placeholder="+1 (555) 123-4567"
						class={formErrors.phone ? 'border-red-500' : ''}
					/>
					{#if formErrors.phone}
						<p class="text-sm text-red-600">{formErrors.phone}</p>
					{/if}
				</div>
				<div class="space-y-2">
					<Label for="dateOfBirth">Date of Birth</Label>
					<Input
						id="dateOfBirth"
						type="date"
						bind:value={newUser.dateOfBirth}
					/>
				</div>
			</Card.Content>
		</Card.Root>

		<!-- Employment Information -->
		<Card.Root>
			<Card.Header>
				<Card.Title class="flex items-center gap-2">
					<Building2 class="h-5 w-5" />
					Employment Information
				</Card.Title>
			</Card.Header>
			<Card.Content class="space-y-4">
				<div class="space-y-2">
					<Label for="employeeId">Employee ID</Label>
					<div class="flex gap-2">
						<Input
							id="employeeId"
							bind:value={newUser.employeeId}
							placeholder="Auto-generated if empty"
						/>
						<Button variant="outline" size="sm" onclick={generateEmployeeId}>
							Generate
						</Button>
					</div>
				</div>
				<div class="space-y-2">
					<Label for="department">Department *</Label>
					<select
						id="department"
						bind:value={newUser.department}
						class={`flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 ${formErrors.department ? 'border-red-500' : ''}`}
					>
						<option value="">Select department</option>
						{#each departments as dept}
							<option value={dept}>{dept}</option>
						{/each}
					</select>
					{#if formErrors.department}
						<p class="text-sm text-red-600">{formErrors.department}</p>
					{/if}
				</div>
				<div class="space-y-2">
					<Label for="position">Position *</Label>
					<Input
						id="position"
						bind:value={newUser.position}
						placeholder="Software Engineer"
						class={formErrors.position ? 'border-red-500' : ''}
					/>
					{#if formErrors.position}
						<p class="text-sm text-red-600">{formErrors.position}</p>
					{/if}
				</div>
				<div class="space-y-2">
					<Label for="manager">Manager</Label>
					<Input
						id="manager"
						bind:value={newUser.manager}
						placeholder="Jane Smith"
					/>
				</div>
				<div class="grid grid-cols-2 gap-4">
					<div class="space-y-2">
						<Label for="startDate">Start Date *</Label>
						<Input
							id="startDate"
							type="date"
							bind:value={newUser.startDate}
							class={formErrors.startDate ? 'border-red-500' : ''}
						/>
						{#if formErrors.startDate}
							<p class="text-sm text-red-600">{formErrors.startDate}</p>
						{/if}
					</div>
					<div class="space-y-2">
						<Label for="employmentType">Employment Type</Label>
						<select
							id="employmentType"
							bind:value={newUser.employmentType}
							class="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
						>
							{#each employmentTypes as type}
								<option value={type}>{type}</option>
							{/each}
						</select>
					</div>
				</div>
				<div class="space-y-2">
					<Label for="salary">Annual Salary ($)</Label>
					<Input
						id="salary"
						type="number"
						bind:value={newUser.salary}
						placeholder="75000"
						class={formErrors.salary ? 'border-red-500' : ''}
					/>
					{#if formErrors.salary}
						<p class="text-sm text-red-600">{formErrors.salary}</p>
					{/if}
				</div>
			</Card.Content>
		</Card.Root>

		<!-- System Access & Permissions -->
		<Card.Root>
			<Card.Header>
				<Card.Title class="flex items-center gap-2">
					<Shield class="h-5 w-5" />
					System Access
				</Card.Title>
			</Card.Header>
			<Card.Content class="space-y-4">
				<div class="space-y-2">
					<Label for="role">User Role</Label>
					<select
						id="role"
						bind:value={newUser.role}
						class="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
					>
						{#each roles as role}
							<option value={role.value}>{role.label} - {role.description}</option>
						{/each}
					</select>
				</div>

				<div class="space-y-4">
					<div class="flex items-center justify-between">
						<div class="space-y-1">
							<Label>Account Active</Label>
							<p class="text-sm text-muted-foreground">User can log in to the system</p>
						</div>
						<Switch bind:checked={newUser.isActive} />
					</div>
					<div class="flex items-center justify-between">
						<div class="space-y-1">
							<Label>Require Password Reset</Label>
							<p class="text-sm text-muted-foreground">User must set password on first login</p>
						</div>
						<Switch bind:checked={newUser.requirePasswordReset} />
					</div>
					<div class="flex items-center justify-between">
						<div class="space-y-1">
							<Label>Send Welcome Email</Label>
							<p class="text-sm text-muted-foreground">Send account details to user's email</p>
						</div>
						<Switch bind:checked={newUser.sendWelcomeEmail} />
					</div>
				</div>

				<div class="space-y-3">
					<Label>Additional Permissions</Label>
					<div class="space-y-3">
						<div class="flex items-center space-x-2">
							<Checkbox
								id="canViewReports"
								bind:checked={newUser.permissions.canViewReports}
							/>
							<Label for="canViewReports" class="text-sm">Can view reports</Label>
						</div>
						<div class="flex items-center space-x-2">
							<Checkbox
								id="canManageLeave"
								bind:checked={newUser.permissions.canManageLeave}
							/>
							<Label for="canManageLeave" class="text-sm">Can manage leave requests</Label>
						</div>
						<div class="flex items-center space-x-2">
							<Checkbox
								id="canEditProfile"
								bind:checked={newUser.permissions.canEditProfile}
							/>
							<Label for="canEditProfile" class="text-sm">Can edit own profile</Label>
						</div>
						<div class="flex items-center space-x-2">
							<Checkbox
								id="canAccessPayroll"
								bind:checked={newUser.permissions.canAccessPayroll}
							/>
							<Label for="canAccessPayroll" class="text-sm">Can access payroll data</Label>
						</div>
						<div class="flex items-center space-x-2">
							<Checkbox
								id="canManageTeam"
								bind:checked={newUser.permissions.canManageTeam}
							/>
							<Label for="canManageTeam" class="text-sm">Can manage team members</Label>
						</div>
					</div>
				</div>
			</Card.Content>
		</Card.Root>
	</div>

	<!-- Address Information -->
	<Card.Root>
		<Card.Header>
			<Card.Title class="flex items-center gap-2">
				<MapPin class="h-5 w-5" />
				Address Information
			</Card.Title>
		</Card.Header>
		<Card.Content>
			<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
				<div class="space-y-2 md:col-span-2">
					<Label for="address">Street Address</Label>
					<Input
						id="address"
						bind:value={newUser.address}
						placeholder="123 Main Street"
					/>
				</div>
				<div class="space-y-2">
					<Label for="city">City</Label>
					<Input
						id="city"
						bind:value={newUser.city}
						placeholder="New York"
					/>
				</div>
				<div class="space-y-2">
					<Label for="state">State/Province</Label>
					<Input
						id="state"
						bind:value={newUser.state}
						placeholder="NY"
					/>
				</div>
				<div class="space-y-2">
					<Label for="zipCode">ZIP/Postal Code</Label>
					<Input
						id="zipCode"
						bind:value={newUser.zipCode}
						placeholder="10001"
					/>
				</div>
				<div class="space-y-2">
					<Label for="country">Country</Label>
					<Input
						id="country"
						bind:value={newUser.country}
						placeholder="United States"
					/>
				</div>
			</div>
		</Card.Content>
	</Card.Root>

	<!-- Notes -->
	<Card.Root>
		<Card.Header>
			<Card.Title>Additional Notes</Card.Title>
		</Card.Header>
		<Card.Content>
			<div class="space-y-2">
				<Label for="notes">Notes</Label>
				<Textarea
					id="notes"
					bind:value={newUser.notes}
					placeholder="Any additional information about this user..."
					rows="4"
				/>
			</div>
		</Card.Content>
	</Card.Root>
</div>