<script lang="ts" module>
	import { tv } from 'tailwind-variants';
	import { cn } from '$lib/utils.js';

	export const activityFeedCardVariants = tv({
		base: 'rounded-xl border border-border/40 bg-card shadow-sm',
		variants: {
			size: {
				sm: 'p-4',
				default: 'p-6',
				lg: 'p-8'
			}
		},
		defaultVariants: {
			size: 'default'
		}
	});

	export const activityItemVariants = tv({
		base: 'flex items-start gap-3 p-3 rounded-lg transition-colors duration-200',
		variants: {
			priority: {
				low: 'hover:bg-muted/30',
				normal: 'hover:bg-muted/30',
				high: 'hover:bg-yellow-50/50 dark:hover:bg-yellow-950/10',
				urgent: 'hover:bg-red-50/50 dark:hover:bg-red-950/10'
			},
			read: {
				true: 'opacity-70',
				false: 'opacity-100'
			}
		},
		defaultVariants: {
			priority: 'normal',
			read: false
		}
	});

	export interface ActivityItem {
		id: string;
		type: 'user_action' | 'system_event' | 'notification' | 'error' | 'success';
		title: string;
		description?: string;
		timestamp: Date;
		priority: 'low' | 'normal' | 'high' | 'urgent';
		read: boolean;
		icon?: any;
		user?: {
			name: string;
			avatar?: string;
		};
		metadata?: Record<string, any>;
	}

	export type ActivityFeedCardProps = {
		title: string;
		activities: ActivityItem[];
		maxItems?: number;
		isLive?: boolean;
		onItemClick?: (item: ActivityItem) => void;
		onMarkAllRead?: () => void;
		onViewAll?: () => void;
		class?: string;
		size?: 'sm' | 'default' | 'lg';
	};
</script>

<script lang="ts">
	import {
		Activity,
		User,
		CheckCircle,
		AlertCircle,
		Info,
		Settings,
		Bell,
		Eye,
		EyeOff,
		ExternalLink
	} from 'lucide-svelte';
	import Button from '../button/button.svelte';
	import Badge from '../badge/badge.svelte';
	import Avatar from '../avatar/avatar.svelte';
	import AvatarImage from '../avatar/avatar-image.svelte';
	import AvatarFallback from '../avatar/avatar-fallback.svelte';
	import { formatDistanceToNow } from 'date-fns';

	let {
		title,
		activities,
		maxItems = 5,
		isLive = false,
		onItemClick,
		onMarkAllRead,
		onViewAll,
		class: className,
		size = 'default'
	}: ActivityFeedCardProps = $props();

	const displayedActivities = $derived(activities.slice(0, maxItems));
	const unreadCount = $derived(activities.filter((a) => !a.read).length);
	const hasMore = $derived(activities.length > maxItems);

	function getActivityTypeIcon(type: ActivityItem['type']) {
		switch (type) {
			case 'user_action':
				return User;
			case 'system_event':
				return Settings;
			case 'notification':
				return Bell;
			case 'error':
				return AlertCircle;
			case 'success':
				return CheckCircle;
			default:
				return Info;
		}
	}

	function getActivityTypeColor(type: ActivityItem['type']) {
		switch (type) {
			case 'user_action':
				return 'text-blue-600 dark:text-blue-400';
			case 'system_event':
				return 'text-gray-600 dark:text-gray-400';
			case 'notification':
				return 'text-purple-600 dark:text-purple-400';
			case 'error':
				return 'text-red-600 dark:text-red-400';
			case 'success':
				return 'text-green-600 dark:text-green-400';
			default:
				return 'text-muted-foreground';
		}
	}

	function getPriorityIndicator(priority: ActivityItem['priority']) {
		switch (priority) {
			case 'urgent':
				return 'bg-red-500';
			case 'high':
				return 'bg-yellow-500';
			case 'normal':
				return 'bg-blue-500';
			case 'low':
				return 'bg-gray-400';
		}
	}

	function handleItemClick(item: ActivityItem) {
		onItemClick?.(item);
	}
</script>

