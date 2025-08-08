<script lang="ts">
	import { onMount } from 'svelte';
	import { Bell, AlertCircle, Info, CheckCircle, Clock, User } from 'lucide-svelte';
	import { apiClient } from '$lib/api/client.js';
	import type { CardProps } from '../types.js';
	
	let { instance, metadata, data }: CardProps = $props();
	
	// State
	let loading = $state(true);
	let error = $state<string | null>(null);
	let notifications = $state<any[]>([]);
	let unreadCount = $state(0);
	
	// Fetch notifications
	async function fetchNotifications() {
		try {
			loading = true;
			error = null;
			
			// Fetch notifications from API
			const response = await apiClient.get('notifications');
			const notificationData = Array.isArray(response) ? response : (response.data || []);
			
			// Sort by created date and take recent ones
			const sortedNotifications = notificationData
				.sort((a: any, b: any) => new Date(b.createdAt || '').getTime() - new Date(a.createdAt || '').getTime())
				.slice(0, 6);
			
			notifications = sortedNotifications;
			unreadCount = sortedNotifications.filter((n: any) => !n.read).length;
			
		} catch (err: any) {
			console.error('Failed to fetch notifications:', err);
			error = 'Failed to load notifications';
		} finally {
			loading = false;
		}
	}
	
	// Get notification icon and styling based on type/priority
	function getNotificationInfo(notification: any) {
		const type = notification.type || notification.priority || 'info';
		
		switch (type.toLowerCase()) {
			case 'urgent':
			case 'error':
			case 'critical':
				return { 
					icon: AlertCircle, 
					color: 'text-red-600', 
					bg: 'bg-red-100',
					borderColor: 'border-red-200'
				};
			case 'warning':
			case 'medium':
				return { 
					icon: AlertCircle, 
					color: 'text-yellow-600', 
					bg: 'bg-yellow-100',
					borderColor: 'border-yellow-200'
				};
			case 'success':
			case 'completed':
				return { 
					icon: CheckCircle, 
					color: 'text-green-600', 
					bg: 'bg-green-100',
					borderColor: 'border-green-200'
				};
			case 'pending':
			case 'reminder':
				return { 
					icon: Clock, 
					color: 'text-blue-600', 
					bg: 'bg-blue-100',
					borderColor: 'border-blue-200'
				};
			default:
				return { 
					icon: Info, 
					color: 'text-gray-600', 
					bg: 'bg-gray-100',
					borderColor: 'border-gray-200'
				};
		}
	}
	
	// Format relative time
	function formatRelativeTime(dateString: string): string {
		if (!dateString) return 'Just now';
		
		const date = new Date(dateString);
		const now = new Date();
		const diffMs = now.getTime() - date.getTime();
		const diffMins = Math.floor(diffMs / (1000 * 60));
		const diffHours = Math.floor(diffMins / 60);
		const diffDays = Math.floor(diffHours / 24);
		
		if (diffMins < 1) return 'Just now';
		if (diffMins < 60) return `${diffMins}m ago`;
		if (diffHours < 24) return `${diffHours}h ago`;
		if (diffDays < 7) return `${diffDays}d ago`;
		return date.toLocaleDateString();
	}
	
	onMount(() => {
		fetchNotifications();
	});
</script>

<div class="h-full overflow-hidden">
	{#if loading}
		<div class="flex items-center justify-center h-full">
			<div class="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
		</div>
	{:else if error}
		<div class="flex items-center justify-center h-full text-center">
			<div class="space-y-2">
				<AlertCircle class="h-8 w-8 text-destructive mx-auto" />
				<p class="text-sm text-destructive">{error}</p>
			</div>
		</div>
	{:else}
		<div class="space-y-2 h-full">
			<!-- Header with unread count -->
			<div class="flex items-center justify-between">
				<div class="flex items-center space-x-2">
					<Bell class="h-4 w-4 text-primary" />
					<span class="text-sm font-medium">Notifications</span>
				</div>
				{#if unreadCount > 0}
					<div class="bg-red-500 text-white text-xs rounded-full px-2 py-0.5">
						{unreadCount}
					</div>
				{/if}
			</div>
			
			<!-- Notifications List -->
			<div class="flex-1 min-h-0 overflow-hidden">
				{#if notifications.length === 0}
					<div class="flex items-center justify-center h-full text-center">
						<div class="space-y-2">
							<Bell class="h-6 w-6 text-muted-foreground mx-auto" />
							<p class="text-sm text-muted-foreground">No notifications</p>
						</div>
					</div>
				{:else}
					<div class="space-y-2 max-h-full overflow-hidden">
						{#each notifications as notification}
							{@const notifInfo = getNotificationInfo(notification)}
							<div class="flex items-start space-x-2 p-2 rounded border {notifInfo.borderColor} {notification.read ? 'opacity-60' : ''} hover:bg-muted/30">
								<div class="w-5 h-5 {notifInfo.bg} rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
									<svelte:component this={notifInfo.icon} class="h-3 w-3 {notifInfo.color}" />
								</div>
								<div class="flex-1 min-w-0">
									<div class="text-sm font-medium truncate">
										{notification.title || notification.message || 'Notification'}
									</div>
									{#if notification.message && notification.title}
										<div class="text-xs text-muted-foreground truncate">
											{notification.message}
										</div>
									{/if}
									<div class="flex items-center justify-between mt-1">
										<div class="text-xs text-muted-foreground">
											{formatRelativeTime(notification.createdAt)}
										</div>
										{#if notification.from || notification.sender}
											<div class="flex items-center space-x-1 text-xs text-muted-foreground">
												<User class="h-3 w-3" />
												<span class="truncate max-w-16">
													{notification.from || notification.sender}
												</span>
											</div>
										{/if}
									</div>
								</div>
							</div>
						{/each}
						
						{#if notifications.length >= 6}
							<div class="text-center text-xs text-muted-foreground py-1">
								View all notifications
							</div>
						{/if}
					</div>
				{/if}
			</div>
		</div>
	{/if}
</div>