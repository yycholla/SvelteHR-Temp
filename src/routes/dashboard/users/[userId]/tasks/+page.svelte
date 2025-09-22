<script lang="ts">
	import { onMount } from 'svelte';
	import { page } from '$app/stores';
	import { goto } from '$app/navigation';
	import { currentUser } from '$lib/stores/auth';
	import * as Card from '$lib/components/ui/card';
	import { Badge } from '$lib/components/ui/badge';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import * as Select from '$lib/components/ui/select';
	import { Separator } from '$lib/components/ui/separator';
	import {
		CheckCircle,
		Clock,
		AlertTriangle,
		Search,
		Filter,
		Calendar,
		User,
		ArrowLeft,
		Plus,
		RefreshCw,
		Target,
		ListTodo,
		CheckSquare
	} from 'lucide-svelte';

	// Get user ID from URL params
	const userId = $page.params.userId;

	// Check if viewing own tasks
	const isOwnTasks = $derived($currentUser?.id === userId);

	// State
	let loading = $state(true);
	let error = $state<string | null>(null);
	let searchTerm = $state('');
	let statusFilter = $state('all');
	let priorityFilter = $state('all');
	let showFilters = $state(false);

	// Sample tasks data (will be replaced with real API)
	let tasks = $state([
		{
			id: '1',
			title: 'Complete Q4 performance self-evaluation',
			description: 'Submit annual performance review form by end of quarter',
			status: 'in_progress',
			priority: 'high',
			dueDate: '2024-12-31',
			progress: 60,
			assignedBy: 'Sarah Johnson',
			category: 'Performance',
			createdAt: '2024-12-01'
		},
		{
			id: '2',
			title: 'Complete mandatory security training',
			description: 'Finish online cybersecurity awareness training module',
			status: 'todo',
			priority: 'medium',
			dueDate: '2024-12-20',
			progress: 0,
			assignedBy: 'IT Department',
			category: 'Training',
			createdAt: '2024-12-05'
		},
		{
			id: '3',
			title: 'Update emergency contact information',
			description: 'Review and update emergency contacts in HR system',
			status: 'todo',
			priority: 'low',
			dueDate: '2024-12-25',
			progress: 0,
			assignedBy: 'HR Department',
			category: 'Administrative',
			createdAt: '2024-12-10'
		},
		{
			id: '4',
			title: 'Submit timesheet for November',
			description: 'Complete and submit monthly timesheet',
			status: 'completed',
			priority: 'high',
			dueDate: '2024-12-01',
			progress: 100,
			assignedBy: 'Finance Department',
			category: 'Administrative',
			createdAt: '2024-11-25'
		},
		{
			id: '5',
			title: 'Schedule 1:1 meeting with manager',
			description: 'Book monthly check-in meeting',
			status: 'in_progress',
			priority: 'medium',
			dueDate: '2024-12-18',
			progress: 25,
			assignedBy: 'Manager',
			category: 'Meeting',
			createdAt: '2024-12-08'
		}
	]);

	// Computed values
	const filteredTasks = $derived(() => {
		return tasks.filter(task => {
			if (searchTerm && !task.title.toLowerCase().includes(searchTerm.toLowerCase()) &&
				!task.description.toLowerCase().includes(searchTerm.toLowerCase())) {
				return false;
			}
			if (statusFilter !== 'all' && task.status !== statusFilter) {
				return false;
			}
			if (priorityFilter !== 'all' && task.priority !== priorityFilter) {
				return false;
			}
			return true;
		});
	});

	const taskStats = $derived(() => {
		const stats = {
			total: tasks.length,
			completed: tasks.filter(t => t.status === 'completed').length,
			inProgress: tasks.filter(t => t.status === 'in_progress').length,
			overdue: tasks.filter(t => {
				if (t.status === 'completed') return false;
				return new Date(t.dueDate) < new Date();
			}).length
		};
		return {
			...stats,
			completionRate: stats.total > 0 ? Math.round((stats.completed / stats.total) * 100) : 0
		};
	});

	// Helper functions
	function getStatusColor(status: string): string {
		switch (status) {
			case 'completed': return 'bg-green-100 text-green-800';
			case 'in_progress': return 'bg-blue-100 text-blue-800';
			case 'todo': return 'bg-gray-100 text-gray-800';
			default: return 'bg-gray-100 text-gray-800';
		}
	}

	function getPriorityColor(priority: string): string {
		switch (priority) {
			case 'high': return 'bg-red-100 text-red-800';
			case 'medium': return 'bg-orange-100 text-orange-800';
			case 'low': return 'bg-green-100 text-green-800';
			default: return 'bg-gray-100 text-gray-800';
		}
	}

	function formatDate(dateString: string): string {
		return new Date(dateString).toLocaleDateString();
	}

	function isOverdue(task: any): boolean {
		if (task.status === 'completed') return false;
		return new Date(task.dueDate) < new Date();
	}

	function updateTaskStatus(taskId: string, newStatus: string) {
		tasks = tasks.map(task =>
			task.id === taskId
				? { ...task, status: newStatus, progress: newStatus === 'completed' ? 100 : task.progress }
				: task
		);
	}

	onMount(async () => {
		// Simulate loading
		setTimeout(() => {
			loading = false;
		}, 500);
	});
