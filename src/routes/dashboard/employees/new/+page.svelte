<script lang="ts">
	import { enhance } from '$app/forms';
	import { logger } from '$lib/utils/logger';
	import { goto } from '$app/navigation';
	import type { ActionData, PageData } from './$types';

	const { data, form }: { data: PageData; form: ActionData } = $props();

	// Form state
	let firstName = $state('');
	let lastName = $state('');
	let email = $state('');
	let password = $state('');
	let role = $state('employee');
	let departmentId = $state('');
	let hireDate = $state(new Date().toISOString().split('T')[0]);
	let isSubmitting = $state(false);

	// Validation state
	let errors = $state<Record<string, string>>({});

	// Client-side validation
	function validateForm() {
		errors = {};

		if (!firstName.trim()) {
			errors.firstName = 'First name is required';
		}

		if (!lastName.trim()) {
			errors.lastName = 'Last name is required';
		}

		if (!email.trim()) {
			errors.email = 'Email is required';
		} else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
			errors.email = 'Please enter a valid email address';
		}

		// Password is optional, but if provided must be at least 8 characters
		if (password && password.length < 8) {
			errors.password = 'Password must be at least 8 characters when provided';
		}

		return Object.keys(errors).length === 0;
	}

	// Handle cancel
	function handleCancel() {
		goto('/dashboard/employees');
	}
</script>

<svelte:head>
	<title>Add New Employee - MountainHR</title>
	<meta name="description" content="Add a new employee to the system" />
</svelte:head>

