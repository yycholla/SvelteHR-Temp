<script lang="ts">
	// Event Detail Page
	// Feature: 019-we-need-to - Task T029
	// Purpose: Display full event details with RSVP management

	import type { PageData } from './$types';
	import RSVPButton from '$lib/components/events/RSVPButton.svelte';
	import { goto } from '$app/navigation';
	import type { RsvpStatus } from '$lib/graphql/types';
	import { formatEventTimeRange } from '$lib/utils/events';

	const { data }: { data: PageData } = $props();

	let currentRsvpStatus = $state<RsvpStatus>(data.userRsvpStatus);
	let isRsvpUpdating = $state(false);

	// Tab state for attendees section
	type AttendeeTab = 'all' | 'accepted' | 'declined' | 'tentative' | 'pending';
	let activeAttendeeTab = $state<AttendeeTab>('all');

	// Filter attendees based on active tab
	const filteredAttendees = $derived(
		activeAttendeeTab === 'all'
			? data.event.eventAttendeesByEventId?.nodes || []
			: (data.event.eventAttendeesByEventId?.nodes || []).filter(
					(a: any) => a.responseStatus === activeAttendeeTab
				)
	);

	// Handle RSVP status change
	async function handleRsvpChange(newStatus: RsvpStatus) {
		console.log('[CLIENT] handleRsvpChange called with:', {
			newStatus,
			statusType: typeof newStatus,
			statusValue: newStatus
		});

		isRsvpUpdating = true;
		try {
			// Find user's attendee record if exists
			const attendees = data.event.eventAttendees || data.event.attendees || [];
			const userAttendee = attendees.find((a: any) => a.employeeId === data.user.id);

			// Create form data for submission
			const formData = new FormData();
			formData.append('eventId', data.event.id);
			formData.append('status', newStatus);

			console.log('[CLIENT] FormData created:', {
				eventId: formData.get('eventId'),
				status: formData.get('status'),
				attendeeId: formData.get('attendeeId')
			});
			if (userAttendee?.id) {
				formData.append('attendeeId', userAttendee.id);
			}

			// Submit to server action
			const response = await fetch(`/dashboard/events?/updateRsvpStatus`, {
				method: 'POST',
				body: formData
			});

			if (!response.ok) {
				throw new Error('Failed to update RSVP status');
			}

			// Update local state and reload to get fresh data
			currentRsvpStatus = newStatus;
			window.location.reload();
		} catch (error) {
			console.error('Failed to update RSVP:', error);
			alert('Failed to update RSVP. Please try again.');
		} finally {
			isRsvpUpdating = false;
		}
	}

	// Handle event deletion
	function handleDelete() {
		if (!confirm('Are you sure you want to delete this event? This action cannot be undone.')) {
			return;
		}

		// Submit the delete form
		const form = document.getElementById('delete-event-form') as HTMLFormElement;
		if (form) {
			form.submit();
		}
	}

	// Get RSVP status color
	function getRsvpStatusColor(status: RsvpStatus): string {
		const colors: Record<RsvpStatus, string> = {
			accepted: 'bg-primary/10 text-primary',
			declined: 'bg-destructive/10 text-destructive',
			tentative: 'bg-accent text-accent-foreground',
			pending: 'bg-primary/10 text-primary'
		};
		return colors[status] || 'bg-muted text-muted-foreground';
	}

	// Get visibility type label
	function getVisibilityLabel(type: string): string {
		const labels: Record<string, string> = {
			company: 'Company-Wide',
			department: 'Department',
			specific: 'Specific People'
		};
		return labels[type] || type;
	}

	// Get event status badge color
	function getStatusBadgeColor(status: string): string {
		const colors: Record<string, string> = {
			draft: 'bg-muted text-muted-foreground',
			scheduled: 'bg-primary/10 text-primary',
			ongoing: 'bg-accent text-accent-foreground',
			completed: 'bg-accent text-accent-foreground',
			cancelled: 'bg-destructive/10 text-destructive'
		};
		return colors[status] || 'bg-muted text-muted-foreground';
	}
