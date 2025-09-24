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
		Users,
		Crown,
		Mail,
		Phone,
		Calendar,
		TrendingUp,
		Activity,
		Target,
		MessageSquare,
		Settings,
		Building2,
		Plus
	} from 'lucide-svelte';
	import GoalCreationForm from '$lib/components/performance/GoalCreationForm.svelte';
	import ReviewCreationForm from '$lib/components/performance/ReviewCreationForm.svelte';

	// Get manager ID from URL params
	const managerId = $page.params.managerId;

	// State
	let teamData = $state<any>(null);
	let loading = $state(true);
	let error = $state<string | null>(null);
	let currentUser = $state<any>(null);
	let isOwnTeam = $state(false);

	// Performance management state
	let showGoalForm = $state(false);
	let showReviewForm = $state(false);
	let selectedEmployee = $state<any>(null);
	let availableCycles = $state<any[]>([]);

	// Helper function to get current user ID from JWT token
	function getCurrentUserIdFromToken(): string | null {
		const token = localStorage.getItem('postgraphile-jwt-token');
		if (!token) return null;

		try {
			const payload = JSON.parse(atob(token.split('.')[1]));
			return payload.user_id || null;
		} catch {
			return null;
		}
	}

	// Direct fetch function for team data by manager ID
	async function fetchTeamData(targetManagerId: string) {
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
						query GetTeamData {
							allJobInformations {
								nodes {
									id
									employeeId
									managerId
									jobTitle
									startDate
									employmentType
									userByEmployeeId {
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
									departmentByDepartmentId {
										id
										name
										description
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

			const allJobInfo = result.data?.allJobInformations?.nodes || [];

			// Find team members where target manager is the manager
			const directReports = allJobInfo
				.filter((jobInfo: any) => jobInfo.managerId === targetManagerId)
				.map((jobInfo: any) => ({
					...jobInfo.userByEmployeeId,
					jobInfo: {
						jobTitle: jobInfo.jobTitle,
						startDate: jobInfo.startDate,
						employmentType: jobInfo.employmentType,
						department: jobInfo.departmentByDepartmentId
					}
				}))
				.filter((member: any) => member && member.isActive);

			// Calculate team stats
			const stats = {
				totalMembers: directReports.length,
				recentHires: directReports.filter((member: any) => {
					if (!member.hireDate) return false;
					const hireDate = new Date(member.hireDate);
					const threeMonthsAgo = new Date();
					threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);
					return hireDate >= threeMonthsAgo;
				}).length,
				avgTenure: calculateAverageTenure(directReports),
				activeGoals: 5, // Placeholder - would come from performance goals query
				goalCompletion: 80 // Placeholder
			};

			// Get manager info
			const managerInfo = allJobInfo.find((ji) => ji.employeeId === targetManagerId)
				?.userByEmployeeId || {
				id: targetManagerId,
				displayName: 'Unknown Manager',
				email: 'unknown@example.com',
				jobTitle: 'Manager'
			};

			return {
				manager: managerInfo,
				members: directReports,
				stats,
				department: directReports[0]?.jobInfo?.department || { name: 'Mixed Teams' }
			};
		} catch (error) {
			console.error('Error fetching team data:', error);
			throw error;
		}
	}

	function calculateAverageTenure(members: any[]): string {
		const membersWithHireDate = members.filter((member) => member.hireDate);
		if (membersWithHireDate.length === 0) return 'N/A';

		const totalMonths = membersWithHireDate.reduce((sum, member) => {
			const hireDate = new Date(member.hireDate);
			const now = new Date();
			const diffTime = Math.abs(now.getTime() - hireDate.getTime());
			const diffMonths = Math.ceil(diffTime / (1000 * 60 * 60 * 24 * 30));
			return sum + diffMonths;
		}, 0);

		const avgMonths = Math.round(totalMonths / membersWithHireDate.length);
		const years = Math.floor(avgMonths / 12);
		const months = avgMonths % 12;

		if (years > 0) {
			return `${years}y ${months}m`;
		}
		return `${months}m`;
	}

	function formatUserRole(member: any): string {
		const roleAssignments = member.userRoleAssignmentsByUserId?.nodes;
		if (!roleAssignments || roleAssignments.length === 0) {
			return member.jobInfo?.jobTitle || 'No Role';
		}

		const activeRoles = roleAssignments
			.filter((assignment: any) => assignment.isActive)
			.map((assignment: any) => assignment.userRoleByRoleId.name);

		return activeRoles.length > 0
			? activeRoles.join(', ')
			: member.jobInfo?.jobTitle || 'No Active Role';
	}

	function getRoleBadgeVariant(member: any): string {
		const roles = member.userRoleAssignmentsByUserId?.nodes || [];
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
		return name
			.split(' ')
			.map((n) => n[0])
			.join('')
			.toUpperCase()
			.slice(0, 2);
	}

	// Check if current user can access this team
	function checkAccess(currentUserId: string, targetManagerId: string): boolean {
		// Allow access if:
		// 1. User is viewing their own team
		// 2. User is an admin (will be implemented with role check)
		return currentUserId === targetManagerId;
		// TODO: Add admin role check: || currentUserHasAdminRole()
	}

	// Fetch performance cycles
	async function fetchPerformanceCycles() {
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
						query GetPerformanceCycles {
							allPerformanceCycles {
								nodes {
									id
									name
									description
									startDate
									endDate
									isActive
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

			availableCycles = result.data?.allPerformanceCycles?.nodes || [];
		} catch (error) {
			console.error('Error fetching performance cycles:', error);
		}
	}

	// Handle goal creation
	function openGoalForm(employee: any) {
		selectedEmployee = employee;
		showGoalForm = true;
	}

	// Handle review creation
	function openReviewForm(employee: any) {
		selectedEmployee = employee;
		showReviewForm = true;
	}

	// Handle successful goal creation
	function handleGoalCreated(goalData: any) {
		// Refresh team data to show new goal
		if (teamData?.manager?.id) {
			fetchTeamData(teamData.manager.id);
		}
	}

	// Handle successful review creation
	function handleReviewCreated(reviewData: any) {
		// Refresh team data to show new review
		if (teamData?.manager?.id) {
			fetchTeamData(teamData.manager.id);
		}
	}

	// Load team data
	onMount(async () => {
		try {
			loading = true;

			// Handle special case: "current" means current user's team
			let targetManagerId = managerId;
			const currentUserId = getCurrentUserIdFromToken();

			if (managerId === 'current' && currentUserId) {
				targetManagerId = currentUserId;
				// Redirect to the actual manager ID URL
				goto(`/dashboard/teams/${currentUserId}`, { replaceState: true });
				return;
			}

			if (!currentUserId) {
				throw new Error('Please log in to view team data');
			}

			// Check access permissions
			if (!checkAccess(currentUserId, targetManagerId)) {
				throw new Error('You do not have permission to view this team');
			}

			isOwnTeam = currentUserId === targetManagerId;

			// Load data in parallel
			const [teamResult] = await Promise.all([
				fetchTeamData(targetManagerId),
				fetchPerformanceCycles()
			]);

			teamData = teamResult;
		} catch (err) {
			error = err instanceof Error ? err.message : 'Failed to load team data';
		} finally {
			loading = false;
		}
	});
</script>

<svelte:head>
	<title>{teamData?.manager?.displayName || 'Team'} Performance - SvelteHR</title>
</svelte:head>

<div class="space-y-6">
	<!-- Header -->
	<div class="flex items-center justify-between">
		<div class="flex items-center gap-4">
			<Button variant="ghost" size="sm" onclick={() => goto('/dashboard')}>
				<ArrowLeft class="h-4 w-4" />
			</Button>

			<div>
				<div class="flex items-center gap-3">
					<Users class="h-8 w-8 text-primary" />
					<h1 class="text-3xl font-bold tracking-tight">
						{isOwnTeam
							? 'My Team Performance'
							: `${teamData?.manager?.displayName || 'Team'} Performance`}
					</h1>
				</div>
				<p class="text-muted-foreground">
					{isOwnTeam
						? 'Monitor your direct reports and team performance'
						: `${teamData?.manager?.displayName || 'Manager'}'s team performance and metrics`}
				</p>
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
					<Button class="mt-4" onclick={() => window.location.reload()}>Try Again</Button>
				</div>
			</Card.Content>
		</Card.Root>
	{:else if teamData}
		<!-- Team Stats -->
		<div class="grid grid-cols-1 gap-4 md:grid-cols-4">
			<Card.Root>
				<Card.Content class="p-6">
					<div class="flex items-center justify-between">
						<div>
							<p class="text-sm font-medium text-muted-foreground">Total Members</p>
							<p class="text-2xl font-bold">{teamData.stats.totalMembers}</p>
						</div>
						<Users class="h-8 w-8 text-muted-foreground" />
					</div>
				</Card.Content>
			</Card.Root>

			<Card.Root>
				<Card.Content class="p-6">
					<div class="flex items-center justify-between">
						<div>
							<p class="text-sm font-medium text-muted-foreground">Recent Hires</p>
							<p class="text-2xl font-bold">{teamData.stats.recentHires}</p>
						</div>
						<TrendingUp class="h-8 w-8 text-muted-foreground" />
					</div>
				</Card.Content>
			</Card.Root>

			<Card.Root>
				<Card.Content class="p-6">
					<div class="flex items-center justify-between">
						<div>
							<p class="text-sm font-medium text-muted-foreground">Active Goals</p>
							<p class="text-2xl font-bold">{teamData.stats.activeGoals}</p>
						</div>
						<Target class="h-8 w-8 text-muted-foreground" />
					</div>
				</Card.Content>
			</Card.Root>

			<Card.Root>
				<Card.Content class="p-6">
					<div class="flex items-center justify-between">
						<div>
							<p class="text-sm font-medium text-muted-foreground">Goal Completion</p>
							<p class="text-2xl font-bold">{teamData.stats.goalCompletion}%</p>
						</div>
						<Calendar class="h-8 w-8 text-muted-foreground" />
					</div>
				</Card.Content>
			</Card.Root>
		</div>

		<!-- Main Content Tabs -->
		<Tabs.Root value="members" class="space-y-6">
			<Tabs.List>
				<Tabs.Trigger value="members">Team Members</Tabs.Trigger>
				<Tabs.Trigger value="performance">Performance</Tabs.Trigger>
				<Tabs.Trigger value="goals">Goals & Reviews</Tabs.Trigger>
				<Tabs.Trigger value="analytics">Analytics</Tabs.Trigger>
			</Tabs.List>

			<!-- Team Members Tab -->
			<Tabs.Content value="members">
				<Card.Root>
					<Card.Header>
						<div>
							<Card.Title>
								{isOwnTeam ? 'Direct Reports' : 'Team Members'} ({teamData.members.length})
							</Card.Title>
							<p class="mt-1 text-sm text-muted-foreground">
								Manager: {teamData.manager.displayName} ({teamData.manager.email})
							</p>
						</div>
					</Card.Header>
					<Card.Content>
						<div class="space-y-4">
							{#each teamData.members as member}
								<div class="flex items-center justify-between rounded-lg border p-4">
									<div class="flex items-center gap-4">
										<div
											class="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 font-semibold"
										>
											{getUserInitials(member.displayName || member.email)}
										</div>

										<div>
											<div class="flex items-center gap-2">
												<h4 class="font-semibold">{member.displayName || member.email}</h4>
											</div>
											<p class="text-sm text-muted-foreground">{member.email}</p>
											<div class="mt-1 flex items-center gap-2">
												<Badge variant={getRoleBadgeVariant(member)}>
													{formatUserRole(member)}
												</Badge>
												{#if member.jobInfo?.department}
													<span class="text-xs text-muted-foreground">
														{member.jobInfo.department.name}
													</span>
												{/if}
												{#if member.hireDate}
													<span class="text-xs text-muted-foreground">
														Joined {formatDate(member.hireDate)}
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
										<Button
											variant="outline"
											size="sm"
											onclick={() => goto(`/dashboard/users/${member.id}/performance`)}
										>
											View Details
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
						<Card.Title>Team Performance Overview</Card.Title>
					</Card.Header>
					<Card.Content>
						<div class="space-y-6">
							<div class="py-8 text-center">
								<Target class="mx-auto h-12 w-12 text-muted-foreground" />
								<h3 class="mt-4 text-lg font-semibold">Performance Metrics</h3>
								<p class="text-muted-foreground">
									Performance tracking and analytics coming soon...
								</p>
							</div>
						</div>
					</Card.Content>
				</Card.Root>
			</Tabs.Content>

			<!-- Goals & Reviews Tab -->
			<Tabs.Content value="goals">
				<div class="space-y-6">
					<!-- Performance Goals -->
					<Card.Root>
						<Card.Header class="flex flex-row items-center justify-between space-y-0 pb-4">
							<div>
								<Card.Title class="flex items-center gap-2">
									<Target class="h-5 w-5" />
									Team Goals
								</Card.Title>
								<p class="text-sm text-muted-foreground">
									Create and manage performance goals for team members
								</p>
							</div>
						</Card.Header>
						<Card.Content>
							<div class="space-y-4">
								{#each teamData.members as member (member.id)}
									<div class="flex items-center justify-between rounded-lg border p-4">
										<div class="flex items-center gap-4">
											<div
												class="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 font-semibold"
											>
												{getUserInitials(member.displayName || member.email)}
											</div>
											<div>
												<h4 class="font-semibold">{member.displayName || member.email}</h4>
												<p class="text-sm text-muted-foreground">{formatUserRole(member)}</p>
											</div>
										</div>
										<div class="flex items-center gap-2">
											<Button variant="outline" size="sm" onclick={() => openGoalForm(member)}>
												<Plus class="mr-2 h-4 w-4" />
												Add Goal
											</Button>
											<Button
												variant="outline"
												size="sm"
												onclick={() => goto(`/dashboard/users/${member.id}/performance`)}
											>
												View Details
											</Button>
										</div>
									</div>
								{/each}
							</div>
						</Card.Content>
					</Card.Root>

					<!-- Performance Reviews -->
					<Card.Root>
						<Card.Header class="flex flex-row items-center justify-between space-y-0 pb-4">
							<div>
								<Card.Title class="flex items-center gap-2">
									<Activity class="h-5 w-5" />
									Performance Reviews
								</Card.Title>
								<p class="text-sm text-muted-foreground">
									Create and manage performance reviews for team members
								</p>
							</div>
						</Card.Header>
						<Card.Content>
							<div class="space-y-4">
								{#each teamData.members as member (member.id)}
									<div class="flex items-center justify-between rounded-lg border p-4">
										<div class="flex items-center gap-4">
											<div
												class="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 font-semibold"
											>
												{getUserInitials(member.displayName || member.email)}
											</div>
											<div>
												<h4 class="font-semibold">{member.displayName || member.email}</h4>
												<p class="text-sm text-muted-foreground">{formatUserRole(member)}</p>
											</div>
										</div>
										<div class="flex items-center gap-2">
											<Button variant="outline" size="sm" onclick={() => openReviewForm(member)}>
												<Plus class="mr-2 h-4 w-4" />
												Create Review
											</Button>
											<Button
												variant="outline"
												size="sm"
												onclick={() => goto(`/dashboard/users/${member.id}/performance/reviews`)}
											>
												View Reviews
											</Button>
										</div>
									</div>
								{/each}
							</div>
						</Card.Content>
					</Card.Root>
				</div>
			</Tabs.Content>

			<!-- Analytics Tab -->
			<Tabs.Content value="analytics">
				<Card.Root>
					<Card.Header>
						<Card.Title>Team Analytics</Card.Title>
					</Card.Header>
					<Card.Content>
						<div class="space-y-6">
							<div class="py-8 text-center">
								<TrendingUp class="mx-auto h-12 w-12 text-muted-foreground" />
								<h3 class="mt-4 text-lg font-semibold">Analytics Dashboard</h3>
								<p class="text-muted-foreground">Team analytics and insights coming soon...</p>
							</div>
						</div>
					</Card.Content>
				</Card.Root>
			</Tabs.Content>
		</Tabs.Root>
	{/if}
</div>

<!-- Goal Creation Form -->
{#if selectedEmployee}
	<GoalCreationForm
		bind:open={showGoalForm}
		employeeId={selectedEmployee.id}
		employeeName={selectedEmployee.displayName || selectedEmployee.email}
		{availableCycles}
		onClose={() => {
			showGoalForm = false;
			selectedEmployee = null;
		}}
		onCreate={handleGoalCreated}
	/>
{/if}

<!-- Review Creation Form -->
{#if selectedEmployee}
	<ReviewCreationForm
		bind:open={showReviewForm}
		employeeId={selectedEmployee.id}
		employeeName={selectedEmployee.displayName || selectedEmployee.email}
		reviewerId={teamData?.manager?.id}
		reviewerName={teamData?.manager?.displayName || 'Manager'}
		{availableCycles}
		onClose={() => {
			showReviewForm = false;
			selectedEmployee = null;
		}}
		onCreate={handleReviewCreated}
	/>
{/if}
