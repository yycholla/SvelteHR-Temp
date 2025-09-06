<script lang="ts">
	import { onMount } from 'svelte';
	import { employeeApi, taskApi } from '../utils/api-helpers';
	import { notifications } from '../utils/notifications';
	import type { Employee } from '$lib/stores/hr/employees';
	import type { Task } from '$lib/stores/hr/tasks';

	let {
		employeeId,
		onEdit,
		onDelete
	}: {
		employeeId: string;
		onEdit?: (employee: Employee) => void;
		onDelete?: (employee: Employee) => void;
	} = $props();

	let employee: Employee | null = null;
	let tasks: Task[] = [];
	let loading = true;
	let loadingTasks = false;

	onMount(async () => {
		await loadEmployee();
		await loadEmployeeTasks();
	});

	async function loadEmployee() {
		loading = true;
		try {
			const response = await employeeApi.getById(employeeId);
			employee = response.data;
		} catch (error) {
			notifications.apiError('Failed to load employee details');
		} finally {
			loading = false;
		}
	}

	async function loadEmployeeTasks() {
		loadingTasks = true;
		try {
			const response = await taskApi.getAll({ assigned_to: employeeId, limit: 10 });
			tasks = response.data.data;
		} catch (error) {
			console.error('Failed to load employee tasks:', error);
		} finally {
			loadingTasks = false;
		}
	}

	function handleEdit() {
		if (employee && onEdit) {
			onEdit(employee);
		}
	}

	function handleDelete() {
		if (employee && onDelete) {
			onDelete(employee);
		}
	}

	function getStatusBadgeClass(status: string): string {
		switch (status) {
			case 'active':
				return 'variant-filled-success';
			case 'inactive':
				return 'variant-filled-warning';
			case 'terminated':
				return 'variant-filled-error';
			default:
				return 'variant-filled-surface';
		}
	}

	function getTaskStatusBadgeClass(status: string): string {
		switch (status) {
			case 'completed':
				return 'variant-filled-success';
			case 'in_progress':
				return 'variant-filled-primary';
			case 'pending':
				return 'variant-filled-warning';
			case 'cancelled':
				return 'variant-filled-error';
			default:
				return 'variant-filled-surface';
		}
	}

	function getPriorityBadgeClass(priority: string): string {
		switch (priority) {
			case 'urgent':
				return 'variant-filled-error';
			case 'high':
				return 'variant-filled-warning';
			case 'medium':
				return 'variant-filled-primary';
			case 'low':
				return 'variant-filled-success';
			default:
				return 'variant-filled-surface';
		}
	}

	function formatSalary(salary?: number): string {
		if (!salary) return 'Not specified';
		return new Intl.NumberFormat('en-US', {
			style: 'currency',
			currency: 'USD',
			minimumFractionDigits: 0
		}).format(salary);
	}

	function calculateEmploymentDuration(hireDate: string): string {
		const hire = new Date(hireDate);
		const today = new Date();
		const diffInMs = today.getTime() - hire.getTime();
		const diffInDays = Math.floor(diffInMs / (1000 * 60 * 60 * 24));
		
		if (diffInDays < 30) {
			return `${diffInDays} days`;
		} else if (diffInDays < 365) {
			const months = Math.floor(diffInDays / 30);
			return `${months} month${months !== 1 ? 's' : ''}`;
		} else {
			const years = Math.floor(diffInDays / 365);
			const remainingMonths = Math.floor((diffInDays % 365) / 30);
			return `${years} year${years !== 1 ? 's' : ''}${remainingMonths > 0 ? `, ${remainingMonths} month${remainingMonths !== 1 ? 's' : ''}` : ''}`;
		}
	}
</script>

