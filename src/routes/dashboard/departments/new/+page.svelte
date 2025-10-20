<script lang="ts">
	import { goto } from '$app/navigation';
	import { Button } from '$lib/components/ui/button';
	import * as Card from '$lib/components/ui/card';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import { Textarea } from '$lib/components/ui/textarea';
	import * as Select from '$lib/components/ui/select';
	import { ArrowLeft, Building2 } from 'lucide-svelte';

	// Get page data
	let { data } = $props();

	// Form state using Svelte 5 runes
	let name = $state('');
	let description = $state('');
	let selectedManagerId = $state('');
	let selectedParentDepartmentId = $state('');
	let isSubmitting = $state(false);
	let formErrors = $state<Record<string, string>>({});

	// Form validation
	function validateForm(): boolean {
		const errors: Record<string, string> = {};

		if (!name.trim()) {
			errors.name = 'Department name is required';
		} else if (name.trim().length < 2) {
			errors.name = 'Department name must be at least 2 characters';
		}

		formErrors = errors;
		return Object.keys(errors).length === 0;
	}

	// Handle form submission
	async function handleSubmit(event: Event) {
		event.preventDefault();

		if (!validateForm()) {
			return;
		}

		isSubmitting = true;

		try {
			const formData = new FormData(event.target as HTMLFormElement);
			const response = await fetch('?/create', {
				method: 'POST',
				body: formData
			});

			// SvelteKit will handle the redirect from the server
			// If we're still here, there was an error
			if (!response.ok) {
				formErrors = { submit: 'Failed to create department. Please try again.' };
			}
		} catch (error) {
			console.error('Error submitting form:', error);
			formErrors = { submit: 'An unexpected error occurred. Please try again.' };
		} finally {
			isSubmitting = false;
		}
	}

	// Handle cancel
	function handleCancel() {
		goto('/dashboard/departments');
	}
</script>

<svelte:head>
	<title>Create New Department - SvelteHR</title>
	<meta name="description" content="Create a new department in the organization" />
</svelte:head>

<div class="container mx-auto px-4 py-8 max-w-3xl">
	<!-- Header -->
	<div class="mb-6">
		<Button variant="ghost" onclick={handleCancel} class="mb-4">
			<ArrowLeft class="mr-2 h-4 w-4" />
			Back to Departments
		</Button>

		<div class="flex items-center gap-3 mb-2">
			<div class="rounded-lg bg-primary/10 p-2">
				<Building2 class="h-6 w-6 text-primary" />
			</div>
			<h1 class="text-3xl font-bold tracking-tight">Create New Department</h1>
		</div>
		<p class="text-muted-foreground">Add a new department to your organization</p>
	</div>

	<!-- Form Card -->
	<Card.Root>
		<Card.Header>
			<Card.Title>Department Information</Card.Title>
			<Card.Description>
				Enter the details for the new department. Required fields are marked with an asterisk (*).
			</Card.Description>
		</Card.Header>

		<Card.Content>
			<form onsubmit={handleSubmit} method="POST" action="?/create" class="space-y-6">
				<!-- Department Name -->
				<div class="space-y-2">
					<Label for="name">
						Department Name <span class="text-destructive">*</span>
					</Label>
					<Input
						id="name"
						name="name"
						type="text"
						bind:value={name}
						placeholder="e.g., Engineering, Human Resources, Sales"
						required
						class={formErrors.name ? 'border-destructive' : ''}
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
						name="description"
						bind:value={description}
						placeholder="Brief description of the department's responsibilities and scope"
						rows={4}
					/>
					<p class="text-sm text-muted-foreground">
						Provide a brief overview of what this department does
					</p>
				</div>

				<!-- Department Manager -->
				<div class="space-y-2">
					<Label for="managerId">Department Manager</Label>
					<Select.Root type="single" bind:value={selectedManagerId}>
						<Select.Trigger id="managerId">
							<Select.Value placeholder="Select a department manager (optional)" />
						</Select.Trigger>
						<Select.Content>
							<Select.Item value="">No manager assigned</Select.Item>
							{#each data.users as user (user.id)}
								<Select.Item value={user.id}>
									{user.displayName || user.email}
									{#if user.role}
										<span class="text-muted-foreground ml-2 text-xs">
											({user.role})
										</span>
									{/if}
								</Select.Item>
							{/each}
						</Select.Content>
					</Select.Root>
					<input type="hidden" name="managerId" value={selectedManagerId} />
					<p class="text-sm text-muted-foreground">
						Select the user who will manage this department
					</p>
				</div>

				<!-- Parent Department (Currently not supported by backend) -->
				<div class="space-y-2 opacity-50">
					<Label for="parentDepartmentId" class="flex items-center gap-2">
						Parent Department
						<span class="text-xs text-muted-foreground">(Coming Soon)</span>
					</Label>
					<Select.Root type="single" bind:value={selectedParentDepartmentId} disabled>
						<Select.Trigger id="parentDepartmentId">
							<Select.Value placeholder="Hierarchical departments coming soon" />
						</Select.Trigger>
						<Select.Content>
							<Select.Item value="">No parent (top-level department)</Select.Item>
							{#each data.departments as department (department.id)}
								<Select.Item value={department.id}>
									{department.name}
								</Select.Item>
							{/each}
						</Select.Content>
					</Select.Root>
					<p class="text-sm text-muted-foreground">
						Department hierarchy support is not yet available in the backend
					</p>
				</div>

				<!-- Form Error Message -->
				{#if formErrors.submit}
					<div class="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
						{formErrors.submit}
					</div>
				{/if}

				<!-- Form Actions -->
				<div class="flex gap-3 pt-4">
					<Button type="submit" disabled={isSubmitting}>
						{#if isSubmitting}
							Creating...
						{:else}
							Create Department
						{/if}
					</Button>
					<Button type="button" variant="outline" onclick={handleCancel} disabled={isSubmitting}>
						Cancel
					</Button>
				</div>
			</form>
		</Card.Content>
	</Card.Root>
</div>
