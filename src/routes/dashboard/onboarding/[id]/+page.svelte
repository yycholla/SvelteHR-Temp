<script lang="ts">
	import { goto, invalidateAll } from '$app/navigation';
	import {
		AlertCircle,
		CheckCircle2,
		ChevronLeft,
		ChevronRight,
		Circle,
		Save
	} from '@lucide/svelte';
	import { Button } from '$lib/components/ui/button';
	import { Badge } from '$lib/components/ui/badge';
	import { Progress } from '$lib/components/ui/progress';
	import * as Card from '$lib/components/ui/card';
	import { toast } from 'svelte-sonner';
	import { superForm } from 'sveltekit-superforms';
	import { zodClient } from 'sveltekit-superforms/adapters';
	import { setContext } from 'svelte';
	import { generateMultiBlockSchema, type FormTemplate } from '$lib/forms';
	import { z } from 'zod';
	import FormBlockRenderer from '$lib/components/onboarding/renderer/FormBlockRenderer.svelte';

	const { data } = $props();

	// State
	let currentFormIndex = $state(0);
	let checkboxStates = $state<Record<string, boolean>>({});
	let signatureData = $state<Record<string, string | null>>({});
	let isSaving = $state(false);

	// Derived values
	const currentForm = $derived(data.forms[currentFormIndex]);
	const isLastForm = $derived(currentFormIndex === data.forms.length - 1);
	const isFirstForm = $derived(currentFormIndex === 0);
	const completionPercentage = $derived(
		data.totalForms > 0 ? Math.round((data.completedForms / data.totalForms) * 100) : 0
	);

	// Generate Zod schema for current form
	const formSchema = $derived.by(() => {
		if (!currentForm?.blocks) {
			return z.object({});
		}
		return generateMultiBlockSchema(
			currentForm.blocks,
			data.formTemplates as Map<string, FormTemplate>
		);
	});

	// Initialize superform with dynamic schema
	const superform = $derived.by(() => {
		const initialData = currentForm?.progress?.formData || {};
		return superForm(initialData, {
			validators: zodClient(formSchema as any),
			dataType: 'json',
			resetForm: false,
			invalidateAll: false
		});
	});

	const { form: formData, allErrors } = $derived(superform);

	// Set form context for Formsnap components
	$effect(() => {
		setContext('form', superform);
	});

	// Load saved progress when form changes
	$effect(() => {
		if (currentForm?.progress?.formData) {
			Object.assign($formData, currentForm.progress.formData);
		}
	});

	function nextForm() {
		if (!isLastForm) {
			currentFormIndex++;
			window.scrollTo(0, 0);
		}
	}

	function prevForm() {
		if (!isFirstForm) {
			currentFormIndex--;
			window.scrollTo(0, 0);
		}
	}

	function jumpToForm(index: number) {
		currentFormIndex = index;
		window.scrollTo(0, 0);
	}

	async function saveProgress() {
		if (!currentForm) return;

		isSaving = true;
		const formDataToSave = new FormData();
		formDataToSave.append('onboardingFormId', currentForm.id);
		formDataToSave.append('status', 'IN_PROGRESS');
		formDataToSave.append('formData', JSON.stringify($formData));

		const response = await fetch('', {
			method: 'POST',
			body: formDataToSave,
			headers: {
				'x-sveltekit-action': 'saveProgress'
			}
		});

		if (response.ok) {
			toast.success('Progress saved');
			await invalidateAll();
		} else {
			toast.error('Failed to save progress');
		}
		isSaving = false;
	}

	async function completeForm() {
		if (!currentForm) return;

		// Check for validation errors
		if ($allErrors.length > 0) {
			toast.error('Please fix validation errors before submitting');
			return;
		}

		isSaving = true;
		const formDataToSubmit = new FormData();
		formDataToSubmit.append('onboardingFormId', currentForm.id);
		formDataToSubmit.append('formData', JSON.stringify($formData));

		const response = await fetch('', {
			method: 'POST',
			body: formDataToSubmit,
			headers: {
				'x-sveltekit-action': 'completeForm'
			}
		});

		if (response.ok) {
			toast.success('Form completed successfully!');
			await invalidateAll();

			if (!isLastForm) {
				nextForm();
			} else {
				// All forms completed - redirect to dashboard
				toast.success('Onboarding completed! 🎉');
				setTimeout(() => {
					goto('/dashboard');
				}, 2000);
			}
		} else {
			toast.error('Failed to complete form');
		}
		isSaving = false;
	}
</script>

