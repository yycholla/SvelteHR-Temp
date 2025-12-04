<script lang="ts">
	// NotificationBell Component
	// Feature: 019-we-need-to - Task T025
	// Purpose: Dropdown notification center

	import type { Notification } from '$lib/graphql/types';
	import { getRelativeTime } from '$lib/utils/activities';

	interface Props {
		notifications: Notification[];
		unreadCount: number;
		onMarkAsRead?: (notificationId: string) => void;
		onMarkAllRead?: () => void;
		onDelete?: (notificationId: string) => void;
		onNotificationClick?: (notification: Notification) => void;
		onViewAll?: () => void;
		maxDisplayed?: number;
	}

	const {
		notifications,
		unreadCount,
		onMarkAsRead,
		onMarkAllRead,
		onDelete,
		onNotificationClick,
		onViewAll,
		maxDisplayed = 5
	}: Props = $props();

	// Local state
	let isOpen = $state(false);
	let buttonRef: HTMLButtonElement | undefined = $state();

	// Displayed notifications (limited)
	const displayedNotifications = $derived(notifications.slice(0, maxDisplayed));

	// Category icons
	function getCategoryIcon(category: Notification['category']): string {
		const iconMap: Record<Notification['category'], string> = {
			event_invitation: '📅',
			task_assignment: '✅',
			event_reminder: '⏰',
			task_due_soon: '⚠️',
			leave_approved: '✓',
			leave_rejected: '✗',
			performance_review: '📊',
			system_announcement: '📢'
		};
		return iconMap[category] || '🔔';
	}

	function toggleDropdown() {
		isOpen = !isOpen;
	}

	function handleMarkAsRead(e: Event, notification: Notification) {
		e.stopPropagation();
		if (onMarkAsRead && !notification.readStatus) {
			onMarkAsRead(notification.id);
		}
	}

	function handleMarkAllRead(e: Event) {
		e.stopPropagation();
		if (onMarkAllRead) {
			onMarkAllRead();
		}
	}

	function handleDelete(e: Event, notification: Notification) {
		e.stopPropagation();
		if (onDelete) {
			onDelete(notification.id);
		}
	}

	function handleNotificationClick(notification: Notification) {
		if (onNotificationClick) {
			onNotificationClick(notification);
		}
		isOpen = false;
	}

	function handleViewAll() {
		if (onViewAll) {
			onViewAll();
		}
		isOpen = false;
	}

	function handleKeyPress(e: KeyboardEvent) {
		if (e.key === 'Escape') {
			isOpen = false;
			buttonRef?.focus();
		}
	}

	function handleClickOutside(e: MouseEvent) {
		const target = e.target as HTMLElement;
		if (isOpen && buttonRef && !buttonRef.contains(target)) {
			isOpen = false;
		}
	}

	// Close dropdown when clicking outside
	$effect(() => {
		if (isOpen) {
			document.addEventListener('click', handleClickOutside);
			return () => document.removeEventListener('click', handleClickOutside);
		}
	});
</script>

<svelte:window onkeydown={handleKeyPress} />

