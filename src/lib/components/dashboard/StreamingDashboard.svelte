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

	export let fallbackData: any = null;

	let showFallback = true;
	let dataKeys: string[] = [];

	onMount(() => {
		// Start streaming
		streamingManager.connect('/api/stream/dashboard');
		
		// Subscribe to data updates
		const unsubscribe = streamingData.subscribe(data => {
			dataKeys = Object.keys(data);
			if (dataKeys.length > 0) {
				showFallback = false;
			}
		});

		return unsubscribe;
	});

	onDestroy(() => {
		streamingManager.disconnect();
	});

	$: hasData = dataKeys.length > 0;
	$: employeesData = $streamingData.employees;
	$: eventsData = $streamingData.events;
	$: notificationsData = $streamingData.notifications;
	$: monitoringData = $streamingData.monitoring;
	$: complianceData = $streamingData.compliance;
	$: tasksData = $streamingData.tasks;
	$: leaveData = $streamingData.leave;
</script>

<div class="streaming-dashboard">
	<!-- Loading Progress Bar -->
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

	<!-- Data Sections - Show as they load -->
	<div class="dashboard-grid">
		<!-- Employees Section -->
		<div class="dashboard-card" class:loading={!employeesData && $isStreaming}>
			<h3>Employees</h3>
			{#if employeesData}
				<div class="metric-value">
					{employeesData.total || 0}
				</div>
				<div class="metric-label">Total Employees</div>
			{:else if showFallback && fallbackData}
				<div class="metric-value fallback">
					{fallbackData.dashboardData?.personalStats?.totalEmployees || 0}
				</div>
				<div class="metric-label">Total Employees (cached)</div>
			{:else}
				<div class="skeleton-loader"></div>
			{/if}
		</div>

		<!-- Events Section -->
		<div class="dashboard-card" class:loading={!eventsData && $isStreaming}>
			<h3>Upcoming Events</h3>
			{#if eventsData}
				<div class="events-list">
					{#each (Array.isArray(eventsData) ? eventsData : eventsData.data || []).slice(0, 3) as event}
						<div class="event-item">
							<span class="event-title">
								{event.title || event.Title || 'Untitled Event'}
							</span>
							<span class="event-date">
								{new Date(event.startDateTime || event.start_date_time || Date.now()).toLocaleDateString()}
							</span>
						</div>
					{/each}
				</div>
			{:else if showFallback && fallbackData}
				<div class="events-list fallback">
					{#each fallbackData.dashboardData?.upcomingEvents || [] as event}
						<div class="event-item">
							<span class="event-title">{event.title}</span>
							<span class="event-date">{event.date}</span>
						</div>
					{/each}
				</div>
			{:else}
				<div class="skeleton-loader"></div>
			{/if}
		</div>

		<!-- Notifications Section -->
		<div class="dashboard-card" class:loading={!notificationsData && $isStreaming}>
			<h3>Notifications</h3>
			{#if notificationsData}
				<div class="metric-value">
					{notificationsData.count || 0}
				</div>
				<div class="metric-label">Unread Messages</div>
			{:else if $streamingErrors.notifications}
				<div class="error-message">
					Failed to load notifications
				</div>
			{:else}
				<div class="skeleton-loader"></div>
			{/if}
		</div>

		<!-- System Stats (Admin only) -->
		{#if monitoringData}
			<div class="dashboard-card">
				<h3>System Stats</h3>
				<div class="stats-grid">
					<div class="stat-item">
						<div class="stat-value">{monitoringData.requestCount || 0}</div>
						<div class="stat-label">API Requests</div>
					</div>
					<div class="stat-item">
						<div class="stat-value">{Math.round((monitoringData.averageLatency || 0) / 1000000)}ms</div>
						<div class="stat-label">Avg Latency</div>
					</div>
				</div>
			</div>
		{/if}

		<!-- Compliance Stats -->
		{#if complianceData}
			<div class="dashboard-card">
				<h3>Compliance</h3>
				<div class="metric-value">
					{complianceData.totalActive || 0}
				</div>
				<div class="metric-label">Active Items</div>
			</div>
		{/if}

		<!-- Tasks -->
		{#if tasksData}
			<div class="dashboard-card">
				<h3>Tasks</h3>
				<div class="metric-value">
					{Array.isArray(tasksData) ? tasksData.length : (tasksData.total || 0)}
				</div>
				<div class="metric-label">Total Tasks</div>
			</div>
		{/if}

		<!-- Leave Requests -->
		{#if leaveData}
			<div class="dashboard-card">
				<h3>Leave Requests</h3>
				<div class="metric-value">
					{Array.isArray(leaveData) ? leaveData.length : (leaveData.total || 0)}
				</div>
				<div class="metric-label">Pending Requests</div>
			</div>
		{/if}
	</div>

	<!-- Error Messages -->
	{#if Object.keys($streamingErrors).length > 0}
		<div class="error-section">
			<h4>Some data failed to load:</h4>
			{#each Object.entries($streamingErrors) as [type, error]}
				<div class="error-item">
					<strong>{type}:</strong> {error}
				</div>
			{/each}
		</div>
	{/if}
</div>

<style>
	.streaming-dashboard {
		padding: 1rem;
	}

	.loading-section {
		margin-bottom: 2rem;
		padding: 1rem;
		background: var(--color-surface-100);
		border-radius: 8px;
		border: 1px solid var(--color-surface-300);
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

	.dashboard-grid {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
		gap: 1.5rem;
		margin-bottom: 2rem;
	}

	.dashboard-card {
		padding: 1.5rem;
		background: white;
		border-radius: 12px;
		box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
		border: 1px solid var(--color-surface-200);
		transition: all 0.3s ease;
	}

	.dashboard-card.loading {
		opacity: 0.6;
		transform: scale(0.98);
	}

	.dashboard-card h3 {
		margin: 0 0 1rem 0;
		color: var(--color-surface-700);
		font-size: 1.125rem;
		font-weight: 600;
	}

	.metric-value {
		font-size: 2.5rem;
		font-weight: 700;
		color: var(--color-primary-600);
		line-height: 1;
		margin-bottom: 0.5rem;
	}

	.metric-value.fallback {
		opacity: 0.7;
	}

	.metric-label {
		font-size: 0.875rem;
		color: var(--color-surface-600);
		text-transform: uppercase;
		letter-spacing: 0.05em;
	}

	.skeleton-loader {
		height: 60px;
		background: linear-gradient(90deg, var(--color-surface-200) 25%, var(--color-surface-300) 50%, var(--color-surface-200) 75%);
		background-size: 200% 100%;
		animation: skeleton-loading 1.5s infinite;
		border-radius: 4px;
	}

	@keyframes skeleton-loading {
		0% { background-position: 200% 0; }
		100% { background-position: -200% 0; }
	}

	.events-list {
		space-y: 0.75rem;
	}

	.events-list.fallback {
		opacity: 0.7;
	}

	.event-item {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: 0.75rem;
		background: var(--color-surface-50);
		border-radius: 6px;
		border: 1px solid var(--color-surface-200);
		margin-bottom: 0.5rem;
	}

	.event-title {
		font-weight: 500;
		color: var(--color-surface-700);
	}

	.event-date {
		font-size: 0.875rem;
		color: var(--color-surface-500);
	}

	.stats-grid {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 1rem;
	}

	.stat-item {
		text-align: center;
	}

	.stat-value {
		font-size: 1.5rem;
		font-weight: 600;
		color: var(--color-primary-600);
	}

	.stat-label {
		font-size: 0.75rem;
		color: var(--color-surface-600);
		text-transform: uppercase;
		letter-spacing: 0.05em;
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

	.error-message {
		color: var(--color-error-600);
		font-size: 0.875rem;
		font-style: italic;
	}
</style>