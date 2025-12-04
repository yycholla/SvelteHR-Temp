<script lang="ts">
	import { cn } from '$lib/utils/styles';

	interface Props {
		size?: 'sm' | 'md' | 'lg' | 'xl';
		variant?: 'default' | 'primary' | 'muted';
		label?: string;
		class?: string;
	}

	const {
		size = 'md',
		variant = 'default',
		label = 'Loading...',
		class: className,
		...restProps
	}: Props = $props();

	const sizeClasses = {
		sm: 'h-4 w-4',
		md: 'h-6 w-6',
		lg: 'h-8 w-8',
		xl: 'h-12 w-12'
	};

	const variantClasses = {
		default: 'border-border',
		primary: 'border-primary',
		muted: 'border-muted-foreground'
	};
</script>

<div
	class={cn('flex items-center justify-center', className)}
	role="status"
	aria-label={label}
	data-testid="loading-spinner"
	{...restProps}
>
	<div
		class={cn(
			'animate-spin rounded-full border-2 border-t-transparent',
			sizeClasses[size],
			variantClasses[variant]
		)}
		aria-hidden="true"
	></div>
	<span class="sr-only">{label}</span>
</div>
