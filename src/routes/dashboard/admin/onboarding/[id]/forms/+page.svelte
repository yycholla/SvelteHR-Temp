<script lang="ts">
	import { invalidateAll, goto } from '$app/navigation';
	import { Button } from '$lib/components/ui/button';
	import { Card } from '$lib/components/ui/card';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import { Textarea } from '$lib/components/ui/textarea';
	import { Checkbox } from '$lib/components/ui/checkbox';
	import {
		Dialog,
		DialogContent,
		DialogDescription,
		DialogFooter,
		DialogHeader,
		DialogTitle
	} from '$lib/components/ui/dialog';
	import {
		AlertDialog,
		AlertDialogAction,
		AlertDialogCancel,
		AlertDialogContent,
		AlertDialogDescription,
		AlertDialogFooter,
		AlertDialogHeader,
		AlertDialogTitle
	} from '$lib/components/ui/alert-dialog';
	import { Badge } from '$lib/components/ui/badge';
	import {
		Plus,
		Edit,
		Trash2,
		GripVertical,
		ChevronUp,
		ChevronDown,
		FileText,
		ArrowLeft,
		ExternalLink
	} from '@lucide/svelte';
	import { toast } from 'svelte-sonner';
	import type { OnboardingForm } from '$lib/graphql/form-operations';

	let { data } = $props();

	// State
	let forms = $state<OnboardingForm[]>(
		[...(data.forms || [])].sort((a, b) => a.sequenceOrder - b.sequenceOrder)
	);
	let showFormDialog = $state(false);
	let showDeleteDialog = $state(false);
	let editingForm = $state<OnboardingForm | null>(null);
	let deletingFormId = $state<string | null>(null);

	// Form state
	let formTitle = $state('');
	let formDescription = $state('');
	let formIsRequired = $state(true);

	// Open form dialog for creating/editing
	function openFormDialog(form?: OnboardingForm) {
		editingForm = form || null;
		if (form) {
			formTitle = form.title;
			formDescription = form.description || '';
			formIsRequired = form.isRequired;
		} else {
			formTitle = '';
			formDescription = '';
			formIsRequired = true;
		}
		showFormDialog = true;
	}

	// Close form dialog and reset state
	function closeFormDialog() {
		showFormDialog = false;
		editingForm = null;
		formTitle = '';
		formDescription = '';
		formIsRequired = true;
	}

	// Save form (create or update)
	async function saveForm() {
		const formData = new FormData();
		const isEditing = !!editingForm;

		if (isEditing) {
			formData.append('id', editingForm!.id);
		}

		formData.append('title', formTitle);
		formData.append('description', formDescription);
		formData.append('isRequired', formIsRequired.toString());

		const response = await fetch('', {
			method: 'POST',
			body: formData,
			headers: {
				'x-sveltekit-action': isEditing ? 'updateForm' : 'createForm'
			}
		});

		if (response.ok) {
			const result = await response.json();
			if (result.type === 'success') {
				toast.success(isEditing ? 'Form updated successfully' : 'Form created successfully');

				// If creating a new form, navigate to the Form Builder
				if (!isEditing && result.data?.formId) {
					await goto(`/dashboard/admin/forms/${result.data.formId}`);
				} else {
					await invalidateAll();
					closeFormDialog();
				}
			} else {
				toast.error(result.data?.error || 'Operation failed');
			}
		} else {
			toast.error(isEditing ? 'Failed to update form' : 'Failed to create form');
		}
	}

	// Delete form
	function confirmDeleteForm(formId: string) {
		deletingFormId = formId;
		showDeleteDialog = true;
	}

	async function deleteForm() {
		if (!deletingFormId) return;

		const formData = new FormData();
		formData.append('id', deletingFormId);

		const response = await fetch('', {
			method: 'POST',
			body: formData,
			headers: {
				'x-sveltekit-action': 'deleteForm'
			}
		});

		if (response.ok) {
			toast.success('Form deleted successfully');
			await invalidateAll();
			showDeleteDialog = false;
			deletingFormId = null;
		} else {
			toast.error('Failed to delete form');
		}
	}

	// Move form up/down
	async function moveForm(index: number, direction: 'up' | 'down') {
		if (
			(direction === 'up' && index === 0) ||
			(direction === 'down' && index === forms.length - 1)
		) {
			return;
		}

		const newForms = [...forms];
		const swapIndex = direction === 'up' ? index - 1 : index + 1;
		[newForms[index], newForms[swapIndex]] = [newForms[swapIndex], newForms[index]];

		const formIds = newForms.map((f) => f.id);
		const formData = new FormData();
		formData.append('formIds', JSON.stringify(formIds));

		const response = await fetch('', {
			method: 'POST',
			body: formData,
			headers: {
				'x-sveltekit-action': 'reorderForms'
			}
		});

		if (response.ok) {
			forms = newForms;
			toast.success('Forms reordered successfully');
			await invalidateAll();
		} else {
			toast.error('Failed to reorder forms');
		}
	}

	// Navigate to Form Builder
	function editFormBlocks(formId: string) {
		goto(`/dashboard/admin/forms/${formId}`);
	}
</script>

