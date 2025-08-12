<script lang="ts" module>
	import { tv } from "tailwind-variants";
	import { cn } from "$lib/utils.js";

	export const statusOverviewCardVariants = tv({
		base: "rounded-xl border border-border/40 bg-card shadow-sm",
		variants: {
			size: {
				sm: "p-4",
				default: "p-6",
				lg: "p-8",
			}
		},
		defaultVariants: {
			size: "default",
		},
	});

	export const statusItemVariants = tv({
		base: "flex items-center justify-between p-3 rounded-lg transition-all duration-200 hover:bg-muted/30",
		variants: {
			status: {
				healthy: "border-l-4 border-l-green-500",
				warning: "border-l-4 border-l-yellow-500",
				critical: "border-l-4 border-l-red-500",
				info: "border-l-4 border-l-blue-500",
				neutral: "border-l-4 border-l-gray-500",
			}
		},
		defaultVariants: {
			status: "neutral",
		},
	});

	export interface StatusItem {
		id: string;
		label: string;
		value: number | string;
		status: 'healthy' | 'warning' | 'critical' | 'info' | 'neutral';
		description?: string;
		icon?: any;
		trend?: 'up' | 'down' | 'stable';
		target?: number;
		unit?: string;
		onClick?: () => void;
	}

	export type StatusOverviewCardProps = {
		title: string;
		description?: string;
		items: StatusItem[];
		isLive?: boolean;
		lastUpdated?: Date;
		onRefresh?: () => void;
		class?: string;
		size?: 'sm' | 'default' | 'lg';
	};
</script>

<script lang="ts">
	import { 
		BarChart3,
		TrendingUp,
		TrendingDown,
		Minus,
		RefreshCw,
		CheckCircle,
		AlertTriangle,
		AlertCircle,
		Info,
		Circle
	} from 'lucide-svelte';
	import Button from '../button/button.svelte';
	import Progress from '../progress/progress.svelte';
	import { formatDistanceToNow } from 'date-fns';

	let {
		title,
		description,
		items,
		isLive = false,
		lastUpdated,
		onRefresh,
		class: className,
		size = "default",
	}: StatusOverviewCardProps = $props();

	function getStatusIcon(status: StatusItem['status']) {
		switch (status) {
			case 'healthy':
				return CheckCircle;
			case 'warning':
				return AlertTriangle;
			case 'critical':
				return AlertCircle;
			case 'info':
				return Info;
			default:
				return Circle;
		}
	}

	function getStatusColor(status: StatusItem['status']) {
		switch (status) {
			case 'healthy':
				return 'text-green-600 dark:text-green-400';
			case 'warning':
				return 'text-yellow-600 dark:text-yellow-400';
			case 'critical':
				return 'text-red-600 dark:text-red-400';
			case 'info':
				return 'text-blue-600 dark:text-blue-400';
			default:
				return 'text-muted-foreground';
		}
	}

	function getTrendIcon(trend: StatusItem['trend']) {
		switch (trend) {
			case 'up':
				return TrendingUp;
			case 'down':
				return TrendingDown;
			default:
				return Minus;
		}
	}

	function getTrendColor(trend: StatusItem['trend']) {
		switch (trend) {
			case 'up':
				return 'text-green-600 dark:text-green-400';
			case 'down':
				return 'text-red-600 dark:text-red-400';
			default:
				return 'text-muted-foreground';
		}
	}

	function formatValue(value: number | string, unit?: string): string {
		if (typeof value === 'number') {
			if (value >= 1_000_000) {
				return `${(value / 1_000_000).toFixed(1)}M${unit ? ` ${unit}` : ''}`;
			}
			if (value >= 1_000) {
				return `${(value / 1_000).toFixed(1)}K${unit ? ` ${unit}` : ''}`;
			}
			return `${value.toLocaleString()}${unit ? ` ${unit}` : ''}`;
		}
		return `${value}${unit ? ` ${unit}` : ''}`;
	}

	function getProgressPercentage(value: number | string, target?: number): number {
		if (typeof value !== 'number' || !target) return 0;
		return Math.min((value / target) * 100, 100);
	}

	function getProgressVariant(status: StatusItem['status']) {
		switch (status) {
			case 'healthy':
				return 'success' as const;
			case 'warning':
				return 'warning' as const;
			case 'critical':
				return 'destructive' as const;
			default:
				return 'default' as const;
		}
	}
