<script lang="ts">
	import { errorStore } from '$lib/stores/error';
	import { X, AlertCircle, AlertTriangle, Info, CheckCircle } from '@lucide/svelte';
	import { Button } from '$lib/components/ui/button';
	import { cn } from '$lib/utils/styles';
	import { fly } from 'svelte/transition';

	// Subscribe to error store - Svelte 5 compatible
	// Access the subscribable store directly, not through the parent object
	const { errors } = errorStore;
	const errorsArray = $derived($errors);

	function getToastClasses(type: string) {
		const baseClasses = 'border-l-4 bg-background shadow-lg';

		switch (type) {
			case 'error':
				return cn(baseClasses, 'border-l-destructive');
			case 'warning':
				return cn(baseClasses, 'border-l-yellow-500');
			case 'info':
				return cn(baseClasses, 'border-l-green-500');
			default:
				return cn(baseClasses, 'border-l-blue-500');
		}
	}

	function getIconClasses(type: string) {
		switch (type) {
			case 'error':
				return 'text-destructive';
			case 'warning':
				return 'text-yellow-600';
			case 'info':
				return 'text-green-600';
			default:
				return 'text-blue-600';
		}
	}

	function dismissError(id: string) {
		errorStore.errors.remove(id);
	}

	function handleAction(action: any) {
		if (action?.handler) {
			action.handler();
		}
	}
</script>

<!-- Toast Container - Fixed position at top-right -->
<div class="fixed right-4 top-4 z-50 max-w-md space-y-2">
	{#each errorsArray as error (error.id)}
		<div
			class={cn('max-w-sm rounded-lg p-4', getToastClasses(error.type))}
			role="alert"
			aria-live="polite"
			transition:fly={{ x: 300, duration: 300 }}
		>
			<div class="flex items-start gap-3">
				<!-- Icon -->
				<div class="mt-0.5 flex-shrink-0">
					{#if error.type === 'error'}
						<AlertCircle class={cn('h-4 w-4', getIconClasses(error.type))} />
					{:else if error.type === 'warning'}
						<AlertTriangle class={cn('h-4 w-4', getIconClasses(error.type))} />
					{:else if error.type === 'info'}
						<CheckCircle class={cn('h-4 w-4', getIconClasses(error.type))} />
					{:else}
						<Info class={cn('h-4 w-4', getIconClasses(error.type))} />
					{/if}
				</div>

				<!-- Content -->
				<div class="min-w-0 flex-1">
					<p class="break-words text-sm font-medium text-foreground">
						{error.message}
					</p>

					{#if error.action}
						<div class="mt-2">
							<Button
								size="sm"
								variant="outline"
								class="text-xs"
								onclick={() => handleAction(error.action)}
							>
								{error.action.label}
							</Button>
						</div>
					{/if}

					{#if error.details && import.meta.env.DEV}
						<details class="mt-2">
							<summary class="cursor-pointer text-xs text-muted-foreground"> Debug Info </summary>
							<pre
								class="mt-1 max-h-20 overflow-auto whitespace-pre-wrap text-xs text-muted-foreground">
								{JSON.stringify(error.details, null, 2)}
							</pre>
						</details>
					{/if}
				</div>

				<!-- Close button -->
				<button
					class="flex-shrink-0 rounded-md p-1 transition-colors hover:bg-muted"
					onclick={() => dismissError(error.id)}
					aria-label="Dismiss notification"
				>
					<X class="h-3 w-3 text-muted-foreground" />
				</button>
			</div>

			<!-- Timestamp -->
			<div class="mt-2 text-xs text-muted-foreground">
				{error.timestamp.toLocaleTimeString()}
			</div>
		</div>
	{/each}
</div>