<div class="container mx-auto max-w-3xl px-4 py-8">
	<!-- Page Header -->
	<div class="mb-8">
		<h1 class="text-3xl font-bold text-foreground">Add New Employee</h1>
		<p class="mt-2 text-muted-foreground">
			Create a new employee profile and assign role and department
		</p>
	</div>

	<!-- Form Error Message -->
	{#if form?.error}
		<div
			class="mb-6 rounded-lg border border-destructive/50 bg-destructive/10 p-4 text-destructive"
		>
			<p class="font-medium">Error</p>
			<p class="text-sm">{form.error}</p>
		</div>
	{/if}

	<!-- Employee Form -->
	<form
		method="POST"
		use:enhance={() => {
			// Validate before submission
			if (!validateForm()) {
				return async () => {
					// Cancel submission
				};
			}

			isSubmitting = true;
			return async ({ result, update }) => {
				logger.info('[Employee Form] Result type:', result.type);
				logger.info('[Employee Form] Full result:'.replace(/['`]$/, `: ${result}'`/));
				isSubmitting = false;

				// Handle different result types
				if (result.type === 'redirect') {
					logger.info('[Employee Form] Redirecting to:', result.location);
					// Let the redirect happen naturally
					await update();
				} else if (result.type === 'failure') {
					logger.info('[Employee Form] Failure:', result.data);
					// Show error message
					await update();
				} else if (result.type === 'error') {
					logger.info('[Employee Form] Error:', result.error);
					await update();
				} else {
					logger.info('[Employee Form] Other result type:', result.type);
					// For any other result type, update normally
					await update();
				}
			};
		}}
		class="rounded-lg border border-border bg-card p-6 shadow-sm"
	>
		<div class="space-y-6">
			<!-- Personal Information Section -->
			<div>
				<h2 class="mb-4 text-xl font-semibold text-foreground">Personal Information</h2>
				<div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
					<!-- First Name -->
					<div>
						<label for="firstName" class="mb-2 block text-sm font-medium text-foreground">
							First Name <span class="text-destructive">*</span>
						</label>
						<input
							type="text"
							id="firstName"
							name="firstName"
							bind:value={firstName}
							required
							class="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:border-ring focus:ring-2 focus:ring-ring focus:outline-none"
							placeholder="John"
						/>
						{#if errors.firstName}
							<p class="mt-1 text-sm text-destructive">{errors.firstName}</p>
						{/if}
					</div>

					<!-- Last Name -->
					<div>
						<label for="lastName" class="mb-2 block text-sm font-medium text-foreground">
							Last Name <span class="text-destructive">*</span>
						</label>
						<input
							type="text"
							id="lastName"
							name="lastName"
							bind:value={lastName}
							required
							class="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:border-ring focus:ring-2 focus:ring-ring focus:outline-none"
							placeholder="Doe"
						/>
						{#if errors.lastName}
							<p class="mt-1 text-sm text-destructive">{errors.lastName}</p>
						{/if}
					</div>
				</div>

				<!-- Email -->
				<div class="mt-4">
					<label for="email" class="mb-2 block text-sm font-medium text-foreground">
						Email Address <span class="text-destructive">*</span>
					</label>
					<input
						type="email"
						id="email"
						name="email"
						bind:value={email}
						required
						class="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:border-ring focus:ring-2 focus:ring-ring focus:outline-none"
						placeholder="john.doe@company.com"
					/>
					{#if errors.email}
						<p class="mt-1 text-sm text-destructive">{errors.email}</p>
					{/if}
				</div>

				<!-- Password (Optional) -->
				<div class="mt-4">
					<label for="password" class="mb-2 block text-sm font-medium text-foreground">
						Initial Password (Optional)
					</label>
					<input
						type="password"
						id="password"
						name="password"
						bind:value={password}
						class="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring"
						placeholder="Minimum 8 characters"
					/>
					{#if errors.password}
						<p class="mt-1 text-sm text-destructive">{errors.password}</p>
					{/if}
					<p class="mt-1 text-sm text-muted-foreground">
						Leave blank to send the employee a password reset email
					</p>
				</div>
			</div>

			<!-- Employment Information Section -->
			<div class="border-t border-border pt-6">
				<h2 class="mb-4 text-xl font-semibold text-foreground">Employment Information</h2>
				<div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
					<!-- Role -->
					<div>
						<label for="role" class="mb-2 block text-sm font-medium text-foreground"> Role </label>
						<select
							id="role"
							name="role"
							bind:value={role}
							class="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground focus:border-ring focus:ring-2 focus:ring-ring focus:outline-none"
						>
							<option value="employee">Employee</option>
							<option value="manager">Manager</option>
							<option value="hr_manager">HR Manager</option>
							<option value="admin">Admin</option>
						</select>
					</div>

					<!-- Hire Date -->
					<div>
						<label for="hireDate" class="mb-2 block text-sm font-medium text-foreground">
							Hire Date
						</label>
						<input
							type="date"
							id="hireDate"
							name="hireDate"
							bind:value={hireDate}
							class="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground focus:border-ring focus:ring-2 focus:ring-ring focus:outline-none"
						/>
					</div>
				</div>

				<!-- Department -->
				<div class="mt-4">
					<label for="departmentId" class="mb-2 block text-sm font-medium text-foreground">
						Department
					</label>
					<select
						id="departmentId"
						name="departmentId"
						bind:value={departmentId}
						class="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground focus:border-ring focus:ring-2 focus:ring-ring focus:outline-none"
					>
						<option value="">No Department</option>
						{#each data.departments as dept}
							<option value={dept.id}>{dept.name}</option>
						{/each}
					</select>
					<p class="mt-1 text-sm text-muted-foreground">
						Assign the employee to a specific department (optional)
					</p>
				</div>
			</div>

			<!-- Form Actions -->
			<div class="flex items-center justify-end gap-3 border-t border-border pt-6">
				<button
					type="button"
					onclick={handleCancel}
					disabled={isSubmitting}
					class="rounded-md border border-input bg-background px-4 py-2 text-sm font-medium text-foreground hover:bg-accent hover:text-accent-foreground focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:outline-none disabled:cursor-not-allowed disabled:opacity-50"
				>
					Cancel
				</button>
				<button
					type="submit"
					disabled={isSubmitting}
					class="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:outline-none disabled:cursor-not-allowed disabled:opacity-50"
				>
					{isSubmitting ? 'Creating Employee...' : 'Create Employee'}
				</button>
			</div>
		</div>
	</form>

	<!-- Help Text -->
	<div class="mt-6 rounded-lg border border-border bg-muted/50 p-4">
		<h3 class="mb-2 text-sm font-medium text-foreground">Required Information</h3>
		<ul class="space-y-1 text-sm text-muted-foreground">
			<li>• First name, last name, and email address are required fields</li>
			<li>• Email must be unique and will be used for login credentials</li>
			<li>• Role determines the employee's permissions in the system</li>
			<li>• Department assignment can be changed later if needed</li>
		</ul>
	</div>
</div>
