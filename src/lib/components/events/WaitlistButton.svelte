<script lang="ts">
	/**
	 * WaitlistButton Component
	 * Feature: 025-events-flesh-out
	 *
	 * Button for joining/leaving event waitlist.
	 * Shows current position in queue when on waitlist.
	 */

	import { Button } from '$lib/components/ui/button';
	import { Clock, X } from '@lucide/svelte';
	import { toast } from 'svelte-sonner';

	interface Props {
		eventId: string;
		isOnWaitlist: boolean;
		waitlistPosition?: number | null;
		onJoin?: (eventId: string) => Promise<void>;
		onLeave?: (eventId: string) => Promise<void>;
		disabled?: boolean;
		variant?: 'default' | 'outline' | 'secondary';
		size?: 'default' | 'sm' | 'lg' | 'icon';
	}

	let {
		eventId,
		isOnWaitlist = false,
		waitlistPosition = null,
		onJoin,
		onLeave,
		disabled = false,
		variant = 'outline',
		size = 'default'
	}: Props = $props();

	let loading = $state(false);

	async function handleJoinWaitlist() {
		if (!onJoin) return;

		loading = true;
		try {
			await onJoin(eventId);
			toast.success('Added to waitlist', {
				description: 'You will be notified when a spot opens up.'
			});
		} catch (error) {
			toast.error('Failed to join waitlist', {
				description: error instanceof Error ? error.message : 'Please try again later.'
			});
		} finally {
			loading = false;
		}
	}

	async function handleLeaveWaitlist() {
		if (!onLeave) return;

		loading = true;
		try {
			await onLeave(eventId);
			toast.success('Removed from waitlist');
		} catch (error) {
			toast.error('Failed to leave waitlist', {
				description: error instanceof Error ? error.message : 'Please try again later.'
			});
		} finally {
			loading = false;
		}
	}

	const buttonText = $derived(() => {
		if (loading) return 'Loading...';

		if (isOnWaitlist) {
			return waitlistPosition
				? `On waitlist (#${waitlistPosition})`
				: 'On waitlist';
		}

		return 'Join waitlist';
	});
</script>

{#if isOnWaitlist}
	<Button
		{variant}
		{size}
		onclick={handleLeaveWaitlist}
		{disabled}
		class="gap-2"
		data-testid="event-waitlist-button"
	>
		<Clock class="h-4 w-4" />
		{buttonText}
		<X class="h-4 w-4 ml-2" />
	</Button>
{:else}
	<Button
		{variant}
		{size}
		onclick={handleJoinWaitlist}
		{disabled}
		class="gap-2"
		data-testid="event-waitlist-button"
	>
		<Clock class="h-4 w-4" />
		{buttonText}
	</Button>
{/if}
