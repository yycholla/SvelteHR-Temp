<script lang="ts">
	import { onMount } from 'svelte';
	import { fade, fly } from 'svelte/transition';
	import { createNotificationsStore } from '$lib/graphql/realtime.svelte';
	import Button from '$lib/components/ui/button/button.svelte';
	import Badge from '$lib/components/ui/badge/badge.svelte';
	import { 
		Bell, 
		X, 
		AlertTriangle, 
		Info, 
		CheckCircle, 
		AlertCircle,
		ExternalLink,
		Clock
	} from 'lucide-svelte';

	// Component props
	let {
		userId,
		maxNotifications = 5,
		autoHideDuration = 5000,
		position = 'top-right'
	}: {
		userId?: string;
		maxNotifications?: number;
		autoHideDuration?: number;
		position?: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left';
	} = $props();

	// Notification store
	const notificationStore = createNotificationsStore(userId);

	// Local state for visible notifications
	const visibleNotifications = $state<any[]>([]);
	const dismissedIds = $state<Set<string>>(new Set());

	// Watch for new notifications
	$: if (notificationStore.notifications) {
		// Add new notifications to visible list (excluding dismissed ones)
		const newNotifications = notificationStore.notifications
			.filter(n => !dismissedIds.has(n.id) && !visibleNotifications.some(v => v.id === n.id))
			.slice(0, maxNotifications);

		newNotifications.forEach(notification => {
			addNotification(notification);
		});
	}

	// Add notification with auto-dismiss
	function addNotification(notification: any) {
		visibleNotifications.unshift({
			...notification,
			showTime: new Date().toLocaleTimeString(),
			dismissed: false
		});

		// Limit visible notifications
		if (visibleNotifications.length > maxNotifications) {
			visibleNotifications.splice(maxNotifications);
		}

		// Auto-dismiss after duration (unless it's high priority)
		if (notification.priority !== 'high' && autoHideDuration > 0) {
			setTimeout(() => {
				dismissNotification(notification.id);
			}, autoHideDuration);
		}
	}

	// Dismiss notification
	function dismissNotification(notificationId: string) {
		const index = visibleNotifications.findIndex(n => n.id === notificationId);
		if (index >= 0) {
			visibleNotifications[index].dismissed = true;
			dismissedIds.add(notificationId);
			
			// Remove from visible list after animation
			setTimeout(() => {
				const currentIndex = visibleNotifications.findIndex(n => n.id === notificationId);
				if (currentIndex >= 0) {
					visibleNotifications.splice(currentIndex, 1);
				}
			}, 300);
		}

		// Mark as read in the store
		notificationStore.markAsRead(notificationId);
	}

	// Handle notification action
	function handleAction(notification: any) {
		if (notification.action_url) {
			window.open(notification.action_url, '_blank');
		}
		dismissNotification(notification.id);
	}

	// Get notification icon
	function getNotificationIcon(type: string) {
		switch (type) {
			case 'error':
			case 'alert':
				return AlertTriangle;
			case 'warning':
				return AlertCircle;
			case 'success':
				return CheckCircle;
			case 'info':
			default:
				return Info;
		}
	}

	// Get notification styling
	function getNotificationStyle(type: string, priority: string) {
		const baseClass = 'border-l-4';
		
		let borderClass = 'border-l-blue-400';
		let bgClass = 'bg-white';
		
		switch (type) {
			case 'error':
			case 'alert':
				borderClass = 'border-l-red-400';
				bgClass = priority === 'high' ? 'bg-red-50' : 'bg-white';
				break;
			case 'warning':
				borderClass = 'border-l-yellow-400';
				bgClass = priority === 'high' ? 'bg-yellow-50' : 'bg-white';
				break;
			case 'success':
				borderClass = 'border-l-green-400';
				bgClass = 'bg-white';
				break;
		}
		
		return `${baseClass} ${borderClass} ${bgClass}`;
	}

	// Format time ago
	function formatTimeAgo(timestamp: string): string {
		const date = new Date(timestamp);
		const now = new Date();
		const diffMs = now.getTime() - date.getTime();
		const diffMins = Math.floor(diffMs / 60000);
		
		if (diffMins < 1) return 'just now';
		if (diffMins < 60) return `${diffMins}m ago`;
		if (diffMins < 1440) return `${Math.floor(diffMins / 60)}h ago`;
		return date.toLocaleDateString();
	}

	// Position classes
	$: positionClasses = {
		'top-right': 'top-4 right-4',
		'top-left': 'top-4 left-4',
		'bottom-right': 'bottom-4 right-4',
		'bottom-left': 'bottom-4 left-4'
	}[position];
