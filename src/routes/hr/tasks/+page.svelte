<script lang="ts">
	import { goto } from '$app/navigation';
	import { CheckSquare, Plus, Filter, Calendar, Clock, User, AlertCircle } from 'lucide-svelte';
	import Button from '$lib/components/ui/button/button.svelte';
	import Input from '$lib/components/ui/input/input.svelte';
	import Card from '$lib/components/ui/card/card.svelte';
	import CardHeader from '$lib/components/ui/card/card-header.svelte';
	import CardTitle from '$lib/components/ui/card/card-title.svelte';
	import CardDescription from '$lib/components/ui/card/card-description.svelte';
	import CardContent from '$lib/components/ui/card/card-content.svelte';
	import Badge from '$lib/components/ui/badge/badge.svelte';
	import {
		DropdownMenu,
		DropdownMenuTrigger,
		DropdownMenuContent,
		DropdownMenuItem
	} from '$lib/components/ui/dropdown-menu';
	import type { PageData } from './$types';

	// Page data from server
	let { data }: { data: PageData } = $props();

	// Local filter states (initialized from server data)
	let searchTerm = $state('');
	let statusFilter = $state(data.filters.status);
	let typeFilter = $state(data.filters.relatedEntityType);
	let employeeFilter = $state('all');

	// Derived data from server
	const tasks = $derived(data.tasks);
	const stats = $derived(data.stats);
	const loading = $state(false);
	const error = $derived(data.error || '');

	// Apply filters by navigating to new URL with query parameters
	async function applyFilters() {
		const params = new URLSearchParams();
		
		if (statusFilter !== 'all') params.set('status', statusFilter);
		if (typeFilter !== 'all') params.set('relatedEntityType', typeFilter);
		
		const queryString = params.toString();
		const newUrl = queryString ? `/hr/tasks?${queryString}` : '/hr/tasks';
		
		await goto(newUrl);
	}

	// Tasks are already filtered server-side
	const filteredTasks = $derived(() => tasks);

	function getStatusVariant(status: string) {
		switch (status) {
			case 'Completed': return 'default';
			case 'InProgress': return 'secondary';
			case 'Pending': return 'outline';
			case 'Blocked': return 'destructive';
			default: return 'outline';
		}
	}

	function getPriorityVariant(priority: string) {
		switch (priority) {
			case 'high': return 'destructive';
			case 'medium': return 'secondary';
			case 'low': return 'outline';
			default: return 'outline';
		}
	}

	function getTypeIcon(type: string) {
		switch (type) {
			case 'Onboarding': return User;
			case 'Compliance': return CheckSquare;
			case 'Offboarding': return User;
			default: return CheckSquare;
		}
	}

	function formatDate(dateString: string | null) {
		if (!dateString) return 'No due date';
		return new Intl.DateTimeFormat('en-US', {
			month: 'short',
			day: 'numeric',
			year: 'numeric'
		}).format(new Date(dateString));
	}

	function isOverdue(dateString: string | null) {
		if (!dateString) return false;
		return new Date(dateString) < new Date();
	}

	async function handleTaskAction(action: string, task: any) {
		switch (action) {
			case 'view':
				console.log('View task:', task.id);
				break;
			case 'edit':
				console.log('Edit task:', task.id);
				break;
			case 'complete':
				try {
					// TODO: Implement server-side task status update
					console.log('Mark task as completed:', task.id);
				} catch (err: any) {
					console.error('Error updating task:', err);
				}
				break;
			case 'delete':
				if (confirm('Are you sure you want to delete this task?')) {
					// Would call API to delete task
					console.log('Delete task:', task.id);
				}
				break;
		}
	}

	function clearFilters() {
		searchTerm = '';
		statusFilter = 'all';
		typeFilter = 'all';
		employeeFilter = 'all';
		applyFilters();
	}

	// Apply filters when status or type filter changes
	$effect(() => {
		if (statusFilter !== data.filters.status || typeFilter !== data.filters.relatedEntityType) {
			applyFilters();
		}
	});
</script>

