<script lang="ts">
	import { onMount } from 'svelte';
	import { X, ExternalLink, AlertCircle, Info, CheckCircle, AlertTriangle } from 'lucide-svelte';
	import Button from '../button/button.svelte';
	import { toastVariants, type ToastNotificationProps, type ToastState } from './notification-center.svelte';
	import { cn } from '$lib/utils.js';

	let {
		notification,
		onDismiss,
		onAction,
		autoHideDuration = 5000,
		class: className,
	}: ToastNotificationProps = $props();

	let state = $state<ToastState>('entering');
	let timeoutId: number | undefined;
	let progressInterval: number | undefined;
	let progress = $state(100);

	function getPriorityIcon(priority: typeof notification.priority) {
		switch (priority) {
			case 'success':
				return CheckCircle;
			case 'warning':
				return AlertTriangle;
			case 'error':
			case 'urgent':
				return AlertCircle;
			default:
				return Info;
		}
	}

	function getPriorityColor(priority: typeof notification.priority) {
		switch (priority) {
			case 'success':
				return 'text-green-600 dark:text-green-400';
			case 'warning':
				return 'text-yellow-600 dark:text-yellow-400';
			case 'error':
				return 'text-red-600 dark:text-red-400';
			case 'urgent':
				return 'text-purple-600 dark:text-purple-400';
			default:
				return 'text-blue-600 dark:text-blue-400';
		}
	}

	function startAutoHide() {
		if (autoHideDuration <= 0) return;

		// Start progress animation
		const startTime = Date.now();
		progressInterval = window.setInterval(() => {
			const elapsed = Date.now() - startTime;
			progress = Math.max(0, 100 - (elapsed / autoHideDuration) * 100);
		}, 50);

		// Set timeout for auto-dismiss
		timeoutId = window.setTimeout(() => {
			handleDismiss();
		}, autoHideDuration);
	}

	function stopAutoHide() {
		if (timeoutId) {
			clearTimeout(timeoutId);
			timeoutId = undefined;
		}
		if (progressInterval) {
			clearInterval(progressInterval);
			progressInterval = undefined;
		}
	}

	function handleDismiss() {
		state = 'exiting';
		setTimeout(() => {
			onDismiss(notification.id);
		}, 300);
	}

	function handleAction() {
		onAction?.(notification);
		handleDismiss();
	}

	onMount(() => {
		// Enter animation
		requestAnimationFrame(() => {
			state = 'visible';
		});

		// Start auto-hide timer
		startAutoHide();

		return () => {
			stopAutoHide();
		};
	});
</script>

<div
	class={cn(toastVariants({ priority: notification.priority, state }), className)}
	role="alert"
	aria-live="assertive"
	onmouseenter={stopAutoHide}
	onmouseleave={startAutoHide}
>
	<!-- Progress Bar (if auto-hide enabled) -->
	{#if autoHideDuration > 0}
		<div class="absolute bottom-0 left-0 h-1 bg-current opacity-30 rounded-b-xl transition-all duration-75" style="width: {progress}%"></div>
	{/if}

	<div class="flex items-start gap-3">
		<!-- Priority Icon -->
		{#snippet priorityIcon()}
			{@const IconComponent = getPriorityIcon(notification.priority)}
			<IconComponent class="h-5 w-5 {getPriorityColor(notification.priority)}" />
		{/snippet}
		<div class="flex-shrink-0 mt-0.5">
			{@render priorityIcon()}
		</div>

		<!-- Content -->
		<div class="flex-1 min-w-0">
			<h4 class="font-semibold text-sm line-clamp-1">{notification.title}</h4>
			<p class="text-sm text-muted-foreground mt-1 line-clamp-2">
				{notification.message}
			</p>

			<!-- Action Button -->
			{#if notification.actionUrl && notification.actionLabel}
				<Button
					variant="outline"
					size="sm"
					onclick={handleAction}
					class="mt-3 h-7 text-xs"
				>
					{notification.actionLabel}
					<ExternalLink class="h-3 w-3 ml-1" />
				</Button>
			{/if}
		</div>

		<!-- Dismiss Button -->
		<Button
			variant="ghost"
			size="icon"
			onclick={handleDismiss}
			class="h-8 w-8 flex-shrink-0"
		>
			<X class="h-4 w-4" />
		</Button>
	</div>
</div>