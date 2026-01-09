<script lang="ts">
	type AttendeeTab = 'all' | 'accepted' | 'declined' | 'tentative' | 'pending' | 'no_response';

	interface Props {
		activeAttendeeTab: AttendeeTab;
		displayRsvpStats: any;
		filteredAttendees: any[];
		userId: string;
	}

	let {
		activeAttendeeTab = $bindable(),
		displayRsvpStats,
		filteredAttendees,
		userId
	}: Props = $props();

	function getRsvpStatusColor(status: string): string {
		const colors: Record<string, string> = {
			accepted: 'bg-primary/10 text-primary',
			declined: 'bg-destructive/10 text-destructive',
			tentative: 'bg-accent text-accent-foreground',
			pending: 'bg-primary/10 text-primary',
			no_response: 'bg-muted text-muted-foreground'
		};
		return colors[status] || 'bg-muted text-muted-foreground';
	}
</script>

<div class="border-t pt-6">
	<h3 class="text-sm font-medium text-foreground mb-4">
		Attendee List ({displayRsvpStats?.total || 0})
	</h3>

	<div class="flex flex-wrap gap-2 mb-4">
		<button
			class="px-3 py-1.5 text-xs font-medium rounded-md transition-colors {activeAttendeeTab === 'all'
				? 'bg-primary text-primary-foreground'
				: 'bg-muted text-muted-foreground hover:bg-muted/80'}"
			onclick={() => (activeAttendeeTab = 'all')}
		>
			All ({displayRsvpStats?.total || 0})
		</button>
		<!-- Only show tabs with count > 0 -->
		{#if (displayRsvpStats?.accepted || 0) > 0}
			<button
				class="px-3 py-1.5 text-xs font-medium rounded-md transition-colors {activeAttendeeTab ===
				'accepted'
					? 'bg-primary text-primary-foreground'
					: 'bg-muted text-muted-foreground hover:bg-muted/80'}"
				onclick={() => (activeAttendeeTab = 'accepted')}
			>
				Accepted ({displayRsvpStats?.accepted || 0})
			</button>
		{/if}
		{#if (displayRsvpStats?.tentative || 0) > 0}
			<button
				class="px-3 py-1.5 text-xs font-medium rounded-md transition-colors {activeAttendeeTab ===
				'tentative'
					? 'bg-primary text-primary-foreground'
					: 'bg-muted text-muted-foreground hover:bg-muted/80'}"
				onclick={() => (activeAttendeeTab = 'tentative')}
			>
				Tentative ({displayRsvpStats?.tentative || 0})
			</button>
		{/if}
		{#if (displayRsvpStats?.declined || 0) > 0}
			<button
				class="px-3 py-1.5 text-xs font-medium rounded-md transition-colors {activeAttendeeTab ===
				'declined'
					? 'bg-primary text-primary-foreground'
					: 'bg-muted text-muted-foreground hover:bg-muted/80'}"
				onclick={() => (activeAttendeeTab = 'declined')}
			>
				Declined ({displayRsvpStats?.declined || 0})
			</button>
		{/if}
		{#if (displayRsvpStats?.pending || 0) > 0}
			<button
				class="px-3 py-1.5 text-xs font-medium rounded-md transition-colors {activeAttendeeTab ===
				'pending'
					? 'bg-primary text-primary-foreground'
					: 'bg-muted text-muted-foreground hover:bg-muted/80'}"
				onclick={() => (activeAttendeeTab = 'pending')}
			>
				Pending ({displayRsvpStats?.pending || 0})
			</button>
		{/if}
		{#if displayRsvpStats && displayRsvpStats.total - displayRsvpStats.accepted - displayRsvpStats.declined - displayRsvpStats.tentative - displayRsvpStats.pending > 0}
			<button
				class="px-3 py-1.5 text-xs font-medium rounded-md transition-colors {activeAttendeeTab ===
				'no_response'
					? 'bg-primary text-primary-foreground'
					: 'bg-muted text-muted-foreground hover:bg-muted/80'}"
				onclick={() => (activeAttendeeTab = 'no_response')}
			>
				No Response ({displayRsvpStats.total -
					displayRsvpStats.accepted -
					displayRsvpStats.declined -
					displayRsvpStats.tentative -
					displayRsvpStats.pending})
			</button>
		{/if}
	</div>

	<div class="space-y-2 max-h-60 overflow-y-auto">
		{#if filteredAttendees.length > 0}
			{#each filteredAttendees as attendee (attendee.id)}
				<div
					class="flex items-center justify-between py-2 px-3 rounded-md bg-muted/30 hover:bg-muted/50 transition-colors"
				>
					<div class="flex items-center gap-2">
						<div class="h-8 w-8 rounded-full bg-muted flex items-center justify-center">
							<span class="text-xs font-medium text-muted-foreground">
								{attendee.employee?.displayName?.charAt(0)?.toUpperCase() || '?'}
							</span>
						</div>
						<div class="text-sm font-medium text-foreground">
							{attendee.employee?.displayName || 'Unknown'}
							{#if attendee.employeeId === userId}
								<span class="ml-1.5 text-xs text-primary">(You)</span>
							{/if}
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
		{:else}
			<p class="text-sm text-muted-foreground py-4 text-center">
				{activeAttendeeTab === 'all'
					? 'No attendees yet.'
					: `No attendees with ${activeAttendeeTab.replace('_', ' ')} status.`}
			</p>
		{/if}
	</div>
</div>
