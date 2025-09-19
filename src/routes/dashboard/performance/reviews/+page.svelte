<script lang="ts">
	import { onMount } from 'svelte';
	import { queryStore } from '@urql/svelte';
	import { createUrqlClient } from '$lib/graphql/client';
	import { currentUser, hasRole } from '$lib/stores/auth';
	import { Button } from '$lib/components/ui/button';
	import * as Card from '$lib/components/ui/card';
	import * as Tabs from '$lib/components/ui/tabs';
	import * as Badge from '$lib/components/ui/badge';
	import { ClipboardCheck, Calendar, Star, TrendingUp, Users, ArrowLeft } from 'lucide-svelte';

	// Create client
	const client = createUrqlClient();
	let reviewsQuery: any = $state(null);
	let reviewsQueryState = $state({ fetching: true, error: null, data: null });

	// Mock data for performance reviews since we don't have the full schema yet
	const mockReviews = [
		{
			id: 1,
			employeeName: 'John Doe',
			reviewPeriod: '2024 Q4',
			status: 'IN_PROGRESS',
			dueDate: '2024-12-31',
			overallRating: null,
			completionPercentage: 65
		},
		{
			id: 2,
			employeeName: 'Jane Smith',
			reviewPeriod: '2024 Q4',
			status: 'COMPLETED',
			dueDate: '2024-12-31',
			overallRating: 4.2,
			completionPercentage: 100
		},
		{
			id: 3,
			employeeName: 'Mike Johnson',
			reviewPeriod: '2024 Q4',
			status: 'PENDING',
			dueDate: '2024-12-31',
			overallRating: null,
			completionPercentage: 0
		}
	];

	const getStatusColor = (status: string) => {
		switch (status) {
			case 'COMPLETED':
				return 'default';
			case 'IN_PROGRESS':
				return 'secondary';
			case 'PENDING':
				return 'outline';
			default:
				return 'outline';
		}
	};

	const getStatusText = (status: string) => {
		switch (status) {
			case 'COMPLETED':
				return 'Completed';
			case 'IN_PROGRESS':
				return 'In Progress';
			case 'PENDING':
				return 'Pending';
			default:
				return 'Unknown';
		}
	};
</script>

<svelte:head>
	<title>Performance Reviews - SvelteHR</title>
	<meta name="description" content="Manage performance reviews and evaluations" />
</svelte:head>

