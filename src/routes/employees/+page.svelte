<!--
	Employee Management Page
	
	Comprehensive employee management with search, filtering, and CRUD operations
	Uses the employee service and data table components
-->

<script lang="ts">
	import Button from '$lib/components/ui/Button.svelte';
	import Input from '$lib/components/ui/Input.svelte';
	import DataTable from '$lib/components/ui/DataTable.svelte';
	import Modal from '$lib/components/ui/Modal.svelte';
	import Form from '$lib/components/ui/Form.svelte';
	import { employeeService } from '$lib/services/employee.service';
	import { goto } from '$app/navigation';
	import { page } from '$app/stores';
	import type { PageData } from './$types';
	import { z } from 'zod';
	import { onMount } from 'svelte';

	// Props from page data
	export let data: PageData;

	// Employee form schema
	const employeeSchema = z.object({
		firstName: z.string().min(1, 'First name is required').max(50, 'First name is too long'),
		lastName: z.string().min(1, 'Last name is required').max(50, 'Last name is too long'),
		email: z.string().min(1, 'Email is required').email('Please enter a valid email'),
		phone: z.string().optional(),
		department: z.string().min(1, 'Department is required'),
		position: z.string().min(1, 'Position is required'),
		startDate: z.string().min(1, 'Start date is required'),
		salary: z.number().min(0, 'Salary must be positive').optional()
	});

	type EmployeeForm = z.infer<typeof employeeSchema>;

	// Component state
	let employees = $state(data.employees || []);
	let isLoading = $state(false);
	let searchQuery = $state('');
	let selectedEmployees = $state([]);
	let showAddModal = $state(false);
	let showEditModal = $state(false);
	let showDeleteModal = $state(false);
	let editingEmployee = $state(null);
	let showFilters = $state(false);

	// Filter states
	let departmentFilter = $state('');
	let statusFilter = $state('');

	// Pagination state
	let currentPage = $state(1);
	let pageSize = $state(20);
	let totalCount = $state(data.total || 0);

	// Employee table columns
	const employeeColumns = [
		{
			key: 'employeeId',
			label: 'ID',
			sortable: true,
			width: '100px'
		},
		{
			key: 'firstName',
			label: 'First Name',
			sortable: true,
			render: (value, row) => `${row.firstName} ${row.lastName}`
		},
		{
			key: 'email',
			label: 'Email',
			sortable: true
		},
		{
			key: 'department',
			label: 'Department',
			sortable: true,
			render: (value, row) => row.department?.name || 'N/A'
		},
		{
			key: 'position',
			label: 'Position',
			sortable: true,
			render: (value, row) => row.position?.title || 'N/A'
		},
		{
			key: 'status',
			label: 'Status',
			sortable: true,
			align: 'center',
			render: (value) => {
				const statusColors = {
					ACTIVE: 'bg-green-100 text-green-800',
					INACTIVE: 'bg-gray-100 text-gray-800',
					TERMINATED: 'bg-red-100 text-red-800'
				};
				return `<span class="px-2 py-1 rounded-full text-xs font-medium ${statusColors[value] || statusColors.ACTIVE}">${value}</span>`;
			}
		},
		{
			key: 'actions',
			label: 'Actions',
			sortable: false,
			align: 'right',
			render: (value, row, index) => renderActions(row, index)
		}
	];

	// Render action buttons for each row
	function renderActions(employee, index) {
		return `
			<div class="flex items-center space-x-2">
				<button 
					class="text-blue-600 hover:text-blue-900 text-sm font-medium"
					onclick="editEmployee('${employee.id}')"
				>
					Edit
				</button>
				<button 
					class="text-red-600 hover:text-red-900 text-sm font-medium"
					onclick="deleteEmployee('${employee.id}')"
				>
					Delete
				</button>
			</div>
		`;
	}

	// Filtered employees
	$: filteredEmployees = employees.filter(employee => {
		const matchesSearch = !searchQuery || 
			employee.firstName.toLowerCase().includes(searchQuery.toLowerCase()) ||
			employee.lastName.toLowerCase().includes(searchQuery.toLowerCase()) ||
			employee.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
			employee.employeeId.toLowerCase().includes(searchQuery.toLowerCase());
		
		const matchesDepartment = !departmentFilter || employee.department?.id === departmentFilter;
		const matchesStatus = !statusFilter || employee.status === statusFilter;
		
		return matchesSearch && matchesDepartment && matchesStatus;
	});

	// Load employees from service
	async function loadEmployees() {
		isLoading = true;
		try {
			const result = await employeeService.getEmployees({
				page: currentPage,
				limit: pageSize,
				search: searchQuery || undefined,
				departmentId: departmentFilter || undefined,
				status: statusFilter || undefined
			});

			if (result.success && result.data) {
				employees = result.data.employees;
				totalCount = result.data.total;
			}
		} catch (error) {
			console.error('Failed to load employees:', error);
		} finally {
			isLoading = false;
		}
	}

	// Handle employee creation
	async function handleCreateEmployee(formData: EmployeeForm) {
		isLoading = true;
		try {
			const result = await employeeService.createEmployee(formData);
			
			if (result.success) {
				showAddModal = false;
				await loadEmployees(); // Refresh list
			} else {
				console.error('Failed to create employee:', result.error);
			}
		} catch (error) {
			console.error('Error creating employee:', error);
		} finally {
			isLoading = false;
		}
	}

	// Handle employee update
	async function handleUpdateEmployee(formData: EmployeeForm) {
		if (!editingEmployee) return;
		
		isLoading = true;
		try {
			const result = await employeeService.updateEmployee(editingEmployee.id, formData);
			
			if (result.success) {
				showEditModal = false;
				editingEmployee = null;
				await loadEmployees(); // Refresh list
			} else {
				console.error('Failed to update employee:', result.error);
			}
		} catch (error) {
			console.error('Error updating employee:', error);
		} finally {
			isLoading = false;
		}
	}

	// Handle employee deletion
	async function handleDeleteEmployee() {
		if (!editingEmployee) return;
		
		isLoading = true;
		try {
			const result = await employeeService.deleteEmployee(editingEmployee.id);
			
			if (result.success) {
				showDeleteModal = false;
				editingEmployee = null;
				await loadEmployees(); // Refresh list
			} else {
				console.error('Failed to delete employee:', result.error);
			}
		} catch (error) {
			console.error('Error deleting employee:', error);
		} finally {
			isLoading = false;
		}
	}

	// Global functions for table actions
	(globalThis as any).editEmployee = (employeeId: string) => {
		const employee = employees.find(emp => emp.id === employeeId);
		if (employee) {
			editingEmployee = employee;
			showEditModal = true;
		}
	};

	(globalThis as any).deleteEmployee = (employeeId: string) => {
		const employee = employees.find(emp => emp.id === employeeId);
		if (employee) {
			editingEmployee = employee;
			showDeleteModal = true;
		}
	};

	// Handle search
	function handleSearch() {
		currentPage = 1; // Reset to first page
		loadEmployees();
	}

	// Handle sort
	function handleSort(sort) {
		// TODO: Implement sorting
		console.log('Sort by:', sort);
	}

	// Handle page change
	function handlePageChange(page: number) {
		currentPage = page;
		loadEmployees();
	}

	// Handle selection change
	function handleSelectionChange(selected) {
		selectedEmployees = selected;
	}

	// Handle row click
	function handleRowClick(employee) {
		goto(`/employees/${employee.id}`);
	}

	// Export employees
	function exportEmployees() {
		// TODO: Implement CSV export
		console.log('Exporting employees...');
	}

	// Clear filters
	function clearFilters() {
		searchQuery = '';
		departmentFilter = '';
		statusFilter = '';
		currentPage = 1;
		loadEmployees();
	}

	// Initialize
	onMount(() => {
		if (!data.employees) {
			loadEmployees();
		}
	});
