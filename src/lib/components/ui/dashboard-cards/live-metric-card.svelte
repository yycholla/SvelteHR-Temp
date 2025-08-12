<script lang="ts" module>
	import { tv, type VariantProps } from "tailwind-variants";
	import { cn } from "$lib/utils.js";

	export const liveMetricCardVariants = tv({
		base: "relative rounded-xl border border-border/40 bg-card p-6 shadow-sm transition-all duration-300 hover:shadow-md",
		variants: {
			status: {
				default: "",
				updating: "ring-2 ring-primary/20 animate-pulse",
				error: "border-destructive/50 bg-destructive/5",
				success: "border-green-500/50 bg-green-50/20 dark:bg-green-950/10",
			},
			size: {
				sm: "p-4",
				default: "p-6",
				lg: "p-8",
			}
		},
		defaultVariants: {
			status: "default",
			size: "default",
		},
	});

	export interface MetricData {
		value: number | string;
		previousValue?: number | string;
		change?: number;
		changeType?: 'increase' | 'decrease' | 'neutral';
		unit?: string;
		formatter?: (value: number | string) => string;
	}

	export interface ChartData {
		labels: string[];
		datasets: {
			label: string;
			data: number[];
			color?: string;
		}[];
	}

	export type LiveMetricCardStatus = VariantProps<typeof liveMetricCardVariants>["status"];
	export type LiveMetricCardSize = VariantProps<typeof liveMetricCardVariants>["size"];

	export type LiveMetricCardProps = {
		title: string;
		description?: string;
		metric: MetricData;
		trend?: ChartData;
		icon?: any;
		status?: LiveMetricCardStatus;
		size?: LiveMetricCardSize;
		lastUpdated?: Date;
		isLive?: boolean;
		onRetry?: () => void;
		class?: string;
	};
</script>

<script lang="ts">
	import { 
		TrendingUp, 
		TrendingDown, 
		Minus, 
		Wifi, 
		WifiOff, 
		RefreshCw, 
		AlertTriangle 
	} from 'lucide-svelte';
	import Button from '../button/button.svelte';
	import Badge from '../badge/badge.svelte';
	import { formatDistanceToNow } from 'date-fns';

	let {
		title,
		description,
		metric,
		trend,
		icon,
		status = "default",
		size = "default",
		lastUpdated,
		isLive = false,
		onRetry,
		class: className,
	}: LiveMetricCardProps = $props();

	function formatMetricValue(value: number | string): string {
		if (metric.formatter) {
			return metric.formatter(value);
		}
		
		if (typeof value === 'number') {
			// Format large numbers with appropriate suffixes
			if (value >= 1_000_000) {
				return `${(value / 1_000_000).toFixed(1)}M`;
			}
			if (value >= 1_000) {
				return `${(value / 1_000).toFixed(1)}K`;
			}
			return value.toLocaleString();
		}
		
		return String(value);
	}

	function formatChange(change: number): string {
		const sign = change > 0 ? '+' : '';
		return `${sign}${change.toFixed(1)}%`;
	}

	function getChangeIcon(changeType: string) {
		switch (changeType) {
			case 'increase':
				return TrendingUp;
			case 'decrease':
				return TrendingDown;
			default:
				return Minus;
		}
	}

	function getChangeColor(changeType: string) {
		switch (changeType) {
			case 'increase':
				return 'text-green-600 dark:text-green-400';
			case 'decrease':
				return 'text-red-600 dark:text-red-400';
			default:
				return 'text-muted-foreground';
		}
	}

	const hasChange = $derived(metric.change !== undefined && metric.changeType);
</script>

<div class={cn(liveMetricCardVariants({ status, size }), className)}>
	<!-- Live Status Indicator -->
	{#if isLive}
		<div class="absolute top-3 right-3">
			{#if status === 'error'}
				<div class="flex items-center gap-1 text-xs text-destructive">
					<WifiOff class="h-3 w-3" />
					<span>Offline</span>
				</div>
			{:else}
				<div class="flex items-center gap-1 text-xs text-green-600 dark:text-green-400">
					<div class="h-2 w-2 rounded-full bg-green-500 animate-pulse"></div>
					<span>Live</span>
				</div>
			{/if}
		</div>
	{/if}

	<!-- Header -->
	<div class="flex items-start justify-between mb-4">
		<div class="flex items-center gap-3">
			{#if icon}
				{@const IconComponent = icon}
				<div class="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
					<IconComponent class="h-5 w-5 text-primary" />
				</div>
			{/if}
			
			<div>
				<h3 class="font-semibold text-sm">{title}</h3>
				{#if description}
					<p class="text-xs text-muted-foreground mt-1">{description}</p>
				{/if}
			</div>
		</div>
	</div>

	<!-- Main Content -->
	{#if status === 'error'}
		<!-- Error State -->
		<div class="flex flex-col items-center justify-center py-6 text-center">
			<AlertTriangle class="h-8 w-8 text-destructive mb-3" />
			<p class="text-sm text-destructive mb-3">Failed to load data</p>
			{#if onRetry}
				<Button variant="outline" size="sm" onclick={onRetry}>
					<RefreshCw class="h-4 w-4 mr-2" />
					Retry
				</Button>
			{/if}
		</div>
	{:else}
		<!-- Metric Display -->
		<div class="space-y-4">
			<!-- Main Metric -->
			<div class="flex items-end justify-between">
				<div>
					<div class="text-2xl font-bold">
						{formatMetricValue(metric.value)}
						{#if metric.unit}
							<span class="text-lg text-muted-foreground ml-1">{metric.unit}</span>
						{/if}
					</div>
					
					<!-- Change Indicator -->
					{#if hasChange}
						{@const ChangeIcon = getChangeIcon(metric.changeType)}
						<div class="flex items-center gap-1 mt-1">
							<ChangeIcon class="h-4 w-4 {getChangeColor(metric.changeType)}" />
							<span class="text-sm {getChangeColor(metric.changeType)}">
								{formatChange(metric.change)}
							</span>
							{#if metric.previousValue}
								<span class="text-xs text-muted-foreground">
									from {formatMetricValue(metric.previousValue)}
								</span>
							{/if}
						</div>
					{/if}
				</div>
				
				<!-- Mini Trend Chart Placeholder -->
				{#if trend}
					<div class="w-16 h-8 opacity-60">
						<!-- This would be replaced with an actual mini chart component -->
						<div class="h-full w-full bg-primary/20 rounded"></div>
					</div>
				{/if}
			</div>
			
			<!-- Last Updated -->
			{#if lastUpdated}
				<div class="flex items-center justify-between text-xs text-muted-foreground pt-2 border-t border-border/20">
					<span>Last updated</span>
					<span>{formatDistanceToNow(lastUpdated, { addSuffix: true })}</span>
				</div>
			{/if}
		</div>
	{/if}
</div>