<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import { 
		streamingManager, 
		streamingState, 
		isStreaming, 
		streamingProgress, 
		streamingMessage,
		streamingData,
		streamingErrors 
	} from '$lib/stores/streaming';
	import type { StreamingConfigKey } from '$lib/services/streaming';

    interface Props {
        configKey: StreamingConfigKey;
        title: string;
        fallbackData?: any;
        staticComponent?: any;
        streamingEndpoint?: string;
        streaming?: any; // snippet
        static?: any;    // snippet
        fallback?: any;  // snippet
    }

    let { 
        configKey, 
        title, 
        fallbackData = null, 
        staticComponent = null,
        streamingEndpoint,
        streaming: streamingSnippet,
        static: staticSnippet,
        fallback: fallbackSnippet
    }: Props = $props();

	let useStreamingMode = $state(false);
	let dataKeys: string[] = $state([]);

	const endpoint = streamingEndpoint || `/api/stream/${configKey}`;

	onMount(() => {
		// Load streaming preference from localStorage
		if (typeof localStorage !== 'undefined') {
			const saved = localStorage.getItem(`streaming-${configKey}-enabled`);
			useStreamingMode = saved === 'true';
		}

		// If streaming mode is enabled, start streaming
		if (useStreamingMode) {
			startStreaming();
		}

		// Subscribe to data updates
		const unsubscribe = streamingData.subscribe(data => {
			dataKeys = Object.keys(data);
		});

		return unsubscribe;
	});

	onDestroy(() => {
		streamingManager.disconnect();
	});

	function startStreaming() {
		streamingManager.connect(endpoint);
	}

	function toggleStreamingMode() {
		useStreamingMode = !useStreamingMode;
		
		// Save preference
		if (typeof localStorage !== 'undefined') {
			localStorage.setItem(`streaming-${configKey}-enabled`, useStreamingMode.toString());
		}

		if (useStreamingMode) {
			startStreaming();
		} else {
			streamingManager.disconnect();
		}
	}

	let hasStreamingData = $derived(dataKeys.length > 0);
	let showFallback = $derived(!useStreamingMode || (!hasStreamingData && !$isStreaming));
</script>

