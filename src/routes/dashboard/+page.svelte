<script lang="ts">
	// Server-loaded data imports
	import type {
		ActivityItem,
		DashboardMetric,
		UpcomingEvent
	} from '$lib/graphql/dashboard-operations';
	import * as Card from '$lib/components/ui/card';
	import { Badge } from '$lib/components/ui/badge';
	import { Button } from '$lib/components/ui/button';
	import * as DropdownMenu from '$lib/components/ui/dropdown-menu';
	import { Separator } from '$lib/components/ui/separator';
	import {
		AlertTriangle,
		Award,
		Calendar,
		CheckCircle,
		ChevronRight,
		Clock,
		FileText,
		MapPin,
		Settings,
		Target,
		TrendingUp,
		User,
		UserCheck
	} from '@lucide/svelte';
	// Feature 020: Audit logging widgets
	import RecentAuditActivity from '$lib/components/activities/RecentAuditActivity.svelte';
	import RollbackRequestsWidget from '$lib/components/activities/RollbackRequestsWidget.svelte';
	import QuickAddTask from '$lib/components/tasks/QuickAddTask.svelte';
	import TaskCard from '$lib/components/tasks/TaskCard.svelte';
	import { invalidateAll } from '$app/navigation';
	import { goto } from '$app/navigation';
	import * as Chart from '$lib/components/ui/chart';
	import { ArcChart } from 'layerchart';
	// Event details dialog
	import EventDetailsDialog from '$lib/components/events/EventDetailsDialog.svelte';
	import { createUrqlClient } from '$lib/graphql/client';
	import { browser } from '$app/environment';
	import { toast } from 'svelte-sonner';
	import type {
		EventComment,
		EventHistoryEntry,
		UserWaitlistStatus
	} from '$lib/graphql/events-operations';
	import {
		CREATE_EVENT_COMMENT,
		DELETE_EVENT_COMMENT,
		GET_EVENT_COMMENTS,
		GET_EVENT_HISTORY,
		GET_USER_WAITLIST_STATUS,
		JOIN_EVENT_WAITLIST,
		LEAVE_EVENT_WAITLIST,
		UPDATE_EVENT_COMMENT
	} from '$lib/graphql/events-operations';
	import { sanitizeCommentContent } from '$lib/utils/sanitize';
	import {
		CHANGE_TASK_STATUS,
		getTaskPriorityColor,
		getTaskStatusColor
	} from '$lib/graphql/tasks-operations';
	import { formatDistance } from 'date-fns';

	// Props from server-side load function
	interface Props {
		data: {
			user: any;
			userSession: any;
			dashboardDataPromise: Promise<any>; // Streaming promise for dashboard data
			permissions: string[];
			isAdmin?: boolean;
			isSuperAdmin?: boolean;
			assignees?: any[];
			taskTypes?: any[];
			loadedAt: string;
			weather?: string;
		};
	}

	const { data }: Props = $props();

	// Extract server-loaded data
	const user = $derived(data.user);

	// Create client-side urqlClient for fetching event details
	let urqlClient: any = null;
	if (browser) {
		const token = document.cookie
			.split('; ')
			.find((row) => row.startsWith('hr_token='))
			?.split('=')[1];

		if (token) {
			localStorage.setItem('postgraphile-jwt-token', token);
		}

		urqlClient = createUrqlClient();
	}

	// Event details dialog state
	let showDetailsDialog = $state(false);
	let selectedEvent = $state<any>(null);
	let selectedEventRsvpStats = $state<any>(null);

	// Local tasks state for optimistic updates
	let localTasks = $state<any[]>([]);
	let totalCompletedTasks = $state(0);
	let totalTasksCount = $state(0);

	// Local events state for optimistic updates
	let localEvents = $state<any[]>([]);

	// Effect to update local state from dashboard data (reactive to data changes)
	$effect(() => {
		data.dashboardDataPromise.then((resolvedData) => {
			// Always update tasks when data changes (not just when empty)
			const tasks = resolvedData.dashboardData.tasks || [];
			localTasks = [...tasks].sort((a, b) => {
				const priorityA = priorityOrder[a.priority as keyof typeof priorityOrder] ?? 4;
				const priorityB = priorityOrder[b.priority as keyof typeof priorityOrder] ?? 4;
				const priorityDiff = priorityA - priorityB;
				if (priorityDiff !== 0) return priorityDiff;

				if (a.dueDate && b.dueDate) {
					return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
				}
				if (a.dueDate) return -1;
				if (b.dueDate) return 1;

				return a.title.localeCompare(b.title);
			});
			totalCompletedTasks = resolvedData.dashboardData.metrics?.completedTaskCount || 0;
			totalTasksCount = resolvedData.dashboardData.metrics?.totalTaskCount || 0;

			// Always update events when data changes
			localEvents = resolvedData.dashboardData.events || [];
		});
	});

	// Derived task completion data based on total metrics
	const taskCompletion = $derived.by(() => {
		const taskCompletionPercentage =
			totalTasksCount === 0 ? 0 : Math.round((totalCompletedTasks / totalTasksCount) * 100);

		const taskChartData = [
			{
				status: 'completed',
				count: totalCompletedTasks,
				color: 'var(--color-completed)'
			},
			{
				status: 'incomplete',
				count: totalTasksCount - totalCompletedTasks,
				color: 'var(--color-incomplete)'
			}
		];

		return {
			completedTaskCount: totalCompletedTasks,
			totalTaskCount: totalTasksCount,
			taskCompletionPercentage,
			taskChartData
		};
	});

	// Event comments, history, waitlist state
	let eventComments = $state<EventComment[]>([]);
	let commentCount = $state(0);
	let commentOffset = $state(0);
	let hasMoreComments = $state(false);

	let eventHistory = $state<EventHistoryEntry[]>([]);
	let historyOffset = $state(0);
	let hasMoreHistory = $state(false);

	let userWaitlistStatus = $state<UserWaitlistStatus>({ isOnWaitlist: false, position: null });

	// Helper function to build employee metrics from dashboard data
	function buildEmployeeMetrics(dashboardData: any): DashboardMetric[] {
		return [
			{
				title: 'My Attendance Rate',
				value: `${dashboardData?.metrics?.attendanceRate ?? 0}%`,
				change: {
					value: (dashboardData?.metrics?.attendanceRate ?? 0) >= 95 ? '+2%' : '-1%',
					type: (dashboardData?.metrics?.attendanceRate ?? 0) >= 95 ? 'increase' : 'warning',
					period: 'this month'
				},
				icon: TrendingUp,
				href: `/dashboard/profile/attendance`
			},
			{
				title: 'Pending Requests',
				value: `${dashboardData?.metrics?.pendingRequests ?? 0}`,
				change: {
					value:
						(dashboardData?.metrics?.pendingRequests ?? 0) > 0
							? `${dashboardData?.metrics?.pendingRequests ?? 0} pending`
							: 'None pending',
					type: (dashboardData?.metrics?.pendingRequests ?? 0) > 0 ? 'warning' : 'neutral',
					period: (dashboardData?.metrics?.pendingRequests ?? 0) > 0 ? 'requests' : ''
				},
				icon: Clock,
				href: `/dashboard/users/${user.id}/leave/requests`
			},
			{
				title: 'My Tasks',
				value: `${dashboardData?.metrics?.taskCount ?? 0}`,
				change: {
					value: `${Math.floor((dashboardData?.metrics?.taskCount ?? 0) / 2)} due soon`,
					type: 'warning',
					period: 'this week'
				},
				icon: CheckCircle,
				href: `/dashboard/users/${user.id}/tasks`
			},
			{
				title: 'Days Off Remaining',
				value: `${dashboardData?.metrics?.remainingVacationDays ?? 0}`,
				change: {
					value: `${(dashboardData?.metrics?.remainingVacationDays ?? 0) + 6} total`,
					type: 'neutral',
					period: 'this year'
				},
				icon: Calendar,
				href: `/dashboard/users/${user.id}/leave/new`
			}
		];
	}

	// Helper function to build activity items
	function buildActivityItems(dashboardData: any): ActivityItem[] {
		return (dashboardData.activities || []).map((activity: any, index: number) => ({
			...activity,
			id: index + 1,
			icon:
				activity.type === 'success'
					? CheckCircle
					: activity.type === 'warning'
						? AlertTriangle
						: Target
		}));
	}

	// Helper function to get upcoming events
	function getUpcomingEvents(dashboardData: any): UpcomingEvent[] {
		return dashboardData.events || [];
	}

	// Helper function to sort tasks
	const priorityOrder = { URGENT: 0, HIGH: 1, MEDIUM: 2, LOW: 3 };
	function sortTasks(dashboardData: any): any[] {
		const tasks = dashboardData.tasks || [];
		return [...tasks].sort((a, b) => {
			// First, sort by priority (URGENT > HIGH > MEDIUM > LOW)
			const priorityA = priorityOrder[a.priority as keyof typeof priorityOrder] ?? 4;
			const priorityB = priorityOrder[b.priority as keyof typeof priorityOrder] ?? 4;
			const priorityDiff = priorityA - priorityB;
			if (priorityDiff !== 0) return priorityDiff;

			// Then by due date (ascending - soonest first)
			if (a.dueDate && b.dueDate) {
				return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
			}
			if (a.dueDate) return -1;
			if (b.dueDate) return 1;

			// Finally by title
			return a.title.localeCompare(b.title);
		});
	}

	// Helper function to calculate task completion
	function getTaskCompletionData(dashboardData: any) {
		const completedTaskCount = dashboardData.metrics?.completedTaskCount || 0;
		const totalTaskCount = dashboardData.metrics?.totalTaskCount || 0;
		const taskCompletionPercentage =
			totalTaskCount === 0 ? 0 : Math.round((completedTaskCount / totalTaskCount) * 100);

		const taskChartData = [
			{
				status: 'completed',
				count: completedTaskCount,
				color: 'var(--color-completed)'
			},
			{
				status: 'incomplete',
				count: totalTaskCount - completedTaskCount,
				color: 'var(--color-incomplete)'
			}
		];

		return { completedTaskCount, totalTaskCount, taskCompletionPercentage, taskChartData };
	}

	const taskChartConfig = {
		count: { label: 'Tasks' },
		completed: { label: 'Completed', color: 'hsl(var(--chart-2))' },
		incomplete: { label: 'Incomplete', color: 'hsl(var(--chart-5))' }
	} satisfies Chart.ChartConfig;

	// Random greeting generator
	const greetings = [
		'Welcome back',
		'Good to see you',
		'Hello',
		'Hi there',
		'Greetings',
		'Hey',
		'Good day'
	];
	const randomGreeting = greetings[Math.floor(Math.random() * greetings.length)];

	// Handle event click from dashboard widget
	async function handleEventClick(eventId: string) {
		if (!urqlClient) return;

		try {
			// Fetch full event details from GraphQL
			const result = await urqlClient
				.query(
					`
				query GetEventDetails($eventId: UUID!) {
					event(id: $eventId) {
						id
						title
						description
						eventType
						startTime
						endTime
						allDay
						location
						isPublic
						status
						color
						organizerId
						capacity
						attendees {
							id
							employeeId
							responseStatus
						}
					}
				}
			`,
					{ eventId }
				)
				.toPromise();

			if (result.error || !result.data?.event) {
				console.error('Error fetching event details:', result.error);
				toast.error('Failed to load event details');
				return;
			}

			const event = result.data.event;
			selectedEvent = event;

			// Calculate RSVP stats
			const attendees = event.attendees || [];
			selectedEventRsvpStats = {
				total: attendees.length,
				accepted: attendees.filter((a: any) => a.responseStatus === 'accepted').length,
				declined: attendees.filter((a: any) => a.responseStatus === 'declined').length,
				tentative: attendees.filter((a: any) => a.responseStatus === 'tentative').length,
				pending: attendees.filter((a: any) => a.responseStatus === 'pending').length
			};

			// Fetch comments, history, and waitlist status
			await Promise.all([
				fetchEventComments(event.id, true),
				fetchEventHistory(event.id, true),
				fetchUserWaitlistStatus(event.id)
			]);

			showDetailsDialog = true;
		} catch (err) {
			console.error('Failed to fetch event:', err);
			toast.error('Failed to load event details');
		}
	}

	// Fetch event comments
	async function fetchEventComments(eventId: string, reset: boolean = false) {
		if (!urqlClient) return;

		try {
			const offset = reset ? 0 : commentOffset;
			const result = await urqlClient
				.query(GET_EVENT_COMMENTS, { eventId, limit: 20, offset })
				.toPromise();

			if (result.error || !result.data) {
				console.error('Error fetching event comments:', result.error);
				return;
			}

			const rawComments = result.data.eventComments || [];
			const comments = rawComments.map((c: any) => ({
				id: c.id,
				content: c.commentText,
				author: {
					id: c.user?.id || c.userId,
					name: c.user?.displayName || 'Unknown User',
					avatarUrl: undefined
				},
				mentions: [],
				createdAt: c.createdAt,
				updatedAt: c.updatedAt
			}));

			if (reset) {
				eventComments = comments;
				commentOffset = comments.length;
			} else {
				eventComments = [...eventComments, ...comments];
				commentOffset += comments.length;
			}

			commentCount = rawComments.length;
			hasMoreComments = rawComments.length >= 20;
		} catch (err) {
			console.error('Failed to fetch event comments:', err);
		}
	}

	// Fetch event history
	async function fetchEventHistory(eventId: string, reset: boolean = false) {
		if (!urqlClient) return;

		try {
			const offset = reset ? 0 : historyOffset;
			const result = await urqlClient
				.query(GET_EVENT_HISTORY, { eventId, limit: 25, offset })
				.toPromise();

			if (result.error || !result.data) {
				console.error('Error fetching event history:', result.error);
				return;
			}

			const rawHistory = result.data.eventHistories || [];
			const history = rawHistory.map((h: any) => ({
				id: h.id,
				changedBy: {
					id: h.changedBy?.id || h.changedById,
					name: h.changedBy?.displayName || 'Unknown User'
				},
				changeType: h.changeType,
				fieldName: h.fieldName,
				oldValue: h.oldValues,
				newValue: h.newValues,
				changedAt: h.createdAt
			}));

			if (reset) {
				eventHistory = history;
				historyOffset = history.length;
			} else {
				eventHistory = [...eventHistory, ...history];
				historyOffset += history.length;
			}

			hasMoreHistory = rawHistory.length >= 25;
		} catch (err) {
			console.error('Failed to fetch event history:', err);
		}
	}

	// Fetch user waitlist status
	async function fetchUserWaitlistStatus(eventId: string) {
		if (!urqlClient) return;

		try {
			const result = await urqlClient
				.query(GET_USER_WAITLIST_STATUS, {
					eventId,
					userId: data.user.id
				})
				.toPromise();

			if (result.error || !result.data) {
				console.error('Error fetching waitlist status:', result.error);
				return;
			}

			const waitlists = result.data.eventWaitlists || [];
			if (waitlists.length > 0) {
				const waitlistEntry = waitlists[0];
				userWaitlistStatus = {
					isOnWaitlist: true,
					position: waitlistEntry.position || null,
					joinedAt: waitlistEntry.joinedAt
				};
			} else {
				userWaitlistStatus = { isOnWaitlist: false, position: null };
			}
		} catch (err) {
			console.error('Failed to fetch waitlist status:', err);
		}
	}

	// Handle comment mutations
	async function handleAddComment(content: string, mentions: string[]) {
		if (!selectedEvent || !urqlClient) return;

		const sanitized = sanitizeCommentContent(content);

		try {
			const result = await urqlClient
				.mutation(CREATE_EVENT_COMMENT, {
					input: {
						eventId: selectedEvent.id,
						userId: data.user.id,
						commentText: sanitized
					}
				})
				.toPromise();

			if (result.error || !result.data) {
				throw new Error(result.error?.message || 'Failed to create comment');
			}

			const newComment = result.data.createEventComment;
			eventComments = [
				{
					id: newComment.id,
					content: newComment.commentText,
					author: {
						id: newComment.user?.id || data.user.id,
						name: newComment.user?.displayName || data.user.display_name || 'Unknown User',
						avatarUrl: undefined
					},
					mentions: [],
					createdAt: newComment.createdAt,
					updatedAt: newComment.updatedAt
				},
				...eventComments
			];
			commentCount += 1;
		} catch (err: any) {
			console.error('Failed to add comment:', err);
			throw err;
		}
	}

	async function handleUpdateComment(commentId: string, content: string) {
		if (!selectedEvent || !urqlClient) return;

		const sanitized = sanitizeCommentContent(content);

		try {
			const result = await urqlClient
				.mutation(UPDATE_EVENT_COMMENT, {
					id: commentId,
					input: { commentText: sanitized }
				})
				.toPromise();

			if (result.error || !result.data) {
				throw new Error(result.error?.message || 'Failed to update comment');
			}

			const updatedComment = result.data.updateEventComment;
			eventComments = eventComments.map((comment) =>
				comment.id === commentId
					? { ...comment, content: updatedComment.commentText, updatedAt: updatedComment.updatedAt }
					: comment
			);
		} catch (err: any) {
			console.error('Failed to update comment:', err);
			throw err;
		}
	}

	async function handleDeleteComment(commentId: string) {
		if (!selectedEvent || !urqlClient) return;

		try {
			const result = await urqlClient.mutation(DELETE_EVENT_COMMENT, { id: commentId }).toPromise();

			if (result.error || !result.data) {
				throw new Error(result.error?.message || 'Failed to delete comment');
			}

			eventComments = eventComments.filter((comment) => comment.id !== commentId);
			commentCount -= 1;
		} catch (err: any) {
			console.error('Failed to delete comment:', err);
			throw err;
		}
	}

	// Handle waitlist mutations
	async function handleJoinWaitlist(eventId: string) {
		if (!urqlClient) return;

		try {
			const result = await urqlClient
				.mutation(JOIN_EVENT_WAITLIST, {
					eventId,
					employeeId: data.user.id
				})
				.toPromise();

			if (result.error || !result.data) {
				throw new Error(result.error?.message || 'Failed to join waitlist');
			}

			await fetchUserWaitlistStatus(eventId);
			toast.success('Joined waitlist successfully');
		} catch (err: any) {
			console.error('Failed to join waitlist:', err);
			throw err;
		}
	}

	async function handleLeaveWaitlist(eventId: string) {
		if (!urqlClient) return;

		try {
			const result = await urqlClient
				.mutation(LEAVE_EVENT_WAITLIST, {
					eventId,
					employeeId: data.user.id
				})
				.toPromise();

			if (result.error || !result.data) {
				throw new Error(result.error?.message || 'Failed to leave waitlist');
			}

			await fetchUserWaitlistStatus(eventId);
			toast.success('Left waitlist successfully');
		} catch (err: any) {
			console.error('Failed to leave waitlist:', err);
			throw err;
		}
	}

	// Handle pagination
	async function handleLoadMoreComments() {
		if (selectedEvent) {
			await fetchEventComments(selectedEvent.id, false);
		}
	}

	async function handleLoadMoreHistory() {
		if (selectedEvent) {
			await fetchEventHistory(selectedEvent.id, false);
		}
	}

	// Handle task click - navigate to task details
	function handleTaskClick(taskId: string) {
		goto(`/dashboard/tasks/${taskId}`);
	}

	// Handle task status change with optimistic update
	async function handleStatusChange(taskId: string, newStatus: string) {
		if (!urqlClient) return;

		// Optimistically update local state
		const taskIndex = localTasks.findIndex((t) => t.id === taskId);
		if (taskIndex === -1) return;

		const oldStatus = localTasks[taskIndex].status;

		// Update task status
		localTasks[taskIndex].status = newStatus;

		// Update total metrics
		const wasCompleted = oldStatus === 'DONE';
		const isNowCompleted = newStatus === 'DONE';

		if (!wasCompleted && isNowCompleted) {
			totalCompletedTasks++;
		} else if (wasCompleted && !isNowCompleted) {
			totalCompletedTasks--;
		}

		try {
			const result = await urqlClient
				.mutation(CHANGE_TASK_STATUS, {
					input: {
						taskId,
						status: newStatus
					}
				})
				.toPromise();

			if (result.error) {
				throw result.error;
			}

			// Show success message
			toast.success('Task status updated successfully');
		} catch (error) {
			console.error('Failed to change task status:', error);
			// Revert optimistic updates on error
			localTasks[taskIndex].status = oldStatus;
			if (!wasCompleted && isNowCompleted) {
				totalCompletedTasks--;
			} else if (wasCompleted && !isNowCompleted) {
				totalCompletedTasks++;
			}
			toast.error('Failed to update task status');
		}
	}

	// Handler for optimistic RSVP updates
	function handleRsvpUpdate(eventId: string, newRsvpStatus: string) {
		const eventIndex = localEvents.findIndex((e) => e.id === eventId);
		if (eventIndex !== -1) {
			// Update local event state optimistically
			localEvents[eventIndex].rsvpStatus = newRsvpStatus;
		}

		// Also update selected event if it's currently open
		if (selectedEvent?.id === eventId) {
			selectedEvent = { ...selectedEvent, rsvpStatus: newRsvpStatus };
		}
	}
