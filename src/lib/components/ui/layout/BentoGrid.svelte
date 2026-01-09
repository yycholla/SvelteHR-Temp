<script lang="ts">
	import { cn } from '$lib/utils';

	interface Props {
		children: any;
		class?: string;
		cols?: number; // Default 1
		mdCols?: number; // Default 3
		lgCols?: number; // Default 4
		gap?: number; // Default 4
	}

	let { children, class: className, cols = 1, mdCols = 3, lgCols = 4, gap = 4 }: Props = $props();

	// Map prop values to Tailwind classes
	// Note: We can't interpolate full class names dynamically if we want Tailwind to scan them,
	// but we can use safelisted classes or style attributes.
	// For standard grids, standard classes are better.
	// Since dynamic values like `grid-cols-${cols}` are tricky with Tailwind JIT if not safelisted,
	// we'll stick to a standard set of responsive defaults or map them.

	const gridCols = {
		1: 'grid-cols-1',
		2: 'grid-cols-2',
		3: 'grid-cols-3',
		4: 'grid-cols-4'
	};

	const mdGridCols = {
		1: 'md:grid-cols-1',
		2: 'md:grid-cols-2',
		3: 'md:grid-cols-3',
		4: 'md:grid-cols-4'
	};

	const lgGridCols = {
		1: 'lg:grid-cols-1',
		2: 'lg:grid-cols-2',
		3: 'lg:grid-cols-3',
		4: 'lg:grid-cols-4'
	};

	const gapMap = {
		2: 'gap-2',
		4: 'gap-4',
		6: 'gap-6',
		8: 'gap-8'
	};
</script>

<div
	class={cn(
		'grid auto-rows-[minmax(180px,auto)]',
		gridCols[cols as keyof typeof gridCols] || 'grid-cols-1',
		mdGridCols[mdCols as keyof typeof mdGridCols] || 'md:grid-cols-3',
		lgGridCols[lgCols as keyof typeof lgGridCols] || 'lg:grid-cols-4',
		gapMap[gap as keyof typeof gapMap] || 'gap-4',
		className
	)}
>
	{@render children()}
</div>
