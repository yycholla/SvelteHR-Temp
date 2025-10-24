<script lang="ts">
	export let variant:
		| 'primary'
		| 'secondary'
		| 'tertiary'
		| 'danger'
		| 'success'
		| 'warning'
		| 'ghost' = 'primary';
	export let size: 'xs' | 'sm' | 'md' | 'lg' | 'xl' = 'md';
	export let type: 'button' | 'submit' | 'reset' = 'button';
	export let disabled: boolean = false;
	export let loading: boolean = false;
	export let fullWidth: boolean = false;
	export let rounded: boolean = false;
	export let href: string | null = null;
	export let target: string | null = null;
	export let rel: string | null = null;
	export let leftIcon: string | null = null;
	export let rightIcon: string | null = null;
	export let iconOnly: boolean = false;

	// Class computation
	$: buttonClasses = [
		'btn',
		`btn--${variant}`,
		`btn--${size}`,
		fullWidth && 'btn--full-width',
		rounded && 'btn--rounded',
		iconOnly && 'btn--icon-only',
		disabled && 'btn--disabled',
		loading && 'btn--loading'
	]
		.filter(Boolean)
		.join(' ');

	// Event handlers
	function handleClick(event: MouseEvent) {
		if (disabled || loading) {
			event.preventDefault();
			event.stopPropagation();
			return;
		}
		// Let the default click handler proceed
	}
</script>

{#if href && !disabled && !loading}
	<a
		{href}
		{target}
		{rel}
		class={buttonClasses}
		role="button"
		on:click
		on:mouseenter
		on:mouseleave
		on:focus
		on:blur
	>
		{#if leftIcon && !iconOnly}
			<span class="btn__icon btn__icon--left">
				<i class="icon-{leftIcon}"></i>
			</span>
		{/if}

		{#if iconOnly}
			<span class="btn__icon">
				<i class="icon-{leftIcon || rightIcon}"></i>
			</span>
		{:else}
			<span class="btn__text">
				<slot />
			</span>
		{/if}

		{#if rightIcon && !iconOnly}
			<span class="btn__icon btn__icon--right">
				<i class="icon-{rightIcon}"></i>
			</span>
		{/if}

		{#if loading}
			<span class="btn__spinner">
				<svg class="animate-spin" viewBox="0 0 24 24">
					<circle
						class="opacity-25"
						cx="12"
						cy="12"
						r="10"
						stroke="currentColor"
						stroke-width="4"
						fill="none"
					/>
					<path
						class="opacity-75"
						fill="currentColor"
						d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
					/>
				</svg>
			</span>
		{/if}
	</a>
{:else}
	<button
		{type}
		{disabled}
		class={buttonClasses}
		on:click={handleClick}
		on:mouseenter
		on:mouseleave
		on:focus
		on:blur
	>
		{#if leftIcon && !iconOnly}
			<span class="btn__icon btn__icon--left">
				<i class="icon-{leftIcon}"></i>
			</span>
		{/if}

		{#if iconOnly}
			<span class="btn__icon">
				<i class="icon-{leftIcon || rightIcon}"></i>
			</span>
		{:else}
			<span class="btn__text">
				<slot />
			</span>
		{/if}

		{#if rightIcon && !iconOnly}
			<span class="btn__icon btn__icon--right">
				<i class="icon-{rightIcon}"></i>
			</span>
		{/if}

		{#if loading}
			<span class="btn__spinner">
				<svg class="animate-spin" viewBox="0 0 24 24">
					<circle
						class="opacity-25"
						cx="12"
						cy="12"
						r="10"
						stroke="currentColor"
						stroke-width="4"
						fill="none"
					/>
					<path
						class="opacity-75"
						fill="currentColor"
						d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
					/>
				</svg>
			</span>
		{/if}
	</button>
{/if}


