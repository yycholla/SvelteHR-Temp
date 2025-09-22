<script lang="ts">
	import { onMount } from 'svelte';
	import { page } from '$app/stores';
	import { queryStore } from '@urql/svelte';
	import { createUrqlClient } from '$lib/graphql/client';
	import { currentUser, hasRole } from '$lib/stores/auth';
	import RoleGuard from '$lib/components/auth/RoleGuard.svelte';
	import * as Card from '$lib/components/ui/card';
	import * as Table from '$lib/components/ui/table';
	import * as Tabs from '$lib/components/ui/tabs';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Badge } from '$lib/components/ui/badge';
	import { Progress } from '$lib/components/ui/progress';
	import {
		Target,
		Award,
		TrendingUp,
		Calendar,
		Plus,
		Search,
		RefreshCw,
		Users,
		BarChart3,
		Clock,
		CheckCircle,
		AlertCircle
	} from 'lucide-svelte';

	// Import our new GraphQL operations
	import {
		GET_ACTIVE_PERFORMANCE_CYCLES_QUERY,
		GET_EMPLOYEE_PERFORMANCE_GOALS_QUERY,
		GET_EMPLOYEE_PERFORMANCE_REVIEWS_QUERY,
		type PerformanceReview,
		type PerformanceGoal,
		type PerformanceCycle
	} from '$lib/graphql/performance-management-operations';

	// Get user ID from URL params
	const userId = $page.params.userId;

	// Check if viewing own performance
	const isOwnPerformance = $derived($currentUser?.id === userId);

	// State
	let searchTerm = $state('');
	let currentTab = $state('overview');

	// Create client and queries
	const client = createUrqlClient();
	let myPerformanceQuery: any = $state(null);
	let teamPerformanceQuery: any = $state(null);
	let cyclesQuery: any = $state(null);
	let goalsQuery: any = $state(null);

	let myQueryState = $state({ fetching: true, error: null, data: null });
	let teamQueryState = $state({ fetching: false, error: null, data: null });
	let cyclesQueryState = $state({ fetching: true, error: null, data: null });
	let goalsQueryState = $state({ fetching: true, error: null, data: null });

	onMount(() => {
		try {
			// Initialize user performance reviews query
			myPerformanceQuery = queryStore({
				client,
				query: GET_EMPLOYEE_PERFORMANCE_REVIEWS_QUERY,
				variables: {
					employeeId: userId,
					first: 10,
					orderBy: ['REVIEW_PERIOD_START_DESC']
				}
			});

			// Initialize active cycles query
			cyclesQuery = queryStore({
				client,
				query: GET_ACTIVE_PERFORMANCE_CYCLES_QUERY,
				variables: {}
			});

			// Initialize user goals query
			goalsQuery = queryStore({
				client,
				query: GET_EMPLOYEE_PERFORMANCE_GOALS_QUERY,
				variables: {
					employeeId: userId,
					first: 10,
					orderBy: ['TARGET_DATE_ASC']
				}
			});

			// Team performance functionality can be added later for managers
		} catch (error) {
			console.error('Error initializing performance queries:', error);
		}
	});

	// Update query states
	$effect(() => {
		if (myPerformanceQuery) {
			const unsubscribe = myPerformanceQuery.subscribe((state: any) => {
				myQueryState = {
					fetching: state.fetching,
					error: state.error,
					data: state.data
				};
			});
			return unsubscribe;
		}
	});

	$effect(() => {
		if (teamPerformanceQuery) {
			const unsubscribe = teamPerformanceQuery.subscribe((state: any) => {
				teamQueryState = {
					fetching: state.fetching,
					error: state.error,
					data: state.data
				};
			});
			return unsubscribe;
		}
	});

	$effect(() => {
		if (cyclesQuery) {
			const unsubscribe = cyclesQuery.subscribe((state: any) => {
				cyclesQueryState = {
					fetching: state.fetching,
					error: state.error,
					data: state.data
				};
			});
			return unsubscribe;
		}
	});

	$effect(() => {
		if (goalsQuery) {
			const unsubscribe = goalsQuery.subscribe((state: any) => {
				goalsQueryState = {
					fetching: state.fetching,
					error: state.error,
					data: state.data
				};
			});
			return unsubscribe;
		}
	});

	// Get data
	const myPerformanceData = $derived(() => myQueryState.data?.myPerformanceSummary || null);
	const teamPerformanceData = $derived(() => teamQueryState.data?.teamPerformanceSummary || []);
	const activeCycles = $derived(() => cyclesQueryState.data?.allPerformanceCycles?.nodes || []);
	const myGoals = $derived(() => {
		const goals = goalsQueryState.data?.allPerformanceGoals?.nodes;
		return Array.isArray(goals) ? goals : [];
	});

	// Filter goals based on search
	const filteredGoals = $derived(() => {
		const goals = Array.isArray(myGoals) ? myGoals : [];
		if (!searchTerm) return goals;
		const search = searchTerm.toLowerCase();
		return goals.filter(
			(goal: PerformanceGoal) =>
				goal.title?.toLowerCase().includes(search) ||
				goal.description?.toLowerCase().includes(search)
		);
	});

	// Calculate goal completion percentage
	const calculateGoalProgress = (goal: PerformanceGoal) => {
		if (goal.status === 'COMPLETED') return 100;
		if (goal.progressPercentage !== undefined && goal.progressPercentage !== null) {
			return goal.progressPercentage;
		}
		if (goal.status === 'Active') return 0;
		return 0;
	};

	// Get status badge variant
	const getStatusVariant = (status: string) => {
		switch (status) {
			case 'COMPLETED':
				return 'default';
			case 'Active':
				return 'secondary';
			case 'CANCELLED':
			case 'ON_HOLD':
				return 'outline';
			case 'Draft':
			case 'SUBMITTED':
				return 'secondary';
			default:
				return 'outline';
		}
	};

	// Format date
	const formatDate = (dateString: string) => {
		return new Date(dateString).toLocaleDateString();
	};

	// Refresh data
	const refresh = () => {
		myPerformanceQuery?.rerun({ requestPolicy: 'network-only' });
		teamPerformanceQuery?.rerun({ requestPolicy: 'network-only' });
		cyclesQuery?.rerun({ requestPolicy: 'network-only' });
		goalsQuery?.rerun({ requestPolicy: 'network-only' });
	};
