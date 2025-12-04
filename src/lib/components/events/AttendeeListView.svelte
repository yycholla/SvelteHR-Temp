<!--
  AttendeeListView Component
  Feature: 027-we-need-to - Task T057

  Display list of event attendees with RSVP status badges and filtering

  Features:
  - List of attendees with avatar, name, job title
  - RSVP status badges with color coding
  - Filter by RSVP status
  - Organizer badge
  - Responsive design

  Props:
  - attendees: Array of attendee objects
  - currentUserId?: string - Highlight current user
  - showFilters?: boolean - Show RSVP filter controls
-->

<script lang="ts">
	import { Badge } from '$lib/components/ui/badge';
	import * as Select from '$lib/components/ui/select';
	import { Avatar } from '$lib/components/ui/avatar';
	import { Crown, Users } from '@lucide/svelte';
	import type { RsvpStatus } from '$lib/graphql/events-operations';

	// Props with Svelte 5 runes
	const {
		attendees,
		currentUserId,
		showFilters = true
	}: {
		attendees: Array<{
			id: string;
			employeeId: string;
			employee: {
				id: string;
				displayName: string;
				email: string;
				jobTitle?: string;
			};
			responseStatus: RsvpStatus;
			isOrganizer: boolean;
			respondedAt?: string;
		}>;
		currentUserId?: string;
		showFilters?: boolean;
	} = $props();

	// State
	let statusFilter = $state<RsvpStatus | 'all'>('all');

	// Derived - filtered attendees
	const filteredAttendees = $derived(
		statusFilter === 'all' ? attendees : attendees.filter((a) => a.responseStatus === statusFilter)
	);

	// Derived - counts by status
	const statusCounts = $derived({
		accepted: attendees.filter((a) => a.responseStatus === 'accepted').length,
		declined: attendees.filter((a) => a.responseStatus === 'declined').length,
		tentative: attendees.filter((a) => a.responseStatus === 'tentative').length,
		pending: attendees.filter((a) => a.responseStatus === 'pending').length
	});

	// Get RSVP badge variant and color
	function getRsvpBadge(status: RsvpStatus): {
		label: string;
		variant: 'default' | 'secondary' | 'destructive' | 'outline';
	} {
		const badges = {
			accepted: { label: 'Accepted', variant: 'default' as const },
			declined: { label: 'Declined', variant: 'destructive' as const },
			tentative: { label: 'Tentative', variant: 'secondary' as const },
			pending: { label: 'Pending', variant: 'outline' as const }
		};
		return badges[status];
	}

	// Get initials for avatar fallback
	function getInitials(name: string): string {
		return name
			.split(' ')
			.map((n) => n[0])
			.join('')
			.toUpperCase()
			.slice(0, 2);
	}
</script>

<div class="attendee-list-view space-y-4">
	<!-- Header with Filters -->
	{#if showFilters}
		<div class="flex items-center justify-between">
			<div class="flex items-center gap-2">
				<Users class="h-4 w-4 text-muted-foreground" />
				<h3 class="text-sm font-medium">
					Attendees ({filteredAttendees.length})
				</h3>
			</div>

			<Select.Root bind:value={statusFilter}>
				<Select.Trigger class="w-40">
					<Select.Value placeholder="Filter by status" />
				</Select.Trigger>
				<Select.Content>
					<Select.Item value="all">
						All ({attendees.length})
					</Select.Item>
					<Select.Item value="accepted">
						Accepted ({statusCounts.accepted})
					</Select.Item>
					<Select.Item value="declined">
						Declined ({statusCounts.declined})
					</Select.Item>
					<Select.Item value="tentative">
						Tentative ({statusCounts.tentative})
					</Select.Item>
					<Select.Item value="pending">
						Pending ({statusCounts.pending})
					</Select.Item>
				</Select.Content>
			</Select.Root>
		</div>
	{/if}

	<!-- Attendee List -->
	<div class="space-y-2">
		{#if filteredAttendees.length === 0}
			<div class="flex flex-col items-center justify-center py-12 text-center">
				<Users class="mb-2 h-12 w-12 text-muted-foreground" />
				<p class="text-sm text-muted-foreground">No attendees found</p>
			</div>
		{:else}
			{#each filteredAttendees as attendee}
				{@const isCurrentUser = attendee.employeeId === currentUserId}
				{@const badge = getRsvpBadge(attendee.responseStatus)}

				<div
					class="flex items-center gap-3 rounded-lg border p-3"
					class:bg-accent={isCurrentUser}
					class:border-primary={isCurrentUser}
				>
					<!-- Avatar -->
					<Avatar class="h-10 w-10">
						<div
							class="flex h-full w-full items-center justify-center bg-primary/10 text-sm font-medium"
						>
							{getInitials(attendee.employee.displayName)}
						</div>
					</Avatar>

					<!-- Info -->
					<div class="flex-1 min-w-0">
						<div class="flex items-center gap-2">
							<p class="font-medium truncate">
								{attendee.employee.displayName}
								{#if isCurrentUser}
									<span class="text-xs text-muted-foreground">(You)</span>
								{/if}
							</p>
							{#if attendee.isOrganizer}
								<Badge variant="secondary" class="flex items-center gap-1">
									<Crown class="h-3 w-3" />
									Organizer
								</Badge>
							{/if}
						</div>
						<p class="text-sm text-muted-foreground truncate">
							{attendee.employee.email}
						</p>
						{#if attendee.employee.jobTitle}
							<p class="text-xs text-muted-foreground truncate">
								{attendee.employee.jobTitle}
							</p>
						{/if}
					</div>

					<!-- RSVP Status Badge -->
					<Badge variant={badge.variant}>
						{badge.label}
					</Badge>
				</div>
			{/each}
		{/if}
	</div>
</div>
