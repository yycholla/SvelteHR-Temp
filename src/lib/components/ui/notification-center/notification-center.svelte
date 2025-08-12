<script lang="ts" module>
	import { tv, type VariantProps } from "tailwind-variants";
	import { cn } from "$lib/utils.js";

	export const notificationCenterVariants = tv({
		base: "fixed right-4 top-16 z-50 w-96 max-h-[80vh] overflow-hidden rounded-2xl border border-border/40 bg-background/95 backdrop-blur-md shadow-2xl transition-all duration-300",
		variants: {
			state: {
				open: "scale-100 opacity-100 translate-x-0",
				closed: "scale-95 opacity-0 translate-x-full pointer-events-none",
			}
		},
		defaultVariants: {
			state: "closed",
		},
	});

	export const notificationItemVariants = tv({
		base: "flex items-start gap-3 p-4 border-b border-border/20 transition-all duration-200 hover:bg-muted/30",
		variants: {
			priority: {
				info: "border-l-4 border-l-blue-500",
				success: "border-l-4 border-l-green-500",
				warning: "border-l-4 border-l-yellow-500",
				error: "border-l-4 border-l-red-500",
				urgent: "border-l-4 border-l-purple-500 bg-purple-50/50 dark:bg-purple-950/10",
			},
			read: {
				true: "opacity-60",
				false: "opacity-100",
			}
		},
		defaultVariants: {
			priority: "info",
			read: false,
		},
	});

	export const toastVariants = tv({
		base: "fixed right-4 top-20 z-[100] min-w-80 max-w-md rounded-xl border border-border/40 bg-background/95 backdrop-blur-md p-4 shadow-xl transition-all duration-300",
		variants: {
			priority: {
				info: "border-blue-500/50 bg-blue-50/50 dark:bg-blue-950/10",
				success: "border-green-500/50 bg-green-50/50 dark:bg-green-950/10",
				warning: "border-yellow-500/50 bg-yellow-50/50 dark:bg-yellow-950/10",
				error: "border-red-500/50 bg-red-50/50 dark:bg-red-950/10",
				urgent: "border-purple-500/50 bg-purple-50/50 dark:bg-purple-950/10",
			},
			state: {
				entering: "translate-x-full opacity-0 scale-95",
				visible: "translate-x-0 opacity-100 scale-100",
				exiting: "translate-x-full opacity-0 scale-95",
			}
		},
		defaultVariants: {
			priority: "info",
			state: "visible",
		},
	});

	export type NotificationPriority = VariantProps<typeof notificationItemVariants>["priority"];
	export type NotificationCenterState = VariantProps<typeof notificationCenterVariants>["state"];
	export type ToastState = VariantProps<typeof toastVariants>["state"];

	export interface Notification {
		id: string;
		title: string;
		message: string;
		priority: NotificationPriority;
		timestamp: Date;
		read: boolean;
		category?: string;
		actionUrl?: string;
		actionLabel?: string;
		data?: Record<string, any>;
	}

	export type NotificationCenterProps = {
		notifications: Notification[];
		isOpen: boolean;
		onClose: () => void;
		onMarkRead: (id: string) => void;
		onMarkAllRead: () => void;
		onClearAll: () => void;
		onNotificationClick?: (notification: Notification) => void;
		class?: string;
	};

	export type ToastNotificationProps = {
		notification: Notification;
		onDismiss: (id: string) => void;
		onAction?: (notification: Notification) => void;
		autoHideDuration?: number;
		class?: string;
	};
</script>

