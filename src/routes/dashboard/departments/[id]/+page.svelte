<script lang="ts">
	import { goto } from '$app/navigation';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import * as Card from '$lib/components/ui/card';
	import { Badge } from '$lib/components/ui/badge';
	import { Separator } from '$lib/components/ui/separator';
	import * as Table from '$lib/components/ui/table';
	import {
		ArrowLeft,
		Briefcase,
		Building,
		Building2,
		Calendar,
		Crown,
		Edit,
		Eye,
		Mail,
		Search,
		Trash2,
		UserCheck,
		Users
	} from '@lucide/svelte';

	interface Props {
		data: {
			user: any;
			userSession: any;
			department: {
				id: string;
				name: string;
				description: string | null;
				managerId: string | null;
				createdAt: string;
				updatedAt: string;
				manager: {
					id: string;
					displayName: string;
					firstName: string;
					lastName: string;
					email: string;
					role: string;
					hireDate: string | null;
					isActive: boolean;
				} | null;
				employees: Array<{
					id: string;
					displayName: string;
					firstName: string;
					lastName: string;
					email: string;
					role: string;
					hireDate: string | null;
					isActive: boolean;
					departmentId: string | null;
				}>;
				employeeCount: number;
			};
			permissions: string[];
			canManageDepartments: boolean;
			canViewEmployees: boolean;
			loadedAt: string;
		};
	}

	const { data }: Props = $props();

	// Extract server-loaded data
	const department = $derived(data.department);
	const canManageDepartments = $derived(data.canManageDepartments);
	const canViewEmployees = $derived(data.canViewEmployees);

	// Local state for employee search
	let employeeSearchTerm = $state('');

	// Filtered employees based on search
	const filteredEmployees = $derived(
		department.employees.filter(
			(emp) =>
				emp.displayName.toLowerCase().includes(employeeSearchTerm.toLowerCase()) ||
				emp.email.toLowerCase().includes(employeeSearchTerm.toLowerCase()) ||
				emp.role.toLowerCase().includes(employeeSearchTerm.toLowerCase())
		)
	);

	// Format date helper
	function formatDate(dateString: string | null): string {
		if (!dateString) return 'N/A';
		return new Date(dateString).toLocaleDateString('en-US', {
			year: 'numeric',
			month: 'short',
			day: 'numeric'
		});
	}

	// Format employee count
	function formatEmployeeCount(count: number): string {
		if (count === 0) return 'No employees';
		if (count === 1) return '1 employee';
		return `${count} employees`;
	}

	// Navigate back to departments list
	function goBack() {
		goto('/dashboard/departments');
	}
</script>

<svelte:head>
	<title>{department.name} - Department Details - MountainHR</title>
	<meta name="description" content="View details for {department.name} department" />
</svelte:head>

