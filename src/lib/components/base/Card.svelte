<script lang="ts">
	const {
		padding = 'md',
		shadow = 'sm',
		rounded = 'md',
		border = true,
		hoverable = false,
		clickable = false,
		onclick = undefined,
		class: className = '',
		children
	}: {
		padding?: 'none' | 'sm' | 'md' | 'lg' | 'xl';
		shadow?: 'none' | 'sm' | 'md' | 'lg' | 'xl';
		rounded?: 'none' | 'sm' | 'md' | 'lg' | 'xl' | 'full';
		border?: boolean;
		hoverable?: boolean;
		clickable?: boolean;
		onclick?: ((event: MouseEvent | KeyboardEvent) => void) | undefined;
		class?: string;
		children?: import('svelte').Snippet;
	} = $props();

	// Computed classes
	const cardClasses = $derived(
		[
			'card',
			`card--padding-${padding}`,
			`card--shadow-${shadow}`,
			`card--rounded-${rounded}`,
			border && 'card--border',
			hoverable && 'card--hoverable',
			clickable && 'card--clickable',
			className
		]
			.filter(Boolean)
			.join(' ')
	);

	// Handle click if clickable
	function handleClick(event: MouseEvent) {
		if (clickable) {
			onclick?.(event);
		}
	}

	function handleKeydown(event: KeyboardEvent) {
		if (clickable && (event.key === 'Enter' || event.key === ' ')) {
			event.preventDefault();
			onclick?.(event);
		}
	}
</script>

{#if clickable}
	<div
		class={cardClasses}
		role="button"
		tabindex="0"
		onclick={handleClick}
		onkeydown={handleKeydown}
	>
		{@render children?.()}
	</div>
{:else}
	<div class={cardClasses}>
		{@render children?.()}
	</div>
{/if}
