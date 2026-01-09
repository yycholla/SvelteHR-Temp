<script lang="ts">
	import { enhance } from '$app/forms';
	import { logger } from '$lib/utils/logger';
	import { invalidateAll } from '$app/navigation';
	import { goto } from '$app/navigation';
	import { ArrowLeft, Save, Search, Zap, Check, X } from '@lucide/svelte';
	import PermissionsMatrix from '$lib/components/permissions/PermissionsMatrix.svelte';
	import { Button } from '$lib/components/ui/button';

	const { data, form } = $props();

	// State management
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

	// Initialize state
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

	// Track changes
	let initialPermissionIds = $state<Set<string>>(
		new Set(data.role?.permissions?.map((p: any) => p.id) || [])
	);

	const selectedPermissionIds = $derived.by(() => {
		const permIds: string[] = [];

		permissionsState.forEach((state, resource) => {
			const resourcePerms = data.permissions.filter((p: any) => p.resource === resource);

			if (state.readScope !== 'none') {
				const readPerm = resourcePerms.find((p: any) => p.action === `read:${state.readScope}`);
				if (readPerm) permIds.push(readPerm.id);
				else {
					const legacyRead = resourcePerms.find((p: any) => p.action === 'read');
					if (legacyRead) permIds.push(legacyRead.id);
				}
			}

			if (state.write) {
				const writePerm = resourcePerms.find((p: any) => p.action === 'write');
				if (writePerm) permIds.push(writePerm.id);
			}

			if (state.delete) {
				const deletePerm = resourcePerms.find((p: any) => p.action === 'delete');
				if (deletePerm) permIds.push(deletePerm.id);
			}

			state.special.forEach((spec) => {
				if (spec.enabled) {
					const specialPerm = resourcePerms.find((p: any) => p.action === spec.action);
					if (specialPerm) permIds.push(specialPerm.id);
				}
			});
		});

		return permIds;
	});

	const stats = $derived({
		total: data.permissions.length,
		assigned: selectedPermissionIds.length,
		percentage: Math.round((selectedPermissionIds.length / data.permissions.length) * 100)
	});

	$effect(() => {
		const currentIds = selectedPermissionIds.sort();
		const initialIds = Array.from(initialPermissionIds).sort();
		hasChanges = JSON.stringify(currentIds) !== JSON.stringify(initialIds);
	});

	function handlePermissionChange(resource: string, changes: Partial<ResourcePermissions>) {
		const current = permissionsState.get(resource) || {
			readScope: 'none',
			write: false,
			delete: false,
			special: []
		};
		permissionsState.set(resource, { ...current, ...changes });
		permissionsState = new Map(permissionsState);
	}

	async function handleFormSubmit() {
		loading = true;
	}

	async function handleFormResult() {
		loading = false;
		await invalidateAll();
		if (form?.success) {
			initialPermissionIds = new Set(selectedPermissionIds);
			hasChanges = false;
		}
	}

	function goBack() {
		goto('/admin/permissions');
	}

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

<div class="flex flex-col h-full bg-background overflow-hidden">
	<!-- Sticky Header -->
	<header class="flex-shrink-0 flex items-center justify-between h-14 px-4 border-b bg-background z-20">
		<div class="flex items-center gap-4">
			<Button variant="ghost" size="icon" class="h-8 w-8 -ml-2" onclick={goBack} title="Back">
				<ArrowLeft class="h-4 w-4" />
			</Button>
			<div>
				<h1 class="text-sm font-semibold tracking-tight">{data.role?.name}</h1>
				<div class="text-[10px] text-muted-foreground flex items-center gap-1">
					<span class={stats.percentage > 0 ? "text-primary font-medium" : ""}>{stats.assigned}</span>
					<span>/</span>
					<span>{stats.total} permissions</span>
				</div>
			</div>
		</div>

		<div class="flex items-center gap-2">
			<!-- Quick Actions -->
			<div class="relative group">
				<Button variant="outline" size="sm" class="h-8 text-xs">
					<Zap class="mr-2 h-3.5 w-3.5" />
					Actions
				</Button>
				<div class="absolute right-0 top-full mt-1 w-48 rounded-md shadow-lg bg-popover border text-popover-foreground opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50 p-1">
					<button class="w-full text-left px-2 py-1.5 text-xs hover:bg-accent rounded-sm" onclick={() => grantAllReadScope('self')}>Grant Read: Self</button>
					<button class="w-full text-left px-2 py-1.5 text-xs hover:bg-accent rounded-sm" onclick={() => grantAllReadScope('team')}>Grant Read: Team</button>
					<button class="w-full text-left px-2 py-1.5 text-xs hover:bg-accent rounded-sm" onclick={() => grantAllReadScope('all')}>Grant Read: All</button>
					<div class="h-px bg-border my-1"></div>
					<button class="w-full text-left px-2 py-1.5 text-xs text-destructive hover:bg-destructive/10 rounded-sm" onclick={() => revokeAllRead()}>Revoke All Read</button>
				</div>
			</div>

			<!-- Search -->
			<div class="relative w-48">
				<Search class="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
				<input
					type="text"
					bind:value={searchQuery}
					placeholder="Filter resources..."
					class="w-full h-8 pl-8 pr-3 rounded-md border border-input bg-background text-xs placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
				/>
			</div>

			<!-- Save -->
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
				<Button
					type="submit"
					size="sm"
					class="h-8 min-w-[100px]"
					disabled={loading || !hasChanges}
				>
					{#if loading}
						Saving...
					{:else if hasChanges}
						<Save class="mr-2 h-3.5 w-3.5" /> Save
					{:else}
						<Check class="mr-2 h-3.5 w-3.5" /> Saved
					{/if}
				</Button>
			</form>
		</div>
	</header>

	<!-- Content -->
	<div class="flex-1 overflow-auto bg-muted/5">
		{#if form?.error}
			<div class="m-4 rounded-md bg-destructive/10 p-3 text-sm text-destructive flex items-center gap-2">
				<X class="h-4 w-4" /> {form.error}
			</div>
		{/if}

		<div class="border-b bg-background">
			<PermissionsMatrix
				permissions={data.permissions}
				{permissionsState}
				onPermissionChange={handlePermissionChange}
			/>
		</div>
	</div>
</div>