<script lang="ts">
	import { onMount } from 'svelte';
	import { page } from '$app/stores';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import { Textarea } from '$lib/components/ui/textarea';
	import { Switch } from '$lib/components/ui/switch';
	import { Checkbox } from '$lib/components/ui/checkbox';
	import * as Card from '$lib/components/ui/card';
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
		CheckCircle,
		Edit
	} from 'lucide-svelte';
	import { goto } from '$app/navigation';
	import { getUserById, updateUser as updateUserAPI, getUserRolesList } from '$lib/graphql/user-operations.js';

	// Get user ID from URL params
	const userId = $page.params.id;

	// Form data
	let editUser = $state({
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
		requirePasswordReset: false,
		sendWelcomeEmail: false,

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
	let initialLoading = $state(true);
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

	onMount(async () => {
		await loadUser();
		initialLoading = false;
	});

	async function loadUser() {
		try {
			loading = true;
			const user = await getUserById(userId);

			if (user) {
				// Split display name back to first/last name
				const nameParts = (user.displayName || '').split(' ');
				editUser.firstName = nameParts[0] || '';
				editUser.lastName = nameParts.slice(1).join(' ') || '';
				editUser.email = user.email;
				editUser.isActive = user.isActive;

				// Get current role
				const roleAssignments = user.userRoleAssignmentsByUserId?.nodes;
				if (roleAssignments && roleAssignments.length > 0) {
					const activeRole = roleAssignments.find(r => r.isActive);
					if (activeRole) {
						editUser.role = activeRole.userRoleByRoleId.name;
					}
				}

				console.log('Loaded user for editing:', user);
			} else {
				formErrors.general = 'User not found';
			}
		} catch (error) {
			console.error('Error loading user:', error);
			formErrors.general = 'Failed to load user data';
		} finally {
			loading = false;
		}
	}

	function validateForm() {
		const errors: Record<string, string> = {};

		// Required fields
		if (!editUser.firstName.trim()) errors.firstName = 'First name is required';
		if (!editUser.lastName.trim()) errors.lastName = 'Last name is required';
		if (!editUser.email.trim()) errors.email = 'Email is required';

		// Email validation
		if (editUser.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(editUser.email)) {
			errors.email = 'Please enter a valid email address';
		}

		// Phone validation (if provided)
		if (editUser.phone && !/^\+?[\d\s\-\(\)]{10,}$/.test(editUser.phone)) {
			errors.phone = 'Please enter a valid phone number';
		}

		// Salary validation (if provided)
		if (editUser.salary && (isNaN(Number(editUser.salary)) || Number(editUser.salary) < 0)) {
			errors.salary = 'Please enter a valid salary amount';
		}

		formErrors = errors;
		return Object.keys(errors).length === 0;
	}

	async function updateUser() {
		if (!validateForm()) return;

		loading = true;

		try {
			// Update the user via GraphQL API
			const userData = {
				id: userId,
				email: editUser.email,
				displayName: `${editUser.firstName} ${editUser.lastName}`.trim(),
				isActive: editUser.isActive
			};

			console.log('Updating user with data:', userData);
			const updatedUser = await updateUserAPI(userData);
			console.log('User updated successfully:', updatedUser);

			showSuccess = true;

			// Navigate back after successful update
			setTimeout(() => {
				goto('/dashboard/admin/users');
			}, 2000);

		} catch (error) {
			console.error('Error updating user:', error);
			formErrors.general = 'Failed to update user. Please try again.';
		} finally {
			loading = false;
		}
	}

	function cancelEdit() {
		goto('/dashboard/admin/users');
	}
</script>

<svelte:head>
	<title>Edit User - Admin Dashboard</title>
</svelte:head>

{#if initialLoading}
	<div class="space-y-4">
		<div class="flex items-center gap-3">
			<div class="h-8 w-8 bg-muted rounded animate-pulse"></div>
			<div class="h-8 w-64 bg-muted rounded animate-pulse"></div>
		</div>
		{#each Array(3) as _}
			<div class="h-32 bg-muted rounded animate-pulse"></div>
		{/each}
	</div>
{:else}
	<div class="space-y-6">
		<!-- Header -->
		<div class="flex items-center justify-between">
			<div>
				<div class="flex items-center gap-3 mb-2">
					<Button variant="ghost" size="sm" href="/dashboard/admin/users" class="p-2">
						<ArrowLeft class="h-4 w-4" />
					</Button>
					<h1 class="text-3xl font-bold tracking-tight flex items-center gap-3">
						<Edit class="h-8 w-8" />
						Edit User
					</h1>
				</div>
				<p class="text-muted-foreground">
					Update user account information and settings
				</p>
			</div>
			<div class="flex items-center gap-3">
				<Button variant="outline" onclick={cancelEdit}>
					Cancel
				</Button>
				<Button onclick={updateUser} disabled={loading}>
					{#if loading}
						<div class="h-4 w-4 mr-2 animate-spin rounded-full border-2 border-current border-t-transparent"></div>
					{:else}
						<Save class="h-4 w-4 mr-2" />
					{/if}
					Update User
				</Button>
			</div>
		</div>

		<!-- Success Alert -->
		{#if showSuccess}
			<Alert.Root class="border-green-200 bg-green-50">
				<CheckCircle class="h-4 w-4 text-green-600" />
				<Alert.Title class="text-green-800">User Updated Successfully!</Alert.Title>
				<Alert.Description class="text-green-700">
					The user account has been updated successfully.
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
								bind:value={editUser.firstName}
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
								bind:value={editUser.lastName}
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
							bind:value={editUser.email}
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
							bind:value={editUser.phone}
							placeholder="+1 (555) 123-4567"
							class={formErrors.phone ? 'border-red-500' : ''}
						/>
						{#if formErrors.phone}
							<p class="text-sm text-red-600">{formErrors.phone}</p>
						{/if}
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
						<Label for="department">Department</Label>
						<select
							id="department"
							bind:value={editUser.department}
							class="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
						>
							<option value="">Select department</option>
							{#each departments as dept}
								<option value={dept}>{dept}</option>
							{/each}
						</select>
					</div>
					<div class="space-y-2">
						<Label for="position">Position</Label>
						<Input
							id="position"
							bind:value={editUser.position}
							placeholder="Software Engineer"
						/>
					</div>
					<div class="space-y-2">
						<Label for="employmentType">Employment Type</Label>
						<select
							id="employmentType"
							bind:value={editUser.employmentType}
							class="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
						>
							{#each employmentTypes as type}
								<option value={type}>{type}</option>
							{/each}
						</select>
					</div>
				</Card.Content>
			</Card.Root>

			<!-- System Access -->
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
							bind:value={editUser.role}
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
							<Switch bind:checked={editUser.isActive} />
						</div>
					</div>

					<div class="space-y-3">
						<Label>Additional Permissions</Label>
						<div class="space-y-3">
							<div class="flex items-center space-x-2">
								<Checkbox
									id="canViewReports"
									bind:checked={editUser.permissions.canViewReports}
								/>
								<Label for="canViewReports" class="text-sm">Can view reports</Label>
							</div>
							<div class="flex items-center space-x-2">
								<Checkbox
									id="canManageLeave"
									bind:checked={editUser.permissions.canManageLeave}
								/>
								<Label for="canManageLeave" class="text-sm">Can manage leave requests</Label>
							</div>
							<div class="flex items-center space-x-2">
								<Checkbox
									id="canEditProfile"
									bind:checked={editUser.permissions.canEditProfile}
								/>
								<Label for="canEditProfile" class="text-sm">Can edit own profile</Label>
							</div>
							<div class="flex items-center space-x-2">
								<Checkbox
									id="canAccessPayroll"
									bind:checked={editUser.permissions.canAccessPayroll}
								/>
								<Label for="canAccessPayroll" class="text-sm">Can access payroll data</Label>
							</div>
							<div class="flex items-center space-x-2">
								<Checkbox
									id="canManageTeam"
									bind:checked={editUser.permissions.canManageTeam}
								/>
								<Label for="canManageTeam" class="text-sm">Can manage team members</Label>
							</div>
						</div>
					</div>
				</Card.Content>
			</Card.Root>
		</div>

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
						bind:value={editUser.notes}
						placeholder="Any additional information about this user..."
						rows="4"
					/>
				</div>
			</Card.Content>
		</Card.Root>
	</div>
{/if}