<div class="space-y-6">
	<!-- Page Header -->
	<div class="flex items-center justify-between">
		<div class="flex items-center gap-4">
			<Button variant="ghost" size="icon" onclick={goBack}>
				<ArrowLeft class="h-5 w-5" />
			</Button>
			<div>
				<div class="flex items-center gap-3">
					<div class="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
						<Building2 class="h-6 w-6 text-primary" />
					</div>
					<div>
						<h1 class="text-3xl font-bold tracking-tight">{department.name}</h1>
						<p class="text-muted-foreground">
							{department.description || 'No description available'}
						</p>
					</div>
				</div>
			</div>
		</div>

		{#if canManageDepartments}
			<div class="flex gap-2">
				<Button variant="outline" size="sm" href="/dashboard/departments/{department.id}/edit">
					<Edit class="mr-2 h-4 w-4" />
					Edit Department
				</Button>
				<Button variant="destructive" size="sm">
					<Trash2 class="mr-2 h-4 w-4" />
					Delete
				</Button>
			</div>
		{/if}
	</div>

	<!-- Statistics Cards -->
	<div class="grid grid-cols-1 gap-4 md:grid-cols-3">
		<Card.Root>
			<Card.Header class="flex flex-row items-center justify-between space-y-0 pb-2">
				<Card.Title class="text-sm font-medium">Total Employees</Card.Title>
				<Users class="h-4 w-4 text-muted-foreground" />
			</Card.Header>
			<Card.Content>
				<div class="text-2xl font-bold">{department.employeeCount}</div>
				<p class="text-xs text-muted-foreground">in this department</p>
			</Card.Content>
		</Card.Root>

		<Card.Root>
			<Card.Header class="flex flex-row items-center justify-between space-y-0 pb-2">
				<Card.Title class="text-sm font-medium">Department Head</Card.Title>
				<Crown class="h-4 w-4 text-yellow-600" />
			</Card.Header>
			<Card.Content>
				{#if department.manager}
					<div class="text-lg font-bold">{department.manager.displayName}</div>
					<p class="text-xs text-muted-foreground">{department.manager.role}</p>
				{:else}
					<div class="text-lg font-bold text-muted-foreground">Not Assigned</div>
					<p class="text-xs text-muted-foreground">No department head</p>
				{/if}
			</Card.Content>
		</Card.Root>

		<Card.Root>
			<Card.Header class="flex flex-row items-center justify-between space-y-0 pb-2">
				<Card.Title class="text-sm font-medium">Last Updated</Card.Title>
				<Calendar class="h-4 w-4 text-muted-foreground" />
			</Card.Header>
			<Card.Content>
				<div class="text-lg font-bold">{formatDate(department.updatedAt)}</div>
				<p class="text-xs text-muted-foreground">Department modified</p>
			</Card.Content>
		</Card.Root>
	</div>

	<!-- Department Details Grid -->
	<div class="grid grid-cols-1 gap-6 lg:grid-cols-3">
		<!-- Left Column: Department Info & Manager -->
		<div class="space-y-6 lg:col-span-1">
			<!-- Department Information -->
			<Card.Root>
				<Card.Header>
					<Card.Title>Department Information</Card.Title>
				</Card.Header>
				<Card.Content class="space-y-3">
					<div class="space-y-2">
						<div class="text-sm">
							<span class="font-medium text-muted-foreground">Created:</span>
							<span class="ml-2">{formatDate(department.createdAt)}</span>
						</div>
						<div class="text-sm">
							<span class="font-medium text-muted-foreground">Last Updated:</span>
							<span class="ml-2">{formatDate(department.updatedAt)}</span>
						</div>
					</div>
				</Card.Content>
			</Card.Root>

			<!-- Manager Card -->
			{#if department.manager}
				<Card.Root>
					<Card.Header>
						<Card.Title>Department Head</Card.Title>
					</Card.Header>
					<Card.Content class="space-y-3">
						<div class="flex items-center gap-3">
							<div class="flex h-12 w-12 items-center justify-center rounded-full bg-yellow-100">
								<Crown class="h-6 w-6 text-yellow-600" />
							</div>
							<div>
								<div class="font-semibold">{department.manager.displayName}</div>
								<div class="text-sm text-muted-foreground">
									{department.manager.role}
								</div>
							</div>
						</div>

						<Separator />

						<div class="space-y-2">
							<div class="flex items-center text-sm">
								<Mail class="mr-2 h-4 w-4 text-muted-foreground" />
								<a href="mailto:{department.manager.email}" class="hover:underline">
									{department.manager.email}
								</a>
							</div>

							{#if department.manager.hireDate}
								<div class="flex items-center text-sm">
									<Calendar class="mr-2 h-4 w-4 text-muted-foreground" />
									<span>Hired: {formatDate(department.manager.hireDate)}</span>
								</div>
							{/if}

							<div class="flex items-center text-sm">
								<Briefcase class="mr-2 h-4 w-4 text-muted-foreground" />
								<Badge>{department.manager.role}</Badge>
							</div>

							<div class="flex items-center text-sm">
								<UserCheck class="mr-2 h-4 w-4 text-muted-foreground" />
								<span>Status: {department.manager.isActive ? 'Active' : 'Inactive'}</span>
							</div>
						</div>

						{#if canViewEmployees}
							<Button
								variant="outline"
								size="sm"
								class="w-full"
								href="/dashboard/employees/{department.manager.id}"
							>
								<Eye class="mr-2 h-4 w-4" />
								View Profile
							</Button>
						{/if}
					</Card.Content>
				</Card.Root>
			{/if}
		</div>

		<!-- Right Column: Employees List -->
		<div class="lg:col-span-2">
			<Card.Root>
				<Card.Header>
					<div class="flex items-center justify-between">
						<div>
							<Card.Title>Department Employees ({department.employeeCount})</Card.Title>
							<Card.Description>All employees in this department</Card.Description>
						</div>
						{#if canManageDepartments}
							<Button size="sm" variant="outline">
								<Users class="mr-2 h-4 w-4" />
								Manage Employees
							</Button>
						{/if}
					</div>
				</Card.Header>
				<Card.Content class="space-y-4">
					<!-- Search -->
					<div class="relative">
						<Search
							class="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted-foreground"
						/>
						<Input
							type="text"
							placeholder="Search employees by name, email, or role..."
							bind:value={employeeSearchTerm}
							class="pl-9"
						/>
					</div>

					<!-- Employees Table -->
					{#if filteredEmployees.length > 0}
						<div class="rounded-md border">
							<Table.Root>
								<Table.Header>
									<Table.Row>
										<Table.Head>Employee</Table.Head>
										<Table.Head>Role</Table.Head>
										<Table.Head>Hire Date</Table.Head>
										<Table.Head>Status</Table.Head>
										{#if canViewEmployees}
											<Table.Head class="text-right">Actions</Table.Head>
										{/if}
									</Table.Row>
								</Table.Header>
								<Table.Body>
									{#each filteredEmployees as employee}
										<Table.Row>
											<Table.Cell>
												<div>
													<div class="font-medium">{employee.displayName}</div>
													<div class="text-sm text-muted-foreground">{employee.email}</div>
												</div>
											</Table.Cell>
											<Table.Cell>
												<Badge variant="outline">{employee.role}</Badge>
											</Table.Cell>
											<Table.Cell>{formatDate(employee.hireDate)}</Table.Cell>
											<Table.Cell>
												{#if employee.isActive}
													<Badge variant="default">Active</Badge>
												{:else}
													<Badge variant="destructive">Inactive</Badge>
												{/if}
											</Table.Cell>
											{#if canViewEmployees}
												<Table.Cell class="text-right">
													<Button
														variant="ghost"
														size="sm"
														href="/dashboard/employees/{employee.id}"
													>
														<Eye class="mr-2 h-4 w-4" />
														View
													</Button>
												</Table.Cell>
											{/if}
										</Table.Row>
									{/each}
								</Table.Body>
							</Table.Root>
						</div>
					{:else}
						<div class="py-8 text-center">
							<Users class="mx-auto h-12 w-12 text-muted-foreground" />
							<h3 class="mt-4 text-lg font-semibold">No employees found</h3>
							<p class="text-muted-foreground">
								{#if employeeSearchTerm}
									No employees match your search criteria.
								{:else}
									This department has no employees yet.
								{/if}
							</p>
						</div>
					{/if}
				</Card.Content>
			</Card.Root>
		</div>
	</div>
</div>
