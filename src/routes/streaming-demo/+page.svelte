<script lang="ts">
	import GenericStreamingPage from '$lib/components/streaming/GenericStreamingPage.svelte';
	import { CheckCircle, Clock, Users, AlertTriangle } from 'lucide-svelte';

	// This demonstrates streaming for any page
	const mockFallbackData = {
		tasks: [{ id: 1, title: 'Sample Task', status: 'pending' }],
		employees: [{ id: 1, name: 'John Doe' }]
	};
</script>

<svelte:head>
	<title>Streaming Demo - SvelteHR</title>
</svelte:head>

<GenericStreamingPage 
	configKey="tasks" 
	title="Streaming Demo"
	fallbackData={mockFallbackData}
>
	<div slot="streaming" let:data={streamingData}>
		<div class="streaming-demo-content">
			<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
				<!-- Tasks Data Card -->
				<div class="stat-card">
					<div class="stat-header">
						<CheckCircle class="h-6 w-6 text-green-600" />
						<h3>Tasks</h3>
					</div>
					<div class="stat-body">
						{#if streamingData['tasks-list']}
							<div class="stat-number">
								{Array.isArray(streamingData['tasks-list']) 
									? streamingData['tasks-list'].length 
									: streamingData['tasks-list'].total || 0}
							</div>
							<p class="text-green-600">✓ Loaded</p>
						{:else}
							<div class="skeleton-stat"></div>
							<p class="text-gray-500">Loading...</p>
						{/if}
					</div>
				</div>

				<!-- Task Stats Card -->
				<div class="stat-card">
					<div class="stat-header">
						<Clock class="h-6 w-6 text-blue-600" />
						<h3>Completed</h3>
					</div>
					<div class="stat-body">
						{#if streamingData['task-stats']}
							<div class="stat-number">
								{Array.isArray(streamingData['task-stats']) 
									? streamingData['task-stats'].length 
									: streamingData['task-stats'].total || 0}
							</div>
							<p class="text-blue-600">✓ Loaded</p>
						{:else}
							<div class="skeleton-stat"></div>
							<p class="text-gray-500">Loading...</p>
						{/if}
					</div>
				</div>

				<!-- Assignments Card -->
				<div class="stat-card">
					<div class="stat-header">
						<Users class="h-6 w-6 text-purple-600" />
						<h3>Pending</h3>
					</div>
					<div class="stat-body">
						{#if streamingData['assignments']}
							<div class="stat-number">
								{Array.isArray(streamingData['assignments']) 
									? streamingData['assignments'].length 
									: streamingData['assignments'].total || 0}
							</div>
							<p class="text-purple-600">✓ Loaded</p>
						{:else}
							<div class="skeleton-stat"></div>
							<p class="text-gray-500">Loading...</p>
						{/if}
					</div>
				</div>

				<!-- Templates Card -->
				<div class="stat-card">
					<div class="stat-header">
						<AlertTriangle class="h-6 w-6 text-orange-600" />
						<h3>Templates</h3>
					</div>
					<div class="stat-body">
						{#if streamingData['templates']}
							<div class="stat-number">
								{Array.isArray(streamingData['templates']) 
									? streamingData['templates'].length 
									: streamingData['templates'].total || 0}
							</div>
							<p class="text-orange-600">✓ Loaded</p>
						{:else}
							<div class="skeleton-stat"></div>
							<p class="text-gray-500">Loading...</p>
						{/if}
					</div>
				</div>
			</div>

			<!-- Tasks List -->
			{#if streamingData['tasks-list']}
				<div class="tasks-section">
					<h2 class="text-xl font-semibold mb-4">Recent Tasks</h2>
					<div class="tasks-grid">
						{#each (Array.isArray(streamingData['tasks-list']) ? streamingData['tasks-list'] : streamingData['tasks-list'].data || []).slice(0, 6) as task}
							<div class="task-card">
								<h3 class="task-title">{task.title || task.Title || 'Untitled Task'}</h3>
								<p class="task-description">{task.description || task.Description || 'No description'}</p>
								<div class="task-meta">
									<span class="task-status status-{task.status || task.Status || 'pending'}">
										{task.status || task.Status || 'Pending'}
									</span>
									<span class="task-date">
										{task.createdAt ? new Date(task.createdAt).toLocaleDateString() : 'N/A'}
									</span>
								</div>
							</div>
						{/each}
					</div>
				</div>
			{/if}

			<!-- Raw Data Display (for debugging) -->
			<details class="debug-section">
				<summary>🔧 Raw Streaming Data</summary>
				<pre class="debug-data">{JSON.stringify(streamingData, null, 2)}</pre>
			</details>
		</div>
	</div>

	<div slot="static" let:data={fallbackData}>
		<div class="static-content">
			<div class="text-center py-8">
				<div class="bg-blue-100 rounded-full p-4 w-16 h-16 mx-auto mb-4">
					<CheckCircle class="h-8 w-8 text-blue-600" />
				</div>
				<h2 class="text-xl font-semibold mb-2">Static Mode</h2>
				<p class="text-gray-600 mb-4">Showing cached data from server load</p>
				<div class="stat-grid">
					<div class="stat-item">
						<div class="stat-number">{fallbackData?.tasks?.length || 0}</div>
						<div class="stat-label">Sample Tasks</div>
					</div>
					<div class="stat-item">
						<div class="stat-number">{fallbackData?.employees?.length || 0}</div>
						<div class="stat-label">Sample Employees</div>
					</div>
				</div>
			</div>
		</div>
	</div>

	<div slot="fallback">
		<div class="fallback-content text-center py-12">
			<div class="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
			<h3 class="text-lg font-medium text-gray-900 mb-2">Loading Tasks</h3>
			<p class="text-gray-500">Please wait while we fetch your data...</p>
		</div>
	</div>
</GenericStreamingPage>

<style>
	.streaming-demo-content {
		max-width: 1200px;
		margin: 0 auto;
	}

	.stat-card {
		background: white;
		border-radius: 12px;
		padding: 1.5rem;
		box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
		border: 1px solid #e5e7eb;
	}

	.stat-header {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		margin-bottom: 1rem;
	}

	.stat-header h3 {
		font-weight: 600;
		color: #374151;
		margin: 0;
	}

	.stat-body {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}

	.stat-number {
		font-size: 2rem;
		font-weight: 700;
		color: #1f2937;
	}

	.skeleton-stat {
		height: 2rem;
		background: linear-gradient(90deg, #e5e7eb 25%, #d1d5db 50%, #e5e7eb 75%);
		background-size: 200% 100%;
		animation: skeleton-loading 1.5s infinite;
		border-radius: 4px;
		width: 80%;
	}

	@keyframes skeleton-loading {
		0% { background-position: 200% 0; }
		100% { background-position: -200% 0; }
	}

	.tasks-section {
		background: white;
		border-radius: 12px;
		padding: 1.5rem;
		box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
		border: 1px solid #e5e7eb;
	}

	.tasks-grid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
		gap: 1rem;
	}

	.task-card {
		background: #f9fafb;
		border-radius: 8px;
		padding: 1rem;
		border: 1px solid #e5e7eb;
	}

	.task-title {
		font-weight: 600;
		color: #1f2937;
		margin: 0 0 0.5rem 0;
	}

	.task-description {
		color: #6b7280;
		font-size: 0.875rem;
		margin: 0 0 1rem 0;
	}

	.task-meta {
		display: flex;
		justify-content: space-between;
		align-items: center;
		gap: 1rem;
	}

	.task-status {
		padding: 0.25rem 0.75rem;
		border-radius: 9999px;
		font-size: 0.75rem;
		font-weight: 500;
		text-transform: capitalize;
	}

	.status-pending {
		background: #fef3c7;
		color: #d97706;
	}

	.status-inprogress {
		background: #dbeafe;
		color: #2563eb;
	}

	.status-completed {
		background: #dcfce7;
		color: #16a34a;
	}

	.status-blocked {
		background: #fee2e2;
		color: #dc2626;
	}

	.task-date {
		font-size: 0.75rem;
		color: #9ca3af;
	}

	.debug-section {
		margin-top: 2rem;
		background: #1f2937;
		color: #f3f4f6;
		border-radius: 8px;
		padding: 1rem;
	}

	.debug-data {
		margin-top: 0.5rem;
		font-family: 'Courier New', monospace;
		font-size: 0.75rem;
		overflow-x: auto;
	}

	.stat-grid {
		display: grid;
		grid-template-columns: repeat(2, 1fr);
		gap: 2rem;
		max-width: 300px;
		margin: 0 auto;
	}

	.stat-item {
		text-align: center;
	}

	.stat-item .stat-number {
		font-size: 1.5rem;
		font-weight: 600;
		color: #2563eb;
	}

	.stat-item .stat-label {
		font-size: 0.875rem;
		color: #6b7280;
		margin-top: 0.25rem;
	}
</style>