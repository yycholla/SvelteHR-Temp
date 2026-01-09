<script lang="ts">
	import {
		Calendar,
		CheckCircle2,
		ChevronLeft,
		Clock,
		Mail,
		TrendingUp,
		User,
		Users,
		XCircle
	} from '@lucide/svelte';
	import { Button } from '$lib/components/ui/button';
	import * as Card from '$lib/components/ui/card';
	import * as Table from '$lib/components/ui/table';
	import { Badge } from '$lib/components/ui/badge';
	import { Progress } from '$lib/components/ui/progress';

	const { data } = $props();
	const { training, assignments, stats, totalContents } = data;

	function formatDate(dateStr: string | null) {
		if (!dateStr) return 'N/A';
		return new Date(dateStr).toLocaleDateString(undefined, {
			year: 'numeric',
			month: 'short',
			day: 'numeric'
		});
	}
</script>

<svelte:head>
	<title>{training?.title || 'Training'} - Completion Stats</title>
</svelte:head>

<div class="container mx-auto p-6 md:p-10 max-w-7xl space-y-8">
	<!-- Header -->
	<div class="flex items-center justify-between">
		<div class="flex items-center gap-4">
			<Button variant="ghost" size="icon" href="/admin/trainings">
				<ChevronLeft class="h-5 w-5" />
			</Button>
			<div>
				<h1 class="text-3xl font-bold tracking-tight">{training.title}</h1>
				<p class="text-muted-foreground">Training Completion Statistics</p>
			</div>
		</div>
		<div class="flex gap-2">
			<Button variant="outline" href="/admin/trainings/{training.id}">
				Edit Training
			</Button>
			<Button variant="outline" href="/admin/trainings/{training.id}/content">
				Manage Content
			</Button>
		</div>
	</div>

	<!-- Training Info Card -->
	<Card.Root>
		<Card.Header>
			<Card.Title>Training Details</Card.Title>
		</Card.Header>
		<Card.Content>
			<div class="grid grid-cols-1 md:grid-cols-3 gap-4">
				<div>
					<p class="text-sm text-muted-foreground">Status</p>
					<Badge variant={training.isActive ? 'default' : 'secondary'} class="mt-1">
						{training.isActive ? 'Active' : 'Inactive'}
					</Badge>
				</div>
				<div>
					<p class="text-sm text-muted-foreground">Start Date</p>
					<p class="font-medium">{formatDate(training.startDate)}</p>
				</div>
				<div>
					<p class="text-sm text-muted-foreground">End Date</p>
					<p class="font-medium">{formatDate(training.endDate)}</p>
				</div>
				<div>
					<p class="text-sm text-muted-foreground">Total Content Items</p>
					<p class="font-medium">{totalContents}</p>
				</div>
			</div>
			{#if training.description}
				<div class="mt-4">
					<p class="text-sm text-muted-foreground">Description</p>
					<p class="mt-1">{training.description}</p>
				</div>
			{/if}
		</Card.Content>
	</Card.Root>

	<!-- Stats Cards -->
	<div class="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
		<!-- Row 1: Assignment Stats -->
		<Card.Root>
			<Card.Header class="flex flex-row items-center justify-between space-y-0 pb-2">
				<Card.Title class="text-sm font-medium">Total Assigned</Card.Title>
				<Users class="h-4 w-4 text-muted-foreground" />
			</Card.Header>
			<Card.Content>
				<div class="text-2xl font-bold">{stats.totalAssigned}</div>
				<p class="text-xs text-muted-foreground">Total employees</p>
			</Card.Content>
		</Card.Root>

		<Card.Root>
			<Card.Header class="flex flex-row items-center justify-between space-y-0 pb-2">
				<Card.Title class="text-sm font-medium">Average Completion</Card.Title>
				<TrendingUp class="h-4 w-4 text-muted-foreground" />
			</Card.Header>
			<Card.Content>
				<div class="text-2xl font-bold text-blue-600">{stats.averageCompletion}%</div>
				<p class="text-xs text-muted-foreground">Across all assigned</p>
			</Card.Content>
		</Card.Root>

		<Card.Root>
			<Card.Header class="flex flex-row items-center justify-between space-y-0 pb-2">
				<Card.Title class="text-sm font-medium">Completed</Card.Title>
				<CheckCircle2 class="h-4 w-4 text-muted-foreground" />
			</Card.Header>
			<Card.Content>
				<div class="text-2xl font-bold text-green-600">{stats.completed}</div>
				<p class="text-xs text-muted-foreground">
					{stats.totalAssigned > 0 ? Math.round((stats.completed / stats.totalAssigned) * 100) : 0}%
					complete
				</p>
			</Card.Content>
		</Card.Root>

		<Card.Root>
			<Card.Header class="flex flex-row items-center justify-between space-y-0 pb-2">
				<Card.Title class="text-sm font-medium">In Progress</Card.Title>
				<Clock class="h-4 w-4 text-muted-foreground" />
			</Card.Header>
			<Card.Content>
				<div class="text-2xl font-bold text-blue-600">{stats.inProgress}</div>
				<p class="text-xs text-muted-foreground">Currently learning</p>
			</Card.Content>
		</Card.Root>

		<!-- Row 2: Due Date Stats -->
		<Card.Root>
			<Card.Header class="flex flex-row items-center justify-between space-y-0 pb-2">
				<Card.Title class="text-sm font-medium">Not Started</Card.Title>
				<XCircle class="h-4 w-4 text-muted-foreground" />
			</Card.Header>
			<Card.Content>
				<div class="text-2xl font-bold text-gray-600">{stats.notStarted}</div>
				<p class="text-xs text-muted-foreground">Yet to begin</p>
			</Card.Content>
		</Card.Root>

		<Card.Root>
			<Card.Header class="flex flex-row items-center justify-between space-y-0 pb-2">
				<Card.Title class="text-sm font-medium">With Due Date</Card.Title>
				<Calendar class="h-4 w-4 text-muted-foreground" />
			</Card.Header>
			<Card.Content>
				<div class="text-2xl font-bold">{stats.withDueDate}</div>
				<p class="text-xs text-muted-foreground">
					{stats.totalAssigned > 0
						? Math.round((stats.withDueDate / stats.totalAssigned) * 100)
						: 0}% have deadlines
				</p>
			</Card.Content>
		</Card.Root>

		<Card.Root>
			<Card.Header class="flex flex-row items-center justify-between space-y-0 pb-2">
				<Card.Title class="text-sm font-medium">Due Soon</Card.Title>
				<Clock class="h-4 w-4 text-muted-foreground" />
			</Card.Header>
			<Card.Content>
				<div class="text-2xl font-bold text-orange-600">{stats.dueSoon}</div>
				<p class="text-xs text-muted-foreground">Within 7 days</p>
			</Card.Content>
		</Card.Root>

		<Card.Root>
			<Card.Header class="flex flex-row items-center justify-between space-y-0 pb-2">
				<Card.Title class="text-sm font-medium">Overdue</Card.Title>
				<XCircle class="h-4 w-4 text-muted-foreground" />
			</Card.Header>
			<Card.Content>
				<div class="text-2xl font-bold text-red-600">{stats.overdue}</div>
				<p class="text-xs text-muted-foreground">Past due date</p>
			</Card.Content>
		</Card.Root>
	</div>

	<!-- Assignments Table -->
	<Card.Root>
		<Card.Header>
			<Card.Title>Assigned Employees ({assignments.length})</Card.Title>
			<Card.Description>View completion status for all assigned employees</Card.Description>
		</Card.Header>
		<Card.Content>
			<div class="rounded-md border">
				<Table.Root>
					<Table.Header>
						<Table.Row>
							<Table.Head>Employee</Table.Head>
							<Table.Head>Completion Progress</Table.Head>
							<Table.Head>Assigned Date</Table.Head>
							<Table.Head>Due Date</Table.Head>
							<Table.Head>Time Until Due</Table.Head>
						</Table.Row>
					</Table.Header>
					<Table.Body>
						{#if assignments.length > 0}
							{#each assignments as assignment (assignment.id)}
								<Table.Row>
									<Table.Cell class="font-medium">
										<div class="flex items-center gap-3">
											<div
												class="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10"
											>
												<User class="h-5 w-5 text-primary" />
											</div>
											<div>
												<div class="font-semibold">{assignment.user.displayName}</div>
												<div class="flex items-center gap-2 text-xs text-muted-foreground">
													<Mail class="h-3 w-3" />
													{assignment.user.email}
												</div>
											</div>
										</div>
									</Table.Cell>
									<Table.Cell>
										<div class="flex flex-col gap-2 min-w-[200px]">
											<div class="flex items-center justify-between text-sm">
												<span class="font-medium">{assignment.completionPercentage}%</span>
												<Badge
													variant={assignment.status === 'Completed'
														? 'default'
														: assignment.status === 'In Progress'
															? 'secondary'
															: 'outline'}
												>
													{assignment.status}
												</Badge>
											</div>
											<Progress value={assignment.completionPercentage} class="h-2" />
											<span class="text-xs text-muted-foreground">
												{assignment.completedCount} of {assignment.totalContents} completed
											</span>
										</div>
									</Table.Cell>
									<Table.Cell class="text-sm text-muted-foreground">
										<div class="flex flex-col">
											<span>{formatDate(assignment.assignedAt)}</span>
											<span class="text-xs">({assignment.daysSinceAssigned} days ago)</span>
										</div>
									</Table.Cell>
									<Table.Cell>
										{#if assignment.dueDate}
											<div class="flex items-center gap-1 text-sm">
												<Calendar class="h-3 w-3" />
												{formatDate(assignment.dueDate)}
											</div>
										{:else}
											<span class="text-sm text-muted-foreground">No due date</span>
										{/if}
									</Table.Cell>
									<Table.Cell>
										{#if assignment.daysUntilDue !== null}
											{#if assignment.daysUntilDue < 0}
												<Badge variant="destructive" class="gap-1">
													<XCircle class="h-3 w-3" />
													{Math.abs(assignment.daysUntilDue)} days overdue
												</Badge>
											{:else if assignment.daysUntilDue <= 7}
												<Badge variant="secondary" class="gap-1">
													<Clock class="h-3 w-3" />
													{assignment.daysUntilDue} days left
												</Badge>
											{:else}
												<Badge variant="outline" class="gap-1">
													<CheckCircle2 class="h-3 w-3" />
													{assignment.daysUntilDue} days left
												</Badge>
											{/if}
										{:else}
											<span class="text-sm text-muted-foreground">-</span>
										{/if}
									</Table.Cell>
								</Table.Row>
							{/each}
						{:else}
							<Table.Row>
								<Table.Cell colspan={5} class="h-24 text-center">
									<div class="flex flex-col items-center gap-2">
										<Users class="h-12 w-12 text-muted-foreground" />
										<p class="text-muted-foreground">No employees assigned to this training yet.</p>
										<Button variant="outline" href="/admin/trainings/{training.id}">
											Assign Employees
										</Button>
									</div>
								</Table.Cell>
							</Table.Row>
						{/if}
					</Table.Body>
				</Table.Root>
			</div>
		</Card.Content>
	</Card.Root>
</div>
