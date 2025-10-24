<script lang="ts">
	/**
	 * NotificationDropdown Component
	 * Displays unread notifications with badge counter and dropdown list
	 */

	import { Bell, Check, Clock, AlertCircle } from '@lucide/svelte';
	import { formatDistanceToNow } from 'date-fns';
	import * as DropdownMenu from '$lib/components/ui/dropdown-menu';
	import { Badge } from '$lib/components/ui/badge';
	import { Separator } from '$lib/components/ui/separator';

	interface Notification {
		id: string;
		title: string;
		message: string;
		type: 'info' | 'success' | 'warning' | 'error';
		isRead: boolean;
		createdAt: string;
		actionUrl?: string;
	}

	interface Props {
		notifications?: Notification[];
	}

	let { notifications = [] }: Props = $props();

	// Calculate unread count
	const unreadCount = $derived(notifications.filter((n) => !n.isRead).length);

	function getNotificationIcon(type: Notification['type']) {
		switch (type) {
			case 'success':
				return Check;
			case 'warning':
			case 'error':
				return AlertCircle;
			case 'info':
			default:
				return Bell;
		}
	}

	function getNotificationColor(type: Notification['type']) {
		switch (type) {
			case 'success':
				return 'text-green-500';
			case 'warning':
				return 'text-yellow-500';
			case 'error':
				return 'text-red-500';
			case 'info':
			default:
				return 'text-blue-500';
		}
	}

	function formatTime(dateString: string) {
		try {
			return formatDistanceToNow(new Date(dateString), { addSuffix: true });
		} catch {
			return 'recently';
		}
	}

	async function handleNotificationClick(notification: Notification) {
		// Mark single notification as read
		if (!notification.isRead) {
			try {
				await fetch('/api/notifications/mark-read', {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({ notificationIds: [notification.id] })
				});
			} catch (err) {
				console.error('Failed to mark notification as read:', err);
			}
		}

		// Navigate to action URL if available
		if (notification.actionUrl) {
			window.location.href = notification.actionUrl;
		}
	}

	async function handleMarkAllAsRead() {
		const unreadIds = notifications.filter((n) => !n.isRead).map((n) => n.id);

		if (unreadIds.length === 0) return;

		try {
			await fetch('/api/notifications/mark-read', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ notificationIds: unreadIds })
			});

			// SSE stream will automatically update notifications, no reload needed
		} catch (err) {
			console.error('Failed to mark all as read:', err);
		}
	}
</script>

<DropdownMenu.Root>
	<DropdownMenu.Trigger class="relative inline-flex h-9 w-9 items-center justify-center rounded-md text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50">
		<Bell class="h-5 w-5" />
		{#if unreadCount > 0}
			<span
				class="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground"
			>
				{unreadCount > 9 ? '9+' : unreadCount}
			</span>
		{/if}
		<span class="sr-only">Notifications</span>
	</DropdownMenu.Trigger>

	<DropdownMenu.Content align="end" class="w-80">
		<!-- Header -->
		<div class="flex items-center justify-between px-4 py-3">
			<h3 class="text-sm font-semibold">Notifications</h3>
			{#if unreadCount > 0}
				<Badge variant="secondary" class="text-xs">
					{unreadCount} new
				</Badge>
			{/if}
		</div>

		<Separator />

		<!-- Notifications List -->
		<div class="max-h-[400px] overflow-y-auto">
			{#if notifications.length === 0}
				<div class="flex flex-col items-center justify-center py-8 text-center">
					<Bell class="mb-2 h-8 w-8 text-muted-foreground opacity-50" />
					<p class="text-sm text-muted-foreground">No notifications</p>
					<p class="text-xs text-muted-foreground">You're all caught up!</p>
				</div>
			{:else}
				{#each notifications as notification (notification.id)}
					{@const IconComponent = getNotificationIcon(notification.type)}
					<button
						type="button"
						onclick={() => handleNotificationClick(notification)}
						class="w-full border-b border-border px-4 py-3 text-left transition-colors hover:bg-accent {!notification.isRead
							? 'bg-accent/50'
							: ''}"
					>
						<div class="flex items-start gap-3">
							<!-- Icon -->
							<div
								class="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-accent {getNotificationColor(
									notification.type
								)}"
							>
								<IconComponent class="h-4 w-4" />
							</div>

							<!-- Content -->
							<div class="flex-1 space-y-1">
								<div class="flex items-start justify-between gap-2">
									<p class="text-sm font-medium leading-tight">
										{notification.title}
									</p>
									{#if !notification.isRead}
										<span class="h-2 w-2 flex-shrink-0 rounded-full bg-primary"></span>
									{/if}
								</div>
								<p class="text-xs text-muted-foreground line-clamp-2">
									{notification.message}
								</p>
								<div class="flex items-center gap-1 text-xs text-muted-foreground">
									<Clock class="h-3 w-3" />
									{formatTime(notification.createdAt)}
								</div>
							</div>
						</div>
					</button>
				{/each}
			{/if}
		</div>

		{#if notifications.length > 0}
			<Separator />

			<!-- Footer Actions -->
			<div class="px-2 py-2">
				<button
					type="button"
					class="inline-flex h-8 w-full items-center justify-start gap-2 rounded-md px-3 text-xs font-medium transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
					onclick={handleMarkAllAsRead}
				>
					<Check class="h-3 w-3" />
					Mark all as read
				</button>
			</div>
		{/if}
	</DropdownMenu.Content>
</DropdownMenu.Root>