<script lang="ts">
	import { Bell, X, Check, CheckCheck, Trash2, ExternalLink, AlertCircle, Info, CheckCircle, AlertTriangle } from 'lucide-svelte';
	import Button from '../button/button.svelte';
	import Badge from '../badge/badge.svelte';
	import Separator from '../separator/separator.svelte';
	import { formatDistanceToNow } from 'date-fns';

	let {
		notifications,
		isOpen,
		onClose,
		onMarkRead,
		onMarkAllRead,
		onClearAll,
		onNotificationClick,
		class: className,
	}: NotificationCenterProps = $props();

	const unreadCount = $derived(notifications.filter(n => !n.read).length);
	const categorizedNotifications = $derived(
		notifications.reduce((acc, notification) => {
			const category = notification.category || 'General';
			if (!acc[category]) acc[category] = [];
			acc[category].push(notification);
			return acc;
		}, {} as Record<string, Notification[]>)
	);

	function getPriorityIcon(priority: NotificationPriority) {
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

	function getPriorityColor(priority: NotificationPriority) {
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

	function handleNotificationClick(notification: Notification) {
		if (!notification.read) {
			onMarkRead(notification.id);
		}
		onNotificationClick?.(notification);
	}

	function handleKeydown(event: KeyboardEvent) {
		if (event.key === 'Escape') {
			onClose();
		}
	}
</script>

<svelte:window on:keydown={handleKeydown} />

<!-- Overlay -->
{#if isOpen}
	<div 
		class="fixed inset-0 z-40 bg-background/20 backdrop-blur-sm"
		onclick={onClose}
		aria-hidden="true"
	></div>
{/if}

<!-- Notification Center Panel -->
<div 
	class={cn(notificationCenterVariants({ state: isOpen ? "open" : "closed" }), className)}
	role="dialog"
	aria-label="Notification Center"
	aria-modal="true"
>
	<!-- Header -->
	<div class="flex items-center justify-between p-4 border-b border-border/40">
		<div class="flex items-center gap-3">
			<Bell class="h-5 w-5" />
			<div>
				<h3 class="font-semibold">Notifications</h3>
				<p class="text-xs text-muted-foreground">
					{unreadCount} unread of {notifications.length} total
				</p>
			</div>
		</div>
		
		<div class="flex items-center gap-2">
			{#if unreadCount > 0}
				<Button
					variant="ghost" 
					size="sm"
					onclick={onMarkAllRead}
					class="text-xs"
				>
					<CheckCheck class="h-3 w-3 mr-1" />
					Mark all read
				</Button>
			{/if}
			
			<Button
				variant="ghost"
				size="icon"
				onclick={onClearAll}
				class="h-8 w-8"
				title="Clear all notifications"
			>
				<Trash2 class="h-4 w-4" />
			</Button>
			
			<Button
				variant="ghost"
				size="icon"
				onclick={onClose}
				class="h-8 w-8"
			>
				<X class="h-4 w-4" />
			</Button>
		</div>
	</div>

	<!-- Notifications List -->
	<div class="flex-1 overflow-y-auto">
		{#if notifications.length === 0}
			<div class="flex flex-col items-center justify-center py-12 text-center">
				<Bell class="h-12 w-12 text-muted-foreground/50 mb-4" />
				<p class="text-sm text-muted-foreground">No notifications</p>
				<p class="text-xs text-muted-foreground mt-1">You're all caught up!</p>
			</div>
		{:else}
			{#each Object.entries(categorizedNotifications) as [category, categoryNotifications] (category)}
				{#if Object.keys(categorizedNotifications).length > 1}
					<div class="px-4 py-2 bg-muted/20 border-b border-border/20">
						<p class="text-xs font-medium text-muted-foreground uppercase tracking-wide">
							{category}
						</p>
					</div>
				{/if}
				
				{#each categoryNotifications as notification (notification.id)}
					{@const IconComponent = getPriorityIcon(notification.priority)}
					<div 
						class={notificationItemVariants({ priority: notification.priority, read: notification.read })}
						role="button"
						tabindex="0"
						onclick={() => handleNotificationClick(notification)}
						onkeydown={(e) => e.key === 'Enter' && handleNotificationClick(notification)}
					>
						<!-- Priority Icon -->
						<div class="flex-shrink-0 mt-0.5">
							<IconComponent class="h-4 w-4 {getPriorityColor(notification.priority)}" />
						</div>
						
						<!-- Content -->
						<div class="flex-1 min-w-0">
							<div class="flex items-start justify-between gap-2">
								<h4 class="text-sm font-medium line-clamp-1">{notification.title}</h4>
								{#if !notification.read}
									<div class="h-2 w-2 rounded-full bg-primary flex-shrink-0 mt-2"></div>
								{/if}
							</div>
							
							<p class="text-sm text-muted-foreground mt-1 line-clamp-2">
								{notification.message}
							</p>
							
							<div class="flex items-center justify-between mt-2">
								<p class="text-xs text-muted-foreground">
									{formatDistanceToNow(notification.timestamp, { addSuffix: true })}
								</p>
								
								{#if notification.actionUrl}
									<Button
										variant="ghost"
										size="sm"
										class="text-xs h-6"
									>
										{notification.actionLabel || 'View'}
										<ExternalLink class="h-3 w-3 ml-1" />
									</Button>
								{/if}
							</div>
						</div>
					</div>
				{/each}
			{/each}
		{/if}
	</div>
</div>