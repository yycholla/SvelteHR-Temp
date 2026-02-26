<script lang="ts">
	import { Alert, AlertDescription, AlertTitle } from '$lib/components/ui/alert';
	import { Button } from '$lib/components/ui/button';
	import { Badge } from '$lib/components/ui/badge';
	import {
		AlertCircle,
		AlertTriangle,
		RefreshCw,
		Key,
		Clock,
		XCircle,
		FileWarning,
		Network,
		Shield,
		ExternalLink
	} from '@lucide/svelte';
	import * as Collapsible from '$lib/components/ui/collapsible';

	interface Props {
		/** Array of error messages */
		errors: string[];
		/** Optional callback when retry is clicked */
		onRetry?: () => void;
		/** Optional callback when refresh token is clicked */
		onRefreshToken?: () => void;
		/** Optional callback when dismiss is clicked */
		onDismiss?: (errorIndex: number) => void;
		/** Optional className */
		class?: string;
	}

	let { errors, onRetry, onRefreshToken, onDismiss, class: className = '' }: Props = $props();

	// Categorize errors by type based on error message keywords
	interface ErrorCategory {
		type:
			| 'token_expired'
			| 'rate_limited'
			| 'validation_failed'
			| 'network'
			| 'permission'
			| 'unknown';
		severity: 'error' | 'warning' | 'info';
		retryable: boolean;
		icon: typeof AlertCircle;
		title: string;
		action?: string;
	}

	function categorizeError(errorMsg: string): ErrorCategory {
		const lowerMsg = errorMsg.toLowerCase();

		if (
			lowerMsg.includes('token') &&
			(lowerMsg.includes('expired') || lowerMsg.includes('invalid'))
		) {
			return {
				type: 'token_expired',
				severity: 'error',
				retryable: false,
				icon: Key,
				title: 'Authentication Required',
				action: 'Refresh Token'
			};
		}

		if (lowerMsg.includes('rate limit') || lowerMsg.includes('too many requests')) {
			return {
				type: 'rate_limited',
				severity: 'warning',
				retryable: true,
				icon: Clock,
				title: 'Rate Limit Exceeded',
				action: 'Wait & Retry'
			};
		}

		if (
			lowerMsg.includes('validation') ||
			lowerMsg.includes('invalid') ||
			lowerMsg.includes('required')
		) {
			return {
				type: 'validation_failed',
				severity: 'error',
				retryable: false,
				icon: FileWarning,
				title: 'Validation Error',
				action: 'Review Data'
			};
		}

		if (
			lowerMsg.includes('network') ||
			lowerMsg.includes('timeout') ||
			lowerMsg.includes('connection')
		) {
			return {
				type: 'network',
				severity: 'warning',
				retryable: true,
				icon: Network,
				title: 'Network Issue',
				action: 'Retry'
			};
		}

		if (
			lowerMsg.includes('permission') ||
			lowerMsg.includes('unauthorized') ||
			lowerMsg.includes('forbidden')
		) {
			return {
				type: 'permission',
				severity: 'error',
				retryable: false,
				icon: Shield,
				title: 'Permission Denied',
				action: 'Contact Admin'
			};
		}

		return {
			type: 'unknown',
			severity: 'error',
			retryable: true,
			icon: AlertCircle,
			title: 'Sync Error',
			action: 'Retry'
		};
	}

	// Group errors by category
	const categorizedErrors = $derived(
		errors.map((error, index) => ({
			index,
			message: error,
			category: categorizeError(error)
		}))
	);

	const errorsByType = $derived(
		categorizedErrors.reduce(
			(acc, err) => {
				const type = err.category.type;
				if (!acc[type]) {
					acc[type] = [];
				}
				acc[type].push(err);
				return acc;
			},
			{} as Record<string, typeof categorizedErrors>
		)
	);

	// Has retryable errors
	const hasRetryableErrors = $derived(categorizedErrors.some((err) => err.category.retryable));

	// Has token errors
	const hasTokenErrors = $derived(
		categorizedErrors.some((err) => err.category.type === 'token_expired')
	);

	function getSeverityClass(severity: string): string {
		switch (severity) {
			case 'error':
				return 'border-red-300 bg-red-50 dark:bg-red-950/30';
			case 'warning':
				return 'border-yellow-300 bg-yellow-50 dark:bg-yellow-950/30';
			case 'info':
				return 'border-blue-300 bg-blue-50 dark:bg-blue-950/30';
			default:
				return '';
		}
	}

	function getSeverityTextClass(severity: string): string {
		switch (severity) {
			case 'error':
				return 'text-red-900 dark:text-red-200';
			case 'warning':
				return 'text-yellow-900 dark:text-yellow-200';
			case 'info':
				return 'text-blue-900 dark:text-blue-200';
			default:
				return '';
		}
	}
</script>

