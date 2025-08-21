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
		return events.filter(event => {
			const eventStart = new Date(event.startDate);
			const eventEnd = new Date(event.endDate);
			const targetDate = date.toDate ? date.toDate(getLocalTimeZone()) : date;

			// Check if event occurs on this date
			const eventDateStart = new Date(eventStart.getFullYear(), eventStart.getMonth(), eventStart.getDate());
			const targetDateStart = new Date(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate());

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
		events = events.filter(e => e.id !== eventId);

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
			console.warn('Invalid date detected:', { startDate: event.startDate, endDate: event.endDate });
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
			console.log('📅 First event dates:', events[0] ? {
				startDate: events[0].startDate,
				endDate: events[0].endDate,
				startDateParsed: new Date(events[0].startDate),
				endDateParsed: new Date(events[0].endDate)
			} : 'No events');
		}
	});
</script>

<svelte:head>
	<title>Calendar - SvelteHR</title>
</svelte:head>

<div class="container mx-auto px-6 pb-6 pt-6">
	<!-- Page Header -->
	<div class="mb-8">
		<div class="flex items-center justify-between">
			<div>
				<h1 class="text-3xl font-bold bg-gradient-to-r from-foreground to-foreground/80 bg-clip-text text-transparent">
					Calendar
				</h1>
				<p class="text-muted-foreground mt-1">
					Manage events, meetings, and time off
				</p>
			</div>

			<div class="flex items-center space-x-3">
				<Button variant="outline" class="rounded-xl" onclick={() => selectedDate = today(getLocalTimeZone())}>
					Today
				</Button>
				<div class="flex items-center rounded-xl border border-border/40 bg-background/20 backdrop-blur-sm p-1">
					<Button
						variant={currentView === 'month' ? 'default' : 'ghost'}
						size="sm"
						class="rounded-lg"
						onclick={() => currentView = 'month'}
					>
						Month
					</Button>
					<Button
						variant={currentView === 'week' ? 'default' : 'ghost'}
						size="sm"
						class="rounded-lg"
						onclick={() => currentView = 'week'}
					>
						Week
					</Button>
					<Button
						variant={currentView === 'day' ? 'default' : 'ghost'}
						size="sm"
						class="rounded-lg"
						onclick={() => currentView = 'day'}
					>
						Day
					</Button>
				</div>
                <Button class="rounded-xl" onclick={() => newEventOpen = true}>
					<Plus class="h-4 w-4 mr-2" />
					New Event
				</Button>
			</div>
		</div>
	</div>


	<!-- Calendar Content -->
	{#if currentView === 'month'}
		<div class="flex flex-col lg:flex-row gap-6">
			<!-- Month Calendar -->
			<div class="flex-1">
				<Calendar bind:value={selectedDate} class="w-full" />
			</div>

			<!-- Events Sidebar -->
			<div class="lg:w-96">
				<div class="rounded-2xl border border-border/40 bg-background/20 backdrop-blur-md p-6 shadow-xl">
					<div class="flex items-center justify-between mb-4">
						<h3 class="text-lg font-semibold">Events</h3>
                        <Button size="sm" class="rounded-xl" onclick={() => newEventOpen = true}>
							<Plus class="h-4 w-4" />
						</Button>
					</div>

					{#if loading}
						<div class="text-center py-8">
							<div class="text-muted-foreground">Loading events...</div>
						</div>
					{:else if error}
						<div class="text-center py-8">
							<div class="text-destructive text-sm">{error}</div>
							<Button variant="outline" size="sm" class="mt-2" onclick={loadEvents}>
								Retry
							</Button>
						</div>
					{:else}
						{@const todaysEvents = getTodaysEvents()}
						<div class="space-y-3">
							<!-- Today's Events -->
							{#if todaysEvents.length > 0}
								<div class="text-sm text-muted-foreground mb-2">Today</div>
								<div class="space-y-2">
									{#each todaysEvents as event}
										<div class="rounded-xl border border-border/40 bg-background/30 backdrop-blur-sm p-3 hover:bg-background/50 transition-all duration-200 group">
											<div class="flex items-center justify-between">
												<div class="flex-1 min-w-0">
													<div class="font-medium text-sm truncate">{event.title}</div>
													<div class="text-xs text-muted-foreground">{formatEventTime(event)}</div>
													{#if event.location}
														<div class="text-xs text-muted-foreground/80">{event.location}</div>
													{/if}
												</div>
												<div class="flex items-center space-x-2 ml-2">
													<div class="w-2 h-2 rounded-full" style="background-color: {event.color || eventTypeColors[event.type]}"></div>
													<Button
														variant="ghost"
														size="sm"
														class="opacity-0 group-hover:opacity-100 transition-opacity h-6 w-6 p-0"
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
								<div class="text-sm text-muted-foreground mb-2">Events</div>
								<div class="space-y-2 max-h-96 overflow-y-auto">
									{#each events as event}
										<div class="rounded-xl border border-border/40 bg-background/30 backdrop-blur-sm p-3 hover:bg-background/50 transition-all duration-200 group">
											<div class="flex items-center justify-between">
												<div class="flex-1 min-w-0">
													<div class="font-medium text-sm truncate">{event.title}</div>
													<div class="text-xs text-muted-foreground">
														{new Date(event.startDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
														{formatEventTime(event)}
													</div>
													{#if event.location}
														<div class="text-xs text-muted-foreground/80">{event.location}</div>
													{/if}
												</div>
												<div class="flex items-center space-x-2 ml-2">
													<div class="w-2 h-2 rounded-full" style="background-color: {event.color || eventTypeColors[event.type]}"></div>
													<Button
														variant="ghost"
														size="sm"
														class="opacity-0 group-hover:opacity-100 transition-opacity h-6 w-6 p-0"
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
								<div class="text-center py-8 text-muted-foreground">
									<div class="text-sm">No events found</div>
									<div class="text-xs mt-1">Create an event to get started</div>
								</div>
							{/if}
						</div>
					{/if}

					<div class="mt-6 pt-4 border-t border-border/40">
						<Button variant="outline" class="w-full rounded-xl">
							View All Events
						</Button>
					</div>
				</div>
			</div>
		</div>
	{:else if currentView === 'week'}
		<!-- Week View -->
		<div class="rounded-2xl border border-border/40 bg-background/20 backdrop-blur-md p-6 shadow-xl">
			<!-- Week Header -->
			<div class="flex items-center justify-between mb-6">
				<h2 class="text-2xl font-bold bg-gradient-to-r from-foreground to-foreground/80 bg-clip-text text-transparent">
					{weekStart.toDate(getLocalTimeZone()).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
				</h2>
				<div class="flex items-center space-x-2">
					<Button variant="ghost" size="sm" class="rounded-xl" onclick={() => selectedDate = selectedDate.subtract({ weeks: 1 })}>
						<ChevronLeft class="h-4 w-4" />
					</Button>
					<Button variant="ghost" size="sm" class="rounded-xl" onclick={() => selectedDate = selectedDate.add({ weeks: 1 })}>
						<ChevronRight class="h-4 w-4" />
					</Button>
				</div>
			</div>

			<!-- Week Grid -->
			<div class="border border-border/60 rounded-xl overflow-hidden bg-background/10 backdrop-blur-sm">
				<div class="grid grid-cols-8">
					<!-- Time column header -->
					<div class="bg-background/30 backdrop-blur-sm p-3 text-center font-semibold text-muted-foreground border-r border-b border-border/60"></div>
					<!-- Day headers -->
					{#each weekDays as day, i}
						<div class="bg-background/30 backdrop-blur-sm p-3 text-center border-b border-border/60 {i < 6 ? 'border-r border-border/60' : ''}">
							<div class="font-semibold">{day.toDate(getLocalTimeZone()).toLocaleDateString('en-US', { weekday: 'short' })}</div>
							<div class="text-lg {day.compare(today(getLocalTimeZone())) === 0 ? 'text-primary font-bold' : ''}">{day.day}</div>
						</div>
					{/each}
				</div>

				<!-- Time slots -->
				{#each hours.slice(8, 18) as hour, hourIndex}
					<div class="grid grid-cols-8 {hourIndex < 9 ? 'border-b border-border/40' : ''}">
						<div class="bg-background/20 backdrop-blur-sm p-3 text-right text-sm text-muted-foreground border-r border-border/60">
							{hour.display}
						</div>
						{#each weekDays as day, dayIndex}
							{@const dayEvents = getEventsForDateTime(day, hour.value)}
							<div class="bg-background/5 backdrop-blur-sm p-1 min-h-16 relative hover:bg-background/20 transition-colors {dayIndex < 6 ? 'border-r border-border/40' : ''}">
								<!-- Real events -->
								{#each dayEvents as event}
									<div
										class="backdrop-blur-sm text-white text-xs rounded-lg p-2 mb-1 shadow-sm group cursor-pointer"
										style="background-color: {event.color || eventTypeColors[event.type]}80"
										title={event.description || event.title}
									>
										<div class="flex items-center justify-between">
											<span class="truncate flex-1">{event.title}</span>
											<Button
												variant="ghost"
												size="sm"
												class="opacity-0 group-hover:opacity-100 transition-opacity h-4 w-4 p-0 ml-1"
												onclick={(e) => {
													e.stopPropagation();
													deleteEvent(event.id);
												}}
											>
												<Trash2 class="h-2 w-2" />
											</Button>
										</div>
										{#if event.location}
											<div class="text-xs opacity-80 truncate">{event.location}</div>
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
		<div class="rounded-2xl border border-border/40 bg-background/20 backdrop-blur-md p-6 shadow-xl">
			<!-- Day Header -->
			<div class="flex items-center justify-between mb-6">
				<h2 class="text-2xl font-bold bg-gradient-to-r from-foreground to-foreground/80 bg-clip-text text-transparent">
					{selectedDate.toDate(getLocalTimeZone()).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
				</h2>
				<div class="flex items-center space-x-2">
					<Button variant="ghost" size="sm" class="rounded-xl" onclick={() => selectedDate = selectedDate.subtract({ days: 1 })}>
						<ChevronLeft class="h-4 w-4" />
					</Button>
					<Button variant="ghost" size="sm" class="rounded-xl" onclick={() => selectedDate = selectedDate.add({ days: 1 })}>
						<ChevronRight class="h-4 w-4" />
					</Button>
				</div>
			</div>

			<!-- Day Schedule -->
			<div class="border border-border/60 rounded-xl overflow-hidden bg-background/10 backdrop-blur-sm">
				{#each hours as hour, hourIndex}
					{@const hourEvents = getEventsForDateTime(selectedDate, hour.value)}
					<div class="grid grid-cols-12 {hourIndex < 23 ? 'border-b border-border/40' : ''}">
						<!-- Time column -->
						<div class="col-span-2 bg-background/20 backdrop-blur-sm p-3 text-right text-sm text-muted-foreground border-r border-border/60 h-16 flex items-start pt-2">
							{hour.display}
						</div>

						<!-- Events column -->
						<div class="col-span-10 bg-background/5 backdrop-blur-sm p-1 h-16 relative hover:bg-background/20 transition-colors">
							<!-- Real events -->
							{#each hourEvents as event}
								<div
									class="absolute inset-x-2 top-1 bottom-1 backdrop-blur-sm border rounded-xl p-3 z-10 group cursor-pointer"
									style="background-color: {event.color || eventTypeColors[event.type]}20; border-color: {event.color || eventTypeColors[event.type]}40"
									title={event.description || event.title}
								>
									<div class="flex items-center justify-between">
										<div class="flex-1 min-w-0">
											<div class="font-semibold text-sm truncate">{event.title}</div>
											<div class="text-xs text-muted-foreground">{formatEventTime(event)}</div>
											{#if event.location}
												<div class="text-xs text-muted-foreground/80 truncate">{event.location}</div>
											{/if}
										</div>
										<Button
											variant="ghost"
											size="sm"
											class="opacity-0 group-hover:opacity-100 transition-opacity h-6 w-6 p-0 ml-2"
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
<CreateEventDialog 
	bind:open={newEventOpen} 
	onClose={() => newEventOpen = false}
/>