<div class="streaming-page">
	<!-- Page Header -->
	<div class="page-header">
		<h1 class="page-title">{title}</h1>
		
		<!-- Mode Toggle -->
		<div class="mode-controls">
			<button 
				class="mode-toggle" 
				class:active={!useStreamingMode}
				onclick={toggleStreamingMode}
				disabled={$isStreaming}
			>
				{#if !useStreamingMode}
					📊 Static Mode
				{:else}
					🔄 Switch to Static
				{/if}
			</button>
			<button 
				class="mode-toggle" 
				class:active={useStreamingMode}
				onclick={toggleStreamingMode}
				disabled={$isStreaming}
			>
				{#if useStreamingMode}
					🔄 Streaming Mode
				{:else}
					🔄 Enable Streaming
				{/if}
			</button>
		</div>
	</div>

	<!-- Loading Progress (only show during streaming) -->
	{#if $isStreaming}
		<div class="loading-section">
			<div class="progress-container">
				<div class="progress-bar">
					<div 
						class="progress-fill" 
						style="width: {$streamingProgress}%"
					></div>
				</div>
				<div class="progress-text">
					<span class="percentage">{$streamingProgress}%</span>
					<span class="message">{$streamingMessage}</span>
				</div>
			</div>
		</div>
	{/if}

	<!-- Content Area -->
	<div class="content-area">
		{#if useStreamingMode}
			<!-- Streaming Content -->
			<div class="streaming-content">
                {#if hasStreamingData}
                    {@render streamingSnippet?.({ data: $streamingData })}
				{:else if $isStreaming}
					<div class="loading-placeholder">
						<div class="skeleton-grid">
							{#each Array(6) as _, i}
								<div class="skeleton-card">
									<div class="skeleton-header"></div>
									<div class="skeleton-content">
										<div class="skeleton-line"></div>
										<div class="skeleton-line short"></div>
									</div>
								</div>
							{/each}
						</div>
					</div>
                {:else}
                    {@render fallbackSnippet?.({ data: fallbackData })}
				{/if}
			</div>
		{:else}
            <!-- Static Content -->
            <div class="static-content">
                {@render staticSnippet?.({ data: fallbackData })}
            </div>
		{/if}
	</div>

	<!-- Error Display -->
	{#if Object.keys($streamingErrors).length > 0}
		<div class="error-section">
			<h4>⚠️ Some data failed to load:</h4>
			{#each Object.entries($streamingErrors) as [type, error]}
				<div class="error-item">
					<strong>{type}:</strong> {error}
				</div>
			{/each}
		</div>
	{/if}

	<!-- Debug Info (only in dev) -->
	{#if import.meta.env.DEV && useStreamingMode}
		<div class="debug-section">
			<details>
				<summary>🔧 Debug Info</summary>
				<div class="debug-content">
					<p><strong>Config:</strong> {configKey}</p>
					<p><strong>Endpoint:</strong> {endpoint}</p>
					<p><strong>Streaming:</strong> {$isStreaming}</p>
					<p><strong>Progress:</strong> {$streamingProgress}%</p>
					<p><strong>Data Keys:</strong> {dataKeys.join(', ') || 'None'}</p>
					<p><strong>Errors:</strong> {Object.keys($streamingErrors).length}</p>
				</div>
			</details>
		</div>
	{/if}
</div>

<style>
	.streaming-page {
		padding: 1rem;
		max-width: 100%;
	}

	.page-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-bottom: 2rem;
		flex-wrap: wrap;
		gap: 1rem;
	}

	.page-title {
		font-size: 1.875rem;
		font-weight: 700;
		color: var(--color-surface-900);
		margin: 0;
	}

	.mode-controls {
		display: flex;
		gap: 0.5rem;
		padding: 0.25rem;
		background: var(--color-surface-100);
		border-radius: 8px;
		border: 1px solid var(--color-surface-300);
	}

	.mode-toggle {
		padding: 0.5rem 1rem;
		border: 1px solid var(--color-surface-300);
		border-radius: 6px;
		background: white;
		color: var(--color-surface-600);
		font-size: 0.875rem;
		font-weight: 500;
		cursor: pointer;
		transition: all 0.2s ease;
		white-space: nowrap;
	}

	.mode-toggle:hover:not(:disabled) {
		background: var(--color-surface-50);
		border-color: var(--color-primary-300);
		color: var(--color-primary-600);
	}

	.mode-toggle.active {
		background: var(--color-primary-500);
		border-color: var(--color-primary-500);
		color: white;
		box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
	}

	.mode-toggle:disabled {
		opacity: 0.6;
		cursor: not-allowed;
	}

	.loading-section {
		margin-bottom: 2rem;
		padding: 1rem;
		background: var(--color-surface-50);
		border-radius: 8px;
		border: 1px solid var(--color-surface-200);
	}

	.progress-container {
		width: 100%;
	}

	.progress-bar {
		width: 100%;
		height: 8px;
		background: var(--color-surface-300);
		border-radius: 4px;
		overflow: hidden;
		margin-bottom: 0.5rem;
	}

	.progress-fill {
		height: 100%;
		background: linear-gradient(90deg, var(--color-primary-500), var(--color-secondary-500));
		border-radius: 4px;
		transition: width 0.3s ease;
	}

	.progress-text {
		display: flex;
		justify-content: space-between;
		align-items: center;
		font-size: 0.875rem;
	}

	.percentage {
		font-weight: 600;
		color: var(--color-primary-600);
	}

	.message {
		color: var(--color-surface-600);
	}

	.content-area {
		min-height: 400px;
	}

	.loading-placeholder {
		padding: 1rem 0;
	}

	.skeleton-grid {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
		gap: 1.5rem;
	}

	.skeleton-card {
		padding: 1.5rem;
		background: white;
		border-radius: 12px;
		box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
		border: 1px solid var(--color-surface-200);
	}

	.skeleton-header {
		height: 24px;
		background: linear-gradient(90deg, var(--color-surface-200) 25%, var(--color-surface-300) 50%, var(--color-surface-200) 75%);
		background-size: 200% 100%;
		animation: skeleton-loading 1.5s infinite;
		border-radius: 4px;
		margin-bottom: 1rem;
		width: 70%;
	}

	.skeleton-content {
		space-y: 0.5rem;
	}

	.skeleton-line {
		height: 16px;
		background: linear-gradient(90deg, var(--color-surface-200) 25%, var(--color-surface-300) 50%, var(--color-surface-200) 75%);
		background-size: 200% 100%;
		animation: skeleton-loading 1.5s infinite;
		border-radius: 4px;
		margin-bottom: 0.5rem;
	}

	.skeleton-line.short {
		width: 60%;
	}

	@keyframes skeleton-loading {
		0% { background-position: 200% 0; }
		100% { background-position: -200% 0; }
	}

	.error-section {
		margin-top: 2rem;
		padding: 1rem;
		background: var(--color-error-50);
		border: 1px solid var(--color-error-200);
		border-radius: 8px;
	}

	.error-section h4 {
		margin: 0 0 0.5rem 0;
		color: var(--color-error-700);
	}

	.error-item {
		margin-bottom: 0.25rem;
		color: var(--color-error-600);
		font-size: 0.875rem;
	}

	.debug-section {
		margin-top: 2rem;
		padding: 1rem;
		background: var(--color-surface-900);
		color: var(--color-surface-100);
		border-radius: 8px;
		font-family: monospace;
		font-size: 0.75rem;
	}

	.debug-content {
		margin-top: 0.5rem;
	}

	.debug-content p {
		margin: 0.25rem 0;
	}

	/* Responsive adjustments */
	@media (max-width: 768px) {
		.page-header {
			flex-direction: column;
			align-items: stretch;
		}

		.mode-controls {
			justify-content: center;
		}

		.skeleton-grid {
			grid-template-columns: 1fr;
		}
	}
</style>