{#if errors.length > 0}
	<div class="space-y-3 {className}">
		<!-- Summary Alert -->
		<Alert variant="destructive">
			<AlertCircle class="h-4 w-4" />
			<AlertTitle>Sync Errors ({errors.length})</AlertTitle>
			<AlertDescription class="flex items-center justify-between">
				<span>
					{#if hasRetryableErrors}
						Some errors can be retried automatically.
					{:else}
						These errors require manual intervention.
					{/if}
				</span>
				<div class="flex gap-2">
					{#if hasRetryableErrors && onRetry}
						<Button size="sm" variant="outline" onclick={onRetry}>
							<RefreshCw class="h-3 w-3 mr-1.5" />
							Retry All
						</Button>
					{/if}
					{#if hasTokenErrors && onRefreshToken}
						<Button size="sm" variant="outline" onclick={onRefreshToken}>
							<Key class="h-3 w-3 mr-1.5" />
							Refresh Token
						</Button>
					{/if}
				</div>
			</AlertDescription>
		</Alert>

		<!-- Grouped Errors by Type -->
		{#each Object.entries(errorsByType) as [type, errList]}
			{@const category = errList[0].category}
			{@const IconComponent = category.icon}

			<Collapsible.Root>
				<div class="rounded-lg border p-4 {getSeverityClass(category.severity)}">
					<Collapsible.Trigger class="flex items-center justify-between w-full text-left">
						<div class="flex items-center gap-3">
							<IconComponent class="h-5 w-5 {getSeverityTextClass(category.severity)}" />
							<div>
								<h3 class="font-semibold text-sm {getSeverityTextClass(category.severity)}">
									{category.title}
								</h3>
								<p class="text-xs {getSeverityTextClass(category.severity)} opacity-80">
									{errList.length} error{errList.length !== 1 ? 's' : ''}
								</p>
							</div>
						</div>
						<div class="flex items-center gap-2">
							<Badge variant={category.retryable ? 'secondary' : 'destructive'} class="text-xs">
								{category.retryable ? 'Retryable' : 'Manual'}
							</Badge>
						</div>
					</Collapsible.Trigger>

					<Collapsible.Content class="mt-3 space-y-2">
						{#each errList as err}
							<div
								class="p-3 rounded border bg-background/50 flex items-start justify-between gap-2"
							>
								<div class="flex-1">
									<p class="text-sm font-mono">{err.message}</p>
								</div>
								<div class="flex gap-1">
									{#if err.category.retryable && onRetry}
										<Button size="sm" variant="ghost" onclick={onRetry}>
											<RefreshCw class="h-3 w-3" />
										</Button>
									{/if}
									{#if onDismiss}
										<Button size="sm" variant="ghost" onclick={() => onDismiss?.(err.index)}>
											<XCircle class="h-3 w-3" />
										</Button>
									{/if}
								</div>
							</div>
						{/each}

						<!-- Action Guidance -->
						{#if category.type === 'token_expired'}
							<div class="mt-3 pt-3 border-t text-sm {getSeverityTextClass(category.severity)}">
								<p class="font-medium mb-1">⚠️ Action Required:</p>
								<p class="text-xs opacity-80 mb-2">
									Your QuickBooks authentication has expired. Click "Refresh Token" to
									re-authenticate.
								</p>
								{#if onRefreshToken}
									<Button size="sm" onclick={onRefreshToken}>
										<Key class="h-3 w-3 mr-1.5" />
										Refresh Token
									</Button>
								{/if}
							</div>
						{:else if category.type === 'rate_limited'}
							<div class="mt-3 pt-3 border-t text-sm {getSeverityTextClass(category.severity)}">
								<p class="font-medium mb-1">⏳ Rate Limit:</p>
								<p class="text-xs opacity-80">
									QuickBooks API rate limit exceeded. Wait a few minutes before retrying.
								</p>
							</div>
						{:else if category.type === 'validation_failed'}
							<div class="mt-3 pt-3 border-t text-sm {getSeverityTextClass(category.severity)}">
								<p class="font-medium mb-1">🔍 Data Issue:</p>
								<p class="text-xs opacity-80">
									Review the data for missing or invalid fields. Fix the issues and try syncing
									again.
								</p>
							</div>
						{:else if category.type === 'network'}
							<div class="mt-3 pt-3 border-t text-sm {getSeverityTextClass(category.severity)}">
								<p class="font-medium mb-1">🌐 Connection Issue:</p>
								<p class="text-xs opacity-80">Check your internet connection or try again later.</p>
							</div>
						{:else if category.type === 'permission'}
							<div class="mt-3 pt-3 border-t text-sm {getSeverityTextClass(category.severity)}">
								<p class="font-medium mb-1">🔒 Permission Denied:</p>
								<p class="text-xs opacity-80">
									You don't have the required permissions. Contact your administrator.
								</p>
							</div>
						{/if}
					</Collapsible.Content>
				</div>
			</Collapsible.Root>
		{/each}

		<!-- Help Link -->
		<div class="text-center">
			<a
				href="/admin/settings/integrations/errors"
				class="text-xs text-muted-foreground hover:text-primary inline-flex items-center gap-1"
			>
				View detailed error logs
				<ExternalLink class="h-3 w-3" />
			</a>
		</div>
	</div>
{/if}
