<script lang="ts">
	import { goto } from '$app/navigation';
	import { Bell, AlertTriangle, Info, CheckCircle, X, Filter, MailOpen, Mail } from 'lucide-svelte';
	import Card from '$lib/components/ui/card/card.svelte';
	import CardHeader from '$lib/components/ui/card/card-header.svelte';
	import CardTitle from '$lib/components/ui/card/card-title.svelte';
	import CardDescription from '$lib/components/ui/card/card-description.svelte';
	import CardContent from '$lib/components/ui/card/card-content.svelte';
	import Badge from '$lib/components/ui/badge/badge.svelte';
	import Button from '$lib/components/ui/button/button.svelte';
	import { NotificationCenter } from '$lib/components/ui/notification-center';
	import { EnhancedBulkActionsBar } from '$lib/components/ui/bulk-operations';
	import { LiveMetricCard } from '$lib/components/ui/dashboard-cards';
	import type { PageData } from './$types';

	// Page data from server
	let { data }: { data: PageData } = $props();

	// Local filter states
	let typeFilter = $state(data.filters.type);
	let readFilter = $state(data.filters.isRead === null ? 'all' : (data.filters.isRead ? 'read' : 'unread'));

	// Derived data from server
	const notifications = $derived(data.notifications);
	const stats = $derived(data.stats);
	const loading = $state(false);
	const error = $derived(data.error || '');

	function getTypeIcon(type: string) {
		switch (type?.toLowerCase()) {
			case 'error': return AlertTriangle;
			case 'warning': return AlertTriangle;
			case 'success': return CheckCircle;
			case 'info': return Info;
			case 'changeRequest': return Bell;
			case 'onboardingreminder': return Bell;
			case 'taskupdate': return Bell;
			default: return Bell;
		}
	}

	function getTypeVariant(type: string) {
		switch (type?.toLowerCase()) {
			case 'error': return 'destructive';
			case 'warning': return 'destructive';
			case 'success': return 'default';
			case 'info': return 'secondary';
			default: return 'outline';
		}
	}

	function getTypeColor(type: string): string {
		switch (type?.toLowerCase()) {
			case 'error': return 'text-red-600 dark:text-red-400';
			case 'warning': return 'text-yellow-600 dark:text-yellow-400';
			case 'success': return 'text-green-600 dark:text-green-400';
			case 'info': return 'text-blue-600 dark:text-blue-400';
			default: return 'text-gray-600 dark:text-gray-400';
		}
	}

	function formatDate(dateString: string | null) {
		if (!dateString) return 'Unknown time';
		const date = new Date(dateString);
		const now = new Date();
		const diffTime = now.getTime() - date.getTime();
		const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
		const diffHours = Math.floor(diffTime / (1000 * 60 * 60));
		const diffMinutes = Math.floor(diffTime / (1000 * 60));

		if (diffMinutes < 60) {
			return `${diffMinutes} minutes ago`;
		} else if (diffHours < 24) {
			return `${diffHours} hours ago`;
		} else if (diffDays === 1) {
			return 'Yesterday';
		} else if (diffDays < 7) {
			return `${diffDays} days ago`;
		} else {
			return new Intl.DateTimeFormat('en-US', {
				year: 'numeric',
				month: 'short',
				day: 'numeric'
			}).format(date);
		}
	}

	async function markAsRead(notificationId: string) {
		try {
			// TODO: Implement server-side API call to mark notification as read
			// For now, just refresh the page to get updated data
			console.log('Mark as read:', notificationId);
			window.location.reload();
		} catch (err: any) {
			console.error('Error marking notification as read:', err);
		}
	}

	async function markAllAsRead() {
		try {
			// TODO: Implement server-side API call to mark all notifications as read
			// For now, just refresh the page to get updated data
			console.log('Mark all as read');
			window.location.reload();
		} catch (err: any) {
			console.error('Error marking all notifications as read:', err);
		}
	}

	// Apply filters by navigating to new URL with query parameters
	async function applyFilters() {
		const params = new URLSearchParams();
		
		if (typeFilter !== 'all') params.set('type', typeFilter);
		if (readFilter !== 'all') params.set('isRead', readFilter === 'read' ? 'true' : 'false');
		
		const queryString = params.toString();
		const newUrl = queryString ? `/hr/notifications?${queryString}` : '/hr/notifications';
		
		await goto(newUrl);
	}

	function clearFilters() {
		typeFilter = 'all';
		readFilter = 'all';
		applyFilters();
	}

	// Apply filters when any filter changes
	$effect(() => {
		if (typeFilter !== data.filters.type || 
		    readFilter !== (data.filters.isRead === null ? 'all' : (data.filters.isRead ? 'read' : 'unread'))) {
			applyFilters();
		}
	});
