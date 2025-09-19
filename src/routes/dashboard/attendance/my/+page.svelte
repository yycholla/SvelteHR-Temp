<script lang="ts">
	import { onMount } from 'svelte';
	import { queryStore, mutationStore } from '@urql/svelte';
	import { createUrqlClient } from '$lib/graphql/client';
	import { currentUser } from '$lib/stores/auth';
	import * as Card from '$lib/components/ui/card';
	import * as Table from '$lib/components/ui/table';
	import * as Alert from '$lib/components/ui/alert';
	import { Button } from '$lib/components/ui/button';
	import { Badge } from '$lib/components/ui/badge';
	import {
		Clock,
		Calendar,
		Play,
		Square,
		Coffee,
		CheckCircle,
		AlertCircle,
		RefreshCw,
		Timer,
		CalendarDays
	} from 'lucide-svelte';

	// Import our new GraphQL operations
	import {
		GET_MY_ATTENDANCE_RECORDS_QUERY,
		CLOCK_IN_MUTATION,
		CLOCK_OUT_MUTATION,
		START_BREAK_MUTATION,
		END_BREAK_MUTATION,
		type AttendanceRecord,
		type AttendanceStatus
	} from '$lib/graphql/attendance-tracking-operations';

	// State
	let loading = $state(false);
	let clockAction = $state<'none' | 'clockin' | 'clockout' | 'break_start' | 'break_end'>('none');
	let actionMessage = $state('');
	let currentLocation = $state('');

	// Create client
	const client = createUrqlClient();
	let attendanceQuery: any = $state(null);
	let queryState = $state({ fetching: true, error: null, data: null });

	// Get current user ID
	const userId = $derived($currentUser?.id);

	onMount(() => {
		// Get user's location
		if (navigator.geolocation) {
			navigator.geolocation.getCurrentPosition(
				(position) => {
					currentLocation = `${position.coords.latitude},${position.coords.longitude}`;
				},
				() => {
					currentLocation = 'Location unavailable';
				}
			);
		}
	});

	// Initialize query when user is available
	$effect(() => {
		if (userId && !attendanceQuery) {
			try {
				attendanceQuery = queryStore({
					client,
					query: GET_MY_ATTENDANCE_RECORDS_QUERY,
					variables: { limit: 30 }
				});
			} catch (error) {
				console.error('Error initializing attendance query:', error);
			}
		}
	});

	// Update query state
	$effect(() => {
		if (attendanceQuery) {
			const unsubscribe = attendanceQuery.subscribe((state: any) => {
				queryState = {
					fetching: state.fetching,
					error: state.error,
					data: state.data
				};
			});
			return unsubscribe;
		}
	});

	// Get attendance records
	const attendanceRecords = $derived(() => {
		if (!queryState.data) return [];
		return queryState.data?.allAttendanceRecords?.nodes || [];
	});

	// Get today's record
	const todaysRecord = $derived(() => {
		const today = new Date().toISOString().split('T')[0];
		return attendanceRecords.find((record: AttendanceRecord) => record.date === today);
	});

	// Determine current status
	const currentStatus = $derived(() => {
		if (!todaysRecord) return 'not_clocked_in';
		if (todaysRecord.clockInTime && !todaysRecord.clockOutTime) {
			// Check if on break
			if (todaysRecord.breakStartTime && !todaysRecord.breakEndTime) {
				return 'on_break';
			}
			return 'clocked_in';
		}
		if (todaysRecord.clockOutTime) return 'clocked_out';
		return 'not_clocked_in';
	});

	// Calculate stats for current week
	const weeklyStats = $derived(() => {
		const today = new Date();
		const startOfWeek = new Date(today.setDate(today.getDate() - today.getDay()));
		const weekRecords = attendanceRecords.filter((record: AttendanceRecord) => {
			const recordDate = new Date(record.date);
			return recordDate >= startOfWeek;
		});

		const totalHours = weekRecords.reduce((sum, record) => sum + (record.totalHours || 0), 0);
		const daysWorked = weekRecords.filter(
			(record) => record.totalHours && record.totalHours > 0
		).length;
		const overtimeHours = weekRecords.reduce((sum, record) => sum + (record.overtimeHours || 0), 0);

		return { totalHours, daysWorked, overtimeHours };
	});

	// Clock in function
	const clockIn = async () => {
		if (!userId) return;

		loading = true;
		clockAction = 'clockin';

		try {
			const clockInMutation = mutationStore({ client, query: CLOCK_IN_MUTATION });

			const result = await clockInMutation.executeMutation({
				input: {
					location: currentLocation || 'Unknown'
				}
			});

			if (result.error) {
				throw new Error(result.error.message);
			}

			actionMessage = 'Successfully clocked in!';
			// Refresh the data
			attendanceQuery?.rerun({ requestPolicy: 'network-only' });
		} catch (error) {
			console.error('Error clocking in:', error);
			actionMessage = 'Failed to clock in. Please try again.';
		} finally {
			loading = false;
			setTimeout(() => {
				clockAction = 'none';
				actionMessage = '';
			}, 3000);
		}
	};

	// Clock out function
	const clockOut = async () => {
		if (!todaysRecord?.id) return;

		loading = true;
		clockAction = 'clockout';

		try {
			const clockOutMutation = mutationStore({ client, query: CLOCK_OUT_MUTATION });

			const result = await clockOutMutation.executeMutation({
				input: {
					attendanceRecordId: todaysRecord.id
				}
			});

			if (result.error) {
				throw new Error(result.error.message);
			}

			actionMessage = 'Successfully clocked out!';
			// Refresh the data
			attendanceQuery?.rerun({ requestPolicy: 'network-only' });
		} catch (error) {
			console.error('Error clocking out:', error);
			actionMessage = 'Failed to clock out. Please try again.';
		} finally {
			loading = false;
			setTimeout(() => {
				clockAction = 'none';
				actionMessage = '';
			}, 3000);
		}
	};

	// Start break function
	const startBreak = async () => {
		if (!todaysRecord?.id) return;

		loading = true;
		clockAction = 'break_start';

		try {
			const startBreakMutation = mutationStore({ client, query: START_BREAK_MUTATION });

			const result = await startBreakMutation.executeMutation({
				input: {
					attendanceRecordId: todaysRecord.id
				}
			});

			if (result.error) {
				throw new Error(result.error.message);
			}

			actionMessage = 'Break started!';
			// Refresh the data
			attendanceQuery?.rerun({ requestPolicy: 'network-only' });
		} catch (error) {
			console.error('Error starting break:', error);
			actionMessage = 'Failed to start break. Please try again.';
		} finally {
			loading = false;
			setTimeout(() => {
				clockAction = 'none';
				actionMessage = '';
			}, 3000);
		}
	};

	// End break function
	const endBreak = async () => {
		if (!todaysRecord?.id) return;

		loading = true;
		clockAction = 'break_end';

		try {
			const endBreakMutation = mutationStore({ client, query: END_BREAK_MUTATION });

			const result = await endBreakMutation.executeMutation({
				input: {
					attendanceRecordId: todaysRecord.id
				}
			});

			if (result.error) {
				throw new Error(result.error.message);
			}

			actionMessage = 'Break ended!';
			// Refresh the data
			attendanceQuery?.rerun({ requestPolicy: 'network-only' });
		} catch (error) {
			console.error('Error ending break:', error);
			actionMessage = 'Failed to end break. Please try again.';
		} finally {
			loading = false;
			setTimeout(() => {
				clockAction = 'none';
				actionMessage = '';
			}, 3000);
		}
	};

	// Format time
	const formatTime = (dateString: string) => {
		return new Date(dateString).toLocaleTimeString('en-US', {
			hour: '2-digit',
			minute: '2-digit'
		});
	};

	// Format date
	const formatDate = (dateString: string) => {
		return new Date(dateString).toLocaleDateString('en-US', {
			weekday: 'short',
			month: 'short',
			day: 'numeric'
		});
	};

	// Format hours
	const formatHours = (hours: number) => {
		const h = Math.floor(hours);
		const m = Math.round((hours - h) * 60);
		return `${h}h ${m}m`;
	};

	// Get status badge variant
	const getStatusVariant = (status: AttendanceStatus) => {
		switch (status) {
			case 'PRESENT':
				return 'default';
			case 'LATE':
				return 'destructive';
			case 'ABSENT':
				return 'destructive';
			case 'PARTIAL_DAY':
				return 'secondary';
			case 'HOLIDAY':
				return 'outline';
			case 'VACATION':
				return 'secondary';
			case 'SICK':
				return 'secondary';
			default:
				return 'outline';
		}
	};

	// Refresh data
	const refresh = () => {
		if (attendanceQuery?.rerun) {
			attendanceQuery.rerun({ requestPolicy: 'network-only' });
		}
	};

	// Calculate current work duration
	const currentWorkDuration = $derived(() => {
		if (!todaysRecord?.clockInTime || currentStatus === 'clocked_out') return null;

		const clockInTime = new Date(todaysRecord.clockInTime);
		const now = new Date();
		const diffMs = now.getTime() - clockInTime.getTime();
		const diffHours = diffMs / (1000 * 60 * 60);

		return formatHours(diffHours);
	});
