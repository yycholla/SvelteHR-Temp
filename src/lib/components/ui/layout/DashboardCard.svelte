<script lang="ts">
	import { cn } from '$lib/utils';
	import type { ComponentType } from 'svelte';

	interface Props {
		children?: any;
		title?: string;
		description?: string;
		icon?: any;
		class?: string;
		headerClass?: string;
		contentClass?: string;
		colSpan?: number; // Default 1
		mdColSpan?: number; // Default 1
		lgColSpan?: number; // Default 1
		actions?: any; // Slot for action buttons
	}

	let {
		children,
		title,
		description,
		icon: Icon,
		class: className,
		headerClass,
		contentClass,
		colSpan = 1,
		mdColSpan = 1,
		lgColSpan = 1,
		actions
	}: Props = $props();

	const colSpans = {
		1: 'col-span-1',
		2: 'col-span-2',
		3: 'col-span-3',
		4: 'col-span-4'
	};

	const mdColSpans = {
		1: 'md:col-span-1',
		2: 'md:col-span-2',
		3: 'md:col-span-3',
		4: 'md:col-span-4'
	};

	const lgColSpans = {
		1: 'lg:col-span-1',
		2: 'lg:col-span-2',
		3: 'lg:col-span-3',
		4: 'lg:col-span-4'
	};
</script>

<div
	class={cn(
		'flex flex-col overflow-hidden rounded-xl border bg-card text-card-foreground shadow-sm transition-all hover:shadow-md',
		colSpans[colSpan as keyof typeof colSpans] || 'col-span-1',
		mdColSpans[mdColSpan as keyof typeof mdColSpans] || 'md:col-span-1',
		lgColSpans[lgColSpan as keyof typeof lgColSpans] || 'lg:col-span-1',
		className
	)}
>
	{#if title || Icon || actions}
		<div class={cn('flex items-start justify-between p-6 pb-2', headerClass)}>
			<div class="flex items-center gap-3">
				{#if Icon}
					<div
						class="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary"
					>
						<Icon class="h-5 w-5" />
					</div>
				{/if}
				<div>
					{#if title}
						<h3 class="font-semibold leading-none tracking-tight">{title}</h3>
					{/if}
					{#if description}
						<p class="mt-1 text-sm text-muted-foreground">{description}</p>
					{/if}
				</div>
			</div>
			{#if actions}
				<div>
					{@render actions()}
				</div>
			{/if}
		</div>
	{/if}

	<div class={cn('flex-1 p-6 pt-2', contentClass)}>
		{@render children?.()}
	</div>
</div>
