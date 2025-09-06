<script lang="ts">
	import { onMount } from 'svelte';
	import { page } from '$app/stores';
	import { goto } from '$app/navigation';
	import { 
		departmentActions, 
		currentDepartment, 
		departments,
		isLoading, 
		error 
	} from '$lib/stores/departments';
	import { RoleGuard } from '$lib/components/auth';
	import { Button } from '$lib/components/ui/button';
	import { Card, CardContent, CardHeader, CardTitle } from '$lib/components/ui/card';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import { Textarea } from '$lib/components/ui/textarea';
	import {
		Select,
		SelectContent,
		SelectItem,
		SelectTrigger,
		SelectValue
	} from '$lib/components/ui/select';
	import { ArrowLeft, Save, Building2 } from 'lucide-svelte';
	import type { UpdateDepartmentRequest } from '$lib/types/department';

	const departmentId = $derived($page.params.id);

	let formData = $state<UpdateDepartmentRequest>({
		name: '',
		description: '',
		budget: '',
		parent_id: null,
		manager_id: null,
		is_active: true
	});

	let isSubmitting = $state(false);
	let formErrors = $state<Record<string, string>>({});

	// Available parent departments (exclude self and descendants)
	const parentDepartmentOptions = $derived(() => {
		if (!currentDepartment) return departments.filter(dept => dept.is_active);
		
		// Get all descendants to exclude them as potential parents
		const getDescendants = (parentId: string): string[] => {
			const children = departments.filter(d => d.parent_id === parentId);
			const descendants = children.map(c => c.id);
			children.forEach(child => {
				descendants.push(...getDescendants(child.id));
			});
			return descendants;
		};

		const excludeIds = new Set([currentDepartment.id, ...getDescendants(currentDepartment.id)]);
		return departments.filter(dept => dept.is_active && !excludeIds.has(dept.id));
	});

	onMount(() => {
		if (departmentId) {
			// Load the department data
			departmentActions.loadDepartment(departmentId);
		}
		// Load all departments for parent selection
		departmentActions.loadDepartments({ active_only: true });
	});

	// Update form data when currentDepartment changes
	$effect(() => {
		if (currentDepartment && currentDepartment.id === departmentId) {
			formData = {
				name: currentDepartment.name,
				description: currentDepartment.description || '',
				budget: currentDepartment.budget?.toString() || '',
				parent_id: currentDepartment.parent_id || null,
				manager_id: currentDepartment.manager_id || null,
				is_active: currentDepartment.is_active
			};
		}
	});

	function validateForm(): boolean {
		formErrors = {};

		if (!formData.name.trim()) {
			formErrors.name = 'Department name is required';
		} else if (formData.name.length > 100) {
			formErrors.name = 'Department name must be less than 100 characters';
		}

		if (formData.description && formData.description.length > 500) {
			formErrors.description = 'Description must be less than 500 characters';
		}

		if (formData.budget) {
			const budget = parseFloat(String(formData.budget));
			if (isNaN(budget) || budget < 0) {
				formErrors.budget = 'Budget must be a valid positive number';
			}
		}

		return Object.keys(formErrors).length === 0;
	}

	async function handleSubmit() {
		if (!validateForm() || !departmentId) {
			return;
		}

		isSubmitting = true;

		try {
			// Prepare form data for submission
			const submitData: UpdateDepartmentRequest = {
				...formData,
				budget: formData.budget ? parseFloat(String(formData.budget)) : undefined,
				parent_id: formData.parent_id || null,
				manager_id: formData.manager_id || null
			};

			await departmentActions.updateDepartment(departmentId, submitData);
			
			// Redirect to the department's detail page
			await goto(`/departments/${departmentId}`);
		} catch (error) {
			console.error('Failed to update department:', error);
			// Error is handled by the store
		} finally {
			isSubmitting = false;
		}
	}

	function handleCancel() {
		goto(`/departments/${departmentId}`);
	}
</script>

<svelte:head>
	<title>{currentDepartment?.name ? `Edit ${currentDepartment.name}` : 'Edit Department'} - SvelteHR</title>
</svelte:head>

