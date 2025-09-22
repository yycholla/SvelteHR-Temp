<script lang="ts">
	import { onMount } from 'svelte';
	import * as Card from '$lib/components/ui/card';
	import * as Select from '$lib/components/ui/select';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Badge } from '$lib/components/ui/badge';
	import {
		Search,
		Building2,
		Users,
		Mail,
		Phone,
		MapPin,
		Filter,
		Grid,
		List,
		RefreshCw,
		Plus,
		Settings
	} from 'lucide-svelte';

	// Use GraphQL operations for departments
	import {
		getAllUsers,
		getUserRoles,
		formatUserRole,
		getUserDepartment,
		type User,
		type UserRole
	} from '$lib/graphql/user-operations.js';

	// Department interface
	interface Department {
		name: string;
		employeeCount: number;
		activeEmployees: User[];
		manager?: User;
		description?: string;
	}

	// Direct fetch function for departments data
	async function fetchDepartmentsData(): Promise<Department[]> {
		try {
			const token = localStorage.getItem('postgraphile-jwt-token');

			// First get all users to calculate department stats
			const usersResponse = await fetch('http://localhost:4000/graphql', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					...(token ? { Authorization: `Bearer ${token}` } : {})
				},
				body: JSON.stringify({
					query: `
						query GetAllUsers {
							allUsers {
								nodes {
									id
									email
									displayName
									jobTitle
									isActive
									userRoleAssignmentsByUserId {
										nodes {
											userRoleByRoleId {
												name
												level
											}
											isActive
										}
									}
								}
							}
						}
					`
				})
			});

			const usersResult = await usersResponse.json();
			if (usersResult.errors) {
				throw new Error(usersResult.errors[0].message);
			}

			const users = usersResult.data?.allUsers?.nodes || [];

			// Group users by department
			const departmentMap = new Map<string, User[]>();

			users.forEach((user: any) => {
				if (user.isActive) {
					// Determine department from role assignments
					const roleAssignments = user.userRoleAssignmentsByUserId?.nodes || [];
					let department = 'General';

					if (roleAssignments.length > 0) {
						const roleName = roleAssignments[0].userRoleByRoleId?.name || '';
						if (roleName.includes('hr')) department = 'Human Resources';
						else if (roleName.includes('admin')) department = 'Administration';
						else if (roleName.includes('manager')) department = 'Management';
						else if (roleName.includes('finance')) department = 'Finance';
						else if (roleName.includes('engineering')) department = 'Engineering';
						else if (roleName.includes('marketing')) department = 'Marketing';
						else if (roleName.includes('sales')) department = 'Sales';
					}

					if (!departmentMap.has(department)) {
						departmentMap.set(department, []);
					}
					departmentMap.get(department)!.push(user);
				}
			});

			// Convert to Department objects
			const departments: Department[] = [];
			departmentMap.forEach((employees, deptName) => {
				// Find manager (highest role level)
				let manager = employees.find(emp => {
					const roles = emp.userRoleAssignmentsByUserId?.nodes || [];
					return roles.some((r: any) => r.userRoleByRoleId?.level >= 60);
				});

				departments.push({
					name: deptName,
					employeeCount: employees.length,
					activeEmployees: employees,
					manager,
					description: `${deptName} department with ${employees.length} active employees`
				});
			});

			return departments.sort((a, b) => a.name.localeCompare(b.name));
		} catch (error) {
			console.error('Error fetching departments data:', error);
			throw error;
		}
	}

	// State
	let departments: Department[] = $state([]);
	let loading = $state(false);
	let initialLoading = $state(true);
	let searchTerm = $state('');
	let selectedSize = $state('all'); // all, small (<5), medium (5-15), large (>15)
	let viewMode: 'grid' | 'list' = $state('grid');
	let showFilters = $state(false);

	// Load data on component mount
	onMount(async () => {
		await loadDepartments();
		initialLoading = false;
	});

	async function loadDepartments() {
		try {
			loading = true;
			departments = await fetchDepartmentsData();
		} catch (error) {
			console.error('Error loading departments:', error);
		} finally {
			loading = false;
		}
	}

	// Filtered departments
	let filteredDepartments = $state([]);

	function updateFilteredDepartments() {
		if (departments.length === 0) {
			filteredDepartments = [];
			return;
		}

		let depts = [...departments];

		// Search filter
		if (searchTerm) {
			const search = searchTerm.toLowerCase();
			depts = depts.filter(
				(dept) =>
					dept.name.toLowerCase().includes(search) ||
					dept.description?.toLowerCase().includes(search) ||
					dept.manager?.displayName?.toLowerCase().includes(search)
			);
		}

		// Size filter
		if (selectedSize !== 'all') {
			depts = depts.filter((dept) => {
				if (selectedSize === 'small') return dept.employeeCount < 5;
				if (selectedSize === 'medium') return dept.employeeCount >= 5 && dept.employeeCount <= 15;
				if (selectedSize === 'large') return dept.employeeCount > 15;
				return true;
			});
		}

		filteredDepartments = depts.sort((a, b) => a.name.localeCompare(b.name));
	}

	// Update filtered departments whenever filters change
	$effect(() => {
		updateFilteredDepartments();
	});

	// Force update after loading
	$effect(() => {
		if (!initialLoading && departments.length > 0) {
			setTimeout(() => updateFilteredDepartments(), 100);
		}
	});

	// Refresh data
	const refresh = async () => {
		await loadDepartments();
	};

	// Get department initials
	const getDepartmentInitials = (name: string) => {
		return name
			.split(' ')
			.map((n) => n[0])
			.join('')
			.toUpperCase()
			.slice(0, 2);
	};

	// Get size badge variant
	const getSizeBadgeVariant = (count: number) => {
		if (count < 5) return 'secondary';
		if (count <= 15) return 'default';
		return 'destructive';
	};

	// Get size label
	const getSizeLabel = (count: number) => {
		if (count < 5) return 'Small';
		if (count <= 15) return 'Medium';
		return 'Large';
	};
