<!--
	HR Processes Page
	
	Workflow management for HR processes like onboarding, performance reviews, 
	leave requests, and other organizational workflows
-->

<script lang="ts">
	import Button from '$lib/components/ui/Button.svelte';
	import Input from '$lib/components/ui/Input.svelte';
	import DataTable from '$lib/components/ui/DataTable.svelte';
	import Modal from '$lib/components/ui/Modal.svelte';
	import Form from '$lib/components/ui/Form.svelte';
	import type { PageData } from './$types';
	import { z } from 'zod';
	import { goto } from '$app/navigation';

	// Props from page data
	interface Props {
		data: PageData;
	}
	
	let { data }: Props = $props();

	// Process creation schema
	const processSchema = z.object({
		name: z.string().min(3, 'Process name is required').max(100, 'Name is too long'),
		description: z.string().optional(),
		type: z.enum(['ONBOARDING', 'PERFORMANCE_REVIEW', 'LEAVE_REQUEST', 'OFFBOARDING', 'PROMOTION', 'TRAINING']),
		priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']).default('MEDIUM'),
		assigneeId: z.string().optional(),
		dueDate: z.string().optional()
	});

	type ProcessForm = z.infer<typeof processSchema>;

	// Component state
	let processes = $state([
		{
			id: '1',
			name: 'New Employee Onboarding - John Smith',
			description: 'Complete onboarding process for new engineering hire',
			type: 'ONBOARDING',
			status: 'IN_PROGRESS',
			priority: 'HIGH',
			assignee: { id: '1', firstName: 'Sarah', lastName: 'Johnson', email: 'sarah.j@company.com' },
			requestor: { id: '2', firstName: 'Mike', lastName: 'Chen', email: 'mike.chen@company.com' },
			dueDate: '2024-03-20',
			createdAt: '2024-03-10T09:00:00Z',
			completedSteps: 3,
			totalSteps: 8,
			progressPercentage: 37
		},
		{
			id: '2',
			name: 'Q1 Performance Review - Lisa Wong',
			description: 'Quarterly performance review for marketing manager',
			type: 'PERFORMANCE_REVIEW',
			status: 'PENDING',
			priority: 'MEDIUM',
			assignee: { id: '3', firstName: 'David', lastName: 'Brown', email: 'david.brown@company.com' },
			requestor: { id: '4', firstName: 'Lisa', lastName: 'Wong', email: 'lisa.wong@company.com' },
			dueDate: '2024-03-25',
			createdAt: '2024-03-08T14:30:00Z',
			completedSteps: 0,
			totalSteps: 5,
			progressPercentage: 0
		},
		{
			id: '3',
			name: 'Leave Request - Annual Vacation',
			description: 'Annual vacation leave request for 2 weeks',
			type: 'LEAVE_REQUEST',
			status: 'APPROVED',
			priority: 'MEDIUM',
			assignee: { id: '1', firstName: 'Sarah', lastName: 'Johnson', email: 'sarah.j@company.com' },
			requestor: { id: '5', firstName: 'Alex', lastName: 'Johnson', email: 'alex.j@company.com' },
			dueDate: '2024-03-15',
			createdAt: '2024-03-05T10:15:00Z',
			completedSteps: 3,
			totalSteps: 3,
			progressPercentage: 100
		},
		{
			id: '4',
			name: 'Employee Promotion - Senior Developer',
			description: 'Promotion process for software developer to senior level',
			type: 'PROMOTION',
			status: 'UNDER_REVIEW',
			priority: 'HIGH',
			assignee: { id: '2', firstName: 'Mike', lastName: 'Chen', email: 'mike.chen@company.com' },
			requestor: { id: '6', firstName: 'Emma', lastName: 'Davis', email: 'emma.d@company.com' },
			dueDate: '2024-03-30',
			createdAt: '2024-03-07T16:45:00Z',
			completedSteps: 2,
			totalSteps: 6,
			progressPercentage: 33
		}
	]);

	let isLoading = $state(false);
	let searchQuery = $state('');
	let selectedProcesses = $state([]);
	let showCreateModal = $state(false);
	let showViewModal = $state(false);
	let viewingProcess = $state(null);
	let filterType = $state('');
	let filterStatus = $state('');

	// Process statistics
	const totalProcesses = $derived(processes.length);
	const activeProcesses = $derived(processes.filter(p => !['COMPLETED', 'CANCELLED', 'REJECTED'].includes(p.status)).length);
	const byStatus = $derived(processes.reduce((acc, process) => {
		acc[process.status] = (acc[process.status] || 0) + 1;
		return acc;
	}, {}));
	const byType = $derived(processes.reduce((acc, process) => {
		acc[process.type] = (acc[process.type] || 0) + 1;
		return acc;
	}, {}));

	// Process table columns
	const processColumns = [
		{
			key: 'name',
			label: 'Process',
			sortable: true,
			render: (value, row) => `
				<div>
					<div class="font-medium text-foreground">${value}</div>
					<div class="text-sm text-muted-foreground">${row.description || 'No description'}</div>
				</div>
			`
		},
		{
			key: 'type',
			label: 'Type',
			sortable: true,
			width: '140px',
			render: (value) => {
				const typeColors = {
					ONBOARDING: 'bg-green-100 text-green-800',
					PERFORMANCE_REVIEW: 'bg-blue-100 text-blue-800',
					LEAVE_REQUEST: 'bg-yellow-100 text-yellow-800',
					OFFBOARDING: 'bg-red-100 text-red-800',
					PROMOTION: 'bg-purple-100 text-purple-800',
					TRAINING: 'bg-indigo-100 text-indigo-800'
				};
				const typeLabels = {
					ONBOARDING: 'Onboarding',
					PERFORMANCE_REVIEW: 'Performance',
					LEAVE_REQUEST: 'Leave',
					OFFBOARDING: 'Offboarding',
					PROMOTION: 'Promotion',
					TRAINING: 'Training'
				};
				return `<span class="px-2 py-1 rounded-full text-xs font-medium ${typeColors[value] || typeColors.ONBOARDING}">${typeLabels[value] || value}</span>`;
			}
		},
		{
			key: 'status',
			label: 'Status',
			sortable: true,
			align: 'center',
			render: (value) => {
				const statusColors = {
					PENDING: 'bg-yellow-100 text-yellow-800',
					IN_PROGRESS: 'bg-blue-100 text-blue-800',
					UNDER_REVIEW: 'bg-purple-100 text-purple-800',
					APPROVED: 'bg-green-100 text-green-800',
					REJECTED: 'bg-red-100 text-red-800',
					COMPLETED: 'bg-gray-100 text-gray-800',
					CANCELLED: 'bg-gray-100 text-gray-800'
				};
				return `<span class="px-2 py-1 rounded-full text-xs font-medium ${statusColors[value] || statusColors.PENDING}">${value.replace('_', ' ')}</span>`;
			}
		},
		{
			key: 'progressPercentage',
			label: 'Progress',
			sortable: true,
			align: 'center',
			render: (value, row) => `
				<div class="flex flex-col items-center">
					<div class="w-full bg-gray-200 rounded-full h-2 mb-1">
						<div class="bg-primary h-2 rounded-full" style="width: ${value}%"></div>
					</div>
					<span class="text-xs text-muted-foreground">${row.completedSteps}/${row.totalSteps} steps</span>
				</div>
			`
		},
		{
			key: 'assignee',
			label: 'Assignee',
			sortable: true,
			render: (value) => value ? `
				<div>
					<div class="font-medium text-foreground">${value.firstName} ${value.lastName}</div>
					<div class="text-sm text-muted-foreground">${value.email}</div>
				</div>
			` : '<span class="text-muted-foreground">Unassigned</span>'
		},
		{
			key: 'dueDate',
			label: 'Due Date',
			sortable: true,
			align: 'right',
			render: (value, row) => {
				if (!value) return '<span class="text-muted-foreground">No due date</span>';
				const date = new Date(value);
				const isOverdue = date < new Date() && !['COMPLETED', 'APPROVED', 'REJECTED', 'CANCELLED'].includes(row.status);
				return `
					<div class="text-right">
						<div class="text-sm font-medium ${isOverdue ? 'text-red-600' : 'text-foreground'}">${date.toLocaleDateString()}</div>
						${isOverdue ? '<div class="text-xs text-red-600">Overdue</div>' : ''}
					</div>
				`;
			}
		},
		{
			key: 'actions',
			label: 'Actions',
			sortable: false,
			align: 'right',
			render: (value, row) => `
				<div class="flex items-center space-x-2">
					<button 
						class="text-blue-600 hover:text-blue-900 text-sm font-medium"
						onclick="viewProcess('${row.id}')"
					>
						View
					</button>
					<button 
						class="text-green-600 hover:text-green-900 text-sm font-medium"
						onclick="editProcess('${row.id}')"
					>
						Edit
					</button>
					<button 
						class="text-red-600 hover:text-red-900 text-sm font-medium"
						onclick="deleteProcess('${row.id}')"
					>
						Cancel
					</button>
				</div>
			`
		}
	];

	// Filtered processes
	const filteredProcesses = $derived(processes.filter(process => {
		const matchesSearch = !searchQuery || 
			process.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
			process.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
			(process.assignee && `${process.assignee.firstName} ${process.assignee.lastName}`.toLowerCase().includes(searchQuery.toLowerCase()));
		
		const matchesType = !filterType || process.type === filterType;
		const matchesStatus = !filterStatus || process.status === filterStatus;
		
		return matchesSearch && matchesType && matchesStatus;
	}).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));

	// Handle process creation
	async function handleCreateProcess(formData: ProcessForm) {
		isLoading = true;
		try {
			// TODO: Implement process creation via service
			const newProcess = {
				id: String(Date.now()),
				...formData,
				status: 'PENDING',
				requestor: { id: 'current-user', firstName: 'Current', lastName: 'User', email: 'user@company.com' },
				createdAt: new Date().toISOString(),
				completedSteps: 0,
				totalSteps: 5, // Default
				progressPercentage: 0
			};
			
			processes = [newProcess, ...processes];
			showCreateModal = false;
		} catch (error) {
			console.error('Error creating process:', error);
		} finally {
			isLoading = false;
		}
	}

	// Global functions for table actions
	(globalThis as any).viewProcess = (processId: string) => {
		const process = processes.find(p => p.id === processId);
		if (process) {
			viewingProcess = process;
			showViewModal = true;
		}
	};

	(globalThis as any).editProcess = (processId: string) => {
		goto(`/processes/${processId}/edit`);
	};

	(globalThis as any).deleteProcess = (processId: string) => {
		const process = processes.find(p => p.id === processId);
		if (process && confirm(`Are you sure you want to cancel "${process.name}"?`)) {
			// TODO: Implement process cancellation
			processes = processes.map(p => 
				p.id === processId ? { ...p, status: 'CANCELLED' } : p
			);
		}
	};

	// Handle search
	function handleSearch() {
		// Search is reactive via filteredProcesses
	}

	// Handle sort
	function handleSort(sort) {
		console.log('Sort by:', sort);
		// TODO: Implement sorting
	}

	// Handle row click
	function handleRowClick(process) {
		(globalThis as any).viewProcess(process.id);
	}

	// Handle selection change
	function handleSelectionChange(selected) {
		selectedProcesses = selected;
	}
