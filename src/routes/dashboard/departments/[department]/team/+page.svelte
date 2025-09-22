<script lang="ts">
	import { onMount } from 'svelte';
	import { page } from '$app/stores';
	import { goto } from '$app/navigation';
	import * as Card from '$lib/components/ui/card';
	import * as Tabs from '$lib/components/ui/tabs';
	import { Button } from '$lib/components/ui/button';
	import { Badge } from '$lib/components/ui/badge';
	import {
		ArrowLeft,
		Building2,
		Users,
		Crown,
		Mail,
		Phone,
		MapPin,
		Calendar,
		TrendingUp,
		Activity,
		Target,
		MessageSquare,
		Settings,
		Plus,
		Filter,
		Search
	} from 'lucide-svelte';

	import OrgTreeChart from '$lib/components/org-tree-chart.svelte';
	import SimpleOrgMap from '$lib/components/simple-org-map.svelte';

	// Get department name from URL
	const departmentName = decodeURIComponent($page.params.department);

	// State
	let departmentData = $state<any>(null);
	let loading = $state(true);
	let error = $state<string | null>(null);

	// Direct fetch function for department team data
	async function fetchDepartmentTeam(deptName: string) {
		try {
			const token = localStorage.getItem('postgraphile-jwt-token');

			const response = await fetch('http://localhost:4000/graphql', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					...(token ? { Authorization: `Bearer ${token}` } : {})
				},
				body: JSON.stringify({
					query: `
						query GetDepartmentTeam {
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
					`
				})
			});

			const result = await response.json();
			if (result.errors) {
				throw new Error(result.errors[0].message);
			}

			const users = result.data?.allUsers?.nodes || [];

			// Filter users by department and build department data
			const departmentUsers = users.filter((user: any) => {
				if (!user.isActive) return false;

				const roleAssignments = user.userRoleAssignmentsByUserId?.nodes || [];
				if (roleAssignments.length === 0) return deptName === 'General';

				const roleName = roleAssignments[0].userRoleByRoleId?.name || '';
				let userDept = 'General';

				if (roleName.includes('hr')) userDept = 'Human Resources';
				else if (roleName.includes('admin')) userDept = 'Administration';
				else if (roleName.includes('manager')) userDept = 'Management';
				else if (roleName.includes('finance')) userDept = 'Finance';
				else if (roleName.includes('engineering')) userDept = 'Engineering';
				else if (roleName.includes('marketing')) userDept = 'Marketing';
				else if (roleName.includes('sales')) userDept = 'Sales';

				return userDept === deptName;
			});

			// Find department manager (highest role level)
			const manager = departmentUsers.find((user: any) => {
				const roles = user.userRoleAssignmentsByUserId?.nodes || [];
				return roles.some((r: any) => r.userRoleByRoleId?.level >= 60);
			});

			// Calculate department stats
			const stats = {
				totalEmployees: departmentUsers.length,
				managers: departmentUsers.filter((u: any) => {
					const roles = u.userRoleAssignmentsByUserId?.nodes || [];
					return roles.some((r: any) => r.userRoleByRoleId?.level >= 60);
				}).length,
				recentHires: departmentUsers.filter((u: any) => {
					if (!u.hireDate) return false;
					const hireDate = new Date(u.hireDate);
					const threeMonthsAgo = new Date();
					threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);
					return hireDate >= threeMonthsAgo;
				}).length,
				avgTenure: calculateAverageTenure(departmentUsers)
			};

			return {
				name: deptName,
				description: `${deptName} department with ${departmentUsers.length} active employees`,
				manager,
				employees: departmentUsers,
				stats,
				subDepartments: [] // Could be extended for nested departments
			};
		} catch (error) {
			console.error('Error fetching department team:', error);
			throw error;
		}
	}

	function calculateAverageTenure(employees: any[]): string {
		const employeesWithHireDate = employees.filter(emp => emp.hireDate);
		if (employeesWithHireDate.length === 0) return 'N/A';

		const totalMonths = employeesWithHireDate.reduce((sum, emp) => {
			const hireDate = new Date(emp.hireDate);
			const now = new Date();
			const diffTime = Math.abs(now.getTime() - hireDate.getTime());
			const diffMonths = Math.ceil(diffTime / (1000 * 60 * 60 * 24 * 30));
			return sum + diffMonths;
		}, 0);

		const avgMonths = Math.round(totalMonths / employeesWithHireDate.length);
		const years = Math.floor(avgMonths / 12);
		const months = avgMonths % 12;

		if (years > 0) {
			return `${years}y ${months}m`;
		}
		return `${months}m`;
	}

	function formatUserRole(user: any): string {
		const roleAssignments = user.userRoleAssignmentsByUserId?.nodes;
		if (!roleAssignments || roleAssignments.length === 0) {
			return 'No Role';
		}

		const activeRoles = roleAssignments
			.filter((assignment: any) => assignment.isActive)
			.map((assignment: any) => assignment.userRoleByRoleId.name);

		return activeRoles.length > 0 ? activeRoles.join(', ') : 'No Active Role';
	}

	function getRoleBadgeVariant(user: any): string {
		const roles = user.userRoleAssignmentsByUserId?.nodes || [];
		const maxLevel = Math.max(...roles.map((r: any) => r.userRoleByRoleId?.level || 0));

		if (maxLevel >= 80) return 'destructive'; // Admin
		if (maxLevel >= 60) return 'default'; // Manager
		if (maxLevel >= 40) return 'secondary'; // Senior
		return 'outline'; // Employee
	}

	function formatDate(dateString: string): string {
		return new Date(dateString).toLocaleDateString();
	}

	function getUserInitials(name: string): string {
		return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
	}

	// Load department data
	onMount(async () => {
		try {
			loading = true;
			departmentData = await fetchDepartmentTeam(departmentName);
		} catch (err) {
			error = err instanceof Error ? err.message : 'Failed to load department data';
		} finally {
			loading = false;
		}
	});
