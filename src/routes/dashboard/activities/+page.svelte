<script lang="ts">
	// My Activities Page
	// Feature: 019-we-need-to - Task T030
	// Purpose: Display user's activity history

	import type { PageData } from './$types';
	import ActivityFeed from '$lib/components/activities/ActivityFeed.svelte';
	import { goto } from '$app/navigation';
	import { page } from '$app/stores';
	import type { ActivityAction, ResourceType } from '$lib/graphql/types';
	import { getActivityStatistics } from '$lib/utils/activities';

	let { data }: { data: PageData } = $props();

	// Derived statistics
	let statistics = $derived(getActivityStatistics(data.activities));

	// Filter state
	let selectedAction = $state<ActivityAction | 'all'>(data.filters.action || 'all');
	let selectedResourceType = $state<ResourceType | 'all'>(data.filters.resourceType || 'all');
	let selectedDaysBack = $state(data.filters.daysBack || 30);

	// Handle activity click (navigate to related resource)
	function handleActivityClick(activity: any) {
		if (activity.relatedResourceId && activity.relatedResourceType) {
			const resourceMap: Record<string, string> = {
				event: '/dashboard/events',
				task: '/dashboard/tasks',
				leave_request: '/dashboard/leave',
				performance_review: '/dashboard/reviews',
				employee: '/dashboard/employees',
				department: '/dashboard/departments'
			};

			const basePath = resourceMap[activity.relatedResourceType];
			if (basePath) {
				goto(`${basePath}/${activity.relatedResourceId}`);
			}
		}
	}

	// Apply filters
	function applyFilters() {
		const params = new URLSearchParams($page.url.searchParams);

		if (selectedAction !== 'all') {
			params.set('action', selectedAction);
		} else {
			params.delete('action');
		}

		if (selectedResourceType !== 'all') {
			params.set('resourceType', selectedResourceType);
		} else {
			params.delete('resourceType');
		}

		params.set('days', selectedDaysBack.toString());
		params.set('page', '1'); // Reset to first page

		goto(`?${params.toString()}`, { replaceState: true });
	}

	// Pagination
	function goToPage(pageNum: number) {
		const params = new URLSearchParams($page.url.searchParams);
		params.set('page', pageNum.toString());
		goto(`?${params.toString()}`);
	}
</script>

<svelte:head>
	<title>My Activities - SvelteHR</title>
	<meta name="description" content="View your activity history" />
</svelte:head>

