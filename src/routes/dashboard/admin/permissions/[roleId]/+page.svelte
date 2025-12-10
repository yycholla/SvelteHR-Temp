<script lang="ts">
	import { enhance } from '$app/forms';
	import { invalidateAll } from '$app/navigation';
	import { goto } from '$app/navigation';
	import { ArrowLeft, ChevronRight, Save, Search, Zap } from '@lucide/svelte';
	import PermissionsMatrix from '$lib/components/permissions/PermissionsMatrix.svelte';

	const { data, form } = $props();

	// Debug logging
	console.log('[ROLE PERMISSIONS PAGE] Data:', data);
	console.log('[ROLE PERMISSIONS PAGE] Role:', data.role);
	console.log('[ROLE PERMISSIONS PAGE] Permissions:', data.permissions?.length);

	// State management - using matrix structure
	interface ResourcePermissions {
		readScope: 'none' | 'self' | 'team' | 'all';
		write: boolean;
		delete: boolean;
		special: { action: string; id: string; enabled: boolean }[];
	}

	let searchQuery = $state('');
	let permissionsState = $state<Map<string, ResourcePermissions>>(new Map());
	let loading = $state(false);
	let hasChanges = $state(false);

	// Initialize state from existing permissions
	$effect(() => {
		const state = new Map<string, ResourcePermissions>();

		data.permissions.forEach((perm: any) => {
			const resource = perm.resource;

			if (!state.has(resource)) {
				state.set(resource, {
					readScope: 'none',
					write: false,
					delete: false,
					special: []
				});
			}

			const resourceState = state.get(resource)!;
			const isSelected = data.role?.permissions?.some((p: any) => p.id === perm.id);

			if (isSelected) {
				if (perm.action === 'read:self') {
					resourceState.readScope = 'self';
				} else if (perm.action === 'read:team') {
					resourceState.readScope = 'team';
				} else if (perm.action === 'read:all') {
					resourceState.readScope = 'all';
				} else if (perm.action === 'read' && resourceState.readScope === 'none') {
					resourceState.readScope = 'all';
				} else if (
					perm.action === 'write' ||
					perm.action === 'create' ||
					perm.action === 'update'
				) {
					resourceState.write = true;
				} else if (perm.action === 'delete') {
					resourceState.delete = true;
				} else if (
					![
						'read',
						'read:self',
						'read:team',
						'read:all',
						'write',
						'create',
						'update',
						'delete'
					].includes(perm.action)
				) {
					resourceState.special.push({ action: perm.action, id: perm.id, enabled: true });
				}
			}
		});

		permissionsState = state;
	});

	// Track initial state to detect changes
	let initialPermissionIds = $state<Set<string>>(
		new Set(data.role?.permissions?.map((p: any) => p.id) || [])
	);

	// Convert state to permission IDs for form submission
	const selectedPermissionIds = $derived.by(() => {
		const permIds: string[] = [];

		permissionsState.forEach((state, resource) => {
			// Find all permissions for this resource
			const resourcePerms = data.permissions.filter((p: any) => p.resource === resource);

			// Add read scope permission
			if (state.readScope !== 'none') {
				const readPerm = resourcePerms.find((p: any) => p.action === `read:${state.readScope}`);
				if (readPerm) permIds.push(readPerm.id);
				else {
					// Fallback to legacy read permission
					const legacyRead = resourcePerms.find((p: any) => p.action === 'read');
					if (legacyRead) permIds.push(legacyRead.id);
				}
			}

			// Add write permission
			if (state.write) {
				const writePerm = resourcePerms.find((p: any) => p.action === 'write');
				if (writePerm) permIds.push(writePerm.id);
			}

			// Add delete permission
			if (state.delete) {
				const deletePerm = resourcePerms.find((p: any) => p.action === 'delete');
				if (deletePerm) permIds.push(deletePerm.id);
			}

			// Add special permissions
			state.special.forEach((spec) => {
				if (spec.enabled) {
					const specialPerm = resourcePerms.find((p: any) => p.action === spec.action);
					if (specialPerm) permIds.push(specialPerm.id);
				}
			});
		});

		return permIds;
	});

	// Calculate statistics
	const stats = $derived({
		total: data.permissions.length,
		assigned: selectedPermissionIds.length,
		percentage: Math.round((selectedPermissionIds.length / data.permissions.length) * 100)
	});

	// Check for changes
	$effect(() => {
		const currentIds = selectedPermissionIds.sort();
		const initialIds = Array.from(initialPermissionIds).sort();
		hasChanges = JSON.stringify(currentIds) !== JSON.stringify(initialIds);
	});

	// Handle permission changes from matrix component
	function handlePermissionChange(resource: string, changes: Partial<ResourcePermissions>) {
		const current = permissionsState.get(resource) || {
			readScope: 'none',
			write: false,
			delete: false,
			special: []
		};

		permissionsState.set(resource, {
			...current,
			...changes
		});

		// Trigger reactivity
		permissionsState = new Map(permissionsState);
	}

	async function handleFormSubmit() {
		loading = true;
	}

	async function handleFormResult() {
		loading = false;
		await invalidateAll();

		// Update initial state after successful save
		if (form?.success) {
			initialPermissionIds = new Set(selectedPermissionIds);
			hasChanges = false;
		}
	}

	function goBack() {
		goto('/dashboard/admin/permissions');
	}

	// Quick actions
	function grantAllReadScope(scope: 'self' | 'team' | 'all') {
		permissionsState.forEach((state, resource) => {
			permissionsState.set(resource, { ...state, readScope: scope });
		});
		permissionsState = new Map(permissionsState);
	}

	function revokeAllRead() {
		permissionsState.forEach((state, resource) => {
			permissionsState.set(resource, { ...state, readScope: 'none' });
		});
		permissionsState = new Map(permissionsState);
	}
