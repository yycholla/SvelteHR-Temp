<script lang="ts">
	import type { Snippet } from 'svelte';

	let {
		variant = 'primary',
		size = 'md',
		type = 'button',
		disabled = false,
		loading = false,
		fullWidth = false,
		rounded = false,
		href = null,
		target = null,
		rel = null,
		leftIcon = null,
		rightIcon = null,
		iconOnly = false,
		onclick = undefined,
		children
	}: {
		variant?: 'primary' | 'secondary' | 'tertiary' | 'danger' | 'success' | 'warning' | 'ghost';
		size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
		type?: 'button' | 'submit' | 'reset';
		disabled?: boolean;
		loading?: boolean;
		fullWidth?: boolean;
		rounded?: boolean;
		href?: string | null;
		target?: string | null;
		rel?: string | null;
		leftIcon?: string | null;
		rightIcon?: string | null;
		iconOnly?: boolean;
		onclick?: ((event: MouseEvent) => void) | undefined;
		children?: Snippet;
	} = $props();

	// Class computation
	let buttonClasses = $derived(
		[
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
			.join(' ')
	);

	// Event handlers
	function handleClick(event: MouseEvent) {
		if (disabled || loading) {
			event.preventDefault();
			event.stopPropagation();
			return;
		}
		onclick?.(event);
	}
</script>

{#if href && !disabled && !loading}
	<a {href} {target} {rel} class={buttonClasses} role="button">
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
				{@render children?.()}
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
	<button {type} {disabled} class={buttonClasses} onclick={handleClick}>
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
				{@render children?.()}
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