<div class="container mx-auto max-w-7xl px-4 py-8">
	<!-- Page Header -->
	<div class="mb-8">
		<h1 class="text-3xl font-bold text-foreground">My Activities</h1>
		<p class="mt-2 text-muted-foreground">View your recent activity history</p>
	</div>

	<!-- Filters and Controls -->
	<div class="mb-6 rounded-lg border border-border bg-card p-4 shadow-sm">
		<div class="flex flex-wrap items-end gap-4">
			<!-- Action Filter -->
			<div class="flex-1 min-w-[200px]">
				<label for="action-filter" class="block text-sm font-medium text-foreground mb-1">
					Action
				</label>
				<select
					id="action-filter"
					bind:value={selectedAction}
					onchange={applyFilters}
					class="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground focus:border-ring focus:outline-none focus:ring-1 focus:ring-ring"
				>
					<option value="all">All Actions</option>
					<option value="create">Create</option>
					<option value="update">Update</option>
					<option value="delete">Delete</option>
					<option value="view">View</option>
					<option value="login">Login</option>
					<option value="logout">Logout</option>
				</select>
			</div>

			<!-- Resource Type Filter -->
			<div class="flex-1 min-w-[200px]">
				<label for="resource-filter" class="block text-sm font-medium text-foreground mb-1">
					Resource Type
				</label>
				<select
					id="resource-filter"
					bind:value={selectedResourceType}
					onchange={applyFilters}
					class="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground focus:border-ring focus:outline-none focus:ring-1 focus:ring-ring"
				>
					<option value="all">All Resources</option>
					<option value="event">Event</option>
					<option value="task">Task</option>
					<option value="leave_request">Leave Request</option>
					<option value="profile">Profile</option>
					<option value="document">Document</option>
					<option value="employee">Employee</option>
					<option value="department">Department</option>
					<option value="performance_review">Performance Review</option>
					<option value="notification">Notification</option>
					<option value="system">System</option>
				</select>
			</div>

			<!-- Time Range Filter -->
			<div class="flex-1 min-w-[200px]">
				<label for="days-filter" class="block text-sm font-medium text-foreground mb-1">
					Time Range
				</label>
				<select
					id="days-filter"
					bind:value={selectedDaysBack}
					onchange={applyFilters}
					class="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground focus:border-ring focus:outline-none focus:ring-1 focus:ring-ring"
				>
					<option value="1">Last 24 hours</option>
					<option value="7">Last 7 days</option>
					<option value="30">Last 30 days</option>
					<option value="90">Last 90 days</option>
				</select>
			</div>

			<!-- Reset Filters Button -->
			<div>
				<button
					type="button"
					onclick={() => goto('/dashboard/activities')}
					class="rounded-md border border-input bg-background px-4 py-2 text-sm font-medium text-foreground hover:bg-accent hover:text-accent-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
				>
					Reset
				</button>
			</div>
		</div>
	</div>

	<!-- Statistics Summary -->
	<div class="mb-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
		<div class="rounded-lg border border-border bg-card p-4 shadow-sm">
			<div class="text-2xl font-bold text-foreground">{statistics.total}</div>
			<div class="text-sm text-muted-foreground">Total Activities</div>
		</div>

		<div class="rounded-lg border border-border bg-card p-4 shadow-sm">
			<div class="text-2xl font-bold text-green-600 dark:text-green-400">{statistics.creates}</div>
			<div class="text-sm text-muted-foreground">Creates</div>
		</div>

		<div class="rounded-lg border border-border bg-card p-4 shadow-sm">
			<div class="text-2xl font-bold text-primary">{statistics.updates}</div>
			<div class="text-sm text-muted-foreground">Updates</div>
		</div>

		<div class="rounded-lg border border-border bg-card p-4 shadow-sm">
			<div class="text-2xl font-bold text-destructive">{statistics.deletes}</div>
			<div class="text-sm text-muted-foreground">Deletes</div>
		</div>
	</div>

	<!-- Activity Feed -->
	<div class="mb-6">
		<ActivityFeed
			activities={data.activities}
			onActivityClick={handleActivityClick}
			groupByDate={true}
			showUserInfo={false}
			showTimestamps={true}
			compact={false}
			emptyMessage="No activities in the selected time range"
		/>
	</div>

	<!-- Pagination -->
	{#if data.totalCount > data.limit}
		<div class="flex items-center justify-between border-t border-border bg-card px-4 py-3 sm:px-6">
			<div class="flex flex-1 justify-between sm:hidden">
				<button
					type="button"
					disabled={data.currentPage === 1}
					onclick={() => goToPage(data.currentPage - 1)}
					class="relative inline-flex items-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium text-foreground hover:bg-accent hover:text-accent-foreground disabled:opacity-50 disabled:cursor-not-allowed"
				>
					Previous
				</button>
				<button
					type="button"
					disabled={!data.hasNextPage}
					onclick={() => goToPage(data.currentPage + 1)}
					class="relative ml-3 inline-flex items-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium text-foreground hover:bg-accent hover:text-accent-foreground disabled:opacity-50 disabled:cursor-not-allowed"
				>
					Next
				</button>
			</div>

			<div class="hidden sm:flex sm:flex-1 sm:items-center sm:justify-between">
				<div>
					<p class="text-sm text-foreground">
						Showing
						<span class="font-medium">{(data.currentPage - 1) * data.limit + 1}</span>
						to
						<span class="font-medium">{Math.min(data.currentPage * data.limit, data.totalCount)}</span>
						of
						<span class="font-medium">{data.totalCount}</span>
						activities
					</p>
				</div>

				<div>
					<nav class="isolate inline-flex -space-x-px rounded-md shadow-sm" aria-label="Pagination">
						<button
							type="button"
							disabled={data.currentPage === 1}
							onclick={() => goToPage(data.currentPage - 1)}
							class="relative inline-flex items-center rounded-l-md px-2 py-2 text-muted-foreground ring-1 ring-inset ring-border hover:bg-accent hover:text-accent-foreground focus:z-20 focus:outline-offset-0 disabled:opacity-50 disabled:cursor-not-allowed"
						>
							<span class="sr-only">Previous</span>
							<svg class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
								<path fill-rule="evenodd" d="M12.79 5.23a.75.75 0 01-.02 1.06L8.832 10l3.938 3.71a.75.75 0 11-1.04 1.08l-4.5-4.25a.75.75 0 010-1.08l4.5-4.25a.75.75 0 011.06.02z" clip-rule="evenodd" />
							</svg>
						</button>

						<span class="relative inline-flex items-center px-4 py-2 text-sm font-semibold text-foreground ring-1 ring-inset ring-border bg-card">
							Page {data.currentPage}
						</span>

						<button
							type="button"
							disabled={!data.hasNextPage}
							onclick={() => goToPage(data.currentPage + 1)}
							class="relative inline-flex items-center rounded-r-md px-2 py-2 text-muted-foreground ring-1 ring-inset ring-border hover:bg-accent hover:text-accent-foreground focus:z-20 focus:outline-offset-0 disabled:opacity-50 disabled:cursor-not-allowed"
						>
							<span class="sr-only">Next</span>
							<svg class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
								<path fill-rule="evenodd" d="M7.21 14.77a.75.75 0 01.02-1.06L11.168 10 7.23 6.29a.75.75 0 111.04-1.08l4.5 4.25a.75.75 0 010 1.08l-4.5 4.25a.75.75 0 01-1.06-.02z" clip-rule="evenodd" />
							</svg>
						</button>
					</nav>
				</div>
			</div>
		</div>
	{/if}
</div>
