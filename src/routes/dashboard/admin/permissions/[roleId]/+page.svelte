<script lang="ts">
	import { enhance } from '$app/forms';
	import { invalidateAll } from '$app/navigation';
	import { goto } from '$app/navigation';
	import {
		Shield,
		Save,
		ArrowLeft,
		Search,
		Check,
		X,
		Info,
		ChevronRight
	} from '@lucide/svelte';
	import * as Card from '$lib/components/ui/card';
	import Badge from '$lib/components/ui/badge/badge.svelte';

	let { data, form } = $props();

	// Debug logging
	console.log('[ROLE PERMISSIONS PAGE] Data:', data);
	console.log('[ROLE PERMISSIONS PAGE] Role:', data.role);
	console.log('[ROLE PERMISSIONS PAGE] Permissions:', data.permissions?.length);

	// State management
	let searchQuery = $state('');
	let permissionsSelection = $state<Set<string>>(
		new Set(data.role?.permissions?.map((p: any) => p.id) || [])
	);
	let loading = $state(false);
	let hasChanges = $state(false);

	// Track initial state to detect changes
	let initialPermissionIds = $state<Set<string>>(
		new Set(data.role?.permissions?.map((p: any) => p.id) || [])
	);

	// Group permissions by resource for better organization
	let permissionsByResource = $derived(
		data.permissions.reduce((acc: Record<string, any[]>, permission: any) => {
			const resource = permission.resource || 'general';
			if (!acc[resource]) {
				acc[resource] = [];
			}
			acc[resource].push(permission);
			return acc;
		}, {})
	);

	// Filter resources based on search
	let filteredResources = $derived.by(() => {
		if (!searchQuery) return permissionsByResource;

		const query = searchQuery.toLowerCase();
		const filtered: Record<string, any[]> = {};

		Object.entries(permissionsByResource).forEach(([resource, permissions]) => {
			const matchingPermissions = permissions.filter(
				(p) =>
					p.resource?.toLowerCase().includes(query) ||
					p.action?.toLowerCase().includes(query) ||
					p.description?.toLowerCase().includes(query)
			);

			if (matchingPermissions.length > 0 || resource.toLowerCase().includes(query)) {
				filtered[resource] = matchingPermissions.length > 0 ? matchingPermissions : permissions;
			}
		});

		return filtered;
	});

	// Calculate statistics
	let stats = $derived({
		total: data.permissions.length,
		assigned: permissionsSelection.size,
		percentage: Math.round((permissionsSelection.size / data.permissions.length) * 100)
	});

	// Helper functions
	function togglePermissionSelection(permissionId: string) {
		if (permissionsSelection.has(permissionId)) {
			permissionsSelection.delete(permissionId);
		} else {
			permissionsSelection.add(permissionId);
		}
		permissionsSelection = new Set(permissionsSelection);

		// Check if there are changes from initial state
		const currentIds = Array.from(permissionsSelection).sort();
		const initialIds = Array.from(initialPermissionIds).sort();
		hasChanges = JSON.stringify(currentIds) !== JSON.stringify(initialIds);
	}

	function selectAllInResource(permissions: any[]) {
		permissions.forEach((p) => {
			permissionsSelection.add(p.id);
		});
		permissionsSelection = new Set(permissionsSelection);
		hasChanges = true;
	}

	function deselectAllInResource(permissions: any[]) {
		permissions.forEach((p) => {
			permissionsSelection.delete(p.id);
		});
		permissionsSelection = new Set(permissionsSelection);
		hasChanges = true;
	}

	function getPermissionBadgeVariant(action: string): 'default' | 'secondary' | 'destructive' {
		if (action.includes('delete') || action.includes('remove')) return 'destructive';
		if (action.includes('write') || action.includes('update') || action.includes('create'))
			return 'default';
		return 'secondary';
	}

	function getResourceIcon(resource: string): string {
		// Return appropriate emoji/icon based on resource type
		const iconMap: Record<string, string> = {
			dashboard: '📊',
			employees: '👥',
			departments: '🏢',
			events: '📅',
			tasks: '✅',
			notifications: '🔔',
			activities: '📝',
			attendance: '⏰',
			performance: '📈',
			reviews: '⭐',
			leave: '🏖️',
			documents: '📄',
			goals: '🎯',
			admin: '⚙️',
			management: '👔',
			teams: '👨‍👩‍👧‍👦',
			reports: '📊',
			users: '👤',
			roles: '🔐',
			permissions: '🛡️',
			'*': '🌟'
		};
		return iconMap[resource] || '📌';
	}

	async function handleFormSubmit() {
		loading = true;
	}

	async function handleFormResult() {
		loading = false;
		await invalidateAll();

		// Update initial state after successful save
		if (form?.success) {
			initialPermissionIds = new Set(permissionsSelection);
			hasChanges = false;
		}
	}

	function goBack() {
		goto('/dashboard/admin/permissions');
	}
