<script lang="ts">
	import { onMount } from 'svelte';
	import { queryStore, mutationStore } from '@urql/svelte';
	import { gql } from '@urql/svelte';
	import { createUrqlClient } from '$lib/graphql/client';
	import { goto } from '$app/navigation';
	import RoleGuard from '$lib/components/auth/RoleGuard.svelte';
	import * as Card from '$lib/components/ui/card';
	import * as Select from '$lib/components/ui/select';
	import * as Alert from '$lib/components/ui/alert';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Textarea } from '$lib/components/ui/textarea';
	import { Label } from '$lib/components/ui/label';
	import { Building2, Plus, ArrowLeft, Save, AlertCircle, CheckCircle } from 'lucide-svelte';

	// Queries and mutations
	const GET_DEPARTMENTS = gql`
		query GetDepartmentsForSelect {
			allDepartments(condition: { isActive: true }, orderBy: NAME_ASC) {
				nodes {
					id
					name
					description
				}
			}
		}
	`;

	const CREATE_DEPARTMENT = gql`
		mutation CreateDepartment($input: CreateDepartmentInput!) {
			createDepartment(input: $input) {
				department {
					id
					name
					description
					budget
					parentDepartmentId
					isActive
					createdAt
				}
			}
		}
	`;

	interface DepartmentFormData {
		name: string;
		description: string;
		budget: string;
		parentDepartmentId: string;
	}

	// State
	let formData: DepartmentFormData = $state({
		name: '',
		description: '',
		budget: '',
		parentDepartmentId: ''
	});

	let formErrors = $state<Record<string, string>>({});
	let loading = $state(false);
	let showSuccess = $state(false);

	// Create client and queries
	const client = createUrqlClient();
	let departmentsQuery: any = $state(null);
	let queryState = $state({ fetching: true, error: null, data: null });

	onMount(() => {
		try {
			departmentsQuery = queryStore({
				client,
				query: GET_DEPARTMENTS,
				variables: {}
			});
		} catch (error) {
			console.error('Error initializing departments query:', error);
		}
	});

	// Update query state
	$effect(() => {
		if (departmentsQuery) {
			const unsubscribe = departmentsQuery.subscribe((state: any) => {
				queryState = {
					fetching: state.fetching,
					error: state.error,
					data: state.data
				};
			});
			return unsubscribe;
		}
	});

	// Available parent departments
	const parentDepartments = $derived(() => {
		if (!queryState.data) return [];
		return queryState.data?.allDepartments?.nodes || [];
	});

	// Form validation
	const validateForm = () => {
		const errors: Record<string, string> = {};

		if (!formData.name.trim()) {
			errors.name = 'Department name is required';
		} else if (formData.name.length < 2) {
			errors.name = 'Department name must be at least 2 characters';
		}

		if (formData.budget && isNaN(Number(formData.budget))) {
			errors.budget = 'Budget must be a valid number';
		}

		if (formData.budget && Number(formData.budget) < 0) {
			errors.budget = 'Budget cannot be negative';
		}

		formErrors = errors;
		return Object.keys(errors).length === 0;
	};

	// Submit form
	const handleSubmit = async () => {
		if (!validateForm()) return;

		loading = true;
		try {
			const createDepartmentMutation = mutationStore({
				client,
				query: CREATE_DEPARTMENT
			});

			const input = {
				department: {
					name: formData.name.trim(),
					description: formData.description.trim() || null,
					budget: formData.budget ? Number(formData.budget) : null,
					parentDepartmentId: formData.parentDepartmentId || null,
					isActive: true
				}
			};

			console.log('Creating department with input:', input);

			const result = await createDepartmentMutation.executeMutation({ input });

			if (result.error) {
				throw new Error(result.error.message);
			}

			console.log('Department created successfully:', result.data);
			showSuccess = true;

			// Navigate back after success
			setTimeout(() => {
				goto('/dashboard/departments');
			}, 2000);
		} catch (error) {
			console.error('Error creating department:', error);
			formErrors.general = 'Failed to create department. Please try again.';
		} finally {
			loading = false;
		}
	};

	// Cancel and go back
	const handleCancel = () => {
		goto('/dashboard/departments');
	};

	// Format currency for display
	const formatCurrency = (value: string) => {
		if (!value) return '';
		const num = Number(value);
		if (isNaN(num)) return value;
		return new Intl.NumberFormat('en-US', {
			style: 'currency',
			currency: 'USD',
			minimumFractionDigits: 0
		}).format(num);
	};
</script>

<svelte:head>
	<title>Add Department - SvelteHR</title>
	<meta name="description" content="Create a new department in the organization" />
</svelte:head>

