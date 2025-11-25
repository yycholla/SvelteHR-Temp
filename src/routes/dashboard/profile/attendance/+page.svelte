<script lang="ts">
	import { page } from '$app/stores';
	import {
		AlertCircle,
		Calendar,
		CalendarPlus,
		CheckCircle,
		Circle,
		Clock,
		Hourglass,
		List,
		MapPin,
		PieChart,
		Play,
		TrendingUp,
		User
	} from '@lucide/svelte';
	import { format, parseISO } from 'date-fns';
	import { Button } from '$lib/components/ui/button';
	import { Badge } from '$lib/components/ui/badge';

	const { data } = $props();

	// Extract data properties
	const user = $derived(data.user);
	const userId = $derived(data.userId);
	const attendanceRecords = $derived(data.attendanceRecords);
	const attendanceStats = $derived(data.attendanceStats);
	const leaveBalances = $derived(data.leaveBalances || []);
	const leaveRequests = $derived(data.leaveRequests || []);
	const canManageAttendance = $derived(data.canManageAttendance);
	const isOwnAttendance = $derived(data.isOwnAttendance);

	// Current date for clock in/out functionality
	let currentTime = $state(new Date());
	let isClockedIn = $state(false);
	let todayRecord = $state<any>(null);

	// Update current time every second
	$effect(() => {
		const interval = setInterval(() => {
			currentTime = new Date();
		}, 1000);

		return () => {
			clearInterval(interval);
		};
	});

	// Check if user is clocked in today
	$effect(() => {
		if (!attendanceRecords) return;
		const today = new Date().toISOString().split('T')[0];
		const record = attendanceRecords.find((r: any) => r.date === today);
		todayRecord = record || null;
		isClockedIn = Boolean(record?.clockIn && !record.clockOut);
	});

	function getStatusColor(status: string) {
		switch (status) {
			case 'present':
				return 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20';
			case 'partial':
				return 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20';
			case 'absent':
				return 'bg-red-500/10 text-red-500 border-red-500/20';
			case 'leave':
				return 'bg-blue-500/10 text-blue-500 border-blue-500/20';
			default:
				return 'bg-muted text-muted-foreground border-border';
		}
	}

	function getStatusDotColor(status: string) {
		switch (status) {
			case 'present':
				return 'bg-emerald-500';
			case 'partial':
				return 'bg-yellow-500';
			case 'absent':
				return 'bg-red-500';
			case 'leave':
				return 'bg-blue-500';
			default:
				return 'bg-muted-foreground';
		}
	}

	function formatTime(dateString: string) {
		if (!dateString) return '--:--';
		return format(parseISO(dateString), 'hh:mm a');
	}

	function formatDate(dateString: string) {
		return format(parseISO(dateString), 'MMM dd, yyyy');
	}

	// Calculate duration for today if clocked in
	function getDuration(start: string, end?: string) {
		if (!start) return '0h 0m';
		const startTime = parseISO(start).getTime();
		const endTime = end ? parseISO(end).getTime() : currentTime.getTime();
		const diffMs = endTime - startTime;
		const hours = Math.floor(diffMs / (1000 * 60 * 60));
		const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
		return `${hours}h ${minutes}m`;
	}

	async function handleClockAction() {
		// TODO: Implement actual clock in/out functionality
		console.log(isClockedIn ? 'Clocking out...' : 'Clocking in...');
	}
</script>

<svelte:head>
	<title>Time & Attendance - MountainHR</title>
</svelte:head>