<div class="container mx-auto p-6 max-w-6xl">
	<!-- Header -->
	<div class="mb-6 flex items-center justify-between">
		<div class="flex items-center gap-4">
			<Button
				variant="outline"
				size="icon"
				href={`/dashboard/admin/onboarding/${data.module.id}`}
			>
				<ArrowLeft class="h-4 w-4" />
			</Button>
			<div>
				<h1 class="text-3xl font-bold text-gray-900 dark:text-gray-100">Forms Management</h1>
				<p class="text-sm text-gray-500 dark:text-gray-400 mt-1">
					Manage forms for "{data.module.title}"
				</p>
			</div>
		</div>
		<Button onclick={() => openFormDialog()}>
			<Plus class="w-4 h-4 mr-2" />
			Create Form
		</Button>
	</div>

	<!-- Forms List -->
	<Card class="p-6">
		<div class="flex items-center justify-between mb-4">
			<h2 class="text-xl font-semibold">Forms</h2>
			<Badge variant="secondary">{forms.length} {forms.length === 1 ? 'Form' : 'Forms'}</Badge>
		</div>

		{#if forms.length === 0}
			<div class="text-center py-12 text-gray-500">
				<FileText class="w-16 h-16 mx-auto mb-4 text-gray-400" />
				<p class="text-lg mb-2">No forms yet</p>
				<p class="text-sm">Create your first form to start building the onboarding experience</p>
			</div>
		{:else}
			<div class="space-y-3">
				{#each forms as form, index}
					<div
						class="flex items-center gap-3 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700"
					>
						<!-- Drag handle -->
						<div class="text-gray-400">
							<GripVertical class="w-5 h-5" />
						</div>

						<!-- Form info -->
						<div class="flex-1 flex items-center gap-3">
							<div class="p-2 bg-white dark:bg-gray-700 rounded">
								<FileText class="w-5 h-5 text-gray-600 dark:text-gray-400" />
							</div>
							<div class="flex-1">
								<h3 class="font-medium text-sm flex items-center gap-2">
									{form.title}
									{#if form.isRequired}
										<Badge variant="secondary" class="h-4 text-[10px]">Required</Badge>
									{/if}
								</h3>
								{#if form.description}
									<p class="text-xs text-gray-500 mt-1">{form.description}</p>
								{/if}
								<p class="text-xs text-gray-400 mt-1">Step {index + 1}</p>
							</div>
						</div>

						<!-- Actions -->
						<div class="flex items-center gap-2">
							<Button
								variant="ghost"
								size="sm"
								onclick={() => moveForm(index, 'up')}
								disabled={index === 0}
							>
								<ChevronUp class="w-4 h-4" />
							</Button>
							<Button
								variant="ghost"
								size="sm"
								onclick={() => moveForm(index, 'down')}
								disabled={index === forms.length - 1}
							>
								<ChevronDown class="w-4 h-4" />
							</Button>
							<Button variant="ghost" size="sm" onclick={() => editFormBlocks(form.id)}>
								<ExternalLink class="w-4 h-4 mr-1" />
								Edit Blocks
							</Button>
							<Button variant="ghost" size="sm" onclick={() => openFormDialog(form)}>
								<Edit class="w-4 h-4" />
							</Button>
							<Button
								variant="ghost"
								size="sm"
								onclick={() => confirmDeleteForm(form.id)}
								class="text-red-600 hover:text-red-700"
							>
								<Trash2 class="w-4 h-4" />
							</Button>
						</div>
					</div>
				{/each}
			</div>
		{/if}
	</Card>
</div>

<!-- Form Dialog -->
<Dialog bind:open={showFormDialog}>
	<DialogContent>
		<DialogHeader>
			<DialogTitle>{editingForm ? 'Edit Form' : 'Create New Form'}</DialogTitle>
			<DialogDescription>
				{editingForm ? 'Update the form details below' : 'Create a new form for the onboarding module'}
			</DialogDescription>
		</DialogHeader>

		<div class="space-y-4">
			<div>
				<Label for="form-title">Title</Label>
				<Input id="form-title" bind:value={formTitle} placeholder="Enter form title" />
			</div>
			<div>
				<Label for="form-description">Description (Optional)</Label>
				<Textarea
					id="form-description"
					bind:value={formDescription}
					placeholder="Enter form description"
					rows={3}
				/>
			</div>
			<div class="flex items-center space-x-2">
				<Checkbox id="form-required" bind:checked={formIsRequired} />
				<Label for="form-required">Required (employees must complete this form)</Label>
			</div>
		</div>

		<DialogFooter>
			<Button variant="outline" onclick={closeFormDialog}>Cancel</Button>
			<Button onclick={saveForm} disabled={!formTitle}>
				{editingForm ? 'Update' : 'Create'}
			</Button>
		</DialogFooter>
	</DialogContent>
</Dialog>

<!-- Delete Confirmation Dialog -->
<AlertDialog bind:open={showDeleteDialog}>
	<AlertDialogContent>
		<AlertDialogHeader>
			<AlertDialogTitle>Delete Form</AlertDialogTitle>
			<AlertDialogDescription>
				Are you sure you want to delete this form? All blocks within this form will also be deleted.
				This action cannot be undone.
			</AlertDialogDescription>
		</AlertDialogHeader>
		<AlertDialogFooter>
			<AlertDialogCancel onclick={() => (showDeleteDialog = false)}>Cancel</AlertDialogCancel>
			<AlertDialogAction onclick={deleteForm} class="bg-red-600 hover:bg-red-700">
				Delete
			</AlertDialogAction>
		</AlertDialogFooter>
	</AlertDialogContent>
</AlertDialog>
