<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { 
		departmentActions, 
		departments, 
		hierarchy,
		isLoading, 
		error 
	} from '$lib/stores/departments';
	import { RoleGuard } from '$lib/components/auth';
	import { Button } from '$lib/components/ui/button';
	import { Card, CardContent, CardHeader, CardTitle } from '$lib/components/ui/card';
	import { Badge } from '$lib/components/ui/badge';
	import { Separator } from '$lib/components/ui/separator';
	import { 
		Plus, 
		Building2, 
		Users, 
		Edit, 
		Trash2, 
		Eye,
		TreePine,
		List,
		Search
	} from 'lucide-svelte';
	import type { Department } from '$lib/types/department';
	import DepartmentTree from '$lib/components/departments/DepartmentTree.svelte';

	let viewMode = $state<'list' | 'hierarchy'>('list');
	let searchQuery = $state('');
	let showInactiveOnly = $state(false);

	// Derived filtered departments
	const filteredDepartments = $derived(() => {
		let filtered = departments.filter(dept => {
			const matchesSearch = !searchQuery || 
				dept.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
				dept.description?.toLowerCase().includes(searchQuery.toLowerCase());
			
			const matchesStatus = showInactiveOnly ? !dept.is_active : dept.is_active;
			
			return matchesSearch && matchesStatus;
		});
		
		return filtered.sort((a, b) => a.name.localeCompare(b.name));
	});

	onMount(() => {
		loadInitialData();
	});

	async function loadInitialData() {
		await departmentActions.loadDepartments({ active_only: !showInactiveOnly });
		if (viewMode === 'hierarchy') {
			await departmentActions.loadHierarchy();
		}
	}

	async function handleViewModeChange(mode: 'list' | 'hierarchy') {
		viewMode = mode;
		if (mode === 'hierarchy' && hierarchy.length === 0) {
			await departmentActions.loadHierarchy();
		}
	}

	async function handleStatusFilterChange() {
		await departmentActions.loadDepartments({ active_only: !showInactiveOnly });
	}

	async function handleDeleteDepartment(dept: Department | string) {
		// Handle both Department object (from list view) and string ID (from tree view)
		const deptId = typeof dept === 'string' ? dept : dept.id;
		const deptName = typeof dept === 'string' 
			? departments.find(d => d.id === deptId)?.name || 'this department'
			: dept.name;
		
		if (!confirm(`Are you sure you want to delete "${deptName}"? This action cannot be undone.`)) {
			return;
		}
		
		try {
			await departmentActions.deleteDepartment(deptId);
			// Refresh data after deletion
			await loadInitialData();
		} catch (err) {
			console.error('Failed to delete department:', err);
		}
	}

	function formatBudget(budget?: number | string): string {
		if (!budget) return 'Not set';
		const num = typeof budget === 'string' ? parseFloat(budget) : budget;
		return new Intl.NumberFormat('en-US', {
			style: 'currency',
			currency: 'USD'
		}).format(num);
	}
</script>

<svelte:head>
	<title>Department Management - SvelteHR</title>
</svelte:head>

