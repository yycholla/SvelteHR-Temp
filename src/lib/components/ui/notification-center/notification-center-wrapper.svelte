<script lang="ts">
	import { Bell } from 'lucide-svelte';
	import Button from '../button/button.svelte';
	import NotificationCenterComponent from './notification-center.svelte';

	// State for notification center - using static data to avoid authentication issues
	let isOpen = $state(false);
	// Mock notifications data to avoid client-side API calls that cause 401 errors
	let notifications = $state([]);
	let unreadCount = $state(0);

	// Transform notifications to the expected format (empty array for now)
	const transformedNotifications = $derived([]);

	function toggleNotificationCenter() {
		isOpen = !isOpen;
	}

	function closeNotificationCenter() {
		isOpen = false;
	}

	async function markAsRead(id: string) {
		// For now, just log the action to avoid client-side API calls
		console.log('Mark notification as read:', id);
	}

	async function markAllAsRead() {
		// For now, just log the action to avoid client-side API calls
		console.log('Mark all notifications as read');
	}

	function clearAllNotifications() {
		// Clear local state only
		notifications = [];
		unreadCount = 0;
		isOpen = false;
	}

	function handleNotificationClick(notification) {
		console.log('Notification clicked:', notification);
	}
</script>

<!-- Notification Bell Button -->
<div class="relative">
	<Button
		variant="ghost"
		size="icon"
		onclick={toggleNotificationCenter}
		class="relative"
		title="Notifications"
	>
		<Bell class="h-5 w-5" />
		{#if unreadCount > 0}
			<span
				class="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-xs font-medium text-white"
			>
				{unreadCount > 99 ? '99+' : unreadCount}
			</span>
		{/if}
	</Button>
</div>

<!-- Notification Center Panel -->
<NotificationCenterComponent
	notifications={transformedNotifications}
	{isOpen}
	onClose={closeNotificationCenter}
	onMarkRead={markAsRead}
	onMarkAllRead={markAllAsRead}
	onClearAll={clearAllNotifications}
	onNotificationClick={handleNotificationClick}
/>
