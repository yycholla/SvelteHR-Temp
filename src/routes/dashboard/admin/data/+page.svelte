<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import { Badge } from '$lib/components/ui/badge';
	import { Progress } from '$lib/components/ui/progress';
	import * as Card from '$lib/components/ui/card';
	import * as Table from '$lib/components/ui/table';
	import * as Tabs from '$lib/components/ui/tabs';
	import * as Dialog from '$lib/components/ui/dialog';
	import {
		Database,
		Building2,
		Users,
		FileText,
		Download,
		Upload,
		RefreshCw,
		Plus,
		Edit,
		Trash2,
		ArrowLeft,
		BarChart3,
		HardDrive,
		Clock,
		CheckCircle,
		AlertTriangle
	} from 'lucide-svelte';

	// Department data
	let departments = $state([
		{
			id: 'dept-1',
			name: 'Human Resources',
			description: 'Manages employee relations and policies',
			manager: 'Sarah Johnson',
			employees: 12,
			budget: 150000,
			status: 'active'
		},
		{
			id: 'dept-2',
			name: 'Engineering',
			description: 'Software development and technical operations',
			manager: 'John Smith',
			employees: 45,
			budget: 850000,
			status: 'active'
		},
		{
			id: 'dept-3',
			name: 'Marketing',
			description: 'Brand management and customer acquisition',
			manager: 'Emily Davis',
			employees: 18,
			budget: 250000,
			status: 'active'
		},
		{
			id: 'dept-4',
			name: 'Finance',
			description: 'Financial planning and accounting',
			manager: 'Michael Brown',
			employees: 8,
			budget: 120000,
			status: 'active'
		}
	]);

	// Database info
	let databaseInfo = $state({
		totalSize: '2.3 GB',
		totalRecords: '12,450',
		lastBackup: '2024-01-15 03:00:00',
		backupStatus: 'success',
		connections: 15,
		performance: 'good'
	});

	// Recent operations
	let recentOperations = $state([
		{
			id: 'op-1',
			operation: 'Data Export',
			table: 'employees',
			records: 127,
			timestamp: '2024-01-15 14:30:22',
			status: 'completed',
			user: 'admin@company.com'
		},
		{
			id: 'op-2',
			operation: 'Backup',
			table: 'all',
			records: 12450,
			timestamp: '2024-01-15 03:00:00',
			status: 'completed',
			user: 'system'
		},
		{
			id: 'op-3',
			operation: 'Data Import',
			table: 'departments',
			records: 2,
			timestamp: '2024-01-14 16:45:12',
			status: 'completed',
			user: 'hr@company.com'
		}
	]);

	let loading = $state(false);
	let showCreateDepartment = $state(false);
	let newDepartment = $state({
		name: '',
		description: '',
		manager: '',
		budget: 0
	});

	function createDepartment() {
		loading = true;
		setTimeout(() => {
			departments.push({
				id: `dept-${departments.length + 1}`,
				name: newDepartment.name,
				description: newDepartment.description,
				manager: newDepartment.manager,
				employees: 0,
				budget: newDepartment.budget,
				status: 'active'
			});
			newDepartment = { name: '', description: '', manager: '', budget: 0 };
			showCreateDepartment = false;
			loading = false;
		}, 1000);
	}

	function deleteDepartment(id: string) {
		departments = departments.filter(dept => dept.id !== id);
	}

	function exportData(type: string) {
		loading = true;
		setTimeout(() => {
			loading = false;
			console.log(`Exporting ${type} data...`);
		}, 2000);
	}

	function runBackup() {
		loading = true;
		setTimeout(() => {
			loading = false;
			databaseInfo.lastBackup = new Date().toISOString().slice(0, 19).replace('T', ' ');
			console.log('Backup completed');
		}, 3000);
	}

	function getStatusIcon(status: string) {
		switch (status) {
			case 'completed':
			case 'success': return CheckCircle;
			case 'failed':
			case 'error': return AlertTriangle;
			default: return Clock;
		}
	}

	function getStatusVariant(status: string) {
		switch (status) {
			case 'completed':
			case 'success': return 'default';
			case 'failed':
			case 'error': return 'destructive';
			default: return 'secondary';
		}
	}
</script>

<svelte:head>
	<title>Data Management - Admin Dashboard</title>
</svelte:head>

