<script lang="ts">
	import WaitlistButton from '../WaitlistButton.svelte';
	import type { UserWaitlistStatus } from '$lib/graphql/events-operations';

	interface Props {
		eventId: string;
		userWaitlistStatus?: UserWaitlistStatus;
		waitlistError: string | null;
		onJoinWaitlist: () => Promise<void>;
		onLeaveWaitlist: () => Promise<void>;
	}

	const {
		eventId,
		userWaitlistStatus,
		waitlistError,
		onJoinWaitlist,
		onLeaveWaitlist
	}: Props = $props();
</script>

<div class="border-t pt-6">
	<h3 class="text-sm font-medium text-foreground mb-3">Waitlist</h3>
	<WaitlistButton
		{eventId}
		isOnWaitlist={userWaitlistStatus?.isOnWaitlist || false}
		waitlistPosition={userWaitlistStatus?.position || null}
		onJoin={onJoinWaitlist}
		onLeave={onLeaveWaitlist}
	/>
	{#if waitlistError}
		<div class="text-sm text-destructive mt-2">
			{waitlistError}
		</div>
	{/if}
</div>