</script>

<!-- Notification Toast Container -->
<div class="fixed z-50 pointer-events-none {positionClasses}" style="max-width: 400px;">
	{#each visibleNotifications as notification (notification.id)}
		{#if !notification.dismissed}
			<div
				class="notification-toast pointer-events-auto mb-3 last:mb-0"
				transition:fly={{ 
					x: position.includes('right') ? 300 : -300,
					duration: 300,
					opacity: 0.8
				}}
			>
				<div class="rounded-lg border shadow-lg {getNotificationStyle(notification.type, notification.priority)}">
					<div class="p-4">
						<!-- Header -->
						<div class="flex items-start justify-between">
							<div class="flex items-start space-x-3">
								<div class="flex-shrink-0 mt-0.5">
									<svelte:component 
										this={getNotificationIcon(notification.type)}
										class="h-5 w-5 {
											notification.type === 'error' || notification.type === 'alert' ? 'text-red-500' :
											notification.type === 'warning' ? 'text-yellow-500' :
											notification.type === 'success' ? 'text-green-500' :
											'text-blue-500'
										}"
									/>
								</div>
								
								<div class="flex-1 min-w-0">
									<div class="flex items-center space-x-2">
										<h4 class="text-sm font-semibold text-gray-900 truncate">
											{notification.title}
										</h4>
										
										{#if notification.priority === 'high'}
											<Badge variant="destructive" class="text-xs px-2 py-0">
												Urgent
											</Badge>
										{/if}
									</div>
									
									<p class="text-sm text-gray-700 mt-1 line-clamp-3">
										{notification.message}
									</p>
									
									<!-- Metadata -->
									<div class="flex items-center space-x-4 mt-2 text-xs text-gray-500">
										<div class="flex items-center space-x-1">
											<Clock class="h-3 w-3" />
											<span>{formatTimeAgo(notification.created_at)}</span>
										</div>
										
										{#if notification.expires_at}
											<div class="flex items-center space-x-1">
												<span>Expires: {formatTimeAgo(notification.expires_at)}</span>
											</div>
										{/if}
									</div>
								</div>
							</div>

							<!-- Close button -->
							<Button
								variant="ghost"
								size="sm"
								onclick={() => dismissNotification(notification.id)}
								class="flex-shrink-0 h-6 w-6 p-0 hover:bg-gray-100"
							>
								<X class="h-4 w-4" />
							</Button>
						</div>

						<!-- Actions -->
						{#if notification.action_url}
							<div class="mt-3 pt-3 border-t border-gray-100">
								<Button
									variant="outline"
									size="sm"
									onclick={() => handleAction(notification)}
									class="text-xs"
								>
									<ExternalLink class="mr-1 h-3 w-3" />
									View Details
								</Button>
							</div>
						{/if}
					</div>
				</div>
			</div>
		{/if}
	{/each}
</div>

<style>
	.notification-toast {
		animation: slideIn 0.3s ease-out;
	}

	@keyframes slideIn {
		from {
			transform: translateX(100%);
			opacity: 0;
		}
		to {
			transform: translateX(0);
			opacity: 1;
		}
	}

	.line-clamp-3 {
		display: -webkit-box;
		-webkit-line-clamp: 3;
		-webkit-box-orient: vertical;
		overflow: hidden;
	}
</style>