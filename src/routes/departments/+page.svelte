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
	import { Plus, Building2, Users, Edit, Trash2, Eye, TreePine, List, Search } from 'lucide-svelte';
	import type { Department } from '$lib/types/department';
	import DepartmentTree from '$lib/components/departments/DepartmentTree.svelte';

	let viewMode = $state<'list' | 'hierarchy'>('list');
	let searchQuery = $state('');
	let showInactiveOnly = $state(false);

	// Derived filtered departments
	const filteredDepartments = $derived(() => {
		let filtered = departments.filter((dept) => {
			const matchesSearch =
				!searchQuery ||
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
		const deptName =
			typeof dept === 'string'
				? departments.find((d) => d.id === deptId)?.name || 'this department'
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

<div class="container mx-auto max-w-7xl px-4 py-8">
	<!-- Header -->
	<div class="mb-8 flex items-center justify-between">
		<div>
			<h1 class="text-3xl font-bold text-foreground">Department Management</h1>
			<p class="mt-2 text-muted-foreground">Manage organizational departments and hierarchy</p>
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
			<div class="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
				<!-- Search -->
				<div class="relative max-w-sm flex-1">
					<Search
						class="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 transform text-muted-foreground"
					/>
					<input
						type="text"
						placeholder="Search departments..."
						bind:value={searchQuery}
						class="w-full rounded-md border border-input bg-background py-2 pr-4 pl-10 text-foreground placeholder:text-muted-foreground focus:border-transparent focus:ring-2 focus:ring-ring focus:outline-none"
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
					<div class="flex items-center space-x-1 rounded-lg bg-muted p-1">
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
				<div
					class="mx-auto mb-4 h-12 w-12 animate-spin rounded-full border-b-2 border-primary"
				></div>
				<p class="text-muted-foreground">Loading departments...</p>
			</div>
		</div>
	{:else if viewMode === 'list'}
		<!-- List View -->
		{#if filteredDepartments.length === 0}
			<Card>
				<CardContent class="pt-6">
					<div class="py-12 text-center">
						<Building2 class="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
						<h3 class="mb-2 text-lg font-semibold">No departments found</h3>
						<p class="mb-4 text-muted-foreground">
							{searchQuery
								? 'No departments match your search criteria.'
								: 'Get started by creating your first department.'}
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
					<Card class="transition-shadow hover:shadow-md">
						<CardHeader class="pb-3">
							<div class="flex items-start justify-between">
								<div class="flex-1">
									<CardTitle class="flex items-center gap-2 text-xl">
										<Building2 class="h-5 w-5 text-primary" />
										{dept.name}
										{#if !dept.is_active}
											<Badge variant="secondary">Inactive</Badge>
										{/if}
									</CardTitle>
									{#if dept.description}
										<p class="mt-1 text-sm text-muted-foreground">{dept.description}</p>
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
										<span class="flex items-center gap-1 font-medium">
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
									<Button variant="ghost" size="sm" href="/departments/{dept.id}" class="gap-1">
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
					<div class="py-12 text-center">
						<Building2 class="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
						<h3 class="mb-2 text-lg font-semibold">No department hierarchy</h3>
						<p class="mb-4 text-muted-foreground">
							Create departments to see the organizational structure.
						</p>
						<RoleGuard roles={['admin', 'hr', 'hr_admin']}>
							<Button href="/departments/create" class="gap-2">
								<Plus class="h-4 w-4" />
								Create Department
							</Button>
						</RoleGuard>
					</div>
				{:else}
					<!-- Department Hierarchy Tree -->
					<DepartmentTree nodes={hierarchy} onDelete={handleDeleteDepartment} />
				{/if}
			</CardContent>
		</Card>
	{/if}
</div>
