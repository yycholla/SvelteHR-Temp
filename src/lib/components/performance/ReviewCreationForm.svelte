<script lang="ts">
	import { createEventDispatcher } from 'svelte';
	import * as Card from '$lib/components/ui/card';
	import * as Dialog from '$lib/components/ui/dialog';
	import * as Select from '$lib/components/ui/select';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import { Textarea } from '$lib/components/ui/textarea';
	import { Badge } from '$lib/components/ui/badge';
	import { FileText, CalendarDays, User, Star, Save, X } from 'lucide-svelte';
	import { formSectionVariants } from '$lib/components/ui/hr-components';

	// Props
	interface Props {
		open: boolean;
		employeeId: string;
		employeeName?: string;
		reviewerId?: string;
		reviewerName?: string;
		availableCycles?: Array<{
			id: string;
			name: string;
			description?: string;
			startDate: string;
			endDate: string;
			isActive: boolean;
		}>;
		onClose?: () => void;
		onCreate?: (review: ReviewFormData) => void;
	}

	let {
		open = $bindable(),
		employeeId,
		employeeName = 'Employee',
		reviewerId,
		reviewerName = 'Reviewer',
		availableCycles = [],
		onClose,
		onCreate
	}: Props = $props();

	// Form data interface
	interface ReviewFormData {
		employeeId: string;
		reviewerId?: string;
		cycleId: string;
		reviewPeriodStart: string;
		reviewPeriodEnd: string;
		overallRating?: string;
		status: string;
		selfAssessment?: string;
		managerComments?: string;
		developmentGoals?: string;
		goalsRating?: string;
		competenciesRating?: string;
	}

	// Form state
	let formData = $state<ReviewFormData>({
		employeeId,
		reviewerId,
		cycleId: '',
		reviewPeriodStart: '',
		reviewPeriodEnd: '',
		overallRating: '',
		status: 'NOT_STARTED',
		selfAssessment: '',
		managerComments: '',
		developmentGoals: '',
		goalsRating: '',
		competenciesRating: ''
	});

	let loading = $state(false);
	let errors = $state<Record<string, string>>({});

	// Status options
	const statusOptions = [
		{ value: 'NOT_STARTED', label: 'Not Started' },
		{ value: 'IN_PROGRESS', label: 'In Progress' },
		{ value: 'PENDING_REVIEW', label: 'Pending Review' },
		{ value: 'COMPLETED', label: 'Completed' },
		{ value: 'CANCELLED', label: 'Cancelled' }
	];

	// Rating options
	const ratingOptions = [
		{ value: 'EXCEEDS_EXPECTATIONS', label: 'Exceeds Expectations' },
		{ value: 'MEETS_EXPECTATIONS', label: 'Meets Expectations' },
		{ value: 'APPROACHING_EXPECTATIONS', label: 'Approaching Expectations' },
		{ value: 'BELOW_EXPECTATIONS', label: 'Below Expectations' }
	];

	// Get active cycles for selection
	const activeCycles = $derived(availableCycles.filter((cycle) => cycle.isActive));

	// Auto-set review period based on selected cycle
	function updateReviewPeriod(cycleId: string) {
		const selectedCycle = availableCycles.find((cycle) => cycle.id === cycleId);
		if (selectedCycle) {
			formData.reviewPeriodStart = selectedCycle.startDate;
			formData.reviewPeriodEnd = selectedCycle.endDate;
		}
	}

	// Validation
	function validateForm(): boolean {
		errors = {};
		let isValid = true;

		if (!formData.cycleId) {
			errors.cycleId = 'Performance cycle is required';
			isValid = false;
		}

		if (!formData.reviewPeriodStart) {
			errors.reviewPeriodStart = 'Review period start date is required';
			isValid = false;
		}

		if (!formData.reviewPeriodEnd) {
			errors.reviewPeriodEnd = 'Review period end date is required';
			isValid = false;
		}

		if (formData.reviewPeriodStart && formData.reviewPeriodEnd) {
			const startDate = new Date(formData.reviewPeriodStart);
			const endDate = new Date(formData.reviewPeriodEnd);

			if (endDate <= startDate) {
				errors.reviewPeriodEnd = 'End date must be after start date';
				isValid = false;
			}
		}

		return isValid;
	}

	// Create review via GraphQL
	async function createReview() {
		if (!validateForm()) return;

		loading = true;
		try {
			const token = localStorage.getItem('postgraphile-jwt-token');

			const response = await fetch('http://localhost:4000/graphql', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					...(token ? { Authorization: `Bearer ${token}` } : {})
				},
				body: JSON.stringify({
					query: `
						mutation CreatePerformanceReview($input: CreatePerformanceReviewInput!) {
							createPerformanceReview(input: $input) {
								performanceReview {
									id
									reviewPeriodStart
									reviewPeriodEnd
									overallRating
									status
									selfAssessment
									managerComments
									developmentGoals
									goalsRating
									competenciesRating
									createdAt
									employeeByEmployeeId {
										id
										displayName
										email
									}
									reviewerByReviewerId {
										id
										displayName
										email
									}
									performanceCycleByCycleId {
										id
										name
									}
								}
							}
						}
					`,
					variables: {
						input: {
							performanceReview: {
								employeeId: formData.employeeId,
								reviewerId: formData.reviewerId || null,
								cycleId: formData.cycleId,
								reviewPeriodStart: formData.reviewPeriodStart,
								reviewPeriodEnd: formData.reviewPeriodEnd,
								overallRating: formData.overallRating || null,
								status: formData.status,
								selfAssessment: formData.selfAssessment || null,
								managerComments: formData.managerComments || null,
								developmentGoals: formData.developmentGoals || null,
								goalsRating: formData.goalsRating || null,
								competenciesRating: formData.competenciesRating || null
							}
						}
					}
				})
			});

			const result = await response.json();
			if (result.errors) {
				throw new Error(result.errors[0].message);
			}

			// Call onCreate callback if provided
			if (onCreate) {
				onCreate(formData);
			}

			// Reset form and close dialog
			resetForm();
			handleClose();
		} catch (error) {
			console.error('Error creating review:', error);
			errors.submit = error instanceof Error ? error.message : 'Failed to create review';
		} finally {
			loading = false;
		}
	}

	function resetForm() {
		formData = {
			employeeId,
			reviewerId,
			cycleId: '',
			reviewPeriodStart: '',
			reviewPeriodEnd: '',
			overallRating: '',
			status: 'NOT_STARTED',
			selfAssessment: '',
			managerComments: '',
			developmentGoals: '',
			goalsRating: '',
			competenciesRating: ''
		};
		errors = {};
	}

	function handleClose() {
		resetForm();
		open = false;
		if (onClose) onClose();
	}

	// Update form when props change
	$effect(() => {
		formData.employeeId = employeeId;
		if (reviewerId) formData.reviewerId = reviewerId;
	});