<div class="container mx-auto py-8 max-w-7xl px-4">
	<!-- Header -->
	<div class="mb-8">
		<Button variant="ghost" size="sm" href="/dashboard/onboarding" class="mb-4">
			<ChevronLeft class="mr-2 h-4 w-4" /> Back to My Onboarding
		</Button>

		<div class="flex items-center justify-between">
			<div>
				<h1 class="text-3xl font-bold">{data.module.title}</h1>
				{#if data.module.description}
					<p class="text-muted-foreground mt-2">{data.module.description}</p>
				{/if}
			</div>
			<Badge
				variant={completionPercentage === 100 ? 'default' : 'secondary'}
				class="text-lg px-4 py-2"
			>
				{completionPercentage}% Complete
			</Badge>
		</div>

		<!-- Progress Bar -->
		<div class="mt-6">
			<Progress
				value={completionPercentage}
				class="h-2"
				aria-valuenow={completionPercentage}
				data-testid="progress-bar"
			/>
			<p class="text-sm text-muted-foreground mt-2">
				<span data-testid="completed-forms-count">{data.completedForms}</span> of
				<span data-testid="total-forms-count">{data.totalForms}</span> forms completed
			</p>
		</div>
	</div>

	<div class="grid grid-cols-1 lg:grid-cols-4 gap-6">
		<!-- Left Sidebar: Form Navigation -->
		<div class="lg:col-span-1">
			<Card.Root>
				<Card.Header>
					<Card.Title class="text-lg">Forms</Card.Title>
				</Card.Header>
				<Card.Content class="space-y-2" data-testid="forms-navigation">
					{#each data.forms as form, index}
						<button
							data-testid="nav-form-{index}"
							onclick={() => jumpToForm(index)}
							class="w-full text-left p-3 rounded-lg transition-all {index === currentFormIndex
								? 'bg-primary text-primary-foreground'
								: 'hover:bg-accent'}"
						>
							<div class="flex items-center gap-2">
								{#if form.isCompleted}
									<CheckCircle2
										class="h-5 w-5 text-green-500 shrink-0"
										data-testid="status-completed"
									/>
								{:else if form.isInProgress}
									<Circle
										class="h-5 w-5 text-yellow-500 shrink-0"
										data-testid="status-in-progress"
									/>
								{:else}
									<Circle class="h-5 w-5 text-gray-400 shrink-0" data-testid="status-not-started" />
								{/if}
								<div class="flex-1 min-w-0">
									<div class="font-medium text-sm truncate" data-testid="form-step-number">
										Step {index + 1}
									</div>
									<div class="text-xs opacity-80 truncate" data-testid="form-title">
										{form.title}
									</div>
								</div>
								<div data-testid="form-status-icon"></div>
							</div>
						</button>
					{/each}
				</Card.Content>
			</Card.Root>
		</div>

		<!-- Main Content: Current Form -->
		<div class="lg:col-span-3">
			{#if currentForm}
				<Card.Root data-testid="form-content">
					<Card.Header>
						<div class="flex items-start justify-between">
							<div class="flex-1">
								<Badge variant="outline" class="mb-2" data-testid="current-form-step-badge"
									>Step {currentFormIndex + 1} of {data.totalForms}</Badge
								>
								<Card.Title class="text-2xl" data-testid="current-form-title"
									>{currentForm.title}</Card.Title
								>
								{#if currentForm.description}
									<Card.Description class="mt-2" data-testid="current-form-description"
										>{currentForm.description}</Card.Description
									>
								{/if}
							</div>
							{#if currentForm.isRequired}
								<Badge variant="secondary" data-testid="required-field">Required</Badge>
							{/if}
						</div>
					</Card.Header>
					<Card.Content class="space-y-8">
						<!-- Render all blocks in the form using the new renderer -->
						{#each currentForm.blocks as block}
							<!-- prettier-ignore -->
							<FormBlockRenderer
								{block}
								bind:checkboxStates
								bind:signatureData
							formTemplates={data.formTemplates as Map<string, FormTemplate>}
							/>
						{/each}

						<!-- Form Actions -->
						<div class="flex items-center justify-between pt-6 border-t">
							<Button
								variant="outline"
								onclick={prevForm}
								disabled={isFirstForm}
								data-testid="previous-form-button"
							>
								<ChevronLeft class="mr-2 h-4 w-4" />
								Previous
							</Button>

							<div class="flex gap-2">
								<Button
									variant="outline"
									onclick={saveProgress}
									disabled={isSaving}
									data-testid="save-progress-button"
								>
									<Save class="mr-2 h-4 w-4" />
									{isSaving ? 'Saving...' : 'Save Progress'}
								</Button>

								{#if !isLastForm}
									<Button
										onclick={completeForm}
										disabled={isSaving}
										data-testid="complete-form-button"
									>
										Complete & Continue
										<ChevronRight class="ml-2 h-4 w-4" />
									</Button>
								{:else}
									<Button
										onclick={completeForm}
										disabled={isSaving}
										data-testid="complete-onboarding-button"
									>
										<CheckCircle2 class="mr-2 h-4 w-4" />
										Complete Onboarding
									</Button>
								{/if}
							</div>
						</div>
					</Card.Content>
				</Card.Root>
			{:else}
				<Card.Root>
					<Card.Content class="p-12 text-center">
						<AlertCircle class="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
						<h3 class="text-xl font-semibold mb-2">No Forms Available</h3>
						<p class="text-muted-foreground">This onboarding module doesn't have any forms yet.</p>
					</Card.Content>
				</Card.Root>
			{/if}
		</div>
	</div>
</div>