</script>

<svelte:head>
	<title>Performance Management - SvelteHR</title>
	<meta name="description" content="Manage performance reviews, goals, and development" />
</svelte:head>

<div class="space-y-6">
	<!-- Header -->
	<div class="flex flex-col space-y-4 md:flex-row md:items-center md:justify-between md:space-y-0">
		<div>
			<h1 class="flex items-center gap-3 text-3xl font-bold tracking-tight">
				<Target class="h-8 w-8" />
				Performance Management
			</h1>
			<p class="text-muted-foreground">Track goals, conduct reviews, and drive development</p>
		</div>

		<div class="flex items-center space-x-2">
			<Button href="/dashboard/users/{userId}/performance/goals/new">
				<Plus class="mr-2 h-4 w-4" />
				Set Goal
			</Button>

			<Button variant="outline" size="sm" onclick={refresh} disabled={myQueryState.fetching}>
				<RefreshCw class="h-4 w-4 {myQueryState.fetching ? 'animate-spin' : ''}" />
			</Button>
		</div>
	</div>

	<!-- Tabs -->
	<Tabs.Root bind:value={currentTab} class="w-full">
		<Tabs.List class="grid w-full grid-cols-3">
			<Tabs.Trigger value="overview" class="flex items-center gap-2">
				<BarChart3 class="h-4 w-4" />
				Overview
			</Tabs.Trigger>
			<Tabs.Trigger value="goals" class="flex items-center gap-2">
				<Target class="h-4 w-4" />
				My Goals
			</Tabs.Trigger>
			<RoleGuard permissions={['manager:*', 'hr:*', 'admin:*']}>
				<Tabs.Trigger value="team" class="flex items-center gap-2">
					<Users class="h-4 w-4" />
					Team Performance
				</Tabs.Trigger>
			</RoleGuard>
		</Tabs.List>

		<!-- Overview Tab -->
		<Tabs.Content value="overview" class="space-y-6">
			<!-- Performance Summary Cards -->
			<div class="grid grid-cols-1 gap-4 md:grid-cols-3">
				<Card.Root>
					<Card.Content class="p-6">
						<div class="flex items-center space-x-2">
							<Target class="h-5 w-5 text-blue-600" />
							<div>
								<p class="text-sm font-medium text-muted-foreground">Active Goals</p>
								<p class="text-2xl font-bold">
									{Array.isArray(myGoals) ? myGoals.filter((g) => g.status !== 'COMPLETED').length : 0}
								</p>
							</div>
						</div>
					</Card.Content>
				</Card.Root>

				<Card.Root>
					<Card.Content class="p-6">
						<div class="flex items-center space-x-2">
							<Award class="h-5 w-5 text-green-600" />
							<div>
								<p class="text-sm font-medium text-muted-foreground">Completed Goals</p>
								<p class="text-2xl font-bold">
									{Array.isArray(myGoals) ? myGoals.filter((g) => g.status === 'COMPLETED').length : 0}
								</p>
							</div>
						</div>
					</Card.Content>
				</Card.Root>

				<Card.Root>
					<Card.Content class="p-6">
						<div class="flex items-center space-x-2">
							<Calendar class="h-5 w-5 text-purple-600" />
							<div>
								<p class="text-sm font-medium text-muted-foreground">Active Cycles</p>
								<p class="text-2xl font-bold">{activeCycles.length}</p>
							</div>
						</div>
					</Card.Content>
				</Card.Root>
			</div>

			<!-- Active Performance Cycles -->
			<Card.Root>
				<Card.Header>
					<Card.Title class="flex items-center gap-2">
						<Calendar class="h-5 w-5" />
						Active Performance Cycles
					</Card.Title>
				</Card.Header>
				<Card.Content>
					{#if cyclesQueryState.fetching}
						<div class="flex items-center justify-center py-8">
							<div class="flex items-center space-x-2">
								<RefreshCw class="h-4 w-4 animate-spin" />
								<p>Loading cycles...</p>
							</div>
						</div>
					{:else if activeCycles.length === 0}
						<div class="py-8 text-center">
							<Calendar class="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
							<h3 class="mb-2 text-lg font-semibold">No active cycles</h3>
							<p class="text-muted-foreground">
								Performance cycles will appear here when they are created.
							</p>
						</div>
					{:else}
						<div class="space-y-4">
							{#each activeCycles as cycle (cycle.id)}
								<div class="rounded-lg border p-4">
									<div class="flex items-center justify-between">
										<div>
											<h4 class="font-semibold">{cycle.name}</h4>
											<p class="text-sm text-muted-foreground">{cycle.description}</p>
											<div class="mt-1 text-sm text-muted-foreground">
												{formatDate(cycle.startDate)} - {formatDate(cycle.endDate)}
											</div>
										</div>
										<Badge variant={getStatusVariant(cycle.status)}>
											{cycle.status.replace('_', ' ')}
										</Badge>
									</div>
								</div>
							{/each}
						</div>
					{/if}
				</Card.Content>
			</Card.Root>

			<!-- Recent Performance Activity -->
			{#if myPerformanceData}
				<Card.Root>
					<Card.Header>
						<Card.Title class="flex items-center gap-2">
							<TrendingUp class="h-5 w-5" />
							Performance Summary
						</Card.Title>
					</Card.Header>
					<Card.Content>
						<div class="space-y-4">
							<div class="flex items-center justify-between">
								<span class="text-sm font-medium">Overall Performance Rating</span>
								<Badge variant="default">{myPerformanceData.overallRating || 'Not Rated'}</Badge>
							</div>
							<div class="flex items-center justify-between">
								<span class="text-sm font-medium">Goals Completion Rate</span>
								<span class="text-sm font-bold text-green-600">
									{Math.round(
										Array.isArray(myGoals) ? (myGoals.filter((g) => g.status === 'COMPLETED').length /
											Math.max(myGoals.length, 1)) *
											100 : 0
									)}%
								</span>
							</div>
							<div class="flex items-center justify-between">
								<span class="text-sm font-medium">Next Review Date</span>
								<span class="text-sm"
									>{myPerformanceData.nextReviewDate
										? formatDate(myPerformanceData.nextReviewDate)
										: 'Not scheduled'}</span
								>
							</div>
						</div>
					</Card.Content>
				</Card.Root>
			{/if}
		</Tabs.Content>

		<!-- Goals Tab -->
		<Tabs.Content value="goals" class="space-y-4">
			<!-- Search -->
			<Card.Root>
				<Card.Content class="p-6">
					<div class="relative">
						<Search class="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
						<Input placeholder="Search goals..." bind:value={searchTerm} class="pl-10" />
					</div>
				</Card.Content>
			</Card.Root>

			<!-- Goals List -->
			{#if goalsQueryState.fetching}
				<div class="flex items-center justify-center py-12">
					<div class="flex items-center space-x-2">
						<RefreshCw class="h-4 w-4 animate-spin" />
						<p>Loading goals...</p>
					</div>
				</div>
			{:else if filteredGoals.length === 0}
				<Card.Root>
					<Card.Content class="py-12">
						<div class="space-y-4 text-center">
							<Target class="mx-auto h-12 w-12 text-muted-foreground" />
							<h3 class="text-lg font-semibold">No goals found</h3>
							<p class="text-muted-foreground">
								{#if searchTerm}
									Try adjusting your search terms.
								{:else}
									Set your first performance goal to get started.
								{/if}
							</p>
							<Button href="/dashboard/users/{userId}/performance/goals/new">
								<Plus class="mr-2 h-4 w-4" />
								Set Goal
							</Button>
						</div>
					</Card.Content>
				</Card.Root>
			{:else}
				<div class="space-y-4">
					{#each filteredGoals as goal (goal.id)}
						<Card.Root>
							<Card.Content class="p-6">
								<div class="space-y-4">
									<div class="flex items-start justify-between">
										<div class="space-y-1">
											<h4 class="font-semibold">{goal.title}</h4>
											<p class="text-sm text-muted-foreground">{goal.description}</p>
										</div>
										<Badge variant={getStatusVariant(goal.status)}>
											{goal.status.replace('_', ' ')}
										</Badge>
									</div>

									<div class="space-y-2">
										<div class="flex items-center justify-between text-sm">
											<span>Progress</span>
											<span>{calculateGoalProgress(goal)}%</span>
										</div>
										<Progress value={calculateGoalProgress(goal)} />
									</div>

									<div class="flex items-center justify-between text-sm text-muted-foreground">
										<span>Due: {goal.targetCompletionDate ? formatDate(goal.targetCompletionDate) : 'No due date'}</span>
										{#if goal.weight}
											<span>Weight: {goal.weight}%</span>
										{/if}
									</div>

									<div class="flex items-center justify-between">
										<div class="text-sm text-muted-foreground">
											Created: {formatDate(goal.createdAt)}
										</div>
										<div class="flex items-center space-x-2">
											<Button variant="outline" size="sm">Edit</Button>
											{#if goal.status !== 'COMPLETED'}
												<Button size="sm">
													<CheckCircle class="mr-1 h-4 w-4" />
													Mark Complete
												</Button>
											{/if}
										</div>
									</div>
								</div>
							</Card.Content>
						</Card.Root>
					{/each}
				</div>
			{/if}
		</Tabs.Content>

		<!-- Team Performance Tab -->
		<Tabs.Content value="team" class="space-y-4">
			<RoleGuard permissions={['manager:*', 'hr:*', 'admin:*']}>
				{#if teamQueryState.fetching}
					<div class="flex items-center justify-center py-12">
						<div class="flex items-center space-x-2">
							<RefreshCw class="h-4 w-4 animate-spin" />
							<p>Loading team performance...</p>
						</div>
					</div>
				{:else if teamPerformanceData.length === 0}
					<Card.Root>
						<Card.Content class="py-12">
							<div class="space-y-4 text-center">
								<Users class="mx-auto h-12 w-12 text-muted-foreground" />
								<h3 class="text-lg font-semibold">No team data</h3>
								<p class="text-muted-foreground">Team performance data will appear here.</p>
							</div>
						</Card.Content>
					</Card.Root>
				{:else}
					<Card.Root>
						<Table.Root>
							<Table.Header>
								<Table.Row>
									<Table.Head>Employee</Table.Head>
									<Table.Head>Goals Progress</Table.Head>
									<Table.Head>Last Review</Table.Head>
									<Table.Head>Overall Rating</Table.Head>
									<Table.Head>Next Review</Table.Head>
									<Table.Head class="w-24">Actions</Table.Head>
								</Table.Row>
							</Table.Header>
							<Table.Body>
								{#each teamPerformanceData as member (member.employeeId)}
									<Table.Row>
										<Table.Cell>
											<div class="font-medium">{member.employeeName}</div>
											<div class="text-sm text-muted-foreground">{member.department}</div>
										</Table.Cell>
										<Table.Cell>
											<div class="space-y-1">
												<div class="flex items-center justify-between text-sm">
													<span>{member.completedGoals}/{member.totalGoals} goals</span>
													<span
														>{Math.round(
															(member.completedGoals / Math.max(member.totalGoals, 1)) * 100
														)}%</span
													>
												</div>
												<Progress
													value={(member.completedGoals / Math.max(member.totalGoals, 1)) * 100}
												/>
											</div>
										</Table.Cell>
										<Table.Cell>
											<span class="text-sm"
												>{member.lastReviewDate ? formatDate(member.lastReviewDate) : 'Never'}</span
											>
										</Table.Cell>
										<Table.Cell>
											<Badge variant="default">{member.overallRating || 'Not Rated'}</Badge>
										</Table.Cell>
										<Table.Cell>
											<span class="text-sm"
												>{member.nextReviewDate
													? formatDate(member.nextReviewDate)
													: 'Not scheduled'}</span
											>
										</Table.Cell>
										<Table.Cell>
											<div class="flex items-center space-x-1">
												<Button variant="ghost" size="sm">Review</Button>
											</div>
										</Table.Cell>
									</Table.Row>
								{/each}
							</Table.Body>
						</Table.Root>
					</Card.Root>
				{/if}
			</RoleGuard>
		</Tabs.Content>
	</Tabs.Root>
</div>
