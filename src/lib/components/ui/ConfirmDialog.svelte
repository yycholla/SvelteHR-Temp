<script lang="ts">
	import * as Dialog from '$lib/components/ui/dialog';
	import { Button } from '$lib/components/ui/button';
	import { confirmService } from '$lib/stores/confirm.svelte';

	// Local reactive state using Svelte 5 $state rune
	let state = $state({
		isOpen: false,
		title: 'Confirm Action',
		message: '',
		confirmText: 'Confirm',
		cancelText: 'Cancel',
		variant: 'default' as 'default' | 'destructive'
	});

	// Sync store to local state using Svelte 5 $effect rune
	$effect(() => {
		const unsubscribe = confirmService.subscribe((value) => {
			state = value;
		});
		return unsubscribe;
	});

	function handleOpenChange(open: boolean) {
		if (!open) {
			confirmService.cancel();
		}
	}
</script>

<Dialog.Root open={state.isOpen} onOpenChange={handleOpenChange}>
	<Dialog.Content class="sm:max-w-[425px]">
		<Dialog.Header>
			<Dialog.Title>{state.title}</Dialog.Title>
			<Dialog.Description>
				{state.message}
			</Dialog.Description>
		</Dialog.Header>
		<Dialog.Footer>
			<Button variant="outline" onclick={() => confirmService.cancel()}>
				{state.cancelText}
			</Button>
			<Button
				variant={state.variant === 'destructive' ? 'destructive' : 'default'}
				onclick={() => confirmService.confirm()}
			>
				{state.confirmText}
			</Button>
		</Dialog.Footer>
	</Dialog.Content>
</Dialog.Root>
