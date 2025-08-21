<script lang="ts">
	import { toasts } from '$lib/utils/errors';
	import ToastNotification from '../notification-center/toast-notification.svelte';

	// Transform our Toast type to the notification center's format
	function transformToast(toast: typeof $toasts[0]) {
		return {
			id: toast.id,
			title: toast.title || getDefaultTitle(toast.type),
			message: toast.message,
			priority: toast.type as 'success' | 'error' | 'warning' | 'info',
			timestamp: new Date(),
			read: false,
			actionUrl: undefined,
			actionLabel: toast.actions?.[0]?.label
		};
	}

	function getDefaultTitle(type: string): string {
		switch (type) {
			case 'success': return 'Success';
			case 'error': return 'Error';
			case 'warning': return 'Warning';
			case 'info': return 'Information';
			default: return 'Notification';
		}
	}

	function handleDismiss(id: string) {
		toasts.update(items => items.filter(item => item.id !== id));
	}

	function handleAction(toast: typeof $toasts[0]) {
		if (toast.actions?.[0]?.action) {
			toast.actions[0].action();
		}
		handleDismiss(toast.id);
	}
</script>

<!-- Toast Container positioned at top-right -->
<div class="fixed top-4 right-4 z-50 space-y-2 max-w-md w-full pointer-events-none">
	{#each $toasts as toast (toast.id)}
		<div class="pointer-events-auto">
			<ToastNotification
				notification={transformToast(toast)}
				onDismiss={() => handleDismiss(toast.id)}
				onAction={toast.actions?.length ? () => handleAction(toast) : undefined}
				autoHideDuration={toast.timeout || 0}
			/>
		</div>
	{/each}
</div>