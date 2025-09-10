<script lang="ts">
	import { onMount } from 'svelte';
	import { fade } from 'svelte/transition';
	import { realtimeManager } from '$lib/graphql/realtime.svelte';
	import Badge from '$lib/components/ui/badge/badge.svelte';
	import Button from '$lib/components/ui/button/button.svelte';
	import { Wifi, WifiOff, RefreshCw, AlertTriangle, CheckCircle } from 'lucide-svelte';

	// Component props
	let {
		showDetails = false,
		compact = false,
		autoHide = false
	}: {
		showDetails?: boolean;
		compact?: boolean;
		autoHide?: boolean;
	} = $props();

	// Reactive state from realtime manager
	$: connectionStatus = realtimeManager.connectionStatus;
	$: lastError = realtimeManager.lastError;
	$: reconnectAttempts = realtimeManager.reconnectAttempts;
	$: subscriptionCount = realtimeManager.subscriptionCount;

	// Computed values
	$: isConnected = connectionStatus === 'connected';
	$: isConnecting = connectionStatus === 'connecting';
	$: hasError = connectionStatus === 'error';
	$: isDisconnected = connectionStatus === 'disconnected';

	// Auto-hide logic for successful connections
	let visible = $state(true);
	
	$: if (autoHide && isConnected) {
		setTimeout(() => {
			visible = false;
		}, 3000);
	} else if (!isConnected) {
		visible = true;
	}

	// Status display configuration
	$: statusConfig = {
		connected: {
			icon: CheckCircle,
			color: 'success',
			text: 'Connected',
			description: `${subscriptionCount} active subscriptions`
		},
		connecting: {
			icon: RefreshCw,
			color: 'warning',
			text: reconnectAttempts > 0 ? `Reconnecting... (${reconnectAttempts})` : 'Connecting...',
			description: 'Establishing real-time connection'
		},
		error: {
			icon: AlertTriangle,
			color: 'destructive',
			text: 'Connection Error',
			description: lastError || 'Real-time connection failed'
		},
		disconnected: {
			icon: WifiOff,
			color: 'secondary',
			text: 'Disconnected',
			description: 'Real-time features unavailable'
		}
	}[connectionStatus];

	// Handle manual reconnection
	function handleReconnect() {
		realtimeManager.reconnect();
	}

	// Component lifecycle
	onMount(() => {
		// Component is mounted, reactive subscriptions are already active
		return () => {
			// Cleanup if needed
		};
	});
</script>

{#if visible}
	<div 
		class="realtime-status {compact ? 'compact' : 'full'}"
		transition:fade={{ duration: 200 }}
	>
		{#if compact}
			<!-- Compact status indicator -->
			<div class="flex items-center space-x-2">
				<div class="relative">
					<svelte:component 
						this={statusConfig.icon} 
						class="h-4 w-4 {isConnecting ? 'animate-spin' : ''}"
						class:text-green-500={isConnected}
						class:text-yellow-500={isConnecting}
						class:text-red-500={hasError}
						class:text-gray-400={isDisconnected}
					/>
					
					{#if isConnected && subscriptionCount > 0}
						<div class="absolute -top-1 -right-1 h-2 w-2 rounded-full bg-green-400 animate-pulse"></div>
					{/if}
				</div>

				{#if !isConnected}
					<span class="text-xs text-muted-foreground">
						{statusConfig.text}
					</span>
				{/if}
			</div>
		{:else}
			<!-- Full status display -->
			<div class="flex items-center justify-between rounded-lg border p-3 {getBorderClass(connectionStatus)}">
				<div class="flex items-center space-x-3">
					<div class="relative">
						<svelte:component 
							this={statusConfig.icon} 
							class="h-5 w-5 {isConnecting ? 'animate-spin' : ''}"
							class:text-green-500={isConnected}
							class:text-yellow-500={isConnecting}
							class:text-red-500={hasError}
							class:text-gray-400={isDisconnected}
						/>
						
						{#if isConnected && subscriptionCount > 0}
							<div class="absolute -top-1 -right-1 h-3 w-3 rounded-full bg-green-400">
								<div class="h-full w-full rounded-full animate-ping bg-green-400 opacity-75"></div>
							</div>
						{/if}
					</div>

					<div>
						<div class="flex items-center space-x-2">
							<span class="text-sm font-medium">
								Real-time Status
							</span>
							
							<Badge variant={getBadgeVariant(connectionStatus)}>
								{statusConfig.text}
							</Badge>
						</div>

						{#if showDetails}
							<p class="text-xs text-muted-foreground mt-1">
								{statusConfig.description}
							</p>

							{#if hasError && lastError}
								<p class="text-xs text-red-600 mt-1">
									Error: {lastError}
								</p>
							{/if}
						{/if}
					</div>
				</div>

				{#if !isConnected && !isConnecting}
					<Button
						variant="outline"
						size="sm"
						onclick={handleReconnect}
						class="text-xs"
					>
						<RefreshCw class="mr-1 h-3 w-3" />
						Reconnect
					</Button>
				{/if}
			</div>
		{/if}
	</div>
{/if}

<script context="module" lang="ts">
	function getBorderClass(status: string): string {
		switch (status) {
			case 'connected':
				return 'border-green-200 bg-green-50';
			case 'connecting':
				return 'border-yellow-200 bg-yellow-50';
			case 'error':
				return 'border-red-200 bg-red-50';
			default:
				return 'border-gray-200 bg-gray-50';
		}
	}

	function getBadgeVariant(status: string): 'default' | 'secondary' | 'destructive' | 'outline' {
		switch (status) {
			case 'connected':
				return 'default';
			case 'connecting':
				return 'secondary';
			case 'error':
				return 'destructive';
			default:
				return 'outline';
		}
	}
</script>

<style>
	.realtime-status.compact {
		display: inline-flex;
		align-items: center;
	}
	
	.realtime-status.full {
		width: 100%;
	}

	:global(.realtime-status .animate-ping) {
		animation: ping 1s cubic-bezier(0, 0, 0.2, 1) infinite;
	}
	
	@keyframes ping {
		75%, 100% {
			transform: scale(2);
			opacity: 0;
		}
	}
</style>