<div class="container mx-auto max-w-7xl p-6 md:p-10">
	<!-- Header -->
	<div class="mb-8 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
		<div>
			<h1 class="text-2xl font-bold tracking-tight text-foreground">Time & Attendance</h1>
			<p class="text-muted-foreground">
				Manage your schedule, track time, and request leave.
			</p>
		</div>
		<div class="flex items-center gap-3">
			<div class="mr-4 hidden text-right md:block">
				<p class="text-sm font-medium text-foreground">{format(currentTime, 'HH:mm:ss')}</p>
				<p class="text-xs text-muted-foreground">{format(currentTime, 'MMM dd, yyyy')}</p>
			</div>
			{#if isOwnAttendance}
				<Button
					variant={isClockedIn ? 'destructive' : 'default'}
					class={isClockedIn ? '' : 'bg-emerald-600 hover:bg-emerald-700'}
					onclick={handleClockAction}
				>
					<Play class="mr-2 h-4 w-4" />
					{isClockedIn ? 'Clock Out' : 'Clock In'}
				</Button>
			{/if}
			<Button
				variant="secondary"
				href="/dashboard/profile/leave/requests"
			>
				<CalendarPlus class="mr-2 h-4 w-4" />
				Request Leave
			</Button>
		</div>
	</div>

	<!-- Main Bento Grid -->
	<div class="grid auto-rows-[minmax(160px,auto)] grid-cols-1 gap-4 md:grid-cols-3 lg:grid-cols-4">
		<!-- 1. Today's Status (Medium) -->
		<div
			class="relative flex flex-col overflow-hidden rounded-xl border bg-card p-6 md:col-span-2"
		>
			<div class="relative z-10 flex justify-between items-start">
				<div>
					<h2 class="mb-1 text-lg font-semibold text-foreground">Today's Status</h2>
					<div class="flex items-center gap-2">
						<span
							class="h-2.5 w-2.5 rounded-full {isClockedIn
								? 'animate-pulse bg-emerald-500'
								: 'bg-yellow-500'}"
						></span>
						<span class="text-sm text-muted-foreground"
							>{isClockedIn ? 'Clocked In' : 'Not Clocked In'}</span
						>
					</div>
				</div>
				<div class="rounded bg-muted/30 px-3 py-1 text-xs font-mono text-muted-foreground">
					Shift: 9:00 - 17:00
				</div>
			</div>

			<div class="relative z-10 mt-8 grid grid-cols-3 gap-4">
				<div>
					<p class="mb-1 text-xs uppercase tracking-wider text-muted-foreground">Clock In</p>
					<p class="text-xl font-mono font-medium text-foreground">
						{todayRecord?.clockIn ? formatTime(todayRecord.clockIn) : '--:--'}
					</p>
				</div>
				<div>
					<p class="mb-1 text-xs uppercase tracking-wider text-muted-foreground">Clock Out</p>
					<p class="text-xl font-mono font-medium text-foreground">
						{todayRecord?.clockOut ? formatTime(todayRecord.clockOut) : '--:--'}
					</p>
				</div>
				<div>
					<p class="mb-1 text-xs uppercase tracking-wider text-muted-foreground">Duration</p>
					<p class="text-xl font-mono font-medium text-foreground">
						{todayRecord?.clockIn ? getDuration(todayRecord.clockIn, todayRecord.clockOut) : '0h 0m'}
					</p>
				</div>
			</div>

			<!-- Decorative Background -->
			<div class="absolute bottom-0 right-0 p-6 opacity-5">
				<Clock class="h-32 w-32" />
			</div>
		</div>

		<!-- 2. Attendance Stats (Small) -->
		<div class="flex flex-col justify-between rounded-xl border bg-card p-5">
			<div class="mb-2 flex items-center gap-2 text-muted-foreground">
				<TrendingUp class="h-4 w-4" />
				<span class="text-xs font-semibold uppercase tracking-wider">Attendance Rate</span>
			</div>
			<div>
				<div class="mb-1 flex items-end gap-2">
					<span class="text-3xl font-bold text-emerald-500"
						>{attendanceStats.attendanceRate}%</span
					>
					<!-- <span class="mb-1.5 text-xs text-emerald-500/80">+2.4%</span> -->
				</div>
				<p class="text-xs text-muted-foreground">Total Days: {attendanceStats.totalDays}</p>
			</div>
			<div class="mt-4 h-1.5 w-full overflow-hidden rounded-full bg-muted">
				<div
					class="h-full rounded-full bg-emerald-500"
					style="width: {attendanceStats.attendanceRate}%"
				></div>
			</div>
		</div>

		<!-- 3. Work Hours (Small) -->
		<div class="flex flex-col justify-between rounded-xl border bg-card p-5">
			<div class="mb-2 flex items-center gap-2 text-muted-foreground">
				<Hourglass class="h-4 w-4" />
				<span class="text-xs font-semibold uppercase tracking-wider">Total Hours</span>
			</div>
			<div>
				<span class="text-3xl font-bold text-primary">{attendanceStats.totalHours}</span>
				<p class="mt-1 text-xs text-muted-foreground">Avg: {attendanceStats.averageHours}h/day</p>
			</div>
			<div class="mt-4 flex gap-1 h-8 items-end">
				<div class="w-1 rounded-sm bg-primary/20 h-[40%]"></div>
				<div class="w-1 rounded-sm bg-primary/40 h-[60%]"></div>
				<div class="w-1 rounded-sm bg-primary/60 h-[50%]"></div>
				<div class="w-1 rounded-sm bg-primary/80 h-[80%]"></div>
				<div class="w-1 rounded-sm bg-primary h-[70%]"></div>
			</div>
		</div>

		<!-- 4. Leave Balances (Vertical List) -->
		<div class="row-span-2 flex flex-col rounded-xl border bg-card p-5">
			<div class="mb-6 flex items-center justify-between">
				<div class="flex items-center gap-2 text-muted-foreground">
					<PieChart class="h-4 w-4" />
					<span class="text-xs font-semibold uppercase tracking-wider">Balances</span>
				</div>
			</div>

			<div class="flex-1 space-y-5 overflow-y-auto">
				{#if leaveBalances.length > 0}
					{#each leaveBalances as balance}
						<div>
							<div class="mb-1.5 flex justify-between text-sm">
								<span class="font-medium">{balance.leaveType.name}</span>
								<span class="font-bold text-primary"
									>{parseFloat(balance.usedDays)} / {parseFloat(balance.totalDays)}</span
								>
							</div>
							<div class="h-2 w-full overflow-hidden rounded-full bg-muted">
								<div
									class="h-full rounded-full"
									style="background-color: {balance.leaveType.color ||
										'var(--primary)'}; width: {(parseFloat(balance.usedDays) /
										parseFloat(balance.totalDays)) *
										100}%"
								></div>
							</div>
							<p class="mt-1 text-right text-[10px] text-muted-foreground">
								{parseFloat(balance.remainingDays)} days remaining
							</p>
						</div>
					{/each}
				{:else}
					<p class="text-center text-xs text-muted-foreground">No leave balances found.</p>
				{/if}
			</div>
		</div>

		<!-- 5. Recent Attendance Log (Large Table) -->
		<div
			class="row-span-2 flex flex-col overflow-hidden rounded-xl border bg-card md:col-span-2 lg:col-span-3"
		>
			<div class="flex items-center justify-between border-b border-border p-5">
				<div class="flex items-center gap-2 text-muted-foreground">
					<List class="h-4 w-4" />
					<span class="text-xs font-semibold uppercase tracking-wider">Recent History</span>
				</div>
				<!-- <div class="flex gap-2">
					<button
						class="rounded bg-muted px-2 py-1 text-xs transition-colors hover:bg-muted/80"
						>Export</button
					>
					<button class="text-xs text-primary hover:underline">View All</button>
				</div> -->
			</div>

			<div class="overflow-x-auto">
				<table class="w-full text-left text-sm">
					<thead class="bg-muted/30 text-xs font-medium uppercase text-muted-foreground">
						<tr>
							<th class="px-5 py-3">Date</th>
							<th class="px-5 py-3">Clock In</th>
							<th class="px-5 py-3">Clock Out</th>
							<th class="px-5 py-3">Total</th>
							<th class="px-5 py-3">Status</th>
							<th class="px-5 py-3">Note</th>
						</tr>
					</thead>
					<tbody class="divide-y divide-border/50">
						{#each attendanceRecords as record}
							<tr class="transition-colors hover:bg-muted/20">
								<td class="px-5 py-3 font-medium">{formatDate(record.date)}</td>
								<td class="px-5 py-3 text-muted-foreground">
									{record.clockIn ? formatTime(record.clockIn) : '-'}
								</td>
								<td class="px-5 py-3 text-muted-foreground">
									{record.clockOut ? formatTime(record.clockOut) : '-'}
								</td>
								<td class="px-5 py-3 font-mono">{record.hoursWorked}h</td>
								<td class="px-5 py-3">
									<span
										class="inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[10px] font-medium {getStatusColor(
											record.status
										)}"
									>
										<span class="h-1.5 w-1.5 rounded-full {getStatusDotColor(record.status)}"
										></span>
										{record.status ? record.status.charAt(0).toUpperCase() + record.status.slice(1) : 'Unknown'}
									</span>
								</td>
								<td class="px-5 py-3 text-xs text-muted-foreground">{record.notes || '-'}</td>
							</tr>
						{:else}
							<tr>
								<td colspan="6" class="px-5 py-8 text-center text-xs text-muted-foreground">
									No recent attendance records.
								</td>
							</tr>
						{/each}
					</tbody>
				</table>
			</div>
		</div>
	</div>
</div>

