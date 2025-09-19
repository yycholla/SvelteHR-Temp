<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import { Badge } from '$lib/components/ui/badge';
	import * as Card from '$lib/components/ui/card';
	import * as Table from '$lib/components/ui/table';
	import * as Select from '$lib/components/ui/select';
	import {
		FileText,
		Search,
		Filter,
		Download,
		RefreshCw,
		Calendar,
		User,
		Activity,
		AlertTriangle,
		CheckCircle,
		XCircle,
		Info,
		ArrowLeft,
		Eye
	} from 'lucide-svelte';

	// Audit log data
	let auditLogs = $state([
		{
			id: '1',
			timestamp: '2024-01-15 14:30:22',
			userId: 'admin@company.com',
			userName: 'Admin User',
			action: 'User Created',
			resource: 'User Management',
			details: 'Created new user: john.doe@company.com',
			ipAddress: '192.168.1.100',
			userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
			severity: 'info',
			status: 'success'
		},
		{
			id: '2',
			timestamp: '2024-01-15 14:25:15',
			userId: 'hr@company.com',
			userName: 'HR Manager',
			action: 'Settings Modified',
			resource: 'System Settings',
			details: 'Updated security policy settings',
			ipAddress: '192.168.1.105',
			userAgent: 'Mozilla/5.0 (Mac OS X 10.15.7)',
			severity: 'warning',
			status: 'success'
		},
		{
			id: '3',
			timestamp: '2024-01-15 14:20:08',
			userId: 'unknown',
			userName: 'Anonymous',
			action: 'Failed Login',
			resource: 'Authentication',
			details: 'Failed login attempt for: admin@company.com',
			ipAddress: '45.123.456.789',
			userAgent: 'curl/7.68.0',
			severity: 'error',
			status: 'failure'
		},
		{
			id: '4',
			timestamp: '2024-01-15 14:15:33',
			userId: 'admin@company.com',
			userName: 'Admin User',
			action: 'Data Export',
			resource: 'Employee Data',
			details: 'Exported employee report (25 records)',
			ipAddress: '192.168.1.100',
			userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
			severity: 'info',
			status: 'success'
		},
		{
			id: '5',
			timestamp: '2024-01-15 14:10:45',
			userId: 'manager@company.com',
			userName: 'Department Manager',
			action: 'Leave Approved',
			resource: 'Leave Management',
			details: 'Approved leave request for employee ID: EMP001',
			ipAddress: '192.168.1.110',
			userAgent: 'Mozilla/5.0 (Chrome/91.0.4472.124)',
			severity: 'info',
			status: 'success'
		}
	]);

	// Filters
	let searchQuery = $state('');
	let selectedSeverity = $state('all');
	let selectedAction = $state('all');
	let selectedDateRange = $state('today');
	let loading = $state(false);

	// Filter logs based on current filters
	const filteredLogs = $derived(() => {
		return auditLogs.filter((log) => {
			const matchesSearch =
				searchQuery === '' ||
				log.userName.toLowerCase().includes(searchQuery.toLowerCase()) ||
				log.action.toLowerCase().includes(searchQuery.toLowerCase()) ||
				log.details.toLowerCase().includes(searchQuery.toLowerCase());

			const matchesSeverity = selectedSeverity === 'all' || log.severity === selectedSeverity;
			const matchesAction = selectedAction === 'all' || log.action.includes(selectedAction);

			return matchesSearch && matchesSeverity && matchesAction;
		});
	});

	function getSeverityIcon(severity: string) {
		switch (severity) {
			case 'error':
				return AlertTriangle;
			case 'warning':
				return XCircle;
			case 'info':
				return Info;
			default:
				return CheckCircle;
		}
	}

	function getSeverityVariant(severity: string) {
		switch (severity) {
			case 'error':
				return 'destructive';
			case 'warning':
				return 'secondary';
			case 'info':
				return 'outline';
			default:
				return 'default';
		}
	}

	function getStatusIcon(status: string) {
		switch (status) {
			case 'success':
				return CheckCircle;
			case 'failure':
				return XCircle;
			default:
				return Info;
		}
	}

	function exportLogs() {
		loading = true;
		// Simulate export
		setTimeout(() => {
			loading = false;
			console.log('Exporting audit logs...');
		}, 2000);
	}

	function refreshLogs() {
		loading = true;
		// Simulate refresh
		setTimeout(() => {
			loading = false;
			console.log('Refreshing audit logs...');
		}, 1000);
	}

	function viewLogDetails(logId: string) {
		console.log('Viewing details for log:', logId);
	}
