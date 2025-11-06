<script lang="ts">
	/**
	 * Review Detail Page
	 * Feature: 023-reviews-creation-it
	 * Task: T036
	 *
	 * Display and edit individual performance review
	 */
	import { goto } from '$app/navigation';
	import type { PageData } from './$types';
	import * as Card from '$lib/components/ui/card';
	import { Button } from '$lib/components/ui/button';
	import { Badge } from '$lib/components/ui/badge';
	import { Separator } from '$lib/components/ui/separator';
	import {
		ArrowLeft,
		Edit,
		Trash2,
		Calendar,
		User,
		Target,
		FileText,
		AlertTriangle
	} from '@lucide/svelte';
	import {
		getReviewTypeInfo,
		getReviewStatusInfo,
		formatReviewPeriod
	} from '$lib/graphql/reviews-operations';
	import type { ReviewType, ReviewStatus } from '$lib/schemas/reviews';

	let { data }: { data: PageData } = $props();

	const review = data.review;
	const reviewTypeInfo = getReviewTypeInfo(review.reviewType as ReviewType);
	const reviewStatusInfo = getReviewStatusInfo(review.status as ReviewStatus);

	// Format dates
	function formatDate(dateString: string): string {
		return new Date(dateString).toLocaleDateString('en-US', {
			year: 'numeric',
			month: 'long',
			day: 'numeric'
		});
	}

	function formatDateTime(dateString: string): string {
		return new Date(dateString).toLocaleString('en-US', {
			year: 'numeric',
			month: 'long',
			day: 'numeric',
			hour: 'numeric',
			minute: '2-digit'
		});
	}

	// Handle actions
	function handleEdit() {
		// TODO: Implement edit functionality
		console.log('Edit review');
	}

	function handleDelete() {
		// TODO: Implement delete with confirmation
		console.log('Delete review');
	}

	function handleCompleteReview() {
		// TODO: Implement status transition
		console.log('Complete review');
	}

	function handleBackToList() {
		goto('/dashboard/reviews');
	}

	// Count active vs deleted goals
	const activeGoalsCount = $derived(review.associatedGoals.filter((g: any) => !g.deleted).length);
	const deletedGoalsCount = $derived(review.associatedGoals.filter((g: any) => g.deleted).length);
</script>

