<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import * as Card from '$lib/components/ui/card';
	import { Button } from '$lib/components/ui/button';
	import { Badge } from '$lib/components/ui/badge';
	import { Users, Crown, TrendingUp, Calendar, Building2, ChevronRight } from 'lucide-svelte';

	// State
	let teams = $state<any[]>([]);
	let loading = $state(true);
	let error = $state<string | null>(null);

	// Fetch all teams data
	async function fetchAllTeams() {
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
						query GetAllTeams {
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
										hireDate
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

			// Group by manager to create teams
			const teamsByManager = new Map();

			allJobInfo.forEach((jobInfo: any) => {
				const managerId = jobInfo.managerId;
				if (!managerId) return;

				if (!teamsByManager.has(managerId)) {
					teamsByManager.set(managerId, {
						managerId,
						manager: null,
						members: [],
						department: null
					});
				}

				const team = teamsByManager.get(managerId);

				// If this is the manager's own job record
				if (jobInfo.employeeId === managerId) {
					team.manager = jobInfo.userByEmployeeId;
					if (!team.department && jobInfo.departmentByDepartmentId) {
						team.department = jobInfo.departmentByDepartmentId;
					}
				}

				// Add team member
				if (jobInfo.userByEmployeeId?.isActive) {
					team.members.push({
						...jobInfo.userByEmployeeId,
						jobInfo: {
							jobTitle: jobInfo.jobTitle,
							startDate: jobInfo.startDate,
							department: jobInfo.departmentByDepartmentId
						}
					});
				}
			});

			// Convert to array and calculate stats
			const teamsArray = Array.from(teamsByManager.values())
				.filter((team) => team.manager && team.members.length > 0)
				.map((team) => ({
					...team,
					stats: calculateTeamStats(team.members)
				}))
				.sort((a, b) => b.members.length - a.members.length);

			return teamsArray;
		} catch (error) {
			console.error('Error fetching teams data:', error);
			throw error;
		}
	}

	function calculateTeamStats(members: any[]) {
		const recentHires = members.filter((member) => {
			if (!member.hireDate) return false;
			const hireDate = new Date(member.hireDate);
			const threeMonthsAgo = new Date();
			threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);
			return hireDate >= threeMonthsAgo;
		}).length;

		const membersWithHireDate = members.filter((member) => member.hireDate);
		let avgTenure = 'N/A';

		if (membersWithHireDate.length > 0) {
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
				avgTenure = `${years}y ${months}m`;
			} else {
				avgTenure = `${months}m`;
			}
		}

		return {
			totalMembers: members.length,
			recentHires,
			avgTenure
		};
	}

	function getUserInitials(name: string): string {
		return name
			.split(' ')
			.map((n) => n[0])
			.join('')
			.toUpperCase()
			.slice(0, 2);
	}

	// Load all teams
	onMount(async () => {
		try {
			loading = true;
			teams = await fetchAllTeams();
		} catch (err) {
			error = err instanceof Error ? err.message : 'Failed to load teams data';
		} finally {
			loading = false;
		}
	});
</script>

<svelte:head>
	<title>All Teams - SvelteHR</title>
</svelte:head>