</script>

<svelte:head>
	<title>Audit & Logs - Admin Dashboard</title>
</svelte:head>

<div class="space-y-6">
	<!-- Header -->
	<div class="flex items-center justify-between">
		<div>
			<div class="mb-2 flex items-center gap-3">
				<Button variant="ghost" size="sm" href="/dashboard/admin" class="p-2">
					<ArrowLeft class="h-4 w-4" />
				</Button>
				<h1 class="flex items-center gap-3 text-3xl font-bold tracking-tight">
					<FileText class="h-8 w-8" />
					Audit & Logs
				</h1>
			</div>
			<p class="text-muted-foreground">View system audit logs and user activity tracking</p>
		</div>
		<div class="flex items-center gap-3">
			<Button variant="outline" onclick={refreshLogs} disabled={loading}>
				{#if loading}
					<RefreshCw class="mr-2 h-4 w-4 animate-spin" />
				{:else}
					<RefreshCw class="mr-2 h-4 w-4" />
				{/if}
				Refresh
			</Button>
			<Button onclick={exportLogs} disabled={loading}>
				{#if loading}
					<div
						class="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent"
					></div>
				{:else}
					<Download class="mr-2 h-4 w-4" />
				{/if}
				Export Logs
			</Button>
		</div>
	</div>

	<!-- Summary Cards -->
	<div class="grid grid-cols-1 gap-6 md:grid-cols-4">
		<Card.Root>
			<Card.Content class="p-6">
				<div class="flex items-center justify-between">
					<div>
						<p class="text-sm font-medium text-muted-foreground">Total Events</p>
						<p class="text-2xl font-bold">1,284</p>
					</div>
					<Activity class="h-8 w-8 text-muted-foreground" />
				</div>
			</Card.Content>
		</Card.Root>
		<Card.Root>
			<Card.Content class="p-6">
				<div class="flex items-center justify-between">
					<div>
						<p class="text-sm font-medium text-muted-foreground">Today</p>
						<p class="text-2xl font-bold text-blue-600">47</p>
					</div>
					<Calendar class="h-8 w-8 text-blue-600" />
				</div>
			</Card.Content>
		</Card.Root>
		<Card.Root>
			<Card.Content class="p-6">
				<div class="flex items-center justify-between">
					<div>
						<p class="text-sm font-medium text-muted-foreground">Failures</p>
						<p class="text-2xl font-bold text-red-600">3</p>
					</div>
					<AlertTriangle class="h-8 w-8 text-red-600" />
				</div>
			</Card.Content>
		</Card.Root>
		<Card.Root>
			<Card.Content class="p-6">
				<div class="flex items-center justify-between">
					<div>
						<p class="text-sm font-medium text-muted-foreground">Active Users</p>
						<p class="text-2xl font-bold text-green-600">12</p>
					</div>
					<User class="h-8 w-8 text-green-600" />
				</div>
			</Card.Content>
		</Card.Root>
	</div>

	<!-- Filters -->
	<Card.Root>
		<Card.Header>
			<Card.Title class="flex items-center gap-2">
				<Filter class="h-5 w-5" />
				Filters
			</Card.Title>
		</Card.Header>
		<Card.Content>
			<div class="grid grid-cols-1 gap-4 md:grid-cols-4">
				<div class="space-y-2">
					<Label for="search">Search</Label>
					<div class="relative">
						<Search class="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
						<Input
							id="search"
							placeholder="Search logs..."
							bind:value={searchQuery}
							class="pl-10"
						/>
					</div>
				</div>
				<div class="space-y-2">
					<Label>Severity</Label>
					<Select.Root bind:selected={selectedSeverity}>
						<Select.Trigger>
							<Select.Value placeholder="All Severities" />
						</Select.Trigger>
						<Select.Content>
							<Select.Item value="all">All Severities</Select.Item>
							<Select.Item value="error">Error</Select.Item>
							<Select.Item value="warning">Warning</Select.Item>
							<Select.Item value="info">Info</Select.Item>
						</Select.Content>
					</Select.Root>
				</div>
				<div class="space-y-2">
					<Label>Action Type</Label>
					<Select.Root bind:selected={selectedAction}>
						<Select.Trigger>
							<Select.Value placeholder="All Actions" />
						</Select.Trigger>
						<Select.Content>
							<Select.Item value="all">All Actions</Select.Item>
							<Select.Item value="Login">Login/Logout</Select.Item>
							<Select.Item value="User">User Management</Select.Item>
							<Select.Item value="Settings">Settings</Select.Item>
							<Select.Item value="Data">Data Operations</Select.Item>
						</Select.Content>
					</Select.Root>
				</div>
				<div class="space-y-2">
					<Label>Date Range</Label>
					<Select.Root bind:selected={selectedDateRange}>
						<Select.Trigger>
							<Select.Value placeholder="Today" />
						</Select.Trigger>
						<Select.Content>
							<Select.Item value="today">Today</Select.Item>
							<Select.Item value="week">This Week</Select.Item>
							<Select.Item value="month">This Month</Select.Item>
							<Select.Item value="year">This Year</Select.Item>
						</Select.Content>
					</Select.Root>
				</div>
			</div>
		</Card.Content>
	</Card.Root>

	<!-- Audit Logs Table -->
	<Card.Root>
		<Card.Header>
			<div class="flex items-center justify-between">
				<Card.Title>Audit Log Entries</Card.Title>
				<Badge variant="outline">{filteredLogs.length} entries</Badge>
			</div>
		</Card.Header>
		<Card.Content>
			{#if loading}
				<div class="space-y-4">
					{#each Array(5) as _}
						<div class="h-16 animate-pulse rounded bg-muted"></div>
					{/each}
				</div>
			{:else}
				<Table.Root>
					<Table.Header>
						<Table.Row>
							<Table.Head>Timestamp</Table.Head>
							<Table.Head>User</Table.Head>
							<Table.Head>Action</Table.Head>
							<Table.Head>Resource</Table.Head>
							<Table.Head>Severity</Table.Head>
							<Table.Head>Status</Table.Head>
							<Table.Head>IP Address</Table.Head>
							<Table.Head class="text-right">Actions</Table.Head>
						</Table.Row>
					</Table.Header>
					<Table.Body>
						{#each filteredLogs as log}
							<Table.Row>
								<Table.Cell class="font-mono text-sm">
									{log.timestamp}
								</Table.Cell>
								<Table.Cell>
									<div>
										<div class="font-medium">{log.userName}</div>
										<div class="text-sm text-muted-foreground">{log.userId}</div>
									</div>
								</Table.Cell>
								<Table.Cell>
									<div>
										<div class="font-medium">{log.action}</div>
										<div class="max-w-xs truncate text-sm text-muted-foreground">
											{log.details}
										</div>
									</div>
								</Table.Cell>
								<Table.Cell>
									<Badge variant="outline">{log.resource}</Badge>
								</Table.Cell>
								<Table.Cell>
									<Badge
										variant={getSeverityVariant(log.severity)}
										class="flex w-fit items-center gap-1"
									>
										<svelte:component this={getSeverityIcon(log.severity)} class="h-3 w-3" />
										{log.severity}
									</Badge>
								</Table.Cell>
								<Table.Cell>
									<Badge
										variant={log.status === 'success' ? 'default' : 'destructive'}
										class="flex w-fit items-center gap-1"
									>
										<svelte:component this={getStatusIcon(log.status)} class="h-3 w-3" />
										{log.status}
									</Badge>
								</Table.Cell>
								<Table.Cell class="font-mono text-sm">
									{log.ipAddress}
								</Table.Cell>
								<Table.Cell class="text-right">
									<Button variant="ghost" size="sm" onclick={() => viewLogDetails(log.id)}>
										<Eye class="h-4 w-4" />
									</Button>
								</Table.Cell>
							</Table.Row>
						{/each}
					</Table.Body>
				</Table.Root>

				{#if filteredLogs.length === 0}
					<div class="py-12 text-center">
						<FileText class="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
						<h3 class="text-lg font-medium">No logs found</h3>
						<p class="text-muted-foreground">Try adjusting your filters or search criteria.</p>
					</div>
				{/if}
			{/if}
		</Card.Content>
	</Card.Root>
</div>