<div class="review-detail-page space-y-6">
	<!-- Back Button -->
	<Button variant="ghost" size="sm" onclick={handleBackToList}>
		<ArrowLeft class="mr-2 h-4 w-4" />
		Back to Reviews
	</Button>

	<!-- Page Header -->
	<div class="flex items-start justify-between">
		<div class="flex items-start gap-4">
			<div class="flex h-16 w-16 items-center justify-center rounded-lg bg-primary/10 text-3xl">
				{reviewTypeInfo.icon}
			</div>
			<div>
				<div class="mb-2 flex items-center gap-3">
					<h1 class="text-3xl font-bold">{reviewTypeInfo.label}</h1>
					<Badge variant={review.status === 'COMPLETED' ? 'default' : 'secondary'} class="text-sm">
						{reviewStatusInfo.icon}
						{reviewStatusInfo.label}
					</Badge>
				</div>
				<p class="text-muted-foreground">{reviewTypeInfo.description}</p>
			</div>
		</div>

		<div class="flex items-center gap-2">
			{#if data.permissions.canEdit}
				<Button variant="outline" size="sm" onclick={handleEdit}>
					<Edit class="mr-2 h-4 w-4" />
					Edit
				</Button>
			{/if}
			{#if review.status === 'IN_PROGRESS' && data.permissions.canEdit}
				<Button size="sm" onclick={handleCompleteReview}>Complete Review</Button>
			{/if}
			{#if data.permissions.canDelete}
				<Button variant="ghost" size="sm" onclick={handleDelete}>
					<Trash2 class="h-4 w-4" />
				</Button>
			{/if}
		</div>
	</div>

	<div class="grid grid-cols-1 gap-6 lg:grid-cols-3">
		<!-- Main Content Column -->
		<div class="space-y-6 lg:col-span-2">
			<!-- Employee Information -->
			<Card.Root>
				<Card.Header>
					<Card.Title class="flex items-center gap-2">
						<User class="h-5 w-5" />
						Employee Information
					</Card.Title>
				</Card.Header>
				<Card.Content class="space-y-4">
					<div class="flex items-start gap-4">
						<div
							class="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-lg font-semibold"
						>
							{review.employee.displayName[0]}
						</div>
						<div>
							<h3 class="text-lg font-medium">{review.employee.displayName}</h3>
							<p class="text-sm text-muted-foreground">{review.employee.email}</p>
							<p class="mt-1 text-sm text-muted-foreground">
								{review.employee.jobTitle}
							</p>
						</div>
					</div>

					<Separator />

					<div>
						<h4 class="mb-2 text-sm font-medium">Reviewer</h4>
						<p class="text-sm">{review.reviewer.displayName}</p>
						<p class="text-sm text-muted-foreground">{review.reviewer.email}</p>
					</div>
				</Card.Content>
			</Card.Root>

			<!-- Review Period & Notes -->
			<Card.Root>
				<Card.Header>
					<Card.Title class="flex items-center gap-2">
						<Calendar class="h-5 w-5" />
						Review Period & Notes
					</Card.Title>
				</Card.Header>
				<Card.Content class="space-y-4">
					{#if review.reviewPeriodStart || review.reviewPeriodEnd}
						<div>
							<h4 class="mb-2 text-sm font-medium">Review Period</h4>
							<p class="text-sm">
								{formatReviewPeriod(review.reviewPeriodStart, review.reviewPeriodEnd)}
							</p>
						</div>
					{/if}

					{#if review.notes}
						<div>
							<h4 class="mb-2 text-sm font-medium">Notes</h4>
							<p class="text-sm whitespace-pre-wrap">{review.notes}</p>
						</div>
					{:else}
						<p class="text-sm text-muted-foreground italic">No notes added</p>
					{/if}
				</Card.Content>
			</Card.Root>

			<!-- Associated Goals -->
			<Card.Root>
				<Card.Header>
					<div class="flex items-center justify-between">
						<Card.Title class="flex items-center gap-2">
							<Target class="h-5 w-5" />
							Associated Goals ({activeGoalsCount})
							{#if deletedGoalsCount > 0}
								<span class="text-sm font-normal text-muted-foreground">
									({deletedGoalsCount} deleted)
								</span>
							{/if}
						</Card.Title>
						{#if data.permissions.canEdit}
							<Button variant="outline" size="sm">
								<Target class="mr-2 h-4 w-4" />
								Manage Goals
							</Button>
						{/if}
					</div>
				</Card.Header>
				<Card.Content>
					{#if review.associatedGoals.length === 0}
						<p class="text-sm text-muted-foreground italic">No goals associated with this review</p>
					{:else}
						<div class="space-y-3">
							{#each review.associatedGoals as goal (goal.id)}
								<div
									class="rounded-lg border p-4 {goal.deleted
										? 'border-muted bg-muted/50'
										: 'bg-background'}"
								>
									<div class="flex items-start justify-between">
										<div class="flex-1">
											<div class="mb-1 flex items-center gap-2">
												<h4 class="text-sm font-medium">{goal.title}</h4>
												{#if goal.deleted}
													<Badge variant="outline" class="text-xs">
														<AlertTriangle class="mr-1 h-3 w-3" />
														Deleted
													</Badge>
												{:else}
													<Badge variant="outline" class="text-xs">
														{goal.status?.toUpperCase() || 'ACTIVE'}
													</Badge>
												{/if}
											</div>
											<p class="mb-2 text-sm text-muted-foreground">
												{goal.description}
											</p>
											<div class="flex items-center gap-4 text-xs text-muted-foreground">
												<span>Target: {formatDate(goal.targetDate)}</span>
												{#if goal.progressPercentage !== null}
													<span>Progress: {goal.progressPercentage}%</span>
												{/if}
											</div>
											{#if goal.deleted && goal.deletedAt}
												<p class="mt-1 text-xs text-muted-foreground">
													Deleted on {formatDate(goal.deletedAt)}
												</p>
											{/if}
										</div>
									</div>
								</div>
							{/each}
						</div>
					{/if}
				</Card.Content>
			</Card.Root>
		</div>

		<!-- Sidebar Column -->
		<div class="space-y-6">
			<!-- Review Metadata -->
			<Card.Root>
				<Card.Header>
					<Card.Title class="text-sm">Review Details</Card.Title>
				</Card.Header>
				<Card.Content class="space-y-3 text-sm">
					<div>
						<p class="text-muted-foreground">Status</p>
						<p class="font-medium">{reviewStatusInfo.label}</p>
					</div>
					<Separator />
					<div>
						<p class="text-muted-foreground">Created</p>
						<p class="font-medium">{formatDateTime(review.createdAt)}</p>
					</div>
					<Separator />
					<div>
						<p class="text-muted-foreground">Last Updated</p>
						<p class="font-medium">{formatDateTime(review.updatedAt)}</p>
					</div>
					<Separator />
					<div>
						<p class="text-muted-foreground">Review ID</p>
						<p class="font-mono text-xs">{review.id}</p>
					</div>
				</Card.Content>
			</Card.Root>

			<!-- Quick Actions -->
			{#if data.permissions.canEdit}
				<Card.Root>
					<Card.Header>
						<Card.Title class="text-sm">Quick Actions</Card.Title>
					</Card.Header>
					<Card.Content class="space-y-2">
						<Button variant="outline" size="sm" class="w-full justify-start">
							<FileText class="mr-2 h-4 w-4" />
							Export as PDF
						</Button>
						<Button variant="outline" size="sm" class="w-full justify-start">
							<Calendar class="mr-2 h-4 w-4" />
							Schedule Follow-up
						</Button>
					</Card.Content>
				</Card.Root>
			{/if}
		</div>
	</div>
</div>

<style>
	.review-detail-page {
		padding: 2rem;
		max-width: 1400px;
		margin: 0 auto;
	}

	@media (max-width: 768px) {
		.review-detail-page {
			padding: 1rem;
		}
	}
</style>
