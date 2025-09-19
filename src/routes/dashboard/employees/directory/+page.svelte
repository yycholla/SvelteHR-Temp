<script lang="ts">
	import { onMount } from 'svelte';
	import { queryStore } from '@urql/svelte';
	import { createUrqlClient } from '$lib/graphql/client';
	import * as Card from '$lib/components/ui/card';
	import * as Select from '$lib/components/ui/select';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Badge } from '$lib/components/ui/badge';
	import {
		Search,
		Users,
		Building2,
		Mail,
		Phone,
		MapPin,
		Filter,
		Grid,
		List,
		RefreshCw
	} from 'lucide-svelte';

	// Import our new GraphQL operations
	import {
		GET_EMPLOYEES_QUERY,
		GET_ALL_DEPARTMENTS_QUERY,
		GET_ALL_USER_ROLES_QUERY,
		SEARCH_EMPLOYEES_QUERY,
		type Employee,
		type Department,
		type UserRole
	} from '$lib/graphql/employee-directory-operations';

	interface ExtendedEmployee extends Employee {
		jobTitle?: string;
		onboardingStatus?: string;
		hireDate?: string;
		userRoleAssignmentsByEmployeeId?: {
			nodes: Array<{
				userRoleByRoleId: {
					name: string;
					level: number;
				};
				assignedAt: string;
			}>;
		};
	}

	// State
	let searchTerm = $state('');
	let selectedDepartment = $state('all');
	let selectedRole = $state('all');
	let viewMode: 'grid' | 'list' = $state('grid');
	let showFilters = $state(false);

	// Create client
	const client = createUrqlClient();
	let usersQuery: any = $state(null);
	let departmentsQuery: any = $state(null);
	let rolesQuery: any = $state(null);
	let queryState = $state({ fetching: true, error: null, data: null });
	let departmentsData: Department[] = $state([]);
	let rolesData: UserRole[] = $state([]);

	onMount(() => {
		try {
			// Initialize employees query
			usersQuery = queryStore({
				client,
				query: GET_EMPLOYEES_QUERY,
				variables: { first: 100, orderBy: ['DISPLAY_NAME_ASC'] }
			});

			// Initialize departments query
			departmentsQuery = queryStore({
				client,
				query: GET_ALL_DEPARTMENTS_QUERY
			});

			// Initialize roles query
			rolesQuery = queryStore({
				client,
				query: GET_ALL_USER_ROLES_QUERY
			});
		} catch (error) {
			console.error('Error initializing query stores:', error);
		}
	});

	// Update query state
	$effect(() => {
		if (usersQuery) {
			const unsubscribe = usersQuery.subscribe((state: any) => {
				queryState = {
					fetching: state.fetching,
					error: state.error,
					data: state.data
				};
			});
			return unsubscribe;
		}
	});

	// Update departments data
	$effect(() => {
		if (departmentsQuery) {
			const unsubscribe = departmentsQuery.subscribe((state: any) => {
				if (state.data?.allDepartments?.nodes) {
					departmentsData = state.data.allDepartments.nodes;
				}
			});
			return unsubscribe;
		}
	});

	// Update roles data
	$effect(() => {
		if (rolesQuery) {
			const unsubscribe = rolesQuery.subscribe((state: any) => {
				if (state.data?.allUserRoles?.nodes) {
					rolesData = state.data.allUserRoles.nodes;
				}
			});
			return unsubscribe;
		}
	});

	// Filter employees
	const filteredEmployees = $derived(() => {
		if (!queryState.data) return [];
		let employees = queryState.data?.allUsers?.nodes || [];

		// Only show active employees in directory
		employees = employees.filter((emp: ExtendedEmployee) => emp.isActive);

		// Search filter
		if (searchTerm) {
			const search = searchTerm.toLowerCase();
			employees = employees.filter(
				(emp: ExtendedEmployee) =>
					emp.displayName?.toLowerCase().includes(search) ||
					emp.email?.toLowerCase().includes(search) ||
					emp.jobTitle?.toLowerCase().includes(search)
			);
		}

		// Department filter
		if (selectedDepartment !== 'all') {
			employees = employees.filter((emp: ExtendedEmployee) => {
				// Check if employee metadata contains departmentId
				const departmentId = emp.metadata?.departmentId;
				if (!departmentId) return false;

				const department = departmentsData.find((d) => d.id === departmentId);
				return department?.name.toLowerCase() === selectedDepartment.toLowerCase();
			});
		}

		// Role filter
		if (selectedRole !== 'all') {
			employees = employees.filter((emp: ExtendedEmployee) => {
				const roles = emp.userRoleAssignmentsByEmployeeId?.nodes || [];
				return roles.some(
					(assignment) =>
						assignment.userRoleByRoleId.name.toLowerCase() === selectedRole.toLowerCase()
				);
			});
		}

		return employees.sort((a: ExtendedEmployee, b: ExtendedEmployee) =>
			a.displayName.localeCompare(b.displayName)
		);
	});

	// Get unique departments for filters
	const departments = $derived(() => {
		return departmentsData.map((dept) => dept.name).sort();
	});

	// Get unique roles for filters
	const roles = $derived(() => {
		return rolesData.map((role) => role.name).sort();
	});

	// Get employee's primary role
	const getPrimaryRole = (employee: ExtendedEmployee) => {
		const assignments = employee.userRoleAssignmentsByEmployeeId?.nodes || [];
		if (assignments.length === 0) return 'Employee';

		// Return highest level role
		const highest = assignments.reduce((prev, curr) =>
			curr.userRoleByRoleId.level > prev.userRoleByRoleId.level ? curr : prev
		);
		return highest.userRoleByRoleId.name;
	};

	// Get employee's department name
	const getEmployeeDepartment = (employee: ExtendedEmployee) => {
		const departmentId = employee.metadata?.departmentId;
		if (!departmentId) return 'No Department';

		const department = departmentsData.find((d) => d.id === departmentId);
		return department?.name || 'Unknown Department';
	};

	// Get status variant
	const getStatusVariant = (employee: ExtendedEmployee) => {
		if (!employee.isActive) return 'destructive';
		if (employee.onboardingStatus === 'onboarding') return 'secondary';
		return 'default';
	};

	// Get status text
	const getStatusText = (employee: ExtendedEmployee) => {
		if (!employee.isActive) return 'Inactive';
		if (employee.onboardingStatus === 'onboarding') return 'Onboarding';
		return 'Active';
	};

	// Refresh data
	const refresh = () => {
		if (usersQuery?.rerun) {
			usersQuery.rerun({ requestPolicy: 'network-only' });
		}
	};

	// Get employee initials
	const getInitials = (name: string) => {
		return name
			.split(' ')
			.map((n) => n[0])
			.join('')
			.toUpperCase()
			.slice(0, 2);
	};