</script>

<svelte:head>
	<title>{isOwnTasks ? 'My Tasks' : 'User Tasks'} - SvelteHR</title>
	<meta name="description" content="View and manage tasks" />
</svelte:head>

<div class="space-y-6">
	<!-- Header -->
	<div class="flex items-center justify-between">
		<div class="flex items-center gap-4">
			<Button variant="ghost" size="sm" onclick={() => goto('/dashboard')}>
				<ArrowLeft class="h-4 w-4" />
			</Button>

			<div>
				<div class="flex items-center gap-3">
					<ListTodo class="h-8 w-8 text-primary" />
					<h1 class="text-3xl font-bold tracking-tight">
						{isOwnTasks ? 'My Tasks' : 'User Tasks'}
					</h1>
				</div>
				<p class="text-muted-foreground">
					{isOwnTasks ? 'Manage your assigned tasks and track progress' : 'View user task assignments'}
				</p>
			</div>
		</div>

		<div class="flex items-center gap-2">
			{#if isOwnTasks}
				<Button variant="outline">
					<Plus class="mr-2 h-4 w-4" />
					Request Task
				</Button>
			{/if}
			<Button variant="outline" size="sm">
				<RefreshCw class="h-4 w-4" />
			</Button>
		</div>
	</div>

	<!-- Loading State -->
	{#if loading}
		<div class="flex items-center justify-center py-12">
			<div class="text-center">
				<RefreshCw class="mx-auto h-8 w-8 animate-spin text-muted-foreground" />
				<p class="mt-2 text-muted-foreground">Loading tasks...</p>
			</div>
		</div>
	{:else}

	<!-- Task Statistics -->
	<div class="grid grid-cols-1 gap-4 md:grid-cols-4">
		<Card.Root>
			<Card.Content class="p-6">
				<div class="flex items-center justify-between">
					<div>
						<p class="text-sm font-medium text-muted-foreground">Total Tasks</p>
						<p class="text-2xl font-bold">{taskStats.total}</p>
					</div>
					<ListTodo class="h-8 w-8 text-muted-foreground" />
				</div>
			</Card.Content>
		</Card.Root>

		<Card.Root>
			<Card.Content class="p-6">
				<div class="flex items-center justify-between">
					<div>
						<p class="text-sm font-medium text-muted-foreground">Completed</p>
						<p class="text-2xl font-bold text-green-600">{taskStats.completed}</p>
					</div>
					<CheckCircle class="h-8 w-8 text-green-600" />
				</div>
			</Card.Content>
		</Card.Root>

		<Card.Root>
			<Card.Content class="p-6">
				<div class="flex items-center justify-between">
					<div>
						<p class="text-sm font-medium text-muted-foreground">In Progress</p>
						<p class="text-2xl font-bold text-blue-600">{taskStats.inProgress}</p>
					</div>
					<Clock class="h-8 w-8 text-blue-600" />
				</div>
			</Card.Content>
		</Card.Root>

		<Card.Root>
			<Card.Content class="p-6">
				<div class="flex items-center justify-between">
					<div>
						<p class="text-sm font-medium text-muted-foreground">Overdue</p>
						<p class="text-2xl font-bold text-red-600">{taskStats.overdue}</p>
					</div>
					<AlertTriangle class="h-8 w-8 text-red-600" />
				</div>
			</Card.Content>
		</Card.Root>
	</div>

	<!-- Search and Filters -->
	<Card.Root>
		<Card.Content class="p-6">
			<div class="flex flex-col space-y-4 md:flex-row md:items-center md:space-x-4 md:space-y-0">
				<!-- Search -->
				<div class="relative flex-1">
					<Search class="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
					<Input
						placeholder="Search tasks..."
						bind:value={searchTerm}
						class="pl-10"
					/>
				</div>

				<!-- Filters -->
				<div class="flex items-center space-x-2">
					<Button variant="outline" size="sm" onclick={() => (showFilters = !showFilters)}>
						<Filter class="mr-2 h-4 w-4" />
						Filters
					</Button>

					{#if statusFilter !== 'all' || priorityFilter !== 'all'}
						<Button
							variant="ghost"
							size="sm"
							onclick={() => {
								statusFilter = 'all';
								priorityFilter = 'all';
							}}
						>
							Clear
						</Button>
					{/if}
				</div>
			</div>

			<!-- Filter dropdowns -->
			{#if showFilters}
				<div class="mt-4 grid grid-cols-1 gap-4 border-t pt-4 md:grid-cols-2">
					<div class="space-y-2">
						<label class="text-sm font-medium">Status</label>
						<Select.Root bind:selected={statusFilter}>
							<Select.Trigger>
								<Select.Value placeholder="All statuses" />
							</Select.Trigger>
							<Select.Content>
								<Select.Item value="all">All statuses</Select.Item>
								<Select.Item value="todo">To Do</Select.Item>
								<Select.Item value="in_progress">In Progress</Select.Item>
								<Select.Item value="completed">Completed</Select.Item>
							</Select.Content>
						</Select.Root>
					</div>

					<div class="space-y-2">
						<label class="text-sm font-medium">Priority</label>
						<Select.Root bind:selected={priorityFilter}>
							<Select.Trigger>
								<Select.Value placeholder="All priorities" />
							</Select.Trigger>
							<Select.Content>
								<Select.Item value="all">All priorities</Select.Item>
								<Select.Item value="high">High</Select.Item>
								<Select.Item value="medium">Medium</Select.Item>
								<Select.Item value="low">Low</Select.Item>
							</Select.Content>
						</Select.Root>
					</div>
				</div>
			{/if}
		</Card.Content>
	</Card.Root>

	<!-- Tasks List -->
	<Card.Root>
		<Card.Header>
			<Card.Title>Tasks ({filteredTasks.length})</Card.Title>
			<Card.Description>
				{taskStats.completionRate}% completion rate
			</Card.Description>
		</Card.Header>
		<Card.Content>
			{#if filteredTasks.length === 0}
				<div class="py-8 text-center">
					<Target class="mx-auto h-12 w-12 text-muted-foreground" />
					<h3 class="mt-4 text-lg font-semibold">No tasks found</h3>
					<p class="text-muted-foreground">Try adjusting your search or filters.</p>
				</div>
			{:else}
				<div class="space-y-4">
					{#each filteredTasks as task (task.id)}
						<div class="rounded-lg border p-4 transition-colors hover:bg-muted/50">
							<div class="flex items-start justify-between">
								<div class="flex-1 space-y-2">
									<div class="flex items-center gap-2">
										<h3 class="font-semibold">{task.title}</h3>
										{#if isOverdue(task)}
											<Badge variant="destructive" class="text-xs">Overdue</Badge>
										{/if}
									</div>

									<p class="text-sm text-muted-foreground">{task.description}</p>

									<div class="flex items-center gap-4 text-sm text-muted-foreground">
										<div class="flex items-center gap-1">
											<Calendar class="h-3 w-3" />
											<span>Due {formatDate(task.dueDate)}</span>
										</div>
										<div class="flex items-center gap-1">
											<User class="h-3 w-3" />
											<span>By {task.assignedBy}</span>
										</div>
									</div>

									<!-- Progress bar -->
									{#if task.status !== 'completed' && task.progress > 0}
										<div class="flex items-center gap-2">
											<div class="flex-1 h-2 bg-muted rounded-full overflow-hidden">
												<div
													class="h-full bg-primary transition-all"
													style="width: {task.progress}%"
												></div>
											</div>
											<span class="text-xs text-muted-foreground">{task.progress}%</span>
										</div>
									{/if}
								</div>

								<div class="flex items-center gap-2 ml-4">
									<Badge class={getStatusColor(task.status)}>
										{task.status.replace('_', ' ')}
									</Badge>
									<Badge class={getPriorityColor(task.priority)}>
										{task.priority}
									</Badge>

									{#if isOwnTasks && task.status !== 'completed'}
										<Button
											variant="outline"
											size="sm"
											onclick={() => updateTaskStatus(task.id, 'completed')}
										>
											<CheckSquare class="h-4 w-4" />
										</Button>
									{/if}
								</div>
							</div>
						</div>
					{/each}
				</div>
			{/if}
		</Card.Content>
	</Card.Root>

	{/if}
</div>