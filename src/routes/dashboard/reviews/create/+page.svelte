<script lang="ts">
	/**
	 * Performance Review Creation Page
	 * Feature: 023-reviews-creation-it
	 *
	 * Full-page form for creating performance reviews
	 */
	import { goto } from '$app/navigation';
	import { enhance } from '$app/forms';
	import type { PageData, ActionData } from './$types';
	import * as Card from '$lib/components/ui/card';
	import * as DropdownMenu from '$lib/components/ui/dropdown-menu';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import { Textarea } from '$lib/components/ui/textarea';
	import * as Select from '$lib/components/ui/select';
	import { Badge } from '$lib/components/ui/badge';
	import {
		ArrowLeft,
		Send,
		User,
		Calendar,
		FileText,
		Search,
		ChevronDown,
		Check,
		Target
	} from '@lucide/svelte';
	import GoalAssociationTabs from '$lib/components/reviews/GoalAssociationTabs.svelte';
	import type { CreateGoalInput } from '$lib/schemas/reviews';

	let { data, form }: { data: PageData; form: ActionData } = $props();

	// Form state
	let selectedEmployeeId = $state(data.selectedEmployee?.id || '');
	let reviewType = $state('ANNUAL_REVIEW');
	let reviewPeriodPreset = $state('1_year');
	let reviewPeriodStart = $state('');
	let reviewPeriodEnd = $state('');
	let notes = $state('');
	let goalIds = $state<string[]>([]);
	let newGoals = $state<CreateGoalInput[]>([]);

	// UI state
	let isSubmitting = $state(false);
	let employeeSearchQuery = $state('');
	let dropdownOpen = $state(false);
	let triggerElement: HTMLElement | null = $state(null);
	let contentElement: HTMLElement | null = $state(null);

	// Review type select state
	let reviewTypeOpen = $state(false);
	let reviewTypeTriggerElement: HTMLElement | null = $state(null);
	let reviewTypeContentElement: HTMLElement | null = $state(null);

	// Period preset select state
	let periodPresetOpen = $state(false);
	let periodPresetTriggerElement: HTMLElement | null = $state(null);
	let periodPresetContentElement: HTMLElement | null = $state(null);

	// Period preset options
	const periodPresets = [
		{ value: '1_month', label: '1 Month', months: 1 },
		{ value: '2_months', label: '2 Months', months: 2 },
		{ value: '3_months', label: '3 Months', months: 3 },
		{ value: '6_months', label: '6 Months', months: 6 },
		{ value: '1_year', label: '1 Year', months: 12 },
		{ value: 'custom', label: 'Custom Date Range', months: null }
	];

	// Update employee dropdown width when it opens
	$effect(() => {
		if (dropdownOpen && triggerElement && contentElement) {
			const width = triggerElement.offsetWidth;
			contentElement.style.width = `${width}px`;
			contentElement.style.minWidth = `${width}px`;
			contentElement.style.maxWidth = `${width}px`;
		}
	});

	// Update review type dropdown width when it opens
	$effect(() => {
		if (reviewTypeOpen && reviewTypeTriggerElement && reviewTypeContentElement) {
			const width = reviewTypeTriggerElement.offsetWidth;
			reviewTypeContentElement.style.width = `${width}px`;
			reviewTypeContentElement.style.minWidth = `${width}px`;
			reviewTypeContentElement.style.maxWidth = `${width}px`;
		}
	});

	// Update period preset dropdown width when it opens
	$effect(() => {
		if (periodPresetOpen && periodPresetTriggerElement && periodPresetContentElement) {
			const width = periodPresetTriggerElement.offsetWidth;
			periodPresetContentElement.style.width = `${width}px`;
			periodPresetContentElement.style.minWidth = `${width}px`;
			periodPresetContentElement.style.maxWidth = `${width}px`;
		}
	});

	// Auto-calculate end date based on preset
	$effect(() => {
		if (reviewPeriodPreset !== 'custom' && reviewPeriodStart) {
			const preset = periodPresets.find((p) => p.value === reviewPeriodPreset);
			if (preset && preset.months) {
				const start = new Date(reviewPeriodStart);
				const end = new Date(start);
				end.setMonth(end.getMonth() + preset.months);
				reviewPeriodEnd = end.toISOString().split('T')[0];
			}
		}
	});

	// Reactive available goals based on selected employee
	const availableGoals = $derived(selectedEmployeeId ? data.availableGoals || [] : []);

	// Selected period preset label
	const selectedPeriodPreset = $derived(periodPresets.find((p) => p.value === reviewPeriodPreset));

	// Computed
	const selectedEmployee = $derived(
		data.employees.find((emp: any) => emp.id === selectedEmployeeId)
	);

	const selectedReviewType = $derived(
		data.reviewTypesMetadata.find((t: any) => t.value === reviewType)
	);

	const canSubmit = $derived(selectedEmployeeId && reviewType);

	// Filtered employees for search
	const filteredEmployees = $derived.by(() => {
		if (!employeeSearchQuery) return data.employees || [];

		const query = employeeSearchQuery.toLowerCase();
		return (data.employees || []).filter(
			(emp: any) =>
				emp.displayName?.toLowerCase().includes(query) ||
				emp.email?.toLowerCase().includes(query) ||
				emp.firstName?.toLowerCase().includes(query) ||
				emp.lastName?.toLowerCase().includes(query)
		);
	});

	function handleEmployeeSelected(employee: any) {
		selectedEmployeeId = employee.id;
		dropdownOpen = false;
		employeeSearchQuery = '';
	}

	function handleCancel() {
		goto('/dashboard/reviews');
	}
