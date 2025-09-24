<script lang="ts">
	import { onMount } from 'svelte';
	import { page } from '$app/stores';
	import { goto } from '$app/navigation';
	import { currentUser } from '$lib/stores/auth';
	import { executeQuery } from '$lib/graphql/client';
	import * as Card from '$lib/components/ui/card';
	import { Badge } from '$lib/components/ui/badge';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import * as Select from '$lib/components/ui/select';
	import { Separator } from '$lib/components/ui/separator';
	import * as Tabs from '$lib/components/ui/tabs';
	import {
		Clock,
		Calendar as CalendarIcon,
		TrendingUp,
		AlertTriangle,
		CheckCircle,
		XCircle,
		User,
		ArrowLeft,
		RefreshCw,
		Download,
		Filter,
		ChevronLeft,
		ChevronRight
	} from 'lucide-svelte';

	// Get user ID from URL params
	const userId = $page.params.userId;

	// Check if viewing own attendance
	const isOwnAttendance = $derived($currentUser?.id === userId);

	// State
	let loading = $state(true);
	let error = $state<string | null>(null);
	let selectedMonth = $state(new Date());
	let attendanceData = $state<any[]>([]);
	let attendanceStats = $state({
		totalDays: 0,
		presentDays: 0,
		absentDays: 0,
		lateDays: 0,
		leaveDays: 0,
		attendanceRate: 0,
		averageHours: 0
	});

	// GraphQL query for attendance data
	const GET_USER_ATTENDANCE = `
		query GetUserAttendance($userId: UUID!) {
			userById(id: $userId) {
				id
				displayName
				email
				jobTitle
				hireDate
			}

			allAttendanceRecords(
				condition: { employeeId: $userId }
				orderBy: DATE_DESC
				first: 100
			) {
				nodes {
					id
					date
					clockInTime
					clockOutTime
					status
					totalHours
					overtimeHours
					notes
				}
			}
		}
	`;

	// Helper functions
	function getMonthDateRange(date: Date) {
		const year = date.getFullYear();
		const month = date.getMonth();
		const firstDay = new Date(year, month, 1);
		const lastDay = new Date(year, month + 1, 0);

		return {
			start: firstDay.toISOString().split('T')[0],
			end: lastDay.toISOString().split('T')[0]
		};
	}

	function calculateStats(records: any[]) {
		if (!records || records.length === 0) {
			return {
				totalDays: 0,
				presentDays: 0,
				absentDays: 0,
				lateDays: 0,
				leaveDays: 0,
				attendanceRate: 0,
				averageHours: 0
			};
		}

		const stats = {
			totalDays: records.length,
			presentDays: 0,
			absentDays: 0,
			lateDays: 0,
			leaveDays: 0,
			totalHours: 0
		};

		records.forEach((record) => {
			switch (record.status) {
				case 'present':
					stats.presentDays++;
					break;
				case 'absent':
					stats.absentDays++;
					break;
				case 'late':
					stats.lateDays++;
					stats.presentDays++; // Late is still present
					break;
				case 'leave':
				case 'holiday':
					stats.leaveDays++;
					break;
			}

			if (record.totalHours) {
				stats.totalHours += parseFloat(record.totalHours);
			}
		});

		const workingDays = stats.totalDays - stats.leaveDays;
		const attendanceRate =
			workingDays > 0 ? Math.round((stats.presentDays / workingDays) * 100) : 0;

		const averageHours =
			stats.presentDays > 0 ? Math.round((stats.totalHours / stats.presentDays) * 10) / 10 : 0;

		return {
			...stats,
			attendanceRate,
			averageHours
		};
	}

	function getStatusColor(status: string) {
		switch (status) {
			case 'present':
				return 'default';
			case 'late':
				return 'secondary';
			case 'absent':
				return 'destructive';
			case 'leave':
				return 'outline';
			case 'holiday':
				return 'outline';
			default:
				return 'secondary';
		}
	}

	function getStatusIcon(status: string) {
		switch (status) {
			case 'present':
				return CheckCircle;
			case 'late':
				return Clock;
			case 'absent':
				return XCircle;
			case 'leave':
				return CalendarIcon;
			case 'holiday':
				return CalendarIcon;
			default:
				return AlertTriangle;
		}
	}

	function formatTime(time: string | null) {
		if (!time) return '-';
		try {
			return new Date(`1970-01-01T${time}`).toLocaleTimeString('en-US', {
				hour: '2-digit',
				minute: '2-digit',
				hour12: true
			});
		} catch {
			return time;
		}
	}

	function formatDate(date: string) {
		return new Date(date).toLocaleDateString('en-US', {
			weekday: 'short',
			month: 'short',
			day: 'numeric'
		});
	}

	function changeMonth(direction: number) {
		const newMonth = new Date(selectedMonth);
		newMonth.setMonth(newMonth.getMonth() + direction);
		selectedMonth = newMonth;
		loadAttendanceData();
	}

	async function loadAttendanceData() {
		loading = true;
		error = null;

		try {
			const { start, end } = getMonthDateRange(selectedMonth);
			const { client } = await import('$lib/graphql/client');

			const data = await executeQuery(client, GET_USER_ATTENDANCE, {
				userId
			});

			if (data.errors) {
				throw new Error(data.errors[0].message);
			}

			// Filter records client-side for the selected month
			const allRecords = data.allAttendanceRecords?.nodes || [];
			attendanceData = allRecords.filter((record) => {
				if (!record.date) return false;
				const recordDate = new Date(record.date);
				const startDate = new Date(start);
				const endDate = new Date(end);
				return recordDate >= startDate && recordDate <= endDate;
			});

			attendanceStats = calculateStats(attendanceData);
		} catch (err) {
			console.error('Error loading attendance:', err);
			error = err instanceof Error ? err.message : 'Failed to load attendance data';
		} finally {
			loading = false;
		}
	}

	async function clockIn() {
		// TODO: Implement clock in functionality
		console.log('Clock in');
	}

	async function clockOut() {
		// TODO: Implement clock out functionality
		console.log('Clock out');
	}

	onMount(() => {
		loadAttendanceData();
	});
