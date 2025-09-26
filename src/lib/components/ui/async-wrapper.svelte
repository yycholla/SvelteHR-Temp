<script lang="ts">
	import ErrorBoundary from './error-boundary.svelte';
	import PageLoading from './page-loading.svelte';
	import { cn } from '$lib/utils/styles';

	interface Props {
		loading?: boolean;
		error?: Error | null;
		loadingTitle?: string;
		loadingDescription?: string;
		errorTitle?: string;
		errorDescription?: string;
		loadingVariant?: 'default' | 'minimal' | 'detailed';
		errorVariant?: 'default' | 'minimal' | 'detailed';
		showErrorDetails?: boolean;
		onRetry?: () => void;
		class?: string;
		children?: any;
	}

	let {
		loading = false,
		error = null,
		loadingTitle = 'Loading',
		loadingDescription = 'Please wait while we load your data...',
		errorTitle = 'Something went wrong',
		errorDescription = 'We encountered an unexpected error. Please try again or contact support if the problem persists.',
		loadingVariant = 'default',
		errorVariant = 'default',
		showErrorDetails = false,
		onRetry,
		class: className,
		children
	}: Props = $props();
</script>

<div class={cn('async-wrapper', className)}>
	{#if loading}
		<PageLoading title={loadingTitle} description={loadingDescription} variant={loadingVariant} />
	{:else if error}
		<ErrorBoundary
			{error}
			title={errorTitle}
			description={errorDescription}
			variant={errorVariant}
			showDetails={showErrorDetails}
			{onRetry}
		/>
	{:else}
		{@render children?.()}
	{/if}
</div>
