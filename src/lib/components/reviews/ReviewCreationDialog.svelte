<script lang="ts">
	/**
	 * ReviewCreationDialog Component
	 * Feature: 023-reviews-creation-it
	 * Task: T029
	 *
	 * Dialog for creating performance reviews with goal association
	 * Includes draft auto-save functionality with 3-second debounce
	 */
	import { createEventDispatcher } from 'svelte';
	import * as Dialog from '$lib/components/ui/dialog';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Textarea } from '$lib/components/ui/textarea';
	import { Label } from '$lib/components/ui/label';
	import * as Card from '$lib/components/ui/card';
	import { Badge } from '$lib/components/ui/badge';
	import { Save, FileText, Calendar, Target, AlertCircle } from '@lucide/svelte';
	import ReviewTypeDropdown from './ReviewTypeDropdown.svelte';
	import GoalAssociationTabs from './GoalAssociationTabs.svelte';
	import {
		CreateReviewSchema,
		type CreateReviewInput,
		type ReviewType,
		type CreateGoalInput,
		type ReviewTypeMetadata
	} from '$lib/schemas/reviews';
	import { tick } from 'svelte';

	const dispatch = createEventDispatcher();

	// Props
	let {
		open = $bindable(false),
		employee,
		availableGoals = [],
		reviewTypesMetadata = [],
		existingDraft = null,
		loading = false
	}: {
		open?: boolean;
		employee: any; // User object with id, displayName, etc.
		availableGoals?: any[];
		reviewTypesMetadata?: ReviewTypeMetadata[];
		existingDraft?: any;
		loading?: boolean;
	} = $props();

	// Form state
	let formData = $state<CreateReviewInput>({
		employeeId: employee.id,
		reviewType: 'ANNUAL_REVIEW',
		reviewPeriodStart: '',
		reviewPeriodEnd: '',
		goalIds: [],
		newGoals: [],
		notes: ''
	});

	// Draft auto-save state
	let draftSaveTimer: ReturnType<typeof setTimeout> | null = null;
	let isDraftSaving = $state(false);
	let lastDraftSaveTime = $state<Date | null>(null);
	let draftId = $state<string | null>(null);

	// Load existing draft if provided
	$effect(() => {
		if (existingDraft) {
			populateFromDraft();
		}
	});

	function populateFromDraft() {
		if (!existingDraft) return;

		formData = {
			employeeId: existingDraft.employeeId,
			reviewType: existingDraft.reviewType,
			reviewPeriodStart: existingDraft.reviewPeriodStart || '',
			reviewPeriodEnd: existingDraft.reviewPeriodEnd || '',
			goalIds: existingDraft.goalIds || [],
			newGoals: existingDraft.newGoals || [],
			notes: existingDraft.notes || ''
		};
		draftId = existingDraft.id;
	}

	// Derived validation - automatically recomputes when formData changes
	const validation = $derived.by(() => {
		const result = CreateReviewSchema.safeParse(formData);
		if (!result.success) {
			const errors: Record<string, string> = {};
			result.error.errors.forEach((err) => {
				if (err.path[0]) {
					errors[err.path[0] as string] = err.message;
				}
			});
			return { isValid: false, errors };
		}
		return { isValid: true, errors: {} };
	});

	// Expose validation results as reactive state
	const formErrors = $derived(validation.errors);
	const isValid = $derived(validation.isValid);

	// Validate form function for manual validation
	function validateForm(): boolean {
		return isValid;
	}

	// Draft auto-save with 3-second debounce
	$effect(() => {
		// Trigger auto-save when form data changes
		const _ = JSON.stringify(formData);

		if (draftSaveTimer) {
			clearTimeout(draftSaveTimer);
		}

		draftSaveTimer = setTimeout(() => {
			if (open && !loading) {
				saveDraft();
			}
		}, 3000);

		return () => {
			if (draftSaveTimer) {
				clearTimeout(draftSaveTimer);
			}
		};
	});

	// Save draft
	async function saveDraft() {
		isDraftSaving = true;
		try {
			const draftData = {
				...formData,
				status: 'DRAFT'
			};

			dispatch('saveDraft', { data: draftData, draftId });
			lastDraftSaveTime = new Date();

			// Simulate save delay
			await tick();
		} catch (error) {
			console.error('Failed to save draft:', error);
		} finally {
			isDraftSaving = false;
		}
	}

	// Handle save as draft button
	function handleSaveAsDraft() {
		if (!validateForm()) return;
		dispatch('saveAsDraft', { data: formData, draftId });
	}

	// Handle create review button
	function handleCreateReview() {
		if (!validateForm()) return;
		dispatch('createReview', { data: formData, draftId });
	}

	// Handle cancel
	function handleCancel() {
		if (draftSaveTimer) {
			clearTimeout(draftSaveTimer);
		}
		open = false;
		dispatch('cancel');
	}

	// Format last save time
	const lastSaveText = $derived(() => {
		if (!lastDraftSaveTime) return '';
		const now = new Date();
		const diff = Math.floor((now.getTime() - lastDraftSaveTime.getTime()) / 1000);

		if (diff < 60) return `Last saved ${diff}s ago`;
		if (diff < 3600) return `Last saved ${Math.floor(diff / 60)}m ago`;
		return `Last saved at ${lastDraftSaveTime.toLocaleTimeString()}`;
	});
