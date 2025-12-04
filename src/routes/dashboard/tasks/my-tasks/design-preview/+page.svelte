<script lang="ts">
	import {
		CheckCircle2,
		Circle,
		Clock,
		MoreHorizontal,
		Plus,
		Search,
		Filter,
		ArrowUpRight,
		CalendarDays,
		LayoutGrid,
		List,
		CheckSquare,
		AlertCircle,
		TrendingUp
	} from '@lucide/svelte';
	import { Button } from '$lib/components/ui/button';
	import { Badge } from '$lib/components/ui/badge';
	import { Input } from '$lib/components/ui/input';
	import * as Avatar from '$lib/components/ui/avatar';
	import { Progress } from '$lib/components/ui/progress';
	import Separator from '$lib/components/ui/separator/separator.svelte';

	// Mock Data for Design Preview
	const stats = [
		{ label: 'Pending', value: 12, trend: '+2', color: 'bg-orange-500/10 text-orange-600' },
		{ label: 'In Progress', value: 5, trend: '-1', color: 'bg-blue-500/10 text-blue-600' },
		{ label: 'Completed', value: 28, trend: '+12', color: 'bg-green-500/10 text-green-600' },
		{ label: 'Overdue', value: 2, trend: '0', color: 'bg-red-500/10 text-red-600' }
	];

	const tasks = [
		{
			id: 1,
			title: 'Update Q3 Financial Reports',
			project: 'Finance',
			status: 'In Progress',
			priority: 'High',
			due: 'Today',
			time: '2:00 PM',
			assignee: 'JD'
		},
		{
			id: 2,
			title: 'Review New Onboarding Flow',
			project: 'HR Platform',
			status: 'Todo',
			priority: 'Medium',
			due: 'Tomorrow',
			time: '10:00 AM',
			assignee: 'JD'
		},
		{
			id: 3,
			title: 'Client Meeting Preparation',
			project: 'Sales',
			status: 'Done',
			priority: 'High',
			due: 'Yesterday',
			time: '',
			assignee: 'JD'
		},
		{
			id: 4,
			title: 'Fix Navigation Bug',
			project: 'Engineering',
			status: 'In Progress',
			priority: 'Urgent',
			due: 'Today',
			time: '4:30 PM',
			assignee: 'JD'
		},
		{
			id: 5,
			title: 'Draft Newsletter Content',
			project: 'Marketing',
			status: 'Todo',
			priority: 'Low',
			due: 'Next Week',
			time: '',
			assignee: 'JD'
		},
		{
			id: 6,
			title: 'Update Security Policies',
			project: 'Compliance',
			status: 'Todo',
			priority: 'Medium',
			due: 'Nov 24',
			time: '',
			assignee: 'JD'
		}
	];

	const upcomingEvents = [
		{ time: '10:00 AM', title: 'Team Standup', type: 'meeting' },
		{ time: '2:00 PM', title: 'Design Review', type: 'meeting' },
		{ time: '4:00 PM', title: 'Project Sync', type: 'meeting' }
	];
</script>