</script>

<svelte:head>
	<title>HR Processes - MountainHR</title>
	<meta name="description" content="Workflow management and HR process tracking" />
</svelte:head>

<div class="space-y-6">
	<!-- Header -->
	<div class="flex items-center justify-between">
		<div>
			<h1 class="text-3xl font-bold text-foreground">HR Processes</h1>
			<p class="text-muted-foreground mt-1">
				Manage workflows for onboarding, performance reviews, and organizational processes
			</p>
		</div>
		
		<div class="flex items-center space-x-3">
			<Button variant="outline" onclick={() => goto('/processes/templates')}>
				📋 Templates
			</Button>
			<Button onclick={() => showCreateModal = true} disabled={isLoading}>
				➕ Start Process
			</Button>
		</div>
	</div>

	<!-- Process Statistics -->
	<div class="grid grid-cols-1 md:grid-cols-4 gap-6">
		<div class="bg-card border rounded-lg p-6">
			<div class="flex items-center justify-between">
				<div>
					<p class="text-sm font-medium text-muted-foreground">Total Processes</p>
					<p class="text-3xl font-bold text-foreground">{totalProcesses}</p>
				</div>
				<div class="w-12 h-12 bg-blue-500/10 rounded-lg flex items-center justify-center">
					<span class="text-2xl">⚙️</span>
				</div>
			</div>
		</div>

		<div class="bg-card border rounded-lg p-6">
			<div class="flex items-center justify-between">
				<div>
					<p class="text-sm font-medium text-muted-foreground">Active Processes</p>
					<p class="text-3xl font-bold text-foreground">{activeProcesses}</p>
				</div>
				<div class="w-12 h-12 bg-green-500/10 rounded-lg flex items-center justify-center">
					<span class="text-2xl">🔄</span>
				</div>
			</div>
		</div>

		<div class="bg-card border rounded-lg p-6">
			<div class="flex items-center justify-between">
				<div>
					<p class="text-sm font-medium text-muted-foreground">Pending Approval</p>
					<p class="text-3xl font-bold text-foreground">{byStatus.PENDING || 0}</p>
				</div>
				<div class="w-12 h-12 bg-yellow-500/10 rounded-lg flex items-center justify-center">
					<span class="text-2xl">⏳</span>
				</div>
			</div>
		</div>

		<div class="bg-card border rounded-lg p-6">
			<div class="flex items-center justify-between">
				<div>
					<p class="text-sm font-medium text-muted-foreground">Completed</p>
					<p class="text-3xl font-bold text-foreground">{(byStatus.COMPLETED || 0) + (byStatus.APPROVED || 0)}</p>
				</div>
				<div class="w-12 h-12 bg-purple-500/10 rounded-lg flex items-center justify-center">
					<span class="text-2xl">✅</span>
				</div>
			</div>
		</div>
	</div>

	<!-- Process Types Overview -->
	<div class="bg-card border rounded-lg p-6">
		<h2 class="text-xl font-semibold text-foreground mb-4">Process Types</h2>
		<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
			{#each Object.entries(byType) as [type, count]}
				<div class="border rounded-lg p-4 hover:bg-accent/50 transition-colors cursor-pointer" onclick={() => { filterType = type; handleSearch(); }}>
					<div class="flex items-center justify-between">
						<div>
							<h3 class="font-semibold text-foreground">
								{type.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
							</h3>
							<p class="text-sm text-muted-foreground">
								{count} active process{count !== 1 ? 'es' : ''}
							</p>
						</div>
						<div class="text-2xl">
							{#if type === 'ONBOARDING'}
								🎯
							{:else if type === 'PERFORMANCE_REVIEW'}
								⭐
							{:else if type === 'LEAVE_REQUEST'}
								🏖️
							{:else if type === 'OFFBOARDING'}
								👋
							{:else if type === 'PROMOTION'}
								📈
							{:else if type === 'TRAINING'}
								📚
							{:else}
								⚙️
							{/if}
						</div>
					</div>
				</div>
			{/each}
		</div>
	</div>

	<!-- Filters and Search -->
	<div class="bg-card border rounded-lg p-6">
		<div class="flex items-center space-x-4 mb-4">
			<div class="flex-1">
				<Input
					type="search"
					placeholder="Search processes..."
					bind:value={searchQuery}
					oninput={handleSearch}
					class="max-w-md"
				/>
			</div>
			
			<div class="flex items-center space-x-3">
				<select
					bind:value={filterType}
					onchange={handleSearch}
					class="border border-input rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
				>
					<option value="">All Types</option>
					<option value="ONBOARDING">Onboarding</option>
					<option value="PERFORMANCE_REVIEW">Performance Review</option>
					<option value="LEAVE_REQUEST">Leave Request</option>
					<option value="OFFBOARDING">Offboarding</option>
					<option value="PROMOTION">Promotion</option>
					<option value="TRAINING">Training</option>
				</select>
				
				<select
					bind:value={filterStatus}
					onchange={handleSearch}
					class="border border-input rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
				>
					<option value="">All Statuses</option>
					<option value="PENDING">Pending</option>
					<option value="IN_PROGRESS">In Progress</option>
					<option value="UNDER_REVIEW">Under Review</option>
					<option value="APPROVED">Approved</option>
					<option value="COMPLETED">Completed</option>
					<option value="REJECTED">Rejected</option>
					<option value="CANCELLED">Cancelled</option>
				</select>
			</div>
		</div>

		<!-- Results Summary -->
		<div class="flex items-center justify-between text-sm text-muted-foreground">
			<span>
				Showing {filteredProcesses.length} of {totalProcesses} processes
			</span>
			
			{#if selectedProcesses.length > 0}
				<span class="text-primary font-medium">
					{selectedProcesses.length} selected
				</span>
			{/if}
		</div>
	</div>

	<!-- Processes Data Table -->
	<div class="bg-card border rounded-lg overflow-hidden">
		<DataTable
			data={filteredProcesses}
			columns={processColumns}
			{isLoading}
			selectable
			bind:selectedRows={selectedProcesses}
			onSort={handleSort}
			onSelectionChange={handleSelectionChange}
			onRowClick={handleRowClick}
			emptyMessage="No processes found"
			hover
		/>
	</div>
</div>

<!-- Create Process Modal -->
<Modal bind:open={showCreateModal} title="Start New Process" size="lg">
	{#snippet content()}
		<Form
			schema={processSchema}
			onSubmit={handleCreateProcess}
			class="space-y-4"
		>
			{#snippet content({ form, errors, handleChange, handleBlur })}
				<Input
					name="name"
					label="Process Name"
					required
					bind:value={form.name}
					error={errors.name}
					oninput={(e) => handleChange('name', e.currentTarget.value)}
					onblur={(e) => handleBlur('name', e.currentTarget.value)}
				/>
				
				<div class="grid grid-cols-1 md:grid-cols-2 gap-4">
					<div>
						<label class="block text-sm font-medium mb-2">Process Type</label>
						<select
							bind:value={form.type}
							onchange={(e) => handleChange('type', e.currentTarget.value)}
							class="w-full border border-input rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
						>
							<option value="ONBOARDING">Employee Onboarding</option>
							<option value="PERFORMANCE_REVIEW">Performance Review</option>
							<option value="LEAVE_REQUEST">Leave Request</option>
							<option value="OFFBOARDING">Employee Offboarding</option>
							<option value="PROMOTION">Employee Promotion</option>
							<option value="TRAINING">Training Request</option>
						</select>
						{#if errors.type}
							<p class="text-sm text-destructive mt-1">{errors.type}</p>
						{/if}
					</div>
					
					<div>
						<label class="block text-sm font-medium mb-2">Priority</label>
						<select
							bind:value={form.priority}
							onchange={(e) => handleChange('priority', e.currentTarget.value)}
							class="w-full border border-input rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
						>
							<option value="LOW">Low</option>
							<option value="MEDIUM">Medium</option>
							<option value="HIGH">High</option>
							<option value="URGENT">Urgent</option>
						</select>
						{#if errors.priority}
							<p class="text-sm text-destructive mt-1">{errors.priority}</p>
						{/if}
					</div>
				</div>
				
				<div>
					<label class="block text-sm font-medium mb-2">Description</label>
					<textarea
						bind:value={form.description}
						oninput={(e) => handleChange('description', e.currentTarget.value)}
						onblur={(e) => handleBlur('description', e.currentTarget.value)}
						placeholder="Describe the purpose and details of this process..."
						rows="4"
						class="w-full border border-input rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
					></textarea>
					{#if errors.description}
						<p class="text-sm text-destructive mt-1">{errors.description}</p>
					{/if}
				</div>
				
				<Input
					name="dueDate"
					type="date"
					label="Due Date (Optional)"
					bind:value={form.dueDate}
					error={errors.dueDate}
					oninput={(e) => handleChange('dueDate', e.currentTarget.value)}
					onblur={(e) => handleBlur('dueDate', e.currentTarget.value)}
				/>
			{/snippet}
		</Form>
	{/snippet}
	
	{#snippet actions()}
		<Button variant="outline" onclick={() => showCreateModal = false}>
			Cancel
		</Button>
		<Button type="submit" loading={isLoading} disabled={isLoading}>
			Start Process
		</Button>
	{/snippet}
</Modal>

<!-- View Process Modal -->
{#if viewingProcess}
	<Modal bind:open={showViewModal} title="Process Details" size="xl">
		{#snippet content()}
			<div class="space-y-6">
				<!-- Process Header -->
				<div class="border-b pb-4">
					<div class="flex items-center justify-between mb-2">
						<h3 class="text-lg font-semibold text-foreground">{viewingProcess.name}</h3>
						<div class="flex items-center space-x-2">
							<span class="px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
								{viewingProcess.type.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
							</span>
							<span class="px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
								{viewingProcess.status.replace('_', ' ')}
							</span>
						</div>
					</div>
					
					<div class="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-muted-foreground">
						<div>
							<strong>Requestor:</strong> {viewingProcess.requestor.firstName} {viewingProcess.requestor.lastName}
						</div>
						<div>
							<strong>Assignee:</strong> {viewingProcess.assignee ? `${viewingProcess.assignee.firstName} ${viewingProcess.assignee.lastName}` : 'Unassigned'}
						</div>
						<div>
							<strong>Due Date:</strong> {viewingProcess.dueDate ? new Date(viewingProcess.dueDate).toLocaleDateString() : 'Not set'}
						</div>
					</div>
				</div>
				
				<!-- Process Progress -->
				<div>
					<div class="flex items-center justify-between mb-2">
						<h4 class="font-medium text-foreground">Progress</h4>
						<span class="text-sm text-muted-foreground">
							{viewingProcess.completedSteps}/{viewingProcess.totalSteps} steps completed
						</span>
					</div>
					<div class="w-full bg-gray-200 rounded-full h-3">
						<div 
							class="bg-primary h-3 rounded-full transition-all duration-300" 
							style="width: {viewingProcess.progressPercentage}%"
						></div>
					</div>
					<p class="text-sm text-muted-foreground mt-1">
						{viewingProcess.progressPercentage}% complete
					</p>
				</div>
				
				<!-- Process Description -->
				{#if viewingProcess.description}
					<div>
						<h4 class="font-medium text-foreground mb-2">Description</h4>
						<p class="text-muted-foreground">{viewingProcess.description}</p>
					</div>
				{/if}
				
				<!-- Process Timeline (Mock) -->
				<div>
					<h4 class="font-medium text-foreground mb-3">Timeline</h4>
					<div class="space-y-3">
						<div class="flex items-start space-x-3">
							<div class="w-2 h-2 bg-green-500 rounded-full mt-2"></div>
							<div class="flex-1">
								<div class="font-medium text-foreground">Process Started</div>
								<div class="text-sm text-muted-foreground">
									{new Date(viewingProcess.createdAt).toLocaleString()}
								</div>
							</div>
						</div>
						
						{#if viewingProcess.progressPercentage > 0}
							<div class="flex items-start space-x-3">
								<div class="w-2 h-2 bg-blue-500 rounded-full mt-2"></div>
								<div class="flex-1">
									<div class="font-medium text-foreground">Initial Steps Completed</div>
									<div class="text-sm text-muted-foreground">Progress update</div>
								</div>
							</div>
						{/if}
						
						{#if viewingProcess.status === 'COMPLETED' || viewingProcess.status === 'APPROVED'}
							<div class="flex items-start space-x-3">
								<div class="w-2 h-2 bg-green-500 rounded-full mt-2"></div>
								<div class="flex-1">
									<div class="font-medium text-foreground">Process Completed</div>
									<div class="text-sm text-muted-foreground">All requirements fulfilled</div>
								</div>
							</div>
						{/if}
					</div>
				</div>
			</div>
		{/snippet}
		
		{#snippet actions()}
			<Button variant="outline" onclick={() => showViewModal = false}>
				Close
			</Button>
			<Button onclick={() => goto(`/processes/${viewingProcess.id}`)}>
				Manage Process
			</Button>
		{/snippet}
	</Modal>
{/if}

<style>
	/* Custom progress bar animations */
	.bg-primary {
		transition: width 0.3s ease-in-out;
	}

	/* Timeline styling */
	.space-y-3 > :not([hidden]) ~ :not([hidden]) {
		--tw-space-y-reverse: 0;
		margin-top: calc(0.75rem * calc(1 - var(--tw-space-y-reverse)));
		margin-bottom: calc(0.75rem * var(--tw-space-y-reverse));
	}
</style>