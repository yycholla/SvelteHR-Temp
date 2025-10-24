<script lang="ts">
	export let variant:
		| 'primary'
		| 'secondary'
		| 'success'
		| 'warning'
		| 'danger'
		| 'info'
		| 'light'
		| 'dark' = 'primary';
	export let size: 'xs' | 'sm' | 'md' | 'lg' = 'sm';
	export let rounded: boolean = true;
	export let outline: boolean = false;
	export let dot: boolean = false;
	export let removable: boolean = false;

	// Computed classes
	$: badgeClasses = [
		'badge',
		`badge--${variant}`,
		`badge--${size}`,
		rounded && 'badge--rounded',
		outline && 'badge--outline',
		dot && 'badge--dot',
		removable && 'badge--removable'
	]
		.filter(Boolean)
		.join(' ');

	function handleRemove() {
		if (removable) {
			const event = new CustomEvent('remove');
			document.dispatchEvent(event);
		}
	}
</script>

<span class={badgeClasses}>
	{#if dot}
		<span class="badge__dot"></span>
	{/if}

	<span class="badge__content">
		<slot />
	</span>

	{#if removable}
		<button type="button" class="badge__remove" on:click={handleRemove}>
			<span class="sr-only">Remove</span>
			<svg class="badge__remove-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor">
				<path
					stroke-linecap="round"
					stroke-linejoin="round"
					stroke-width="2"
					d="M6 18L18 6M6 6l12 12"
				/>
			</svg>
		</button>
	{/if}
</span>


