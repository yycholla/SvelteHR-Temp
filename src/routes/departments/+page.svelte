<!--
	Department Overview Page
	
	Department management with organizational structure, team composition, and analytics
	Displays department hierarchy and employee distribution
-->

<script lang="ts">
	import Button from '$lib/components/ui/Button.svelte';
	import Input from '$lib/components/ui/Input.svelte';
	import DataTable from '$lib/components/ui/DataTable.svelte';
	import Modal from '$lib/components/ui/Modal.svelte';
	import Form from '$lib/components/ui/Form.svelte';
	import { goto } from '$app/navigation';
	import type { PageData } from './$types';
	import { z } from 'zod';
	import { onMount } from 'svelte';

	// Props from page data
	export let data: PageData;

	// Department form schema
	const departmentSchema = z.object({
		name: z.string().min(1, 'Department name is required').max(100, 'Name is too long'),
		description: z.string().optional(),
		managerId: z.string().optional(),
		budget: z.number().min(0, 'Budget must be positive').optional(),
		location: z.string().optional()
	});

	type DepartmentForm = z.infer<typeof departmentSchema>;

	// Component state
	let departments = $state([
		{
			id: '1',
			name: 'Engineering',
			description: 'Software development and technical operations',
			employeeCount: 45,
			manager: { id: '1', firstName: 'John', lastName: 'Smith', email: 'john.smith@company.com' },
			budget: 2500000,
			location: 'Building A, Floor 3',
			status: 'ACTIVE',
			createdAt: '2024-01-15'
		},
		{
			id: '2',
			name: 'Human Resources',
			description: 'Employee relations, recruitment, and organizational development',
			employeeCount: 12,
			manager: { id: '2', firstName: 'Sarah', lastName: 'Johnson', email: 'sarah.j@company.com' },
			budget: 800000,
			location: 'Building B, Floor 1',
			status: 'ACTIVE',
			createdAt: '2024-01-15'
		},
		{
			id: '3',
			name: 'Sales',
			description: 'Revenue generation and client relationship management',
			employeeCount: 28,
			manager: { id: '3', firstName: 'Mike', lastName: 'Chen', email: 'mike.chen@company.com' },
			budget: 1800000,
			location: 'Building A, Floor 2',
			status: 'ACTIVE',
			createdAt: '2024-01-15'
		},
		{
			id: '4',
			name: 'Marketing',
			description: 'Brand management, digital marketing, and growth strategies',
			employeeCount: 18,
			manager: { id: '4', firstName: 'Lisa', lastName: 'Wong', email: 'lisa.wong@company.com' },
			budget: 1200000,
			location: 'Building A, Floor 1',
			status: 'ACTIVE',
			createdAt: '2024-02-01'
		},
		{
			id: '5',
			name: 'Finance',
			description: 'Financial planning, accounting, and budget management',
			employeeCount: 8,
			manager: { id: '5', firstName: 'David', lastName: 'Brown', email: 'david.brown@company.com' },
			budget: 600000,
			location: 'Building B, Floor 2',
			status: 'ACTIVE',
			createdAt: '2024-01-20'
		}
	]);

	let isLoading = $state(false);
	let searchQuery = $state('');
	let showAddModal = $state(false);
	let showEditModal = $state(false);
	let showDeleteModal = $state(false);
	let editingDepartment = $state(null);

	// Department statistics
	$: totalEmployees = departments.reduce((sum, dept) => sum + dept.employeeCount, 0);
	$: totalBudget = departments.reduce((sum, dept) => sum + (dept.budget || 0), 0);
	$: averageTeamSize = departments.length > 0 ? Math.round(totalEmployees / departments.length) : 0;