<div class="space-y-6">
	<!-- Header -->
	<div class="flex items-center justify-between">
		<div>
			<div class="flex items-center gap-3 mb-2">
				<Button variant="ghost" size="sm" href="/dashboard/admin" class="p-2">
					<ArrowLeft class="h-4 w-4" />
				</Button>
				<h1 class="text-3xl font-bold tracking-tight flex items-center gap-3">
					<Database class="h-8 w-8" />
					Data Management
				</h1>
			</div>
			<p class="text-muted-foreground">
				Manage departments, system data, and database operations
			</p>
		</div>
		<div class="flex items-center gap-3">
			<Button variant="outline" onclick={runBackup} disabled={loading}>
				{#if loading}
					<RefreshCw class="h-4 w-4 mr-2 animate-spin" />
				{:else}
					<HardDrive class="h-4 w-4 mr-2" />
				{/if}
				Backup Now
			</Button>
		</div>
	</div>

	<!-- Database Overview -->
	<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
		<Card.Root>
			<Card.Content class="p-6">
				<div class="flex items-center justify-between">
					<div>
						<p class="text-sm font-medium text-muted-foreground">Database Size</p>
						<p class="text-2xl font-bold">{databaseInfo.totalSize}</p>
					</div>
					<HardDrive class="h-8 w-8 text-muted-foreground" />
				</div>
			</Card.Content>
		</Card.Root>
		<Card.Root>
			<Card.Content class="p-6">
				<div class="flex items-center justify-between">
					<div>
						<p class="text-sm font-medium text-muted-foreground">Total Records</p>
						<p class="text-2xl font-bold">{databaseInfo.totalRecords}</p>
					</div>
					<FileText class="h-8 w-8 text-blue-600" />
				</div>
			</Card.Content>
		</Card.Root>
		<Card.Root>
			<Card.Content class="p-6">
				<div class="flex items-center justify-between">
					<div>
						<p class="text-sm font-medium text-muted-foreground">Active Connections</p>
						<p class="text-2xl font-bold text-green-600">{databaseInfo.connections}</p>
					</div>
					<Users class="h-8 w-8 text-green-600" />
				</div>
			</Card.Content>
		</Card.Root>
		<Card.Root>
			<Card.Content class="p-6">
				<div class="flex items-center justify-between">
					<div>
						<p class="text-sm font-medium text-muted-foreground">Performance</p>
						<p class="text-2xl font-bold text-green-600 capitalize">{databaseInfo.performance}</p>
					</div>
					<BarChart3 class="h-8 w-8 text-green-600" />
				</div>
			</Card.Content>
		</Card.Root>
	</div>

	<!-- Main Content Tabs -->
	<Tabs.Root value="departments" class="space-y-6">
		<Tabs.List>
			<Tabs.Trigger value="departments" class="flex items-center gap-2">
				<Building2 class="h-4 w-4" />
				Departments
			</Tabs.Trigger>
			<Tabs.Trigger value="exports" class="flex items-center gap-2">
				<Download class="h-4 w-4" />
				Data Exports
			</Tabs.Trigger>
			<Tabs.Trigger value="operations" class="flex items-center gap-2">
				<RefreshCw class="h-4 w-4" />
				Recent Operations
			</Tabs.Trigger>
		</Tabs.List>

		<!-- Departments Tab -->
		<Tabs.Content value="departments">
			<Card.Root>
				<Card.Header>
					<div class="flex items-center justify-between">
						<Card.Title class="flex items-center gap-2">
							<Building2 class="h-5 w-5" />
							Department Management
						</Card.Title>
						<Button onclick={() => showCreateDepartment = true}>
							<Plus class="h-4 w-4 mr-2" />
							Add Department
						</Button>
					</div>
				</Card.Header>
				<Card.Content>
					<Table.Root>
						<Table.Header>
							<Table.Row>
								<Table.Head>Department</Table.Head>
								<Table.Head>Manager</Table.Head>
								<Table.Head>Employees</Table.Head>
								<Table.Head>Budget</Table.Head>
								<Table.Head>Status</Table.Head>
								<Table.Head class="text-right">Actions</Table.Head>
							</Table.Row>
						</Table.Header>
						<Table.Body>
							{#each departments as dept}
								<Table.Row>
									<Table.Cell>
										<div>
											<div class="font-medium">{dept.name}</div>
											<div class="text-sm text-muted-foreground">{dept.description}</div>
										</div>
									</Table.Cell>
									<Table.Cell>{dept.manager}</Table.Cell>
									<Table.Cell>
										<Badge variant="outline">{dept.employees} employees</Badge>
									</Table.Cell>
									<Table.Cell>${dept.budget.toLocaleString()}</Table.Cell>
									<Table.Cell>
										<Badge variant={dept.status === 'active' ? 'default' : 'secondary'}>
											{dept.status}
										</Badge>
									</Table.Cell>
									<Table.Cell class="text-right">
										<div class="flex items-center gap-2 justify-end">
											<Button variant="ghost" size="sm">
												<Edit class="h-4 w-4" />
											</Button>
											<Button variant="ghost" size="sm" onclick={() => deleteDepartment(dept.id)}>
												<Trash2 class="h-4 w-4" />
											</Button>
										</div>
									</Table.Cell>
								</Table.Row>
							{/each}
						</Table.Body>
					</Table.Root>
				</Card.Content>
			</Card.Root>
		</Tabs.Content>

		<!-- Data Exports Tab -->
		<Tabs.Content value="exports">
			<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
				<Card.Root>
					<Card.Header>
						<Card.Title class="flex items-center gap-2">
							<Users class="h-5 w-5" />
							Employee Data
						</Card.Title>
						<Card.Description>Export all employee records and information</Card.Description>
					</Card.Header>
					<Card.Content>
						<div class="space-y-4">
							<div class="text-sm text-muted-foreground">
								127 employee records available
							</div>
							<Button class="w-full" onclick={() => exportData('employees')} disabled={loading}>
								<Download class="h-4 w-4 mr-2" />
								Export Employee Data
							</Button>
						</div>
					</Card.Content>
				</Card.Root>

				<Card.Root>
					<Card.Header>
						<Card.Title class="flex items-center gap-2">
							<Building2 class="h-5 w-5" />
							Department Data
						</Card.Title>
						<Card.Description>Export department structure and information</Card.Description>
					</Card.Header>
					<Card.Content>
						<div class="space-y-4">
							<div class="text-sm text-muted-foreground">
								{departments.length} departments available
							</div>
							<Button class="w-full" onclick={() => exportData('departments')} disabled={loading}>
								<Download class="h-4 w-4 mr-2" />
								Export Department Data
							</Button>
						</div>
					</Card.Content>
				</Card.Root>

				<Card.Root>
					<Card.Header>
						<Card.Title class="flex items-center gap-2">
							<FileText class="h-5 w-5" />
							System Reports
						</Card.Title>
						<Card.Description>Generate comprehensive system reports</Card.Description>
					</Card.Header>
					<Card.Content>
						<div class="space-y-4">
							<div class="text-sm text-muted-foreground">
								Full system audit and analytics
							</div>
							<Button class="w-full" onclick={() => exportData('reports')} disabled={loading}>
								<Download class="h-4 w-4 mr-2" />
								Generate Report
							</Button>
						</div>
					</Card.Content>
				</Card.Root>
			</div>
		</Tabs.Content>

		<!-- Recent Operations Tab -->
		<Tabs.Content value="operations">
			<Card.Root>
				<Card.Header>
					<Card.Title class="flex items-center gap-2">
						<Clock class="h-5 w-5" />
						Recent Database Operations
					</Card.Title>
				</Card.Header>
				<Card.Content>
					<Table.Root>
						<Table.Header>
							<Table.Row>
								<Table.Head>Operation</Table.Head>
								<Table.Head>Table/Resource</Table.Head>
								<Table.Head>Records</Table.Head>
								<Table.Head>User</Table.Head>
								<Table.Head>Timestamp</Table.Head>
								<Table.Head>Status</Table.Head>
							</Table.Row>
						</Table.Header>
						<Table.Body>
							{#each recentOperations as operation}
								<Table.Row>
									<Table.Cell class="font-medium">{operation.operation}</Table.Cell>
									<Table.Cell>
										<Badge variant="outline">{operation.table}</Badge>
									</Table.Cell>
									<Table.Cell>{operation.records.toLocaleString()}</Table.Cell>
									<Table.Cell>{operation.user}</Table.Cell>
									<Table.Cell class="font-mono text-sm">{operation.timestamp}</Table.Cell>
									<Table.Cell>
										<Badge variant={getStatusVariant(operation.status)} class="flex items-center gap-1 w-fit">
											<svelte:component this={getStatusIcon(operation.status)} class="h-3 w-3" />
											{operation.status}
										</Badge>
									</Table.Cell>
								</Table.Row>
							{/each}
						</Table.Body>
					</Table.Root>
				</Card.Content>
			</Card.Root>
		</Tabs.Content>
	</Tabs.Root>
</div>

<!-- Create Department Dialog -->
<Dialog.Root bind:open={showCreateDepartment}>
	<Dialog.Content>
		<Dialog.Header>
			<Dialog.Title>Create New Department</Dialog.Title>
			<Dialog.Description>
				Add a new department to the organization structure.
			</Dialog.Description>
		</Dialog.Header>
		<div class="space-y-4">
			<div class="space-y-2">
				<Label for="deptName">Department Name</Label>
				<Input id="deptName" bind:value={newDepartment.name} placeholder="Engineering" />
			</div>
			<div class="space-y-2">
				<Label for="deptDesc">Description</Label>
				<Input id="deptDesc" bind:value={newDepartment.description} placeholder="Software development and technical operations" />
			</div>
			<div class="space-y-2">
				<Label for="deptManager">Manager</Label>
				<Input id="deptManager" bind:value={newDepartment.manager} placeholder="John Smith" />
			</div>
			<div class="space-y-2">
				<Label for="deptBudget">Budget</Label>
				<Input id="deptBudget" type="number" bind:value={newDepartment.budget} placeholder="150000" />
			</div>
		</div>
		<Dialog.Footer>
			<Button variant="outline" onclick={() => showCreateDepartment = false}>Cancel</Button>
			<Button onclick={createDepartment} disabled={loading}>
				{#if loading}
					<div class="h-4 w-4 mr-2 animate-spin rounded-full border-2 border-current border-t-transparent"></div>
				{:else}
					<Plus class="h-4 w-4 mr-2" />
				{/if}
				Create Department
			</Button>
		</Dialog.Footer>
	</Dialog.Content>
</Dialog.Root>