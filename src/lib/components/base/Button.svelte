<script lang="ts">
	import type { Snippet } from 'svelte';

	type ButtonType = 'button' | 'submit' | 'reset';
	type LegacyButtonProps = Record<string, unknown> & {
		type?: ButtonType;
		class?: string;
		disabled?: boolean;
		leftIcon?: string;
		rightIcon?: string;
		loading?: boolean;
		children?: Snippet;
	};

	let {
		type = 'button',
		class: className = '',
		disabled = false,
		leftIcon,
		rightIcon,
		loading = false,
		children,
		...rest
	}: LegacyButtonProps = $props();
</script>

<button {type} class={className} {disabled} aria-busy={loading} {...rest}>
	{#if leftIcon}<span aria-hidden="true">{leftIcon}</span>{/if}
	{@render children?.()}
	{#if rightIcon}<span aria-hidden="true">{rightIcon}</span>{/if}
</button>