<div class="space-y-6">

	<!-- Summary Cards -->
	<div class="grid gap-4 md:grid-cols-4">
		<Card class="bg-white/80 dark:bg-slate-800/80 backdrop-blur-xl border border-white/30 dark:border-slate-700/50 rounded-lg shadow-xl">
			<CardHeader class="flex flex-row items-center justify-between space-y-0 pb-2">
				<CardTitle class="text-sm font-medium">Total Tasks</CardTitle>
				<CheckSquare class="h-4 w-4 text-muted-foreground" />
			</CardHeader>
			<CardContent>
				<div class="text-2xl font-bold">{stats.total}</div>
				<p class="text-xs text-muted-foreground">All tasks</p>
			</CardContent>
		</Card>

		<Card class="bg-white/80 dark:bg-slate-800/80 backdrop-blur-xl border border-white/30 dark:border-slate-700/50 rounded-lg shadow-xl">
			<CardHeader class="flex flex-row items-center justify-between space-y-0 pb-2">
				<CardTitle class="text-sm font-medium">In Progress</CardTitle>
				<Clock class="h-4 w-4 text-muted-foreground" />
			</CardHeader>
			<CardContent>
				<div class="text-2xl font-bold">{stats.inProgress}</div>
				<p class="text-xs text-muted-foreground">Currently active</p>
			</CardContent>
		</Card>

		<Card class="bg-white/80 dark:bg-slate-800/80 backdrop-blur-xl border border-white/30 dark:border-slate-700/50 rounded-lg shadow-xl">
			<CardHeader class="flex flex-row items-center justify-between space-y-0 pb-2">
				<CardTitle class="text-sm font-medium">Completed</CardTitle>
				<CheckSquare class="h-4 w-4 text-muted-foreground" />
			</CardHeader>
			<CardContent>
				<div class="text-2xl font-bold">{stats.completed}</div>
				<p class="text-xs text-muted-foreground">Finished tasks</p>
			</CardContent>
		</Card>

		<Card class="bg-white/80 dark:bg-slate-800/80 backdrop-blur-xl border border-white/30 dark:border-slate-700/50 rounded-lg shadow-xl">
			<CardHeader class="flex flex-row items-center justify-between space-y-0 pb-2">
				<CardTitle class="text-sm font-medium">Overdue</CardTitle>
				<AlertCircle class="h-4 w-4 text-muted-foreground" />
			</CardHeader>
			<CardContent>
				<div class="text-2xl font-bold text-red-600 dark:text-red-400">{stats.overdue}</div>
				<p class="text-xs text-muted-foreground">Past due date</p>
			</CardContent>
		</Card>
	</div>

	<!-- Filters -->
	<Card class="bg-white/80 dark:bg-slate-800/80 backdrop-blur-xl border border-white/30 dark:border-slate-700/50 rounded-lg shadow-xl">
		<CardHeader>
			<CardTitle>Search and Filters</CardTitle>
		</CardHeader>
		<CardContent>
			<div class="flex flex-col lg:flex-row gap-4">
				<div class="flex-1">
					<Input
						type="text"
						placeholder="Search tasks..."
						bind:value={searchTerm}
					/>
				</div>

				<select 
					class="px-3 py-2 border border-input rounded-md bg-background text-foreground"
					bind:value={statusFilter}
				>
					<option value="all">All Statuses</option>
					<option value="Pending">Pending</option>
					<option value="InProgress">In Progress</option>
					<option value="Completed">Completed</option>
					<option value="Blocked">Blocked</option>
				</select>

				<select 
					class="px-3 py-2 border border-input rounded-md bg-background text-foreground"
					bind:value={typeFilter}
				>
					<option value="all">All Types</option>
					<option value="Onboarding">Onboarding</option>
					<option value="Offboarding">Offboarding</option>
					<option value="Compliance">Compliance</option>
					<option value="General">General</option>
				</select>

				<Button variant="outline" onclick={clearFilters}>
					Clear Filters
				</Button>
			</div>
		</CardContent>
	</Card>

	<!-- Tasks List -->
	<Card class="bg-white/80 dark:bg-slate-800/80 backdrop-blur-xl border border-white/30 dark:border-slate-700/50 rounded-lg shadow-xl">
		<CardHeader>
			<CardTitle>Tasks ({stats.total})</CardTitle>
			<CardDescription>
				Manage and track all HR-related tasks
			</CardDescription>
		</CardHeader>
		<CardContent>
			{#if loading}
				<div class="flex items-center justify-center py-8">
					<div class="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
				</div>
			{:else if error}
				<div class="text-center py-8">
					<p class="text-destructive">{error}</p>
					<Button variant="outline" class="mt-4" onclick={() => window.location.reload()}>
						Retry
					</Button>
				</div>
			{:else if filteredTasks.length === 0}
				<div class="text-center py-8">
					<CheckSquare class="mx-auto h-12 w-12 text-muted-foreground/50" />
					<h3 class="mt-4 text-lg font-semibold">No tasks found</h3>
					<p class="mt-2 text-muted-foreground">
						{searchTerm || statusFilter !== 'all' || typeFilter !== 'all'
							? 'Try adjusting your search criteria'
							: 'Get started by creating your first task'}
					</p>
				</div>
			{:else}
				<div class="space-y-4">
					{#each filteredTasks as task}
						{@const TypeIcon = getTypeIcon(task.relatedEntityType)}
						<div class="border border-border/50 rounded-lg p-4 hover:bg-accent/30 transition-colors">
							<div class="flex items-start justify-between">
								<div class="flex-1 min-w-0">
									<div class="flex items-center space-x-2 mb-2">
										<TypeIcon class="h-4 w-4 text-muted-foreground flex-shrink-0" />
										<h3 class="font-medium text-foreground truncate">{task.title || 'Untitled Task'}</h3>
										{#if task.requiresVerification}
											<Badge variant="outline" class="text-xs">
												Verification Required
											</Badge>
										{/if}
										{#if isOverdue(task.dueDate) && task.status !== 'Completed'}
											<Badge variant="destructive" class="text-xs">
												Overdue
											</Badge>
										{/if}
									</div>
									
									<p class="text-sm text-muted-foreground mb-3 line-clamp-2">
										{task.description || 'No description provided'}
									</p>

									<div class="flex items-center space-x-4 text-sm">
										<div class="flex items-center space-x-1">
											<Badge variant={getStatusVariant(task.status)}>
												{task.status}
											</Badge>
										</div>

										<div class="flex items-center space-x-1">
											<Badge variant="outline">
												{task.relatedEntityType || 'General'}
											</Badge>
										</div>

										<div class="flex items-center space-x-1 text-muted-foreground">
											<User class="h-3 w-3" />
											<span>
												{task.assignedTo?.firstName ? 
													`${task.assignedTo.firstName} ${task.assignedTo.lastName}` : 
													'Unassigned'}
											</span>
										</div>

										<div class="flex items-center space-x-1 text-muted-foreground">
											<Calendar class="h-3 w-3" />
											<span>{formatDate(task.dueDate)}</span>
										</div>
									</div>
								</div>

								<div class="ml-4">
									<DropdownMenu>
										<DropdownMenuTrigger asChild>
											<Button variant="ghost" size="sm">
												Actions
											</Button>
										</DropdownMenuTrigger>
										<DropdownMenuContent align="end">
											<DropdownMenuItem onclick={() => handleTaskAction('view', task)}>
												View Details
											</DropdownMenuItem>
											<DropdownMenuItem onclick={() => handleTaskAction('edit', task)}>
												Edit Task
											</DropdownMenuItem>
											{#if task.status !== 'Completed'}
												<DropdownMenuItem onclick={() => handleTaskAction('complete', task)}>
													Mark Complete
												</DropdownMenuItem>
											{/if}
											<DropdownMenuItem 
												onclick={() => handleTaskAction('delete', task)}
												class="text-destructive focus:text-destructive"
											>
												Delete
											</DropdownMenuItem>
										</DropdownMenuContent>
									</DropdownMenu>
								</div>
							</div>
						</div>
					{/each}
				</div>
			{/if}
		</CardContent>
	</Card>

	<!-- Fixed position add button in bottom right corner -->
	<div class="fixed bottom-6 right-6 z-50">
		<Button class="h-14 w-14 rounded-full shadow-lg hover:shadow-xl transition-all duration-200">
			<Plus class="h-5 w-5" />
		</Button>
	</div>
</div>