</script>

<svelte:head>
	<title>Employee Directory - SvelteHR</title>
	<meta name="description" content="Browse and search our company directory" />
</svelte:head>

<div class="space-y-6">
	<!-- Header -->
	<div class="flex flex-col space-y-4 md:flex-row md:items-center md:justify-between md:space-y-0">
		<div>
			<h1 class="flex items-center gap-3 text-3xl font-bold tracking-tight">
				<Users class="h-8 w-8" />
				Employee Directory
			</h1>
			<p class="text-muted-foreground">Find and connect with colleagues across the organization</p>
		</div>

		<div class="flex items-center space-x-2">
			<!-- View toggle -->
			<div class="flex rounded-lg border p-1">
				<Button
					variant={viewMode === 'grid' ? 'default' : 'ghost'}
					size="sm"
					onclick={() => (viewMode = 'grid')}
				>
					<Grid class="h-4 w-4" />
				</Button>
				<Button
					variant={viewMode === 'list' ? 'default' : 'ghost'}
					size="sm"
					onclick={() => (viewMode = 'list')}
				>
					<List class="h-4 w-4" />
				</Button>
			</div>

			<!-- Refresh -->
			<Button variant="outline" size="sm" onclick={refresh} disabled={queryState.fetching}>
				<RefreshCw class="h-4 w-4 {queryState.fetching ? 'animate-spin' : ''}" />
			</Button>
		</div>
	</div>

	<!-- Search and Filters -->
	<Card.Root>
		<Card.Content class="p-6">
			<div class="flex flex-col space-y-4 md:flex-row md:items-center md:space-x-4 md:space-y-0">
				<!-- Search -->
				<div class="relative flex-1">
					<Search class="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
					<Input
						placeholder="Search by name, email, or job title..."
						bind:value={searchTerm}
						class="pl-10"
					/>
				</div>

				<!-- Filters -->
				<div class="flex items-center space-x-2">
					<Button variant="outline" size="sm" onclick={() => (showFilters = !showFilters)}>
						<Filter class="mr-2 h-4 w-4" />
						Filters
					</Button>

					{#if selectedRole !== 'all' || selectedDepartment !== 'all'}
						<Badge variant="secondary">
							{selectedRole !== 'all' ? selectedRole : ''}
							{selectedRole !== 'all' && selectedDepartment !== 'all' ? ', ' : ''}
							{selectedDepartment !== 'all' ? selectedDepartment : ''}
						</Badge>
						<Button
							variant="ghost"
							size="sm"
							onclick={() => {
								selectedRole = 'all';
								selectedDepartment = 'all';
							}}
						>
							Clear
						</Button>
					{/if}
				</div>
			</div>

			<!-- Filter dropdowns -->
			{#if showFilters}
				<div class="mt-4 grid grid-cols-1 gap-4 border-t pt-4 md:grid-cols-2">
					<div class="space-y-2">
						<label for="role-select" class="text-sm font-medium">Role</label>
						<Select.Root bind:selected={selectedRole}>
							<Select.Trigger id="role-select">
								<Select.Value placeholder="All roles" />
							</Select.Trigger>
							<Select.Content>
								<Select.Item value="all">All roles</Select.Item>
								{#each roles as role}
									<Select.Item value={role}>{role}</Select.Item>
								{/each}
							</Select.Content>
						</Select.Root>
					</div>

					<div class="space-y-2">
						<label for="department-select" class="text-sm font-medium">Department</label>
						<Select.Root bind:selected={selectedDepartment}>
							<Select.Trigger id="department-select">
								<Select.Value placeholder="All departments" />
							</Select.Trigger>
							<Select.Content>
								<Select.Item value="all">All departments</Select.Item>
								{#each departments as dept}
									<Select.Item value={dept}>{dept}</Select.Item>
								{/each}
							</Select.Content>
						</Select.Root>
					</div>
				</div>
			{/if}
		</Card.Content>
	</Card.Root>

	<!-- Results count -->
	{#if !queryState.fetching}
		<div class="text-sm text-muted-foreground">
			Found {filteredEmployees.length} employee{filteredEmployees.length !== 1 ? 's' : ''}
		</div>
	{/if}

	<!-- Loading state -->
	{#if queryState.fetching && !queryState.data}
		<div class="flex items-center justify-center py-12">
			<div class="flex items-center space-x-2">
				<RefreshCw class="h-4 w-4 animate-spin" />
				<p>Loading directory...</p>
			</div>
		</div>
	{/if}

	<!-- Error state -->
	{#if queryState.error}
		<Card.Root>
			<Card.Content class="py-8">
				<div class="space-y-4 text-center">
					<h3 class="text-lg font-semibold">Failed to load directory</h3>
					<p class="text-muted-foreground">{queryState.error.message}</p>
					<Button variant="outline" onclick={refresh}>Try Again</Button>
				</div>
			</Card.Content>
		</Card.Root>
	{/if}

	<!-- Employee Directory -->
	{#if !queryState.fetching && !queryState.error}
		{#if filteredEmployees.length === 0}
			<Card.Root>
				<Card.Content class="py-12">
					<div class="space-y-4 text-center">
						<Users class="mx-auto h-12 w-12 text-muted-foreground" />
						<h3 class="text-lg font-semibold">No employees found</h3>
						<p class="text-muted-foreground">Try adjusting your search terms or filters.</p>
					</div>
				</Card.Content>
			</Card.Root>
		{:else if viewMode === 'grid'}
			<!-- Grid view -->
			<div class="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
				{#each filteredEmployees as employee (employee.id)}
					<Card.Root class="cursor-pointer transition-shadow hover:shadow-md">
						<Card.Content class="p-6">
							<div class="space-y-4 text-center">
								<!-- Avatar -->
								<div
									class="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-primary text-xl font-semibold text-primary-foreground"
								>
									{getInitials(employee.displayName)}
								</div>

								<!-- Info -->
								<div class="space-y-1">
									<h3 class="text-lg font-semibold">{employee.displayName}</h3>
									<p class="text-sm text-muted-foreground">{employee.jobTitle || 'No title'}</p>
									<Badge variant="outline" class="text-xs">
										{getPrimaryRole(employee)}
									</Badge>
								</div>

								<!-- Contact -->
								<div class="space-y-2 border-t pt-2">
									<div
										class="flex items-center justify-center space-x-2 text-sm text-muted-foreground"
									>
										<Mail class="h-3 w-3" />
										<span class="truncate">{employee.email}</span>
									</div>

									<div
										class="flex items-center justify-center space-x-2 text-sm text-muted-foreground"
									>
										<Building2 class="h-3 w-3" />
										<span>{getEmployeeDepartment(employee)}</span>
									</div>

									{#if employee.hireDate}
										<div class="text-xs text-muted-foreground">
											Joined {new Date(employee.hireDate).toLocaleDateString()}
										</div>
									{/if}
								</div>

								<!-- Status -->
								<Badge variant={getStatusVariant(employee)} class="text-xs">
									{getStatusText(employee)}
								</Badge>
							</div>
						</Card.Content>
					</Card.Root>
				{/each}
			</div>
		{:else}
			<!-- List view -->
			<Card.Root>
				<Card.Content class="p-0">
					<div class="divide-y">
						{#each filteredEmployees as employee (employee.id)}
							<div class="cursor-pointer p-6 transition-colors hover:bg-muted/50">
								<div class="flex items-center space-x-4">
									<!-- Avatar -->
									<div
										class="flex h-12 w-12 items-center justify-center rounded-full bg-primary font-semibold text-primary-foreground"
									>
										{getInitials(employee.displayName)}
									</div>

									<!-- Info -->
									<div class="flex-1 space-y-1">
										<div class="flex items-center space-x-3">
											<h3 class="font-semibold">{employee.displayName}</h3>
											<Badge variant="outline" class="text-xs">
												{getPrimaryRole(employee)}
											</Badge>
											<Badge variant={getStatusVariant(employee)} class="text-xs">
												{getStatusText(employee)}
											</Badge>
										</div>

										<p class="text-sm text-muted-foreground">{employee.jobTitle || 'No title'}</p>

										<div class="flex items-center space-x-4 text-sm text-muted-foreground">
											<div class="flex items-center space-x-1">
												<Mail class="h-3 w-3" />
												<span>{employee.email}</span>
											</div>

											<div class="flex items-center space-x-1">
												<Building2 class="h-3 w-3" />
												<span>{getEmployeeDepartment(employee)}</span>
											</div>

											{#if employee.hireDate}
												<div class="flex items-center space-x-1">
													<span>Joined {new Date(employee.hireDate).toLocaleDateString()}</span>
												</div>
											{/if}
										</div>
									</div>

									<!-- Actions -->
									<div class="flex items-center space-x-2">
										<Button variant="outline" size="sm">
											<Mail class="mr-2 h-4 w-4" />
											Contact
										</Button>
									</div>
								</div>
							</div>
						{/each}
					</div>
				</Card.Content>
			</Card.Root>
		{/if}
	{/if}
</div>
