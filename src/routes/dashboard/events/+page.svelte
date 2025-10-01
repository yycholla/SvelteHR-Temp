<script lang="ts">
	// Events List Page
	// Feature: 019-we-need-to - Task T028
	// Purpose: Display events with filtering and calendar/list views

	import type { PageData } from './$types';
	import EventCard from '$lib/components/events/EventCard.svelte';
	import { goto } from '$app/navigation';
	import { page } from '$app/stores';
	import type { EventVisibilityType, EventStatus, EventType } from '$lib/graphql/types';

	let { data }: { data: PageData } = $props();

	// Filter state
	let selectedVisibility = $state<EventVisibilityType | 'all'>(data.filters.visibility || 'all');
	let selectedStatus = $state<EventStatus | 'all'>(data.filters.status || 'all');
	let selectedType = $state<EventType | 'all'>(data.filters.type || 'all');
	let selectedSort = $state(data.filters.sortBy || 'date');
	let selectedView = $state(data.filters.view || 'list');

	// Handle event click (navigate to event detail)
	function handleEventClick(event: any) {
		goto(`/dashboard/events/${event.id}`);
	}

	// Apply filters
	function applyFilters() {
		const params = new URLSearchParams($page.url.searchParams);

		if (selectedVisibility !== 'all') {
			params.set('visibility', selectedVisibility);
		} else {
			params.delete('visibility');
		}

		if (selectedStatus !== 'all') {
			params.set('status', selectedStatus);
		} else {
			params.delete('status');
		}

		if (selectedType !== 'all') {
			params.set('type', selectedType);
		} else {
			params.delete('type');
		}

		params.set('sort', selectedSort);
		params.set('view', selectedView);
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
	<title>Events - SvelteHR</title>
	<meta name="description" content="View and manage company events" />
</svelte:head>

<div class="container mx-auto max-w-7xl px-4 py-8">
	<!-- Page Header with Actions -->
	<div class="mb-8 flex items-center justify-between">
		<div>
			<h1 class="text-3xl font-bold text-gray-900">Events</h1>
			<p class="mt-2 text-gray-600">View and manage company events</p>
		</div>

		{#if data.canCreateEvents}
			<a
				href="/dashboard/events/create"
				class="inline-flex items-center rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
			>
				<svg
					class="mr-2 h-5 w-5"
					fill="none"
					stroke="currentColor"
					viewBox="0 0 24 24"
					xmlns="http://www.w3.org/2000/svg"
				>
					<path
						stroke-linecap="round"
						stroke-linejoin="round"
						stroke-width="2"
						d="M12 4v16m8-8H4"
					></path>
				</svg>
				Create Event
			</a>
		{/if}
	</div>

	<!-- View Toggle and Filters -->
	<div class="mb-6 rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
		<!-- View Toggle -->
		<div class="mb-4 flex items-center gap-2 border-b border-gray-200 pb-4">
			<span class="text-sm font-medium text-gray-700">View:</span>
			<div class="inline-flex rounded-md shadow-sm" role="group">
				<button
					type="button"
					onclick={() => {
						selectedView = 'list';
						applyFilters();
					}}
					class="rounded-l-md border border-gray-300 px-4 py-2 text-sm font-medium {selectedView ===
					'list'
						? 'bg-blue-600 text-white'
						: 'bg-white text-gray-700 hover:bg-gray-50'}"
				>
					<svg
						class="h-4 w-4 inline-block mr-1"
						fill="none"
						stroke="currentColor"
						viewBox="0 0 24 24"
					>
						<path
							stroke-linecap="round"
							stroke-linejoin="round"
							stroke-width="2"
							d="M4 6h16M4 12h16M4 18h16"
						></path>
					</svg>
					List
				</button>
				<button
					type="button"
					disabled
					title="Calendar view requires EventCalendar component (install FullCalendar)"
					class="rounded-r-md border border-l-0 border-gray-300 px-4 py-2 text-sm font-medium bg-gray-100 text-gray-400 cursor-not-allowed"
				>
					<svg
						class="h-4 w-4 inline-block mr-1"
						fill="none"
						stroke="currentColor"
						viewBox="0 0 24 24"
					>
						<path
							stroke-linecap="round"
							stroke-linejoin="round"
							stroke-width="2"
							d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
						></path>
					</svg>
					Calendar
				</button>
			</div>
		</div>

		<!-- Filters Row -->
		<div class="flex flex-wrap items-end gap-4">
			<!-- Visibility Filter -->
			<div class="flex-1 min-w-[200px]">
				<label for="visibility-filter" class="block text-sm font-medium text-gray-700 mb-1">
					Visibility
				</label>
				<select
					id="visibility-filter"
					bind:value={selectedVisibility}
					onchange={applyFilters}
					class="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
				>
					<option value="all">All Visibility</option>
					<option value="company">Company-Wide</option>
					<option value="department">Department</option>
					<option value="specific">Specific People</option>
				</select>
			</div>

			<!-- Status Filter -->
			<div class="flex-1 min-w-[200px]">
				<label for="status-filter" class="block text-sm font-medium text-gray-700 mb-1">
					Status
				</label>
				<select
					id="status-filter"
					bind:value={selectedStatus}
					onchange={applyFilters}
					class="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
				>
					<option value="all">All Statuses</option>
					<option value="draft">Draft</option>
					<option value="scheduled">Scheduled</option>
					<option value="ongoing">Ongoing</option>
					<option value="completed">Completed</option>
					<option value="cancelled">Cancelled</option>
				</select>
			</div>

			<!-- Event Type Filter -->
			<div class="flex-1 min-w-[200px]">
				<label for="type-filter" class="block text-sm font-medium text-gray-700 mb-1">
					Event Type
				</label>
				<select
					id="type-filter"
					bind:value={selectedType}
					onchange={applyFilters}
					class="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
				>
					<option value="all">All Types</option>
					<option value="meeting">Meeting</option>
					<option value="training">Training</option>
					<option value="social">Social</option>
					<option value="conference">Conference</option>
					<option value="other">Other</option>
				</select>
			</div>

			<!-- Sort Order -->
			<div class="flex-1 min-w-[200px]">
				<label for="sort-filter" class="block text-sm font-medium text-gray-700 mb-1">
					Sort By
				</label>
				<select
					id="sort-filter"
					bind:value={selectedSort}
					onchange={applyFilters}
					class="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
				>
					<option value="date">Event Date</option>
					<option value="created">Created Date</option>
					<option value="title">Title</option>
				</select>
			</div>

			<!-- Reset Filters Button -->
			<div>
				<button
					type="button"
					onclick={() => goto('/dashboard/events')}
					class="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
				>
					Reset
				</button>
			</div>
		</div>
	</div>

	<!-- Statistics Summary -->
	<div class="mb-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
		<div class="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
			<div class="text-2xl font-bold text-gray-900">{data.statistics.total}</div>
			<div class="text-sm text-gray-600">Total Events</div>
		</div>

		<div class="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
			<div class="text-2xl font-bold text-blue-600">{data.statistics.upcoming}</div>
			<div class="text-sm text-gray-600">Upcoming</div>
		</div>

		<div class="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
			<div class="text-2xl font-bold text-purple-600">{data.statistics.myEvents}</div>
			<div class="text-sm text-gray-600">My Events</div>
		</div>

		<div class="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
			<div class="text-2xl font-bold text-green-600">{data.statistics.accepted}</div>
			<div class="text-sm text-gray-600">Accepted</div>
		</div>
	</div>

	<!-- Events List -->
	<div class="mb-6">
		{#if data.events.length === 0}
			<div class="rounded-lg border border-gray-200 bg-white p-12 text-center">
				<svg
					class="mx-auto h-12 w-12 text-gray-400"
					fill="none"
					stroke="currentColor"
					viewBox="0 0 24 24"
				>
					<path
						stroke-linecap="round"
						stroke-linejoin="round"
						stroke-width="2"
						d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
					></path>
				</svg>
				<p class="mt-4 text-lg font-medium text-gray-900">No events found</p>
				<p class="mt-2 text-sm text-gray-600">
					{#if data.canCreateEvents}
						Try adjusting your filters or create a new event to get started.
					{:else}
						Try adjusting your filters or check back later for new events.
					{/if}
				</p>
			</div>
		{:else}
			<div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
				{#each data.events as event}
					<EventCard
						{event}
						userId={data.user.id}
						onClick={() => handleEventClick(event)}
						showRsvp={true}
						compact={false}
					/>
				{/each}
			</div>
		{/if}
	</div>

	<!-- Pagination -->
	{#if data.totalCount > data.limit}
		<div
			class="flex items-center justify-between border-t border-gray-200 bg-white px-4 py-3 sm:px-6"
		>
			<div class="flex flex-1 justify-between sm:hidden">
				<button
					type="button"
					disabled={data.currentPage === 1}
					onclick={() => goToPage(data.currentPage - 1)}
					class="relative inline-flex items-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
				>
					Previous
				</button>
				<button
					type="button"
					disabled={!data.hasNextPage}
					onclick={() => goToPage(data.currentPage + 1)}
					class="relative ml-3 inline-flex items-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
				>
					Next
				</button>
			</div>

			<div class="hidden sm:flex sm:flex-1 sm:items-center sm:justify-between">
				<div>
					<p class="text-sm text-gray-700">
						Showing
						<span class="font-medium">{(data.currentPage - 1) * data.limit + 1}</span>
						to
						<span class="font-medium"
							>{Math.min(data.currentPage * data.limit, data.totalCount)}</span
						>
						of
						<span class="font-medium">{data.totalCount}</span>
						events
					</p>
				</div>

				<div>
					<nav
						class="isolate inline-flex -space-x-px rounded-md shadow-sm"
						aria-label="Pagination"
					>
						<button
							type="button"
							disabled={data.currentPage === 1}
							onclick={() => goToPage(data.currentPage - 1)}
							class="relative inline-flex items-center rounded-l-md px-2 py-2 text-gray-400 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus:z-20 focus:outline-offset-0 disabled:opacity-50 disabled:cursor-not-allowed"
						>
							<span class="sr-only">Previous</span>
							<svg class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
								<path
									fill-rule="evenodd"
									d="M12.79 5.23a.75.75 0 01-.02 1.06L8.832 10l3.938 3.71a.75.75 0 11-1.04 1.08l-4.5-4.25a.75.75 0 010-1.08l4.5-4.25a.75.75 0 011.06.02z"
									clip-rule="evenodd"
								/>
							</svg>
						</button>

						<span
							class="relative inline-flex items-center px-4 py-2 text-sm font-semibold text-gray-900 ring-1 ring-inset ring-gray-300"
						>
							Page {data.currentPage}
						</span>

						<button
							type="button"
							disabled={!data.hasNextPage}
							onclick={() => goToPage(data.currentPage + 1)}
							class="relative inline-flex items-center rounded-r-md px-2 py-2 text-gray-400 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus:z-20 focus:outline-offset-0 disabled:opacity-50 disabled:cursor-not-allowed"
						>
							<span class="sr-only">Next</span>
							<svg class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
								<path
									fill-rule="evenodd"
									d="M7.21 14.77a.75.75 0 01.02-1.06L11.168 10 7.23 6.29a.75.75 0 111.04-1.08l4.5 4.25a.75.75 0 010 1.08l-4.5 4.25a.75.75 0 01-1.06-.02z"
									clip-rule="evenodd"
								/>
							</svg>
						</button>
					</nav>
				</div>
			</div>
		</div>
	{/if}
</div>