<RoleGuard permissions={['hr:manage', 'admin:*']}>
	<div class="space-y-6">
		<!-- Header -->
		<div class="flex items-center justify-between">
			<div>
				<div class="mb-2 flex items-center gap-3">
					<Button variant="ghost" size="sm" href="/dashboard/departments" class="p-2">
						<ArrowLeft class="h-4 w-4" />
					</Button>
					<h1 class="flex items-center gap-3 text-3xl font-bold tracking-tight">
						<Plus class="h-8 w-8" />
						Add Department
					</h1>
				</div>
				<p class="text-muted-foreground">Create a new department in your organization</p>
			</div>
			<div class="flex items-center gap-3">
				<Button variant="outline" onclick={handleCancel}>Cancel</Button>
				<Button onclick={handleSubmit} disabled={loading}>
					{#if loading}
						<div
							class="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent"
						></div>
					{:else}
						<Save class="mr-2 h-4 w-4" />
					{/if}
					Create Department
				</Button>
			</div>
		</div>

		<!-- Success Alert -->
		{#if showSuccess}
			<Alert.Root class="border-green-200 bg-green-50">
				<CheckCircle class="h-4 w-4 text-green-600" />
				<Alert.Title class="text-green-800">Department Created Successfully!</Alert.Title>
				<Alert.Description class="text-green-700">
					The department has been created and you will be redirected shortly.
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

		<!-- Form -->
		<div class="grid grid-cols-1 gap-6 lg:grid-cols-2">
			<!-- Basic Information -->
			<Card.Root>
				<Card.Header>
					<Card.Title class="flex items-center gap-2">
						<Building2 class="h-5 w-5" />
						Basic Information
					</Card.Title>
				</Card.Header>
				<Card.Content class="space-y-4">
					<div class="space-y-2">
						<Label for="name">Department Name *</Label>
						<Input
							id="name"
							bind:value={formData.name}
							placeholder="e.g., Engineering, Marketing, Sales"
							class={formErrors.name ? 'border-red-500' : ''}
						/>
						{#if formErrors.name}
							<p class="text-sm text-red-600">{formErrors.name}</p>
						{/if}
					</div>

					<div class="space-y-2">
						<Label for="description">Description</Label>
						<Textarea
							id="description"
							bind:value={formData.description}
							placeholder="Brief description of the department's role and responsibilities"
							rows={3}
						/>
						<p class="text-xs text-muted-foreground">
							Optional: Describe what this department does
						</p>
					</div>
				</Card.Content>
			</Card.Root>

			<!-- Structure & Budget -->
			<Card.Root>
				<Card.Header>
					<Card.Title>Structure & Budget</Card.Title>
				</Card.Header>
				<Card.Content class="space-y-4">
					<div class="space-y-2">
						<Label for="parentDepartment">Parent Department</Label>
						{#if queryState.fetching}
							<div class="h-10 animate-pulse rounded bg-muted"></div>
						{:else}
							<Select.Root bind:selected={formData.parentDepartmentId}>
								<Select.Trigger>
									<Select.Value placeholder="Select parent department (optional)" />
								</Select.Trigger>
								<Select.Content>
									<Select.Item value="">No parent (root department)</Select.Item>
									{#each parentDepartments as dept}
										<Select.Item value={dept.id}>{dept.name}</Select.Item>
									{/each}
								</Select.Content>
							</Select.Root>
						{/if}
						<p class="text-xs text-muted-foreground">
							Leave empty to create a root-level department
						</p>
					</div>

					<div class="space-y-2">
						<Label for="budget">Annual Budget</Label>
						<div class="relative">
							<Input
								id="budget"
								type="number"
								step="1000"
								min="0"
								bind:value={formData.budget}
								placeholder="0"
								class={formErrors.budget ? 'border-red-500 pl-8' : 'pl-8'}
							/>
							<div class="absolute left-3 top-3 text-muted-foreground">$</div>
						</div>
						{#if formErrors.budget}
							<p class="text-sm text-red-600">{formErrors.budget}</p>
						{:else if formData.budget}
							<p class="text-xs text-muted-foreground">
								Budget: {formatCurrency(formData.budget)}
							</p>
						{:else}
							<p class="text-xs text-muted-foreground">
								Optional: Set an annual budget for this department
							</p>
						{/if}
					</div>
				</Card.Content>
			</Card.Root>
		</div>

		<!-- Preview -->
		<Card.Root>
			<Card.Header>
				<Card.Title>Preview</Card.Title>
			</Card.Header>
			<Card.Content>
				<div class="space-y-3">
					<div class="flex items-center space-x-2">
						<Building2 class="h-5 w-5 text-primary" />
						<div>
							<h3 class="font-semibold">{formData.name || 'Department Name'}</h3>
							<p class="text-sm text-muted-foreground">
								{formData.description || 'No description provided'}
							</p>
						</div>
					</div>

					<div class="grid grid-cols-2 gap-4 border-t pt-3">
						<div>
							<p class="text-sm font-medium">Parent Department</p>
							<p class="text-sm text-muted-foreground">
								{#if formData.parentDepartmentId}
									{parentDepartments.find((d) => d.id === formData.parentDepartmentId)?.name ||
										'Loading...'}
								{:else}
									Root department
								{/if}
							</p>
						</div>

						<div>
							<p class="text-sm font-medium">Budget</p>
							<p class="text-sm text-muted-foreground">
								{formData.budget ? formatCurrency(formData.budget) : 'No budget set'}
							</p>
						</div>
					</div>
				</div>
			</Card.Content>
		</Card.Root>
	</div>
</RoleGuard>
