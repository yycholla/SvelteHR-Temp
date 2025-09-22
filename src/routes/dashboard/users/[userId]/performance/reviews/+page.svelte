<script lang="ts">
	import { onMount } from 'svelte';
	import { page } from '$app/stores';
	import { queryStore } from '@urql/svelte';
	import { createUrqlClient } from '$lib/graphql/client';
	import { currentUser, hasRole } from '$lib/stores/auth';
	import { Button } from '$lib/components/ui/button';
	import * as Card from '$lib/components/ui/card';
	import * as Tabs from '$lib/components/ui/tabs';
	import * as Badge from '$lib/components/ui/badge';
	import { ClipboardCheck, Calendar, Star, TrendingUp, Users, ArrowLeft, RefreshCw, Loader2 } from 'lucide-svelte';

	// Import GraphQL operations
	import {
		GET_EMPLOYEE_PERFORMANCE_REVIEWS_QUERY,
		type PerformanceReview,
		PerformanceUtils
	} from '$lib/graphql/performance-management-operations';

	// Get user ID from URL params
	const userId = $page.params.userId;

	// Check if viewing own performance reviews
	const isOwnReviews = $derived($currentUser?.id === userId);

	// Create client and query
	const client = createUrqlClient();
	let reviewsQuery: any = $state(null);
	let reviewsQueryState = $state({ fetching: true, error: null, data: null });

	onMount(() => {
		try {
			reviewsQuery = queryStore({
				client,
				query: GET_EMPLOYEE_PERFORMANCE_REVIEWS_QUERY,
				variables: {
					employeeId: userId,
					first: 20,
					orderBy: ['REVIEW_PERIOD_START_DESC']
				}
			});
		} catch (error) {
			console.error('Error initializing reviews query:', error);
		}
	});

	// Update query state
	$effect(() => {
		if (reviewsQuery) {
			const unsubscribe = reviewsQuery.subscribe((state: any) => {
				reviewsQueryState = {
					fetching: state.fetching,
					error: state.error,
					data: state.data
				};
			});
			return unsubscribe;
		}
	});

	// Get reviews data
	const myReviews = $derived(() => {
		const reviews = reviewsQueryState.data?.allPerformanceReviews?.nodes;
		return Array.isArray(reviews) ? reviews : [];
	});

	// Helper functions
	const getStatusColor = (status: string) => {
		switch (status) {
			case 'COMPLETED':
				return 'default';
			case 'IN_PROGRESS':
				return 'secondary';
			case 'NOT_STARTED':
				return 'outline';
			case 'OVERDUE':
				return 'destructive';
			default:
				return 'outline';
		}
	};

	const formatDate = (dateString: string) => {
		return new Date(dateString).toLocaleDateString();
	};

	const getCompletionPercentage = (review: PerformanceReview) => {
		if (review.status === 'COMPLETED') return 100;
		if (review.status === 'NOT_STARTED') return 0;

		// Calculate based on self-assessment and reviewer completion
		let percentage = 0;
		if (review.selfAssessment) percentage += 50;
		if (review.overallRating) percentage += 50;
		return percentage;
	};

	// Refresh data
	const refresh = () => {
		reviewsQuery?.rerun({ requestPolicy: 'network-only' });
	};
</script>

<svelte:head>
	<title>My Performance Reviews - SvelteHR</title>
	<meta name="description" content="View and complete your performance reviews" />
</svelte:head>