<div class="space-y-6">
	<!-- Header -->
	<div>
		<div class="flex items-center gap-3">
			<Building2 class="h-8 w-8 text-primary" />
			<h1 class="text-3xl font-bold tracking-tight">All Teams</h1>
		</div>
		<p class="text-muted-foreground">Overview of all teams and their performance</p>
	</div>

	<!-- Loading/Error States -->
	{#if loading}
		<div class="flex items-center justify-center py-12">
			<div class="text-center">
				<Users class="mx-auto h-8 w-8 animate-spin text-muted-foreground" />
				<p class="mt-2 text-muted-foreground">Loading teams data...</p>
			</div>
		</div>
	{:else if error}
		<Card.Root>
			<Card.Content class="py-8">
				<div class="text-center">
					<h3 class="text-lg font-semibold text-destructive">Error Loading Teams</h3>
					<p class="text-muted-foreground">{error}</p>
					<Button class="mt-4" onclick={() => window.location.reload()}>Try Again</Button>
				</div>
			</Card.Content>
		</Card.Root>
	{:else if teams.length === 0}
		<Card.Root>
			<Card.Content class="py-8">
				<div class="text-center">
					<Users class="mx-auto h-12 w-12 text-muted-foreground" />
					<h3 class="mt-4 text-lg font-semibold">No Teams Found</h3>
					<p class="text-muted-foreground">No teams with active members found in the system.</p>
				</div>
			</Card.Content>
		</Card.Root>
	{:else}
		<!-- Teams Grid -->
		<div class="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
			{#each teams as team}
				<Card.Root
					class="cursor-pointer transition-all hover:shadow-lg"
					onclick={() => goto(`/dashboard/teams/${team.managerId}`)}
				>
					<Card.Header class="pb-3">
						<div class="flex items-start justify-between">
							<div class="flex items-center gap-3">
								<div
									class="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 font-semibold"
								>
									{getUserInitials(team.manager?.displayName || 'Unknown')}
								</div>
								<div>
									<Card.Title class="text-lg"
										>{team.manager?.displayName || 'Unknown Manager'}</Card.Title
									>
									<p class="text-sm text-muted-foreground">{team.manager?.jobTitle || 'Manager'}</p>
								</div>
							</div>
							<ChevronRight class="h-5 w-5 text-muted-foreground" />
						</div>
					</Card.Header>

					<Card.Content class="space-y-4">
						<!-- Department Info -->
						{#if team.department}
							<div class="flex items-center gap-2">
								<Building2 class="h-4 w-4 text-muted-foreground" />
								<span class="text-sm text-muted-foreground">{team.department.name}</span>
							</div>
						{/if}

						<!-- Team Stats -->
						<div class="grid grid-cols-3 gap-3 text-center">
							<div>
								<div class="flex items-center justify-center gap-1">
									<Users class="h-4 w-4 text-muted-foreground" />
									<span class="text-lg font-semibold">{team.stats.totalMembers}</span>
								</div>
								<p class="text-xs text-muted-foreground">Members</p>
							</div>

							<div>
								<div class="flex items-center justify-center gap-1">
									<TrendingUp class="h-4 w-4 text-muted-foreground" />
									<span class="text-lg font-semibold">{team.stats.recentHires}</span>
								</div>
								<p class="text-xs text-muted-foreground">New Hires</p>
							</div>

							<div>
								<div class="flex items-center justify-center gap-1">
									<Calendar class="h-4 w-4 text-muted-foreground" />
									<span class="text-lg font-semibold">{team.stats.avgTenure}</span>
								</div>
								<p class="text-xs text-muted-foreground">Avg Tenure</p>
							</div>
						</div>

						<!-- Top Team Members Preview -->
						<div>
							<p class="mb-2 text-sm font-medium">Team Members:</p>
							<div class="flex flex-wrap gap-1">
								{#each team.members.slice(0, 4) as member}
									<Badge variant="secondary" class="text-xs">
										{member.displayName || member.email}
									</Badge>
								{/each}
								{#if team.members.length > 4}
									<Badge variant="outline" class="text-xs">
										+{team.members.length - 4} more
									</Badge>
								{/if}
							</div>
						</div>
					</Card.Content>
				</Card.Root>
			{/each}
		</div>

		<!-- Summary Stats -->
		<Card.Root>
			<Card.Header>
				<Card.Title>Organization Summary</Card.Title>
			</Card.Header>
			<Card.Content>
				<div class="grid grid-cols-1 gap-4 md:grid-cols-4">
					<div class="text-center">
						<div class="text-2xl font-bold">{teams.length}</div>
						<div class="text-sm text-muted-foreground">Total Teams</div>
					</div>
					<div class="text-center">
						<div class="text-2xl font-bold">
							{teams.reduce((sum, team) => sum + team.stats.totalMembers, 0)}
						</div>
						<div class="text-sm text-muted-foreground">Total Employees</div>
					</div>
					<div class="text-center">
						<div class="text-2xl font-bold">
							{teams.reduce((sum, team) => sum + team.stats.recentHires, 0)}
						</div>
						<div class="text-sm text-muted-foreground">Recent Hires</div>
					</div>
					<div class="text-center">
						<div class="text-2xl font-bold">
							{Math.round(
								teams.reduce((sum, team) => sum + team.stats.totalMembers, 0) / teams.length
							)}
						</div>
						<div class="text-sm text-muted-foreground">Avg Team Size</div>
					</div>
				</div>
			</Card.Content>
		</Card.Root>
	{/if}
</div>
