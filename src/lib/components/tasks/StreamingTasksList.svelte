<script lang="ts">
	import { CheckSquare, Clock, User, AlertCircle, Plus } from 'lucide-svelte';
	import Badge from '$lib/components/ui/badge/badge.svelte';
	import Button from '$lib/components/ui/button/button.svelte';
	
	interface Props {
		data: Record<string, any>;
	}

	let { data }: Props = $props();

	// Transform streaming data
	let tasksData = $derived(data['tasks-list'] || { tasks: [], total: 0 });
	let taskStats = $derived(data['task-stats'] || { completed: 0 });
	let assignments = $derived(data['assignments'] || { pending: 0 });
	let templates = $derived(data['templates'] || []);

	function getStatusVariant(status: string) {
		switch (status?.toLowerCase()) {
			case 'completed': return 'default';
			case 'inprogress': return 'secondary';
			case 'pending': return 'outline';
			case 'blocked': return 'destructive';
			default: return 'outline';
		}
	}

	function getPriorityColor(priority: string) {
		switch (priority?.toLowerCase()) {
			case 'high':
			case 'critical': return 'text-red-600';
			case 'medium': return 'text-orange-600';
			case 'low': return 'text-green-600';
			default: return 'text-gray-600';
		}
	}

	function formatDate(dateString: string | null) {
		if (!dateString) return 'No due date';
		return new Intl.DateTimeFormat('en-US', {
			year: 'numeric',
			month: 'short',
			day: 'numeric'
		}).format(new Date(dateString));
	}
</script>

<div class="streaming-tasks">
	<!-- Quick Stats -->
	<div class="stats-grid">
		<div class="stat-card">
			<div class="stat-icon">
				<CheckSquare size={24} />
			</div>
			<div class="stat-content">
				<div class="stat-value">
					{Array.isArray(tasksData) ? tasksData.length : tasksData.tasks?.length || 0}
				</div>
				<div class="stat-label">Total Tasks</div>
			</div>
		</div>
		
		<div class="stat-card">
			<div class="stat-icon text-green-600">
				<CheckSquare size={24} />
			</div>
			<div class="stat-content">
				<div class="stat-value">
					{taskStats.completed || 0}
				</div>
				<div class="stat-label">Completed</div>
			</div>
		</div>
		
		<div class="stat-card">
			<div class="stat-icon text-orange-600">
				<Clock size={24} />
			</div>
			<div class="stat-content">
				<div class="stat-value">
					{assignments.pending || 0}
				</div>
				<div class="stat-label">Pending</div>
			</div>
		</div>
		
		<div class="stat-card">
			<div class="stat-icon text-blue-600">
				<Plus size={24} />
			</div>
			<div class="stat-content">
				<div class="stat-value">
					{Array.isArray(templates) ? templates.length : 0}
				</div>
				<div class="stat-label">Templates</div>
			</div>
		</div>
	</div>

	<!-- Tasks List -->
	<div class="tasks-container">
		<div class="tasks-header">
			<h3>Tasks Overview</h3>
			<Button variant="outline" size="sm">
				<Plus class="h-4 w-4 mr-2" />
				New Task
			</Button>
		</div>

		{#if tasksData && (Array.isArray(tasksData) ? tasksData.length : tasksData.tasks?.length)}
			<div class="tasks-grid">
				{#each (Array.isArray(tasksData) ? tasksData : tasksData.tasks || []) as task}
					<div class="task-card">
						<div class="task-header">
							<div class="task-title">{task.title || 'Untitled Task'}</div>
							<Badge variant={getStatusVariant(task.status)}>
								{task.status || 'pending'}
							</Badge>
						</div>
						
						{#if task.description}
							<p class="task-description">{task.description}</p>
						{/if}
						
						<div class="task-meta">
							<div class="task-details">
								{#if task.assignedTo}
									<div class="meta-item">
										<User class="h-4 w-4" />
										<span>{task.assignedTo.firstName} {task.assignedTo.lastName}</span>
									</div>
								{/if}
								
								{#if task.dueDate}
									<div class="meta-item">
										<Clock class="h-4 w-4" />
										<span>{formatDate(task.dueDate)}</span>
									</div>
								{/if}
								
								{#if task.priority}
									<div class="meta-item {getPriorityColor(task.priority)}">
										<AlertCircle class="h-4 w-4" />
										<span>{task.priority}</span>
									</div>
								{/if}
							</div>
						</div>
					</div>
				{/each}
			</div>
		{:else}
			<div class="empty-state">
				<CheckSquare class="h-12 w-12 text-gray-400 mx-auto mb-4" />
				<h4 class="text-lg font-medium text-gray-900 mb-2">No Tasks Found</h4>
				<p class="text-gray-500">There are no tasks to display at this time.</p>
			</div>
		{/if}
	</div>
</div>

<style>
	.streaming-tasks {
		width: 100%;
	}

	.stats-grid {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
		gap: 1rem;
		margin-bottom: 2rem;
	}

	.stat-card {
		background: white;
		border-radius: 8px;
		padding: 1rem;
		box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
		border: 1px solid #e5e7eb;
		display: flex;
		align-items: center;
		gap: 0.75rem;
	}

	.stat-icon {
		color: #6b7280;
	}

	.stat-value {
		font-size: 1.5rem;
		font-weight: 700;
		color: #1f2937;
		line-height: 1;
	}

	.stat-label {
		font-size: 0.875rem;
		color: #6b7280;
		margin-top: 0.25rem;
	}

	.tasks-container {
		background: white;
		border-radius: 12px;
		padding: 1.5rem;
		box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
		border: 1px solid #e5e7eb;
	}

	.tasks-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-bottom: 1.5rem;
	}

	.tasks-header h3 {
		font-size: 1.25rem;
		font-weight: 600;
		color: #1f2937;
		margin: 0;
	}

	.tasks-grid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
		gap: 1rem;
	}

	.task-card {
		background: #f9fafb;
		border-radius: 8px;
		padding: 1rem;
		border: 1px solid #e5e7eb;
		transition: all 0.2s ease;
	}

	.task-card:hover {
		box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
		transform: translateY(-1px);
	}

	.task-header {
		display: flex;
		justify-content: space-between;
		align-items: flex-start;
		margin-bottom: 0.75rem;
		gap: 1rem;
	}

	.task-title {
		font-weight: 600;
		color: #1f2937;
		flex: 1;
		line-height: 1.3;
	}

	.task-description {
		color: #6b7280;
		font-size: 0.875rem;
		margin: 0 0 1rem 0;
		line-height: 1.4;
	}

	.task-meta {
		border-top: 1px solid #e5e7eb;
		padding-top: 0.75rem;
	}

	.task-details {
		display: flex;
		flex-wrap: wrap;
		gap: 1rem;
	}

	.meta-item {
		display: flex;
		align-items: center;
		gap: 0.375rem;
		font-size: 0.875rem;
		color: #6b7280;
	}

	.meta-item span {
		font-size: 0.875rem;
	}

	.empty-state {
		text-align: center;
		padding: 3rem 1rem;
	}
</style>