<div class="space-y-6">
	<!-- Header -->
	<div class="flex items-center space-x-4">
		<Button variant="outline" size="sm" href="/dashboard/performance">
			<ArrowLeft class="mr-2 h-4 w-4" />
			Back to Performance
		</Button>

		<div>
			<h1 class="flex items-center gap-3 text-3xl font-bold tracking-tight">
				<ClipboardCheck class="h-8 w-8" />
				Performance Reviews
			</h1>
			<p class="text-muted-foreground">Manage and track performance reviews for your team</p>
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
				<div class="text-2xl font-bold">12</div>
				<p class="text-xs text-muted-foreground">Current review cycle</p>
			</Card.Content>
		</Card.Root>

		<Card.Root>
			<Card.Header class="flex flex-row items-center justify-between space-y-0 pb-2">
				<Card.Title class="text-sm font-medium">Completed</Card.Title>
				<Star class="h-4 w-4 text-muted-foreground" />
			</Card.Header>
			<Card.Content>
				<div class="text-2xl font-bold">8</div>
				<p class="text-xs text-muted-foreground">67% completion rate</p>
			</Card.Content>
		</Card.Root>

		<Card.Root>
			<Card.Header class="flex flex-row items-center justify-between space-y-0 pb-2">
				<Card.Title class="text-sm font-medium">In Progress</Card.Title>
				<TrendingUp class="h-4 w-4 text-muted-foreground" />
			</Card.Header>
			<Card.Content>
				<div class="text-2xl font-bold">3</div>
				<p class="text-xs text-muted-foreground">25% of total</p>
			</Card.Content>
		</Card.Root>

		<Card.Root>
			<Card.Header class="flex flex-row items-center justify-between space-y-0 pb-2">
				<Card.Title class="text-sm font-medium">Pending</Card.Title>
				<Calendar class="h-4 w-4 text-muted-foreground" />
			</Card.Header>
			<Card.Content>
				<div class="text-2xl font-bold">1</div>
				<p class="text-xs text-muted-foreground">Due this week</p>
			</Card.Content>
		</Card.Root>
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
				<h3 class="text-lg font-semibold">All Performance Reviews</h3>
				<Button>
					<Users class="mr-2 h-4 w-4" />
					Start Review Cycle
				</Button>
			</div>

			<Card.Root>
				<Card.Header>
					<Card.Title>Review List</Card.Title>
					<Card.Description>Manage performance reviews for your team members</Card.Description>
				</Card.Header>
				<Card.Content>
					<div class="space-y-4">
						{#each mockReviews as review}
							<div class="flex items-center justify-between p-4 border rounded-lg">
								<div class="space-y-1">
									<div class="flex items-center gap-3">
										<h4 class="font-medium">{review.employeeName}</h4>
										<Badge.Root variant={getStatusColor(review.status)}>
											{getStatusText(review.status)}
										</Badge.Root>
									</div>
									<p class="text-sm text-muted-foreground">Review Period: {review.reviewPeriod}</p>
									<p class="text-sm text-muted-foreground">Due: {review.dueDate}</p>
								</div>

								<div class="flex items-center gap-4">
									{#if review.overallRating}
										<div class="text-center">
											<div class="text-lg font-bold">{review.overallRating}/5</div>
											<p class="text-xs text-muted-foreground">Rating</p>
										</div>
									{/if}

									<div class="text-center">
										<div class="text-lg font-bold">{review.completionPercentage}%</div>
										<p class="text-xs text-muted-foreground">Complete</p>
									</div>

									<Button variant="outline" size="sm">
										{review.status === 'COMPLETED' ? 'View' : 'Continue'}
									</Button>
								</div>
							</div>
						{/each}
					</div>
				</Card.Content>
			</Card.Root>
		</Tabs.Content>

		<Tabs.Content value="pending" class="space-y-4">
			<Card.Root>
				<Card.Header>
					<Card.Title>Pending Reviews</Card.Title>
					<Card.Description>Reviews that need to be started</Card.Description>
				</Card.Header>
				<Card.Content>
					<div class="space-y-4">
						{#each mockReviews.filter(r => r.status === 'PENDING') as review}
							<div class="flex items-center justify-between p-4 border rounded-lg">
								<div class="space-y-1">
									<h4 class="font-medium">{review.employeeName}</h4>
									<p class="text-sm text-muted-foreground">Review Period: {review.reviewPeriod}</p>
									<p class="text-sm text-muted-foreground text-orange-600">Due: {review.dueDate}</p>
								</div>
								<Button>Start Review</Button>
							</div>
						{/each}
					</div>
				</Card.Content>
			</Card.Root>
		</Tabs.Content>

		<Tabs.Content value="in-progress" class="space-y-4">
			<Card.Root>
				<Card.Header>
					<Card.Title>In Progress Reviews</Card.Title>
					<Card.Description>Reviews currently being completed</Card.Description>
				</Card.Header>
				<Card.Content>
					<div class="space-y-4">
						{#each mockReviews.filter(r => r.status === 'IN_PROGRESS') as review}
							<div class="flex items-center justify-between p-4 border rounded-lg">
								<div class="space-y-1">
									<h4 class="font-medium">{review.employeeName}</h4>
									<p class="text-sm text-muted-foreground">Review Period: {review.reviewPeriod}</p>
									<div class="w-48 bg-gray-200 rounded-full h-2">
										<div class="bg-blue-600 h-2 rounded-full" style="width: {review.completionPercentage}%"></div>
									</div>
									<p class="text-xs text-muted-foreground">{review.completionPercentage}% complete</p>
								</div>
								<Button variant="outline">Continue</Button>
							</div>
						{/each}
					</div>
				</Card.Content>
			</Card.Root>
		</Tabs.Content>

		<Tabs.Content value="completed" class="space-y-4">
			<Card.Root>
				<Card.Header>
					<Card.Title>Completed Reviews</Card.Title>
					<Card.Description>Finished performance reviews</Card.Description>
				</Card.Header>
				<Card.Content>
					<div class="space-y-4">
						{#each mockReviews.filter(r => r.status === 'COMPLETED') as review}
							<div class="flex items-center justify-between p-4 border rounded-lg">
								<div class="space-y-1">
									<h4 class="font-medium">{review.employeeName}</h4>
									<p class="text-sm text-muted-foreground">Review Period: {review.reviewPeriod}</p>
									<p class="text-sm text-green-600">Completed on {review.dueDate}</p>
								</div>
								<div class="flex items-center gap-4">
									<div class="text-center">
										<div class="text-lg font-bold text-green-600">{review.overallRating}/5</div>
										<p class="text-xs text-muted-foreground">Rating</p>
									</div>
									<Button variant="outline" size="sm">View Report</Button>
								</div>
							</div>
						{/each}
					</div>
				</Card.Content>
			</Card.Root>
		</Tabs.Content>
	</Tabs.Root>
</div>