</script>

<svelte:head>
	<title>Dashboard - MountainHR</title>
	<meta name="description" content="HR management dashboard overview" />
</svelte:head>

<!-- Page Header -->
<div class="space-y-6">
	<div class="flex items-center justify-between">
		<h1 class="text-3xl font-bold tracking-tight">
			{randomGreeting}, {user?.firstName || user?.displayName || user?.email || 'User'}!
		</h1>
		{#await data.weatherPromise}
			<!-- Loading weather -->
		{:then weather}
			{#if weather}
				<div class="flex items-center gap-2 text-sm text-muted-foreground">
					<span class="whitespace-pre">{weather}</span>
				</div>
			{/if}
		{:catch}
			<!-- Weather fetch failed, silently ignore -->
		{/await}
	</div>

	<!-- Personal Metrics Cards -->
	<div class="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
		{#await data.dashboardDataPromise}
			<!-- Loading skeleton for metrics -->
			{#each Array(4) as _, index}
				<Card.Root class="animate-pulse">
					<Card.Header class="flex flex-row items-center justify-between space-y-0 pb-2">
						<div class="h-4 w-24 rounded bg-muted"></div>
						<div class="h-4 w-4 rounded bg-muted"></div>
					</Card.Header>
					<Card.Content>
						<div class="h-8 w-16 rounded bg-muted"></div>
						<div class="mt-2 h-4 w-32 rounded bg-muted"></div>
					</Card.Content>
				</Card.Root>
			{/each}
		{:then resolvedData}
			{@const employeeMetrics = buildEmployeeMetrics(resolvedData.dashboardData)}
			{#each employeeMetrics as metric, index}
				<Card.Root
					class="cursor-pointer transition-shadow hover:shadow-md"
					data-testid={index === 0
						? 'dashboard-attendance-metric'
						: index === 1
							? 'dashboard-leave-requests-metric'
							: index === 2
								? 'dashboard-tasks-metric'
								: 'dashboard-days-off-metric'}
				>
					<Card.Header class="flex flex-row items-center justify-between space-y-0 pb-2">
						<Card.Title class="text-sm font-medium">{metric.title}</Card.Title>
						{@const IconComponent = metric.icon}
						<IconComponent class="h-4 w-4 text-muted-foreground" />
					</Card.Header>
					<Card.Content>
						<div class="text-2xl font-bold">{metric.value}</div>
						<div class="flex items-center text-xs text-muted-foreground">
							{#if metric.change.type === 'increase'}
								<Badge variant="secondary" class="bg-green-50 text-green-600">
									{metric.change.value}
								</Badge>
							{:else if metric.change.type === 'warning'}
								<Badge variant="outline" class="border-orange-200 text-orange-600">
									{metric.change.value}
								</Badge>
							{:else}
								<Badge variant="secondary" class="text-gray-600">
									{metric.change.value}
								</Badge>
							{/if}
							{#if metric.change.period}
								<span class="ml-1">{metric.change.period}</span>
							{/if}
						</div>
					</Card.Content>
				</Card.Root>
			{/each}
		{:catch error}
			<!-- Error state for metrics -->
			<Card.Root class="col-span-4">
				<Card.Content class="p-6 text-center text-muted-foreground">
					<p>Failed to load metrics. Please refresh the page.</p>
				</Card.Content>
			</Card.Root>
		{/await}
	</div>

	<!-- Personal Activity and Tasks -->
	<div class="grid grid-cols-1 gap-6 lg:grid-cols-3">
		<!-- My Recent Activity -->
		<Card.Root data-testid="dashboard-recent-activity">
			<Card.Header>
				<div class="flex items-center justify-between">
					<Card.Title>My Recent Activity</Card.Title>
					<Button variant="ghost" size="sm">View All</Button>
				</div>
				<Card.Description>Your personal updates and notifications</Card.Description>
			</Card.Header>
			<Card.Content>
				{#await data.dashboardDataPromise}
					<!-- Loading skeleton -->
					<div class="space-y-4">
						{#each Array(3) as _}
							<div class="flex animate-pulse items-start space-x-3">
								<div class="h-6 w-6 rounded-full bg-muted"></div>
								<div class="flex-1 space-y-2">
									<div class="h-4 w-3/4 rounded bg-muted"></div>
									<div class="h-3 w-1/2 rounded bg-muted"></div>
								</div>
							</div>
						{/each}
					</div>
				{:then resolvedData}
					{@const myActivity = buildActivityItems(resolvedData.dashboardData)}
					<div class="space-y-4">
						{#each myActivity as activity, index}
							{@const ActivityIcon = activity.icon}
							<div class="flex items-start space-x-3">
								<div
									class="flex h-6 w-6 items-center justify-center rounded-full {activity.type ===
									'success'
										? 'bg-green-100'
										: activity.type === 'warning'
											? 'bg-orange-100'
											: 'bg-blue-100'}"
								>
									<ActivityIcon
										class="h-3 w-3 {activity.type === 'success'
											? 'text-green-600'
											: activity.type === 'warning'
												? 'text-orange-600'
												: 'text-blue-600'}"
									/>
								</div>
								<div class="flex-1 space-y-1">
									<p class="text-sm font-medium">{activity.message}</p>
									<p class="text-xs text-muted-foreground">{activity.timestamp}</p>
								</div>
							</div>
						{/each}
					</div>
				{:catch}
					<div class="p-4 text-center text-muted-foreground">
						<p>Failed to load activity</p>
					</div>
				{/await}
			</Card.Content>
		</Card.Root>

		<!-- My Tasks -->
		<Card.Root>
			<Card.Header>
				<div class="flex items-center justify-between">
					<Card.Title>My Tasks</Card.Title>
					<QuickAddTask
						currentUser={{
							id: user.id,
							displayName: user.displayName || user.firstName || user.email || 'User',
							role: user.role || 'employee'
						}}
						assignees={data.assignees || []}
						taskTypes={data.taskTypes || []}
						canAssign={false}
						formAction="/dashboard/tasks"
						onSuccess={async () => {
							// Refresh the dashboard data including tasks
							await invalidateAll();
						}}
					/>
				</div>
				<Card.Description>Pending items requiring your attention</Card.Description>
			</Card.Header>
			<Card.Content>
				{#await data.dashboardDataPromise}
					<!-- Loading skeleton -->
					<div class="space-y-3">
						{#each Array(3) as _}
							<div class="flex animate-pulse items-start space-x-3 rounded-lg p-2">
								<div class="h-5 w-5 rounded-full bg-muted"></div>
								<div class="flex-1 space-y-2">
									<div class="h-4 w-3/4 rounded bg-muted"></div>
									<div class="h-3 w-1/2 rounded bg-muted"></div>
								</div>
							</div>
						{/each}
					</div>
				{:then resolvedData}
					{#if localTasks.length > 0}
						<div class="space-y-3">
							{#each localTasks as task}
								<div
									class="task-card group relative cursor-pointer rounded-lg border border-border bg-card p-4 shadow-sm transition-all hover:border-primary hover:shadow-md"
									onclick={() => handleTaskClick(task.id)}
									role="button"
									tabindex="0"
									onkeydown={(e) => {
										if (e.key === 'Enter' || e.key === ' ') {
											e.preventDefault();
											handleTaskClick(task.id);
										}
									}}
								>
									<!-- Task Title and Status Dropdown Row -->
									<div class="flex items-center gap-3">
										<!-- Status Dropdown (from TaskCard) -->
										<DropdownMenu.Root>
											<DropdownMenu.Trigger
												class="mt-0.5 flex-shrink-0 transition-transform hover:scale-110 focus:outline-none"
												onclick={(e) => e.stopPropagation()}
												aria-label="Change task status"
											>
												{#if task.status === 'DONE'}
													<svg
														class="h-5 w-5 text-green-600 dark:text-green-400"
														fill="currentColor"
														viewBox="0 0 20 20"
													>
														<path
															fill-rule="evenodd"
															d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
															clip-rule="evenodd"
														/>
													</svg>
												{:else if task.status === 'IN_PROGRESS'}
													<svg class="h-5 w-5 text-primary" fill="currentColor" viewBox="0 0 20 20">
														<path
															fill-rule="evenodd"
															d="M10 18a8 8 0 100-16 8 8 0 000 16zm0-2a6 6 0 100-12 6 6 0 000 12z"
															clip-rule="evenodd"
														/>
														<circle cx="10" cy="10" r="3" fill="currentColor" />
													</svg>
												{:else if task.status === 'REVIEW'}
													<svg
														class="h-5 w-5 text-yellow-600 dark:text-yellow-400"
														fill="currentColor"
														viewBox="0 0 20 20"
													>
														<path d="M10 12a2 2 0 100-4 2 2 0 000 4z" />
														<path
															fill-rule="evenodd"
															d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z"
															clip-rule="evenodd"
														/>
													</svg>
												{:else if task.status === 'BLOCKED'}
													<svg
														class="h-5 w-5 text-red-600 dark:text-red-400"
														fill="currentColor"
														viewBox="0 0 20 20"
													>
														<path
															fill-rule="evenodd"
															d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
															clip-rule="evenodd"
														/>
													</svg>
												{:else}
													<svg
														class="h-5 w-5 text-muted-foreground hover:text-foreground"
														fill="none"
														stroke="currentColor"
														viewBox="0 0 20 20"
													>
														<circle cx="10" cy="10" r="8" stroke-width="2" />
													</svg>
												{/if}
											</DropdownMenu.Trigger>
											<DropdownMenu.Content align="start" class="w-48">
												<DropdownMenu.Label>Change Status</DropdownMenu.Label>
												<DropdownMenu.Separator />
												<DropdownMenu.Item
													onclick={(e) => {
														e.stopPropagation();
														handleStatusChange(task.id, 'TODO');
													}}
													disabled={task.status === 'TODO'}
												>
													<svg
														class="mr-2 h-4 w-4 text-muted-foreground"
														fill="none"
														stroke="currentColor"
														viewBox="0 0 20 20"
													>
														<circle cx="10" cy="10" r="8" stroke-width="2" />
													</svg>
													To Do
												</DropdownMenu.Item>
												<DropdownMenu.Item
													onclick={(e) => {
														e.stopPropagation();
														handleStatusChange(task.id, 'IN_PROGRESS');
													}}
													disabled={task.status === 'IN_PROGRESS'}
												>
													<svg
														class="mr-2 h-4 w-4 text-primary"
														fill="currentColor"
														viewBox="0 0 20 20"
													>
														<path
															fill-rule="evenodd"
															d="M10 18a8 8 0 100-16 8 8 0 000 16zm0-2a6 6 0 100-12 6 6 0 000 12z"
															clip-rule="evenodd"
														/>
														<circle cx="10" cy="10" r="3" fill="currentColor" />
													</svg>
													In Progress
												</DropdownMenu.Item>
												<DropdownMenu.Item
													onclick={(e) => {
														e.stopPropagation();
														handleStatusChange(task.id, 'REVIEW');
													}}
													disabled={task.status === 'REVIEW'}
												>
													<svg
														class="mr-2 h-4 w-4 text-yellow-600 dark:text-yellow-400"
														fill="currentColor"
														viewBox="0 0 20 20"
													>
														<path d="M10 12a2 2 0 100-4 2 2 0 000 4z" />
														<path
															fill-rule="evenodd"
															d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z"
															clip-rule="evenodd"
														/>
													</svg>
													Review
												</DropdownMenu.Item>
												<DropdownMenu.Item
													onclick={(e) => {
														e.stopPropagation();
														handleStatusChange(task.id, 'BLOCKED');
													}}
													disabled={task.status === 'BLOCKED'}
												>
													<svg
														class="mr-2 h-4 w-4 text-red-600 dark:text-red-400"
														fill="currentColor"
														viewBox="0 0 20 20"
													>
														<path
															fill-rule="evenodd"
															d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
															clip-rule="evenodd"
														/>
													</svg>
													Blocked
												</DropdownMenu.Item>
												<DropdownMenu.Item
													onclick={(e) => {
														e.stopPropagation();
														handleStatusChange(task.id, 'DONE');
													}}
													disabled={task.status === 'DONE'}
												>
													<svg
														class="mr-2 h-4 w-4 text-green-600 dark:text-green-400"
														fill="currentColor"
														viewBox="0 0 20 20"
													>
														<path
															fill-rule="evenodd"
															d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
															clip-rule="evenodd"
														/>
													</svg>
													Done
												</DropdownMenu.Item>
											</DropdownMenu.Content>
										</DropdownMenu.Root>

										<!-- Task Title -->
										<h3
											class="flex-1 text-base font-semibold text-foreground group-hover:text-primary"
										>
											{task.title}
										</h3>
									</div>

									<!-- Badges and Due Date inline -->
									<div class="mt-2 ml-8 flex flex-wrap items-center gap-2 text-xs">
										<!-- Status Badge -->
										<span
											class="inline-flex items-center rounded-full px-2 py-0.5 {getTaskStatusColor(
												task.status
											)}"
										>
											{task.status}
										</span>
										<!-- Priority Badge -->
										<span
											class="inline-flex items-center rounded-full px-2 py-0.5 {getTaskPriorityColor(
												task.priority
											)}"
										>
											{task.priority}
										</span>
										<!-- Task Type Badge -->
										{#if task.taskType}
											<span
												class="inline-flex items-center rounded-full bg-muted px-2 py-0.5 text-muted-foreground"
											>
												{task.taskType.name}
											</span>
										{/if}
										<!-- Due Date inline with badges -->
										{#if task.dueDate}
											<span class="text-muted-foreground">
												• Due {formatDistance(new Date(), new Date(task.dueDate))}
											</span>
										{/if}
									</div>
								</div>
							{/each}
						</div>
					{:else}
						<div class="flex flex-col items-center justify-center py-8 text-center">
							<CheckCircle class="mb-2 h-12 w-12 text-muted-foreground opacity-50" />
							<p class="text-sm font-medium">All caught up!</p>
							<p class="text-xs text-muted-foreground">No pending tasks</p>
						</div>
					{/if}
					{#if taskCompletion.totalTaskCount > 0}
						<div class="mt-4 border-t pt-4">
							<div class="flex w-full items-center justify-between">
								<div class="flex flex-col gap-1">
									<div class="text-sm font-medium">Task Completion</div>
									<div class="text-xs text-muted-foreground">
										{taskCompletion.completedTaskCount} of {taskCompletion.totalTaskCount} tasks completed
									</div>
								</div>
								<div class="relative h-20 w-20">
									<Chart.Container config={taskChartConfig} class="aspect-square h-full">
										<ArcChart
											label="status"
											value="count"
											outerRadius={-5}
											innerRadius={-2.5}
											padding={0}
											range={[90, -270]}
											maxValue={taskCompletion.totalTaskCount}
											series={taskCompletion.taskChartData.map((d) => ({
												key: d.status,
												color: d.color,
												data: [d]
											}))}
											props={{
												arc: { track: { fill: 'var(--muted)' }, motion: 'tween' },
												tooltip: { context: { hideDelay: 350 } }
											}}
										>
											{#snippet tooltip()}
												<Chart.Tooltip hideLabel nameKey="status" />
											{/snippet}
										</ArcChart>
									</Chart.Container>
									<div class="absolute inset-0 flex items-center justify-center text-lg font-bold">
										{taskCompletion.taskCompletionPercentage}%
									</div>
								</div>
							</div>
						</div>
					{/if}
				{:catch}
					<div class="p-4 text-center text-muted-foreground">
						<p>Failed to load tasks</p>
					</div>
				{/await}
			</Card.Content>
		</Card.Root>

		<!-- Upcoming Events -->
		<Card.Root data-testid="dashboard-upcoming-events">
			<Card.Header>
				<div class="flex items-center justify-between">
					<Card.Title>Upcoming Events</Card.Title>
					<Button variant="ghost" size="sm" href="/dashboard/events">View Events</Button>
				</div>
				<Card.Description>Your scheduled meetings and events</Card.Description>
			</Card.Header>
			<Card.Content>
				{#await data.dashboardDataPromise}
					<!-- Loading skeleton -->
					<div class="space-y-4">
						{#each Array(3) as _}
							<div class="flex animate-pulse items-center space-x-3">
								<div class="h-8 w-8 rounded-full bg-muted"></div>
								<div class="flex-1 space-y-2">
									<div class="h-4 w-3/4 rounded bg-muted"></div>
									<div class="h-3 w-1/2 rounded bg-muted"></div>
								</div>
							</div>
						{/each}
					</div>
				{:then resolvedData}
					{#if localEvents.length === 0}
						<div class="flex flex-col items-center justify-center py-8 text-center">
							<Calendar class="mb-2 h-12 w-12 text-muted-foreground" />
							<p class="text-sm text-muted-foreground">No upcoming events in the next month</p>
						</div>
					{:else}
						<div class="space-y-4">
							{#each localEvents as event, index}
								<button
									type="button"
									onclick={() => handleEventClick(event.id)}
									class="flex w-full items-start space-x-3 rounded-lg p-2 text-left transition-colors hover:bg-accent"
								>
									<div
										class="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full {event.type ===
										'meeting'
											? 'bg-blue-100'
											: event.type === 'review'
												? 'bg-orange-100'
												: event.type === 'training'
													? 'bg-purple-100'
													: 'bg-green-100'}"
									>
										{#if event.type === 'meeting'}
											<User class="h-4 w-4 text-blue-600" />
										{:else if event.type === 'review'}
											<Target class="h-4 w-4 text-orange-600" />
										{:else}
											<Award class="h-4 w-4 text-green-600" />
										{/if}
									</div>
									<div class="min-w-0 flex-1">
										<p class="truncate text-sm font-medium">{event.title}</p>
										<div class="mt-1 flex flex-wrap items-center gap-2">
											<p class="text-xs text-muted-foreground">{event.date}</p>
											<span class="text-xs text-muted-foreground">•</span>
											<p class="text-xs text-muted-foreground">{event.time}</p>
											<span class="text-xs text-muted-foreground">•</span>
											<Badge variant="outline" class="text-xs">
												{event.type.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())}
											</Badge>
											{#if event.rsvpStatus && event.rsvpStatus !== 'no_response'}
												<Badge
													class="text-xs {event.rsvpStatus === 'accepted'
														? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
														: event.rsvpStatus === 'declined'
															? 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
															: event.rsvpStatus === 'tentative'
																? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400'
																: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400'}"
												>
													{event.rsvpStatus === 'accepted'
														? '✓ Going'
														: event.rsvpStatus === 'declined'
															? '✗ Not Going'
															: event.rsvpStatus === 'tentative'
																? '? Maybe'
																: 'Pending'}
												</Badge>
											{/if}
										</div>
									</div>
								</button>
							{/each}
						</div>
					{/if}
				{:catch}
					<div class="p-4 text-center text-muted-foreground">
						<p>Failed to load events</p>
					</div>
				{/await}
			</Card.Content>
		</Card.Root>
	</div>

	<!-- Admin-Only Audit Logging Widgets (Feature 020) -->
	{#if data.isAdmin}
		{#await data.dashboardDataPromise}
			<!-- Loading skeleton for admin widgets -->
			<div class="grid grid-cols-1 gap-6 lg:grid-cols-2">
				{#each Array(2) as _}
					<Card.Root class="animate-pulse">
						<Card.Header>
							<div class="h-6 w-48 rounded bg-muted"></div>
						</Card.Header>
						<Card.Content>
							<div class="space-y-3">
								{#each Array(3) as _}
									<div class="h-16 rounded bg-muted"></div>
								{/each}
							</div>
						</Card.Content>
					</Card.Root>
				{/each}
			</div>
		{:then resolvedData}
			{#if resolvedData.systemAuditLogs}
				<div
					class="grid grid-cols-1 gap-6 {data.isSuperAdmin && resolvedData.rollbackRequests
						? 'lg:grid-cols-2'
						: ''}"
				>
					<!-- Recent Audit Activity Widget -->
					<RecentAuditActivity
						logs={resolvedData.systemAuditLogs}
						maxItems={5}
						showRollbackIndicators={true}
					/>

					<!-- Rollback Requests Widget (super_admin only) -->
					{#if data.isSuperAdmin && resolvedData.rollbackRequests && resolvedData.rollbackStats}
						<RollbackRequestsWidget
							requests={resolvedData.rollbackRequests}
							statistics={resolvedData.rollbackStats}
							maxItems={3}
						/>
					{/if}
				</div>
			{/if}
		{:catch}
			<Card.Root>
				<Card.Content class="p-6 text-center text-muted-foreground">
					<p>Failed to load admin widgets</p>
				</Card.Content>
			</Card.Root>
		{/await}
	{/if}
</div>

<!-- Event Details Dialog -->
{#if showDetailsDialog && selectedEvent}
	<EventDetailsDialog
		isOpen={showDetailsDialog}
		mode="view"
		event={selectedEvent}
		userId={data.user.id}
		userRole={data.user.role}
		rsvpStats={selectedEventRsvpStats}
		comments={eventComments}
		history={eventHistory}
		waitlistStatus={userWaitlistStatus}
		onClose={() => (showDetailsDialog = false)}
		onAddComment={handleAddComment}
		onUpdateComment={handleUpdateComment}
		onDeleteComment={handleDeleteComment}
		onJoinWaitlist={handleJoinWaitlist}
		onLeaveWaitlist={handleLeaveWaitlist}
		onLoadMoreComments={handleLoadMoreComments}
		onLoadMoreHistory={handleLoadMoreHistory}
		onRsvpUpdate={handleRsvpUpdate}
		{hasMoreComments}
		{hasMoreHistory}
	/>
{/if}
