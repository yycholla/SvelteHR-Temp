<script lang="ts">
	import { createEventDispatcher } from 'svelte';
	import { Button } from '$lib/components/ui/button';
	import { RefreshCw } from '@lucide/svelte';

	interface Props {
		loading?: boolean;
		disabled?: boolean;
		variant?: 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link';
		size?: 'sm' | 'default' | 'lg' | 'icon';
		class?: string;
	}

	const {
		loading = false,
		disabled = false,
		variant = 'outline',
		size = 'default',
		class: className = ''
	}: Props = $props();

	const dispatch = createEventDispatcher<{
		retry: void;
	}>();

	function handleRetry() {
		if (!loading && !disabled) {
			dispatch('retry');
		}
	}
</script>

<Button
	{variant}
	{size}
	disabled={loading || disabled}
	onclick={handleRetry}
	class="gap-2 {className}"
	data-testid="retry-button"
>
	<RefreshCw class="h-4 w-4 {loading ? 'animate-spin' : ''}" />
	{loading ? 'Retrying...' : 'Retry'}
</Button>

<style>
	:global(.animate-spin) {
		animation: spin 1s linear infinite;
	}

	@keyframes spin {
		from {
			transform: rotate(0deg);
		}
		to {
			transform: rotate(360deg);
		}
	}
</style>