</script>

<div class={cn(statusOverviewCardVariants({ size }), className)}>
	<!-- Header -->
	<div class="flex items-center justify-between mb-6">
		<div class="flex items-center gap-3">
			<div class="flex items-center gap-2">
				{#if isLive}
					<div class="h-2 w-2 rounded-full bg-green-500 animate-pulse"></div>
				{/if}
				<BarChart3 class="h-5 w-5 text-primary" />
				<div>
					<h3 class="font-semibold">{title}</h3>
					{#if description}
						<p class="text-xs text-muted-foreground mt-1">{description}</p>
					{/if}
				</div>
			</div>
		</div>

		{#if onRefresh}
			<Button variant="ghost" size="icon" onclick={onRefresh} class="h-8 w-8">
				<RefreshCw class="h-4 w-4" />
			</Button>
		{/if}
	</div>

	<!-- Status Items -->
	<div class="space-y-3">
		{#if items.length === 0}
			<div class="flex flex-col items-center justify-center py-8 text-center">
				<BarChart3 class="h-8 w-8 text-muted-foreground/50 mb-3" />
				<p class="text-sm text-muted-foreground">No status data</p>
			</div>
		{:else}
			{#each items as item (item.id)}
				{@const StatusIcon = item.icon || getStatusIcon(item.status)}
				{@const TrendIcon = item.trend ? getTrendIcon(item.trend) : null}
				
				<div 
					class={statusItemVariants({ status: item.status })}
					role={item.onClick ? "button" : undefined}
					tabindex={item.onClick ? 0 : undefined}
					onclick={item.onClick}
					onkeydown={(e) => item.onClick && e.key === 'Enter' && item.onClick()}
				>
					<div class="flex items-center gap-3 flex-1 min-w-0">
						<!-- Status Icon -->
						<StatusIcon class="h-5 w-5 {getStatusColor(item.status)} flex-shrink-0" />
						
						<!-- Label and Description -->
						<div class="min-w-0 flex-1">
							<div class="flex items-center gap-2">
								<span class="font-medium text-sm">{item.label}</span>
								{#if item.trend && TrendIcon}
									<TrendIcon class="h-3 w-3 {getTrendColor(item.trend)}" />
								{/if}
							</div>
							{#if item.description}
								<p class="text-xs text-muted-foreground mt-1 line-clamp-1">
									{item.description}
								</p>
							{/if}
						</div>
					</div>

					<!-- Value and Progress -->
					<div class="flex flex-col items-end gap-2 flex-shrink-0">
						<span class="font-semibold text-sm">
							{formatValue(item.value, item.unit)}
						</span>
						
						{#if item.target && typeof item.value === 'number'}
							<div class="w-16">
								<Progress 
									value={getProgressPercentage(item.value, item.target)} 
									variant={getProgressVariant(item.status)}
									class="h-1"
								/>
								<p class="text-xs text-muted-foreground mt-1 text-right">
									of {formatValue(item.target, item.unit)}
								</p>
							</div>
						{/if}
					</div>
				</div>
			{/each}
		{/if}
	</div>

	<!-- Footer -->
	{#if lastUpdated}
		<div class="flex items-center justify-between text-xs text-muted-foreground mt-6 pt-4 border-t border-border/20">
			<span>Last updated</span>
			<span>{formatDistanceToNow(lastUpdated, { addSuffix: true })}</span>
		</div>
	{/if}
</div>