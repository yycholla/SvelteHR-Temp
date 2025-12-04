<script lang="ts">
	import { page } from '$app/stores';
	import {
		AlertCircle,
		Calendar,
		CheckCircle,
		Circle,
		Clock,
		MapPin,
		TrendingUp,
		User
	} from '@lucide/svelte';
	import { format, formatDistanceToNow, parseISO } from 'date-fns';

	const { data } = $props();

	// Extract data properties directly to avoid circular dependencies
	const user = $derived(data.user);
	const userId = $derived(data.userId);
	const attendanceRecords = $derived(data.attendanceRecords);
	const attendanceStats = $derived(data.attendanceStats);
	const canManageAttendance = $derived(data.canManageAttendance);
	const isOwnAttendance = $derived(data.isOwnAttendance);

	// Current date for clock in/out functionality
	let currentTime = $state(new Date());
	let isClockedIn = $state(false);
	let todayRecord = $state(null);

	// Update current time every minute with proper cleanup
	$effect(() => {
		const interval = setInterval(() => {
			currentTime = new Date();
		}, 60000);

		// Cleanup interval on component unmount
		return () => {
			clearInterval(interval);
		};
	});

	// Check if user is clocked in today - using separate effect to avoid circular dependency
	$effect(() => {
		const records = attendanceRecords;
		if (!records) return;

		const today = new Date().toISOString().split('T')[0];
		const record = records.find((r) => r.date === today);
		todayRecord = record || null;
		isClockedIn = Boolean(record?.clockIn && !record.clockOut);
	});

	function getStatusIcon(status: string) {
		switch (status) {
			case 'present':
				return CheckCircle;
			case 'partial':
				return AlertCircle;
			case 'absent':
				return Circle;
			default:
				return Circle;
		}
	}

	function getStatusColor(status: string) {
		switch (status) {
			case 'present':
				return 'text-green-600';
			case 'partial':
				return 'text-yellow-600';
			case 'absent':
				return 'text-red-600';
			default:
				return 'text-muted-foreground';
		}
	}

	function formatTime(dateString: string) {
		return format(parseISO(dateString), 'HH:mm');
	}

	function formatDate(dateString: string) {
		return format(parseISO(dateString), 'MMM dd, yyyy');
	}

	async function handleClockAction() {
		// TODO: Implement actual clock in/out functionality
		console.log(isClockedIn ? 'Clocking out...' : 'Clocking in...');
	}
</script>

<svelte:head>
	<title
		>{isOwnAttendance ? 'My Attendance' : `${user?.displayName} - Attendance`} | MountainHR</title
	>
</svelte:head>

