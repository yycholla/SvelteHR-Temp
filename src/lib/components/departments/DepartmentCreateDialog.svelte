<script lang="ts">
	import { enhance } from '$app/forms';
	import { invalidateAll } from '$app/navigation';
	import * as Dialog from '$lib/components/ui/dialog';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import { Textarea } from '$lib/components/ui/textarea';
	import * as Select from '$lib/components/ui/select';
	import { Building2 } from '@lucide/svelte';

	interface User {
		id: string;
		displayName: string;
		email: string;
		role?: string;
	}

	interface Department {
		id: string;
		name: string;
	}

	let {
		open = $bindable(false),
		users = [],
		departments = []
	}: {
		open: boolean;
		users: User[];
		departments: Department[];
	} = $props();

	// Form state using Svelte 5 runes
	let name = $state('');
	let description = $state('');
	let selectedManagerId = $state('');
	let isSubmitting = $state(false);
	let formErrors = $state<Record<string, string>>({});
	let successMessage = $state('');

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

	// Reset form
	function resetForm() {
		name = '';
		description = '';
		selectedManagerId = '';
		formErrors = {};
		successMessage = '';
	}

	// Handle dialog close
	function handleClose() {
		resetForm();
		open = false;
	}
</script>

<Dialog.Root bind:open>
	<Dialog.Content class="max-w-2xl max-h-[90vh] overflow-y-auto">
		<Dialog.Header>
			<div class="flex items-center gap-3">
				<div class="rounded-lg bg-primary/10 p-2">
					<Building2 class="h-5 w-5 text-primary" />
				</div>
				<div>
					<Dialog.Title>Create New Department</Dialog.Title>
					<Dialog.Description>Add a new department to your organization</Dialog.Description>
				</div>
			</div>
		</Dialog.Header>

		<form
			method="POST"
			action="/dashboard/departments?/create"
			use:enhance={() => {
				if (!validateForm()) {
					return () => {};
				}

				isSubmitting = true;
				formErrors = {};

				return async ({ result, update }) => {
					isSubmitting = false;

					if (result.type === 'success') {
						successMessage = 'Department created successfully!';
						await invalidateAll();
						setTimeout(() => {
							handleClose();
						}, 1000);
					} else if (result.type === 'failure') {
						const errorMsg =
							typeof result.data?.error === 'string'
								? result.data.error
								: 'Failed to create department';
						formErrors = { submit: errorMsg };
					} else if (result.type === 'error') {
						formErrors = { submit: 'An unexpected error occurred' };
					}

					await update();
				};
			}}
			class="space-y-4"
		>
			<!-- Success Message -->
			{#if successMessage}
				<div class="rounded-md bg-green-50 p-3 text-sm text-green-800">
					{successMessage}
				</div>
			{/if}

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
						{#each users as user (user.id)}
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
				<p class="text-sm text-muted-foreground">Select the user who will manage this department</p>
			</div>

			<!-- Form Error Message -->
			{#if formErrors.submit}
				<div class="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
					{formErrors.submit}
				</div>
			{/if}

			<!-- Form Actions -->
			<Dialog.Footer>
				<Button type="button" variant="outline" onclick={handleClose} disabled={isSubmitting}>
					Cancel
				</Button>
				<Button type="submit" disabled={isSubmitting}>
					{#if isSubmitting}
						Creating...
					{:else}
						Create Department
					{/if}
				</Button>
			</Dialog.Footer>
		</form>
	</Dialog.Content>
</Dialog.Root>
