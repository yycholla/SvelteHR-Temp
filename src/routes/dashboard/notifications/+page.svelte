<script lang="ts">
	// Notifications Center Page
	// Feature: 019-we-need-to - Task T032
	// Purpose: Display and manage user notifications

	import type { PageData } from './$types';
	import { goto } from '$app/navigation';
	import { page } from '$app/stores';
	import type { Notification, NotificationCategory, NotificationType } from '$lib/graphql/types';
	import { getRelativeTime } from '$lib/utils/activities';
	import { NOTIFICATION_CATEGORY_LABELS } from '$lib/graphql/types';

	const { data }: { data: PageData } = $props();

	// Filter state
	let selectedCategory = $state<NotificationCategory | 'all'>(
		(data.filters.category as NotificationCategory) || 'all'
	);
	let selectedType = $state<NotificationType | 'all'>(
		(data.filters.type as NotificationType) || 'all'
	);
	let selectedReadStatus = $state<string>(data.filters.readStatus || 'all');

	// Get notification category icon
	function getCategoryIcon(category: NotificationCategory): string {
		const iconMap: Record<NotificationCategory, string> = {
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

	// Handle notification click
	function handleNotificationClick(notification: Notification) {
		// Mark as read if unread
		if (!notification.readStatus) {
			markAsRead(notification.id);
		}

		// Navigate to related resource
		if (notification.relatedResourceId && notification.relatedResourceType) {
			const resourceMap: Record<string, string> = {
				event: '/dashboard/events',
				task: '/dashboard/tasks',
				leave_request: '/dashboard/leave',
				performance_review: '/dashboard/reviews',
				employee: '/dashboard/employees'
			};

			const basePath = resourceMap[notification.relatedResourceType];
			if (basePath) {
				goto(`${basePath}/${notification.relatedResourceId}`);
			}
		}
	}

	// Mark notification as read
	async function markAsRead(notificationId: string) {
		try {
			const response = await fetch('/api/notifications/mark-read', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ notificationIds: [notificationId] })
			});

			if (!response.ok) {
				throw new Error('Failed to mark as read');
			}

			// Reload page to show updated state
			window.location.reload();
		} catch (err) {
			console.error('Failed to mark as read:', err);
		}
	}

	// Mark all as read
	async function markAllAsRead() {
		try {
			const unreadIds = data.notifications
				.filter((n: Notification) => !n.readStatus)
				.map((n: Notification) => n.id);

			if (unreadIds.length === 0) return;

			const response = await fetch('/api/notifications/mark-read', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ notificationIds: unreadIds })
			});

			if (!response.ok) {
				throw new Error('Failed to mark all as read');
			}

			// Reload page to show updated state
			window.location.reload();
		} catch (err) {
			console.error('Failed to mark all as read:', err);
		}
	}

	// Delete notification
	async function deleteNotification(notificationId: string) {
		try {
			const response = await fetch('/api/notifications/delete', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ notificationId })
			});

			if (!response.ok) {
				throw new Error('Failed to delete notification');
			}

			// Reload page to show updated list
			window.location.reload();
		} catch (err) {
			console.error('Failed to delete notification:', err);
			alert('Failed to delete notification. Please try again.');
		}
	}

	// Apply filters
	function applyFilters() {
		const params = new URLSearchParams($page.url.searchParams);

		if (selectedCategory !== 'all') {
			params.set('category', selectedCategory);
		} else {
			params.delete('category');
		}

		if (selectedType !== 'all') {
			params.set('type', selectedType);
		} else {
			params.delete('type');
		}

		if (selectedReadStatus !== 'all') {
			params.set('read', selectedReadStatus);
		} else {
			params.delete('read');
		}

		params.set('page', '1');
		goto(`?${params.toString()}`, { replaceState: true });
	}

	// Pagination
	function goToPage(pageNum: number) {
		const params = new URLSearchParams($page.url.searchParams);
		params.set('page', pageNum.toString());
		goto(`?${params.toString()}`);
	}
</script>

<svelte:head>
	<title>Notifications - MountainHR</title>
	<meta name="description" content="View and manage your notifications" />
</svelte:head>

