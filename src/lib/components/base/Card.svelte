<script lang="ts">
	import type { Snippet } from 'svelte';

	type LegacyCardProps = Record<string, unknown> & {
		class?: string;
		padding?: 'none' | 'sm' | 'md' | 'lg';
		children?: Snippet;
	};

	const paddingClasses: Record<string, string> = {
		none: '',
		sm: 'p-2',
		md: 'p-4',
		lg: 'p-6'
	};

	let { class: className = '', padding = 'md', children, ...rest }: LegacyCardProps = $props();
</script>

<div
	class={`rounded border bg-white ${paddingClasses[padding] || ''} ${className}`.trim()}
	{...rest}
>
	{@render children?.()}
</div>
