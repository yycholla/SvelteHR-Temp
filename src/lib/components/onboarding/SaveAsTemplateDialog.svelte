<script lang="ts">
	/**
	 * Save As Template Dialog
	 * Dialog for saving a custom inline form as a reusable template
	 */
	import * as Dialog from '$lib/components/ui/dialog';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import { Textarea } from '$lib/components/ui/textarea';
	import * as Select from '$lib/components/ui/select';
	import { Save } from '@lucide/svelte';

	interface Props {
		open: boolean;
		fieldCount: number;
		onSave: (name: string, description: string | null, category: string | null) => void;
		onCancel: () => void;
	}

	let { open = $bindable(false), fieldCount, onSave, onCancel }: Props = $props();

	// Form categories
	const categories = [
		{ value: 'employee', label: 'Employee Information' },
		{ value: 'emergency', label: 'Emergency Contacts' },
		{ value: 'benefits', label: 'Benefits & Payroll' },
		{ value: 'compliance', label: 'Compliance & Legal' },
		{ value: 'training', label: 'Training & Certification' },
		{ value: 'feedback', label: 'Feedback & Surveys' },
		{ value: 'other', label: 'Other' }
	];

	// Form state
	let name = $state('');
	let description = $state('');
	let category = $state('');

	// Error state
	let formErrors = $state<Record<string, string>>({});
	let isSubmitting = $state(false);

	// Validation
	function validateForm(): boolean {
		const errors: Record<string, string> = {};

		if (!name.trim()) {
			errors.name = 'Template name is required';
		} else if (name.trim().length < 3) {
			errors.name = 'Template name must be at least 3 characters';
		}

		formErrors = errors;
		return Object.keys(errors).length === 0;
	}

	function handleSave() {
		if (!validateForm()) {
			return;
		}

		isSubmitting = true;
		const trimmedName = name.trim();
		const trimmedDescription = description.trim() || null;
		const selectedCategory = category || null;

		onSave(trimmedName, trimmedDescription, selectedCategory);

		// Reset form
		resetForm();
		isSubmitting = false;
		open = false;
	}

	function handleCancel() {
		resetForm();
		onCancel();
		open = false;
	}

	function resetForm() {
		name = '';
		description = '';
		category = '';
		formErrors = {};
		isSubmitting = false;
	}
</script>

<Dialog.Root bind:open>
	<Dialog.Content class="max-w-2xl">
		<Dialog.Header>
			<div class="flex items-center gap-3">
				<div class="rounded-lg bg-primary/10 p-2">
					<Save class="h-5 w-5 text-primary" />
				</div>
				<div>
					<Dialog.Title>Save as Template</Dialog.Title>
					<Dialog.Description>
						Save this form with {fieldCount} field{fieldCount !== 1 ? 's' : ''} as a reusable template
					</Dialog.Description>
				</div>
			</div>
		</Dialog.Header>

		<div class="space-y-4">
			<!-- Template Name -->
			<div class="space-y-2">
				<Label for="templateName">
					Template Name <span class="text-destructive">*</span>
				</Label>
				<Input
					id="templateName"
					bind:value={name}
					placeholder="e.g., New Hire Information, Emergency Contacts"
					class={formErrors.name ? 'border-destructive' : ''}
					disabled={isSubmitting}
				/>
				{#if formErrors.name}
					<p class="text-sm text-destructive">{formErrors.name}</p>
				{:else}
					<p class="text-sm text-muted-foreground">
						A descriptive name to identify this template
					</p>
				{/if}
			</div>

			<!-- Category -->
			<div class="space-y-2">
				<Label for="templateCategory">Category</Label>
				<Select.Root type="single" bind:value={category} disabled={isSubmitting}>
					<Select.Trigger id="templateCategory">
						<Select.Value placeholder="Select a category (optional)" />
					</Select.Trigger>
					<Select.Content>
						<Select.Item value="">No category</Select.Item>
						{#each categories as cat}
							<Select.Item value={cat.value}>{cat.label}</Select.Item>
						{/each}
					</Select.Content>
				</Select.Root>
				<p class="text-sm text-muted-foreground">
					Help organize templates by grouping them into categories
				</p>
			</div>

			<!-- Description -->
			<div class="space-y-2">
				<Label for="templateDescription">Description</Label>
				<Textarea
					id="templateDescription"
					bind:value={description}
					placeholder="Briefly describe what information this form collects and when it should be used..."
					rows={4}
					disabled={isSubmitting}
				/>
				<p class="text-sm text-muted-foreground">
					Optional description to help others understand when to use this template
				</p>
			</div>

			<!-- Info Box -->
			<div class="rounded-lg bg-muted p-4">
				<h4 class="text-sm font-medium mb-2">What happens next?</h4>
				<ul class="text-sm text-muted-foreground space-y-1">
					<li>• The template will be saved with all {fieldCount} configured field{fieldCount !== 1 ? 's' : ''}</li>
					<li>• You can reuse this template in future forms</li>
					<li>• The current form will continue to use the custom fields (not the template)</li>
					<li>• Templates can be edited from the template management page</li>
				</ul>
			</div>
		</div>

		<!-- Form Actions -->
		<Dialog.Footer>
			<Button type="button" variant="outline" onclick={handleCancel} disabled={isSubmitting}>
				Cancel
			</Button>
			<Button type="button" onclick={handleSave} disabled={isSubmitting}>
				{#if isSubmitting}
					Saving...
				{:else}
					Save Template
				{/if}
			</Button>
		</Dialog.Footer>
	</Dialog.Content>
</Dialog.Root>
