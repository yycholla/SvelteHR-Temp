<!--
 * Employee Create Dialog
 * Modal dialog for creating new employees/users with full user details
 * Includes: Personal info, credentials, role, department assignment
 -->

<script lang="ts">
	import * as Dialog from '$lib/components/ui/dialog';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import { toast } from 'svelte-sonner';
	import { Loader2, UserPlus } from '@lucide/svelte';

	interface Props {
		open: boolean;
		onOpenChange: (open: boolean) => void;
		departments: Array<{ id: string; name: string }>;
		roles: Array<{ id: string; name: string; description?: string }>;
		onSuccess?: () => void;
	}

	let { open = $bindable(), onOpenChange, departments, roles, onSuccess }: Props = $props();

	// Form state
	let submitting = $state(false);
	let formData = $state({
		firstName: '',
		lastName: '',
		email: '',
		password: '',
		role: 'employee',
		departmentId: '',
		jobTitle: '',
		phoneNumber: '',
		hireDate: new Date().toISOString().split('T')[0]
	});

	// Field errors state
	let fieldErrors = $state<Record<string, string>>({});

	// Map roles from database to dropdown options (convert role names for form values)
	// Defensive: Filter out invalid roles and use optional chaining to prevent SSR crashes
	const roleOptions = $derived(
		roles
			.filter((role) => role && role.name) // Filter out roles with undefined name
			.map((role) => ({
				value: role.name?.toLowerCase().replace(/\s+/g, '_') ?? 'unknown', // "HR Manager" -> "hr_manager"
				label: role.name ?? 'Unknown Role',
				description: role.description || ''
			}))
	);

	// Password generation
	function generatePassword(): string {
		const length = 12;
		const charset =
			'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*()_+-=[]{}|;:,.<>?';
		let password = '';
		for (let i = 0; i < length; i++) {
			password += charset.charAt(Math.floor(Math.random() * charset.length));
		}
		return password;
	}

	function handleGeneratePassword() {
		formData.password = generatePassword();
		toast.success('Password generated');
	}

	function resetForm() {
		formData = {
			firstName: '',
			lastName: '',
			email: '',
			password: '',
			role: 'employee',
			departmentId: '',
			jobTitle: '',
			phoneNumber: '',
			hireDate: new Date().toISOString().split('T')[0]
		};
		fieldErrors = {};
	}

	// Clear error for a specific field
	function clearFieldError(field: string) {
		if (fieldErrors[field]) {
			const { [field]: _, ...rest } = fieldErrors;
			fieldErrors = rest;
		}
	}

	// Parse GraphQL error message to extract field-specific errors
	function parseErrorMessage(message: string): { field: string | null; message: string } {
		// Check for validation error patterns
		// Pattern: "Email 'xxx' is already in use"
		const emailInUseMatch = message.match(/Email '([^']+)' is already in use/i);
		if (emailInUseMatch) {
			return { field: 'email', message: 'This email address is already in use' };
		}

		// Pattern: "Field 'xxx' is required"
		const fieldRequiredMatch = message.match(/Field '([^']+)' is required/i);
		if (fieldRequiredMatch) {
			return { field: fieldRequiredMatch[1], message: 'This field is required' };
		}

		// Pattern: "Invalid xxx" or "xxx is invalid"
		const invalidFieldMatch = message.match(/Invalid (\w+)|(\w+) is invalid/i);
		if (invalidFieldMatch) {
			const field = invalidFieldMatch[1] || invalidFieldMatch[2];
			return { field: field.toLowerCase(), message: `Invalid ${field}` };
		}

		// Return generic error if no specific field pattern matched
		return { field: null, message };
	}

	async function handleSubmit(event: Event) {
		event.preventDefault();
		submitting = true;
		fieldErrors = {}; // Clear previous errors

		try {
			const form = event.target as HTMLFormElement;
			const formDataObj = new FormData(form);

			const response = await fetch('/dashboard/employees/new', {
				method: 'POST',
				body: formDataObj
			});

			// Parse response body
			const result = await response.json();
			console.log('[EmployeeCreateDialog] Response status:', response.status);
			console.log('[EmployeeCreateDialog] Response body:', result);

			// Check if request was successful based on HTTP status
			if (response.ok) {
				// Handle different success response types
				if (result.type === 'success' || result.employeeId) {
					// Direct success response
					toast.success('Employee created successfully');
					resetForm();
					open = false;
					onSuccess?.();
				} else if (result.type === 'redirect') {
					// SvelteKit serialized redirect - treat as success
					toast.success('Employee created successfully');
					resetForm();
					open = false;
					onSuccess?.();
					// Note: We don't navigate to the redirect location since we're in a dialog
				} else {
					// Unexpected success format
					toast.error('Employee created but response format unexpected');
					console.error('[EmployeeCreateDialog] Unexpected success format:', result);
				}
			} else {
				// Error case - extract error message from result
				// SvelteKit fail() returns: { error: 'message' } for fetch requests
				const errorMessage = result.error || result.data?.error || 'Failed to create employee';
				console.log('[EmployeeCreateDialog] Error message:', errorMessage);

				// Parse error to see if it's field-specific
				const { field, message } = parseErrorMessage(errorMessage);

				if (field) {
					// Set field-specific error
					fieldErrors[field] = message;
					toast.error(message);
				} else {
					// Generic error
					toast.error(message);
				}
			}
		} catch (error) {
			toast.error('An unexpected error occurred');
			console.error('[EmployeeCreateDialog] Error:', error);
		} finally {
			submitting = false;
		}
	}

	// Email generation from name
	$effect(() => {
		if (formData.firstName && formData.lastName) {
			const emailPrefix = `${formData.firstName.toLowerCase()}.${formData.lastName.toLowerCase()}`;
			if (!formData.email || formData.email.endsWith('@mountainhr.dev')) {
				formData.email = `${emailPrefix}@mountainhr.dev`;
			}
		}
	});
