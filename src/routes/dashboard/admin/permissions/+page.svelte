<script lang="ts">
	import { logger } from '$lib/utils/logger';
	import { invalidateAll } from '$app/navigation';
	import { Beaker, Plus } from '@lucide/svelte';
	import Button from '$lib/components/ui/button/button.svelte';
	import { isTestModeActive, permissionTestActions } from '$lib/stores/permission-test.svelte';
	import type { Permission } from '$lib/types';

	// Import decomposed components
	import PermissionTabs from './components/PermissionTabs.svelte';
	import RoleList from './components/RoleList.svelte';
	import UserRoleList from './components/UserRoleList.svelte';
	import RoleCreateModal from './components/RoleCreateModal.svelte';
	import RoleEditModal from './components/RoleEditModal.svelte';
	import PermissionAssignModal from './components/PermissionAssignModal.svelte';
	import UserRoleAssignModal from './components/UserRoleAssignModal.svelte';

	const { data } = $props();

	// Debug logging
	logger.info(`[PERMISSIONS PAGE] Data: ${data}`);
	logger.info('[PERMISSIONS PAGE] Roles:', data.roles);
	logger.info('[PERMISSIONS PAGE] Permissions:', data.permissions);
	logger.info('[PERMISSIONS PAGE] Users:', data.users);

	// State management using Svelte 5 runes
	let activeTab = $state<'roles' | 'users'>('roles');
	let searchQuery = $state('');
	let selectedRole = $state<any>(null);
	let selectedUser = $state<any>(null);
	let expandedRoles = $state<Set<string>>(new Set());

	// Dialog states
	let showCreateRoleDialog = $state(false);
	let showEditRoleDialog = $state(false);
	let showPermissionDialog = $state(false);
	let showUserRoleDialog = $state(false);

	// Form states
	let roleForm = $state({
		name: '',
		description: ''
	});

	let permissionsSelection = $state<Set<string>>(new Set());
	let loading = $state(false);
	let actionResult = $state<{ success?: boolean; message?: string; error?: string } | null>(null);

	// Test mode state
	let selectedTestRoleId = $state<string>('');

	// Handle test mode
	function startTestMode() {
		const role = data.roles.find((r: any) => r.id === selectedTestRoleId);
		if (!role) return;

		// Get all permission strings for this role
		const rolePermissions = role.permissions?.map((p: any) => `${p.resource}:${p.action}`) || [];
		const currentPermissions = data.permissions?.map((p: any) => `${p.resource}:${p.action}`) || [];

		permissionTestActions.startTestMode(role.id, role.name, rolePermissions, currentPermissions);
	}

	// Derived states
	const filteredRoles = $derived(
		data.roles.filter((role: any) => {
			if (!searchQuery) return true;
			const query = searchQuery.toLowerCase();
			return (
				role.name?.toLowerCase().includes(query) || role.description?.toLowerCase().includes(query)
			);
		})
	);

	const filteredUsers = $derived(
		data.users.filter((user: any) => {
			if (!searchQuery) return true;
			const query = searchQuery.toLowerCase();
			return (
				user.email?.toLowerCase().includes(query) || user.displayName?.toLowerCase().includes(query)
			);
		})
	);

	// Group permissions by resource for better organization
	const permissionsByResource = $derived(
		data.permissions.reduce(
			(acc: Record<string, Permission[]>, permission: Permission) => {
				const resource = permission.resource || 'general';
				if (!acc[resource]) {
					acc[resource] = [];
				}
				acc[resource].push(permission);
				return acc;
			},
			{} as Record<string, Permission[]>
		)
	);

	// Helper functions
	function openCreateRoleDialog() {
		roleForm = { name: '', description: '' };
		showCreateRoleDialog = true;
		actionResult = null;
	}

	function openEditRoleDialog(role: any) {
		selectedRole = role;
		roleForm = {
			name: role.name,
			description: role.description || ''
		};
		showEditRoleDialog = true;
		actionResult = null;
	}

	function openPermissionDialog(role: any) {
		selectedRole = role;
		permissionsSelection = new Set(role.permissions?.map((p: any) => p.id) || []);
		showPermissionDialog = true;
		actionResult = null;
	}

	function openUserRoleDialog(user: any) {
		selectedUser = user;
		showUserRoleDialog = true;
		actionResult = null;
	}

	function closeDialogs() {
		showCreateRoleDialog = false;
		showEditRoleDialog = false;
		showPermissionDialog = false;
		showUserRoleDialog = false;
		selectedRole = null;
		selectedUser = null;
		actionResult = null;
	}

	function handleFormSubmit() {
		loading = true;
		actionResult = null;
	}

	async function handleFormResult() {
		loading = false;
		// Reload data to reflect the changes
		await invalidateAll();
	}

	async function handlePermissionSuccess() {
		// Close the dialog and clear selected role to prevent null reference errors
		showPermissionDialog = false;
		selectedRole = null;
		permissionsSelection.clear();
		await handleFormResult();
	}