</script>

<svelte:head>
	<title>Employee Management - MountainHR</title>
	<meta name="description" content="Manage employees, departments, and organizational structure" />
</svelte:head>

<div class="space-y-6">
	<!-- Header -->
	<div class="flex items-center justify-between">
		<div>
			<h1 class="text-3xl font-bold text-foreground">Employees</h1>
			<p class="text-muted-foreground mt-1">
				Manage your organization's employees and their information
			</p>
		</div>
		
		<div class="flex items-center space-x-3">
			<Button variant="outline" onclick={exportEmployees} disabled={isLoading}>
				📊 Export
			</Button>
			<Button onclick={() => showAddModal = true} disabled={isLoading}>
				👤 Add Employee
			</Button>
		</div>
	</div>

	<!-- Search and Filters -->
	<div class="bg-card border rounded-lg p-6">
		<div class="flex items-center space-x-4 mb-4">
			<div class="flex-1">
				<Input
					type="search"
					placeholder="Search employees by name, email, or ID..."
					bind:value={searchQuery}
					oninput={handleSearch}
					class="max-w-md"
				/>
			</div>
			
			<Button
				variant="outline"
				onclick={() => showFilters = !showFilters}
				class="flex items-center space-x-2"
			>
				<span>🔍</span>
				<span>Filters</span>
				{#if departmentFilter || statusFilter}
					<span class="bg-primary text-primary-foreground rounded-full px-2 py-1 text-xs">
						{(departmentFilter ? 1 : 0) + (statusFilter ? 1 : 0)}
					</span>
				{/if}
			</Button>
		</div>

		<!-- Expanded Filters -->
		{#if showFilters}
			<div class="border-t pt-4 mt-4">
				<div class="grid grid-cols-1 md:grid-cols-3 gap-4">
					<div>
						<label class="block text-sm font-medium mb-2">Department</label>
						<select
							bind:value={departmentFilter}
							onchange={handleSearch}
							class="w-full border border-input rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
						>
							<option value="">All Departments</option>
							<option value="eng">Engineering</option>
							<option value="hr">Human Resources</option>
							<option value="sales">Sales</option>
							<option value="marketing">Marketing</option>
						</select>
					</div>
					
					<div>
						<label class="block text-sm font-medium mb-2">Status</label>
						<select
							bind:value={statusFilter}
							onchange={handleSearch}
							class="w-full border border-input rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
						>
							<option value="">All Statuses</option>
							<option value="ACTIVE">Active</option>
							<option value="INACTIVE">Inactive</option>
							<option value="TERMINATED">Terminated</option>
						</select>
					</div>
					
					<div class="flex items-end">
						<Button variant="outline" onclick={clearFilters} class="w-full">
							Clear Filters
						</Button>
					</div>
				</div>
			</div>
		{/if}
	</div>

	<!-- Results Summary -->
	<div class="flex items-center justify-between text-sm text-muted-foreground">
		<span>
			Showing {filteredEmployees.length} of {totalCount} employees
		</span>
		
		{#if selectedEmployees.length > 0}
			<span class="text-primary font-medium">
				{selectedEmployees.length} selected
			</span>
		{/if}
	</div>

	<!-- Employee Data Table -->
	<div class="bg-card border rounded-lg overflow-hidden">
		<DataTable
			data={filteredEmployees}
			columns={employeeColumns}
			{isLoading}
			selectable
			bind:selectedRows={selectedEmployees}
			pagination={{
				page: currentPage,
				limit: pageSize,
				total: totalCount
			}}
			onSort={handleSort}
			onPageChange={handlePageChange}
			onSelectionChange={handleSelectionChange}
			onRowClick={handleRowClick}
			emptyMessage="No employees found"
		/>
	</div>
</div>

<!-- Add Employee Modal -->
<Modal bind:open={showAddModal} title="Add New Employee" size="lg">
	{#snippet content()}
		<Form
			schema={employeeSchema}
			onSubmit={handleCreateEmployee}
			class="space-y-4"
		>
			{#snippet content({ form, errors, handleChange, handleBlur })}
				<div class="grid grid-cols-1 md:grid-cols-2 gap-4">
					<Input
						name="firstName"
						label="First Name"
						required
						bind:value={form.firstName}
						error={errors.firstName}
						oninput={(e) => handleChange('firstName', e.currentTarget.value)}
						onblur={(e) => handleBlur('firstName', e.currentTarget.value)}
					/>
					
					<Input
						name="lastName"
						label="Last Name"
						required
						bind:value={form.lastName}
						error={errors.lastName}
						oninput={(e) => handleChange('lastName', e.currentTarget.value)}
						onblur={(e) => handleBlur('lastName', e.currentTarget.value)}
					/>
				</div>
				
				<Input
					name="email"
					type="email"
					label="Email Address"
					required
					bind:value={form.email}
					error={errors.email}
					oninput={(e) => handleChange('email', e.currentTarget.value)}
					onblur={(e) => handleBlur('email', e.currentTarget.value)}
				/>
				
				<Input
					name="phone"
					type="tel"
					label="Phone Number"
					bind:value={form.phone}
					error={errors.phone}
					oninput={(e) => handleChange('phone', e.currentTarget.value)}
					onblur={(e) => handleBlur('phone', e.currentTarget.value)}
				/>
				
				<div class="grid grid-cols-1 md:grid-cols-2 gap-4">
					<Input
						name="department"
						label="Department"
						required
						bind:value={form.department}
						error={errors.department}
						oninput={(e) => handleChange('department', e.currentTarget.value)}
						onblur={(e) => handleBlur('department', e.currentTarget.value)}
					/>
					
					<Input
						name="position"
						label="Position"
						required
						bind:value={form.position}
						error={errors.position}
						oninput={(e) => handleChange('position', e.currentTarget.value)}
						onblur={(e) => handleBlur('position', e.currentTarget.value)}
					/>
				</div>
				
				<Input
					name="startDate"
					type="date"
					label="Start Date"
					required
					bind:value={form.startDate}
					error={errors.startDate}
					oninput={(e) => handleChange('startDate', e.currentTarget.value)}
					onblur={(e) => handleBlur('startDate', e.currentTarget.value)}
				/>
			{/snippet}
		</Form>
	{/snippet}
	
	{#snippet actions()}
		<Button variant="outline" onclick={() => showAddModal = false}>
			Cancel
		</Button>
		<Button type="submit" loading={isLoading} disabled={isLoading}>
			Create Employee
		</Button>
	{/snippet}
</Modal>

<!-- Edit Employee Modal -->
{#if editingEmployee}
	<Modal bind:open={showEditModal} title="Edit Employee" size="lg">
		{#snippet content()}
			<Form
				schema={employeeSchema}
				initialValues={{
					firstName: editingEmployee.firstName,
					lastName: editingEmployee.lastName,
					email: editingEmployee.email,
					phone: editingEmployee.phone,
					department: editingEmployee.department?.name || '',
					position: editingEmployee.position?.title || '',
					startDate: editingEmployee.startDate,
					salary: editingEmployee.salary
				}}
				onSubmit={handleUpdateEmployee}
				class="space-y-4"
			>
				{#snippet content({ form, errors, handleChange, handleBlur })}
					<div class="grid grid-cols-1 md:grid-cols-2 gap-4">
						<Input
							name="firstName"
							label="First Name"
							required
							bind:value={form.firstName}
							error={errors.firstName}
							oninput={(e) => handleChange('firstName', e.currentTarget.value)}
							onblur={(e) => handleBlur('firstName', e.currentTarget.value)}
						/>
						
						<Input
							name="lastName"
							label="Last Name"
							required
							bind:value={form.lastName}
							error={errors.lastName}
							oninput={(e) => handleChange('lastName', e.currentTarget.value)}
							onblur={(e) => handleBlur('lastName', e.currentTarget.value)}
						/>
					</div>
					
					<Input
						name="email"
						type="email"
						label="Email Address"
						required
						bind:value={form.email}
						error={errors.email}
						oninput={(e) => handleChange('email', e.currentTarget.value)}
						onblur={(e) => handleBlur('email', e.currentTarget.value)}
					/>
					
					<Input
						name="phone"
						type="tel"
						label="Phone Number"
						bind:value={form.phone}
						error={errors.phone}
						oninput={(e) => handleChange('phone', e.currentTarget.value)}
						onblur={(e) => handleBlur('phone', e.currentTarget.value)}
					/>
					
					<div class="grid grid-cols-1 md:grid-cols-2 gap-4">
						<Input
							name="department"
							label="Department"
							required
							bind:value={form.department}
							error={errors.department}
							oninput={(e) => handleChange('department', e.currentTarget.value)}
							onblur={(e) => handleBlur('department', e.currentTarget.value)}
						/>
						
						<Input
							name="position"
							label="Position"
							required
							bind:value={form.position}
							error={errors.position}
							oninput={(e) => handleChange('position', e.currentTarget.value)}
							onblur={(e) => handleBlur('position', e.currentTarget.value)}
						/>
					</div>
					
					<Input
						name="startDate"
						type="date"
						label="Start Date"
						required
						bind:value={form.startDate}
						error={errors.startDate}
						oninput={(e) => handleChange('startDate', e.currentTarget.value)}
						onblur={(e) => handleBlur('startDate', e.currentTarget.value)}
					/>
				{/snippet}
			</Form>
		{/snippet}
		
		{#snippet actions()}
			<Button variant="outline" onclick={() => showEditModal = false}>
				Cancel
			</Button>
			<Button type="submit" loading={isLoading} disabled={isLoading}>
				Update Employee
			</Button>
		{/snippet}
	</Modal>
{/if}

<!-- Delete Confirmation Modal -->
{#if editingEmployee}
	<Modal bind:open={showDeleteModal} title="Delete Employee" size="sm">
		{#snippet content()}
			<div class="space-y-4">
				<p class="text-muted-foreground">
					Are you sure you want to delete <strong>{editingEmployee.firstName} {editingEmployee.lastName}</strong>?
				</p>
				<div class="bg-destructive/10 border border-destructive/20 rounded-md p-3">
					<p class="text-sm text-destructive">
						⚠️ This action cannot be undone. All employee data will be permanently removed.
					</p>
				</div>
			</div>
		{/snippet}
		
		{#snippet actions()}
			<Button variant="outline" onclick={() => showDeleteModal = false}>
				Cancel
			</Button>
			<Button variant="destructive" onclick={handleDeleteEmployee} loading={isLoading}>
				Delete Employee
			</Button>
		{/snippet}
	</Modal>
{/if}
