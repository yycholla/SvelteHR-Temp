<!--
	Advanced Employee Form with Svelte 5 Runes
	
	Demonstrates the advanced form management system with optimized validation,
	real-time field state tracking, and enhanced user experience.
	
	Features:
	- Debounced validation for better performance
	- Real-time field state management
	- Optimized reactivity with minimal re-renders
	- Advanced error handling and recovery
	- Field-level validation with visual feedback
	- Form analytics and performance monitoring
-->

<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import { Badge } from '$lib/components/ui/badge';
	import { createAdvancedForm } from '$lib/forms/advanced-form.svelte';
	import { createAsyncDerived, createPerformanceMonitor } from '$lib/utils/reactivity.svelte';
	import { globalState } from '$lib/stores/global-state.svelte';
	import { ApiServices } from '$lib/api/services';
	import { createBrowserDepartmentService } from '$lib/graphql/services/department-service';
	import { z } from 'zod';
	import type { Employee, Role, Department } from '$lib/api/types-v2';
	import { CheckCircle, AlertCircle, Loader2, TrendingUp } from 'lucide-svelte';

	// Component props with TypeScript interface
	interface AdvancedEmployeeFormProps {
		employee?: Employee | null;
		mode?: 'create' | 'edit' | 'view';
		onCancel: () => void;
		onSuccess: (employee: Employee) => void;
	}

	let {
		employee = null,
		mode = 'create',
		onCancel,
		onSuccess
	}: AdvancedEmployeeFormProps = $props();

	// Performance monitoring for this form
	const formMonitor = createPerformanceMonitor('AdvancedEmployeeForm');

	// Enhanced validation schema with detailed field rules
	const employeeSchema = z.object({
		username: z.string()
			.min(3, 'Username must be at least 3 characters')
			.max(50, 'Username must not exceed 50 characters')
			.regex(/^[a-zA-Z0-9_-]+$/, 'Username can only contain letters, numbers, hyphens, and underscores'),
		
		email: z.string()
			.email('Please enter a valid email address')
			.max(254, 'Email must not exceed 254 characters'),
		
		firstName: z.string()
			.min(1, 'First name is required')
			.max(100, 'First name must not exceed 100 characters')
			.regex(/^[a-zA-ZÀ-ÿ\s'-]+$/, 'First name can only contain letters, spaces, hyphens, and apostrophes'),
		
		lastName: z.string()
			.min(1, 'Last name is required')
			.max(100, 'Last name must not exceed 100 characters')
			.regex(/^[a-zA-ZÀ-ÿ\s'-]+$/, 'Last name can only contain letters, spaces, hyphens, and apostrophes'),
		
		jobTitle: z.string()
			.max(200, 'Job title must not exceed 200 characters')
			.optional(),
		
		roleId: z.number()
			.min(1, 'Please select a role'),
		
		departmentId: z.number()
			.min(1, 'Please select a department')
			.optional(),
		
		employmentType: z.enum(['Full-time', 'Part-time', 'Contract', 'Intern']),
		
		hireDate: z.string()
			.regex(/^\d{4}-\d{2}-\d{2}$/, 'Please enter a valid date')
			.refine(date => new Date(date) <= new Date(), 'Hire date cannot be in the future'),
		
		onboardingStatus: z.enum(['PreHire', 'Onboarding', 'Active', 'Terminated']),
		
		salary: z.number()
			.min(0, 'Salary must be a positive number')
			.max(10000000, 'Salary must be reasonable')
			.optional(),
		
		phone: z.string()
			.regex(/^[\d\s+()-]+$/, 'Please enter a valid phone number')
			.optional()
	});

	// Initialize form with advanced features
	const form = createAdvancedForm(employeeSchema, {
		initialValues: {
			username: employee?.username || '',
			email: employee?.email || '',
			firstName: employee?.first_name || '',
			lastName: employee?.last_name || '',
			jobTitle: employee?.job_title || '',
			roleId: employee?.role_id ? parseInt(employee.role_id) : 1,
			departmentId: employee?.department_id ? parseInt(employee.department_id) : undefined,
			employmentType: (employee?.employment_type as any) || 'Full-time',
			hireDate: employee?.hire_date || new Date().toISOString().split('T')[0],
			onboardingStatus: (employee?.status as any) || 'PreHire',
			salary: employee?.salary ? parseFloat(employee.salary) : undefined,
			phone: employee?.phone || ''
		},
		validation: {
			debounceMs: 500, // More responsive validation
			validateOnChange: true,
			validateOnBlur: true,
			validateOnSubmit: true
		},
		onSubmit: async (formData) => {
			try {
				// Add global notification
				globalState.addNotification({
					type: 'info',
					title: 'Submitting Form',
					message: `${mode === 'create' ? 'Creating' : 'Updating'} employee...`
				});

				// Simulate API call with monitoring
				const result = await formMonitor.monitor(async () => {
					if (mode === 'edit' && employee?.id) {
						return await ApiServices.employees.update(parseInt(employee.id), {
							username: formData.username,
							email: formData.email,
							first_name: formData.firstName,
							last_name: formData.lastName,
							job_title: formData.jobTitle,
							role_id: formData.roleId.toString(),
							department_id: formData.departmentId?.toString(),
							employment_type: formData.employmentType,
							hire_date: formData.hireDate,
							status: formData.onboardingStatus,
							salary: formData.salary?.toString(),
							phone: formData.phone
						});
					} else {
						return await ApiServices.employees.create({
							username: formData.username,
							email: formData.email,
							first_name: formData.firstName,
							last_name: formData.lastName,
							job_title: formData.jobTitle,
							role_id: formData.roleId.toString(),
							department_id: formData.departmentId?.toString(),
							employment_type: formData.employmentType,
							hire_date: formData.hireDate,
							status: formData.onboardingStatus,
							salary: formData.salary?.toString(),
							phone: formData.phone,
							password: 'defaultPassword123!' // This would be handled differently in real app
						});
					}
				});

				globalState.addNotification({
					type: 'success',
					title: 'Success',
					message: `Employee ${mode === 'create' ? 'created' : 'updated'} successfully`
				});

				onSuccess(result);
				return { success: true, data: result };

			} catch (error: any) {
				const errorMessage = error?.message || `Failed to ${mode === 'create' ? 'create' : 'update'} employee`;
				
				globalState.addNotification({
					type: 'error',
					title: 'Error',
					message: errorMessage
				});

				return {
					success: false,
					message: errorMessage,
					errors: error?.fieldErrors || {}
				};
			}
		},
		onFieldChange: (field, value) => {
			// Track field interactions for analytics
			console.log(`Field ${field} changed to:`, value);
		}
	});

	// Async data loading with error handling and retry
	const rolesData = createAsyncDerived(async () => {
		return await ApiServices.roles.list();
	}, []);

	const departmentsData = createAsyncDerived(async () => {
		const departmentService = createBrowserDepartmentService();
		const result = await departmentService.getDepartments({ activeOnly: true });
		if (result.success && result.data) {
			return result.data.departments;
		} else {
			throw new Error(result.error || 'Failed to load departments');
		}
	}, []);

	// Computed form states for enhanced UX
	const formProgress = $derived(() => {
		const totalFields = 9; // Required + important optional fields
		const completedFields = [
			form.data.username,
			form.data.email,
			form.data.firstName,
			form.data.lastName,
			form.data.roleId && form.data.roleId > 0,
			form.data.hireDate,
			form.data.employmentType,
			form.data.onboardingStatus,
			form.data.jobTitle || form.data.departmentId
		].filter(Boolean).length;

		return (completedFields / totalFields) * 100;
	});

	const validationScore = $derived(() => {
		const errorCount = Object.keys(form.errors).length;
		const fieldCount = Object.keys(form.data).length;
		return Math.max(0, ((fieldCount - errorCount) / fieldCount) * 100);
	});

	// Real-time form analytics
	const formStats = $derived(() => {
		return {
			fieldsCompleted: form.touchedFields.length,
			totalFields: Object.keys(form.data).length,
			errorsRemaining: Object.keys(form.errors).length,
			hasChanges: form.hasChanges,
			canSubmit: form.canSubmit,
			submitAttempts: form.submitCount
		};
	});

	// Field helper functions
	function getFieldStatus(fieldName: string) {
		const field = form.getField(fieldName);
		
		if (!field.touched) return 'untouched';
		if (field.validating) return 'validating';
		if (field.error) return 'error';
		if (field.dirty && !field.error) return 'success';
		return 'pristine';
	}

	function getFieldIcon(fieldName: string) {
		switch (getFieldStatus(fieldName)) {
			case 'success': return CheckCircle;
			case 'error': return AlertCircle;
			case 'validating': return Loader2;
			default: return null;
		}
	}

	// Enhanced field component
	function createFieldProps(name: string, label: string) {
		return {
			...form.createFieldProps(name),
			label,
			status: getFieldStatus(name),
			icon: getFieldIcon(name),
			showValidation: form.getField(name).touched
		};
	}
</script>

<div class="space-y-6">
	<!-- Form Header with Progress -->
	<div class="space-y-4">
		<div class="flex items-center justify-between">
			<h2 class="text-xl font-semibold">
				{mode === 'create' ? 'Create New Employee' : mode === 'edit' ? 'Edit Employee' : 'View Employee'}
			</h2>
			
			<div class="flex items-center gap-4">
				<!-- Form Progress -->
				<div class="flex items-center gap-2 text-sm text-muted-foreground">
					<TrendingUp class="h-4 w-4" />
					<span>{formProgress.toFixed(0)}% Complete</span>
				</div>
				
				<!-- Validation Score -->
				<Badge variant={validationScore > 90 ? 'default' : validationScore > 70 ? 'secondary' : 'destructive'}>
					Quality: {validationScore.toFixed(0)}%
				</Badge>
			</div>
		</div>

		<!-- Progress Bar -->
		<div class="w-full bg-muted rounded-full h-2">
			<div
				class="bg-primary h-2 rounded-full transition-all duration-300 ease-out"
				style="width: {formProgress}%"
			></div>
		</div>

		<!-- Form Analytics -->
		{#if import.meta.env.DEV}
			<div class="grid grid-cols-4 gap-4 p-4 bg-muted/30 rounded-lg text-sm">
				<div>
					<strong>Fields:</strong> {formStats.fieldsCompleted}/{formStats.totalFields}
				</div>
				<div>
					<strong>Errors:</strong> {formStats.errorsRemaining}
				</div>
				<div>
					<strong>Changes:</strong> {formStats.hasChanges ? 'Yes' : 'No'}
				</div>
				<div>
					<strong>Submits:</strong> {formStats.submitAttempts}
				</div>
			</div>
		{/if}
	</div>

	<!-- Main Form -->
	<form onsubmit={form.handleSubmit} class="space-y-6">
		<div class="grid grid-cols-1 gap-6 md:grid-cols-2">
			<!-- Username Field -->
			{@const usernameProps = createFieldProps('username', 'Username')}
			<div class="space-y-2">
				<div class="flex items-center gap-2">
					<Label for="username">{usernameProps.label} *</Label>
					{#if usernameProps.icon}
						<svelte:component 
							this={usernameProps.icon} 
							class="h-4 w-4 {usernameProps.status === 'success' ? 'text-green-600' : usernameProps.status === 'error' ? 'text-red-600' : 'text-muted-foreground animate-spin'}"
						/>
					{/if}
				</div>
				<Input
					id="username"
					type="text"
					value={usernameProps.value}
					oninput={(e) => usernameProps.onChange(e.currentTarget.value)}
					onblur={usernameProps.onBlur}
					onfocus={usernameProps.onFocus}
					placeholder="Enter username"
					class={usernameProps.status === 'error' ? 'border-destructive' : usernameProps.status === 'success' ? 'border-green-500' : ''}
				/>
				{#if usernameProps.showValidation && usernameProps.error}
					<p class="text-sm text-destructive">{usernameProps.error}</p>
				{/if}
			</div>

			<!-- Email Field -->
			{@const emailProps = createFieldProps('email', 'Email Address')}
			<div class="space-y-2">
				<div class="flex items-center gap-2">
					<Label for="email">{emailProps.label} *</Label>
					{#if emailProps.icon}
						<svelte:component 
							this={emailProps.icon} 
							class="h-4 w-4 {emailProps.status === 'success' ? 'text-green-600' : emailProps.status === 'error' ? 'text-red-600' : 'text-muted-foreground animate-spin'}"
						/>
					{/if}
				</div>
				<Input
					id="email"
					type="email"
					value={emailProps.value}
					oninput={(e) => emailProps.onChange(e.currentTarget.value)}
					onblur={emailProps.onBlur}
					onfocus={emailProps.onFocus}
					placeholder="Enter email address"
					class={emailProps.status === 'error' ? 'border-destructive' : emailProps.status === 'success' ? 'border-green-500' : ''}
				/>
				{#if emailProps.showValidation && emailProps.error}
					<p class="text-sm text-destructive">{emailProps.error}</p>
				{/if}
			</div>

			<!-- First Name Field -->
			{@const firstNameProps = createFieldProps('firstName', 'First Name')}
			<div class="space-y-2">
				<div class="flex items-center gap-2">
					<Label for="firstName">{firstNameProps.label} *</Label>
					{#if firstNameProps.icon}
						<svelte:component 
							this={firstNameProps.icon} 
							class="h-4 w-4 {firstNameProps.status === 'success' ? 'text-green-600' : firstNameProps.status === 'error' ? 'text-red-600' : 'text-muted-foreground animate-spin'}"
						/>
					{/if}
				</div>
				<Input
					id="firstName"
					type="text"
					value={firstNameProps.value}
					oninput={(e) => firstNameProps.onChange(e.currentTarget.value)}
					onblur={firstNameProps.onBlur}
					onfocus={firstNameProps.onFocus}
					placeholder="Enter first name"
					class={firstNameProps.status === 'error' ? 'border-destructive' : firstNameProps.status === 'success' ? 'border-green-500' : ''}
				/>
				{#if firstNameProps.showValidation && firstNameProps.error}
					<p class="text-sm text-destructive">{firstNameProps.error}</p>
				{/if}
			</div>

			<!-- Last Name Field -->
			{@const lastNameProps = createFieldProps('lastName', 'Last Name')}
			<div class="space-y-2">
				<div class="flex items-center gap-2">
					<Label for="lastName">{lastNameProps.label} *</Label>
					{#if lastNameProps.icon}
						<svelte:component 
							this={lastNameProps.icon} 
							class="h-4 w-4 {lastNameProps.status === 'success' ? 'text-green-600' : lastNameProps.status === 'error' ? 'text-red-600' : 'text-muted-foreground animate-spin'}"
						/>
					{/if}
				</div>
				<Input
					id="lastName"
					type="text"
					value={lastNameProps.value}
					oninput={(e) => lastNameProps.onChange(e.currentTarget.value)}
					onblur={lastNameProps.onBlur}
					onfocus={lastNameProps.onFocus}
					placeholder="Enter last name"
					class={lastNameProps.status === 'error' ? 'border-destructive' : lastNameProps.status === 'success' ? 'border-green-500' : ''}
				/>
				{#if lastNameProps.showValidation && lastNameProps.error}
					<p class="text-sm text-destructive">{lastNameProps.error}</p>
				{/if}
			</div>

			<!-- Job Title Field -->
			{@const jobTitleProps = createFieldProps('jobTitle', 'Job Title')}
			<div class="space-y-2">
				<Label for="jobTitle">{jobTitleProps.label}</Label>
				<Input
					id="jobTitle"
					type="text"
					value={jobTitleProps.value}
					oninput={(e) => jobTitleProps.onChange(e.currentTarget.value)}
					onblur={jobTitleProps.onBlur}
					onfocus={jobTitleProps.onFocus}
					placeholder="Enter job title"
				/>
			</div>

			<!-- Role Selection -->
			<div class="space-y-2">
				<Label for="roleId">Role *</Label>
				{#if rolesData.loading()}
					<div class="flex h-9 w-full items-center rounded-md border border-input bg-transparent px-3 py-1 text-sm text-muted-foreground">
						<Loader2 class="h-4 w-4 animate-spin mr-2" />
						Loading roles...
					</div>
				{:else if rolesData.error()}
					<div class="space-y-2">
						<div class="flex h-9 w-full items-center rounded-md border border-destructive bg-transparent px-3 py-1 text-sm text-destructive">
							Failed to load roles
						</div>
						<Button type="button" variant="outline" size="sm" onclick={rolesData.retry}>
							Retry
						</Button>
					</div>
				{:else if rolesData.value()}
					<select
						id="roleId"
						value={form.data.roleId}
						onchange={(e) => form.setFieldValue('roleId', parseInt(e.currentTarget.value) || 0)}
						onblur={() => form.setFieldTouched('roleId')}
						class="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:ring-1 focus-visible:ring-ring focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50"
						class:border-destructive={form.errors.roleId}
					>
						<option value="">Select a role</option>
						{#each rolesData.value() as role}
							<option value={parseInt(role.id)}>{role.name}</option>
						{/each}
					</select>
					{#if form.errors.roleId}
						<p class="text-sm text-destructive">{form.errors.roleId}</p>
					{/if}
				{/if}
			</div>

			<!-- Department Selection -->
			<div class="space-y-2">
				<Label for="departmentId">Department</Label>
				{#if departmentsData.loading()}
					<div class="flex h-9 w-full items-center rounded-md border border-input bg-transparent px-3 py-1 text-sm text-muted-foreground">
						<Loader2 class="h-4 w-4 animate-spin mr-2" />
						Loading departments...
					</div>
				{:else if departmentsData.error()}
					<div class="space-y-2">
						<div class="flex h-9 w-full items-center rounded-md border border-destructive bg-transparent px-3 py-1 text-sm text-destructive">
							Failed to load departments
						</div>
						<Button type="button" variant="outline" size="sm" onclick={departmentsData.retry}>
							Retry
						</Button>
					</div>
				{:else if departmentsData.value()}
					<select
						id="departmentId"
						value={form.data.departmentId || ''}
						onchange={(e) => form.setFieldValue('departmentId', parseInt(e.currentTarget.value) || undefined)}
						onblur={() => form.setFieldTouched('departmentId')}
						class="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:ring-1 focus-visible:ring-ring focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50"
					>
						<option value="">Select a department (optional)</option>
						{#each departmentsData.value() as department}
							<option value={parseInt(department.id)}>{department.name}</option>
						{/each}
					</select>
				{/if}
			</div>

			<!-- Employment Type -->
			<div class="space-y-2">
				<Label for="employmentType">Employment Type</Label>
				<select
					id="employmentType"
					value={form.data.employmentType}
					onchange={(e) => form.setFieldValue('employmentType', e.currentTarget.value as any)}
					onblur={() => form.setFieldTouched('employmentType')}
					class="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:ring-1 focus-visible:ring-ring focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50"
				>
					<option value="Full-time">Full-time</option>
					<option value="Part-time">Part-time</option>
					<option value="Contract">Contract</option>
					<option value="Intern">Intern</option>
				</select>
			</div>

			<!-- Hire Date -->
			<div class="space-y-2">
				<Label for="hireDate">Hire Date</Label>
				<Input
					id="hireDate"
					type="date"
					value={form.data.hireDate}
					oninput={(e) => form.setFieldValue('hireDate', e.currentTarget.value)}
					onblur={() => form.setFieldTouched('hireDate')}
					class={form.errors.hireDate ? 'border-destructive' : ''}
				/>
				{#if form.errors.hireDate}
					<p class="text-sm text-destructive">{form.errors.hireDate}</p>
				{/if}
			</div>

			<!-- Onboarding Status -->
			<div class="space-y-2">
				<Label for="onboardingStatus">Status</Label>
				<select
					id="onboardingStatus"
					value={form.data.onboardingStatus}
					onchange={(e) => form.setFieldValue('onboardingStatus', e.currentTarget.value as any)}
					onblur={() => form.setFieldTouched('onboardingStatus')}
					class="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:ring-1 focus-visible:ring-ring focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50"
				>
					<option value="PreHire">Pre-Hire</option>
					<option value="Onboarding">Onboarding</option>
					<option value="Active">Active</option>
					<option value="Terminated">Terminated</option>
				</select>
			</div>

			<!-- Salary (Optional) -->
			<div class="space-y-2">
				<Label for="salary">Annual Salary</Label>
				<Input
					id="salary"
					type="number"
					value={form.data.salary || ''}
					oninput={(e) => form.setFieldValue('salary', parseFloat(e.currentTarget.value) || undefined)}
					onblur={() => form.setFieldTouched('salary')}
					placeholder="Enter annual salary"
					class={form.errors.salary ? 'border-destructive' : ''}
				/>
				{#if form.errors.salary}
					<p class="text-sm text-destructive">{form.errors.salary}</p>
				{/if}
			</div>

			<!-- Phone (Optional) -->
			<div class="space-y-2">
				<Label for="phone">Phone Number</Label>
				<Input
					id="phone"
					type="tel"
					value={form.data.phone || ''}
					oninput={(e) => form.setFieldValue('phone', e.currentTarget.value)}
					onblur={() => form.setFieldTouched('phone')}
					placeholder="Enter phone number"
					class={form.errors.phone ? 'border-destructive' : ''}
				/>
				{#if form.errors.phone}
					<p class="text-sm text-destructive">{form.errors.phone}</p>
				{/if}
			</div>
		</div>

		<!-- Last Submission Result -->
		{#if form.lastResult}
			<div class="p-4 rounded-lg {form.lastResult.success ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}">
				<p class="text-sm {form.lastResult.success ? 'text-green-800' : 'text-red-800'}">
					{form.lastResult.message || (form.lastResult.success ? 'Operation completed successfully' : 'Operation failed')}
				</p>
			</div>
		{/if}

		<!-- Form Actions -->
		<div class="flex justify-between items-center border-t pt-6">
			<div class="text-sm text-muted-foreground">
				Performance: {formMonitor.getStats().count > 0 ? `${formMonitor.getStats().averageTime.toFixed(1)}ms avg` : 'N/A'}
			</div>
			
			<div class="flex gap-4">
				<Button 
					type="button" 
					variant="outline" 
					onclick={onCancel} 
					disabled={form.isSubmitting}
				>
					Cancel
				</Button>
				
				<Button 
					type="submit" 
					disabled={!form.canSubmit || form.isSubmitting}
					class="min-w-32"
				>
					{#if form.isSubmitting}
						<Loader2 class="h-4 w-4 animate-spin mr-2" />
						{mode === 'create' ? 'Creating...' : 'Updating...'}
					{:else}
						{mode === 'create' ? 'Create Employee' : 'Update Employee'}
					{/if}
				</Button>
			</div>
		</div>
	</form>

	<!-- Debug Information (Development Only) -->
	{#if import.meta.env.DEV}
		<details class="mt-8">
			<summary class="cursor-pointer text-sm font-medium text-muted-foreground">Debug Information</summary>
			<pre class="mt-2 p-4 bg-muted rounded-lg text-xs overflow-auto">{JSON.stringify(form.getDebugInfo(), null, 2)}</pre>
		</details>
	{/if}
</div>