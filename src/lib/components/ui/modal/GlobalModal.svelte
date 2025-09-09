<script lang="ts">
	import { modalStore } from '$lib/stores/modal';
	import Dialog from '$lib/components/ui/dialog/dialog.svelte';
	import DialogContent from '$lib/components/ui/dialog/dialog-content.svelte';
	import DialogHeader from '$lib/components/ui/dialog/dialog-header.svelte';
	import DialogTitle from '$lib/components/ui/dialog/dialog-title.svelte';
	import DialogClose from '$lib/components/ui/dialog/dialog-close.svelte';
	import { X } from 'lucide-svelte';

	let {} = $props();

	// Subscribe to modal state
	let modalState = $state(modalStore);

	function getSizeClasses(size: string | undefined) {
		switch (size) {
			case 'sm':
				return 'max-w-sm';
			case 'md':
				return 'max-w-md';
			case 'lg':
				return 'max-w-lg';
			case 'xl':
				return 'max-w-xl';
			case 'full':
				return 'max-w-full w-full h-full';
			default:
				return 'max-w-md';
		}
	}

	function handleClose() {
		modalStore.close();
	}

	function handleOutsideClick() {
		if (modalState.config?.closeOnOutsideClick !== false) {
			handleClose();
		}
	}
</script>

{#if modalState.isOpen && modalState.config}
	<Dialog open={modalState.isOpen} onOpenChange={handleClose}>
		<DialogContent
			class="p-0 {getSizeClasses(modalState.config.size)}"
			onInteractOutside={handleOutsideClick}
		>
			{#if modalState.config.title}
				<DialogHeader class="border-b px-6 py-4">
					<DialogTitle class="text-lg font-semibold">
						{modalState.config.title}
					</DialogTitle>
					<DialogClose
						class="absolute top-4 right-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:outline-none disabled:pointer-events-none data-[state=open]:bg-accent data-[state=open]:text-muted-foreground"
					>
						<X class="h-4 w-4" />
						<span class="sr-only">Close</span>
					</DialogClose>
				</DialogHeader>
			{/if}

			<div class="px-6 py-4">
				<svelte:component
					this={modalState.config.component}
					{...modalState.config.props || {}}
					onClose={handleClose}
				/>
			</div>
		</DialogContent>
	</Dialog>
{/if}