</script>

<Dialog.Root bind:open>
	<Dialog.Content class="max-w-3xl max-h-[90vh] overflow-y-auto">
		<Dialog.Header>
			<Dialog.Title>Create Performance Review</Dialog.Title>
			<Dialog.Description>
				Create a new performance review for {employee.displayName || employee.firstName + ' ' + employee.lastName}
			</Dialog.Description>
		</Dialog.Header>

		<div class="space-y-6 py-4">
			<!-- Employee Info Card -->
			<Card.Root>
				<Card.Content class="pt-6">
					<div class="flex items-center gap-3">
						<div
							class="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-lg font-semibold"
						>
							{employee.displayName?.[0] || employee.firstName?.[0] || 'E'}
						</div>
						<div>
							<h3 class="font-medium">
								{employee.displayName || `${employee.firstName} ${employee.lastName}`}
							</h3>
							<p class="text-sm text-muted-foreground">
								{employee.jobTitle || 'Employee'} • {employee.departmentName || 'Department'}
							</p>
						</div>
					</div>
				</Card.Content>
			</Card.Root>

			<!-- Review Type -->
			<div>
				<ReviewTypeDropdown
					bind:value={formData.reviewType}
					metadata={reviewTypesMetadata}
					disabled={loading}
					error={formErrors.reviewType}
					required
				/>
			</div>

			<!-- Review Period -->
			<div class="grid grid-cols-1 md:grid-cols-2 gap-4">
				<div>
					<Label for="period-start">
						<Calendar class="w-4 h-4 inline mr-1" />
						Review Period Start
					</Label>
					<Input
						id="period-start"
						type="date"
						bind:value={formData.reviewPeriodStart}
						disabled={loading}
						class={formErrors.reviewPeriodStart ? 'border-destructive' : ''}
					/>
					{#if formErrors.reviewPeriodStart}
						<p class="text-sm text-destructive mt-1">{formErrors.reviewPeriodStart}</p>
					{/if}
				</div>

				<div>
					<Label for="period-end">
						<Calendar class="w-4 h-4 inline mr-1" />
						Review Period End
					</Label>
					<Input
						id="period-end"
						type="date"
						bind:value={formData.reviewPeriodEnd}
						disabled={loading}
						class={formErrors.reviewPeriodEnd ? 'border-destructive' : ''}
					/>
					{#if formErrors.reviewPeriodEnd}
						<p class="text-sm text-destructive mt-1">{formErrors.reviewPeriodEnd}</p>
					{/if}
				</div>
			</div>

			<!-- Notes -->
			<div>
				<Label for="notes">
					<FileText class="w-4 h-4 inline mr-1" />
					Notes (Optional)
				</Label>
				<Textarea
					id="notes"
					bind:value={formData.notes}
					placeholder="Add any additional notes or context for this review..."
					rows={3}
					disabled={loading}
				/>
			</div>

			<!-- Goal Association -->
			<div>
				<h3 class="text-sm font-medium mb-3 flex items-center gap-2">
					<Target class="w-4 h-4" />
					Associate Goals with Review
				</h3>
				<GoalAssociationTabs
					bind:linkedGoalIds={formData.goalIds}
					bind:newGoals={formData.newGoals}
					{availableGoals}
					employeeId={employee.id}
					disabled={loading}
				/>
			</div>

			<!-- Validation Error Summary -->
			{#if !isValid && Object.keys(formErrors).length > 0}
				<Card.Root class="border-destructive">
					<Card.Content class="pt-6">
						<div class="flex items-start gap-3">
							<AlertCircle class="w-5 h-5 text-destructive mt-0.5" />
							<div>
								<h4 class="font-medium text-sm text-destructive mb-2">Please fix the following errors:</h4>
								<ul class="list-disc list-inside space-y-1 text-sm text-muted-foreground">
									{#each Object.entries(formErrors) as [field, error]}
										<li>{error}</li>
									{/each}
								</ul>
							</div>
						</div>
					</Card.Content>
				</Card.Root>
			{/if}
		</div>

		<Dialog.Footer class="flex items-center justify-between">
			<div class="flex-1">
				{#if isDraftSaving}
					<div class="flex items-center gap-2 text-sm text-muted-foreground">
						<div class="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
						<span>Saving draft...</span>
					</div>
				{:else if lastDraftSaveTime}
					<div class="text-sm text-muted-foreground flex items-center gap-2">
						<Save class="w-4 h-4" />
						<span>{lastSaveText()}</span>
					</div>
				{/if}
			</div>

			<div class="flex items-center gap-2">
				<Button variant="outline" onclick={handleCancel} disabled={loading}>
					Cancel
				</Button>
				<Button variant="secondary" onclick={handleSaveAsDraft} disabled={loading || !isValid}>
					<Save class="w-4 h-4 mr-2" />
					Save as Draft
				</Button>
				<Button onclick={handleCreateReview} disabled={loading || !isValid}>
					{loading ? 'Creating...' : 'Create Review'}
				</Button>
			</div>
		</Dialog.Footer>
	</Dialog.Content>
</Dialog.Root>

<style>
	/* Additional styling if needed */
</style>