</script>

<svelte:head>
	<title>{departmentName} Team - SvelteHR</title>
	<meta name="description" content="View {departmentName} department team structure and hierarchy" />
</svelte:head>

<div class="space-y-6">
	<!-- Header -->
	<div class="flex items-center justify-between">
		<div class="flex items-center gap-4">
			<Button variant="ghost" size="sm" onclick={() => goto('/dashboard/departments/directory')}>
				<ArrowLeft class="h-4 w-4" />
			</Button>

			<div>
				<div class="flex items-center gap-3">
					<Building2 class="h-8 w-8 text-primary" />
					<h1 class="text-3xl font-bold tracking-tight">{departmentName}</h1>
				</div>
				<p class="text-muted-foreground">Department team structure and hierarchy</p>
			</div>
		</div>

		<div class="flex items-center gap-2">
			<Button variant="outline">
				<MessageSquare class="mr-2 h-4 w-4" />
				Team Chat
			</Button>
			<Button variant="outline">
				<Settings class="mr-2 h-4 w-4" />
				Manage
			</Button>
		</div>
	</div>

	<!-- Loading/Error States -->
	{#if loading}
		<div class="flex items-center justify-center py-12">
			<div class="text-center">
				<Activity class="mx-auto h-8 w-8 animate-spin text-muted-foreground" />
				<p class="mt-2 text-muted-foreground">Loading team data...</p>
			</div>
		</div>
	{:else if error}
		<Card.Root>
			<Card.Content class="py-8">
				<div class="text-center">
					<h3 class="text-lg font-semibold text-destructive">Error Loading Team</h3>
					<p class="text-muted-foreground">{error}</p>
					<Button class="mt-4" onclick={() => window.location.reload()}>
						Try Again
					</Button>
				</div>
			</Card.Content>
		</Card.Root>
	{:else if departmentData}
		<!-- Department Stats -->
		<div class="grid grid-cols-1 gap-4 md:grid-cols-4">
			<Card.Root>
				<Card.Content class="p-6">
					<div class="flex items-center justify-between">
						<div>
							<p class="text-sm font-medium text-muted-foreground">Total Members</p>
							<p class="text-2xl font-bold">{departmentData.stats.totalEmployees}</p>
						</div>
						<Users class="h-8 w-8 text-muted-foreground" />
					</div>
				</Card.Content>
			</Card.Root>

			<Card.Root>
				<Card.Content class="p-6">
					<div class="flex items-center justify-between">
						<div>
							<p class="text-sm font-medium text-muted-foreground">Managers</p>
							<p class="text-2xl font-bold">{departmentData.stats.managers}</p>
						</div>
						<Crown class="h-8 w-8 text-muted-foreground" />
					</div>
				</Card.Content>
			</Card.Root>

			<Card.Root>
				<Card.Content class="p-6">
					<div class="flex items-center justify-between">
						<div>
							<p class="text-sm font-medium text-muted-foreground">Recent Hires</p>
							<p class="text-2xl font-bold">{departmentData.stats.recentHires}</p>
						</div>
						<TrendingUp class="h-8 w-8 text-muted-foreground" />
					</div>
				</Card.Content>
			</Card.Root>

			<Card.Root>
				<Card.Content class="p-6">
					<div class="flex items-center justify-between">
						<div>
							<p class="text-sm font-medium text-muted-foreground">Avg. Tenure</p>
							<p class="text-2xl font-bold">{departmentData.stats.avgTenure}</p>
						</div>
						<Calendar class="h-8 w-8 text-muted-foreground" />
					</div>
				</Card.Content>
			</Card.Root>
		</div>

		<!-- Main Content Tabs -->
		<Tabs.Root value="map" class="space-y-6">
			<Tabs.List>
				<Tabs.Trigger value="map">Interactive Map</Tabs.Trigger>
				<Tabs.Trigger value="hierarchy">Organization Chart</Tabs.Trigger>
				<Tabs.Trigger value="members">All Members</Tabs.Trigger>
				<Tabs.Trigger value="performance">Performance</Tabs.Trigger>
				<Tabs.Trigger value="projects">Projects</Tabs.Trigger>
			</Tabs.List>

			<!-- Interactive Map Tab -->
			<Tabs.Content value="map">
				<SimpleOrgMap {departmentData} />
			</Tabs.Content>

			<!-- Organization Chart Tab -->
			<Tabs.Content value="hierarchy">
				<OrgTreeChart {departmentData} />
			</Tabs.Content>

			<!-- All Members Tab -->
			<Tabs.Content value="members">
				<Card.Root>
					<Card.Header>
						<div class="flex items-center justify-between">
							<Card.Title>Department Members ({departmentData.employees.length})</Card.Title>
							<Button size="sm">
								<Plus class="mr-2 h-4 w-4" />
								Add Member
							</Button>
						</div>
					</Card.Header>
					<Card.Content>
						<div class="space-y-4">
							{#each departmentData.employees as employee}
								<div class="flex items-center justify-between rounded-lg border p-4">
									<div class="flex items-center gap-4">
										<div class="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 font-semibold">
											{getUserInitials(employee.displayName || employee.email)}
										</div>

										<div>
											<div class="flex items-center gap-2">
												<h4 class="font-semibold">{employee.displayName || employee.email}</h4>
												{#if employee.id === departmentData.manager?.id}
													<Crown class="h-4 w-4 text-yellow-600" />
												{/if}
											</div>
											<p class="text-sm text-muted-foreground">{employee.email}</p>
											<div class="flex items-center gap-2 mt-1">
												<Badge variant={getRoleBadgeVariant(employee)}>
													{formatUserRole(employee)}
												</Badge>
												{#if employee.hireDate}
													<span class="text-xs text-muted-foreground">
														Joined {formatDate(employee.hireDate)}
													</span>
												{/if}
											</div>
										</div>
									</div>

									<div class="flex items-center gap-2">
										<Button variant="ghost" size="sm">
											<Mail class="h-4 w-4" />
										</Button>
										<Button variant="ghost" size="sm">
											<Phone class="h-4 w-4" />
										</Button>
									</div>
								</div>
							{/each}
						</div>
					</Card.Content>
				</Card.Root>
			</Tabs.Content>

			<!-- Performance Tab -->
			<Tabs.Content value="performance">
				<Card.Root>
					<Card.Header>
						<Card.Title>Department Performance</Card.Title>
					</Card.Header>
					<Card.Content>
						<div class="space-y-6">
							<div class="text-center py-8">
								<Target class="mx-auto h-12 w-12 text-muted-foreground" />
								<h3 class="mt-4 text-lg font-semibold">Performance Metrics</h3>
								<p class="text-muted-foreground">Performance tracking coming soon...</p>
							</div>
						</div>
					</Card.Content>
				</Card.Root>
			</Tabs.Content>

			<!-- Projects Tab -->
			<Tabs.Content value="projects">
				<Card.Root>
					<Card.Header>
						<Card.Title>Department Projects</Card.Title>
					</Card.Header>
					<Card.Content>
						<div class="space-y-6">
							<div class="text-center py-8">
								<Activity class="mx-auto h-12 w-12 text-muted-foreground" />
								<h3 class="mt-4 text-lg font-semibold">Project Management</h3>
								<p class="text-muted-foreground">Project tracking coming soon...</p>
							</div>
						</div>
					</Card.Content>
				</Card.Root>
			</Tabs.Content>
		</Tabs.Root>
	{/if}
</div>