<script lang="ts">
	import * as Dialog from '$lib/components/ui/dialog';
	import { Button } from '$lib/components/ui/button';
	import { confirmService } from '$lib/stores/confirm.svelte';

	function handleOpenChange(open: boolean) {
		if (!open) {
			confirmService.cancel();
		}
	}
</script>

<Dialog.Root open={confirmService.isOpen} onOpenChange={handleOpenChange}>
	<Dialog.Content class="sm:max-w-[425px]">
		<Dialog.Header>
			<Dialog.Title>{confirmService.title}</Dialog.Title>
			<Dialog.Description>
				{confirmService.message}
			</Dialog.Description>
		</Dialog.Header>
		<Dialog.Footer>
			<Button variant="outline" onclick={() => confirmService.cancel()}>
				{confirmService.cancelText}
			</Button>
			<Button 
				variant={confirmService.variant === 'destructive' ? 'destructive' : 'default'} 
				onclick={() => confirmService.confirm()}
			>
				{confirmService.confirmText}
			</Button>
		</Dialog.Footer>
	</Dialog.Content>
</Dialog.Root>
