<script lang="ts">
	import type { Snippet } from 'svelte';

	type LegacyBadgeProps = Record<string, unknown> & {
		class?: string;
		variant?: string;
		size?: string;
		children?: Snippet;
	};

	let {
		class: className = '',
		variant = 'default',
		size = 'md',
		children,
		...rest
	}: LegacyBadgeProps = $props();
</script>

<span class={className} data-variant={variant} data-size={size} {...rest}>
	{@render children?.()}
</span>
