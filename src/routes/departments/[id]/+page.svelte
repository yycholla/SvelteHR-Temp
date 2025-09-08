<script lang="ts">
	import { onMount } from 'svelte';
	import { page } from '$app/stores';
	import { goto } from '$app/navigation';
	import { departmentActions, currentDepartment, isLoading, error } from '$lib/stores/departments';
	import { RoleGuard } from '$lib/components/auth';
	import { Button } from '$lib/components/ui/button';
	import { Card, CardContent, CardHeader, CardTitle } from '$lib/components/ui/card';
	import { Badge } from '$lib/components/ui/badge';
	import { Separator } from '$lib/components/ui/separator';
	import {
		ArrowLeft,
		Edit,
		Trash2,
		Building2,
		Users,
		DollarSign,
		Calendar,
		User
	} from 'lucide-svelte';

	const departmentId = $derived($page.params.id);

	onMount(() => {
		if (departmentId) {
			departmentActions.loadDepartment(departmentId);
		}
	});

	async function handleDelete() {
		if (!currentDepartment) return;

		if (
			!confirm(
				`Are you sure you want to delete "${currentDepartment.name}"? This action cannot be undone.`
			)
		) {
			return;
		}

		try {
			await departmentActions.deleteDepartment(currentDepartment.id);
			await goto('/departments');
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

	function formatDate(dateString?: string): string {
		if (!dateString) return 'Unknown';
		return new Date(dateString).toLocaleDateString('en-US', {
			year: 'numeric',
			month: 'long',
			day: 'numeric'
		});
	}
</script>

<svelte:head>
	<title>{currentDepartment?.name || 'Department'} - SvelteHR</title>
</svelte:head>

<div class="container mx-auto max-w-6xl px-4 py-8">
	<!-- Header -->
	<div class="mb-8 flex items-center gap-4">
		<Button variant="ghost" size="icon" href="/departments">
			<ArrowLeft class="h-4 w-4" />
		</Button>
		<div class="flex-1">
			{#if isLoading}
				<div class="animate-pulse">
					<div class="mb-2 h-8 w-64 rounded bg-muted"></div>
					<div class="h-4 w-32 rounded bg-muted"></div>
				</div>
			{:else if currentDepartment}
				<h1 class="flex items-center gap-3 text-3xl font-bold text-foreground">
					<Building2 class="h-8 w-8 text-primary" />
					{currentDepartment.name}
					{#if !currentDepartment.is_active}
						<Badge variant="secondary">Inactive</Badge>
					{/if}
				</h1>
				{#if currentDepartment.description}
					<p class="mt-2 text-muted-foreground">{currentDepartment.description}</p>
				{/if}
			{/if}
		</div>

		{#if currentDepartment}
			<div class="flex items-center gap-2">
				<RoleGuard roles={['admin', 'hr', 'hr_admin']}>
					<Button variant="outline" href="/departments/{currentDepartment.id}/edit" class="gap-2">
						<Edit class="h-4 w-4" />
						Edit
					</Button>
					<Button
						variant="outline"
						onclick={handleDelete}
						class="gap-2 text-destructive hover:text-destructive"
					>
						<Trash2 class="h-4 w-4" />
						Delete
					</Button>
				</RoleGuard>
			</div>
		{/if}
	</div>

	<!-- Error State -->
	{#if error}
		<Card class="mb-6 border-destructive">
			<CardContent class="pt-6">
				<p class="text-destructive">{error}</p>
				<div class="mt-4 flex gap-2">
					<Button variant="outline" onclick={() => departmentActions.clearError()}>Dismiss</Button>
					<Button variant="outline" href="/departments">Back to Departments</Button>
				</div>
			</CardContent>
		</Card>
	{/if}

	<!-- Loading State -->
	{#if isLoading}
		<div class="grid gap-6 lg:grid-cols-2">
			{#each Array(4) as _}
				<Card>
					<CardHeader>
						<div class="animate-pulse">
							<div class="mb-2 h-6 w-32 rounded bg-muted"></div>
							<div class="h-4 w-24 rounded bg-muted"></div>
						</div>
					</CardHeader>
					<CardContent>
						<div class="animate-pulse space-y-3">
							<div class="h-4 rounded bg-muted"></div>
							<div class="h-4 w-3/4 rounded bg-muted"></div>
						</div>
					</CardContent>
				</Card>
			{/each}
		</div>
	{:else if currentDepartment}
		<div class="grid gap-6 lg:grid-cols-2">
			<!-- Basic Information -->
			<Card>
				<CardHeader>
					<CardTitle class="flex items-center gap-2">
						<Building2 class="h-5 w-5" />
						Basic Information
					</CardTitle>
				</CardHeader>
				<CardContent class="space-y-4">
					<div class="flex items-center justify-between">
						<span class="text-muted-foreground">Department ID:</span>
						<span class="font-mono text-sm">{currentDepartment.id}</span>
					</div>

					<div class="flex items-center justify-between">
						<span class="text-muted-foreground">Status:</span>
						<Badge variant={currentDepartment.is_active ? 'default' : 'secondary'}>
							{currentDepartment.is_active ? 'Active' : 'Inactive'}
						</Badge>
					</div>

					{#if currentDepartment.budget}
						<div class="flex items-center justify-between">
							<span class="text-muted-foreground">Budget:</span>
							<span class="flex items-center gap-1 font-semibold">
								<DollarSign class="h-4 w-4" />
								{formatBudget(currentDepartment.budget)}
							</span>
						</div>
					{/if}

					<div class="flex items-center justify-between">
						<span class="text-muted-foreground">Created:</span>
						<span class="flex items-center gap-1 text-sm">
							<Calendar class="h-4 w-4" />
							{formatDate(currentDepartment.created_at)}
						</span>
					</div>

					{#if currentDepartment.updated_at !== currentDepartment.created_at}
						<div class="flex items-center justify-between">
							<span class="text-muted-foreground">Last Updated:</span>
							<span class="flex items-center gap-1 text-sm">
								<Calendar class="h-4 w-4" />
								{formatDate(currentDepartment.updated_at)}
							</span>
						</div>
					{/if}
				</CardContent>
			</Card>

			<!-- Organizational Structure -->
			<Card>
				<CardHeader>
					<CardTitle class="flex items-center gap-2">
						<Users class="h-5 w-5" />
						Organization
					</CardTitle>
				</CardHeader>
				<CardContent class="space-y-4">
					{#if currentDepartment.parent}
						<div class="flex items-center justify-between">
							<span class="text-muted-foreground">Parent Department:</span>
							<Button
								variant="link"
								href="/departments/{currentDepartment.parent.id}"
								class="h-auto p-0"
							>
								{currentDepartment.parent.name}
							</Button>
						</div>
					{:else}
						<div class="flex items-center justify-between">
							<span class="text-muted-foreground">Parent Department:</span>
							<span class="text-sm">Root Department</span>
						</div>
					{/if}

					{#if currentDepartment.manager}
						<div class="flex items-center justify-between">
							<span class="text-muted-foreground">Manager:</span>
							<Button
								variant="link"
								href="/employees/{currentDepartment.manager.id}"
								class="flex h-auto items-center gap-1 p-0"
							>
								<User class="h-4 w-4" />
								{currentDepartment.manager.full_name}
							</Button>
						</div>
					{:else}
						<div class="flex items-center justify-between">
							<span class="text-muted-foreground">Manager:</span>
							<span class="text-sm">Not Assigned</span>
						</div>
					{/if}

					{#if currentDepartment.employee_count !== undefined}
						<div class="flex items-center justify-between">
							<span class="text-muted-foreground">Employees:</span>
							<Button
								variant="link"
								href="/departments/{currentDepartment.id}/employees"
								class="flex h-auto items-center gap-1 p-0"
							>
								<Users class="h-4 w-4" />
								{currentDepartment.employee_count} employees
							</Button>
						</div>
					{/if}
				</CardContent>
			</Card>

			<!-- Subdepartments -->
			<Card class="lg:col-span-2">
				<CardHeader>
					<CardTitle class="flex items-center gap-2">
						<Building2 class="h-5 w-5" />
						Subdepartments
					</CardTitle>
				</CardHeader>
				<CardContent>
					<!-- TODO: Load and display subdepartments -->
					<div class="py-8 text-center">
						<p class="text-muted-foreground">Subdepartments will be displayed here</p>
						<RoleGuard roles={['admin', 'hr', 'hr_admin']}>
							<Button
								href="/departments/create?parent={currentDepartment.id}"
								variant="outline"
								class="mt-4"
							>
								Add Subdepartment
							</Button>
						</RoleGuard>
					</div>
				</CardContent>
			</Card>

			<!-- Employees -->
			<Card class="lg:col-span-2">
				<CardHeader>
					<CardTitle class="flex items-center gap-2">
						<Users class="h-5 w-5" />
						Department Employees
					</CardTitle>
				</CardHeader>
				<CardContent>
					<!-- TODO: Load and display department employees -->
					<div class="py-8 text-center">
						<p class="text-muted-foreground">Department employees will be displayed here</p>
						<Button
							href="/employees?department={currentDepartment.id}"
							variant="outline"
							class="mt-4"
						>
							View All Employees
						</Button>
					</div>
				</CardContent>
			</Card>
		</div>
	{:else}
		<!-- Department not found -->
		<Card>
			<CardContent class="pt-6">
				<div class="py-12 text-center">
					<Building2 class="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
					<h3 class="mb-2 text-lg font-semibold">Department Not Found</h3>
					<p class="mb-4 text-muted-foreground">
						The department you're looking for doesn't exist or you don't have permission to view it.
					</p>
					<Button href="/departments" variant="outline">Back to Departments</Button>
				</div>
			</CardContent>
		</Card>
	{/if}
</div>
