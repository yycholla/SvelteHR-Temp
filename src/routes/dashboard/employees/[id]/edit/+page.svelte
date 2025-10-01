<script lang="ts">
	import { goto } from '$app/navigation';
	import { enhance } from '$app/forms';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import * as Card from '$lib/components/ui/card';
	import { Checkbox } from '$lib/components/ui/checkbox';
	import { ArrowLeft, Save, X, AlertCircle } from 'lucide-svelte';

	interface Props {
		data: {
			employee: {
				id: string;
				displayName: string;
				firstName: string;
				lastName: string;
				email: string;
				role: string;
				hireDate: string | null;
				isActive: boolean;
				departmentId: string | null;
				department: {
					id: string;
					name: string;
				} | null;
			};
			departments: Array<{
				id: string;
				name: string;
			}>;
			canManageEmployees: boolean;
		};
		form?: {
			error?: string;
		};
	}

	let { data, form }: Props = $props();

	// Extract server-loaded data
	const employee = $derived(data.employee);
	const departments = $derived(data.departments);

	// Form state - initialize from props
	let firstName = $state(data.employee.firstName);
	let lastName = $state(data.employee.lastName);
	let email = $state(data.employee.email);
	let role = $state(data.employee.role);
	let hireDate = $state(data.employee.hireDate || '');
	let departmentId = $state(data.employee.departmentId || '');
	let isActive = $state(data.employee.isActive);
	let isSubmitting = $state(false);

	// Role options
	const roleOptions = [
		{ value: 'admin', label: 'Admin' },
		{ value: 'hr_manager', label: 'HR Manager' },
		{ value: 'manager', label: 'Manager' },
		{ value: 'employee', label: 'Employee' }
	];

	// Navigate back to employee detail page
	function goBack() {
		goto(`/dashboard/employees/${employee.id}`);
	}

	// Form validation
	const formErrors = $derived({
		firstName: !firstName ? 'First name is required' : '',
		lastName: !lastName ? 'Last name is required' : '',
		email: !email
			? 'Email is required'
			: !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
				? 'Invalid email format'
				: ''
	});

	const hasErrors = $derived(Object.values(formErrors).some((error) => error !== ''));
</script>

<svelte:head>
	<title>Edit {employee.displayName} - SvelteHR</title>
	<meta name="description" content="Edit employee information for {employee.displayName}" />
</svelte:head>

<div class="space-y-6">
	<!-- Page Header -->
	<div class="flex items-center justify-between">
		<div class="flex items-center gap-4">
			<Button variant="ghost" size="icon" onclick={goBack}>
				<ArrowLeft class="h-5 w-5" />
			</Button>
			<div>
				<h1 class="text-3xl font-bold tracking-tight">Edit Employee</h1>
				<p class="text-muted-foreground">Update information for {employee.displayName}</p>
			</div>
		</div>
	</div>

	<!-- Error Alert -->
	{#if form?.error}
		<div
			class="flex items-center gap-2 rounded-lg border border-destructive/50 bg-destructive/10 p-4 text-destructive"
		>
			<AlertCircle class="h-5 w-5" />
			<p class="font-medium">{form.error}</p>
		</div>
	{/if}

	<!-- Edit Form -->
	<form method="POST" use:enhance={() => {
		isSubmitting = true;
		return async ({ update }) => {
			await update();
			isSubmitting = false;
		};
	}}>
		<div class="grid gap-6 lg:grid-cols-3">
			<!-- Left Column: Personal Information -->
			<div class="lg:col-span-2">
				<Card.Root>
					<Card.Header>
						<Card.Title>Personal Information</Card.Title>
						<Card.Description>Update the employee's basic information</Card.Description>
					</Card.Header>
					<Card.Content class="space-y-4">
						<div class="grid gap-4 md:grid-cols-2">
							<!-- First Name -->
							<div class="space-y-2">
								<Label for="firstName">
									First Name <span class="text-destructive">*</span>
								</Label>
								<Input
									id="firstName"
									name="firstName"
									type="text"
									bind:value={firstName}
									placeholder="John"
									required
								/>
								{#if formErrors.firstName}
									<p class="text-sm text-destructive">{formErrors.firstName}</p>
								{/if}
							</div>

							<!-- Last Name -->
							<div class="space-y-2">
								<Label for="lastName">
									Last Name <span class="text-destructive">*</span>
								</Label>
								<Input
									id="lastName"
									name="lastName"
									type="text"
									bind:value={lastName}
									placeholder="Doe"
									required
								/>
								{#if formErrors.lastName}
									<p class="text-sm text-destructive">{formErrors.lastName}</p>
								{/if}
							</div>
						</div>

						<!-- Email -->
						<div class="space-y-2">
							<Label for="email">
								Email <span class="text-destructive">*</span>
							</Label>
							<Input
								id="email"
								name="email"
								type="email"
								bind:value={email}
								placeholder="john.doe@company.com"
								required
							/>
							{#if formErrors.email}
								<p class="text-sm text-destructive">{formErrors.email}</p>
							{/if}
						</div>

						<!-- Role -->
						<div class="space-y-2">
							<Label for="role">Role</Label>
							<select
								id="role"
								name="role"
								bind:value={role}
								class="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
							>
								{#each roleOptions as roleOption}
									<option value={roleOption.value}>{roleOption.label}</option>
								{/each}
							</select>
						</div>

						<!-- Hire Date -->
						<div class="space-y-2">
							<Label for="hireDate">Hire Date</Label>
							<Input id="hireDate" name="hireDate" type="date" bind:value={hireDate} />
						</div>
					</Card.Content>
				</Card.Root>
			</div>

			<!-- Right Column: Employment Details -->
			<div class="space-y-6">
				<Card.Root>
					<Card.Header>
						<Card.Title>Employment Details</Card.Title>
						<Card.Description>Department and status information</Card.Description>
					</Card.Header>
					<Card.Content class="space-y-4">
						<!-- Department -->
						<div class="space-y-2">
							<Label for="departmentId">Department</Label>
							<select
								id="departmentId"
								name="departmentId"
								bind:value={departmentId}
								class="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
							>
								<option value="">No Department</option>
								{#each departments as dept}
									<option value={dept.id}>{dept.name}</option>
								{/each}
							</select>
						</div>

						<!-- Active Status -->
						<div class="flex items-center space-x-2">
							<Checkbox
								id="isActive"
								name="isActive"
								checked={isActive}
								onCheckedChange={(checked) => {
									isActive = checked === true;
								}}
							/>
							<Label
								for="isActive"
								class="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
							>
								Active Employee
							</Label>
							<input type="hidden" name="isActive" value={isActive.toString()} />
						</div>
					</Card.Content>
				</Card.Root>

				<!-- Action Buttons -->
				<Card.Root>
					<Card.Content class="pt-6">
						<div class="space-y-2">
							<Button type="submit" class="w-full" disabled={hasErrors || isSubmitting}>
								<Save class="mr-2 h-4 w-4" />
								{isSubmitting ? 'Saving...' : 'Save Changes'}
							</Button>
							<Button
								type="button"
								variant="outline"
								class="w-full"
								onclick={goBack}
								disabled={isSubmitting}
							>
								<X class="mr-2 h-4 w-4" />
								Cancel
							</Button>
						</div>
					</Card.Content>
				</Card.Root>
			</div>
		</div>
	</form>
</div>
