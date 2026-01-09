<!--
 * Employee Create Dialog
 * Modal dialog for creating new employees/users with full user details
 * Includes: Personal info, credentials, role, department assignment
 -->

<script lang="ts">
	import * as Dialog from '$lib/components/ui/dialog';
	import { logger } from '$lib/utils/logger';
	import { Button } from '$lib/components/ui/button';
	import { toast } from 'svelte-sonner';
	import { Loader2, UserPlus } from '@lucide/svelte';

	// Import decomposed components
	import EmployeeBasicInfo from './create/EmployeeBasicInfo.svelte';
	import EmployeeEmploymentInfo from './create/EmployeeEmploymentInfo.svelte';
	import EmployeeCredentials from './create/EmployeeCredentials.svelte';

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
		return formatted.replace(/[^\d]/g, '');
	}

	function formatPhoneNumber(input: string): string {
		let digits = input.replace(/[^\d+]/g, '');
		if (digits.startsWith('+1')) {
			digits = digits.substring(2);
		} else if (digits.startsWith('1') && digits.length > 10) {
			digits = digits.substring(1);
		}
		digits = digits.substring(0, 10);
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
		const previousValue = inputElement.value;
		const formattedValue = formatPhoneNumber(inputElement.value);
		formData.phoneNumber = formattedValue;
		inputElement.value = formattedValue;

		if (originalSelectionStart !== null) {
			const newSelectionStart =
				originalSelectionStart + (formattedValue.length - previousValue.length);
			inputElement.setSelectionRange(newSelectionStart, newSelectionStart);
		}
	}

	function clearFieldError(field: string) {
		if (fieldErrors[field]) {
			const { [field]: _, ...rest } = fieldErrors;
			fieldErrors = rest;
		}
	}

	function parseErrorMessage(message: string): { field: string | null; message: string } {
		const emailInUseMatch = message.match(/Email '([^']+)' is already in use/i);
		if (emailInUseMatch) {
			return { field: 'email', message: 'This email address is already in use' };
		}
		const fieldRequiredMatch = message.match(/Field '([^']+)' is required/i);
		if (fieldRequiredMatch) {
			return { field: fieldRequiredMatch[1], message: 'This field is required' };
		}
		const invalidFieldMatch = message.match(/Invalid (\w+)|(\w+) is invalid/i);
		if (invalidFieldMatch) {
			const field = invalidFieldMatch[1] || invalidFieldMatch[2];
			return { field: field.toLowerCase(), message: `Invalid ${field}` };
		}
		return { field: null, message };
	}

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
			if (fieldErrors[name]) {
				const { [name]: _, ...rest } = fieldErrors;
				fieldErrors = rest;
			}
			return true;
		}
	}

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
		fieldErrors = {};

		try {
			const form = event.target as HTMLFormElement;
			const formDataObj = new FormData(form);
			const rawPhoneNumber = unformatPhoneNumber(formData.phoneNumber);
			formDataObj.set('phone', rawPhoneNumber);

			const response = await fetch('/dashboard/employees/new', {
				method: 'POST',
				body: formDataObj
			});

			const result = await response.json();
			logger.info(`[EmployeeCreateDialog] Response status: ${response.status}`);
			logger.info(`[EmployeeCreateDialog] Response body:: ${result}`);

			if (response.ok) {
				if (result.type === 'success' || result.employeeId || result.type === 'redirect') {
					toast.success('Employee created successfully');
					resetForm();
					open = false;
					onSuccess?.();
				} else {
					toast.error('Employee created but response format unexpected');
					logger.error('[EmployeeCreateDialog] Unexpected success format:', result);
				}
			} else {
				const errorMessage = result.error || result.data?.error || 'Failed to create employee';
				logger.error(`[EmployeeCreateDialog] Error message:`, errorMessage);
				const { field, message } = parseErrorMessage(errorMessage);
				if (field) {
					fieldErrors[field] = message;
					toast.error(message);
				} else {
					toast.error(message);
				}
			}
		} catch (error) {
			toast.error('An unexpected error occurred');
			logger.error('Catch failed', error as Error);
		} finally {
			submitting = false;
		}
	}
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
			<EmployeeBasicInfo
				bind:firstName={formData.firstName}
				bind:lastName={formData.lastName}
				bind:email={formData.email}
				bind:phoneNumber={formData.phoneNumber}
				{fieldErrors}
				{submitting}
				onClearError={clearFieldError}
				onValidate={validateField}
				onPhoneInput={handlePhoneInput}
			/>

			<!-- Employment Details -->
			<EmployeeEmploymentInfo
				bind:jobTitle={formData.jobTitle}
				bind:departmentId={formData.departmentId}
				bind:hireDate={formData.hireDate}
				bind:role={formData.role}
				{departments}
				{roleOptions}
				{fieldErrors}
				{submitting}
				onValidate={validateField}
			/>

			<!-- Account Credentials -->
			<EmployeeCredentials
				bind:password={formData.password}
				{fieldErrors}
				{passwordTouched}
				{passwordValidations}
				{submitting}
				onGeneratePassword={handleGeneratePassword}
				onClearError={clearFieldError}
				onValidate={validateField}
				onPasswordTouch={() => (passwordTouched = true)}
			/>

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