<div class={cn(activityFeedCardVariants({ size }), className)}>
	<!-- Header -->
	<div class="mb-4 flex items-center justify-between">
		<div class="flex items-center gap-3">
			<div class="flex items-center gap-2">
				{#if isLive}
					<div class="h-2 w-2 animate-pulse rounded-full bg-green-500"></div>
				{/if}
				<Activity class="h-5 w-5 text-primary" />
				<h3 class="font-semibold">{title}</h3>
			</div>

			{#if unreadCount > 0}
				<Badge variant="secondary" class="text-xs">
					{unreadCount} new
				</Badge>
			{/if}
		</div>

		<div class="flex items-center gap-2">
			{#if unreadCount > 0 && onMarkAllRead}
				<Button variant="ghost" size="sm" onclick={onMarkAllRead} class="text-xs">
					<EyeOff class="mr-1 h-3 w-3" />
					Mark all read
				</Button>
			{/if}

			{#if onViewAll}
				<Button variant="ghost" size="sm" onclick={onViewAll} class="text-xs">
					<ExternalLink class="mr-1 h-3 w-3" />
					View all
				</Button>
			{/if}
		</div>
	</div>

	<!-- Activities List -->
	<div class="space-y-1">
		{#if displayedActivities.length === 0}
			<div class="flex flex-col items-center justify-center py-8 text-center">
				<Activity class="mb-3 h-8 w-8 text-muted-foreground/50" />
				<p class="text-sm text-muted-foreground">No recent activity</p>
				<p class="mt-1 text-xs text-muted-foreground">Activity will appear here</p>
			</div>
		{:else}
			{#each displayedActivities as activity (activity.id)}
				{@const TypeIcon = activity.icon || getActivityTypeIcon(activity.type)}
				<div
					class={activityItemVariants({ priority: activity.priority, read: activity.read })}
					role="button"
					tabindex="0"
					onclick={() => handleItemClick(activity)}
					onkeydown={(e) => e.key === 'Enter' && handleItemClick(activity)}
				>
					<!-- Priority Indicator -->
					<div class="relative flex-shrink-0">
						{#if activity.user}
							<Avatar size="sm">
								{#if activity.user.avatar}
									<AvatarImage src={activity.user.avatar} alt={activity.user.name} />
								{/if}
								<AvatarFallback class="text-xs">
									{activity.user.name
										.split(' ')
										.map((n) => n[0])
										.join('')}
								</AvatarFallback>
							</Avatar>
						{:else}
							<div class="flex h-8 w-8 items-center justify-center rounded-full bg-muted/50">
								<TypeIcon class="h-4 w-4 {getActivityTypeColor(activity.type)}" />
							</div>
						{/if}

						<!-- Priority dot -->
						{#if activity.priority !== 'normal'}
							<div
								class="absolute -top-0.5 -right-0.5 h-3 w-3 rounded-full {getPriorityIndicator(
									activity.priority
								)}"
							></div>
						{/if}
					</div>

					<!-- Content -->
					<div class="min-w-0 flex-1">
						<div class="flex items-start justify-between gap-2">
							<h4 class="line-clamp-1 text-sm font-medium">{activity.title}</h4>
							{#if !activity.read}
								<div class="mt-2 h-2 w-2 flex-shrink-0 rounded-full bg-primary"></div>
							{/if}
						</div>

						{#if activity.description}
							<p class="mt-1 line-clamp-2 text-sm text-muted-foreground">
								{activity.description}
							</p>
						{/if}

						<div class="mt-2 flex items-center justify-between">
							<p class="text-xs text-muted-foreground">
								{formatDistanceToNow(activity.timestamp, { addSuffix: true })}
							</p>

							{#if activity.user}
								<p class="text-xs text-muted-foreground">
									{activity.user.name}
								</p>
							{/if}
						</div>
					</div>
				</div>
			{/each}

			{#if hasMore}
				<div class="border-t border-border/20 pt-3 text-center">
					<Button variant="ghost" size="sm" onclick={onViewAll} class="text-xs">
						<ExternalLink class="mr-1 h-3 w-3" />
						View {activities.length - maxItems} more
					</Button>
				</div>
			{/if}
		{/if}
	</div>
</div>
