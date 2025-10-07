<script lang="ts">
	// Events List Page
	// Feature: 019-we-need-to - Task T028
	// Purpose: Display events with filtering and calendar/list views

	import type { PageData } from './$types';
	import EventCard from '$lib/components/events/EventCard.svelte';
	import EventCalendar from '$lib/components/events/EventCalendar.svelte';
	import { goto } from '$app/navigation';
	import { page } from '$app/stores';
	import type { EventVisibilityType, EventStatus, EventType } from '$lib/graphql/types';
	import { Calendar, Copy, Check } from 'lucide-svelte';

	let { data }: { data: PageData } = $props();

	// iCal link state
	let showICalDialog = $state(false);
	let iCalLinkCopied = $state(false);
	const iCalLink = $derived(`${$page.url.origin}/api/calendar/events.ics`);

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

	// Format date to local ISO string (for URL parameter)
	function formatLocalISO(date: Date): string {
		const year = date.getFullYear();
		const month = String(date.getMonth() + 1).padStart(2, '0');
		const day = String(date.getDate()).padStart(2, '0');
		const hours = String(date.getHours()).padStart(2, '0');
		const minutes = String(date.getMinutes()).padStart(2, '0');
		const seconds = String(date.getSeconds()).padStart(2, '0');

		return `${year}-${month}-${day}T${hours}:${minutes}:${seconds}`;
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

	// Copy iCal link to clipboard
	async function copyICalLink() {
		try {
			await navigator.clipboard.writeText(iCalLink);
			iCalLinkCopied = true;
			setTimeout(() => {
				iCalLinkCopied = false;
			}, 2000);
		} catch (err) {
			console.error('Failed to copy link:', err);
		}
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
			<h1 class="text-3xl font-bold text-foreground">Events</h1>
			<p class="mt-2 text-muted-foreground">View and manage company events</p>
		</div>

		<div class="flex items-center gap-3">
			<!-- iCal Subscribe Button -->
			<button
				onclick={() => (showICalDialog = !showICalDialog)}
				class="inline-flex items-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium text-foreground hover:bg-accent hover:text-accent-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
			>
				<Calendar class="mr-2 h-4 w-4" />
				Calendar Feed
			</button>

			{#if data.canCreateEvents}
				<a
					href="/dashboard/events/create"
					class="inline-flex items-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
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
	</div>

	<!-- iCal Link Dialog -->
	{#if showICalDialog}
		<div class="mb-6 rounded-lg border border-primary/20 bg-card p-6 shadow-lg">
			<div class="mb-4 flex items-start justify-between">
				<div>
					<h3 class="text-lg font-semibold text-card-foreground">Calendar Feed</h3>
					<p class="mt-1 text-sm text-muted-foreground">
						Subscribe to this calendar feed in your calendar application
					</p>
				</div>
				<button
					onclick={() => (showICalDialog = false)}
					class="text-muted-foreground hover:text-foreground"
				>
					<svg
						class="h-5 w-5"
						fill="none"
						stroke="currentColor"
						viewBox="0 0 24 24"
						xmlns="http://www.w3.org/2000/svg"
					>
						<path
							stroke-linecap="round"
							stroke-linejoin="round"
							stroke-width="2"
							d="M6 18L18 6M6 6l12 12"
						></path>
					</svg>
				</button>
			</div>

			<div class="space-y-4">
				<!-- Copy Link Section -->
				<div>
					<label class="mb-2 block text-sm font-medium text-card-foreground"
						>iCal Feed URL</label
					>
					<div class="flex items-center gap-2">
						<input
							type="text"
							readonly
							value={iCalLink}
							class="flex-1 rounded-md border border-input bg-muted px-3 py-2 text-sm text-foreground dark:bg-input/80"
						/>
						<button
							onclick={copyICalLink}
							class="inline-flex items-center rounded-md border border-input bg-background px-3 py-2 text-sm font-medium text-foreground hover:bg-accent hover:text-accent-foreground focus:outline-none focus:ring-2 focus:ring-ring"
						>
							{#if iCalLinkCopied}
								<Check class="h-4 w-4" />
							{:else}
								<Copy class="h-4 w-4" />
							{/if}
						</button>
					</div>
					<p class="mt-2 text-xs text-muted-foreground">
						Copy this URL to subscribe in Google Calendar, Apple Calendar, Outlook, or any
						iCal-compatible application
					</p>
				</div>

				<!-- Quick Actions -->
				<div class="flex items-center gap-3 border-t pt-4">
					<a
						href={iCalLink}
						download="sveltehr-events.ics"
						class="inline-flex items-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-ring"
					>
						<Calendar class="mr-2 h-4 w-4" />
						Download .ics File
					</a>
					<div class="text-xs text-muted-foreground">
						or copy the URL above to subscribe
					</div>
				</div>

				<!-- Instructions -->
				<div class="rounded-md bg-muted p-4 dark:bg-input/30">
					<h4 class="mb-2 text-sm font-semibold text-card-foreground">How to Subscribe:</h4>
					<ul class="space-y-1 text-xs text-muted-foreground">
						<li>• <strong>Google Calendar:</strong> Settings → Add calendar → From URL</li>
						<li>
							• <strong>Apple Calendar:</strong> File → New Calendar Subscription → Paste URL
						</li>
						<li>
							• <strong>Outlook:</strong> Add calendar → Subscribe from web → Paste URL
						</li>
					</ul>
				</div>
			</div>
		</div>
	{/if}

	<!-- View Toggle and Filters -->
	<div class="mb-6 rounded-lg border bg-card p-4 shadow-sm">
		<!-- View Toggle -->
		<div class="mb-4 flex items-center gap-2 border-b pb-4">
			<span class="text-sm font-medium text-card-foreground">View:</span>
			<div class="inline-flex rounded-md shadow-sm" role="group">
				<button
					type="button"
					onclick={() => {
						selectedView = 'list';
						applyFilters();
					}}
					class="rounded-l-md border px-4 py-2 text-sm font-medium {selectedView ===
					'list'
						? 'bg-primary text-primary-foreground'
						: 'bg-background text-foreground hover:bg-accent'}"
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
					onclick={() => {
						selectedView = 'calendar';
						applyFilters();
					}}
					class="rounded-r-md border border-l-0 px-4 py-2 text-sm font-medium {selectedView ===
					'calendar'
						? 'bg-primary text-primary-foreground'
						: 'bg-background text-foreground hover:bg-accent'}"
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
				<label for="visibility-filter" class="block text-sm font-medium text-foreground mb-1">
					Visibility
				</label>
				<select
					id="visibility-filter"
					bind:value={selectedVisibility}
					onchange={applyFilters}
					class="w-full rounded-md border bg-background px-3 py-2 text-sm focus:border-ring focus:outline-none focus:ring-1 focus:ring-ring"
				>
					<option value="all">All Visibility</option>
					<option value="company">Company-Wide</option>
					<option value="department">Department</option>
					<option value="specific">Specific People</option>
				</select>
			</div>

			<!-- Status Filter -->
			<div class="flex-1 min-w-[200px]">
				<label for="status-filter" class="block text-sm font-medium text-foreground mb-1">
					Status
				</label>
				<select
					id="status-filter"
					bind:value={selectedStatus}
					onchange={applyFilters}
					class="w-full rounded-md border bg-background px-3 py-2 text-sm focus:border-ring focus:outline-none focus:ring-1 focus:ring-ring"
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
				<label for="type-filter" class="block text-sm font-medium text-foreground mb-1">
					Event Type
				</label>
				<select
					id="type-filter"
					bind:value={selectedType}
					onchange={applyFilters}
					class="w-full rounded-md border bg-background px-3 py-2 text-sm focus:border-ring focus:outline-none focus:ring-1 focus:ring-ring"
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
				<label for="sort-filter" class="block text-sm font-medium text-foreground mb-1">
					Sort By
				</label>
				<select
					id="sort-filter"
					bind:value={selectedSort}
					onchange={applyFilters}
					class="w-full rounded-md border bg-background px-3 py-2 text-sm focus:border-ring focus:outline-none focus:ring-1 focus:ring-ring"
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
					class="rounded-md border bg-background px-4 py-2 text-sm font-medium text-foreground hover:bg-accent focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
				>
					Reset
				</button>
			</div>
		</div>
	</div>

	<!-- Statistics Summary -->
	<div class="mb-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
		<div class="rounded-lg border bg-card p-4 shadow-sm">
			<div class="text-2xl font-bold text-card-foreground">{data.statistics.total}</div>
			<div class="text-sm text-muted-foreground">Total Events</div>
		</div>

		<div class="rounded-lg border bg-card p-4 shadow-sm">
			<div class="text-2xl font-bold text-primary">{data.statistics.upcoming}</div>
			<div class="text-sm text-muted-foreground">Upcoming</div>
		</div>

		<div class="rounded-lg border bg-card p-4 shadow-sm">
			<div class="text-2xl font-bold" style="color: hsl(var(--chart-4))">{data.statistics.myEvents}</div>
			<div class="text-sm text-muted-foreground">My Events</div>
		</div>

		<div class="rounded-lg border bg-card p-4 shadow-sm">
			<div class="text-2xl font-bold" style="color: hsl(var(--chart-2))">{data.statistics.accepted}</div>
			<div class="text-sm text-muted-foreground">Accepted</div>
		</div>
	</div>

	<!-- Events List or Calendar -->
	<div class="mb-6">
		{#if selectedView === 'calendar'}
			<!-- Always show calendar view when selected, even with no events -->
			<EventCalendar
				events={data.events}
				userId={data.user.id}
				canManageEvents={data.canCreateEvents}
				onEventClick={handleEventClick}
				onDateClick={(date) => {
					// Navigate to create event page with pre-filled date (local time)
					goto(`/dashboard/events/create?date=${formatLocalISO(date)}`);
				}}
				onDateSelect={(start, end, allDay) => {
					// Navigate to create event page with pre-filled start and end times
					const params = new URLSearchParams();
					params.set('start', formatLocalISO(start));
					params.set('end', formatLocalISO(end));
					if (allDay) params.set('allDay', 'true');
					goto(`/dashboard/events/create?${params.toString()}`);
				}}
				onEventDrop={(eventId, newStart, newEnd) => {
					// Handle event drag-and-drop
					console.log('Event dropped:', eventId, newStart, newEnd);
					// TODO: Implement event update mutation
				}}
				visibilityFilter={selectedVisibility === 'all' ? 'all' : selectedVisibility}
			/>
		{:else if data.events.length === 0}
			<div class="rounded-lg border bg-card p-12 text-center">
				<svg
					class="mx-auto h-12 w-12 text-muted-foreground"
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
				<p class="mt-4 text-lg font-medium text-card-foreground">No events found</p>
				<p class="mt-2 text-sm text-muted-foreground">
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
			class="flex items-center justify-between border-t bg-card px-4 py-3 sm:px-6"
		>
			<div class="flex flex-1 justify-between sm:hidden">
				<button
					type="button"
					disabled={data.currentPage === 1}
					onclick={() => goToPage(data.currentPage - 1)}
					class="relative inline-flex items-center rounded-md border bg-background px-4 py-2 text-sm font-medium text-foreground hover:bg-accent disabled:opacity-50 disabled:cursor-not-allowed"
				>
					Previous
				</button>
				<button
					type="button"
					disabled={!data.hasNextPage}
					onclick={() => goToPage(data.currentPage + 1)}
					class="relative ml-3 inline-flex items-center rounded-md border bg-background px-4 py-2 text-sm font-medium text-foreground hover:bg-accent disabled:opacity-50 disabled:cursor-not-allowed"
				>
					Next
				</button>
			</div>

			<div class="hidden sm:flex sm:flex-1 sm:items-center sm:justify-between">
				<div>
					<p class="text-sm text-muted-foreground">
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
							class="relative inline-flex items-center rounded-l-md px-2 py-2 text-muted-foreground ring-1 ring-inset ring-border hover:bg-accent focus:z-20 focus:outline-offset-0 disabled:opacity-50 disabled:cursor-not-allowed"
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
							class="relative inline-flex items-center px-4 py-2 text-sm font-semibold text-foreground ring-1 ring-inset ring-border"
						>
							Page {data.currentPage}
						</span>

						<button
							type="button"
							disabled={!data.hasNextPage}
							onclick={() => goToPage(data.currentPage + 1)}
							class="relative inline-flex items-center rounded-r-md px-2 py-2 text-muted-foreground ring-1 ring-inset ring-border hover:bg-accent focus:z-20 focus:outline-offset-0 disabled:opacity-50 disabled:cursor-not-allowed"
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
