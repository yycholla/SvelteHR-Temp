<script lang="ts">
	import { onMount } from 'svelte';
	import * as Card from '$lib/components/ui/card';
	import * as Select from '$lib/components/ui/select';
	import * as Tabs from '$lib/components/ui/tabs';
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
		RefreshCw,
		Network
	} from 'lucide-svelte';

	// Use the same working GraphQL operations as admin users page
	import {
		getAllUsers,
		getUserRoles,
		formatUserRole,
		getUserDepartment,
		type User,
		type UserRole
	} from '$lib/graphql/user-operations.js';

	// Direct fetch function to bypass complex GraphQL client
	async function fetchUsersDirectly(): Promise<User[]> {
		try {
			const token = localStorage.getItem('postgraphile-jwt-token');
			const query = `
				query GetAllUsers {
					allUsers {
						nodes {
							id
							email
							displayName
							jobTitle
							isActive
							createdAt
							hireDate
							lastLogin
							userRoleAssignmentsByUserId {
								nodes {
									userRoleByRoleId {
										name
										level
										description
									}
									isActive
									createdAt
								}
							}
						}
					}
				}
			`;

			const response = await fetch('http://localhost:4000/graphql', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					...(token ? { Authorization: `Bearer ${token}` } : {})
				},
				body: JSON.stringify({ query })
			});

			const result = await response.json();

			if (result.errors) {
				throw new Error(result.errors[0].message);
			}

			return result.data?.allUsers?.nodes || [];
		} catch (error) {
			console.error('Error fetching users:', error);
			throw error;
		}
	}

	// State
	let users: User[] = $state([]);
	let userRoles: UserRole[] = $state([]);
	let loading = $state(false);
	let initialLoading = $state(true);
	let searchTerm = $state('');
	let selectedDepartment = $state('all');
	let selectedRole = $state('all');
	let viewMode: 'grid' | 'list' = $state('grid');
	let showFilters = $state(false);

	// Load data on component mount
	onMount(async () => {
		await loadUsers();
		await loadUserRoles();
		initialLoading = false;
	});

	async function loadUsers() {
		try {
			loading = true;
			users = await fetchUsersDirectly();
			// Force update filtered employees after state change
			setTimeout(() => updateFilteredEmployees(), 100);
		} catch (error) {
			console.error('Error loading users:', error);
		} finally {
			loading = false;
		}
	}

	async function loadUserRoles() {
		try {
			userRoles = await getUserRoles();
			console.log('Employee Directory: Loaded', userRoles.length, 'roles');
		} catch (error) {
			console.error('Employee Directory: Error loading user roles:', error);
		}
	}

	// Filtered employees state
	let filteredEmployees = $state([]);

	// Update filtered employees based on current filters
	function updateFilteredEmployees() {
		if (users.length === 0) {
			filteredEmployees = [];
			return;
		}

		let employees = [...users];

		// Only show active employees in directory
		employees = employees.filter((emp) => emp.isActive);

		// Search filter
		if (searchTerm) {
			const search = searchTerm.toLowerCase();
			employees = employees.filter(
				(emp) =>
					emp.displayName?.toLowerCase().includes(search) ||
					emp.email?.toLowerCase().includes(search) ||
					emp.jobTitle?.toLowerCase().includes(search)
			);
		}

		// Department filter
		if (selectedDepartment !== 'all') {
			employees = employees.filter((emp) => {
				const dept = getUserDepartment(emp);
				return dept.toLowerCase() === selectedDepartment.toLowerCase();
			});
		}

		// Role filter
		if (selectedRole !== 'all') {
			employees = employees.filter((emp) => {
				const role = formatUserRole(emp);
				return role.toLowerCase().includes(selectedRole.toLowerCase());
			});
		}

		filteredEmployees = employees.sort((a, b) =>
			(a.displayName || a.email).localeCompare(b.displayName || b.email)
		);
	}

	// Update filtered employees whenever filters change
	$effect(() => {
		updateFilteredEmployees();
	});

	// Get unique departments for filters
	const departments = $derived(() => {
		if (users.length === 0) return [];

		const depts = users
			.map((user) => getUserDepartment(user))
			.filter((dept, index, arr) => arr.indexOf(dept) === index && dept !== 'Unassigned')
			.sort();

		return depts;
	});

	// Get unique roles for filters
	const roles = $derived(() => {
		return userRoles.map((role) => role.name).sort();
	});

	// Get employee's primary role
	const getPrimaryRole = (employee: User) => {
		return formatUserRole(employee);
	};

	// Get employee's department name
	const getEmployeeDepartment = (employee: User) => {
		return getUserDepartment(employee);
	};

	// Get status variant
	const getStatusVariant = (employee: User) => {
		if (!employee.isActive) return 'destructive';
		return 'default';
	};

	// Get status text
	const getStatusText = (employee: User) => {
		if (!employee.isActive) return 'Inactive';
		return 'Active';
	};

	// Refresh data
	const refresh = async () => {
		await loadUsers();
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
	<title>Employees - SvelteHR</title>
	<meta name="description" content="Browse employee directory and organizational structure" />
</svelte:head>

<div class="space-y-6">
	<!-- Header -->
	<div class="flex flex-col space-y-4 md:flex-row md:items-center md:justify-between md:space-y-0">
		<div>
			<h1 class="flex items-center gap-3 text-3xl font-bold tracking-tight">
				<Users class="h-8 w-8" />
				Employees
			</h1>
			<p class="text-muted-foreground">Find colleagues and explore organizational structure</p>
		</div>

		<div class="flex items-center space-x-2">
			<!-- Refresh -->
			<Button variant="outline" size="sm" onclick={refresh} disabled={loading}>
				<RefreshCw class="h-4 w-4 {loading ? 'animate-spin' : ''}" />
			</Button>
		</div>
	</div>

	<!-- Tabs -->
	<Tabs.Root value="directory" class="w-full">
		<Tabs.List class="grid w-full grid-cols-2">
			<Tabs.Trigger value="directory" class="flex items-center gap-2">
				<Users class="h-4 w-4" />
				Directory
			</Tabs.Trigger>
			<Tabs.Trigger value="orgmap" class="flex items-center gap-2">
				<Network class="h-4 w-4" />
				Organization Map
			</Tabs.Trigger>
		</Tabs.List>

		<!-- Directory Tab -->
		<Tabs.Content value="directory" class="space-y-6">
			<!-- View Controls -->
			<div class="flex items-center justify-between">
				<div class="text-sm text-muted-foreground">
					{filteredEmployees.length} employee{filteredEmployees.length !== 1 ? 's' : ''} found
				</div>
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
	{#if !loading && !initialLoading}
		<div class="text-sm text-muted-foreground">
			Found {filteredEmployees.length} employee{filteredEmployees.length !== 1 ? 's' : ''}
		</div>
	{/if}

	<!-- Loading state -->
	{#if initialLoading}
		<div class="flex items-center justify-center py-12">
			<div class="flex items-center space-x-2">
				<RefreshCw class="h-4 w-4 animate-spin" />
				<p>Loading directory...</p>
			</div>
		</div>
	{/if}

	<!-- Employee Directory -->
	{#if !initialLoading}
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
		</Tabs.Content>

		<!-- Organization Map Tab -->
		<Tabs.Content value="orgmap" class="space-y-6">
			<Card.Root>
				<Card.Header>
					<Card.Title class="flex items-center gap-2">
						<Network class="h-5 w-5" />
						Organization Map
					</Card.Title>
					<Card.Description>
						Visual representation of the organizational structure
					</Card.Description>
				</Card.Header>
				<Card.Content class="py-12">
					<div class="flex flex-col items-center justify-center space-y-4 text-center">
						<Network class="h-12 w-12 text-muted-foreground" />
						<h3 class="text-lg font-semibold">Organization Map</h3>
						<p class="text-muted-foreground max-w-md">
							Interactive organizational chart showing reporting structure and team relationships.
						</p>
						<div class="text-sm text-muted-foreground">
							Coming soon - this feature is under development
						</div>
					</div>
				</Card.Content>
			</Card.Root>
		</Tabs.Content>
	</Tabs.Root>
</div>