</script>

<div class="space-y-6 p-6">
	<!-- Header -->
	<div class="flex items-center justify-between">
		<div>
			<h1 class="text-3xl font-bold text-foreground">Permissions Management</h1>
			<p class="text-muted-foreground">Manage roles, permissions, and user access control</p>
		</div>
		<div class="flex items-center gap-3">
			<!-- Test Permissions UI (only show when NOT already testing) -->
			{#if !isTestModeActive()}
				<div class="flex items-center gap-2">
					<select
						bind:value={selectedTestRoleId}
						class="rounded-md border border-input bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none"
					>
						<option value="">Select role to test...</option>
						{#each data.roles as role}
							<option value={role.id}>{role.name}</option>
						{/each}
					</select>
					<Button variant="outline" onclick={startTestMode} disabled={!selectedTestRoleId}>
						<Beaker class="mr-2 h-4 w-4" />
						Test Permissions
					</Button>
				</div>
			{/if}
			<Button onclick={openCreateRoleDialog}>
				<Plus class="mr-2 h-4 w-4" />
				Create Role
			</Button>
		</div>
	</div>

	<!-- Error/Success Messages -->
	{#if data.error}
		<div class="rounded-md bg-destructive/10 p-4 text-destructive">
			{data.error}
		</div>
	{/if}

	{#if actionResult?.error}
		<div class="rounded-md bg-destructive/10 p-4 text-destructive">
			{actionResult.error}
		</div>
	{/if}

	{#if actionResult?.success}
		<div
			class="rounded-md bg-green-100 p-4 text-green-800 dark:bg-green-900/20 dark:text-green-400"
		>
			{actionResult.message || 'Operation completed successfully'}
		</div>
	{/if}

	<!-- Tab Navigation and Search -->
	<PermissionTabs
		bind:activeTab
		bind:searchQuery
	/>

	<!-- Roles & Permissions Tab -->
	{#if activeTab === 'roles'}
		<RoleList
			{filteredRoles}
			bind:expandedRoles
			onEditRole={openEditRoleDialog}
		/>
	{/if}

	<!-- User Role Assignment Tab -->
	{#if activeTab === 'users'}
		<UserRoleList
			{filteredUsers}
			onManageRoles={openUserRoleDialog}
		/>
	{/if}
</div>

<!-- Create Role Dialog -->
<RoleCreateModal
	bind:open={showCreateRoleDialog}
	bind:roleForm
	{loading}
	onClose={closeDialogs}
	onSubmit={handleFormSubmit}
	onSuccess={handleFormResult}
/>

<!-- Edit Role Dialog -->
<RoleEditModal
	bind:open={showEditRoleDialog}
	{selectedRole}
	bind:roleForm
	{loading}
	onClose={closeDialogs}
	onSubmit={handleFormSubmit}
	onSuccess={handleFormResult}
/>

<!-- Manage Permissions Dialog -->
<PermissionAssignModal
	bind:open={showPermissionDialog}
	{selectedRole}
	bind:permissionsSelection
	{permissionsByResource}
	{loading}
	onClose={closeDialogs}
	onSubmit={handleFormSubmit}
	onSuccess={handlePermissionSuccess}
/>

<!-- User Role Assignment Dialog -->
<UserRoleAssignModal
	bind:open={showUserRoleDialog}
	{selectedUser}
	roles={data.roles}
	{loading}
	onClose={closeDialogs}
	onSubmit={handleFormSubmit}
	onSuccess={handleFormResult}
/>