</script>

	// Department table columns
	const departmentColumns = [
		{
			key: 'name',
			label: 'Department',
			sortable: true,
			render: (value, row) => `
				<div class="flex items-center space-x-3">
					<div class="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
						<span class="text-sm font-medium">${value.charAt(0)}</span>
					</div>
					<div>
						<div class="font-medium text-foreground">${value}</div>
						<div class="text-sm text-muted-foreground">${row.description || 'No description'}</div>
					</div>
				</div>
			`
		},
		{
			key: 'manager',
			label: 'Manager',
			sortable: true,
			render: (value, row) => value ? `
				<div>
					<div class="font-medium text-foreground">${value.firstName} ${value.lastName}</div>
					<div class="text-sm text-muted-foreground">${value.email}</div>
				</div>
			` : '<span class="text-muted-foreground">No manager assigned</span>'
		},
		{
			key: 'employeeCount',
			label: 'Team Size',
			sortable: true,
			align: 'center',
			render: (value) => `
				<div class="text-center">
					<div class="text-lg font-semibold text-foreground">${value}</div>
					<div class="text-xs text-muted-foreground">employees</div>
				</div>
			`
		},
		{
			key: 'budget',
			label: 'Budget',
			sortable: true,
			align: 'right',
			render: (value) => value ? `
				<div class="text-right">
					<div class="font-medium text-foreground">$${(value / 1000000).toFixed(1)}M</div>
					<div class="text-xs text-muted-foreground">annual</div>
				</div>
			` : '<span class="text-muted-foreground">Not set</span>'
		},
		{
			key: 'location',
			label: 'Location',
			sortable: true,
			render: (value) => value || '<span class="text-muted-foreground">Remote</span>'
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
						onclick="viewDepartment('${row.id}')"
					>
						View
					</button>
					<button 
						class="text-green-600 hover:text-green-900 text-sm font-medium"
						onclick="editDepartment('${row.id}')"
					>
						Edit
					</button>
					<button 
						class="text-red-600 hover:text-red-900 text-sm font-medium"
						onclick="deleteDepartment('${row.id}')"
					>
						Delete
					</button>
				</div>
			`
		}
	];

	// Filtered departments
	$: filteredDepartments = departments.filter(department => 
		!searchQuery || 
		department.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
		department.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
		(department.manager && 
			`${department.manager.firstName} ${department.manager.lastName}`.toLowerCase().includes(searchQuery.toLowerCase())
		)
	);

	// Handle department creation
	async function handleCreateDepartment(formData: DepartmentForm) {
		isLoading = true;
		try {
			// TODO: Implement department creation via service
			const newDepartment = {
				id: String(Date.now()),
				...formData,
				employeeCount: 0,
				status: 'ACTIVE',
				createdAt: new Date().toISOString(),
				manager: null // Would be set via API
			};
			
			departments = [...departments, newDepartment];
			showAddModal = false;
		} catch (error) {
			console.error('Error creating department:', error);
		} finally {
			isLoading = false;
		}
	}

	// Handle department update
	async function handleUpdateDepartment(formData: DepartmentForm) {
		if (!editingDepartment) return;
		
		isLoading = true;
		try {
			// TODO: Implement department update via service
			departments = departments.map(dept => 
				dept.id === editingDepartment.id 
					? { ...dept, ...formData }
					: dept
			);
			
			showEditModal = false;
			editingDepartment = null;
		} catch (error) {
			console.error('Error updating department:', error);
		} finally {
			isLoading = false;
		}
	}

	// Handle department deletion
	async function handleDeleteDepartment() {
		if (!editingDepartment) return;
		
		isLoading = true;
		try {
			// TODO: Implement department deletion via service
			departments = departments.filter(dept => dept.id !== editingDepartment.id);
			
			showDeleteModal = false;
			editingDepartment = null;
		} catch (error) {
			console.error('Error deleting department:', error);
		} finally {
			isLoading = false;
		}
	}

	// Global functions for table actions
	(globalThis as any).viewDepartment = (departmentId: string) => {
		goto(`/departments/${departmentId}`);
	};

	(globalThis as any).editDepartment = (departmentId: string) => {
		const department = departments.find(dept => dept.id === departmentId);
		if (department) {
			editingDepartment = department;
			showEditModal = true;
		}
	};

	(globalThis as any).deleteDepartment = (departmentId: string) => {
		const department = departments.find(dept => dept.id === departmentId);
		if (department) {
			editingDepartment = department;
			showDeleteModal = true;
		}
	};

	// Handle search
	function handleSearch() {
		// Search is reactive via filteredDepartments
	}

	// Handle sort
	function handleSort(sort) {
		console.log('Sort by:', sort);
		// TODO: Implement sorting
	}

	// Handle row click
	function handleRowClick(department) {
		goto(`/departments/${department.id}`);
	}
</script>

<svelte:head>
	<title>Departments - MountainHR</title>
	<meta name="description" content="Department overview and organizational structure management" />
</svelte:head>

<div class="space-y-6">
	<!-- Header -->
	<div class="flex items-center justify-between">
		<div>
			<h1 class="text-3xl font-bold text-foreground">Departments</h1>
			<p class="text-muted-foreground mt-1">
				Manage your organizational structure and department hierarchy
			</p>
		</div>
		
		<div class="flex items-center space-x-3">
			<Button variant="outline" onclick={() => goto('/departments/org-chart')}>
				🏢 Org Chart
			</Button>
			<Button onclick={() => showAddModal = true} disabled={isLoading}>
				➕ Add Department
			</Button>
		</div>
	</div>

	<!-- Department Statistics -->
	<div class="grid grid-cols-1 md:grid-cols-4 gap-6">
		<div class="bg-card border rounded-lg p-6">
			<div class="flex items-center justify-between">
				<div>
					<p class="text-sm font-medium text-muted-foreground">Total Departments</p>
					<p class="text-3xl font-bold text-foreground">{departments.length}</p>
				</div>
				<div class="w-12 h-12 bg-blue-500/10 rounded-lg flex items-center justify-center">
					<span class="text-2xl">🏢</span>
				</div>
			</div>
		</div>

		<div class="bg-card border rounded-lg p-6">
			<div class="flex items-center justify-between">
				<div>
					<p class="text-sm font-medium text-muted-foreground">Total Employees</p>
					<p class="text-3xl font-bold text-foreground">{totalEmployees}</p>
				</div>
				<div class="w-12 h-12 bg-green-500/10 rounded-lg flex items-center justify-center">
					<span class="text-2xl">👥</span>
				</div>
			</div>
		</div>

		<div class="bg-card border rounded-lg p-6">
			<div class="flex items-center justify-between">
				<div>
					<p class="text-sm font-medium text-muted-foreground">Average Team Size</p>
					<p class="text-3xl font-bold text-foreground">{averageTeamSize}</p>
				</div>
				<div class="w-12 h-12 bg-purple-500/10 rounded-lg flex items-center justify-center">
					<span class="text-2xl">📊</span>
				</div>
			</div>
		</div>

		<div class="bg-card border rounded-lg p-6">
			<div class="flex items-center justify-between">
				<div>
					<p class="text-sm font-medium text-muted-foreground">Total Budget</p>
					<p class="text-3xl font-bold text-foreground">${(totalBudget / 1000000).toFixed(1)}M</p>
				</div>
				<div class="w-12 h-12 bg-orange-500/10 rounded-lg flex items-center justify-center">
					<span class="text-2xl">💰</span>
				</div>
			</div>
		</div>
	</div>

	<!-- Department Visualization -->
	<div class="bg-card border rounded-lg p-6">
		<h2 class="text-xl font-semibold text-foreground mb-4">Department Overview</h2>
		<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
			{#each departments as department}
				<div class="border rounded-lg p-4 hover:bg-accent/50 transition-colors cursor-pointer" onclick={() => goto(`/departments/${department.id}`)}>
					<div class="flex items-start justify-between mb-3">
						<div class="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
							<span class="text-sm font-medium">{department.name.charAt(0)}</span>
						</div>
						<span class="text-xs px-2 py-1 bg-green-100 text-green-800 rounded-full">
							{department.status}
						</span>
					</div>
					
					<h3 class="font-semibold text-foreground mb-1">{department.name}</h3>
					<p class="text-sm text-muted-foreground mb-3 line-clamp-2">
						{department.description || 'No description available'}
					</p>
					
					<div class="space-y-2">
						<div class="flex items-center justify-between text-sm">
							<span class="text-muted-foreground">Team Size:</span>
							<span class="font-medium">{department.employeeCount}</span>
						</div>
						
						{#if department.manager}
							<div class="flex items-center justify-between text-sm">
								<span class="text-muted-foreground">Manager:</span>
								<span class="font-medium">{department.manager.firstName} {department.manager.lastName}</span>
							</div>
						{/if}
						
						{#if department.budget}
							<div class="flex items-center justify-between text-sm">
								<span class="text-muted-foreground">Budget:</span>
								<span class="font-medium">${(department.budget / 1000000).toFixed(1)}M</span>
							</div>
						{/if}
					</div>
				</div>
			{/each}
		</div>
	</div>

	<!-- Search and Table -->
	<div class="bg-card border rounded-lg p-6">
		<div class="flex items-center justify-between mb-4">
			<h2 class="text-xl font-semibold text-foreground">Department Details</h2>
			
			<div class="flex items-center space-x-3">
				<Input
					type="search"
					placeholder="Search departments..."
					bind:value={searchQuery}
					oninput={handleSearch}
					class="max-w-md"
				/>
			</div>
		</div>

		<DataTable
			data={filteredDepartments}
			columns={departmentColumns}
			{isLoading}
			onSort={handleSort}
			onRowClick={handleRowClick}
			emptyMessage="No departments found"
			striped
			hover
		/>
	</div>
</div>

<!-- Add Department Modal -->
<Modal bind:open={showAddModal} title="Add New Department" size="lg">
	{#snippet content()}
		<Form
			schema={departmentSchema}
			onSubmit={handleCreateDepartment}
			class="space-y-4"
		>
			{#snippet content({ form, errors, handleChange, handleBlur })}
				<Input
					name="name"
					label="Department Name"
					required
					bind:value={form.name}
					error={errors.name}
					oninput={(e) => handleChange('name', e.currentTarget.value)}
					onblur={(e) => handleBlur('name', e.currentTarget.value)}
				/>
				
				<Input
					name="description"
					label="Description"
					bind:value={form.description}
					error={errors.description}
					oninput={(e) => handleChange('description', e.currentTarget.value)}
					onblur={(e) => handleBlur('description', e.currentTarget.value)}
				/>
				
				<div class="grid grid-cols-1 md:grid-cols-2 gap-4">
					<Input
						name="budget"
						type="number"
						label="Annual Budget"
						bind:value={form.budget}
						error={errors.budget}
						oninput={(e) => handleChange('budget', parseFloat(e.currentTarget.value) || 0)}
						onblur={(e) => handleBlur('budget', parseFloat(e.currentTarget.value) || 0)}
					/>
					
					<Input
						name="location"
						label="Location"
						bind:value={form.location}
						error={errors.location}
						oninput={(e) => handleChange('location', e.currentTarget.value)}
						onblur={(e) => handleBlur('location', e.currentTarget.value)}
					/>
				</div>
			{/snippet}
		</Form>
	{/snippet}
	
	{#snippet actions()}
		<Button variant="outline" onclick={() => showAddModal = false}>
			Cancel
		</Button>
		<Button type="submit" loading={isLoading} disabled={isLoading}>
			Create Department
		</Button>
	{/snippet}
</Modal>

<!-- Edit Department Modal -->
{#if editingDepartment}
	<Modal bind:open={showEditModal} title="Edit Department" size="lg">
		{#snippet content()}
			<Form
				schema={departmentSchema}
				initialValues={{
					name: editingDepartment.name,
					description: editingDepartment.description,
					budget: editingDepartment.budget,
					location: editingDepartment.location
				}}
				onSubmit={handleUpdateDepartment}
				class="space-y-4"
			>
				{#snippet content({ form, errors, handleChange, handleBlur })}
					<Input
						name="name"
						label="Department Name"
						required
						bind:value={form.name}
						error={errors.name}
						oninput={(e) => handleChange('name', e.currentTarget.value)}
						onblur={(e) => handleBlur('name', e.currentTarget.value)}
					/>
					
					<Input
						name="description"
						label="Description"
						bind:value={form.description}
						error={errors.description}
						oninput={(e) => handleChange('description', e.currentTarget.value)}
						onblur={(e) => handleBlur('description', e.currentTarget.value)}
					/>
					
					<div class="grid grid-cols-1 md:grid-cols-2 gap-4">
						<Input
							name="budget"
							type="number"
							label="Annual Budget"
							bind:value={form.budget}
							error={errors.budget}
							oninput={(e) => handleChange('budget', parseFloat(e.currentTarget.value) || 0)}
							onblur={(e) => handleBlur('budget', parseFloat(e.currentTarget.value) || 0)}
						/>
						
						<Input
							name="location"
							label="Location"
							bind:value={form.location}
							error={errors.location}
							oninput={(e) => handleChange('location', e.currentTarget.value)}
							onblur={(e) => handleBlur('location', e.currentTarget.value)}
						/>
					</div>
				{/snippet}
			</Form>
		{/snippet}
		
		{#snippet actions()}
			<Button variant="outline" onclick={() => showEditModal = false}>
				Cancel
			</Button>
			<Button type="submit" loading={isLoading} disabled={isLoading}>
				Update Department
			</Button>
		{/snippet}
	</Modal>
{/if}

<!-- Delete Confirmation Modal -->
{#if editingDepartment}
	<Modal bind:open={showDeleteModal} title="Delete Department" size="sm">
		{#snippet content()}
			<div class="space-y-4">
				<p class="text-muted-foreground">
					Are you sure you want to delete the <strong>{editingDepartment.name}</strong> department?
				</p>
				
				{#if editingDepartment.employeeCount > 0}
					<div class="bg-destructive/10 border border-destructive/20 rounded-md p-3">
						<p class="text-sm text-destructive">
							⚠️ This department has {editingDepartment.employeeCount} employees. 
							You'll need to reassign them before deletion.
						</p>
					</div>
				{:else}
					<div class="bg-destructive/10 border border-destructive/20 rounded-md p-3">
						<p class="text-sm text-destructive">
							⚠️ This action cannot be undone. All department data will be permanently removed.
						</p>
					</div>
				{/if}
			</div>
		{/snippet}
		
		{#snippet actions()}
			<Button variant="outline" onclick={() => showDeleteModal = false}>
				Cancel
			</Button>
			<Button 
				variant="destructive" 
				onclick={handleDeleteDepartment} 
				loading={isLoading}
				disabled={isLoading || editingDepartment.employeeCount > 0}
			>
				Delete Department
			</Button>
		{/snippet}
	</Modal>
{/if}

<style>
	/* Department card hover animations */
	.bg-card {
		transition: all 0.2s ease-in-out;
	}

	.bg-card:hover {
		transform: translateY(-1px);
		box-shadow: 0 4px 20px -4px rgba(0, 0, 0, 0.1);
	}

	/* Line clamp for descriptions */
	.line-clamp-2 {
		display: -webkit-box;
		-webkit-line-clamp: 2;
		-webkit-box-orient: vertical;
		overflow: hidden;
	}
</style>