<RoleGuard roles={['admin', 'hr', 'hr_admin']} fallback>
	<div class="container mx-auto py-8 px-4 max-w-4xl">
		<!-- Header -->
		<div class="flex items-center gap-4 mb-8">
			<Button variant="ghost" size="icon" onclick={handleCancel}>
				<ArrowLeft class="h-4 w-4" />
			</Button>
			<div>
				{#if isLoading}
					<div class="animate-pulse">
						<div class="h-8 bg-muted rounded w-64 mb-2"></div>
						<div class="h-4 bg-muted rounded w-48"></div>
					</div>
				{:else if currentDepartment}
					<h1 class="text-3xl font-bold text-foreground">Edit Department</h1>
					<p class="text-muted-foreground mt-2">Update {currentDepartment.name} information</p>
				{:else}
					<h1 class="text-3xl font-bold text-foreground">Edit Department</h1>
					<p class="text-muted-foreground mt-2">Update department information</p>
				{/if}
			</div>
		</div>

		<!-- Error State -->
		{#if error}
			<Card class="mb-6 border-destructive">
				<CardContent class="pt-6">
					<p class="text-destructive">{error}</p>
					<div class="flex gap-2 mt-4">
						<Button variant="outline" onclick={() => departmentActions.clearError()}>
							Dismiss
						</Button>
						<Button variant="outline" onclick={handleCancel}>
							Back to Department
						</Button>
					</div>
				</CardContent>
			</Card>
		{/if}

		<!-- Loading State -->
		{#if isLoading}
			<Card>
				<CardHeader>
					<div class="animate-pulse">
						<div class="h-6 bg-muted rounded w-48 mb-2"></div>
					</div>
				</CardHeader>
				<CardContent class="space-y-6">
					{#each Array(5) as _}
						<div class="animate-pulse space-y-2">
							<div class="h-4 bg-muted rounded w-24"></div>
							<div class="h-10 bg-muted rounded"></div>
						</div>
					{/each}
				</CardContent>
			</Card>
		{:else if currentDepartment}
			<Card>
				<CardHeader>
					<CardTitle class="flex items-center gap-2">
						<Building2 class="h-5 w-5" />
						Department Information
					</CardTitle>
				</CardHeader>
				
				<CardContent class="space-y-6">
					<form onsubmit={(e) => { e.preventDefault(); handleSubmit(e); }} class="space-y-6">
						<!-- Name -->
						<div class="space-y-2">
							<Label for="name">Department Name *</Label>
							<Input
								id="name"
								type="text"
								bind:value={formData.name}
								placeholder="e.g., Human Resources, Engineering, Sales"
								class={formErrors.name ? 'border-destructive' : ''}
								required
							/>
							{#if formErrors.name}
								<p class="text-sm text-destructive">{formErrors.name}</p>
							{/if}
						</div>

						<!-- Description -->
						<div class="space-y-2">
							<Label for="description">Description</Label>
							<Textarea
								id="description"
								bind:value={formData.description}
								placeholder="Brief description of the department's role and responsibilities"
								class={formErrors.description ? 'border-destructive' : ''}
								rows={3}
							/>
							{#if formErrors.description}
								<p class="text-sm text-destructive">{formErrors.description}</p>
							{/if}
						</div>

						<!-- Budget -->
						<div class="space-y-2">
							<Label for="budget">Annual Budget (USD)</Label>
							<Input
								id="budget"
								type="number"
								step="0.01"
								min="0"
								bind:value={formData.budget}
								placeholder="0.00"
								class={formErrors.budget ? 'border-destructive' : ''}
							/>
							{#if formErrors.budget}
								<p class="text-sm text-destructive">{formErrors.budget}</p>
							{/if}
							<p class="text-xs text-muted-foreground">Leave empty if no budget is set</p>
						</div>

						<!-- Parent Department -->
						<div class="space-y-2">
							<Label for="parent">Parent Department</Label>
							<Select bind:value={formData.parent_id}>
								<SelectTrigger>
									<SelectValue placeholder="Select a parent department (optional)" />
								</SelectTrigger>
								<SelectContent>
									<SelectItem value={null}>None (Root Department)</SelectItem>
									{#each parentDepartmentOptions as dept}
										<SelectItem value={dept.id}>{dept.name}</SelectItem>
									{/each}
								</SelectContent>
							</Select>
							<p class="text-xs text-muted-foreground">
								Choose a parent department to create a hierarchical structure
							</p>
						</div>

						<!-- Manager -->
						<div class="space-y-2">
							<Label for="manager">Department Manager</Label>
							<Select bind:value={formData.manager_id}>
								<SelectTrigger>
									<SelectValue placeholder="Select a department manager (optional)" />
								</SelectTrigger>
								<SelectContent>
									<SelectItem value={null}>No Manager Assigned</SelectItem>
									<!-- TODO: Load and display available managers -->
								</SelectContent>
							</Select>
							<p class="text-xs text-muted-foreground">
								Assign a manager to oversee this department
							</p>
						</div>

						<!-- Status -->
						<div class="space-y-2">
							<Label for="status">Status</Label>
							<Select bind:value={formData.is_active}>
								<SelectTrigger>
									<SelectValue />
								</SelectTrigger>
								<SelectContent>
									<SelectItem value={true}>Active</SelectItem>
									<SelectItem value={false}>Inactive</SelectItem>
								</SelectContent>
							</Select>
							<p class="text-xs text-muted-foreground">
								Inactive departments are hidden from most views but retain all data
							</p>
						</div>

						<!-- Actions -->
						<div class="flex items-center justify-end gap-4 pt-6 border-t">
							<Button variant="outline" onclick={handleCancel} disabled={isSubmitting}>
								Cancel
							</Button>
							<Button type="submit" disabled={isSubmitting} class="gap-2">
								{#if isSubmitting}
									<div class="animate-spin rounded-full h-4 w-4 border-b-2 border-current"></div>
								{:else}
									<Save class="h-4 w-4" />
								{/if}
								{isSubmitting ? 'Saving...' : 'Save Changes'}
							</Button>
						</div>
					</form>
				</CardContent>
			</Card>
		{:else}
			<!-- Department not found -->
			<Card>
				<CardContent class="pt-6">
					<div class="text-center py-12">
						<Building2 class="h-12 w-12 text-muted-foreground mx-auto mb-4" />
						<h3 class="text-lg font-semibold mb-2">Department Not Found</h3>
						<p class="text-muted-foreground mb-4">
							The department you're trying to edit doesn't exist or you don't have permission to edit it.
						</p>
						<Button href="/departments" variant="outline">
							Back to Departments
						</Button>
					</div>
				</CardContent>
			</Card>
		{/if}
	</div>

	<!-- Fallback content -->
	<svelte:fragment slot="fallback">
		<div class="container mx-auto py-8 px-4 max-w-4xl">
			<Card>
				<CardContent class="pt-6">
					<div class="text-center py-12">
						<Building2 class="h-12 w-12 text-muted-foreground mx-auto mb-4" />
						<h3 class="text-lg font-semibold mb-2">Access Denied</h3>
						<p class="text-muted-foreground mb-4">
							You don't have permission to edit departments.
						</p>
						<Button href="/departments" variant="outline">
							Back to Departments
						</Button>
					</div>
				</CardContent>
			</Card>
		</div>
	</svelte:fragment>
</RoleGuard>