</script>

<svelte:head>
	<title>HR - Notifications - SvelteHR</title>
</svelte:head>

<!-- Notification components (using server-side data only) -->
<NotificationCenter />

<div class="space-y-6">
	<!-- Header -->
	<div class="flex items-center justify-between">
		<div>
			<h2 class="text-2xl font-bold tracking-tight">Notifications</h2>
			<p class="text-muted-foreground">
				Stay updated with important HR notifications and alerts.
			</p>
		</div>
		<div class="flex items-center space-x-2">
			{#if stats.unread > 0}
				<Button variant="outline" onclick={markAllAsRead}>
					<CheckCircle class="h-4 w-4 mr-2" />
					Mark All Read
				</Button>
			{/if}
		</div>
	</div>

	<!-- Summary Cards -->
	<div class="grid gap-4 md:grid-cols-4">
		<Card class="bg-white/80 dark:bg-slate-800/80 backdrop-blur-xl border border-white/30 dark:border-slate-700/50 rounded-lg shadow-xl">
			<CardHeader class="flex flex-row items-center justify-between space-y-0 pb-2">
				<CardTitle class="text-sm font-medium">Total Notifications</CardTitle>
				<Bell class="h-4 w-4 text-muted-foreground" />
			</CardHeader>
			<CardContent>
				<div class="text-2xl font-bold">{stats.total}</div>
				<p class="text-xs text-muted-foreground">All notifications</p>
			</CardContent>
		</Card>

		<Card class="bg-white/80 dark:bg-slate-800/80 backdrop-blur-xl border border-white/30 dark:border-slate-700/50 rounded-lg shadow-xl">
			<CardHeader class="flex flex-row items-center justify-between space-y-0 pb-2">
				<CardTitle class="text-sm font-medium">Unread</CardTitle>
				<Mail class="h-4 w-4 text-muted-foreground" />
			</CardHeader>
			<CardContent>
				<div class="text-2xl font-bold text-blue-600 dark:text-blue-400">{stats.unread}</div>
				<p class="text-xs text-muted-foreground">Need attention</p>
			</CardContent>
		</Card>

		<Card class="bg-white/80 dark:bg-slate-800/80 backdrop-blur-xl border border-white/30 dark:border-slate-700/50 rounded-lg shadow-xl">
			<CardHeader class="flex flex-row items-center justify-between space-y-0 pb-2">
				<CardTitle class="text-sm font-medium">Urgent</CardTitle>
				<AlertTriangle class="h-4 w-4 text-muted-foreground" />
			</CardHeader>
			<CardContent>
				<div class="text-2xl font-bold text-red-600 dark:text-red-400">{stats.urgent}</div>
				<p class="text-xs text-muted-foreground">High priority</p>
			</CardContent>
		</Card>

		<Card class="bg-white/80 dark:bg-slate-800/80 backdrop-blur-xl border border-white/30 dark:border-slate-700/50 rounded-lg shadow-xl">
			<CardHeader class="flex flex-row items-center justify-between space-y-0 pb-2">
				<CardTitle class="text-sm font-medium">Today</CardTitle>
				<Info class="h-4 w-4 text-muted-foreground" />
			</CardHeader>
			<CardContent>
				<div class="text-2xl font-bold">{stats.today}</div>
				<p class="text-xs text-muted-foreground">Received today</p>
			</CardContent>
		</Card>
	</div>

	<!-- Filters -->
	<Card class="bg-white/80 dark:bg-slate-800/80 backdrop-blur-xl border border-white/30 dark:border-slate-700/50 rounded-lg shadow-xl">
		<CardHeader>
			<CardTitle>Filter Notifications</CardTitle>
		</CardHeader>
		<CardContent>
			<div class="flex gap-4">
				<select 
					class="px-3 py-2 border border-input rounded-md bg-background text-foreground"
					bind:value={typeFilter}
				>
					<option value="all">All Types</option>
					<option value="info">Info</option>
					<option value="success">Success</option>
					<option value="warning">Warning</option>
					<option value="error">Error</option>
					<option value="ChangeRequest">Change Request</option>
					<option value="OnboardingReminder">Onboarding</option>
					<option value="TaskUpdate">Task Update</option>
				</select>

				<select 
					class="px-3 py-2 border border-input rounded-md bg-background text-foreground"
					bind:value={readFilter}
				>
					<option value="all">All Status</option>
					<option value="unread">Unread Only</option>
					<option value="read">Read Only</option>
				</select>
				
				<Button variant="outline" onclick={clearFilters}>
					Clear Filters
				</Button>
			</div>
		</CardContent>
	</Card>

	<!-- Notifications List -->
	<Card class="bg-white/80 dark:bg-slate-800/80 backdrop-blur-xl border border-white/30 dark:border-slate-700/50 rounded-lg shadow-xl">
		<CardHeader>
			<CardTitle>Recent Notifications</CardTitle>
			<CardDescription>
				All HR notifications and system alerts
			</CardDescription>
		</CardHeader>
		<CardContent>
			<!-- Enhanced bulk operations for notifications -->
			<EnhancedBulkActionsBar
				entityType="notifications"
				availableActions={[
					{ id: 'mark-read', label: 'Mark as Read', icon: 'MailOpen' },
					{ id: 'mark-unread', label: 'Mark as Unread', icon: 'Mail' },
					{ id: 'delete', label: 'Delete', icon: 'Trash2' },
					{ id: 'archive', label: 'Archive', icon: 'Archive' }
				]}
			/>
			{#if loading}
				<div class="flex items-center justify-center py-8">
					<div class="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
				</div>
			{:else if error}
				<div class="text-center py-8">
					<p class="text-destructive">{error}</p>
					<Button variant="outline" class="mt-4" onclick={() => window.location.reload()}>
						Retry
					</Button>
				</div>
			{:else if notifications.length === 0}
				<div class="text-center py-8">
					<Bell class="mx-auto h-12 w-12 text-muted-foreground/50" />
					<h3 class="mt-4 text-lg font-semibold">No notifications found</h3>
					<p class="mt-2 text-muted-foreground">
						{typeFilter !== 'all' || readFilter !== 'all'
							? 'No notifications match the selected filters'
							: 'You\'re all caught up! No new notifications.'}
					</p>
				</div>
			{:else}
				<div class="space-y-3">
					{#each notifications as notification}
						{@const TypeIcon = getTypeIcon(notification.type)}
						
						<div class="border border-border/50 rounded-lg p-4 transition-colors {
							!notification.isRead 
								? 'bg-blue-50/50 dark:bg-blue-950/20 border-blue-200/50 dark:border-blue-800/50' 
								: 'hover:bg-accent/30'
						}">
							<div class="flex items-start space-x-4">
								<div class="flex-shrink-0 mt-1">
									<div class="w-8 h-8 rounded-lg flex items-center justify-center {
										!notification.isRead ? 'bg-blue-100 dark:bg-blue-900/30' : 'bg-muted/50'
									}">
										<TypeIcon class="h-4 w-4 {getTypeColor(notification.type)}" />
									</div>
								</div>
								
								<div class="flex-1 min-w-0">
									<div class="flex items-start justify-between">
										<div class="flex-1 min-w-0">
											<h4 class="font-medium text-foreground {!notification.isRead ? 'font-semibold' : ''}">
												{notification.title || 'Notification'}
											</h4>
											<p class="text-sm text-muted-foreground mt-1">
												{notification.message || notification.content || 'No message content'}
											</p>
											<div class="flex items-center space-x-3 mt-2">
												<Badge variant={getTypeVariant(notification.type)}>
													{notification.type || 'General'}
												</Badge>
												<span class="text-xs text-muted-foreground">
													{formatDate(notification.createdAt)}
												</span>
												{#if notification.employee}
													<span class="text-xs text-muted-foreground">
														From: {notification.employee.first_name} {notification.employee.last_name}
													</span>
												{/if}
											</div>
										</div>
										
										<div class="flex items-center space-x-1 ml-4">
											{#if !notification.isRead}
												<Button 
													variant="ghost" 
													size="sm" 
													onclick={() => markAsRead(notification.id)}
													class="h-8 w-8 p-0"
												>
													<CheckCircle class="h-4 w-4" />
												</Button>
											{/if}
											<Button 
												variant="ghost" 
												size="sm"
												class="h-8 w-8 p-0"
											>
												<X class="h-4 w-4" />
											</Button>
										</div>
									</div>
								</div>
							</div>
						</div>
					{/each}
				</div>
			{/if}
		</CardContent>
	</Card>
</div>