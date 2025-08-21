<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { departmentActions, departments } from '$lib/stores/departments';
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
	import type { CreateDepartmentRequest } from '$lib/types/department';

	let formData = $state<CreateDepartmentRequest>({
		name: '',
		description: '',
		budget: '',
		parent_id: null,
		manager_id: null
	});

	let isSubmitting = $state(false);
	let formErrors = $state<Record<string, string>>({});

	// Available parent departments (exclude inactive ones)
	const parentDepartmentOptions = $derived(
		departments.filter(dept => dept.is_active)
	);

	onMount(() => {
		// Load departments for parent selection
		departmentActions.loadDepartments({ active_only: true });
		
		// Check if parent ID is provided in URL query params
		const parentId = $page.url.searchParams.get('parent');
		if (parentId) {
			formData.parent_id = parentId;
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
		if (!validateForm()) {
			return;
		}

		isSubmitting = true;

		try {
			// Prepare form data for submission
			const submitData: CreateDepartmentRequest = {
				...formData,
				budget: formData.budget ? parseFloat(String(formData.budget)) : undefined,
				parent_id: formData.parent_id || null,
				manager_id: formData.manager_id || null
			};

			const newDepartment = await departmentActions.createDepartment(submitData);
			
			// Redirect to the new department's detail page
			await goto(`/departments/${newDepartment.id}`);
		} catch (error) {
			console.error('Failed to create department:', error);
			// Error is handled by the store
		} finally {
			isSubmitting = false;
		}
	}

	function handleCancel() {
		goto('/departments');
	}
</script>

<svelte:head>
	<title>Create Department - SvelteHR</title>
</svelte:head>

<RoleGuard roles={['admin', 'hr', 'hr_admin']} fallback>
	<div class="container mx-auto py-8 px-4 max-w-4xl">
		<!-- Header -->
		<div class="flex items-center gap-4 mb-8">
			<Button variant="ghost" size="icon" onclick={handleCancel}>
				<ArrowLeft class="h-4 w-4" />
			</Button>
			<div>
				<h1 class="text-3xl font-bold text-foreground">Create Department</h1>
				<p class="text-muted-foreground mt-2">Add a new department to your organization</p>
			</div>
		</div>

		<Card>
			<CardHeader>
				<CardTitle class="flex items-center gap-2">
					<Building2 class="h-5 w-5" />
					Department Information
				</CardTitle>
			</CardHeader>
			
			<CardContent class="space-y-6">
				<form onsubmit|preventDefault={handleSubmit} class="space-y-6">
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
							{isSubmitting ? 'Creating...' : 'Create Department'}
						</Button>
					</div>
				</form>
			</CardContent>
		</Card>
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
							You don't have permission to create departments.
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