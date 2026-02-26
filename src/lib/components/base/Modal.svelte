<script lang="ts">
	import type { Snippet } from 'svelte';

	type LegacyModalProps = Record<string, unknown> & {
		open?: boolean;
		title?: string;
		size?: 'sm' | 'md' | 'lg' | 'xl';
		onclose?: () => void;
		children?: Snippet;
	};

	const maxWidthBySize: Record<string, string> = {
		sm: 'max-w-md',
		md: 'max-w-lg',
		lg: 'max-w-2xl',
		xl: 'max-w-4xl'
	};

	let {
		open = $bindable(false),
		title,
		size = 'md',
		onclose,
		children
	}: LegacyModalProps = $props();

	function handleClose() {
		open = false;
		onclose?.();
	}
</script>

{#if open}
	<div
		class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
		role="presentation"
	>
		<div
			class={`w-full rounded bg-white p-4 shadow-lg ${maxWidthBySize[size] || maxWidthBySize.md}`}
			role="dialog"
			aria-modal="true"
			aria-label={title || 'Dialog'}
		>
			<div class="mb-3 flex items-center justify-between">
				{#if title}
					<h2 class="text-lg font-semibold">{title}</h2>
				{/if}
				<button type="button" onclick={handleClose} aria-label="Close dialog">Close</button>
			</div>
			{@render children?.()}
		</div>
	</div>
{/if}
