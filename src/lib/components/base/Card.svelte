<script lang="ts">
	export let padding: 'none' | 'sm' | 'md' | 'lg' | 'xl' = 'md';
	export let shadow: 'none' | 'sm' | 'md' | 'lg' | 'xl' = 'sm';
	export let rounded: 'none' | 'sm' | 'md' | 'lg' | 'xl' | 'full' = 'md';
	export let border: boolean = true;
	export let hoverable: boolean = false;
	export let clickable: boolean = false;

	// Computed classes
	$: cardClasses = [
		'card',
		`card--padding-${padding}`,
		`card--shadow-${shadow}`,
		`card--rounded-${rounded}`,
		border && 'card--border',
		hoverable && 'card--hoverable',
		clickable && 'card--clickable'
	]
		.filter(Boolean)
		.join(' ');

	// Handle click if clickable
	function handleClick(event: MouseEvent) {
		if (clickable) {
			// Dispatch a custom click event
			const detail = { originalEvent: event };
			const clickEvent = new CustomEvent('cardClick', { detail });
			event.currentTarget?.dispatchEvent(clickEvent);
		}
	}

	function handleKeydown(event: KeyboardEvent) {
		if (clickable && (event.key === 'Enter' || event.key === ' ')) {
			event.preventDefault();
			const detail = { originalEvent: event };
			const clickEvent = new CustomEvent('cardClick', { detail });
			event.currentTarget?.dispatchEvent(clickEvent);
		}
	}
</script>

{#if clickable}
	<div
		class={cardClasses}
		role="button"
		tabindex="0"
		on:click={handleClick}
		on:keydown={handleKeydown}
		on:cardClick
	>
		<slot />
	</div>
{:else}
	<div class={cardClasses} on:cardClick>
		<slot />
	</div>
{/if}