</script>

<form
	method="POST"
	action="?/createReview"
	use:enhance={() => {
		isSubmitting = true;
		return async ({ result, update }) => {
			isSubmitting = false;
			await update();
		};
	}}
>
	<div class="review-create-page">
		<!-- Header -->
		<div class="page-header">
			<Button variant="ghost" size="sm" onclick={handleCancel} type="button">
				<ArrowLeft class="w-4 h-4 mr-2" />
				Back to Reviews
			</Button>

			<div class="flex-1">
				<h1 class="text-3xl font-bold tracking-tight">Create Performance Review</h1>
				<p class="text-muted-foreground mt-1">
					Fill out the review details for the selected employee
				</p>
			</div>

			<div class="flex items-center gap-2">
				<Button type="submit" disabled={!canSubmit || isSubmitting}>
					<Send class="w-4 h-4 mr-2" />
					{isSubmitting ? 'Creating...' : 'Create Review'}
				</Button>
			</div>
		</div>

		<!-- Error Display -->
		{#if data.error}
			<Card.Root class="border-destructive">
				<Card.Content class="pt-6">
					<p class="text-destructive">{data.error}</p>
				</Card.Content>
			</Card.Root>
		{/if}

		<!-- Form Error Display -->
		{#if form?.error}
			<Card.Root class="border-destructive">
				<Card.Content class="pt-6">
					<p class="text-destructive">{form.error}</p>
				</Card.Content>
			</Card.Root>
		{/if}

		<!-- Form Content -->
		<div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
			<!-- Main Form -->
			<div class="lg:col-span-2 space-y-6">
				<!-- Employee Selection -->
				<Card.Root>
					<Card.Header>
						<Card.Title class="flex items-center gap-2">
							<User class="w-5 h-5" />
							Employee Information
						</Card.Title>
					</Card.Header>
					<Card.Content class="space-y-4">
						<div class="space-y-2">
							<Label for="employee">Select Employee *</Label>
							<input type="hidden" name="employeeId" value={selectedEmployeeId} />
							<DropdownMenu.Root bind:open={dropdownOpen}>
								<DropdownMenu.Trigger
									bind:ref={triggerElement}
									class="inline-flex items-center justify-between w-full h-10 px-4 py-2 text-sm font-medium transition-colors border rounded-md border-input bg-background hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
								>
									<span class="flex items-center gap-2">
										<User class="w-4 h-4" />
										{selectedEmployee?.displayName ?? 'Select employee...'}
									</span>
									<ChevronDown class="w-4 h-4 opacity-50" />
								</DropdownMenu.Trigger>
								<DropdownMenu.Content
									bind:ref={contentElement}
									class="!min-w-0 max-h-[400px] overflow-hidden p-0"
								>
									<div class="flex flex-col w-full">
										<!-- Search Input -->
										<div class="p-2 border-b">
											<div class="relative">
												<Search
													class="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground"
												/>
												<Input
													type="text"
													placeholder="Search employees..."
													bind:value={employeeSearchQuery}
													class="pl-9 h-9"
													onclick={(e) => e.stopPropagation()}
												/>
											</div>
										</div>

										<!-- Employee List -->
										<div class="max-h-[300px] overflow-y-auto">
											{#if filteredEmployees.length === 0}
												<div class="p-4 text-center text-sm text-muted-foreground">
													No employees found
												</div>
											{:else}
												{#each filteredEmployees as employee (employee.id)}
													<DropdownMenu.Item
														class="flex items-center justify-between p-3 cursor-pointer"
														onclick={() => handleEmployeeSelected(employee)}
													>
														<div class="flex-1 min-w-0">
															<div class="font-medium text-sm truncate">{employee.displayName}</div>
															<div class="text-xs text-muted-foreground truncate">
																{employee.email}
															</div>
															{#if employee.departmentByDepartmentId}
																<div class="text-xs text-muted-foreground truncate mt-0.5">
																	{employee.departmentByDepartmentId.name}
																</div>
															{/if}
														</div>
														{#if selectedEmployeeId === employee.id}
															<Check class="w-4 h-4 ml-2 flex-shrink-0" />
														{/if}
													</DropdownMenu.Item>
												{/each}
											{/if}
										</div>
									</div>
								</DropdownMenu.Content>
							</DropdownMenu.Root>
						</div>

						{#if selectedEmployee}
							<div class="bg-muted p-4 rounded-md">
								<div class="grid grid-cols-2 gap-4 text-sm">
									<div>
										<span class="text-muted-foreground">Email:</span>
										<span class="ml-2 font-medium">{selectedEmployee.email}</span>
									</div>
									<div>
										<span class="text-muted-foreground">Role:</span>
										<span class="ml-2 font-medium">{selectedEmployee.role}</span>
									</div>
									{#if selectedEmployee.departmentByDepartmentId}
										<div class="col-span-2">
											<span class="text-muted-foreground">Department:</span>
											<span class="ml-2 font-medium"
												>{selectedEmployee.departmentByDepartmentId.name}</span
											>
										</div>
									{/if}
								</div>
							</div>
						{/if}
					</Card.Content>
				</Card.Root>

				<!-- Review Details -->
				<Card.Root>
					<Card.Header>
						<Card.Title class="flex items-center gap-2">
							<Calendar class="w-5 h-5" />
							Review Period & Type
						</Card.Title>
					</Card.Header>
					<Card.Content class="space-y-4">
						<div class="space-y-2">
							<Label for="reviewType">Review Type *</Label>
							<input type="hidden" name="reviewType" value={reviewType} />
							<Select.Root type="single" bind:open={reviewTypeOpen} bind:value={reviewType}>
								<Select.Trigger bind:ref={reviewTypeTriggerElement} id="reviewType" class="w-full">
									{selectedReviewType?.label ?? 'Select review type...'}
								</Select.Trigger>
								<Select.Content bind:ref={reviewTypeContentElement} class="!min-w-0">
									{#each data.reviewTypesMetadata as type (type.value)}
										<Select.Item value={type.value} label={type.label}>
											<div class="flex flex-col">
												<span>{type.label}</span>
												{#if type.description}
													<span class="text-xs text-muted-foreground">{type.description}</span>
												{/if}
											</div>
										</Select.Item>
									{/each}
								</Select.Content>
							</Select.Root>
						</div>

						<div class="space-y-2">
							<Label for="periodPreset">Review Period Duration</Label>
							<Select.Root
								type="single"
								bind:open={periodPresetOpen}
								bind:value={reviewPeriodPreset}
							>
								<Select.Trigger
									bind:ref={periodPresetTriggerElement}
									id="periodPreset"
									class="w-full"
								>
									{selectedPeriodPreset?.label ?? 'Select period...'}
								</Select.Trigger>
								<Select.Content bind:ref={periodPresetContentElement} class="!min-w-0">
									{#each periodPresets as preset (preset.value)}
										<Select.Item value={preset.value} label={preset.label}>
											{preset.label}
										</Select.Item>
									{/each}
								</Select.Content>
							</Select.Root>
						</div>

						<div class="grid grid-cols-2 gap-4">
							<div class="space-y-2">
								<Label for="periodStart">Start Date</Label>
								<Input
									id="periodStart"
									name="reviewPeriodStart"
									type="date"
									bind:value={reviewPeriodStart}
								/>
							</div>
							<div class="space-y-2">
								<Label for="periodEnd">End Date</Label>
								<Input
									id="periodEnd"
									name="reviewPeriodEnd"
									type="date"
									bind:value={reviewPeriodEnd}
									disabled={reviewPeriodPreset !== 'custom'}
									class={reviewPeriodPreset !== 'custom' ? 'bg-muted' : ''}
								/>
								{#if reviewPeriodPreset !== 'custom'}
									<p class="text-xs text-muted-foreground">
										Auto-calculated based on selected period
									</p>
								{/if}
							</div>
						</div>
					</Card.Content>
				</Card.Root>

				<!-- Review Notes -->
				<Card.Root>
					<Card.Header>
						<Card.Title class="flex items-center gap-2">
							<FileText class="w-5 h-5" />
							Review Notes
						</Card.Title>
					</Card.Header>
					<Card.Content class="space-y-4">
						<div class="space-y-2">
							<Label for="notes">Notes (Optional)</Label>
							<Textarea
								id="notes"
								name="notes"
								placeholder="Add any additional notes or context for this review..."
								bind:value={notes}
								rows={6}
							/>
							<p class="text-xs text-muted-foreground">
								Additional feedback can be added after creating the review.
							</p>
						</div>
					</Card.Content>
				</Card.Root>

				<!-- Goals Association -->
				{#if selectedEmployeeId}
					<Card.Root>
						<Card.Header>
							<Card.Title class="flex items-center gap-2">
								<Target class="w-5 h-5" />
								Performance Goals
							</Card.Title>
							<Card.Description>
								Create new goals or link existing goals to this review
							</Card.Description>
						</Card.Header>
						<Card.Content>
							<GoalAssociationTabs
								bind:linkedGoalIds={goalIds}
								bind:newGoals
								{availableGoals}
								employeeId={selectedEmployeeId}
								disabled={isSubmitting}
							/>

							<!-- Hidden form inputs for goals -->
							{#each goalIds as goalId}
								<input type="hidden" name="goalIds" value={goalId} />
							{/each}
							{#each newGoals as goal, index}
								<input type="hidden" name="newGoals[{index}].title" value={goal.title} />
								<input
									type="hidden"
									name="newGoals[{index}].description"
									value={goal.description}
								/>
								<input
									type="hidden"
									name="newGoals[{index}].targetCompletionDate"
									value={goal.targetCompletionDate}
								/>
								<input
									type="hidden"
									name="newGoals[{index}].successMetrics"
									value={goal.successMetrics}
								/>
							{/each}
						</Card.Content>
					</Card.Root>
				{/if}
			</div>

			<!-- Sidebar -->
			<div class="space-y-6">
				<!-- Quick Info -->
				<Card.Root>
					<Card.Header>
						<Card.Title>Review Information</Card.Title>
					</Card.Header>
					<Card.Content class="space-y-3 text-sm">
						<div>
							<span class="text-muted-foreground">Status:</span>
							<span class="ml-2 font-medium">Draft</span>
						</div>
						<div>
							<span class="text-muted-foreground">Reviewer:</span>
							<span class="ml-2 font-medium">{data.user.displayName}</span>
						</div>
						<div>
							<span class="text-muted-foreground">Created:</span>
							<span class="ml-2 font-medium">{new Date().toLocaleDateString()}</span>
						</div>
					</Card.Content>
				</Card.Root>

				<!-- Help Card -->
				<Card.Root>
					<Card.Header>
						<Card.Title>Tips for Effective Reviews</Card.Title>
					</Card.Header>
					<Card.Content class="space-y-3 text-sm">
						<ul class="list-disc list-inside space-y-2 text-muted-foreground">
							<li>Be specific and provide concrete examples</li>
							<li>Focus on both strengths and growth areas</li>
							<li>Set clear, measurable goals</li>
							<li>Keep feedback constructive and actionable</li>
							<li>Save drafts regularly as you work</li>
						</ul>
					</Card.Content>
				</Card.Root>
			</div>
		</div>
	</div>
</form>

<style>
	.review-create-page {
		padding: 2rem;
		max-width: 1400px;
		margin: 0 auto;
	}

	.page-header {
		display: flex;
		align-items: flex-start;
		gap: 1rem;
		margin-bottom: 2rem;
	}

	@media (max-width: 768px) {
		.review-create-page {
			padding: 1rem;
		}

		.page-header {
			flex-direction: column;
			align-items: stretch;
		}
	}
</style>
