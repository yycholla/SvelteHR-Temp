<script lang="ts">
	import { Plus, ChevronLeft, ChevronRight, Trash2 } from 'lucide-svelte';
	import Button from '$lib/components/ui/button/button.svelte';
	import Calendar from '$lib/components/ui/calendar/Calendar.svelte';
	import { getLocalTimeZone, today, startOfWeek } from '@internationalized/date';
	import { eventTypeColors, type Event } from '$lib/schemas/event';
	import { goto } from '$app/navigation';
	import type { PageData } from './$types';
	import { CreateEventDialog } from '$lib/components/calendar';

	interface Props {
		data: PageData;
	}

	let { data }: Props = $props();

	let selectedDate = $state(today(getLocalTimeZone()));
	let currentView = $state<'month' | 'week' | 'day'>(data.initialView || 'month');
	let events = $state<Event[]>(data.events || []);
	let loading = $state(false);
	let error = $state<string | null>(data.error || null);
	let newEventOpen = $state(false);

	// Get current week dates for week view
	let weekStart = $derived(startOfWeek(selectedDate, 'en-US'));
	let weekDays = $derived(Array.from({ length: 7 }, (_, i) => weekStart.add({ days: i })));

	// Hours for day/week view
	const hours = Array.from({ length: 24 }, (_, i) => {
		const hour = i === 0 ? 12 : i > 12 ? i - 12 : i;
		const ampm = i < 12 ? 'AM' : 'PM';
		return { value: i, display: `${hour}:00 ${ampm}` };
	});

	// Load events for different date ranges by navigating to server endpoint
	async function loadEvents() {
		loading = true;
		error = null;

		try {
			let startDate: string;
			let endDate: string;

			if (currentView === 'month') {
				// Load events for the entire month
				const monthStart = selectedDate.set({ day: 1 });
				const monthEnd = monthStart.add({ months: 1 }).subtract({ days: 1 });
				startDate = monthStart.toString();
				endDate = monthEnd.toString();
			} else if (currentView === 'week') {
				// Load events for the current week
				const weekEnd = weekStart.add({ days: 6 });
				startDate = weekStart.toString();
				endDate = weekEnd.toString();
			} else {
				// Load events for the selected day
				startDate = selectedDate.toString();
				endDate = selectedDate.toString();
			}

			console.log('📅 Loading events for date range:', { startDate, endDate, view: currentView });

			// Navigate to reload page with new date parameters (server-side data loading)
			const params = new URLSearchParams();
			params.append('startDate', startDate);
			params.append('endDate', endDate);
			params.append('view', currentView);

			await goto(`/calendar?${params.toString()}`, {
				replaceState: false,
				noScroll: true
			});
		} catch (err: any) {
			console.error('❌ Failed to load events:', err);
			error = 'Failed to load events. Please try again.';
		} finally {
			loading = false;
		}
	}

	// Get events for a specific date and hour
	function getEventsForDateTime(date: any, hour?: number): Event[] {
		return events.filter((event) => {
			const eventStart = new Date(event.startDate);
			const eventEnd = new Date(event.endDate);
			const targetDate = date.toDate ? date.toDate(getLocalTimeZone()) : date;

			// Check if event occurs on this date
			const eventDateStart = new Date(
				eventStart.getFullYear(),
				eventStart.getMonth(),
				eventStart.getDate()
			);
			const targetDateStart = new Date(
				targetDate.getFullYear(),
				targetDate.getMonth(),
				targetDate.getDate()
			);

			if (eventDateStart.getTime() !== targetDateStart.getTime()) {
				return false;
			}

			// If hour is specified, check if event occurs during this hour
			if (hour !== undefined && !event.allDay) {
				const eventHour = eventStart.getHours();
				return eventHour === hour;
			}

			return true;
		});
	}

	// Get events for today (for sidebar)
	function getTodaysEvents(): Event[] {
		const todayDate = today(getLocalTimeZone());
		return getEventsForDateTime(todayDate);
	}

	// Delete event using form action
	function deleteEvent(eventId: number) {
		// Remove the event optimistically from the UI
		events = events.filter((e) => e.id !== eventId);

		// Submit the delete form (will be handled server-side)
		const form = document.createElement('form');
		form.method = 'POST';
		form.action = '?/deleteEvent';

		const eventIdInput = document.createElement('input');
		eventIdInput.type = 'hidden';
		eventIdInput.name = 'eventId';
		eventIdInput.value = eventId.toString();

		form.appendChild(eventIdInput);
		document.body.appendChild(form);
		form.submit();
		document.body.removeChild(form);
	}

	// Format event time
	function formatEventTime(event: Event): string {
		if (event.allDay) return 'All day';

		const start = new Date(event.startDate);
		const end = new Date(event.endDate);

		// Check if dates are valid
		if (isNaN(start.getTime()) || isNaN(end.getTime())) {
			console.warn('Invalid date detected:', {
				startDate: event.startDate,
				endDate: event.endDate
			});
			return 'Invalid date';
		}

		return `${start.toLocaleTimeString('en-US', {
			hour: 'numeric',
			minute: '2-digit',
			hour12: true
		})} - ${end.toLocaleTimeString('en-US', {
			hour: 'numeric',
			minute: '2-digit',
			hour12: true
		})}`;
	}

	// Load events when view or date changes (manually triggered)
	// Note: Initial events are loaded server-side via +page.server.ts

	// Debug: Log events when they change
	$effect(() => {
		if (events.length > 0) {
			console.log('📅 Events updated:', events);
			console.log(
				'📅 First event dates:',
				events[0]
					? {
							startDate: events[0].startDate,
							endDate: events[0].endDate,
							startDateParsed: new Date(events[0].startDate),
							endDateParsed: new Date(events[0].endDate)
						}
					: 'No events'
			);
		}
	});