</script>

<Dialog.Root bind:open>
	<Dialog.Content class="max-h-[90vh] overflow-y-auto sm:max-w-[700px]">
		<Dialog.Header>
			<Dialog.Title class="flex items-center gap-2">
				<FileText class="h-5 w-5" />
				Create Performance Review
			</Dialog.Title>
			<Dialog.Description>
				Create a new performance review for {employeeName}
			</Dialog.Description>
		</Dialog.Header>

		<div class="space-y-6 py-4">
			<!-- Employee & Reviewer Info -->
			<div class={formSectionVariants({ variant: 'highlighted' })}>
				<div class="grid grid-cols-1 gap-4 md:grid-cols-2">
					<div class="flex items-center gap-2">
						<User class="h-4 w-4 text-muted-foreground" />
						<div>
							<p class="text-sm font-medium">Employee: {employeeName}</p>
							<p class="text-xs text-muted-foreground">ID: {employeeId}</p>
						</div>
					</div>
					{#if reviewerId}
						<div class="flex items-center gap-2">
							<Star class="h-4 w-4 text-muted-foreground" />
							<div>
								<p class="text-sm font-medium">Reviewer: {reviewerName}</p>
								<p class="text-xs text-muted-foreground">ID: {reviewerId}</p>
							</div>
						</div>
					{/if}
				</div>
			</div>

			<!-- Performance Cycle Selection -->
			<div class="space-y-2">
				<Label for="cycle">Performance Cycle *</Label>
				<Select.Root
					bind:selected={formData.cycleId}
					onSelectedChange={(value) => {
						if (value) updateReviewPeriod(value.value);
					}}
				>
					<Select.Trigger class={errors.cycleId ? 'border-red-500' : ''}>
						<Select.Value placeholder="Select performance cycle..." />
					</Select.Trigger>
					<Select.Content>
						{#each activeCycles as cycle (cycle.id)}
							<Select.Item value={cycle.id}>
								<div class="flex w-full items-center justify-between">
									<div>
										<span>{cycle.name}</span>
										{#if cycle.description}
											<p class="text-xs text-muted-foreground">{cycle.description}</p>
										{/if}
									</div>
									<Badge variant="secondary" class="ml-2 text-xs">
										{cycle.isActive ? 'Active' : 'Inactive'}
									</Badge>
								</div>
							</Select.Item>
						{/each}
						{#if activeCycles.length === 0}
							<Select.Item value="" disabled>No active cycles available</Select.Item>
						{/if}
					</Select.Content>
				</Select.Root>
				{#if errors.cycleId}
					<p class="text-sm text-red-500">{errors.cycleId}</p>
				{/if}
			</div>

			<!-- Review Period -->
			<div class="grid grid-cols-1 gap-4 md:grid-cols-2">
				<div class="space-y-2">
					<Label for="reviewPeriodStart" class="flex items-center gap-1">
						<CalendarDays class="h-4 w-4" />
						Review Period Start *
					</Label>
					<Input
						id="reviewPeriodStart"
						type="date"
						bind:value={formData.reviewPeriodStart}
						class={errors.reviewPeriodStart ? 'border-red-500' : ''}
					/>
					{#if errors.reviewPeriodStart}
						<p class="text-sm text-red-500">{errors.reviewPeriodStart}</p>
					{/if}
				</div>

				<div class="space-y-2">
					<Label for="reviewPeriodEnd" class="flex items-center gap-1">
						<CalendarDays class="h-4 w-4" />
						Review Period End *
					</Label>
					<Input
						id="reviewPeriodEnd"
						type="date"
						bind:value={formData.reviewPeriodEnd}
						class={errors.reviewPeriodEnd ? 'border-red-500' : ''}
					/>
					{#if errors.reviewPeriodEnd}
						<p class="text-sm text-red-500">{errors.reviewPeriodEnd}</p>
					{/if}
				</div>
			</div>

			<!-- Status and Overall Rating -->
			<div class="grid grid-cols-1 gap-4 md:grid-cols-2">
				<div class="space-y-2">
					<Label for="status">Initial Status</Label>
					<Select.Root bind:selected={formData.status}>
						<Select.Trigger>
							<Select.Value />
						</Select.Trigger>
						<Select.Content>
							{#each statusOptions as option (option.value)}
								<Select.Item value={option.value}>{option.label}</Select.Item>
							{/each}
						</Select.Content>
					</Select.Root>
				</div>

				<div class="space-y-2">
					<Label for="overallRating">Overall Rating</Label>
					<Select.Root bind:selected={formData.overallRating}>
						<Select.Trigger>
							<Select.Value placeholder="Select rating..." />
						</Select.Trigger>
						<Select.Content>
							{#each ratingOptions as option (option.value)}
								<Select.Item value={option.value}>{option.label}</Select.Item>
							{/each}
						</Select.Content>
					</Select.Root>
				</div>
			</div>

			<!-- Ratings Section -->
			<div class="grid grid-cols-1 gap-4 md:grid-cols-2">
				<div class="space-y-2">
					<Label for="goalsRating">Goals Rating</Label>
					<Select.Root bind:selected={formData.goalsRating}>
						<Select.Trigger>
							<Select.Value placeholder="Select goals rating..." />
						</Select.Trigger>
						<Select.Content>
							{#each ratingOptions as option (option.value)}
								<Select.Item value={option.value}>{option.label}</Select.Item>
							{/each}
						</Select.Content>
					</Select.Root>
				</div>

				<div class="space-y-2">
					<Label for="competenciesRating">Competencies Rating</Label>
					<Select.Root bind:selected={formData.competenciesRating}>
						<Select.Trigger>
							<Select.Value placeholder="Select competencies rating..." />
						</Select.Trigger>
						<Select.Content>
							{#each ratingOptions as option (option.value)}
								<Select.Item value={option.value}>{option.label}</Select.Item>
							{/each}
						</Select.Content>
					</Select.Root>
				</div>
			</div>

			<!-- Comments and Assessments -->
			<div class="space-y-4">
				<!-- Self Assessment -->
				<div class="space-y-2">
					<Label for="selfAssessment">Self Assessment</Label>
					<Textarea
						id="selfAssessment"
						bind:value={formData.selfAssessment}
						placeholder="Employee's self-assessment comments..."
						rows={3}
					/>
				</div>

				<!-- Manager Comments -->
				<div class="space-y-2">
					<Label for="managerComments">Manager Comments</Label>
					<Textarea
						id="managerComments"
						bind:value={formData.managerComments}
						placeholder="Manager's evaluation and feedback..."
						rows={3}
					/>
				</div>

				<!-- Development Goals -->
				<div class="space-y-2">
					<Label for="developmentGoals">Development Goals</Label>
					<Textarea
						id="developmentGoals"
						bind:value={formData.developmentGoals}
						placeholder="Future development goals and objectives..."
						rows={3}
					/>
				</div>
			</div>

			<!-- Submit Error -->
			{#if errors.submit}
				<div class="rounded-md border border-red-200 bg-red-50 p-3">
					<p class="text-sm text-red-700">{errors.submit}</p>
				</div>
			{/if}
		</div>

		<Dialog.Footer class="flex justify-end gap-2">
			<Button variant="outline" onclick={handleClose} disabled={loading}>
				<X class="mr-2 h-4 w-4" />
				Cancel
			</Button>
			<Button onclick={createReview} disabled={loading || activeCycles.length === 0}>
				<Save class="mr-2 h-4 w-4" />
				{loading ? 'Creating...' : 'Create Review'}
			</Button>
		</Dialog.Footer>
	</Dialog.Content>
</Dialog.Root>