</script>

<svelte:head>
	<title>{data.event.title} - MountainHR</title>
	<meta name="description" content="Event details for {data.event.title}" />
</svelte:head>

<div class="container mx-auto max-w-5xl px-4 py-8">
	<!-- Back Button -->
	<div class="mb-6">
		<a
			href="/dashboard/events"
			class="inline-flex items-center text-sm text-muted-foreground transition-colors hover:text-foreground"
		>
			<svg class="mr-2 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
				<path
					stroke-linecap="round"
					stroke-linejoin="round"
					stroke-width="2"
					d="M10 19l-7-7m0 0l7-7m-7 7h18"
				></path>
			</svg>
			Back to Events
		</a>
	</div>

	<!-- Event Header -->
	<div class="mb-8 rounded-lg border bg-card p-6 shadow-sm">
		<div class="mb-4 flex items-start justify-between">
			<div class="flex-1">
				<h1 class="text-3xl font-bold text-foreground">{data.event.title}</h1>
				<div class="mt-3 flex flex-wrap items-center gap-2">
					<span
						class="rounded-md px-2 py-1 text-xs font-medium {getStatusBadgeColor(
							data.event.status
						)}"
					>
						{data.event.status.charAt(0).toUpperCase() + data.event.status.slice(1)}
					</span>
					<span class="rounded-md bg-accent px-2 py-1 text-xs font-medium text-accent-foreground">
						{data.event.eventType.charAt(0).toUpperCase() + data.event.eventType.slice(1)}
					</span>
					<span class="rounded-md bg-primary/10 px-2 py-1 text-xs font-medium text-primary">
						{getVisibilityLabel(data.event.visibilityType)}
					</span>
				</div>
			</div>

			<!-- Action Buttons -->
			<div class="flex gap-2">
				{#if data.canManageEvent}
					<a
						href="/dashboard/events/{data.event.id}/edit"
						class="inline-flex items-center rounded-md border bg-card px-3 py-2 text-sm font-medium text-foreground hover:bg-accent focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:outline-none"
					>
						<svg class="mr-1.5 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path
								stroke-linecap="round"
								stroke-linejoin="round"
								stroke-width="2"
								d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
							></path>
						</svg>
						Edit
					</a>
					<button
						type="button"
						onclick={handleDelete}
						class="inline-flex items-center rounded-md border border-destructive bg-card px-3 py-2 text-sm font-medium text-destructive hover:bg-destructive hover:text-destructive-foreground focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:outline-none"
					>
						<svg class="mr-1.5 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path
								stroke-linecap="round"
								stroke-linejoin="round"
								stroke-width="2"
								d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
							></path>
						</svg>
						Delete
					</button>
				{/if}
			</div>
		</div>

		<!-- Hidden delete form -->
		<form id="delete-event-form" method="POST" action="?/delete" style="display: none;"></form>

		<!-- Event Details Grid -->
		<div class="grid gap-4 sm:grid-cols-2">
			<!-- Date and Time -->
			<div class="flex items-start">
				<svg
					class="mt-0.5 mr-3 h-5 w-5 text-muted-foreground"
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
				<div>
					<div class="text-sm font-medium text-foreground">Date & Time</div>
					<div class="text-sm text-muted-foreground">
						{formatEventTimeRange(data.event.startTime, data.event.endTime, data.event.isAllDay)}
					</div>
					{#if data.event.isAllDay}
						<span
							class="mt-1 inline-block rounded-md bg-primary/10 px-2 py-0.5 text-xs text-primary"
						>
							All Day
						</span>
					{/if}
				</div>
			</div>

			<!-- Location -->
			{#if data.event.location}
				<div class="flex items-start">
					<svg
						class="mt-0.5 mr-3 h-5 w-5 text-muted-foreground"
						fill="none"
						stroke="currentColor"
						viewBox="0 0 24 24"
					>
						<path
							stroke-linecap="round"
							stroke-linejoin="round"
							stroke-width="2"
							d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
						></path>
						<path
							stroke-linecap="round"
							stroke-linejoin="round"
							stroke-width="2"
							d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
						></path>
					</svg>
					<div>
						<div class="text-sm font-medium text-foreground">Location</div>
						<div class="text-sm text-muted-foreground">{data.event.location}</div>
					</div>
				</div>
			{/if}

			<!-- Organizer -->
			<div class="flex items-start">
				<svg
					class="mt-0.5 mr-3 h-5 w-5 text-muted-foreground"
					fill="none"
					stroke="currentColor"
					viewBox="0 0 24 24"
				>
					<path
						stroke-linecap="round"
						stroke-linejoin="round"
						stroke-width="2"
						d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
					></path>
				</svg>
				<div>
					<div class="text-sm font-medium text-foreground">Organizer</div>
					<div class="text-sm text-muted-foreground">
						{data.event.userByOrganizerId?.displayName || 'Unknown'}
					</div>
				</div>
			</div>

			<!-- Attendees Count -->
			<div class="flex items-start">
				<svg
					class="mt-0.5 mr-3 h-5 w-5 text-muted-foreground"
					fill="none"
					stroke="currentColor"
					viewBox="0 0 24 24"
				>
					<path
						stroke-linecap="round"
						stroke-linejoin="round"
						stroke-width="2"
						d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
					></path>
				</svg>
				<div>
					<div class="text-sm font-medium text-foreground">Attendees</div>
					<div class="text-sm text-muted-foreground">{data.rsvpStats.total} invited</div>
				</div>
			</div>
		</div>

		<!-- Description -->
		{#if data.event.description}
			<div class="mt-6 border-t pt-6">
				<h3 class="mb-2 text-sm font-medium text-foreground">Description</h3>
				<p class="text-sm whitespace-pre-wrap text-muted-foreground">{data.event.description}</p>
			</div>
		{/if}

		<!-- RSVP Section -->
		{#if !data.isPastEvent}
			<div class="mt-6 border-t pt-6">
				<div class="flex items-center justify-between">
					<h3 class="text-sm font-medium text-foreground">Your RSVP</h3>
					<RSVPButton
						currentStatus={currentRsvpStatus}
						onChange={handleRsvpChange}
						loading={isRsvpUpdating}
						size="md"
					/>
				</div>
			</div>
		{/if}
	</div>

	<!-- RSVP Statistics -->
	<div class="mb-8 grid grid-cols-3 gap-4 sm:grid-cols-5">
		<div class="rounded-lg border bg-card p-4 text-center shadow-sm">
			<div class="text-2xl font-bold" style="color: hsl(var(--chart-2))">
				{data.rsvpStats.accepted}
			</div>
			<div class="text-sm text-muted-foreground">Accepted</div>
		</div>
		<div class="rounded-lg border bg-card p-4 text-center shadow-sm">
			<div class="text-2xl font-bold" style="color: hsl(var(--chart-4))">
				{data.rsvpStats.tentative}
			</div>
			<div class="text-sm text-muted-foreground">Tentative</div>
		</div>
		<div class="rounded-lg border bg-card p-4 text-center shadow-sm">
			<div class="text-2xl font-bold text-destructive">{data.rsvpStats.declined}</div>
			<div class="text-sm text-muted-foreground">Declined</div>
		</div>
		<div class="rounded-lg border bg-card p-4 text-center shadow-sm">
			<div class="text-2xl font-bold text-primary">{data.rsvpStats.pending}</div>
			<div class="text-sm text-muted-foreground">Pending</div>
		</div>
		<div class="rounded-lg border bg-card p-4 text-center shadow-sm">
			<div class="text-2xl font-bold text-muted-foreground">{data.rsvpStats.noResponse}</div>
			<div class="text-sm text-muted-foreground">No Response</div>
		</div>
	</div>

	<!-- Attendees List with Tabs -->
	<div class="rounded-lg border bg-card shadow-sm">
		<!-- Tab Header -->
		<div class="border-b px-6 py-4">
			<h2 class="mb-4 text-lg font-semibold text-foreground">Attendees ({data.rsvpStats.total})</h2>

			<!-- Tab Navigation -->
			<div class="flex flex-wrap gap-2">
				<button
					class="rounded-md px-4 py-2 text-sm font-medium transition-colors {activeAttendeeTab ===
					'all'
						? 'bg-primary text-primary-foreground'
						: 'bg-muted text-muted-foreground hover:bg-muted/80'}"
					onclick={() => (activeAttendeeTab = 'all')}
				>
					All ({data.rsvpStats.total})
				</button>
				<button
					class="rounded-md px-4 py-2 text-sm font-medium transition-colors {activeAttendeeTab ===
					'accepted'
						? 'bg-primary text-primary-foreground'
						: 'bg-muted text-muted-foreground hover:bg-muted/80'}"
					onclick={() => (activeAttendeeTab = 'accepted')}
				>
					Accepted ({data.rsvpStats.accepted})
				</button>
				<button
					class="rounded-md px-4 py-2 text-sm font-medium transition-colors {activeAttendeeTab ===
					'tentative'
						? 'bg-primary text-primary-foreground'
						: 'bg-muted text-muted-foreground hover:bg-muted/80'}"
					onclick={() => (activeAttendeeTab = 'tentative')}
				>
					Tentative ({data.rsvpStats.tentative})
				</button>
				<button
					class="rounded-md px-4 py-2 text-sm font-medium transition-colors {activeAttendeeTab ===
					'declined'
						? 'bg-primary text-primary-foreground'
						: 'bg-muted text-muted-foreground hover:bg-muted/80'}"
					onclick={() => (activeAttendeeTab = 'declined')}
				>
					Declined ({data.rsvpStats.declined})
				</button>
				<button
					class="rounded-md px-4 py-2 text-sm font-medium transition-colors {activeAttendeeTab ===
					'pending'
						? 'bg-primary text-primary-foreground'
						: 'bg-muted text-muted-foreground hover:bg-muted/80'}"
					onclick={() => (activeAttendeeTab = 'pending')}
				>
					Pending ({data.rsvpStats.pending})
				</button>
			</div>
		</div>

		<!-- Tab Content -->
		<div class="p-6">
			{#if filteredAttendees.length > 0}
				<div class="space-y-3">
					{#each filteredAttendees as attendee}
						<div class="flex items-center justify-between border-b py-2 last:border-0">
							<div class="flex items-center">
								<div class="flex h-10 w-10 items-center justify-center rounded-full bg-muted">
									<span class="text-sm font-medium text-muted-foreground">
										{attendee.userByEmployeeId?.displayName?.charAt(0)?.toUpperCase() || '?'}
									</span>
								</div>
								<div class="ml-3">
									<div class="text-sm font-medium text-foreground">
										{attendee.userByEmployeeId?.displayName || 'Unknown'}
										{#if attendee.employeeId === data.user.id}
											<span class="ml-2 text-xs text-primary">(You)</span>
										{/if}
										{#if attendee.employeeId === data.event.organizerId}
											<span class="ml-2 text-xs" style="color: hsl(var(--chart-5))"
												>(Organizer)</span
											>
										{/if}
									</div>
								</div>
							</div>
							<span
								class="rounded-md px-2 py-1 text-xs font-medium {getRsvpStatusColor(
									attendee.responseStatus
								)}"
							>
								{attendee.responseStatus.replace('_', ' ').charAt(0).toUpperCase() +
									attendee.responseStatus.slice(1).replace('_', ' ')}
							</span>
						</div>
					{/each}
				</div>
			{:else}
				<p class="text-sm text-muted-foreground">
					{activeAttendeeTab === 'all'
						? 'No attendees yet.'
						: `No attendees with ${activeAttendeeTab.replace('_', ' ')} status.`}
				</p>
			{/if}
		</div>
	</div>
</div>