<div class="space-y-6">
	<!-- Header -->
	<div class="flex items-center space-x-4">

		<div>
			<h1 class="flex items-center gap-3 text-3xl font-bold tracking-tight">
				<ClipboardCheck class="h-8 w-8" />
				{isOwnReviews ? 'My Performance Reviews' : `${$currentUser?.display_name || 'User'}'s Performance Reviews`}
			</h1>
			<p class="text-muted-foreground">{isOwnReviews ? 'View and complete your performance reviews' : 'View performance reviews for this user'}</p>
		</div>
	</div>

	<!-- Stats Cards -->
	<div class="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
		<Card.Root>
			<Card.Header class="flex flex-row items-center justify-between space-y-0 pb-2">
				<Card.Title class="text-sm font-medium">Total Reviews</Card.Title>
				<ClipboardCheck class="h-4 w-4 text-muted-foreground" />
			</Card.Header>
			<Card.Content>
				<div class="text-2xl font-bold">
					{reviewsQueryState.fetching ? '-' : myReviews.length}
				</div>
				<p class="text-xs text-muted-foreground">All time</p>
			</Card.Content>
		</Card.Root>

		<Card.Root>
			<Card.Header class="flex flex-row items-center justify-between space-y-0 pb-2">
				<Card.Title class="text-sm font-medium">Completed</Card.Title>
				<Star class="h-4 w-4 text-muted-foreground" />
			</Card.Header>
			<Card.Content>
				<div class="text-2xl font-bold">
					{reviewsQueryState.fetching ? '-' : Array.isArray(myReviews) ? myReviews.filter(r => r.status === 'COMPLETED').length : 0}
				</div>
				<p class="text-xs text-muted-foreground">
					{reviewsQueryState.fetching ? 'Loading...' : Array.isArray(myReviews) ? `${Math.round((myReviews.filter(r => r.status === 'COMPLETED').length / Math.max(myReviews.length, 1)) * 100)}% completion rate` : '0% completion rate'}
				</p>
			</Card.Content>
		</Card.Root>

		<Card.Root>
			<Card.Header class="flex flex-row items-center justify-between space-y-0 pb-2">
				<Card.Title class="text-sm font-medium">In Progress</Card.Title>
				<TrendingUp class="h-4 w-4 text-muted-foreground" />
			</Card.Header>
			<Card.Content>
				<div class="text-2xl font-bold">
					{reviewsQueryState.fetching ? '-' : Array.isArray(myReviews) ? myReviews.filter(r => r.status === 'IN_PROGRESS').length : 0}
				</div>
				<p class="text-xs text-muted-foreground">Currently active</p>
			</Card.Content>
		</Card.Root>

		<Card.Root>
			<Card.Header class="flex flex-row items-center justify-between space-y-0 pb-2">
				<Card.Title class="text-sm font-medium">Average Rating</Card.Title>
				<Star class="h-4 w-4 text-muted-foreground" />
			</Card.Header>
			<Card.Content>
				<div class="text-2xl font-bold">
					{(() => {
						if (reviewsQueryState.fetching) return '-';
						if (!Array.isArray(myReviews)) return 'N/A';
						const completedWithRatings = myReviews.filter(r => r.status === 'COMPLETED' && r.overallRating);
						if (completedWithRatings.length === 0) return 'N/A';
						// Convert rating enum to numeric value for averaging
						const ratingValues = completedWithRatings.map(r => {
							switch (r.overallRating) {
								case 'EXCEEDED_EXPECTATIONS': return 5;
								case 'MET_EXPECTATIONS': return 4;
								case 'PARTIALLY_MET_EXPECTATIONS': return 3;
								case 'DID_NOT_MEET_EXPECTATIONS': return 2;
								default: return 0;
							}
						});
						const avg = ratingValues.reduce((sum, rating) => sum + rating, 0) / ratingValues.length;
						return avg.toFixed(1);
					})()}
				</div>
				<p class="text-xs text-muted-foreground">Out of 5.0</p>
			</Card.Content>
		</Card.Root>
	</div>

	<!-- Refresh Button -->
	<div class="flex justify-end">
		<Button variant="outline" size="sm" onclick={refresh} disabled={reviewsQueryState.fetching}>
			<RefreshCw class="h-4 w-4 {reviewsQueryState.fetching ? 'animate-spin' : ''}" />
			Refresh
		</Button>
	</div>

	<!-- Reviews Management -->
	<Tabs.Root value="all" class="w-full">
		<Tabs.List class="grid w-full grid-cols-4">
			<Tabs.Trigger value="all">All Reviews</Tabs.Trigger>
			<Tabs.Trigger value="pending">Pending</Tabs.Trigger>
			<Tabs.Trigger value="in-progress">In Progress</Tabs.Trigger>
			<Tabs.Trigger value="completed">Completed</Tabs.Trigger>
		</Tabs.List>

		<Tabs.Content value="all" class="space-y-4">
			<div class="flex items-center justify-between">
				<h3 class="text-lg font-semibold">{isOwnReviews ? 'My Performance Reviews' : 'Performance Reviews'}</h3>
			</div>

			<Card.Root>
				<Card.Header>
					<Card.Title>Review History</Card.Title>
					<Card.Description>{isOwnReviews ? 'View and track your performance review history' : 'Performance review history for this user'}</Card.Description>
				</Card.Header>
				<Card.Content>
					{#if reviewsQueryState.fetching}
						<div class="flex items-center justify-center py-12">
							<div class="flex items-center space-x-2">
								<RefreshCw class="h-4 w-4 animate-spin" />
								<p>Loading reviews...</p>
							</div>
						</div>
					{:else if reviewsQueryState.error}
						<div class="text-center py-8">
							<div class="rounded-lg border border-red-200 bg-red-50 p-4">
								<p class="text-sm text-red-600">Error loading reviews: {reviewsQueryState.error.message}</p>
							</div>
						</div>
					{:else if myReviews.length === 0}
						<div class="text-center py-8">
							<ClipboardCheck class="mx-auto h-12 w-12 text-muted-foreground mb-4" />
							<h3 class="text-lg font-semibold mb-2">No reviews found</h3>
							<p class="text-muted-foreground">Performance reviews will appear here when they are created.</p>
						</div>
					{:else}
						<div class="space-y-4">
							{#each myReviews as review}
								<div class="flex items-center justify-between p-4 border rounded-lg">
									<div class="space-y-1">
										<div class="flex items-center gap-3">
											<h4 class="font-medium">
												{review.performanceCycleByCycleId?.name || 'Performance Review'}
											</h4>
											<Badge.Root variant={getStatusColor(review.status)}>
												{PerformanceUtils.formatStatus(review.status)}
											</Badge.Root>
										</div>
										<p class="text-sm text-muted-foreground">
											Reviewer: {review.reviewerByReviewerId?.displayName || 'TBD'}
										</p>
										<p class="text-sm text-muted-foreground">
											Period: {formatDate(review.reviewPeriodStart)} - {formatDate(review.reviewPeriodEnd)}
										</p>
										<div class="flex items-center gap-4 text-xs text-muted-foreground">
											<span class="flex items-center gap-1">
												<div class="w-2 h-2 rounded-full {review.selfAssessment ? 'bg-green-500' : 'bg-gray-300'}"></div>
												Self Assessment
											</span>
											<span class="flex items-center gap-1">
												<div class="w-2 h-2 rounded-full {review.overallRating ? 'bg-green-500' : 'bg-gray-300'}"></div>
												Manager Assessment
											</span>
										</div>
									</div>

									<div class="flex items-center gap-4">
										{#if review.overallRating}
											<div class="text-center">
												<div class="text-lg font-bold">
													{PerformanceUtils.formatRating(review.overallRating)}
												</div>
												<p class="text-xs text-muted-foreground">Rating</p>
											</div>
										{/if}

										<div class="text-center">
											<div class="text-lg font-bold">{getCompletionPercentage(review)}%</div>
											<p class="text-xs text-muted-foreground">Complete</p>
										</div>

										<Button variant="outline" size="sm">
											{review.status === 'COMPLETED' ? 'View Report' : review.status === 'IN_PROGRESS' ? 'Continue Review' : 'Start Review'}
										</Button>
									</div>
								</div>
							{/each}
						</div>
					{/if}
				</Card.Content>
			</Card.Root>
		</Tabs.Content>

		<Tabs.Content value="pending" class="space-y-4">
			<Card.Root>
				<Card.Header>
					<Card.Title>Pending Reviews</Card.Title>
					<Card.Description>{isOwnReviews ? 'Reviews you need to start or complete' : 'Reviews this user needs to start or complete'}</Card.Description>
				</Card.Header>
				<Card.Content>
					{#if reviewsQueryState.fetching}
						<div class="flex items-center justify-center py-12">
							<div class="flex items-center space-x-2">
								<RefreshCw class="h-4 w-4 animate-spin" />
								<p>Loading reviews...</p>
							</div>
						</div>
					{:else}
						{@const pendingReviews = Array.isArray(myReviews) ? myReviews.filter(r => r.status === 'Draft') : []}
						<div class="space-y-4">
							{#each pendingReviews as review}
								<div class="flex items-center justify-between p-4 border rounded-lg">
									<div class="space-y-1">
										<h4 class="font-medium">
											{review.performanceCycleByCycleId?.name || 'Performance Review'}
										</h4>
										<p class="text-sm text-muted-foreground">
											Reviewer: {review.reviewerByReviewerId?.displayName || 'TBD'}
										</p>
										<p class="text-sm text-muted-foreground text-orange-600">
											Due: {formatDate(review.reviewPeriodEnd)}
										</p>
									</div>
									<Button>Start Review</Button>
								</div>
							{:else}
								<div class="text-center py-8">
									<ClipboardCheck class="mx-auto h-12 w-12 text-muted-foreground mb-4" />
									<h3 class="text-lg font-semibold mb-2">No pending reviews</h3>
									<p class="text-muted-foreground">You don't have any reviews waiting to be started.</p>
								</div>
							{/each}
						</div>
					{/if}
				</Card.Content>
			</Card.Root>
		</Tabs.Content>

		<Tabs.Content value="in-progress" class="space-y-4">
			<Card.Root>
				<Card.Header>
					<Card.Title>In Progress Reviews</Card.Title>
					<Card.Description>{isOwnReviews ? 'Reviews you are currently completing' : 'Reviews this user is currently completing'}</Card.Description>
				</Card.Header>
				<Card.Content>
					{#if reviewsQueryState.fetching}
						<div class="flex items-center justify-center py-12">
							<div class="flex items-center space-x-2">
								<RefreshCw class="h-4 w-4 animate-spin" />
								<p>Loading reviews...</p>
							</div>
						</div>
					{:else}
						{@const inProgressReviews = Array.isArray(myReviews) ? myReviews.filter(r => r.status === 'IN_PROGRESS') : []}
						<div class="space-y-4">
							{#each inProgressReviews as review}
								<div class="flex items-center justify-between p-4 border rounded-lg">
									<div class="space-y-2">
										<h4 class="font-medium">
											{review.performanceCycleByCycleId?.name || 'Performance Review'}
										</h4>
										<p class="text-sm text-muted-foreground">
											Reviewer: {review.reviewerByReviewerId?.displayName || 'TBD'}
										</p>
										<div class="w-48 bg-gray-200 rounded-full h-2">
											<div class="bg-blue-600 h-2 rounded-full" style="width: {getCompletionPercentage(review)}%"></div>
										</div>
										<p class="text-xs text-muted-foreground">{getCompletionPercentage(review)}% complete</p>
										<div class="flex items-center gap-4 text-xs text-muted-foreground">
											<span class="flex items-center gap-1">
												<div class="w-2 h-2 rounded-full {review.selfAssessment ? 'bg-green-500' : 'bg-yellow-500'}"></div>
												Self Assessment {review.selfAssessment ? 'Complete' : 'In Progress'}
											</span>
											<span class="flex items-center gap-1">
												<div class="w-2 h-2 rounded-full {review.overallRating ? 'bg-green-500' : 'bg-gray-300'}"></div>
												Manager Assessment {review.overallRating ? 'Complete' : 'Pending'}
											</span>
										</div>
									</div>
									<Button variant="outline">Continue Review</Button>
								</div>
							{:else}
								<div class="text-center py-8">
									<TrendingUp class="mx-auto h-12 w-12 text-muted-foreground mb-4" />
									<h3 class="text-lg font-semibold mb-2">No reviews in progress</h3>
									<p class="text-muted-foreground">You don't have any reviews currently being completed.</p>
								</div>
							{/each}
						</div>
					{/if}
				</Card.Content>
			</Card.Root>
		</Tabs.Content>

		<Tabs.Content value="completed" class="space-y-4">
			<Card.Root>
				<Card.Header>
					<Card.Title>Completed Reviews</Card.Title>
					<Card.Description>{isOwnReviews ? 'Your completed performance reviews' : 'Completed performance reviews for this user'}</Card.Description>
				</Card.Header>
				<Card.Content>
					{#if reviewsQueryState.fetching}
						<div class="flex items-center justify-center py-12">
							<div class="flex items-center space-x-2">
								<RefreshCw class="h-4 w-4 animate-spin" />
								<p>Loading reviews...</p>
							</div>
						</div>
					{:else}
						{@const completedReviews = Array.isArray(myReviews) ? myReviews.filter(r => r.status === 'COMPLETED') : []}
						<div class="space-y-4">
							{#each completedReviews as review}
								<div class="flex items-center justify-between p-4 border rounded-lg">
									<div class="space-y-1">
										<h4 class="font-medium">
											{review.performanceCycleByCycleId?.name || 'Performance Review'}
										</h4>
										<p class="text-sm text-muted-foreground">
											Reviewer: {review.reviewerByReviewerId?.displayName || 'TBD'}
										</p>
										<p class="text-sm text-green-600">
											Completed on {review.completedAt ? formatDate(review.completedAt) : formatDate(review.reviewPeriodEnd)}
										</p>
									</div>
									<div class="flex items-center gap-4">
										{#if review.overallRating}
											<div class="text-center">
												<div class="text-lg font-bold text-green-600">
													{PerformanceUtils.formatRating(review.overallRating)}
												</div>
												<p class="text-xs text-muted-foreground">Overall Rating</p>
											</div>
										{/if}
										<Button variant="outline" size="sm">View Full Report</Button>
									</div>
								</div>
							{:else}
								<div class="text-center py-8">
									<Star class="mx-auto h-12 w-12 text-muted-foreground mb-4" />
									<h3 class="text-lg font-semibold mb-2">No completed reviews</h3>
									<p class="text-muted-foreground">Completed reviews will appear here once they are finished.</p>
								</div>
							{/each}
						</div>
					{/if}
				</Card.Content>
			</Card.Root>
		</Tabs.Content>
	</Tabs.Root>
</div>