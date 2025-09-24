<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { Button } from '$lib/components/ui/button';
	import { ArrowLeft, Building2, Users } from 'lucide-svelte';

	import FullOrgMap from '$lib/components/full-org-map.svelte';

	// Direct fetch function for all employees
	async function fetchAllEmployees() {
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
						query GetAllEmployees {
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

			// Filter only active employees
			return users.filter((user: any) => user.isActive);
		} catch (error) {
			console.error('Error fetching all employees:', error);
			throw error;
		}
	}

	// State
	let allEmployees = $state<any[]>([]);
	let loading = $state(true);
	let error = $state<string | null>(null);

	// Load all employees data
	onMount(async () => {
		try {
			loading = true;
			allEmployees = await fetchAllEmployees();
		} catch (err) {
			error = err instanceof Error ? err.message : 'Failed to load employee data';
		} finally {
			loading = false;
		}
	});
</script>

<svelte:head>
	<title>Organization Map - SvelteHR</title>
	<meta
		name="description"
		content="Interactive organizational chart showing all employees by levels and departments"
	/>
</svelte:head>

<div class="space-y-6">
	<!-- Header -->
	<div class="flex items-center justify-between">
		<div class="flex items-center gap-4">
			<Button variant="ghost" size="sm" onclick={() => goto('/dashboard/employees/directory')}>
				<ArrowLeft class="h-4 w-4" />
			</Button>

			<div>
				<div class="flex items-center gap-3">
					<Building2 class="h-8 w-8 text-primary" />
					<h1 class="text-3xl font-bold tracking-tight">Organization Map</h1>
				</div>
				<p class="text-muted-foreground">Interactive company-wide organizational structure</p>
			</div>
		</div>

		<div class="flex items-center gap-2">
			<Button variant="outline" href="/dashboard/employees/directory">
				<Users class="mr-2 h-4 w-4" />
				Directory View
			</Button>
		</div>
	</div>

	<!-- Loading/Error States -->
	{#if loading}
		<div class="flex items-center justify-center py-12">
			<div class="text-center">
				<Building2 class="mx-auto h-8 w-8 animate-pulse text-muted-foreground" />
				<p class="mt-2 text-muted-foreground">Loading organization structure...</p>
			</div>
		</div>
	{:else if error}
		<div class="flex items-center justify-center py-12">
			<div class="text-center">
				<h3 class="text-lg font-semibold text-destructive">Error Loading Organization Map</h3>
				<p class="text-muted-foreground">{error}</p>
				<Button class="mt-4" onclick={() => window.location.reload()}>Try Again</Button>
			</div>
		</div>
	{:else if allEmployees.length === 0}
		<div class="flex items-center justify-center py-12">
			<div class="text-center">
				<Users class="mx-auto h-12 w-12 text-muted-foreground" />
				<h3 class="mt-4 text-lg font-semibold">No Employees Found</h3>
				<p class="text-muted-foreground">
					There are no active employees to display in the organization map.
				</p>
			</div>
		</div>
	{:else}
		<!-- Full Organization Map -->
		<FullOrgMap {allEmployees} />
	{/if}
</div>
