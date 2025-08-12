<script lang="ts" module>
	import { tv, type VariantProps } from "tailwind-variants";
	import { cn } from "$lib/utils.js";

	export const websocketIndicatorVariants = tv({
		base: "fixed z-50 flex items-center gap-2 rounded-full border border-border/40 bg-background/95 backdrop-blur-sm px-3 py-2 text-xs font-medium shadow-lg transition-all duration-300",
		variants: {
			position: {
				"top-right": "top-4 right-4",
				"top-left": "top-4 left-4",
				"bottom-right": "bottom-4 right-4",
				"bottom-left": "bottom-4 left-4",
			},
			variant: {
				minimal: "px-2 py-2",
				detailed: "px-3 py-2",
				toast: "px-4 py-3",
			},
			status: {
				connected: "border-green-500/50 bg-green-50 text-green-700 dark:bg-green-950/20 dark:text-green-400",
				disconnected: "border-red-500/50 bg-red-50 text-red-700 dark:bg-red-950/20 dark:text-red-400",
				connecting: "border-yellow-500/50 bg-yellow-50 text-yellow-700 dark:bg-yellow-950/20 dark:text-yellow-400",
				reconnecting: "border-orange-500/50 bg-orange-50 text-orange-700 dark:bg-orange-950/20 dark:text-orange-400",
			}
		},
		defaultVariants: {
			position: "top-right",
			variant: "detailed",
			status: "connected",
		},
	});

	export const statusDotVariants = tv({
		base: "h-2 w-2 rounded-full transition-all duration-300",
		variants: {
			status: {
				connected: "bg-green-500 animate-pulse",
				disconnected: "bg-red-500",
				connecting: "bg-yellow-500 animate-spin",
				reconnecting: "bg-orange-500 animate-pulse",
			}
		},
	});

	export type WebSocketIndicatorPosition = VariantProps<typeof websocketIndicatorVariants>["position"];
	export type WebSocketIndicatorVariant = VariantProps<typeof websocketIndicatorVariants>["variant"];
	export type WebSocketIndicatorStatus = VariantProps<typeof websocketIndicatorVariants>["status"];

	export type WebSocketIndicatorProps = {
		position?: WebSocketIndicatorPosition;
		variant?: WebSocketIndicatorVariant;
		status: WebSocketIndicatorStatus;
		showWhenConnected?: boolean;
		latency?: number;
		retryCount?: number;
		lastConnected?: Date;
		class?: string;
	};
</script>

<script lang="ts">
	import { onMount } from 'svelte';
	import { Wifi, WifiOff, Loader, AlertTriangle } from 'lucide-svelte';

	let {
		position = "top-right",
		variant = "detailed",
		status = "connected",
		showWhenConnected = false,
		latency,
		retryCount,
		lastConnected,
		class: className,
	}: WebSocketIndicatorProps = $props();

	let show = $state(true);
	let hideTimeout: number | undefined;

	// Auto-hide when connected (if showWhenConnected is false)
	$effect(() => {
		if (!showWhenConnected && status === 'connected') {
			hideTimeout = window.setTimeout(() => {
				show = false;
			}, 3000);
		} else {
			if (hideTimeout) {
				clearTimeout(hideTimeout);
				hideTimeout = undefined;
			}
			show = true;
		}

		return () => {
			if (hideTimeout) {
				clearTimeout(hideTimeout);
			}
		};
	});

	function getStatusIcon(status: WebSocketIndicatorStatus) {
		switch (status) {
			case 'connected':
				return Wifi;
			case 'disconnected':
				return WifiOff;
			case 'connecting':
			case 'reconnecting':
				return Loader;
			default:
				return AlertTriangle;
		}
	}

	function getStatusText(status: WebSocketIndicatorStatus) {
		switch (status) {
			case 'connected':
				return 'Connected';
			case 'disconnected':
				return 'Disconnected';
			case 'connecting':
				return 'Connecting...';
			case 'reconnecting':
				return retryCount ? `Reconnecting (${retryCount})` : 'Reconnecting...';
			default:
				return 'Unknown';
		}
	}

	function formatLatency(ms: number): string {
		if (ms < 100) return `${ms}ms`;
		if (ms < 1000) return `${Math.round(ms)}ms`;
		return `${(ms / 1000).toFixed(1)}s`;
	}

	onMount(() => {
		// Initial state setup
		show = showWhenConnected || status !== 'connected';
	});
</script>

{#if show}
	<div 
		class={cn(websocketIndicatorVariants({ position, variant, status }), className)}
		role="status"
		aria-live="polite"
		aria-label="WebSocket connection status"
	>
		<!-- Status Dot -->
		<div class={statusDotVariants({ status })}></div>
		
		{#if variant !== 'minimal'}
			<!-- Status Icon -->
			{@const IconComponent = getStatusIcon(status)}
			<IconComponent class="h-3 w-3" />
			
			<!-- Status Text -->
			<span>{getStatusText(status)}</span>
			
			{#if variant === 'detailed'}
				<!-- Latency Display (when connected) -->
				{#if status === 'connected' && latency}
					<span class="text-muted-foreground">•</span>
					<span class="text-muted-foreground">{formatLatency(latency)}</span>
				{/if}
				
				<!-- Last Connected (when disconnected) -->
				{#if status === 'disconnected' && lastConnected}
					<span class="text-muted-foreground">•</span>
					<span class="text-muted-foreground">
						{lastConnected.toLocaleTimeString()}
					</span>
				{/if}
			{/if}
		{/if}
	</div>
{/if}