<div class="container mx-auto py-8 px-4 max-w-7xl">
	<!-- Header -->
	<div class="flex items-center justify-between mb-8">
		<div>
			<h1 class="text-3xl font-bold text-foreground">Department Management</h1>
			<p class="text-muted-foreground mt-2">Manage organizational departments and hierarchy</p>
		</div>
		
		<RoleGuard roles={['admin', 'hr', 'hr_admin']}>
			<Button href="/departments/create" class="gap-2">
				<Plus class="h-4 w-4" />
				New Department
			</Button>
		</RoleGuard>
	</div>

	<!-- Controls -->
	<Card class="mb-6">
		<CardContent class="pt-6">
			<div class="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
				<!-- Search -->
				<div class="relative flex-1 max-w-sm">
					<Search class="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
					<input
						type="text"
						placeholder="Search departments..."
						bind:value={searchQuery}
						class="w-full pl-10 pr-4 py-2 border border-input rounded-md bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent"
					/>
				</div>

				<div class="flex items-center gap-4">
					<!-- Status Filter -->
					<label class="flex items-center space-x-2 text-sm">
						<input
							type="checkbox"
							bind:checked={showInactiveOnly}
							onchange={handleStatusFilterChange}
							class="rounded"
						/>
						<span>Show inactive</span>
					</label>

					<!-- View Mode Toggle -->
					<div class="flex items-center space-x-1 bg-muted p-1 rounded-lg">
						<Button
							variant={viewMode === 'list' ? 'default' : 'ghost'}
							size="sm"
							onclick={() => handleViewModeChange('list')}
							class="gap-2"
						>
							<List class="h-4 w-4" />
							List
						</Button>
						<Button
							variant={viewMode === 'hierarchy' ? 'default' : 'ghost'}
							size="sm"
							onclick={() => handleViewModeChange('hierarchy')}
							class="gap-2"
						>
							<TreePine class="h-4 w-4" />
							Hierarchy
						</Button>
					</div>
				</div>
			</div>
		</CardContent>
	</Card>

	<!-- Error State -->
	{#if error}
		<Card class="mb-6 border-destructive">
			<CardContent class="pt-6">
				<p class="text-destructive">{error}</p>
				<Button variant="outline" onclick={() => departmentActions.clearError()} class="mt-2">
					Dismiss
				</Button>
			</CardContent>
		</Card>
	{/if}

	<!-- Loading State -->
	{#if isLoading}
		<div class="flex items-center justify-center py-12">
			<div class="text-center">
				<div class="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
				<p class="text-muted-foreground">Loading departments...</p>
			</div>
		</div>
	{:else if viewMode === 'list'}
		<!-- List View -->
		{#if filteredDepartments.length === 0}
			<Card>
				<CardContent class="pt-6">
					<div class="text-center py-12">
						<Building2 class="h-12 w-12 text-muted-foreground mx-auto mb-4" />
						<h3 class="text-lg font-semibold mb-2">No departments found</h3>
						<p class="text-muted-foreground mb-4">
							{searchQuery ? 'No departments match your search criteria.' : 'Get started by creating your first department.'}
						</p>
						<RoleGuard roles={['admin', 'hr', 'hr_admin']}>
							<Button href="/departments/create" class="gap-2">
								<Plus class="h-4 w-4" />
								Create Department
							</Button>
						</RoleGuard>
					</div>
				</CardContent>
			</Card>
		{:else}
			<div class="grid gap-6 lg:grid-cols-2">
				{#each filteredDepartments as dept (dept.id)}
					<Card class="hover:shadow-md transition-shadow">
						<CardHeader class="pb-3">
							<div class="flex items-start justify-between">
								<div class="flex-1">
									<CardTitle class="text-xl flex items-center gap-2">
										<Building2 class="h-5 w-5 text-primary" />
										{dept.name}
										{#if !dept.is_active}
											<Badge variant="secondary">Inactive</Badge>
										{/if}
									</CardTitle>
									{#if dept.description}
										<p class="text-sm text-muted-foreground mt-1">{dept.description}</p>
									{/if}
								</div>
							</div>
						</CardHeader>
						
						<CardContent>
							<div class="space-y-3">
								<!-- Budget -->
								{#if dept.budget}
									<div class="flex items-center justify-between text-sm">
										<span class="text-muted-foreground">Budget:</span>
										<span class="font-medium">{formatBudget(dept.budget)}</span>
									</div>
								{/if}

								<!-- Employee Count -->
								{#if dept.employee_count !== undefined}
									<div class="flex items-center justify-between text-sm">
										<span class="text-muted-foreground">Employees:</span>
										<span class="font-medium flex items-center gap-1">
											<Users class="h-3 w-3" />
											{dept.employee_count}
										</span>
									</div>
								{/if}

								<!-- Parent Department -->
								{#if dept.parent}
									<div class="flex items-center justify-between text-sm">
										<span class="text-muted-foreground">Parent:</span>
										<span class="font-medium">{dept.parent.name}</span>
									</div>
								{/if}

								<Separator />

								<!-- Actions -->
								<div class="flex items-center justify-end gap-2">
									<Button
										variant="ghost"
										size="sm"
										href="/departments/{dept.id}"
										class="gap-1"
									>
										<Eye class="h-3 w-3" />
										View
									</Button>
									
									<RoleGuard roles={['admin', 'hr', 'hr_admin']}>
										<Button
											variant="ghost"
											size="sm"
											href="/departments/{dept.id}/edit"
											class="gap-1"
										>
											<Edit class="h-3 w-3" />
											Edit
										</Button>
										
										<Button
											variant="ghost"
											size="sm"
											onclick={() => handleDeleteDepartment(dept)}
											class="gap-1 text-destructive hover:text-destructive"
										>
											<Trash2 class="h-3 w-3" />
											Delete
										</Button>
									</RoleGuard>
								</div>
							</div>
						</CardContent>
					</Card>
				{/each}
			</div>
		{/if}
	{:else}
		<!-- Hierarchy View -->
		<Card>
			<CardHeader>
				<CardTitle class="flex items-center gap-2">
					<TreePine class="h-5 w-5" />
					Department Hierarchy
				</CardTitle>
			</CardHeader>
			<CardContent>
				{#if hierarchy.length === 0}
					<div class="text-center py-12">
						<Building2 class="h-12 w-12 text-muted-foreground mx-auto mb-4" />
						<h3 class="text-lg font-semibold mb-2">No department hierarchy</h3>
						<p class="text-muted-foreground mb-4">Create departments to see the organizational structure.</p>
						<RoleGuard roles={['admin', 'hr', 'hr_admin']}>
							<Button href="/departments/create" class="gap-2">
								<Plus class="h-4 w-4" />
								Create Department
							</Button>
						</RoleGuard>
					</div>
				{:else}
					<!-- Department Hierarchy Tree -->
					<DepartmentTree 
						nodes={hierarchy} 
						onDelete={handleDeleteDepartment}
					/>
				{/if}
			</CardContent>
		</Card>
	{/if}
</div>