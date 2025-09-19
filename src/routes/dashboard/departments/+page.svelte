<script lang="ts">
	import { onMount } from 'svelte';
	import { queryStore } from '@urql/svelte';
	import { createUrqlClient } from '$lib/graphql/client';
	import { currentUser, hasRole } from '$lib/stores/auth';
	import RoleGuard from '$lib/components/auth/RoleGuard.svelte';
	import * as Card from '$lib/components/ui/card';
	import * as Table from '$lib/components/ui/table';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Badge } from '$lib/components/ui/badge';
	import { Building2, Plus, Search, Users, Edit, Trash2, RefreshCw, TreePine } from 'lucide-svelte';

	// Import our new GraphQL operations
	import {
		GET_DEPARTMENTS_WITH_COUNTS_QUERY,
		GET_DEPARTMENTS_QUERY,
		type Department,
		type DepartmentWithStats
	} from '$lib/graphql/department-management-operations';

	interface ExtendedDepartment extends Department {
		employeeCount?: {
			totalCount: number;
		};
		activeEmployeeCount?: {
			totalCount: number;
		};
	}

	// State
	let searchTerm = $state('');

	// Create client and query
	const client = createUrqlClient();
	let departmentsQuery: any = $state(null);
	let queryState = $state({ fetching: true, error: null, data: null });

	onMount(() => {
		try {
			departmentsQuery = queryStore({
				client,
				query: GET_DEPARTMENTS_WITH_COUNTS_QUERY,
				variables: {}
			});
		} catch (error) {
			console.error('Error initializing departments query:', error);
		}
	});

	// Update query state
	$effect(() => {
		if (departmentsQuery) {
			const unsubscribe = departmentsQuery.subscribe((state: any) => {
				queryState = {
					fetching: state.fetching,
					error: state.error,
					data: state.data
				};
			});
			return unsubscribe;
		}
	});

	// Filter departments
	const filteredDepartments = $derived(() => {
		if (!queryState.data) return [];
		let departments = queryState.data?.allDepartments?.nodes || [];

		// Search filter
		if (searchTerm) {
			const search = searchTerm.toLowerCase();
			departments = departments.filter(
				(dept: Department) =>
					dept.name?.toLowerCase().includes(search) ||
					dept.description?.toLowerCase().includes(search)
			);
		}

		return departments.sort((a: Department, b: Department) => a.name.localeCompare(b.name));
	});

	// Calculate total employees
	const totalEmployees = $derived(() => {
		return filteredDepartments.reduce(
			(sum, dept) => sum + (dept.employeeCount?.totalCount || 0),
			0
		);
	});

	// Get department employee info
	const getEmployeeInfo = (department: ExtendedDepartment) => {
		const totalCount = department.employeeCount?.totalCount || 0;
		const activeCount = department.activeEmployeeCount?.totalCount || 0;
		return {
			totalEmployees: totalCount,
			activeEmployees: activeCount,
			inactiveEmployees: totalCount - activeCount
		};
	};

	// Refresh data
	const refresh = () => {
		if (departmentsQuery?.rerun) {
			departmentsQuery.rerun({ requestPolicy: 'network-only' });
		}
	};
</script>

<svelte:head>
	<title>Departments - SvelteHR</title>
	<meta name="description" content="Manage organizational departments and structure" />
</svelte:head>

