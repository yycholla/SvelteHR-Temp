<script lang="ts">
	import { Award, Clock, Star } from '@lucide/svelte';
	import { Button } from '$lib/components/ui/button';
	import { Card, CardContent } from '$lib/components/ui/card';
	import { Tabs, TabsContent, TabsList, TabsTrigger } from '$lib/components/ui/tabs';
	import { Badge } from '$lib/components/ui/badge';
	import { Avatar, AvatarFallback } from '$lib/components/ui/avatar';
	import {
		formatReviewPeriod,
		getStatusInfo,
		isReviewOverdue
	} from '$lib/graphql/queries/performance-reviews';

	interface Props {
		filteredReviews: any[];
		totalReviews: number;
		pendingCount: number;
		completedCount: number;
		overdueCount: number;
		selectedView: string;
		canCreateReviews: boolean;
		canEditReviews: boolean;
		onView: (review: any) => void;
		onEdit: (review: any) => void;
		onDelete: (review: any) => void;
	}

	let {
		filteredReviews,
		totalReviews,
		pendingCount,
		completedCount,
		overdueCount,
		selectedView = $bindable(),
		canCreateReviews,
		canEditReviews,
		onView,
		onEdit,
		onDelete
	}: Props = $props();

	// Get initials for avatar
	function getInitials(name: string): string {
		return (
			name
				?.split(' ')
				.map((n) => n[0])
				.join('')
				.toUpperCase() || 'U'
		);
	}

	// Get status badge variant
	function getStatusBadgeVariant(
		status: string
	): 'default' | 'secondary' | 'destructive' | 'outline' {
		switch (status) {
			case 'completed':
				return 'default';
			case 'in_progress':
				return 'secondary';
			case 'draft':
				return 'outline';
			default:
				return 'outline';
		}
	}

	// Get rating stars
	function renderRatingStars(rating: number): string {
		const filled = Math.floor(rating);
		const empty = 5 - filled;
		return '★'.repeat(filled) + '☆'.repeat(empty);
	}

	// Format dates
	function formatDate(dateString: string): string {
		return new Date(dateString).toLocaleDateString();
	}
</script>

<Tabs
	value={selectedView}
	onValueChange={(value) => {
		selectedView = value;
	}}
>
	<TabsList class="grid w-full grid-cols-4">
		<TabsTrigger value="all">
			All Reviews ({totalReviews})
		</TabsTrigger>
		<TabsTrigger value="pending">
			Pending ({pendingCount})
		</TabsTrigger>
		<TabsTrigger value="completed">
			Completed ({completedCount})
		</TabsTrigger>
		<TabsTrigger value="overdue">
			Overdue ({overdueCount})
		</TabsTrigger>
	</TabsList>

	<TabsContent value={selectedView} class="mt-4">
		<!-- Performance Reviews List -->
		<div class="space-y-4">
			{#if filteredReviews.length === 0}
				<Card>
					<CardContent class="p-8 text-center">
						<Award class="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
						<h3 class="mb-2 text-lg font-semibold text-foreground">No reviews found</h3>
						<p class="text-muted-foreground">
							{#if selectedView === 'pending'}
								No pending performance reviews at the moment.
							{:else if selectedView === 'completed'}
								No completed performance reviews found.
							{:else if selectedView === 'overdue'}
								No overdue performance reviews found.
							{:else}
								No performance reviews match your current filters.
							{/if}
						</p>
					</CardContent>
				</Card>
			{:else}
				{#each filteredReviews as review}
					<Card class="transition-shadow hover:shadow-md">
						<CardContent class="p-6">
							<div class="flex items-start justify-between">
								<!-- Review Info -->
								<div class="flex flex-1 items-start space-x-4">
									<!-- Employee Avatar -->
									<Avatar class="h-12 w-12">
										<AvatarFallback class="bg-blue-100 text-blue-700">
											{getInitials(review.employee?.displayName || '')}
										</AvatarFallback>
									</Avatar>

									<!-- Review Details -->
									<div class="flex-1 space-y-2">
										<div class="flex flex-wrap items-center gap-3">
											<h3 class="text-lg font-semibold text-foreground">
												{review.employee?.displayName || 'Unknown Employee'}
											</h3>
											<Badge variant={getStatusBadgeVariant(review.status)} class="capitalize">
												{getStatusInfo(review.status).label}
											</Badge>
											{#if review.overallRating}
												<Badge
													variant="outline"
													class="border-yellow-200 bg-yellow-50 text-yellow-700"
												>
													<Star class="mr-1 h-3 w-3" />
													{review.overallRating}/5
												</Badge>
											{/if}
											{#if isReviewOverdue(review)}
												<Badge variant="destructive">
													<Clock class="mr-1 h-3 w-3" />
													Overdue
												</Badge>
											{/if}
										</div>

										<div class="space-y-1 text-sm text-muted-foreground">
											<p>
												<strong>Department:</strong>
												{review.employee?.department?.name || 'N/A'}
											</p>
											<p>
												<strong>Reviewer:</strong>
												{review.reviewer?.displayName || 'Not assigned'}
											</p>
											<p>
												<strong>Review Period:</strong>
												{formatReviewPeriod(review.reviewPeriodStart, review.reviewPeriodEnd)}
											</p>
											{#if review.overallRating}
												<p>
													<strong>Overall Rating:</strong>
													{renderRatingStars(review.overallRating)} ({review.overallRating}/5)
												</p>
											{/if}
											{#if review.strengths}
												<p>
													<strong>Key Strengths:</strong>
													{review.strengths.substring(0, 100)}...
												</p>
											{/if}
										</div>

										<div class="text-xs text-muted-foreground">
											Created on {formatDate(review.createdAt)}
											{#if review.completedAt}
												• Completed on {formatDate(review.completedAt)}
											{/if}
										</div>
									</div>
								</div>

								<!-- Actions -->
								<div class="ml-4 flex gap-2">
									<Button size="sm" variant="outline" onclick={() => onView(review)}>
										View Details
									</Button>
									{#if canEditReviews && review.status !== 'completed'}
										<Button size="sm" variant="outline" onclick={() => onEdit(review)}>Edit</Button>
									{/if}
									{#if canCreateReviews}
										<Button
											size="sm"
											variant="outline"
											onclick={() => onDelete(review)}
											class="border-red-200 text-red-600 hover:border-red-300 hover:text-red-700"
										>
											Delete
										</Button>
									{/if}
								</div>
							</div>
						</CardContent>
					</Card>
				{/each}
			{/if}
		</div>
	</TabsContent>
</Tabs>