</script>

<svelte:head>
	<title>Department Directory - SvelteHR</title>
	<meta name="description" content="Browse and explore departments across the organization" />
</svelte:head>

<div class="space-y-6">
	<!-- Header -->
	<div class="flex flex-col space-y-4 md:flex-row md:items-center md:justify-between md:space-y-0">
		<div>
			<h1 class="flex items-center gap-3 text-3xl font-bold tracking-tight">
				<Building2 class="h-8 w-8" />
				Department Directory
			</h1>
			<p class="text-muted-foreground">Explore departments and organizational structure</p>
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
			<Button variant="outline" size="sm" onclick={refresh} disabled={loading}>
				<RefreshCw class="h-4 w-4 {loading ? 'animate-spin' : ''}" />
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
						placeholder="Search by department name, description, or manager..."
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

					{#if selectedSize !== 'all'}
						<Badge variant="secondary">
							{selectedSize} departments
						</Badge>
						<Button
							variant="ghost"
							size="sm"
							onclick={() => {
								selectedSize = 'all';
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
						<label for="size-select" class="text-sm font-medium">Department Size</label>
						<Select.Root bind:selected={selectedSize}>
							<Select.Trigger id="size-select">
								<Select.Value placeholder="All sizes" />
							</Select.Trigger>
							<Select.Content>
								<Select.Item value="all">All sizes</Select.Item>
								<Select.Item value="small">Small (&lt; 5 employees)</Select.Item>
								<Select.Item value="medium">Medium (5-15 employees)</Select.Item>
								<Select.Item value="large">Large (&gt; 15 employees)</Select.Item>
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
			Found {filteredDepartments.length} department{filteredDepartments.length !== 1 ? 's' : ''}
		</div>
	{/if}

	<!-- Loading state -->
	{#if initialLoading}
		<div class="flex items-center justify-center py-12">
			<div class="flex items-center space-x-2">
				<RefreshCw class="h-4 w-4 animate-spin" />
				<p>Loading departments...</p>
			</div>
		</div>
	{/if}

	<!-- Department Directory -->
	{#if !initialLoading}
		{#if filteredDepartments.length === 0}
			<Card.Root>
				<Card.Content class="py-12">
					<div class="space-y-4 text-center">
						<Building2 class="mx-auto h-12 w-12 text-muted-foreground" />
						<h3 class="text-lg font-semibold">No departments found</h3>
						<p class="text-muted-foreground">Try adjusting your search terms or filters.</p>
					</div>
				</Card.Content>
			</Card.Root>
		{:else if viewMode === 'grid'}
			<!-- Grid view -->
			<div class="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
				{#each filteredDepartments as department (department.name)}
					<Card.Root class="cursor-pointer transition-shadow hover:shadow-md">
						<Card.Content class="p-6">
							<div class="space-y-4 text-center">
								<!-- Department Icon -->
								<div
									class="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-blue-100 text-xl font-semibold text-blue-600"
								>
									{getDepartmentInitials(department.name)}
								</div>

								<!-- Info -->
								<div class="space-y-1">
									<h3 class="text-lg font-semibold">{department.name}</h3>
									<p class="text-sm text-muted-foreground">
										{department.description || 'No description available'}
									</p>
									<Badge variant="outline" class="text-xs">
										{department.employeeCount} employee{department.employeeCount !== 1 ? 's' : ''}
									</Badge>
								</div>

								<!-- Manager -->
								{#if department.manager}
									<div class="space-y-2 border-t pt-2">
										<div class="text-sm text-muted-foreground">
											<strong>Manager:</strong> {department.manager.displayName}
										</div>
										<div class="text-xs text-muted-foreground">
											{department.manager.email}
										</div>
									</div>
								{/if}

								<!-- Size Badge -->
								<Badge variant={getSizeBadgeVariant(department.employeeCount)} class="text-xs">
									{getSizeLabel(department.employeeCount)} Department
								</Badge>

								<!-- Actions -->
								<div class="flex items-center justify-center gap-2 border-t pt-4">
									<Button variant="outline" size="sm" href="/dashboard/departments/{encodeURIComponent(department.name)}/team">
										<Users class="mr-2 h-4 w-4" />
										View Team
									</Button>
								</div>
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
						{#each filteredDepartments as department (department.name)}
							<div class="cursor-pointer p-6 transition-colors hover:bg-muted/50">
								<div class="flex items-center space-x-4">
									<!-- Department Icon -->
									<div
										class="flex h-12 w-12 items-center justify-center rounded-full bg-blue-100 font-semibold text-blue-600"
									>
										{getDepartmentInitials(department.name)}
									</div>

									<!-- Info -->
									<div class="flex-1 space-y-1">
										<div class="flex items-center space-x-3">
											<h3 class="font-semibold">{department.name}</h3>
											<Badge variant="outline" class="text-xs">
												{department.employeeCount} employee{department.employeeCount !== 1 ? 's' : ''}
											</Badge>
											<Badge variant={getSizeBadgeVariant(department.employeeCount)} class="text-xs">
												{getSizeLabel(department.employeeCount)}
											</Badge>
										</div>

										<p class="text-sm text-muted-foreground">
											{department.description || 'No description available'}
										</p>

										{#if department.manager}
											<div class="flex items-center space-x-4 text-sm text-muted-foreground">
												<div class="flex items-center space-x-1">
													<Users class="h-3 w-3" />
													<span>Manager: {department.manager.displayName}</span>
												</div>
												<div class="flex items-center space-x-1">
													<Mail class="h-3 w-3" />
													<span>{department.manager.email}</span>
												</div>
											</div>
										{/if}
									</div>

									<!-- Actions -->
									<div class="flex items-center space-x-2">
										<Button variant="outline" size="sm" href="/dashboard/departments/{encodeURIComponent(department.name)}/team">
											<Users class="mr-2 h-4 w-4" />
											View Team
										</Button>
										<Button variant="outline" size="sm">
											<Settings class="mr-2 h-4 w-4" />
											Manage
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