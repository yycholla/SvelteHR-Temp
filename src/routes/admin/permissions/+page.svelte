<script lang="ts">
	import { logger } from '$lib/utils/logger';
	import { invalidateAll } from '$app/navigation';
	import { Beaker, Plus, Search, Shield, Users, RefreshCw } from '@lucide/svelte';
	import Button from '$lib/components/ui/button/button.svelte';
	import { isTestModeActive, permissionTestActions } from '$lib/stores/permission-test.svelte';
	import type { Permission } from '$lib/types';

	// Import decomposed components
	import RoleList from './components/RoleList.svelte';
	import UserRoleList from './components/UserRoleList.svelte';
	import RoleCreateModal from './components/RoleCreateModal.svelte';
	import RoleEditModal from './components/RoleEditModal.svelte';
	import PermissionAssignModal from './components/PermissionAssignModal.svelte';
	import UserRoleAssignModal from './components/UserRoleAssignModal.svelte';

	const { data } = $props();

	// State management
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

	// Group permissions by resource
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
		await invalidateAll();
	}

	async function handlePermissionSuccess() {
		showPermissionDialog = false;
		selectedRole = null;
		permissionsSelection.clear();
		await handleFormResult();
	}
</script>

<div class="flex flex-col h-full bg-background overflow-hidden">
	<!-- Toolbar & Header -->
	<header class="flex-shrink-0 flex items-center justify-between h-14 px-4 border-b bg-background z-20">
		<div class="flex items-center gap-4">
			<h1 class="text-sm font-semibold tracking-tight">Permissions</h1>
			<div class="h-4 w-px bg-border"></div>
			
			<!-- Tabs -->
			<div class="flex items-center gap-1 bg-muted/50 p-1 rounded-md">
				<button
					onclick={() => (activeTab = 'roles')}
					class="flex items-center gap-2 px-3 py-1 text-xs font-medium rounded-sm transition-all {activeTab === 'roles' ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'}"
				>
					<Shield class="h-3.5 w-3.5" />
					Roles
				</button>
				<button
					onclick={() => (activeTab = 'users')}
					class="flex items-center gap-2 px-3 py-1 text-xs font-medium rounded-sm transition-all {activeTab === 'users' ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'}"
				>
					<Users class="h-3.5 w-3.5" />
					Assignments
				</button>
			</div>
		</div>

		<div class="flex items-center gap-2">
			<!-- Search -->
			<div class="relative w-64">
				<Search class="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
				<input
					type="text"
					bind:value={searchQuery}
					placeholder={activeTab === 'roles' ? 'Search roles...' : 'Search users...'}
					class="w-full h-8 pl-8 pr-3 rounded-md border border-input bg-background text-xs placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
				/>
			</div>

			<!-- Actions -->
			{#if activeTab === 'roles'}
				{#if !isTestModeActive()}
					<div class="flex items-center gap-2">
						<select
							bind:value={selectedTestRoleId}
							class="h-8 rounded-md border border-input bg-background px-2 text-xs focus:outline-none focus:ring-1 focus:ring-ring"
						>
							<option value="">Test Permissions...</option>
							{#each data.roles as role}
								<option value={role.id}>{role.name}</option>
							{/each}
						</select>
						{#if selectedTestRoleId}
							<Button variant="outline" size="sm" class="h-8 px-2" onclick={startTestMode}>
								<Beaker class="h-3.5 w-3.5" />
							</Button>
						{/if}
					</div>
				{/if}
				<Button size="sm" class="h-8" onclick={openCreateRoleDialog}>
					<Plus class="mr-2 h-3.5 w-3.5" />
					Create Role
				</Button>
			{/if}
		</div>
	</header>

	<!-- Content -->
	<div class="flex-1 overflow-auto bg-muted/5">
		{#if actionResult?.error || data.error}
			<div class="m-4 rounded-md bg-destructive/10 p-3 text-sm text-destructive flex items-center gap-2">
				{actionResult?.error || data.error}
			</div>
		{/if}

		{#if activeTab === 'roles'}
			<RoleList
				{filteredRoles}
				bind:expandedRoles
				onEditRole={openEditRoleDialog}
			/>
		{/if}

		{#if activeTab === 'users'}
			<UserRoleList
				{filteredUsers}
				onManageRoles={openUserRoleDialog}
			/>
		{/if}
	</div>
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
