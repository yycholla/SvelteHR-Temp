<script lang="ts">
	import { goto } from '$app/navigation';
	import { page } from '$app/stores';
	import Card from '$lib/components/ui/card/card.svelte';
	import CardHeader from '$lib/components/ui/card/card-header.svelte';
	import CardTitle from '$lib/components/ui/card/card-title.svelte';
	import CardContent from '$lib/components/ui/card/card-content.svelte';
	import Button from '$lib/components/ui/button/button.svelte';
	import Input from '$lib/components/ui/input/input.svelte';
	import Label from '$lib/components/ui/label/label.svelte';
	import Badge from '$lib/components/ui/badge/badge.svelte';
	import Avatar from '$lib/components/ui/avatar/avatar.svelte';
	import AvatarFallback from '$lib/components/ui/avatar/avatar-fallback.svelte';
  import TaskCreateForm from '$lib/components/tasks/TaskCreateForm.svelte';
	import {
		Search,
		Filter,
		Plus,
		CheckCircle,
		Clock,
		AlertTriangle,
		User,
		Calendar,
		MoreVertical
	} from 'lucide-svelte';
	import type { PageData } from './$types';

  let { data }: { data: PageData } = $props();
  const filtersSafe = data.filters ?? { search: '', status: '', priority: '' };

	// Form state
  let searchQuery = $state(filtersSafe.search || '');
  let statusFilter = $state(filtersSafe.status || '');
  let priorityFilter = $state(filtersSafe.priority || '');
  let newTaskOpen = $state(false);
  // Task form
  let taskForm: any;

	// Filter options
	const statusOptions = [
		{ value: '', label: 'All Status' },
		{ value: 'pending', label: 'Pending' },
		{ value: 'in_progress', label: 'In Progress' },
		{ value: 'completed', label: 'Completed' },
		{ value: 'cancelled', label: 'Cancelled' }
	];

	const priorityOptions = [
		{ value: '', label: 'All Priority' },
		{ value: 'low', label: 'Low' },
		{ value: 'medium', label: 'Medium' },
		{ value: 'high', label: 'High' },
		{ value: 'urgent', label: 'Urgent' }
	];

	// Apply filters
	function applyFilters() {
		const params = new URLSearchParams();
		if (searchQuery.trim()) params.append('search', searchQuery);
		if (statusFilter) params.append('status', statusFilter);
		if (priorityFilter) params.append('priority', priorityFilter);

		const query = params.toString();
		goto(`/tasks${query ? '?' + query : ''}`, { replaceState: true });
	}

	// Clear filters
	function clearFilters() {
		searchQuery = '';
		statusFilter = '';
		priorityFilter = '';
		goto('/tasks', { replaceState: true });
	}

	// Get status badge variant
  type BadgeVariant = 'default' | 'destructive' | 'outline' | 'secondary' | 'success' | 'warning' | 'info';
  function getStatusBadge(status: string) {
		switch (status.toLowerCase()) {
      case 'completed': return { variant: 'success' as BadgeVariant, label: 'Completed' };
      case 'in_progress': return { variant: 'info' as BadgeVariant, label: 'In Progress' };
      case 'pending': return { variant: 'warning' as BadgeVariant, label: 'Pending' };
      case 'cancelled': return { variant: 'destructive' as BadgeVariant, label: 'Cancelled' };
      default: return { variant: 'default' as BadgeVariant, label: status };
		}
	}

	// Get priority badge variant
  function getPriorityBadge(priority: string) {
		switch (priority.toLowerCase()) {
      case 'urgent': return { variant: 'destructive' as BadgeVariant, label: 'Urgent', icon: AlertTriangle };
      case 'high': return { variant: 'warning' as BadgeVariant, label: 'High', icon: AlertTriangle };
      case 'medium': return { variant: 'info' as BadgeVariant, label: 'Medium', icon: Clock };
      case 'low': return { variant: 'default' as BadgeVariant, label: 'Low', icon: Clock };
      default: return { variant: 'default' as BadgeVariant, label: priority, icon: Clock };
		}
	}

	// Format date
	function formatDate(dateString: string) {
		if (!dateString) return 'No due date';
		try {
			const date = new Date(dateString);
			return date.toLocaleDateString();
		} catch {
			return 'Invalid date';
		}
	}

	// Get initials for avatar
	function getInitials(name: string) {
		return name
			.split(' ')
			.map(n => n[0])
			.join('')
			.toUpperCase()
			.slice(0, 2);
	}
</script>

