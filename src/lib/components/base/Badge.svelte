<script lang="ts">
	let {
		variant = 'primary',
		size = 'sm',
		rounded = true,
		outline = false,
		dot = false,
		removable = false,
		onremove = undefined,
		children
	}: {
		variant?:
			| 'primary'
			| 'secondary'
			| 'success'
			| 'warning'
			| 'danger'
			| 'info'
			| 'light'
			| 'dark';
		size?: 'xs' | 'sm' | 'md' | 'lg';
		rounded?: boolean;
		outline?: boolean;
		dot?: boolean;
		removable?: boolean;
		onremove?: (() => void) | undefined;
		children?: import('svelte').Snippet;
	} = $props();

	// Computed classes
	let badgeClasses = $derived(
		[
			'badge',
			`badge--${variant}`,
			`badge--${size}`,
			rounded && 'badge--rounded',
			outline && 'badge--outline',
			dot && 'badge--dot',
			removable && 'badge--removable'
		]
			.filter(Boolean)
			.join(' ')
	);

	function handleRemove() {
		if (removable) {
			onremove?.();
		}
	}
</script>

<span class={badgeClasses}>
	{#if dot}
		<span class="badge__dot"></span>
	{/if}

	<span class="badge__content">
		{@render children?.()}
	</span>

	{#if removable}
		<button type="button" class="badge__remove" onclick={handleRemove}>
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