<div class="container mx-auto space-y-6 p-6">
	<!-- Header -->
	<div class="flex items-center justify-between">
		<div class="flex items-center space-x-4">
			<div class="flex h-12 w-12 items-center justify-center rounded-full bg-blue-100">
				<Calendar class="h-6 w-6 text-blue-600" />
			</div>
			<div>
				<h1 class="text-2xl font-bold text-foreground">
					{isOwnAttendance ? 'My Attendance' : `${user?.displayName} - Attendance`}
				</h1>
				<p class="text-muted-foreground">
					{user?.departmentByDepartmentId?.name || 'No Department'} • {user?.role}
				</p>
			</div>
		</div>

		{#if isOwnAttendance}
			<!-- Current Time & Clock Action -->
			<div class="text-right">
				<div class="text-lg font-semibold text-foreground">
					{format(currentTime, 'HH:mm:ss')}
				</div>
				<div class="text-sm text-muted-foreground">
					{format(currentTime, 'EEEE, MMM dd')}
				</div>
				<button
					onclick={handleClockAction}
					class="mt-2 inline-flex items-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition-colors
						{isClockedIn
						? 'bg-destructive text-destructive-foreground hover:bg-destructive/90'
						: 'bg-primary text-primary-foreground hover:bg-primary/90'}"
				>
					<Clock class="h-4 w-4" />
					{isClockedIn ? 'Clock Out' : 'Clock In'}
				</button>
			</div>
		{/if}
	</div>

	<!-- Attendance Statistics -->
	<div class="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
		<div class="rounded-lg border bg-card p-6 shadow-sm">
			<div class="flex items-center justify-between">
				<div>
					<p class="text-sm font-medium text-muted-foreground">Attendance Rate</p>
					<p class="text-2xl font-bold text-foreground">{attendanceStats.attendanceRate}%</p>
				</div>
				<div class="flex h-12 w-12 items-center justify-center rounded-full bg-green-100">
					<TrendingUp class="h-6 w-6 text-green-600" />
				</div>
			</div>
		</div>

		<div class="rounded-lg border bg-card p-6 shadow-sm">
			<div class="flex items-center justify-between">
				<div>
					<p class="text-sm font-medium text-muted-foreground">Total Days</p>
					<p class="text-2xl font-bold text-foreground">{attendanceStats.totalDays}</p>
				</div>
				<div class="flex h-12 w-12 items-center justify-center rounded-full bg-blue-100">
					<Calendar class="h-6 w-6 text-blue-600" />
				</div>
			</div>
		</div>

		<div class="rounded-lg border bg-card p-6 shadow-sm">
			<div class="flex items-center justify-between">
				<div>
					<p class="text-sm font-medium text-muted-foreground">Total Hours</p>
					<p class="text-2xl font-bold text-foreground">{attendanceStats.totalHours}h</p>
				</div>
				<div class="flex h-12 w-12 items-center justify-center rounded-full bg-purple-100">
					<Clock class="h-6 w-6 text-purple-600" />
				</div>
			</div>
		</div>

		<div class="rounded-lg border bg-card p-6 shadow-sm">
			<div class="flex items-center justify-between">
				<div>
					<p class="text-sm font-medium text-muted-foreground">Avg. Hours/Day</p>
					<p class="text-2xl font-bold text-foreground">{attendanceStats.averageHours}h</p>
				</div>
				<div class="flex h-12 w-12 items-center justify-center rounded-full bg-orange-100">
					<Clock class="h-6 w-6 text-orange-600" />
				</div>
			</div>
		</div>
	</div>

	<!-- Today's Status (if viewing own attendance) -->
	{#if isOwnAttendance && todayRecord}
		<div class="rounded-lg border bg-card p-6 shadow-sm">
			<h2 class="mb-4 text-lg font-semibold text-foreground">Today's Status</h2>
			<div class="grid grid-cols-1 gap-4 sm:grid-cols-3">
				<div>
					<p class="text-sm font-medium text-muted-foreground">Clock In</p>
					<p class="text-lg font-semibold text-foreground">
						{todayRecord.clockIn ? formatTime(todayRecord.clockIn) : 'Not clocked in'}
					</p>
				</div>
				<div>
					<p class="text-sm font-medium text-muted-foreground">Clock Out</p>
					<p class="text-lg font-semibold text-foreground">
						{todayRecord.clockOut ? formatTime(todayRecord.clockOut) : 'Not clocked out'}
					</p>
				</div>
				<div>
					<p class="text-sm font-medium text-muted-foreground">Hours Worked</p>
					<p class="text-lg font-semibold text-foreground">
						{todayRecord.hoursWorked ? `${todayRecord.hoursWorked}h` : '0h'}
					</p>
				</div>
			</div>
		</div>
	{/if}

	<!-- Attendance Records -->
	<div class="rounded-lg border bg-card shadow-sm">
		<div class="border border-b px-6 py-4">
			<h2 class="text-lg font-semibold text-foreground">Attendance History</h2>
		</div>
		<div class="overflow-hidden">
			<div class="overflow-x-auto">
				<table class="w-full text-sm">
					<thead class="bg-muted/50">
						<tr>
							<th
								class="px-6 py-3 text-left text-xs font-medium tracking-wider text-muted-foreground uppercase"
							>
								Date
							</th>
							<th
								class="px-6 py-3 text-left text-xs font-medium tracking-wider text-muted-foreground uppercase"
							>
								Clock In
							</th>
							<th
								class="px-6 py-3 text-left text-xs font-medium tracking-wider text-muted-foreground uppercase"
							>
								Clock Out
							</th>
							<th
								class="px-6 py-3 text-left text-xs font-medium tracking-wider text-muted-foreground uppercase"
							>
								Hours
							</th>
							<th
								class="px-6 py-3 text-left text-xs font-medium tracking-wider text-muted-foreground uppercase"
							>
								Status
							</th>
							<th
								class="px-6 py-3 text-left text-xs font-medium tracking-wider text-muted-foreground uppercase"
							>
								Location
							</th>
							<th
								class="px-6 py-3 text-left text-xs font-medium tracking-wider text-muted-foreground uppercase"
							>
								Notes
							</th>
						</tr>
					</thead>
					<tbody class="">
						{#each attendanceRecords as record}
							<tr class="border-b hover:bg-muted/50">
								<td class="px-6 py-4 text-sm whitespace-nowrap text-foreground">
									{formatDate(record.date)}
								</td>
								<td class="px-6 py-4 text-sm whitespace-nowrap text-foreground">
									{record.clockIn ? formatTime(record.clockIn) : '-'}
								</td>
								<td class="px-6 py-4 text-sm whitespace-nowrap text-foreground">
									{record.clockOut ? formatTime(record.clockOut) : '-'}
								</td>
								<td class="px-6 py-4 text-sm whitespace-nowrap text-foreground">
									{record.hoursWorked}h
								</td>
								<td class="px-6 py-4 text-sm whitespace-nowrap">
									<div class="flex items-center gap-2">
										{#if record.status === 'present'}
											<CheckCircle class="h-4 w-4 {getStatusColor(record.status)}" />
										{:else if record.status === 'partial'}
											<AlertCircle class="h-4 w-4 {getStatusColor(record.status)}" />
										{:else}
											<Circle class="h-4 w-4 {getStatusColor(record.status)}" />
										{/if}
										<span class="capitalize {getStatusColor(record.status)}">
											{record.status}
										</span>
									</div>
								</td>
								<td class="px-6 py-4 text-sm whitespace-nowrap text-foreground">
									<div class="flex items-center gap-2">
										<MapPin class="h-4 w-4 text-muted-foreground" />
										{record.location}
									</div>
								</td>
								<td class="px-6 py-4 text-sm text-muted-foreground">
									{record.notes || '-'}
								</td>
							</tr>
						{:else}
							<tr>
								<td colspan="7" class="px-6 py-8 text-center text-sm text-muted-foreground">
									No attendance records found.
								</td>
							</tr>
						{/each}
					</tbody>
				</table>
			</div>
		</div>
	</div>
</div>