</script>

<svelte:head>
	<title>Calendar - SvelteHR</title>
</svelte:head>

<div class="container mx-auto px-6 pt-6 pb-6">
	<!-- Page Header -->
	<div class="mb-8">
		<div class="flex items-center justify-between">
			<div>
				<h1
					class="bg-gradient-to-r from-foreground to-foreground/80 bg-clip-text text-3xl font-bold text-transparent"
				>
					Calendar
				</h1>
				<p class="mt-1 text-muted-foreground">Manage events, meetings, and time off</p>
			</div>

			<div class="flex items-center space-x-3">
				<Button
					variant="outline"
					class="rounded-xl"
					onclick={() => (selectedDate = today(getLocalTimeZone()))}
				>
					Today
				</Button>
				<div
					class="flex items-center rounded-xl border border-border/40 bg-background/20 p-1 backdrop-blur-sm"
				>
					<Button
						variant={currentView === 'month' ? 'default' : 'ghost'}
						size="sm"
						class="rounded-lg"
						onclick={() => (currentView = 'month')}
					>
						Month
					</Button>
					<Button
						variant={currentView === 'week' ? 'default' : 'ghost'}
						size="sm"
						class="rounded-lg"
						onclick={() => (currentView = 'week')}
					>
						Week
					</Button>
					<Button
						variant={currentView === 'day' ? 'default' : 'ghost'}
						size="sm"
						class="rounded-lg"
						onclick={() => (currentView = 'day')}
					>
						Day
					</Button>
				</div>
				<Button class="rounded-xl" onclick={() => (newEventOpen = true)}>
					<Plus class="mr-2 h-4 w-4" />
					New Event
				</Button>
			</div>
		</div>
	</div>

	<!-- Calendar Content -->
	{#if currentView === 'month'}
		<div class="flex flex-col gap-6 lg:flex-row">
			<!-- Month Calendar -->
			<div class="flex-1">
				<Calendar bind:value={selectedDate} class="w-full" />
			</div>

			<!-- Events Sidebar -->
			<div class="lg:w-96">
				<div
					class="rounded-2xl border border-border/40 bg-background/20 p-6 shadow-xl backdrop-blur-md"
				>
					<div class="mb-4 flex items-center justify-between">
						<h3 class="text-lg font-semibold">Events</h3>
						<Button size="sm" class="rounded-xl" onclick={() => (newEventOpen = true)}>
							<Plus class="h-4 w-4" />
						</Button>
					</div>

					{#if loading}
						<div class="py-8 text-center">
							<div class="text-muted-foreground">Loading events...</div>
						</div>
					{:else if error}
						<div class="py-8 text-center">
							<div class="text-sm text-destructive">{error}</div>
							<Button variant="outline" size="sm" class="mt-2" onclick={loadEvents}>Retry</Button>
						</div>
					{:else}
						{@const todaysEvents = getTodaysEvents()}
						<div class="space-y-3">
							<!-- Today's Events -->
							{#if todaysEvents.length > 0}
								<div class="mb-2 text-sm text-muted-foreground">Today</div>
								<div class="space-y-2">
									{#each todaysEvents as event}
										<div
											class="group rounded-xl border border-border/40 bg-background/30 p-3 backdrop-blur-sm transition-all duration-200 hover:bg-background/50"
										>
											<div class="flex items-center justify-between">
												<div class="min-w-0 flex-1">
													<div class="truncate text-sm font-medium">{event.title}</div>
													<div class="text-xs text-muted-foreground">{formatEventTime(event)}</div>
													{#if event.location}
														<div class="text-xs text-muted-foreground/80">{event.location}</div>
													{/if}
												</div>
												<div class="ml-2 flex items-center space-x-2">
													<div
														class="h-2 w-2 rounded-full"
														style="background-color: {event.color || eventTypeColors[event.type]}"
													></div>
													<Button
														variant="ghost"
														size="sm"
														class="h-6 w-6 p-0 opacity-0 transition-opacity group-hover:opacity-100"
														onclick={() => deleteEvent(event.id)}
													>
														<Trash2 class="h-3 w-3" />
													</Button>
												</div>
											</div>
										</div>
									{/each}
								</div>
							{/if}

							<!-- All Events (if no today events or for other dates) -->
							{#if todaysEvents.length === 0 && events.length > 0}
								<div class="mb-2 text-sm text-muted-foreground">Events</div>
								<div class="max-h-96 space-y-2 overflow-y-auto">
									{#each events as event}
										<div
											class="group rounded-xl border border-border/40 bg-background/30 p-3 backdrop-blur-sm transition-all duration-200 hover:bg-background/50"
										>
											<div class="flex items-center justify-between">
												<div class="min-w-0 flex-1">
													<div class="truncate text-sm font-medium">{event.title}</div>
													<div class="text-xs text-muted-foreground">
														{new Date(event.startDate).toLocaleDateString('en-US', {
															month: 'short',
															day: 'numeric'
														})}
														{formatEventTime(event)}
													</div>
													{#if event.location}
														<div class="text-xs text-muted-foreground/80">{event.location}</div>
													{/if}
												</div>
												<div class="ml-2 flex items-center space-x-2">
													<div
														class="h-2 w-2 rounded-full"
														style="background-color: {event.color || eventTypeColors[event.type]}"
													></div>
													<Button
														variant="ghost"
														size="sm"
														class="h-6 w-6 p-0 opacity-0 transition-opacity group-hover:opacity-100"
														onclick={() => deleteEvent(event.id)}
													>
														<Trash2 class="h-3 w-3" />
													</Button>
												</div>
											</div>
										</div>
									{/each}
								</div>
							{:else if todaysEvents.length === 0 && events.length === 0}
								<div class="py-8 text-center text-muted-foreground">
									<div class="text-sm">No events found</div>
									<div class="mt-1 text-xs">Create an event to get started</div>
								</div>
							{/if}
						</div>
					{/if}

					<div class="mt-6 border-t border-border/40 pt-4">
						<Button variant="outline" class="w-full rounded-xl">View All Events</Button>
					</div>
				</div>
			</div>
		</div>
	{:else if currentView === 'week'}
		<!-- Week View -->
		<div
			class="rounded-2xl border border-border/40 bg-background/20 p-6 shadow-xl backdrop-blur-md"
		>
			<!-- Week Header -->
			<div class="mb-6 flex items-center justify-between">
				<h2
					class="bg-gradient-to-r from-foreground to-foreground/80 bg-clip-text text-2xl font-bold text-transparent"
				>
					{weekStart
						.toDate(getLocalTimeZone())
						.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
				</h2>
				<div class="flex items-center space-x-2">
					<Button
						variant="ghost"
						size="sm"
						class="rounded-xl"
						onclick={() => (selectedDate = selectedDate.subtract({ weeks: 1 }))}
					>
						<ChevronLeft class="h-4 w-4" />
					</Button>
					<Button
						variant="ghost"
						size="sm"
						class="rounded-xl"
						onclick={() => (selectedDate = selectedDate.add({ weeks: 1 }))}
					>
						<ChevronRight class="h-4 w-4" />
					</Button>
				</div>
			</div>

			<!-- Week Grid -->
			<div
				class="overflow-hidden rounded-xl border border-border/60 bg-background/10 backdrop-blur-sm"
			>
				<div class="grid grid-cols-8">
					<!-- Time column header -->
					<div
						class="border-r border-b border-border/60 bg-background/30 p-3 text-center font-semibold text-muted-foreground backdrop-blur-sm"
					></div>
					<!-- Day headers -->
					{#each weekDays as day, i}
						<div
							class="border-b border-border/60 bg-background/30 p-3 text-center backdrop-blur-sm {i <
							6
								? 'border-r border-border/60'
								: ''}"
						>
							<div class="font-semibold">
								{day.toDate(getLocalTimeZone()).toLocaleDateString('en-US', { weekday: 'short' })}
							</div>
							<div
								class="text-lg {day.compare(today(getLocalTimeZone())) === 0
									? 'font-bold text-primary'
									: ''}"
							>
								{day.day}
							</div>
						</div>
					{/each}
				</div>

				<!-- Time slots -->
				{#each hours.slice(8, 18) as hour, hourIndex}
					<div class="grid grid-cols-8 {hourIndex < 9 ? 'border-b border-border/40' : ''}">
						<div
							class="border-r border-border/60 bg-background/20 p-3 text-right text-sm text-muted-foreground backdrop-blur-sm"
						>
							{hour.display}
						</div>
						{#each weekDays as day, dayIndex}
							{@const dayEvents = getEventsForDateTime(day, hour.value)}
							<div
								class="relative min-h-16 bg-background/5 p-1 backdrop-blur-sm transition-colors hover:bg-background/20 {dayIndex <
								6
									? 'border-r border-border/40'
									: ''}"
							>
								<!-- Real events -->
								{#each dayEvents as event}
									<div
										class="group mb-1 cursor-pointer rounded-lg p-2 text-xs text-white shadow-sm backdrop-blur-sm"
										style="background-color: {event.color || eventTypeColors[event.type]}80"
										title={event.description || event.title}
									>
										<div class="flex items-center justify-between">
											<span class="flex-1 truncate">{event.title}</span>
											<Button
												variant="ghost"
												size="sm"
												class="ml-1 h-4 w-4 p-0 opacity-0 transition-opacity group-hover:opacity-100"
												onclick={(e) => {
													e.stopPropagation();
													deleteEvent(event.id);
												}}
											>
												<Trash2 class="h-2 w-2" />
											</Button>
										</div>
										{#if event.location}
											<div class="truncate text-xs opacity-80">{event.location}</div>
										{/if}
									</div>
								{/each}
							</div>
						{/each}
					</div>
				{/each}
			</div>
		</div>
	{:else if currentView === 'day'}
		<!-- Day View -->
		<div
			class="rounded-2xl border border-border/40 bg-background/20 p-6 shadow-xl backdrop-blur-md"
		>
			<!-- Day Header -->
			<div class="mb-6 flex items-center justify-between">
				<h2
					class="bg-gradient-to-r from-foreground to-foreground/80 bg-clip-text text-2xl font-bold text-transparent"
				>
					{selectedDate
						.toDate(getLocalTimeZone())
						.toLocaleDateString('en-US', {
							weekday: 'long',
							month: 'long',
							day: 'numeric',
							year: 'numeric'
						})}
				</h2>
				<div class="flex items-center space-x-2">
					<Button
						variant="ghost"
						size="sm"
						class="rounded-xl"
						onclick={() => (selectedDate = selectedDate.subtract({ days: 1 }))}
					>
						<ChevronLeft class="h-4 w-4" />
					</Button>
					<Button
						variant="ghost"
						size="sm"
						class="rounded-xl"
						onclick={() => (selectedDate = selectedDate.add({ days: 1 }))}
					>
						<ChevronRight class="h-4 w-4" />
					</Button>
				</div>
			</div>

			<!-- Day Schedule -->
			<div
				class="overflow-hidden rounded-xl border border-border/60 bg-background/10 backdrop-blur-sm"
			>
				{#each hours as hour, hourIndex}
					{@const hourEvents = getEventsForDateTime(selectedDate, hour.value)}
					<div class="grid grid-cols-12 {hourIndex < 23 ? 'border-b border-border/40' : ''}">
						<!-- Time column -->
						<div
							class="col-span-2 flex h-16 items-start border-r border-border/60 bg-background/20 p-3 pt-2 text-right text-sm text-muted-foreground backdrop-blur-sm"
						>
							{hour.display}
						</div>

						<!-- Events column -->
						<div
							class="relative col-span-10 h-16 bg-background/5 p-1 backdrop-blur-sm transition-colors hover:bg-background/20"
						>
							<!-- Real events -->
							{#each hourEvents as event}
								<div
									class="group absolute inset-x-2 top-1 bottom-1 z-10 cursor-pointer rounded-xl border p-3 backdrop-blur-sm"
									style="background-color: {event.color ||
										eventTypeColors[event.type]}20; border-color: {event.color ||
										eventTypeColors[event.type]}40"
									title={event.description || event.title}
								>
									<div class="flex items-center justify-between">
										<div class="min-w-0 flex-1">
											<div class="truncate text-sm font-semibold">{event.title}</div>
											<div class="text-xs text-muted-foreground">{formatEventTime(event)}</div>
											{#if event.location}
												<div class="truncate text-xs text-muted-foreground/80">
													{event.location}
												</div>
											{/if}
										</div>
										<Button
											variant="ghost"
											size="sm"
											class="ml-2 h-6 w-6 p-0 opacity-0 transition-opacity group-hover:opacity-100"
											onclick={(e) => {
												e.stopPropagation();
												deleteEvent(event.id);
											}}
										>
											<Trash2 class="h-3 w-3" />
										</Button>
									</div>
								</div>
							{/each}
						</div>
					</div>
				{/each}
			</div>
		</div>
	{/if}
</div>

<!-- Create Event Dialog -->
<CreateEventDialog bind:open={newEventOpen} onClose={() => (newEventOpen = false)} />