</script>

<div class="space-y-6 p-6">
	<!-- Breadcrumb Navigation -->
	<div class="flex items-center gap-2 text-sm text-muted-foreground">
		<button onclick={goBack} class="hover:text-foreground transition-colors">
			Permissions
		</button>
		<ChevronRight class="h-4 w-4" />
		<span class="text-foreground font-medium">{data.role?.name}</span>
	</div>

	<!-- Header -->
	<div class="flex items-start justify-between">
		<div class="space-y-1">
			<div class="flex items-center gap-3">
				<button
					onclick={goBack}
					class="rounded-md p-2 hover:bg-accent transition-colors"
					title="Back to permissions"
				>
					<ArrowLeft class="h-5 w-5" />
				</button>
				<div>
					<h1 class="text-3xl font-bold text-foreground">
						{data.role?.name} Permissions
					</h1>
					{#if data.role?.description}
						<p class="text-muted-foreground">
							{data.role.description}
						</p>
					{/if}
				</div>
			</div>
		</div>
		<form
			method="POST"
			action="?/updatePermissions"
			use:enhance={() => {
				handleFormSubmit();
				return async ({ result, update }) => {
					handleFormResult();
					await update();
				};
			}}
		>
			<input
				type="hidden"
				name="permissionIds"
				value={JSON.stringify(Array.from(permissionsSelection))}
			/>
			<button
				type="submit"
				disabled={loading || !hasChanges}
				class="inline-flex items-center justify-center h-9 px-4 py-2 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
			>
				<Save class="mr-2 h-4 w-4" />
				{#if loading}
					Saving...
				{:else if hasChanges}
					Save Changes
				{:else}
					No Changes
				{/if}
			</button>
		</form>
	</div>

	<!-- Success/Error Messages -->
	{#if form?.error}
		<div class="rounded-md bg-destructive/10 p-4 text-destructive">
			{form.error}
		</div>
	{/if}

	{#if form?.success}
		<div class="rounded-md bg-green-100 p-4 text-green-800 dark:bg-green-900/20 dark:text-green-400">
			{form.message || 'Permissions updated successfully'}
		</div>
	{/if}

	<!-- Statistics Cards -->
	<div class="grid gap-4 md:grid-cols-3">
		<Card.Card>
			<Card.CardContent class="p-6">
				<div class="flex items-center justify-between">
					<div>
						<p class="text-sm text-muted-foreground">Total Permissions</p>
						<p class="text-2xl font-bold">{stats.total}</p>
					</div>
					<Shield class="h-8 w-8 text-muted-foreground" />
				</div>
			</Card.CardContent>
		</Card.Card>

		<Card.Card>
			<Card.CardContent class="p-6">
				<div class="flex items-center justify-between">
					<div>
						<p class="text-sm text-muted-foreground">Assigned</p>
						<p class="text-2xl font-bold">{stats.assigned}</p>
					</div>
					<Check class="h-8 w-8 text-green-600" />
				</div>
			</Card.CardContent>
		</Card.Card>

		<Card.Card>
			<Card.CardContent class="p-6">
				<div class="flex items-center justify-between">
					<div>
						<p class="text-sm text-muted-foreground">Coverage</p>
						<p class="text-2xl font-bold">{stats.percentage}%</p>
					</div>
					<div class="h-8 w-8 rounded-full border-4 border-primary flex items-center justify-center text-xs font-bold">
						{stats.percentage}
					</div>
				</div>
			</Card.CardContent>
		</Card.Card>
	</div>

	<!-- Search Bar -->
	<div class="relative">
		<Search class="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
		<input
			type="text"
			bind:value={searchQuery}
			placeholder="Search permissions by resource, action, or description..."
			class="w-full rounded-md border border-input bg-background py-2 pl-10 pr-4 text-sm focus:border-primary focus:outline-none"
		/>
	</div>

	<!-- Info Box -->
	<Card.Card class="border-blue-200 bg-blue-50 dark:border-blue-900 dark:bg-blue-950/20">
		<Card.CardContent class="p-4">
			<div class="flex gap-3">
				<Info class="h-5 w-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
				<div class="space-y-1">
					<p class="text-sm font-medium text-blue-900 dark:text-blue-100">
						Managing Role Permissions
					</p>
					<p class="text-xs text-blue-800 dark:text-blue-200">
						Select the permissions you want to assign to this role. Changes are saved when you click
						"Save Changes". Permissions control what users with this role can view and do in the system.
					</p>
				</div>
			</div>
		</Card.CardContent>
	</Card.Card>

	<!-- Permissions by Resource -->
	<div class="space-y-4">
		{#each Object.entries(filteredResources).sort((a, b) => a[0].localeCompare(b[0])) as [resource, permissions]}
			<Card.Card>
				<Card.CardHeader>
					<div class="flex items-center justify-between">
						<div class="flex items-center gap-3">
							<span class="text-2xl">{getResourceIcon(resource)}</span>
							<div>
								<Card.CardTitle class="capitalize">{resource}</Card.CardTitle>
								<Card.CardDescription>
									{permissions.length} permission{permissions.length !== 1 ? 's' : ''} available
								</Card.CardDescription>
							</div>
						</div>
						<div class="flex items-center gap-2">
							<Badge variant="secondary">
								{permissions.filter((p) => permissionsSelection.has(p.id)).length}/{permissions.length}
								selected
							</Badge>
							<button
								type="button"
								onclick={() => selectAllInResource(permissions)}
								class="inline-flex items-center justify-center h-8 px-3 py-2 rounded-md border border-input bg-background text-sm font-medium hover:bg-accent hover:text-accent-foreground transition-colors"
							>
								Select All
							</button>
							<button
								type="button"
								onclick={() => deselectAllInResource(permissions)}
								class="inline-flex items-center justify-center h-8 px-3 py-2 rounded-md border border-input bg-background text-sm font-medium hover:bg-accent hover:text-accent-foreground transition-colors"
							>
								Deselect All
							</button>
						</div>
					</div>
				</Card.CardHeader>
				<Card.CardContent>
					<div class="space-y-2">
						{#each permissions as permission}
							<label
								class="flex items-start gap-3 p-3 rounded-md border cursor-pointer hover:bg-accent transition-colors"
								class:bg-accent={permissionsSelection.has(permission.id)}
							>
								<input
									type="checkbox"
									checked={permissionsSelection.has(permission.id)}
									onchange={() => togglePermissionSelection(permission.id)}
									class="mt-1 h-4 w-4 rounded border-gray-300"
								/>
								<div class="flex-1 min-w-0">
									<div class="flex items-center gap-2 flex-wrap">
										<span class="font-mono text-sm font-medium text-foreground">
											{permission.resource}:{permission.action}
										</span>
										<Badge variant={getPermissionBadgeVariant(permission.action)}>
											{permission.action}
										</Badge>
									</div>
									{#if permission.description}
										<p class="text-sm text-muted-foreground mt-1">
											{permission.description}
										</p>
									{/if}
								</div>
								{#if permissionsSelection.has(permission.id)}
									<Check class="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
								{:else}
									<X class="h-5 w-5 text-muted-foreground/50 flex-shrink-0 mt-0.5" />
								{/if}
							</label>
						{/each}
					</div>
				</Card.CardContent>
			</Card.Card>
		{:else}
			<Card.Card>
				<Card.CardContent class="py-8">
					<p class="text-center text-muted-foreground">
						No permissions found matching "{searchQuery}"
					</p>
				</Card.CardContent>
			</Card.Card>
		{/each}
	</div>

	<!-- Sticky Save Button Footer (for long lists) -->
	<div class="fixed bottom-6 right-6 z-50" class:hidden={!hasChanges}>
		<form
			method="POST"
			action="?/updatePermissions"
			use:enhance={() => {
				handleFormSubmit();
				return async ({ result, update }) => {
					handleFormResult();
					await update();
				};
			}}
		>
			<input
				type="hidden"
				name="permissionIds"
				value={JSON.stringify(Array.from(permissionsSelection))}
			/>
			<button
				type="submit"
				disabled={loading}
				class="inline-flex items-center justify-center h-11 px-6 py-3 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-lg"
			>
				<Save class="mr-2 h-5 w-5" />
				{#if loading}
					Saving Changes...
				{:else}
					Save Changes
				{/if}
			</button>
		</form>
	</div>
</div>