</script>

<svelte:head>
	<title>{isOwnAttendance ? 'My Attendance' : 'User Attendance'} - SvelteHR</title>
	<meta name="description" content="View and manage attendance records" />
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
					<Clock class="h-8 w-8 text-primary" />
					<h1 class="text-3xl font-bold tracking-tight">
						{isOwnAttendance ? 'My Attendance' : 'User Attendance'}
					</h1>
				</div>
				<p class="text-muted-foreground">
					{isOwnAttendance
						? 'Track your attendance and work hours'
						: 'View user attendance records'}
				</p>
			</div>
		</div>

		<div class="flex items-center gap-2">
			{#if isOwnAttendance}
				<Button onclick={clockIn}>
					<Clock class="mr-2 h-4 w-4" />
					Clock In
				</Button>
				<Button variant="outline" onclick={clockOut}>
					<Clock class="mr-2 h-4 w-4" />
					Clock Out
				</Button>
			{/if}
			<Button variant="outline" size="sm" onclick={loadAttendanceData}>
				<RefreshCw class="h-4 w-4" />
			</Button>
		</div>
	</div>

	<!-- Month Navigation -->
	<Card.Root>
		<Card.Content class="p-4">
			<div class="flex items-center justify-between">
				<Button variant="outline" size="sm" onclick={() => changeMonth(-1)}>
					<ChevronLeft class="h-4 w-4" />
				</Button>

				<h2 class="text-lg font-semibold">
					{selectedMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
				</h2>

				<Button
					variant="outline"
					size="sm"
					onclick={() => changeMonth(1)}
					disabled={selectedMonth.getMonth() === new Date().getMonth() &&
						selectedMonth.getFullYear() === new Date().getFullYear()}
				>
					<ChevronRight class="h-4 w-4" />
				</Button>
			</div>
		</Card.Content>
	</Card.Root>

	<!-- Loading State -->
	{#if loading}
		<div class="flex items-center justify-center py-12">
			<div class="text-center">
				<RefreshCw class="mx-auto h-8 w-8 animate-spin text-muted-foreground" />
				<p class="mt-2 text-muted-foreground">Loading attendance data...</p>
			</div>
		</div>
	{:else if error}
		<!-- Error State -->
		<Card.Root>
			<Card.Content class="py-8">
				<div class="text-center">
					<AlertTriangle class="mx-auto h-12 w-12 text-destructive" />
					<h3 class="mt-4 text-lg font-semibold">Error Loading Attendance</h3>
					<p class="text-muted-foreground">{error}</p>
					<Button class="mt-4" onclick={loadAttendanceData}>Try Again</Button>
				</div>
			</Card.Content>
		</Card.Root>
	{:else}
		<!-- Attendance Statistics -->
		<div class="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
			<Card.Root>
				<Card.Header class="flex flex-row items-center justify-between space-y-0 pb-2">
					<Card.Title class="text-sm font-medium">Attendance Rate</Card.Title>
					<TrendingUp class="h-4 w-4 text-muted-foreground" />
				</Card.Header>
				<Card.Content>
					<div class="text-2xl font-bold">{attendanceStats.attendanceRate}%</div>
					<p class="text-xs text-muted-foreground">
						{attendanceStats.presentDays} of {attendanceStats.totalDays - attendanceStats.leaveDays}
						working days
					</p>
				</Card.Content>
			</Card.Root>

			<Card.Root>
				<Card.Header class="flex flex-row items-center justify-between space-y-0 pb-2">
					<Card.Title class="text-sm font-medium">Present Days</Card.Title>
					<CheckCircle class="h-4 w-4 text-green-500" />
				</Card.Header>
				<Card.Content>
					<div class="text-2xl font-bold">{attendanceStats.presentDays}</div>
					<p class="text-xs text-muted-foreground">
						Including {attendanceStats.lateDays} late arrivals
					</p>
				</Card.Content>
			</Card.Root>

			<Card.Root>
				<Card.Header class="flex flex-row items-center justify-between space-y-0 pb-2">
					<Card.Title class="text-sm font-medium">Average Hours</Card.Title>
					<Clock class="h-4 w-4 text-blue-500" />
				</Card.Header>
				<Card.Content>
					<div class="text-2xl font-bold">{attendanceStats.averageHours}h</div>
					<p class="text-xs text-muted-foreground">Per working day</p>
				</Card.Content>
			</Card.Root>

			<Card.Root>
				<Card.Header class="flex flex-row items-center justify-between space-y-0 pb-2">
					<Card.Title class="text-sm font-medium">Leave Days</Card.Title>
					<CalendarIcon class="h-4 w-4 text-orange-500" />
				</Card.Header>
				<Card.Content>
					<div class="text-2xl font-bold">{attendanceStats.leaveDays}</div>
					<p class="text-xs text-muted-foreground">This month</p>
				</Card.Content>
			</Card.Root>
		</div>

		<!-- Attendance Records -->
		<Card.Root>
			<Card.Header>
				<div class="flex items-center justify-between">
					<div>
						<Card.Title>Attendance Records</Card.Title>
						<Card.Description
							>Daily attendance details for {selectedMonth.toLocaleDateString('en-US', {
								month: 'long'
							})}</Card.Description
						>
					</div>
					<Button variant="outline" size="sm">
						<Download class="mr-2 h-4 w-4" />
						Export
					</Button>
				</div>
			</Card.Header>
			<Card.Content>
				{#if attendanceData.length === 0}
					<div class="py-8 text-center">
						<CalendarIcon class="mx-auto h-12 w-12 text-muted-foreground" />
						<h3 class="mt-4 text-lg font-semibold">No Attendance Records</h3>
						<p class="text-muted-foreground">No attendance data available for this month.</p>
					</div>
				{:else}
					<div class="space-y-2">
						{#each attendanceData as record (record.id)}
							<div
								class="flex items-center justify-between rounded-lg border p-4 transition-colors hover:bg-muted/50"
							>
								<div class="flex items-center gap-4">
									<div class="flex h-10 w-10 items-center justify-center rounded-full bg-muted">
										<svelte:component
											this={getStatusIcon(record.status)}
											class="h-5 w-5 {record.status === 'present'
												? 'text-green-500'
												: record.status === 'late'
													? 'text-yellow-500'
													: record.status === 'absent'
														? 'text-red-500'
														: record.status === 'leave' || record.status === 'holiday'
															? 'text-blue-500'
															: ''}"
										/>
									</div>

									<div>
										<p class="font-medium">{formatDate(record.date)}</p>
										<div class="flex items-center gap-4 text-sm text-muted-foreground">
											<span>In: {formatTime(record.clockInTime)}</span>
											<span>Out: {formatTime(record.clockOutTime)}</span>
											{#if record.totalHours}
												<span>Hours: {record.totalHours}</span>
											{/if}
										</div>
										{#if record.notes}
											<p class="mt-1 text-xs text-muted-foreground">{record.notes}</p>
										{/if}
									</div>
								</div>

								<Badge variant={getStatusColor(record.status)}>
									{record.status}
								</Badge>
							</div>
						{/each}
					</div>
				{/if}
			</Card.Content>
		</Card.Root>
	{/if}
</div>