<div class="container mx-auto max-w-7xl px-4 py-8">
	<!-- Page Header -->
	<div class="mb-8 flex items-center justify-between">
		<div>
			<h1 class="text-3xl font-bold text-foreground">Notifications</h1>
			<p class="mt-2 text-muted-foreground">View and manage your notifications</p>
		</div>

		{#if data.unreadCount > 0}
			<button
				type="button"
				onclick={markAllAsRead}
				class="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:outline-none"
			>
				Mark all as read
			</button>
		{/if}
	</div>

	<!-- Filters and Controls -->
	<div class="mb-6 rounded-lg border border-border bg-card p-4 shadow-sm">
		<div class="flex flex-wrap items-end gap-4">
			<!-- Category Filter -->
			<div class="min-w-[200px] flex-1">
				<label for="category-filter" class="mb-1 block text-sm font-medium text-foreground">
					Category
				</label>
				<select
					id="category-filter"
					bind:value={selectedCategory}
					onchange={applyFilters}
					class="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground focus:border-ring focus:ring-1 focus:ring-ring focus:outline-none"
				>
					<option value="all">All Categories</option>
					<option value="event_invitation">Event Invitation</option>
					<option value="task_assignment">Task Assignment</option>
					<option value="event_reminder">Event Reminder</option>
					<option value="task_due_soon">Task Due Soon</option>
					<option value="leave_approved">Leave Approved</option>
					<option value="leave_rejected">Leave Rejected</option>
					<option value="performance_review">Performance Review</option>
					<option value="system_announcement">System Announcement</option>
				</select>
			</div>

			<!-- Type Filter -->
			<div class="min-w-[200px] flex-1">
				<label for="type-filter" class="mb-1 block text-sm font-medium text-foreground">
					Type
				</label>
				<select
					id="type-filter"
					bind:value={selectedType}
					onchange={applyFilters}
					class="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground focus:border-ring focus:ring-1 focus:ring-ring focus:outline-none"
				>
					<option value="all">All Types</option>
					<option value="email">Email</option>
					<option value="in_app">In-App</option>
				</select>
			</div>

			<!-- Read Status Filter -->
			<div class="min-w-[200px] flex-1">
				<label for="read-filter" class="mb-1 block text-sm font-medium text-foreground">
					Status
				</label>
				<select
					id="read-filter"
					bind:value={selectedReadStatus}
					onchange={applyFilters}
					class="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground focus:border-ring focus:ring-1 focus:ring-ring focus:outline-none"
				>
					<option value="all">All</option>
					<option value="false">Unread</option>
					<option value="true">Read</option>
				</select>
			</div>

			<!-- Reset Filters Button -->
			<div>
				<button
					type="button"
					onclick={() => goto('/dashboard/notifications')}
					class="rounded-md border border-input bg-background px-4 py-2 text-sm font-medium text-foreground hover:bg-accent hover:text-accent-foreground focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:outline-none"
				>
					Reset
				</button>
			</div>
		</div>
	</div>

	<!-- Unread Count -->
	{#if data.unreadCount > 0}
		<div class="mb-4 rounded-lg border border-primary/20 bg-primary/10 p-3">
			<p class="text-sm text-primary">
				You have <span class="font-semibold">{data.unreadCount}</span> unread notification{data.unreadCount !==
				1
					? 's'
					: ''}
			</p>
		</div>
	{/if}

	<!-- Notifications List -->
	<div class="space-y-3">
		{#if data.notifications.length > 0}
			{#each data.notifications as notification (notification.id)}
				<div
					class="group relative flex gap-4 rounded-lg border p-4 shadow-sm transition-all hover:shadow-md {!notification.readStatus
						? 'border-primary/30 bg-primary/5'
						: 'border-border bg-card'}"
				>
					<!-- Unread Indicator -->
					{#if !notification.readStatus}
						<div class="absolute top-6 left-2 h-2 w-2 rounded-full bg-primary"></div>
					{/if}

					<!-- Category Icon -->
					<div class="flex-shrink-0 pl-2">
						<div class="flex h-12 w-12 items-center justify-center rounded-full bg-muted">
							<span class="text-2xl">{getCategoryIcon(notification.category)}</span>
						</div>
					</div>

					<!-- Notification Content -->
					<div class="min-w-0 flex-1">
						<button
							type="button"
							onclick={() => handleNotificationClick(notification)}
							class="w-full text-left group-hover:text-primary"
						>
							<p class="text-base font-semibold text-foreground group-hover:text-primary">
								{notification.title}
							</p>
							<p class="mt-1 text-sm text-muted-foreground">
								{notification.message}
							</p>
							<div class="mt-2 flex items-center gap-3 text-xs text-muted-foreground">
								<span>{getRelativeTime(notification.createdAt)}</span>
								<span>•</span>
								<span class="capitalize"
									>{NOTIFICATION_CATEGORY_LABELS[
										notification.category as NotificationCategory
									]}</span
								>
								{#if notification.type === 'email'}
									<span>•</span>
									<span class="inline-flex items-center gap-1">
										<svg class="h-3 w-3" fill="currentColor" viewBox="0 0 20 20">
											<path
												d="M2.003 5.884L10 9.882l7.997-3.998A2 2 0 0016 4H4a2 2 0 00-1.997 1.884z"
											/>
											<path d="M18 8.118l-8 4-8-4V14a2 2 0 002 2h12a2 2 0 002-2V8.118z" />
										</svg>
										Email
									</span>
								{/if}
							</div>
						</button>
					</div>

					<!-- Action Buttons -->
					<div class="flex flex-shrink-0 flex-col gap-2">
						{#if !notification.readStatus}
							<button
								type="button"
								onclick={() => markAsRead(notification.id)}
								class="rounded p-2 text-muted-foreground opacity-0 transition-all group-hover:opacity-100 hover:bg-accent hover:text-accent-foreground"
								aria-label="Mark as read"
								title="Mark as read"
							>
								<svg class="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
									<path
										fill-rule="evenodd"
										d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
										clip-rule="evenodd"
									/>
								</svg>
							</button>
						{/if}

						<button
							type="button"
							onclick={() => deleteNotification(notification.id)}
							class="rounded p-2 text-muted-foreground opacity-0 transition-all group-hover:opacity-100 hover:bg-destructive/10 hover:text-destructive"
							aria-label="Delete notification"
							title="Delete"
						>
							<svg class="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
								<path
									fill-rule="evenodd"
									d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z"
									clip-rule="evenodd"
								/>
							</svg>
						</button>
					</div>
				</div>
			{/each}
		{:else}
			<!-- Empty State -->
			<div
				class="flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-border bg-card p-12"
			>
				<svg
					class="mb-4 h-16 w-16 text-muted-foreground"
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
				<h3 class="mb-2 text-lg font-medium text-foreground">No notifications</h3>
				<p class="text-sm text-muted-foreground">You're all caught up!</p>
			</div>
		{/if}
	</div>

	<!-- Pagination -->
	{#if data.totalCount > data.limit}
		<div
			class="mt-6 flex items-center justify-between border-t border-border bg-card px-4 py-3 sm:px-6"
		>
			<div class="flex flex-1 justify-between sm:hidden">
				<button
					type="button"
					disabled={data.currentPage === 1}
					onclick={() => goToPage(data.currentPage - 1)}
					class="relative inline-flex items-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium text-foreground hover:bg-accent hover:text-accent-foreground disabled:cursor-not-allowed disabled:opacity-50"
				>
					Previous
				</button>
				<button
					type="button"
					disabled={data.currentPage * data.limit >= data.totalCount}
					onclick={() => goToPage(data.currentPage + 1)}
					class="relative ml-3 inline-flex items-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium text-foreground hover:bg-accent hover:text-accent-foreground disabled:cursor-not-allowed disabled:opacity-50"
				>
					Next
				</button>
			</div>

			<div class="hidden sm:flex sm:flex-1 sm:items-center sm:justify-between">
				<div>
					<p class="text-sm text-foreground">
						Showing
						<span class="font-medium">{(data.currentPage - 1) * data.limit + 1}</span>
						to
						<span class="font-medium"
							>{Math.min(data.currentPage * data.limit, data.totalCount)}</span
						>
						of
						<span class="font-medium">{data.totalCount}</span>
						notifications
					</p>
				</div>

				<div>
					<nav class="isolate inline-flex -space-x-px rounded-md shadow-sm" aria-label="Pagination">
						<button
							type="button"
							disabled={data.currentPage === 1}
							onclick={() => goToPage(data.currentPage - 1)}
							class="relative inline-flex items-center rounded-l-md px-2 py-2 text-muted-foreground ring-1 ring-border ring-inset hover:bg-accent hover:text-accent-foreground focus:z-20 focus:outline-offset-0 disabled:cursor-not-allowed disabled:opacity-50"
						>
							<span class="sr-only">Previous</span>
							<svg class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
								<path
									fill-rule="evenodd"
									d="M12.79 5.23a.75.75 0 01-.02 1.06L8.832 10l3.938 3.71a.75.75 0 11-1.04 1.08l-4.5-4.25a.75.75 0 010-1.08l4.5-4.25a.75.75 0 011.06.02z"
									clip-rule="evenodd"
								/>
							</svg>
						</button>

						<span
							class="relative inline-flex items-center bg-card px-4 py-2 text-sm font-semibold text-foreground ring-1 ring-border ring-inset"
						>
							Page {data.currentPage}
						</span>

						<button
							type="button"
							disabled={data.currentPage * data.limit >= data.totalCount}
							onclick={() => goToPage(data.currentPage + 1)}
							class="relative inline-flex items-center rounded-r-md px-2 py-2 text-muted-foreground ring-1 ring-border ring-inset hover:bg-accent hover:text-accent-foreground focus:z-20 focus:outline-offset-0 disabled:cursor-not-allowed disabled:opacity-50"
						>
							<span class="sr-only">Next</span>
							<svg class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
								<path
									fill-rule="evenodd"
									d="M7.21 14.77a.75.75 0 01.02-1.06L11.168 10 7.23 6.29a.75.75 0 111.04-1.08l4.5 4.25a.75.75 0 010 1.08l-4.5 4.25a.75.75 0 01-1.06-.02z"
									clip-rule="evenodd"
								/>
							</svg>
						</button>
					</nav>
				</div>
			</div>
		</div>
	{/if}
</div>