<div class="space-y-6">
	<!-- Header -->
	<div class="flex flex-col space-y-4 md:flex-row md:items-center md:justify-between md:space-y-0">
		<div>
			<h1 class="flex items-center gap-3 text-3xl font-bold tracking-tight">
				<Building2 class="h-8 w-8" />
				Departments
			</h1>
			<p class="text-muted-foreground">Manage organizational structure and department hierarchy</p>
		</div>

		<div class="flex items-center space-x-2">
			<RoleGuard permissions={['hr:manage', 'admin:*']}>
				<Button href="/dashboard/departments/new">
					<Plus class="mr-2 h-4 w-4" />
					Add Department
				</Button>
			</RoleGuard>

			<Button variant="outline" size="sm" onclick={refresh} disabled={queryState.fetching}>
				<RefreshCw class="h-4 w-4 {queryState.fetching ? 'animate-spin' : ''}" />
			</Button>
		</div>
	</div>

	<!-- Summary Cards -->
	{#if !queryState.fetching && !queryState.error}
		<div class="grid grid-cols-1 gap-4 md:grid-cols-3">
			<Card.Root>
				<Card.Content class="p-6">
					<div class="flex items-center space-x-2">
						<Building2 class="h-5 w-5 text-blue-600" />
						<div>
							<p class="text-sm font-medium text-muted-foreground">Total Departments</p>
							<p class="text-2xl font-bold">{filteredDepartments.length}</p>
						</div>
					</div>
				</Card.Content>
			</Card.Root>

			<Card.Root>
				<Card.Content class="p-6">
					<div class="flex items-center space-x-2">
						<Users class="h-5 w-5 text-green-600" />
						<div>
							<p class="text-sm font-medium text-muted-foreground">Total Employees</p>
							<p class="text-2xl font-bold">{totalEmployees}</p>
						</div>
					</div>
				</Card.Content>
			</Card.Root>

			<Card.Root>
				<Card.Content class="p-6">
					<div class="flex items-center space-x-2">
						<TreePine class="h-5 w-5 text-purple-600" />
						<div>
							<p class="text-sm font-medium text-muted-foreground">Avg Employees per Dept</p>
							<p class="text-2xl font-bold">
								{filteredDepartments.length > 0
									? Math.round(totalEmployees / filteredDepartments.length)
									: 0}
							</p>
						</div>
					</div>
				</Card.Content>
			</Card.Root>
		</div>
	{/if}

	<!-- Search and Filters -->
	<Card.Root>
		<Card.Content class="p-6">
			<div class="flex flex-col space-y-4 md:flex-row md:items-center md:space-x-4 md:space-y-0">
				<!-- Search -->
				<div class="relative flex-1">
					<Search class="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
					<Input placeholder="Search departments..." bind:value={searchTerm} class="pl-10" />
				</div>
			</div>
		</Card.Content>
	</Card.Root>

	<!-- Results count -->
	{#if !queryState.fetching}
		<div class="text-sm text-muted-foreground">
			Found {filteredDepartments.length} department{filteredDepartments.length !== 1 ? 's' : ''}
		</div>
	{/if}

	<!-- Loading state -->
	{#if queryState.fetching && !queryState.data}
		<div class="flex items-center justify-center py-12">
			<div class="flex items-center space-x-2">
				<RefreshCw class="h-4 w-4 animate-spin" />
				<p>Loading departments...</p>
			</div>
		</div>
	{/if}

	<!-- Error state -->
	{#if queryState.error}
		<Card.Root>
			<Card.Content class="py-8">
				<div class="space-y-4 text-center">
					<h3 class="text-lg font-semibold">Failed to load departments</h3>
					<p class="text-muted-foreground">{queryState.error.message}</p>
					<Button variant="outline" onclick={refresh}>Try Again</Button>
				</div>
			</Card.Content>
		</Card.Root>
	{/if}

	<!-- Departments Table -->
	{#if !queryState.fetching && !queryState.error}
		{#if filteredDepartments.length === 0}
			<Card.Root>
				<Card.Content class="py-12">
					<div class="space-y-4 text-center">
						<Building2 class="mx-auto h-12 w-12 text-muted-foreground" />
						<h3 class="text-lg font-semibold">No departments found</h3>
						<p class="text-muted-foreground">
							{#if searchTerm}
								Try adjusting your search terms.
							{:else}
								Get started by adding your first department.
							{/if}
						</p>
						<RoleGuard permissions={['hr:manage', 'admin:*']}>
							<Button href="/dashboard/departments/new">
								<Plus class="mr-2 h-4 w-4" />
								Add Department
							</Button>
						</RoleGuard>
					</div>
				</Card.Content>
			</Card.Root>
		{:else}
			<Card.Root>
				<Table.Root>
					<Table.Header>
						<Table.Row>
							<Table.Head>Department</Table.Head>
							<Table.Head>Description</Table.Head>
							<Table.Head>Total Employees</Table.Head>
							<Table.Head>Active Employees</Table.Head>
							<Table.Head>Created</Table.Head>
							<Table.Head class="w-24">Actions</Table.Head>
						</Table.Row>
					</Table.Header>
					<Table.Body>
						{#each filteredDepartments as department (department.id)}
							{@const employeeInfo = getEmployeeInfo(department)}
							<Table.Row>
								<Table.Cell>
									<div class="flex items-center space-x-2">
										<div class="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
											<Building2 class="h-4 w-4" />
										</div>
										<div>
											<div class="font-medium">{department.name}</div>
											<div class="text-sm text-muted-foreground">
												ID: {department.id.slice(0, 8)}...
											</div>
										</div>
									</div>
								</Table.Cell>
								<Table.Cell>
									<span class="text-sm">{department.description || '-'}</span>
								</Table.Cell>
								<Table.Cell>
									<span class="text-sm font-medium">{employeeInfo.totalEmployees}</span>
								</Table.Cell>
								<Table.Cell>
									<div class="flex items-center space-x-2">
										<span class="text-sm font-medium">{employeeInfo.activeEmployees}</span>
										{#if employeeInfo.inactiveEmployees > 0}
											<Badge variant="secondary" class="text-xs">
												+{employeeInfo.inactiveEmployees} inactive
											</Badge>
										{/if}
									</div>
								</Table.Cell>
								<Table.Cell>
									<span class="text-sm text-muted-foreground">
										{new Date(department.createdAt).toLocaleDateString()}
									</span>
								</Table.Cell>
								<Table.Cell>
									<div class="flex items-center space-x-1">
										<RoleGuard permissions={['hr:manage', 'admin:*']}>
											<Button variant="ghost" size="sm">
												<Edit class="h-4 w-4" />
											</Button>
											<Button variant="ghost" size="sm">
												<Trash2 class="h-4 w-4" />
											</Button>
										</RoleGuard>
									</div>
								</Table.Cell>
							</Table.Row>
						{/each}
					</Table.Body>
				</Table.Root>
			</Card.Root>
		{/if}
	{/if}
</div>