{#if loading}
	<div class="space-y-6">
		<div class="placeholder animate-pulse h-8 w-64 rounded"></div>
		<div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
			<div class="lg:col-span-2 space-y-6">
				<div class="card p-6">
					<div class="space-y-4">
						{#each Array(6) as _}
							<div class="placeholder animate-pulse h-4 w-full rounded"></div>
						{/each}
					</div>
				</div>
			</div>
			<div class="space-y-6">
				<div class="card p-6">
					<div class="space-y-4">
						{#each Array(4) as _}
							<div class="placeholder animate-pulse h-4 w-full rounded"></div>
						{/each}
					</div>
				</div>
			</div>
		</div>
	</div>
{:else if employee}
	<div class="space-y-6">
		<!-- Header -->
		<div class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
			<div>
				<h1 class="h1 font-bold">
					{employee.first_name} {employee.last_name}
				</h1>
				<div class="text-lg text-surface-600-300-token">
					{employee.position} • {employee.department}
				</div>
			</div>
			
			<div class="flex gap-2">
				{#if onEdit}
					<button class="btn variant-filled-primary" on:click={handleEdit}>
						Edit
					</button>
				{/if}
				{#if onDelete}
					<button class="btn variant-filled-error" on:click={handleDelete}>
						Delete
					</button>
				{/if}
			</div>
		</div>

		<div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
			<!-- Main Information -->
			<div class="lg:col-span-2 space-y-6">
				<!-- Basic Information -->
				<div class="card">
					<header class="card-header">
						<h3 class="h3 font-semibold">Basic Information</h3>
					</header>
					<section class="p-6 space-y-4">
						<div class="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
							<div>
								<span class="font-semibold text-surface-600-300-token">Email:</span>
								<div class="mt-1">
									<a href="mailto:{employee.email}" class="anchor">
										{employee.email}
									</a>
								</div>
							</div>
							
							{#if employee.phone}
								<div>
									<span class="font-semibold text-surface-600-300-token">Phone:</span>
									<div class="mt-1">
										<a href="tel:{employee.phone}" class="anchor">
											{employee.phone}
										</a>
									</div>
								</div>
							{/if}
							
							<div>
								<span class="font-semibold text-surface-600-300-token">Status:</span>
								<div class="mt-1">
									<span class="badge {getStatusBadgeClass(employee.status)} capitalize">
										{employee.status}
									</span>
								</div>
							</div>
							
							<div>
								<span class="font-semibold text-surface-600-300-token">Hire Date:</span>
								<div class="mt-1">
									{new Date(employee.hire_date).toLocaleDateString()}
								</div>
							</div>
							
							<div>
								<span class="font-semibold text-surface-600-300-token">Employment Duration:</span>
								<div class="mt-1">
									{calculateEmploymentDuration(employee.hire_date)}
								</div>
							</div>
							
							{#if employee.salary}
								<div>
									<span class="font-semibold text-surface-600-300-token">Salary:</span>
									<div class="mt-1">
										{formatSalary(employee.salary)}
									</div>
								</div>
							{/if}
						</div>
					</section>
				</div>

				<!-- Recent Tasks -->
				<div class="card">
					<header class="card-header">
						<h3 class="h3 font-semibold">Recent Tasks</h3>
					</header>
					<section class="p-6">
						{#if loadingTasks}
							<div class="space-y-3">
								{#each Array(3) as _}
									<div class="placeholder animate-pulse h-16 w-full rounded"></div>
								{/each}
							</div>
						{:else if tasks.length > 0}
							<div class="space-y-3">
								{#each tasks as task}
									<div class="card variant-ghost-surface p-4">
										<div class="flex justify-between items-start gap-4">
											<div class="flex-1">
												<h4 class="font-semibold">{task.title}</h4>
												<p class="text-sm text-surface-600-300-token mt-1">
													{task.description}
												</p>
												<div class="flex gap-2 mt-2">
													<span class="badge {getTaskStatusBadgeClass(task.status)} text-xs">
														{task.status.replace('_', ' ')}
													</span>
													<span class="badge {getPriorityBadgeClass(task.priority)} text-xs">
														{task.priority}
													</span>
												</div>
											</div>
											<div class="text-sm text-surface-600-300-token">
												Due: {new Date(task.due_date).toLocaleDateString()}
											</div>
										</div>
									</div>
								{/each}
							</div>
						{:else}
							<div class="text-center py-8 text-surface-600-300-token">
								No tasks assigned to this employee
							</div>
						{/if}
					</section>
				</div>
			</div>

			<!-- Sidebar Information -->
			<div class="space-y-6">
				<!-- Quick Stats -->
				<div class="card">
					<header class="card-header">
						<h3 class="h3 font-semibold">Quick Stats</h3>
					</header>
					<section class="p-6 space-y-4">
						<div class="stat">
							<div class="stat-title">Active Tasks</div>
							<div class="stat-value text-primary-500">
								{tasks.filter(t => t.status === 'in_progress' || t.status === 'pending').length}
							</div>
						</div>
						
						<div class="stat">
							<div class="stat-title">Completed Tasks</div>
							<div class="stat-value text-success-500">
								{tasks.filter(t => t.status === 'completed').length}
							</div>
						</div>
						
						<div class="stat">
							<div class="stat-title">Total Tasks</div>
							<div class="stat-value">
								{tasks.length}
							</div>
						</div>
					</section>
				</div>

				<!-- Contact Information -->
				<div class="card">
					<header class="card-header">
						<h3 class="h3 font-semibold">Contact</h3>
					</header>
					<section class="p-6 space-y-4">
						<div>
							<div class="text-sm font-semibold text-surface-600-300-token mb-1">
								Email
							</div>
							<a href="mailto:{employee.email}" class="anchor text-sm">
								{employee.email}
							</a>
						</div>
						
						{#if employee.phone}
							<div>
								<div class="text-sm font-semibold text-surface-600-300-token mb-1">
									Phone
								</div>
								<a href="tel:{employee.phone}" class="anchor text-sm">
									{employee.phone}
								</a>
							</div>
						{/if}
						
						<div>
							<div class="text-sm font-semibold text-surface-600-300-token mb-1">
								Department
							</div>
							<div class="text-sm">{employee.department}</div>
						</div>
					</section>
				</div>

				<!-- Employment Details -->
				<div class="card">
					<header class="card-header">
						<h3 class="h3 font-semibold">Employment</h3>
					</header>
					<section class="p-6 space-y-4 text-sm">
						<div>
							<div class="font-semibold text-surface-600-300-token mb-1">
								Employee ID
							</div>
							<div class="font-mono text-xs bg-surface-100-800-token px-2 py-1 rounded">
								{employee.id}
							</div>
						</div>
						
						<div>
							<div class="font-semibold text-surface-600-300-token mb-1">
								Start Date
							</div>
							<div>{new Date(employee.hire_date).toLocaleDateString()}</div>
						</div>
						
						<div>
							<div class="font-semibold text-surface-600-300-token mb-1">
								Length of Service
							</div>
							<div>{calculateEmploymentDuration(employee.hire_date)}</div>
						</div>
					</section>
				</div>
			</div>
		</div>
	</div>
{:else}
	<div class="card p-8 text-center">
		<h2 class="h2 mb-4">Employee Not Found</h2>
		<p class="text-surface-600-300-token">
			The employee you're looking for could not be found.
		</p>
	</div>
{/if}

<style>
	.stat {
		text-align: center;
	}
	
	.stat-title {
		font-size: 0.75rem;
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.05em;
		color: #6b7280;
	}
	
	.stat-value {
		font-size: 1.5rem;
		font-weight: 700;
		margin-top: 0.25rem;
	}
</style>