<div class="container mx-auto px-6 pb-6 pt-6 space-y-6 max-w-7xl">
	<!-- Header -->
	<div class="flex items-center justify-between">
		<div>
			<h1 class="text-3xl font-bold bg-gradient-to-r from-foreground to-foreground/80 bg-clip-text text-transparent">Tasks</h1>
			<p class="text-muted-foreground mt-2">Manage and track your team's tasks and assignments</p>
		</div>
        <Button class="rounded-xl hover:scale-[1.02] transition-all duration-200" onclick={() => newTaskOpen = true}>
			<Plus class="h-4 w-4 mr-2" />
			New Task
		</Button>
	</div>

	<!-- Filters -->
	<Card class="bg-white border-border shadow-lg rounded-2xl border">
		<CardHeader class="pb-4">
			<CardTitle class="flex items-center text-lg font-semibold">
				<Filter class="h-5 w-5 mr-2 text-primary" />
				Filters
			</CardTitle>
		</CardHeader>
		<CardContent>
			<div class="grid grid-cols-1 md:grid-cols-4 gap-4">
				<div class="space-y-2">
					<Label for="search">Search Tasks</Label>
					<div class="relative">
						<Search class="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
						<Input
							id="search"
							bind:value={searchQuery}
							placeholder="Search by title or description..."
							class="pl-10 rounded-xl"
							onkeydown={(e) => {
								if (e.key === 'Enter') {
									applyFilters();
								}
							}}
						/>
					</div>
				</div>

				<div class="space-y-2">
					<Label for="status">Status</Label>
					<select
						id="status"
						bind:value={statusFilter}
						class="w-full px-3 py-2 rounded-xl bg-background border-border focus:bg-background transition-all duration-200"
					>
						{#each statusOptions as option}
							<option value={option.value}>{option.label}</option>
						{/each}
					</select>
				</div>

				<div class="space-y-2">
					<Label for="priority">Priority</Label>
					<select
						id="priority"
						bind:value={priorityFilter}
						class="w-full px-3 py-2 rounded-xl bg-background border-border focus:bg-background transition-all duration-200"
					>
						{#each priorityOptions as option}
							<option value={option.value}>{option.label}</option>
						{/each}
					</select>
				</div>

				<div class="flex items-end space-x-2">
					<Button onclick={applyFilters} class="rounded-xl flex-1">
						Apply
					</Button>
					<Button variant="outline" onclick={clearFilters} class="rounded-xl">
						Clear
					</Button>
				</div>
			</div>
		</CardContent>
	</Card>

	<!-- Stats Summary -->
	<div class="grid grid-cols-1 md:grid-cols-4 gap-6">
		<Card class="bg-white border-border shadow-lg hover:shadow-xl transition-all duration-200 rounded-2xl border">
			<CardContent class="p-6">
				<div class="flex items-center justify-between">
					<div>
						<p class="text-sm font-medium text-muted-foreground">Total Tasks</p>
						<p class="text-2xl font-bold text-foreground">{data.totalCount}</p>
					</div>
					<div class="p-3 bg-primary/10 rounded-full">
						<CheckCircle class="h-5 w-5 text-primary" />
					</div>
				</div>
			</CardContent>
		</Card>

		<Card class="bg-white border-border shadow-lg hover:shadow-xl transition-all duration-200 rounded-2xl border">
			<CardContent class="p-6">
				<div class="flex items-center justify-between">
					<div>
						<p class="text-sm font-medium text-muted-foreground">In Progress</p>
                        <p class="text-2xl font-bold text-blue-600">{data.tasks.filter((t: any) => t.status === 'in_progress').length}</p>
					</div>
					<div class="p-3 bg-blue-100 rounded-full">
						<Clock class="h-5 w-5 text-blue-600" />
					</div>
				</div>
			</CardContent>
		</Card>

		<Card class="bg-white border-border shadow-lg hover:shadow-xl transition-all duration-200 rounded-2xl border">
			<CardContent class="p-6">
				<div class="flex items-center justify-between">
					<div>
						<p class="text-sm font-medium text-muted-foreground">Completed</p>
                        <p class="text-2xl font-bold text-green-600">{data.tasks.filter((t: any) => t.status === 'completed').length}</p>
					</div>
					<div class="p-3 bg-green-100 rounded-full">
						<CheckCircle class="h-5 w-5 text-green-600" />
					</div>
				</div>
			</CardContent>
		</Card>

		<Card class="bg-white border-border shadow-lg hover:shadow-xl transition-all duration-200 rounded-2xl border">
			<CardContent class="p-6">
				<div class="flex items-center justify-between">
					<div>
						<p class="text-sm font-medium text-muted-foreground">High Priority</p>
                        <p class="text-2xl font-bold text-red-600">{data.tasks.filter((t: any) => t.priority === 'high' || t.priority === 'urgent').length}</p>
					</div>
					<div class="p-3 bg-red-100 rounded-full">
						<AlertTriangle class="h-5 w-5 text-red-600" />
					</div>
				</div>
			</CardContent>
		</Card>
	</div>

	<!-- Tasks List -->
	<Card class="bg-white border-border shadow-lg rounded-2xl border">
		<CardHeader>
            <CardTitle>Tasks ({data.tasks.length})</CardTitle>
		</CardHeader>
		<CardContent>
			{#if data.tasks.length === 0}
				<div class="text-center py-12">
					<CheckCircle class="h-12 w-12 text-muted-foreground mx-auto mb-4" />
					<h3 class="text-lg font-semibold text-muted-foreground mb-2">No Tasks Found</h3>
					<p class="text-muted-foreground">
						{data.isUsingMockData ? 'Connect to your API to see real tasks.' : 'No tasks match your current filters.'}
					</p>
				</div>
			{:else}
				<div class="space-y-4">
					{#each data.tasks as task}
                        {@const statusBadge = getStatusBadge(task.status)}
                        {@const priorityBadge = getPriorityBadge(task.priority)}

						<div class="p-4 border border-border rounded-xl hover:bg-muted/30 transition-all duration-200">
							<div class="flex items-start justify-between">
								<div class="flex-1 space-y-2">
									<div class="flex items-center space-x-3">
										<h3 class="font-semibold text-foreground hover:text-primary cursor-pointer">
											{task.title}
										</h3>
                        <Badge variant={statusBadge.variant} class="text-xs">
											{statusBadge.label}
										</Badge>
                        <Badge variant={priorityBadge.variant} class="text-xs">
                            {#if priorityBadge.icon}
                              <svelte:component this={priorityBadge.icon} class="h-3 w-3 mr-1" />
                            {/if}
											{priorityBadge.label}
										</Badge>
									</div>

									{#if task.description}
										<p class="text-sm text-muted-foreground line-clamp-2">
											{task.description}
										</p>
									{/if}

									<div class="flex items-center space-x-4 text-xs text-muted-foreground">
										<div class="flex items-center space-x-1">
											<User class="h-3 w-3" />
											<span>{task.assignedToName}</span>
										</div>
										<div class="flex items-center space-x-1">
											<Calendar class="h-3 w-3" />
											<span>{formatDate(task.dueDate)}</span>
										</div>
										<span>Created by {task.issuedByName}</span>
									</div>
								</div>

								<div class="flex items-center space-x-2">
									<Avatar size="sm">
										<AvatarFallback class="bg-primary/10 text-primary text-xs">
											{getInitials(task.assignedToName)}
										</AvatarFallback>
									</Avatar>
									<Button variant="ghost" size="sm" class="h-8 w-8 p-0">
										<MoreVertical class="h-4 w-4" />
									</Button>
								</div>
							</div>
						</div>
					{/each}
				</div>

				<!-- Pagination -->
                {#if (data.totalPages ?? 0) > 1}
					<div class="flex items-center justify-between mt-6">
                        <p class="text-sm text-muted-foreground">
                            {#key `${data.page}-${data.limit}-${data.totalCount}`}
                            {@const pageNum = data.page ?? 1}
                            {@const limitNum = data.limit ?? 20}
                            Showing {((pageNum - 1) * limitNum) + 1} to {Math.min(pageNum * limitNum, data.totalCount)} of {data.totalCount} tasks
                            {/key}
						</p>
						<div class="flex items-center space-x-2">
							<Button
								variant="outline"
								size="sm"
                                disabled={(data.page ?? 1) <= 1}
                                onclick={() => goto(`/tasks?page=${(data.page ?? 1) - 1}`)}
								class="rounded-lg"
							>
								Previous
							</Button>
							<span class="text-sm font-medium">
                                Page {data.page ?? 1} of {data.totalPages ?? 1}
							</span>
							<Button
								variant="outline"
								size="sm"
								disabled={!data.hasMore}
                                onclick={() => goto(`/tasks?page=${(data.page ?? 1) + 1}`)}
								class="rounded-lg"
							>
								Next
							</Button>
						</div>
					</div>
				{/if}
			{/if}
		</CardContent>
	</Card>
</div>

{#if typeof newTaskOpen === 'undefined'}
    {@html ''}
{/if}
{#if newTaskOpen}
<div class="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
  <div class="bg-background rounded-xl border border-border p-6 w-full max-w-md">
    <TaskCreateForm on:close={() => newTaskOpen = false} />
  </div>
</div>
{/if}