<div class="min-h-screen bg-muted/20 p-6 font-sans">
	<div class="mx-auto max-w-7xl space-y-6">
		<!-- Header Section -->
		<div class="flex flex-col justify-between gap-4 md:flex-row md:items-center">
			<div>
				<h1 class="text-2xl font-bold tracking-tight text-foreground">My Workspace</h1>
				<p class="text-sm text-muted-foreground">Manage your tasks and daily overview</p>
			</div>
			<div class="flex items-center gap-2">
				<Button variant="outline" size="sm" class="h-9 gap-2">
					<CalendarDays class="h-4 w-4" />
					<span>Nov 21, 2025</span>
				</Button>
				<Button size="sm" class="h-9 gap-2 bg-primary text-primary-foreground hover:bg-primary/90">
					<Plus class="h-4 w-4" />
					<span>New Task</span>
				</Button>
			</div>
		</div>

		<!-- Bento Grid Layout -->
		<div class="grid grid-cols-1 gap-4 md:grid-cols-12 lg:grid-rows-[auto_auto]">
			<!-- 1. Summary Stats (Top Left - Spans 8 cols) -->
			<div class="col-span-1 md:col-span-8 grid grid-cols-2 md:grid-cols-4 gap-4">
				{#each stats as stat}
					<div class="rounded-xl border bg-card p-4 shadow-sm transition-all hover:shadow-md">
						<div class="flex items-center justify-between">
							<p class="text-xs font-medium text-muted-foreground">{stat.label}</p>
							<span class="{stat.color} rounded-full p-1">
								<TrendingUp class="h-3 w-3" />
							</span>
						</div>
						<div class="mt-3 flex items-end gap-2">
							<h2 class="text-2xl font-bold">{stat.value}</h2>
							<span class="mb-1 text-xs font-medium text-green-500">{stat.trend}</span>
						</div>
					</div>
				{/each}
			</div>

			<!-- 2. Weekly Goal / Progress (Top Right - Spans 4 cols) -->
			<div class="col-span-1 md:col-span-4 rounded-xl border bg-card p-5 shadow-sm">
				<div class="mb-4 flex items-center justify-between">
					<h3 class="font-semibold">Weekly Goal</h3>
					<Badge variant="outline" class="text-xs font-normal">Week 47</Badge>
				</div>
				<div class="space-y-4">
					<div class="flex items-center justify-between text-sm">
						<span class="text-muted-foreground">Tasks Completed</span>
						<span class="font-medium">28/35</span>
					</div>
					<Progress value={80} class="h-2" />
					<div class="flex gap-2 mt-2">
						<div class="flex-1 rounded-lg bg-muted/50 p-2 text-center">
							<div class="text-xs text-muted-foreground">Efficiency</div>
							<div class="font-semibold text-green-600">94%</div>
						</div>
						<div class="flex-1 rounded-lg bg-muted/50 p-2 text-center">
							<div class="text-xs text-muted-foreground">Focus</div>
							<div class="font-semibold text-blue-600">4.2h</div>
						</div>
					</div>
				</div>
			</div>

			<!-- 3. Main Task List (Bottom Left - Spans 8 cols, Tall) -->
			<div
				class="col-span-1 md:col-span-8 row-span-2 rounded-xl border bg-card shadow-sm flex flex-col"
			>
				<!-- Toolbar -->
				<div class="flex items-center justify-between border-b p-4">
					<div class="flex items-center gap-4">
						<h3 class="font-semibold">Tasks</h3>
						<div class="flex items-center rounded-lg bg-muted p-1">
							<button class="rounded-md bg-background px-2 py-1 shadow-sm">
								<List class="h-4 w-4 text-foreground" />
							</button>
							<button class="rounded-md px-2 py-1 text-muted-foreground hover:text-foreground">
								<LayoutGrid class="h-4 w-4" />
							</button>
						</div>
					</div>
					<div class="flex items-center gap-2">
						<div class="relative hidden sm:block w-48">
							<Search class="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
							<Input type="text" placeholder="Search..." class="h-9 w-full pl-8" />
						</div>
						<Button variant="ghost" size="icon" class="h-9 w-9">
							<Filter class="h-4 w-4 text-muted-foreground" />
						</Button>
					</div>
				</div>

				<!-- Compact List -->
				<div class="flex-1 overflow-auto p-2">
					<div class="space-y-1">
						{#each tasks as task}
							<div
								class="group flex items-center gap-3 rounded-lg border border-transparent bg-background p-2.5 transition-all hover:border-border hover:shadow-sm"
							>
								<!-- Checkbox -->
								<button
									class="flex h-5 w-5 shrink-0 items-center justify-center rounded border border-muted-foreground/30 hover:border-primary hover:bg-primary/5 focus:outline-none"
								>
									{#if task.status === 'Done'}
										<CheckCircle2 class="h-4 w-4 text-green-600" />
									{:else}
										<div class="h-3 w-3 rounded-sm"></div>
									{/if}
								</button>

								<!-- Content -->
								<div
									class="flex min-w-0 flex-1 flex-col gap-0.5 sm:flex-row sm:items-center sm:gap-4"
								>
									<span
										class="truncate text-sm font-medium text-foreground {task.status === 'Done'
											? 'line-through text-muted-foreground'
											: ''}"
									>
										{task.title}
									</span>

									<div class="flex items-center gap-2 sm:ml-auto">
										<!-- Tags -->
										<span
											class="inline-flex items-center rounded-md bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground"
										>
											{task.project}
										</span>

										<!-- Priority Dot -->
										{#if task.priority === 'Urgent'}
											<span
												class="flex items-center gap-1 rounded-full bg-red-100 px-2 py-0.5 text-[10px] font-medium text-red-600 dark:bg-red-900/20"
											>
												<AlertCircle class="h-3 w-3" /> Urgent
											</span>
										{:else if task.priority === 'High'}
											<span class="h-2 w-2 rounded-full bg-orange-500" title="High Priority"></span>
										{/if}
									</div>
								</div>

								<!-- Meta -->
								<div
									class="hidden items-center gap-4 sm:flex text-xs text-muted-foreground w-32 justify-end"
								>
									<div
										class="flex items-center gap-1 {task.due === 'Today'
											? 'text-orange-600 font-medium'
											: ''}"
									>
										<Clock class="h-3.5 w-3.5" />
										{task.due}
									</div>
									<Avatar.Root class="h-6 w-6 border">
										<Avatar.Fallback class="text-[10px] bg-primary/10 text-primary"
											>JD</Avatar.Fallback
										>
									</Avatar.Root>
								</div>

								<!-- Actions -->
								<Button
									variant="ghost"
									size="icon"
									class="h-7 w-7 opacity-0 group-hover:opacity-100"
								>
									<MoreHorizontal class="h-4 w-4 text-muted-foreground" />
								</Button>
							</div>
						{/each}
					</div>
				</div>
			</div>

			<!-- 4. Upcoming / Schedule (Bottom Right - Spans 4 cols) -->
			<div class="col-span-1 md:col-span-4 rounded-xl border bg-card p-5 shadow-sm h-full">
				<h3 class="mb-4 font-semibold">Today's Schedule</h3>
				<div class="relative border-l border-muted pl-6 space-y-6">
					{#each upcomingEvents as event}
						<div class="relative">
							<span
								class="absolute -left-[29px] top-1 h-3 w-3 rounded-full border-2 border-background bg-primary ring-4 ring-background"
							></span>
							<div class="flex flex-col gap-1">
								<span class="text-xs font-medium text-muted-foreground">{event.time}</span>
								<span class="text-sm font-medium">{event.title}</span>
							</div>
						</div>
					{/each}

					<!-- Empty State Slot -->
					<div class="relative pt-4">
						<div class="rounded-lg border border-dashed p-3 text-center">
							<span class="text-xs text-muted-foreground">No more events</span>
						</div>
					</div>
				</div>
			</div>

			<!-- 5. Quick Notes / Scratchpad (Bottom Right - Spans 4 cols) -->
			<div class="col-span-1 md:col-span-4 rounded-xl border bg-card p-5 shadow-sm">
				<div class="mb-2 flex items-center justify-between">
					<h3 class="font-semibold">Quick Notes</h3>
					<Button variant="ghost" size="icon" class="h-6 w-6"><Plus class="h-3 w-3" /></Button>
				</div>
				<textarea
					class="w-full resize-none rounded-md bg-muted/30 p-3 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/20 h-32"
					placeholder="Jot down something..."
				></textarea>
			</div>
		</div>
	</div>
</div>
