<script lang="ts">
	import { goto, invalidateAll } from '$app/navigation';
	import { Button } from '$lib/components/ui/button';
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
		ArrowLeft,
		ChevronDown,
		ChevronUp,
		Edit,
		ExternalLink,
		FileText,
		GripVertical,
		Plus,
		Trash2
	} from '@lucide/svelte';
	import { toast } from 'svelte-sonner';
	import type { OnboardingForm } from '$lib/graphql/form-operations';

	const { data } = $props();

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

	// Open form dialog
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

	function closeFormDialog() {
		showFormDialog = false;
		editingForm = null;
		formTitle = '';
		formDescription = '';
		formIsRequired = true;
	}

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
				if (!isEditing && result.data?.formId) {
					await goto(`/admin/forms/${result.data.formId}`);
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
			headers: { 'x-sveltekit-action': 'deleteForm' }
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

	async function moveForm(index: number, direction: 'up' | 'down') {
		if ((direction === 'up' && index === 0) || (direction === 'down' && index === forms.length - 1))
			return;
		const newForms = [...forms];
		const swapIndex = direction === 'up' ? index - 1 : index + 1;
		[newForms[index], newForms[swapIndex]] = [newForms[swapIndex], newForms[index]];
		const formIds = newForms.map((f) => f.id);
		const formData = new FormData();
		formData.append('formIds', JSON.stringify(formIds));
		const response = await fetch('', {
			method: 'POST',
			body: formData,
			headers: { 'x-sveltekit-action': 'reorderForms' }
		});
		if (response.ok) {
			forms = newForms;
			toast.success('Forms reordered successfully');
			await invalidateAll();
		} else {
			toast.error('Failed to reorder forms');
		}
	}

	function editFormBlocks(formId: string) {
		goto(`/admin/forms/${formId}`);
	}
</script>

<div class="flex flex-col h-full bg-background overflow-hidden">
	<!-- Sticky Header -->
	<header
		class="flex-shrink-0 flex items-center justify-between h-14 px-4 border-b bg-background z-20"
	>
		<div class="flex items-center gap-4">
			<Button
				variant="ghost"
				size="icon"
				href={`/admin/onboarding/${data.module.id}`}
				title="Back to Module"
			>
				<ArrowLeft class="h-4 w-4" />
			</Button>
			<div>
				<h1 class="text-sm font-semibold tracking-tight">Forms Management</h1>
				<div class="text-[10px] text-muted-foreground flex items-center gap-1">
					<span>{data.module.title}</span>
					<span class="text-border">/</span>
					<span>{forms.length} forms</span>
				</div>
			</div>
		</div>
		<Button size="sm" onclick={() => openFormDialog()} class="h-8">
			<Plus class="w-3.5 h-3.5 mr-2" />
			Create Form
		</Button>
	</header>

	<!-- Content -->
	<div class="flex-1 overflow-auto bg-muted/5">
		{#if forms.length === 0}
			<div class="flex flex-col items-center justify-center h-64 text-muted-foreground">
				<FileText class="w-12 h-12 mb-4 opacity-20" />
				<p class="text-sm">No forms yet</p>
				<p class="text-xs">Create your first form to start building.</p>
			</div>
		{:else}
			<div class="divide-y border-b bg-background">
				{#each forms as form, index}
					<div class="flex items-center gap-3 p-3 hover:bg-muted/5 group transition-colors">
						<div class="text-muted-foreground cursor-grab active:cursor-grabbing">
							<GripVertical class="w-4 h-4" />
						</div>

						<div class="p-2 bg-muted/20 rounded">
							<FileText class="w-4 h-4 text-muted-foreground" />
						</div>

						<div class="flex-1 min-w-0">
							<div class="flex items-center gap-2">
								<h3 class="text-sm font-medium truncate">{form.title}</h3>
								{#if form.isRequired}
									<Badge variant="secondary" class="h-4 text-[9px] px-1">Required</Badge>
								{/if}
							</div>
							{#if form.description}
								<p class="text-xs text-muted-foreground truncate">{form.description}</p>
							{/if}
						</div>

						<div
							class="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity"
						>
							<Button
								variant="ghost"
								size="icon"
								class="h-8 w-8"
								onclick={() => moveForm(index, 'up')}
								disabled={index === 0}
							>
								<ChevronUp class="w-4 h-4" />
							</Button>
							<Button
								variant="ghost"
								size="icon"
								class="h-8 w-8"
								onclick={() => moveForm(index, 'down')}
								disabled={index === forms.length - 1}
							>
								<ChevronDown class="w-4 h-4" />
							</Button>
							<div class="w-px h-4 bg-border mx-1"></div>
							<Button
								variant="ghost"
								size="sm"
								class="h-8 text-xs"
								onclick={() => editFormBlocks(form.id)}
							>
								<ExternalLink class="w-3.5 h-3.5 mr-1.5" /> Builder
							</Button>
							<Button
								variant="ghost"
								size="icon"
								class="h-8 w-8"
								onclick={() => openFormDialog(form)}
							>
								<Edit class="w-4 h-4" />
							</Button>
							<Button
								variant="ghost"
								size="icon"
								class="h-8 w-8 text-destructive hover:bg-destructive/10"
								onclick={() => confirmDeleteForm(form.id)}
							>
								<Trash2 class="w-4 h-4" />
							</Button>
						</div>
					</div>
				{/each}
			</div>
		{/if}
	</div>
</div>

<!-- Dialogs remain the same, just styled by Shadcn which is consistent -->
<Dialog bind:open={showFormDialog}>
	<DialogContent>
		<DialogHeader>
			<DialogTitle>{editingForm ? 'Edit Form' : 'Create New Form'}</DialogTitle>
			<DialogDescription
				>{editingForm ? 'Update details below' : 'Create a new form'}</DialogDescription
			>
		</DialogHeader>
		<div class="space-y-4">
			<div class="space-y-2">
				<Label for="form-title">Title</Label>
				<Input id="form-title" bind:value={formTitle} placeholder="Enter title" />
			</div>
			<div class="space-y-2">
				<Label for="form-description">Description</Label>
				<Textarea
					id="form-description"
					bind:value={formDescription}
					placeholder="Enter description"
					rows={3}
				/>
			</div>
			<div class="flex items-center space-x-2">
				<Checkbox id="form-required" bind:checked={formIsRequired} />
				<Label for="form-required">Required step</Label>
			</div>
		</div>
		<DialogFooter>
			<Button variant="outline" onclick={closeFormDialog}>Cancel</Button>
			<Button onclick={saveForm} disabled={!formTitle}>{editingForm ? 'Update' : 'Create'}</Button>
		</DialogFooter>
	</DialogContent>
</Dialog>

<AlertDialog bind:open={showDeleteDialog}>
	<AlertDialogContent>
		<AlertDialogHeader>
			<AlertDialogTitle>Delete Form</AlertDialogTitle>
			<AlertDialogDescription>Are you sure? This cannot be undone.</AlertDialogDescription>
		</AlertDialogHeader>
		<AlertDialogFooter>
			<AlertDialogCancel onclick={() => (showDeleteDialog = false)}>Cancel</AlertDialogCancel>
			<AlertDialogAction onclick={deleteForm} class="bg-destructive hover:bg-destructive/90"
				>Delete</AlertDialogAction
			>
		</AlertDialogFooter>
	</AlertDialogContent>
</AlertDialog>