<div class="notification-bell relative">
	<!-- Bell Button -->
	<button
		bind:this={buttonRef}
		type="button"
		class="relative inline-flex items-center rounded-full p-2 text-gray-600 transition-colors hover:bg-gray-100 hover:text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
		onclick={toggleDropdown}
		aria-label="Notifications"
		aria-expanded={isOpen}
		aria-haspopup="true"
	>
		<!-- Bell Icon -->
		<svg class="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
			<path
				stroke-linecap="round"
				stroke-linejoin="round"
				stroke-width="2"
				d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
			/>
		</svg>

		<!-- Unread Badge -->
		{#if unreadCount > 0}
			<span
				class="absolute right-1 top-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-600 text-xs font-bold text-white"
			>
				{unreadCount > 9 ? '9+' : unreadCount}
			</span>
		{/if}
	</button>

	<!-- Dropdown Menu -->
	{#if isOpen}
		<div
			class="absolute right-0 z-50 mt-2 w-96 origin-top-right rounded-lg border border-gray-200 bg-white shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none"
			role="menu"
			aria-orientation="vertical"
		>
			<!-- Header -->
			<div class="flex items-center justify-between border-b border-gray-200 px-4 py-3">
				<h3 class="text-sm font-semibold text-gray-900">Notifications</h3>
				{#if unreadCount > 0 && onMarkAllRead}
					<button
						type="button"
						class="text-xs font-medium text-blue-600 transition-colors hover:text-blue-700"
						onclick={handleMarkAllRead}
					>
						Mark all as read
					</button>
				{/if}
			</div>

			<!-- Notifications List -->
			<div class="max-h-96 overflow-y-auto">
				{#if displayedNotifications.length > 0}
					{#each displayedNotifications as notification (notification.id)}
						<div
							class="group relative flex gap-3 border-b border-gray-100 p-4 transition-colors hover:bg-gray-50"
							class:bg-blue-50={!notification.readStatus}
							role="button"
							tabindex="0"
							onclick={() => handleNotificationClick(notification)}
							onkeydown={(e) => {
								if (e.key === 'Enter' || e.key === ' ') {
									e.preventDefault();
									handleNotificationClick(notification);
								}
							}}
						>
							<!-- Unread Indicator -->
							{#if !notification.readStatus}
								<div class="absolute left-2 top-6 h-2 w-2 rounded-full bg-blue-600"></div>
							{/if}

							<!-- Category Icon -->
							<div class="flex-shrink-0">
								<div class="flex h-10 w-10 items-center justify-center rounded-full bg-gray-100">
									<span class="text-lg">{getCategoryIcon(notification.category)}</span>
								</div>
							</div>

							<!-- Notification Content -->
							<div class="flex-1 min-w-0">
								<p class="text-sm font-medium text-gray-900 group-hover:text-blue-600">
									{notification.title}
								</p>
								<p class="mt-0.5 text-xs text-gray-600 line-clamp-2">
									{notification.message}
								</p>
								<p class="mt-1 text-xs text-gray-500">
									{getRelativeTime(notification.createdAt)}
								</p>
							</div>

							<!-- Action Buttons -->
							<div class="flex flex-shrink-0 flex-col gap-1">
								<!-- Mark as Read Button -->
								{#if !notification.readStatus && onMarkAsRead}
									<button
										type="button"
										class="rounded p-1 text-gray-400 opacity-0 transition-all hover:bg-gray-200 hover:text-gray-600 group-hover:opacity-100"
										onclick={(e) => handleMarkAsRead(e, notification)}
										aria-label="Mark as read"
									>
										<svg class="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
											<path
												fill-rule="evenodd"
												d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
												clip-rule="evenodd"
											/>
										</svg>
									</button>
								{/if}

								<!-- Delete Button -->
								{#if onDelete}
									<button
										type="button"
										class="rounded p-1 text-gray-400 opacity-0 transition-all hover:bg-red-100 hover:text-red-600 group-hover:opacity-100"
										onclick={(e) => handleDelete(e, notification)}
										aria-label="Delete notification"
									>
										<svg class="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
											<path
												fill-rule="evenodd"
												d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z"
												clip-rule="evenodd"
											/>
										</svg>
									</button>
								{/if}
							</div>
						</div>
					{/each}
				{:else}
					<!-- Empty State -->
					<div class="flex flex-col items-center justify-center py-12">
						<svg
							class="mb-3 h-12 w-12 text-gray-400"
							fill="none"
							stroke="currentColor"
							viewBox="0 0 24 24"
						>
							<path
								stroke-linecap="round"
								stroke-linejoin="round"
								stroke-width="2"
								d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
							/>
						</svg>
						<p class="text-sm text-gray-600">No notifications</p>
					</div>
				{/if}
			</div>

			<!-- Footer -->
			{#if onViewAll && notifications.length > 0}
				<div class="border-t border-gray-200 p-2">
					<button
						type="button"
						class="w-full rounded-md px-4 py-2 text-center text-sm font-medium text-blue-600 transition-colors hover:bg-blue-50"
						onclick={handleViewAll}
					>
						View all notifications
					</button>
				</div>
			{/if}
		</div>
	{/if}
</div>

<style>
	.line-clamp-2 {
		display: -webkit-box;
		-webkit-line-clamp: 2;
		-webkit-box-orient: vertical;
		overflow: hidden;
	}
</style>