</script>

<svelte:head>
	<title>My Attendance - SvelteHR</title>
	<meta name="description" content="Track your attendance and working hours" />
</svelte:head>

<div class="space-y-6">
	<!-- Header -->
	<div class="flex flex-col space-y-4 md:flex-row md:items-center md:justify-between md:space-y-0">
		<div>
			<h1 class="flex items-center gap-3 text-3xl font-bold tracking-tight">
				<Clock class="h-8 w-8" />
				My Attendance
			</h1>
			<p class="text-muted-foreground">Track your working hours and attendance records</p>
		</div>

		<Button variant="outline" size="sm" onclick={refresh} disabled={queryState.fetching}>
			<RefreshCw class="h-4 w-4 {queryState.fetching ? 'animate-spin' : ''}" />
		</Button>
	</div>

	<!-- Action Messages -->
	{#if actionMessage}
		<Alert.Root
			class={clockAction === 'clockin' || clockAction === 'clockout'
				? 'border-green-200 bg-green-50'
				: 'border-blue-200 bg-blue-50'}
		>
			<CheckCircle class="h-4 w-4 text-green-600" />
			<Alert.Title class="text-green-800">Success</Alert.Title>
			<Alert.Description class="text-green-700">{actionMessage}</Alert.Description>
		</Alert.Root>
	{/if}

	<!-- Quick Actions & Status -->
	<div class="grid grid-cols-1 gap-6 lg:grid-cols-2">
		<!-- Clock In/Out Card -->
		<Card.Root>
			<Card.Header>
				<Card.Title class="flex items-center gap-2">
					<Timer class="h-5 w-5" />
					Quick Actions
				</Card.Title>
			</Card.Header>
			<Card.Content class="space-y-4">
				<!-- Current Status -->
				<div class="space-y-2 text-center">
					<div class="text-2xl font-bold">
						{#if currentStatus === 'not_clocked_in'}
							Not Clocked In
						{:else if currentStatus === 'clocked_in'}
							Currently Working
						{:else if currentStatus === 'on_break'}
							On Break
						{:else if currentStatus === 'clocked_out'}
							Day Completed
						{/if}
					</div>

					{#if todaysRecord}
						<div class="space-y-1 text-sm text-muted-foreground">
							{#if todaysRecord.clockInTime}
								<div>Clocked in: {formatTime(todaysRecord.clockInTime)}</div>
							{/if}
							{#if todaysRecord.clockOutTime}
								<div>Clocked out: {formatTime(todaysRecord.clockOutTime)}</div>
							{/if}
							{#if currentWorkDuration && currentStatus !== 'clocked_out'}
								<div>Working for: {currentWorkDuration}</div>
							{:else if todaysRecord.totalHours}
								<div>Total hours: {formatHours(todaysRecord.totalHours)}</div>
							{/if}
							{#if todaysRecord.breakStartTime && !todaysRecord.breakEndTime}
								<div>Break started: {formatTime(todaysRecord.breakStartTime)}</div>
							{/if}
						</div>
					{/if}
				</div>

				<!-- Action Buttons -->
				<div class="flex flex-col space-y-2">
					{#if currentStatus === 'not_clocked_in'}
						<Button onclick={clockIn} disabled={loading} class="w-full">
							{#if loading && clockAction === 'clockin'}
								<div
									class="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent"
								></div>
							{:else}
								<Play class="mr-2 h-4 w-4" />
							{/if}
							Clock In
						</Button>
					{:else if currentStatus === 'clocked_in'}
						<Button variant="outline" onclick={clockOut} disabled={loading} class="w-full">
							{#if loading && clockAction === 'clockout'}
								<div
									class="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent"
								></div>
							{:else}
								<Square class="mr-2 h-4 w-4" />
							{/if}
							Clock Out
						</Button>
						<Button variant="ghost" onclick={startBreak} disabled={loading} class="w-full">
							{#if loading && clockAction === 'break_start'}
								<div
									class="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent"
								></div>
							{:else}
								<Coffee class="mr-2 h-4 w-4" />
							{/if}
							Start Break
						</Button>
					{:else if currentStatus === 'on_break'}
						<Button onclick={endBreak} disabled={loading} class="w-full">
							{#if loading && clockAction === 'break_end'}
								<div
									class="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent"
								></div>
							{:else}
								<Play class="mr-2 h-4 w-4" />
							{/if}
							End Break
						</Button>
					{:else}
						<Button variant="secondary" disabled class="w-full">
							<CheckCircle class="mr-2 h-4 w-4" />
							Day Complete
						</Button>
					{/if}
				</div>
			</Card.Content>
		</Card.Root>

		<!-- Weekly Summary -->
		<Card.Root>
			<Card.Header>
				<Card.Title class="flex items-center gap-2">
					<CalendarDays class="h-5 w-5" />
					This Week
				</Card.Title>
			</Card.Header>
			<Card.Content>
				<div class="grid grid-cols-3 gap-4">
					<div class="text-center">
						<div class="text-2xl font-bold text-blue-600">{weeklyStats.daysWorked}</div>
						<div class="text-sm text-muted-foreground">Days Worked</div>
					</div>
					<div class="text-center">
						<div class="text-2xl font-bold text-green-600">
							{formatHours(weeklyStats.totalHours)}
						</div>
						<div class="text-sm text-muted-foreground">Total Hours</div>
					</div>
					<div class="text-center">
						<div class="text-2xl font-bold text-orange-600">
							{formatHours(weeklyStats.overtimeHours)}
						</div>
						<div class="text-sm text-muted-foreground">Overtime</div>
					</div>
				</div>
			</Card.Content>
		</Card.Root>
	</div>

	<!-- Recent Attendance -->
	<Card.Root>
		<Card.Header>
			<Card.Title class="flex items-center gap-2">
				<Calendar class="h-5 w-5" />
				Recent Attendance
			</Card.Title>
		</Card.Header>
		<Card.Content>
			{#if queryState.fetching && !queryState.data}
				<div class="flex items-center justify-center py-8">
					<div class="flex items-center space-x-2">
						<RefreshCw class="h-4 w-4 animate-spin" />
						<p>Loading attendance records...</p>
					</div>
				</div>
			{:else if queryState.error}
				<Alert.Root variant="destructive">
					<AlertCircle class="h-4 w-4" />
					<Alert.Title>Error</Alert.Title>
					<Alert.Description>{queryState.error.message}</Alert.Description>
				</Alert.Root>
			{:else if attendanceRecords.length === 0}
				<div class="py-8 text-center">
					<Clock class="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
					<h3 class="mb-2 text-lg font-semibold">No attendance records</h3>
					<p class="text-muted-foreground">Start tracking your time by clocking in!</p>
				</div>
			{:else}
				<Table.Root>
					<Table.Header>
						<Table.Row>
							<Table.Head>Date</Table.Head>
							<Table.Head>Clock In</Table.Head>
							<Table.Head>Clock Out</Table.Head>
							<Table.Head>Break Time</Table.Head>
							<Table.Head>Hours</Table.Head>
							<Table.Head>Status</Table.Head>
							<Table.Head>Location</Table.Head>
						</Table.Row>
					</Table.Header>
					<Table.Body>
						{#each attendanceRecords as record (record.id)}
							<Table.Row>
								<Table.Cell>
									<div class="font-medium">{formatDate(record.date)}</div>
									<div class="text-sm text-muted-foreground">{record.date}</div>
								</Table.Cell>
								<Table.Cell>
									{record.clockInTime ? formatTime(record.clockInTime) : '-'}
								</Table.Cell>
								<Table.Cell>
									{record.clockOutTime ? formatTime(record.clockOutTime) : '-'}
								</Table.Cell>
								<Table.Cell>
									{#if record.breakStartTime && record.breakEndTime}
										<div class="text-sm">
											{formatTime(record.breakStartTime)} - {formatTime(record.breakEndTime)}
										</div>
									{:else if record.breakStartTime}
										<div class="text-sm text-orange-600">
											Started: {formatTime(record.breakStartTime)}
										</div>
									{:else}
										-
									{/if}
								</Table.Cell>
								<Table.Cell>
									{record.totalHours ? formatHours(record.totalHours) : '-'}
									{#if record.overtimeHours && record.overtimeHours > 0}
										<div class="text-xs text-orange-600">
											+{formatHours(record.overtimeHours)} OT
										</div>
									{/if}
								</Table.Cell>
								<Table.Cell>
									<Badge variant={getStatusVariant(record.status)}>
										{record.status.replace('_', ' ')}
									</Badge>
								</Table.Cell>
								<Table.Cell>
									<span class="text-sm text-muted-foreground">
										{record.location || '-'}
									</span>
								</Table.Cell>
							</Table.Row>
						{/each}
					</Table.Body>
				</Table.Root>
			{/if}
		</Card.Content>
	</Card.Root>
</div>
