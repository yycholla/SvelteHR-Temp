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
	import { Check, Loader2, UserPlus, X } from '@lucide/svelte';

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

	// Fallback roles
	const defaultRoles = [
		{ id: 'emp', name: 'Employee', description: 'Standard employee access' },
		{ id: 'mgr', name: 'Manager', description: 'Team management access' },
		{ id: 'hr', name: 'HR Manager', description: 'HR administration access' },
		{ id: 'adm', name: 'Admin', description: 'Full system access' }
	];

	// Use defaults if roles prop is empty or undefined
	// Defensive: Filter input roles to ensure they are valid before using
	const validPropRoles = $derived(roles?.filter((r) => r && r.name) || []);
	const finalRoles = $derived(validPropRoles.length > 0 ? validPropRoles : defaultRoles);

	const roleOptions = $derived(
		finalRoles.map((role) => ({
			value: role.name,
			label: role.name,
			description: role.description || ''
		}))
	);

	let formData = $state({
		firstName: '',
		lastName: '',
		email: '',
		password: '',
		role: '',
		departmentId: '',
		jobTitle: '',
		phoneNumber: '',
		hireDate: new Date().toISOString().split('T')[0]
	});

	// Field errors state
	let fieldErrors = $state<Record<string, string>>({});

	// Password validation state
	let passwordTouched = $state(false);

	const passwordRequirements = [
		{ id: 'length', label: 'At least 8 characters', check: (val: string) => val.length >= 8 }
	];

	const passwordValidations = $derived(
		passwordRequirements.map((req) => ({
			...req,
			valid: req.check(formData.password || '')
		}))
	);

	// Sync default selections when data is available
	$effect(() => {
		if (!formData.role && finalRoles.length > 0) {
			formData.role = finalRoles[0]?.name || '';
		}
		if (!formData.departmentId && departments.length > 0) {
			formData.departmentId = departments[0]?.id || '';
		}
	});

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
			role: '',
			departmentId: '',
			jobTitle: '',
			phoneNumber: '',
			hireDate: new Date().toISOString().split('T')[0]
		};
		fieldErrors = {};
	}

	// Phone number formatting
	function unformatPhoneNumber(formatted: string): string {
		// Remove all non-digits, including any leading '+'
		return formatted.replace(/[^\d]/g, '');
	}

	function formatPhoneNumber(input: string): string {
		// 1. Strip non-digits except leading '+'
		let digits = input.replace(/[^\d+]/g, '');

		// 2. Strip leading '+1' country code if present
		if (digits.startsWith('+1')) {
			digits = digits.substring(2);
		} else if (digits.startsWith('1') && digits.length > 10) {
			// Potentially '1' followed by 10 digits
			digits = digits.substring(1);
		}

		// Keep only up to 10 digits for formatting (common North American format)
		digits = digits.substring(0, 10);

		// Apply (XXX) XXX-XXXX format
		let formatted = '';
		if (digits.length > 6) {
			formatted = `(${digits.substring(0, 3)}) ${digits.substring(3, 6)}-${digits.substring(6)}`;
		} else if (digits.length > 3) {
			formatted = `(${digits.substring(0, 3)}) ${digits.substring(3)}`;
		} else if (digits.length > 0) {
			formatted = `(${digits.substring(0, 3)}`;
		}
		return formatted;
	}

	function handlePhoneInput(event: Event) {
		const inputElement = event.target as HTMLInputElement;
		const originalSelectionStart = inputElement.selectionStart;

		// Store cursor position to restore after formatting
		const previousValue = inputElement.value;

		// Apply formatting
		const formattedValue = formatPhoneNumber(inputElement.value);
		formData.phoneNumber = formattedValue;
		inputElement.value = formattedValue; // Manually update input element to avoid input glitches

		// Adjust cursor position after formatting
		if (originalSelectionStart !== null) {
			const newSelectionStart =
				originalSelectionStart + (formattedValue.length - previousValue.length);
			inputElement.setSelectionRange(newSelectionStart, newSelectionStart);
		}
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

	// Field validation
	function validateField(name: string, value: string) {
		let error = '';

		switch (name) {
			case 'firstName':
			case 'lastName':
				if (!value.trim()) error = 'This field is required';
				break;
			case 'email':
				if (!value.trim()) error = 'Email is required';
				else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) error = 'Invalid email format';
				break;
			case 'role':
				if (!value) error = 'Role is required';
				break;
			case 'departmentId':
				if (!value) error = 'Department is required';
				break;
			case 'password':
				if (value && value.length < 8) error = 'Password must be at least 8 characters';
				break;
			case 'phone':
				if (value) {
					const digits = unformatPhoneNumber(value);
					if (digits.length !== 10) error = 'Phone number must be 10 digits';
				}
				break;
		}

		if (error) {
			fieldErrors[name] = error;
			return false;
		} else {
			// Clear error if valid
			if (fieldErrors[name]) {
				const { [name]: _, ...rest } = fieldErrors;
				fieldErrors = rest;
			}
			return true;
		}
	}

	// Derived state for overall form validity
	const isFormValid = $derived.by(() => {
		if (!formData.firstName.trim()) return false;
		if (!formData.lastName.trim()) return false;
		if (!formData.email.trim()) return false;
		if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) return false;
		if (!formData.role) return false;
		if (!formData.departmentId) return false;
		if (formData.password && formData.password.length < 8) return false;
		if (formData.phoneNumber) {
			const digits = unformatPhoneNumber(formData.phoneNumber);
			if (digits.length !== 10) return false;
		}
		// Also check if there are any lingering errors in fieldErrors
		if (Object.keys(fieldErrors).length > 0) return false;

		return true;
	});

	async function handleSubmit(event: Event) {
		event.preventDefault();

		if (!isFormValid) {
			toast.error('Please fix the validation errors');
			return;
		}

		submitting = true;
		fieldErrors = {}; // Clear previous errors

		try {
			const form = event.target as HTMLFormElement;
			const formDataObj = new FormData(form);

			// Unformat phone number before submission
			const rawPhoneNumber = unformatPhoneNumber(formData.phoneNumber);
			formDataObj.set('phone', rawPhoneNumber); // Overwrite with unformatted number

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

	// Sync default selections when data is available
	$effect(() => {
		if (!formData.role && finalRoles.length > 0) {
			formData.role = finalRoles[0]?.name || '';
		}
		if (!formData.departmentId && departments.length > 0) {
			formData.departmentId = departments[0]?.id || '';
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
							onblur={() => validateField('firstName', formData.firstName)}
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
							onblur={() => validateField('lastName', formData.lastName)}
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
						onblur={() => validateField('email', formData.email)}
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
						oninput={handlePhoneInput}
						onblur={() => validateField('phone', formData.phoneNumber)}
						placeholder="(555) 123-4567"
						disabled={submitting}
						class={fieldErrors.phone ? 'border-red-500 focus-visible:ring-red-500' : ''}
					/>
					{#if fieldErrors.phone}
						<p class="text-sm text-red-500">{fieldErrors.phone}</p>
					{/if}
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
							onchange={() => validateField('departmentId', formData.departmentId)}
							required
							disabled={submitting}
							class="shadow-xs flex h-9 w-full min-w-0 rounded-md border border-input bg-muted px-3 py-1 text-base outline-none ring-offset-background transition-[color,box-shadow] disabled:cursor-not-allowed disabled:opacity-50 dark:bg-input/80 md:text-sm focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 {fieldErrors.departmentId
								? 'border-red-500 focus-visible:ring-red-500'
								: ''}"
						>
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
						onchange={() => validateField('role', formData.role)}
						required
						disabled={submitting}
						class="shadow-xs w-full rounded-md border border-input bg-muted px-3 py-2 text-base outline-none ring-offset-background transition-[color,box-shadow] disabled:cursor-not-allowed disabled:opacity-50 dark:bg-input/80 md:text-sm focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 {fieldErrors.role
							? 'border-red-500 focus-visible:ring-red-500'
							: ''}"
					>
						{#each roleOptions as role (role.value)}
							<option value={role.value}>{role.label}</option>
						{/each}
					</select>
					{#if fieldErrors.role}
						<p class="text-sm text-red-500">{fieldErrors.role}</p>
					{:else}
						<p class="text-xs text-muted-foreground mt-1">
							{roleOptions.find((r) => r.value === formData.role)?.description}
						</p>
					{/if}
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
							oninput={() => {
								clearFieldError('password');
								passwordTouched = true;
							}}
							onblur={() => validateField('password', formData.password)}
							placeholder="Leave blank to auto-generate"
							disabled={submitting}
							class="flex-1 {fieldErrors.password
								? 'border-red-500 focus-visible:ring-red-500'
								: ''}"
						/>
						<Button
							type="button"
							variant="outline"
							onclick={handleGeneratePassword}
							disabled={submitting}
						>
							Generate
						</Button>
					</div>

					{#if passwordTouched && formData.password}
						<div class="space-y-1 mt-1">
							{#each passwordValidations as req}
								{#if !req.valid}
									<div class="flex items-center text-xs text-red-500 transition-all">
										<X class="mr-1 h-3 w-3" />
										{req.label}
									</div>
								{/if}
							{/each}
						</div>
					{/if}

					{#if fieldErrors.password}
						<p class="text-sm text-red-500">{fieldErrors.password}</p>
					{:else}
						<p class="text-xs text-muted-foreground mt-1">
							If no password is provided, a secure temporary password will be generated
							automatically and logged.
						</p>
					{/if}
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
				<Button type="submit" disabled={submitting || !isFormValid}>
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