</script>

<Dialog.Root {open} onOpenChange={(newOpen) => onOpenChange(newOpen)}>
	<Dialog.Content class="max-w-2xl max-h-[90vh] overflow-y-auto">
		<Dialog.Header>
			<Dialog.Title class="flex items-center gap-2">
				<UserPlus class="h-5 w-5" />
				Create New Employee
			</Dialog.Title>
			<Dialog.Description>
				Add a new employee to the system with their account details and initial password.
			</Dialog.Description>
		</Dialog.Header>

		<form onsubmit={handleSubmit} class="space-y-6">
			<!-- Personal Information -->
			<div class="space-y-4">
				<h3 class="text-sm font-semibold text-muted-foreground">Personal Information</h3>

				<div class="grid grid-cols-2 gap-4">
					<div class="space-y-2">
						<Label for="firstName">
							First Name <span class="text-red-500">*</span>
						</Label>
						<Input
							id="firstName"
							name="firstName"
							bind:value={formData.firstName}
							oninput={() => clearFieldError('firstName')}
							required
							placeholder="John"
							disabled={submitting}
							class={fieldErrors.firstName ? 'border-red-500 focus-visible:ring-red-500' : ''}
						/>
						{#if fieldErrors.firstName}
							<p class="text-sm text-red-500">{fieldErrors.firstName}</p>
						{/if}
					</div>

					<div class="space-y-2">
						<Label for="lastName">
							Last Name <span class="text-red-500">*</span>
						</Label>
						<Input
							id="lastName"
							name="lastName"
							bind:value={formData.lastName}
							oninput={() => clearFieldError('lastName')}
							required
							placeholder="Doe"
							disabled={submitting}
							class={fieldErrors.lastName ? 'border-red-500 focus-visible:ring-red-500' : ''}
						/>
						{#if fieldErrors.lastName}
							<p class="text-sm text-red-500">{fieldErrors.lastName}</p>
						{/if}
					</div>
				</div>

				<div class="space-y-2">
					<Label for="email">
						Email Address <span class="text-red-500">*</span>
					</Label>
					<Input
						id="email"
						name="email"
						type="email"
						bind:value={formData.email}
						oninput={() => clearFieldError('email')}
						required
						placeholder="john.doe@mountainhr.dev"
						disabled={submitting}
						class={fieldErrors.email ? 'border-red-500 focus-visible:ring-red-500' : ''}
					/>
					{#if fieldErrors.email}
						<p class="text-sm text-red-500">{fieldErrors.email}</p>
					{/if}
				</div>

				<div class="space-y-2">
					<Label for="phone">Phone Number</Label>
					<Input
						id="phone"
						name="phone"
						type="tel"
						bind:value={formData.phoneNumber}
						placeholder="+1 (555) 123-4567"
						disabled={submitting}
					/>
				</div>
			</div>

			<!-- Employment Details -->
			<div class="space-y-4">
				<h3 class="text-sm font-semibold text-muted-foreground">Employment Details</h3>

				<div class="space-y-2">
					<Label for="jobTitle">Job Title</Label>
					<Input
						id="jobTitle"
						name="jobTitle"
						bind:value={formData.jobTitle}
						placeholder="Software Engineer"
						disabled={submitting}
					/>
				</div>

				<div class="grid grid-cols-2 gap-4">
					<div class="space-y-2">
						<Label for="departmentId">
							Department <span class="text-red-500">*</span>
						</Label>
						<select
							id="departmentId"
							name="departmentId"
							bind:value={formData.departmentId}
							onchange={() => clearFieldError('departmentId')}
							required
							disabled={submitting}
							class="shadow-xs flex h-9 w-full min-w-0 rounded-md border border-input bg-muted px-3 py-1 text-base outline-none ring-offset-background transition-[color,box-shadow] disabled:cursor-not-allowed disabled:opacity-50 dark:bg-input/80 md:text-sm focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 {fieldErrors.departmentId ? 'border-red-500 focus-visible:ring-red-500' : ''}"
						>
							<option value="">Select Department</option>
							{#each departments as dept (dept.id)}
								<option value={dept.id}>{dept.name}</option>
							{/each}
						</select>
						{#if fieldErrors.departmentId}
							<p class="text-sm text-red-500">{fieldErrors.departmentId}</p>
						{/if}
					</div>

					<div class="space-y-2">
						<Label for="hireDate">
							Hire Date <span class="text-red-500">*</span>
						</Label>
						<Input
							id="hireDate"
							name="hireDate"
							type="date"
							bind:value={formData.hireDate}
							required
							disabled={submitting}
						/>
					</div>
				</div>

				<div class="space-y-2">
					<Label for="role">
						Role <span class="text-red-500">*</span>
					</Label>
					<select
						id="role"
						name="role"
						bind:value={formData.role}
						required
						disabled={submitting}
						class="shadow-xs flex h-9 w-full min-w-0 rounded-md border border-input bg-muted px-3 py-1 text-base outline-none ring-offset-background transition-[color,box-shadow] disabled:cursor-not-allowed disabled:opacity-50 dark:bg-input/80 md:text-sm focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
					>
						{#each roleOptions as role (role.value)}
							<option value={role.value}>{role.label}</option>
						{/each}
					</select>
					<p class="text-xs text-muted-foreground mt-1">
						{roleOptions.find((r) => r.value === formData.role)?.description}
					</p>
				</div>
			</div>

			<!-- Account Credentials -->
			<div class="space-y-4">
				<h3 class="text-sm font-semibold text-muted-foreground">Account Credentials</h3>

				<div class="space-y-2">
					<Label for="password">Password (Optional)</Label>
					<div class="flex gap-2">
						<Input
							id="password"
							name="password"
							type="text"
							bind:value={formData.password}
							placeholder="Leave blank to auto-generate"
							disabled={submitting}
							class="flex-1"
						/>
						<Button type="button" variant="outline" onclick={handleGeneratePassword} disabled={submitting}>
							Generate
						</Button>
					</div>
					<p class="text-xs text-muted-foreground mt-1">
						If no password is provided, a secure temporary password will be generated automatically and logged.
					</p>
				</div>
			</div>

			<!-- Action Buttons -->
			<div class="flex justify-end gap-2 pt-4 border-t">
				<Button
					type="button"
					variant="outline"
					onclick={() => {
						open = false;
						resetForm();
					}}
					disabled={submitting}
				>
					Cancel
				</Button>
				<Button type="submit" disabled={submitting}>
					{#if submitting}
						<Loader2 class="mr-2 h-4 w-4 animate-spin" />
						Creating...
					{:else}
						<UserPlus class="mr-2 h-4 w-4" />
						Create Employee
					{/if}
				</Button>
			</div>
		</form>
	</Dialog.Content>
</Dialog.Root>
