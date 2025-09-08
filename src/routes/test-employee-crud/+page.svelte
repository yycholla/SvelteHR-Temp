<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import { Card } from '$lib/components/ui/card';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import EmployeeModal from '$lib/components/hr/modals/EmployeeModal.svelte';
	import type { Employee } from '$lib/schemas/employee';

	let employees: Employee[] = $state([]);
	let loading = $state(false);
	let error = $state('');
	let modalOpen = $state(false);
	let selectedEmployee = $state<Employee | null>(null);
	let modalMode = $state<'create' | 'edit' | 'view'>('create');

	// Test data for creating an employee
	let testEmployee = $state({
		username: 'testuser',
		firstName: 'John',
		lastName: 'Doe',
		email: 'john.doe@example.com',
		roleId: 1,
		departmentId: 1,
		jobTitle: 'Software Engineer',
		employmentType: 'Full-time',
		onboardingStatus: 'Active'
	});

	// Fetch all employees
	async function fetchEmployees() {
		loading = true;
		error = '';
		try {
			const response = await fetch('/api/employees');
			if (!response.ok) {
				throw new Error(`Failed to fetch: ${response.statusText}`);
			}
			const data = await response.json();
			employees = Array.isArray(data) ? data : data.data || data.employees || [];
			console.log('Fetched employees:', employees);
		} catch (err) {
			error = err instanceof Error ? err.message : 'Failed to fetch employees';
			console.error('Fetch error:', err);
		} finally {
			loading = false;
		}
	}

	// Create employee
	async function createEmployee() {
		loading = true;
		error = '';
		try {
			const response = await fetch('/api/employees', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(testEmployee)
			});

			if (!response.ok) {
				const errorData = await response.json();
				throw new Error(errorData.error || `Failed to create: ${response.statusText}`);
			}

			const newEmployee = await response.json();
			console.log('Created employee:', newEmployee);
			await fetchEmployees(); // Refresh list
		} catch (err) {
			error = err instanceof Error ? err.message : 'Failed to create employee';
			console.error('Create error:', err);
		} finally {
			loading = false;
		}
	}

	// Update employee
	async function updateEmployee(id: string) {
		loading = true;
		error = '';
		try {
			const updateData = {
				...testEmployee,
				id: parseInt(id),
				firstName: testEmployee.firstName + ' (Updated)',
				jobTitle: 'Senior ' + testEmployee.jobTitle
			};

			const response = await fetch(`/api/employees/${id}`, {
				method: 'PUT',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(updateData)
			});

			if (!response.ok) {
				const errorData = await response.json();
				throw new Error(errorData.error || `Failed to update: ${response.statusText}`);
			}

			const updatedEmployee = await response.json();
			console.log('Updated employee:', updatedEmployee);
			await fetchEmployees(); // Refresh list
		} catch (err) {
			error = err instanceof Error ? err.message : 'Failed to update employee';
			console.error('Update error:', err);
		} finally {
			loading = false;
		}
	}

	// Delete employee
	async function deleteEmployee(id: string) {
		if (!confirm('Are you sure you want to delete this employee?')) return;

		loading = true;
		error = '';
		try {
			const response = await fetch(`/api/employees/${id}`, {
				method: 'DELETE'
			});

			if (!response.ok) {
				const errorData = await response.json();
				throw new Error(errorData.error || `Failed to delete: ${response.statusText}`);
			}

			console.log('Deleted employee:', id);
			await fetchEmployees(); // Refresh list
		} catch (err) {
			error = err instanceof Error ? err.message : 'Failed to delete employee';
			console.error('Delete error:', err);
		} finally {
			loading = false;
		}
	}

	// Open modal for different operations
	function openModal(mode: 'create' | 'edit' | 'view', employee: Employee | null = null) {
		modalMode = mode;
		selectedEmployee = employee;
		modalOpen = true;
	}

	// Initial load
	$effect(() => {
		fetchEmployees();
	});
</script>