</script>

<div class="space-y-4 p-6">
	<!-- Compact Header with inline stats -->
	<div class="flex items-center justify-between border-b pb-4">
		<div class="flex items-center gap-3">
			<button
				onclick={goBack}
				class="rounded-md p-1.5 hover:bg-accent transition-colors"
				title="Back to permissions"
			>
				<ArrowLeft class="h-5 w-5" />
			</button>
			<div>
				<div class="flex items-center gap-2">
					<h1 class="text-2xl font-bold text-foreground">
						{data.role?.name}
					</h1>
					<span class="text-sm text-muted-foreground">
						· {stats.assigned}/{stats.total} ({stats.percentage}%)
					</span>
				</div>
				{#if data.role?.description}
					<p class="text-sm text-muted-foreground">
						{data.role.description}
					</p>
				{/if}
			</div>
		</div>
		<div class="flex items-center gap-2">
			<!-- Quick Actions Dropdown -->
			<div class="relative group">
				<button
					type="button"
					class="inline-flex items-center justify-center h-9 px-3 py-2 rounded-md border bg-background text-sm font-medium hover:bg-accent transition-colors"
				>
					<Zap class="mr-2 h-4 w-4" />
					Quick Actions
				</button>
				<div
					class="absolute right-0 mt-1 w-56 rounded-md shadow-lg bg-background border opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50"
				>
					<div class="py-1">
						<button
							type="button"
							onclick={() => grantAllReadScope('self')}
							class="block w-full text-left px-4 py-2 text-sm hover:bg-accent transition-colors"
						>
							Grant all read:self
						</button>
						<button
							type="button"
							onclick={() => grantAllReadScope('team')}
							class="block w-full text-left px-4 py-2 text-sm hover:bg-accent transition-colors"
						>
							Grant all read:team
						</button>
						<button
							type="button"
							onclick={() => grantAllReadScope('all')}
							class="block w-full text-left px-4 py-2 text-sm hover:bg-accent transition-colors"
						>
							Grant all read:all
						</button>
						<div class="border-t my-1"></div>
						<button
							type="button"
							onclick={() => revokeAllRead()}
							class="block w-full text-left px-4 py-2 text-sm text-destructive hover:bg-destructive/10 transition-colors"
						>
							Revoke all read permissions
						</button>
					</div>
				</div>
			</div>

			<!-- Save Button -->
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
				<input type="hidden" name="permissionIds" value={JSON.stringify(selectedPermissionIds)} />
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
	</div>

	<!-- Success/Error Messages -->
	{#if form?.error}
		<div class="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
			{form.error}
		</div>
	{/if}

	{#if form?.success}
		<div
			class="rounded-md bg-green-100 p-3 text-sm text-green-800 dark:bg-green-900/20 dark:text-green-400"
		>
			{form.message || 'Permissions updated successfully'}
		</div>
	{/if}

	<!-- Compact Search Bar -->
	<div class="relative max-w-md">
		<Search class="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
		<input
			type="text"
			bind:value={searchQuery}
			placeholder="Search resources..."
			class="w-full rounded-md border bg-background py-1.5 pl-10 pr-4 text-sm focus:border-primary focus:outline-none"
		/>
	</div>

	<!-- Permissions Matrix -->
	<div class="border rounded-lg bg-card">
		<PermissionsMatrix
			permissions={data.permissions}
			{permissionsState}
			onPermissionChange={handlePermissionChange}
		/>
	</div>

	<!-- Sticky Save Button Footer (for long lists) -->
	{#if hasChanges}
		<div class="fixed bottom-6 right-6 z-50">
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
				<input type="hidden" name="permissionIds" value={JSON.stringify(selectedPermissionIds)} />
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
	{/if}
</div>