<div class="container mx-auto space-y-6 p-6">
	<h1 class="text-3xl font-bold">Employee CRUD Test Page</h1>

	{#if error}
		<div class="rounded border border-red-200 bg-red-50 px-4 py-3 text-red-700">
			{error}
		</div>
	{/if}

	<!-- Test Create Form -->
	<Card class="p-6">
		<h2 class="mb-4 text-xl font-semibold">Quick Test - Create Employee</h2>
		<div class="mb-4 grid grid-cols-2 gap-4">
			<div>
				<Label for="username">Username</Label>
				<Input id="username" bind:value={testEmployee.username} />
			</div>
			<div>
				<Label for="email">Email</Label>
				<Input id="email" type="email" bind:value={testEmployee.email} />
			</div>
			<div>
				<Label for="firstName">First Name</Label>
				<Input id="firstName" bind:value={testEmployee.firstName} />
			</div>
			<div>
				<Label for="lastName">Last Name</Label>
				<Input id="lastName" bind:value={testEmployee.lastName} />
			</div>
			<div>
				<Label for="jobTitle">Job Title</Label>
				<Input id="jobTitle" bind:value={testEmployee.jobTitle} />
			</div>
			<div>
				<Label for="roleId">Role ID</Label>
				<Input id="roleId" type="number" bind:value={testEmployee.roleId} />
			</div>
		</div>
		<div class="flex gap-4">
			<Button onclick={createEmployee} disabled={loading}>
				{loading ? 'Creating...' : 'Create Employee (Direct API)'}
			</Button>
			<Button onclick={() => openModal('create')} variant="outline">Create Employee (Modal)</Button>
		</div>
	</Card>

	<!-- Employee List -->
	<Card class="p-6">
		<div class="mb-4 flex items-center justify-between">
			<h2 class="text-xl font-semibold">Employee List</h2>
			<Button onclick={fetchEmployees} variant="outline" disabled={loading}>
				{loading ? 'Loading...' : 'Refresh'}
			</Button>
		</div>

		{#if employees.length === 0}
			<p class="text-gray-500">No employees found. Try creating one!</p>
		{:else}
			<div class="overflow-x-auto">
				<table class="min-w-full divide-y divide-gray-200">
					<thead class="bg-gray-50">
						<tr>
							<th class="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">ID</th>
							<th class="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase"
								>Username</th
							>
							<th class="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
							<th class="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Email</th>
							<th class="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase"
								>Job Title</th
							>
							<th class="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase"
								>Actions</th
							>
						</tr>
					</thead>
					<tbody class="divide-y divide-gray-200 bg-white">
						{#each employees as employee}
							<tr>
								<td class="px-4 py-2 text-sm">{employee.id}</td>
								<td class="px-4 py-2 text-sm">{employee.username || 'N/A'}</td>
								<td class="px-4 py-2 text-sm">{employee.firstName} {employee.lastName}</td>
								<td class="px-4 py-2 text-sm">{employee.email}</td>
								<td class="px-4 py-2 text-sm">{employee.jobTitle || 'N/A'}</td>
								<td class="px-4 py-2 text-sm">
									<div class="flex gap-2">
										<Button size="sm" variant="outline" onclick={() => openModal('view', employee)}>
											View
										</Button>
										<Button size="sm" variant="outline" onclick={() => openModal('edit', employee)}>
											Edit
										</Button>
										<Button
											size="sm"
											onclick={() => updateEmployee(employee.id)}
											disabled={loading}
										>
											Quick Update
										</Button>
										<Button
											size="sm"
											variant="destructive"
											onclick={() => deleteEmployee(employee.id)}
											disabled={loading}
										>
											Delete
										</Button>
									</div>
								</td>
							</tr>
						{/each}
					</tbody>
				</table>
			</div>
		{/if}
	</Card>

	<!-- API Status -->
	<Card class="p-6">
		<h2 class="mb-4 text-xl font-semibold">API Connection Status</h2>
		<div class="space-y-2">
			<p>
				Backend URL: <code class="rounded bg-gray-100 px-2 py-1">http://localhost:8080/api/v1</code>
			</p>
			<p>Frontend API: <code class="rounded bg-gray-100 px-2 py-1">/api/employees</code></p>
			<p>Total Employees: <strong>{employees.length}</strong></p>
		</div>
	</Card>
</div>

<!-- Employee Modal -->
<EmployeeModal
	bind:open={modalOpen}
	bind:employee={selectedEmployee}
	bind:mode={modalMode}
	availableRoles={[
		{ id: '1', name: 'Employee' },
		{ id: '2', name: 'Manager' },
		{ id: '3', name: 'Admin' }
	]}
	availableDepartments={[
		{ id: '1', name: 'Engineering' },
		{ id: '2', name: 'Sales' },
		{ id: '3', name: 'HR' }
	]}
/>
