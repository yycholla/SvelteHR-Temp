<script lang="ts">
	import { enhance } from '$app/forms';
	import { goto, invalidateAll } from '$app/navigation';
	import {
		Check,
		ChevronDown,
		ChevronRight,
		Edit,
		Plus,
		Search,
		Shield,
		Trash2,
		Users,
		X
	} from '@lucide/svelte';
	import * as Dialog from '$lib/components/ui/dialog';
	import * as Card from '$lib/components/ui/card';
	import * as Table from '$lib/components/ui/table';
	import Button from '$lib/components/ui/button/button.svelte';
	import Badge from '$lib/components/ui/badge/badge.svelte';
	import { isTestModeActive, permissionTestActions } from '$lib/stores/permission-test.svelte';
	import { Beaker } from '@lucide/svelte';

	const { data } = $props();

	// Debug logging
	console.log('[PERMISSIONS PAGE] Data:', data);
	console.log('[PERMISSIONS PAGE] Roles:', data.roles);
	console.log('[PERMISSIONS PAGE] Permissions:', data.permissions);
	console.log('[PERMISSIONS PAGE] Users:', data.users);

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
		data.permissions.reduce((acc: Record<string, any[]>, permission: any) => {
			const resource = permission.resource || 'general';
			if (!acc[resource]) {
				acc[resource] = [];
			}
			acc[resource].push(permission);
			return acc;
		}, {})
	);

	// Helper functions
	function toggleRoleExpansion(roleId: string) {
		if (expandedRoles.has(roleId)) {
			expandedRoles.delete(roleId);
		} else {
			expandedRoles.add(roleId);
		}
		expandedRoles = new Set(expandedRoles);
	}

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

	function togglePermissionSelection(permissionId: string) {
		if (permissionsSelection.has(permissionId)) {
			permissionsSelection.delete(permissionId);
		} else {
			permissionsSelection.add(permissionId);
		}
		permissionsSelection = new Set(permissionsSelection);
	}

	async function handleFormSubmit() {
		loading = true;
		actionResult = null;
	}

	async function handleFormResult() {
		loading = false;

		// Close the dialog and clear selected role to prevent null reference errors during reload
		showPermissionDialog = false;
		selectedRole = null;
		permissionsSelection.clear();

		// Reload data to reflect the changes
		await invalidateAll();
	}

	function hasPermission(role: any, permissionId: string): boolean {
		// Add null-safe access for role parameter
		return role?.permissions?.some((p: any) => p.id === permissionId) || false;
	}

	function userHasRole(user: any, roleId: string): boolean {
		return user.roles?.some((r: any) => r.id === roleId) || false;
	}

	function getPermissionBadgeVariant(action: string): 'default' | 'secondary' | 'destructive' {
		if (action.includes('delete') || action.includes('remove')) return 'destructive';
		if (action.includes('write') || action.includes('update')) return 'default';
		return 'secondary';
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

	<!-- Tab Navigation -->
	<div class="border-b">
		<div class="flex gap-4">
			<button
				onclick={() => (activeTab = 'roles')}
				class="flex items-center gap-2 border-b-2 px-4 py-2 text-sm font-medium transition-colors"
				class:border-primary={activeTab === 'roles'}
				class:text-primary={activeTab === 'roles'}
				class:border-transparent={activeTab !== 'roles'}
				class:text-muted-foreground={activeTab !== 'roles'}
			>
				<Shield class="h-4 w-4" />
				Roles & Permissions
			</button>
			<button
				onclick={() => (activeTab = 'users')}
				class="flex items-center gap-2 border-b-2 px-4 py-2 text-sm font-medium transition-colors"
				class:border-primary={activeTab === 'users'}
				class:text-primary={activeTab === 'users'}
				class:border-transparent={activeTab !== 'users'}
				class:text-muted-foreground={activeTab !== 'users'}
			>
				<Users class="h-4 w-4" />
				User Role Assignment
			</button>
		</div>
	</div>

	<!-- Search Bar -->
	<div class="relative">
		<Search class="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
		<input
			type="text"
			bind:value={searchQuery}
			placeholder={activeTab === 'roles'
				? 'Search roles by name or description...'
				: 'Search users by email or name...'}
			class="w-full rounded-md border border-input bg-background py-2 pl-10 pr-4 text-sm focus:border-primary focus:outline-none"
		/>
	</div>

	<!-- Roles & Permissions Tab -->
	{#if activeTab === 'roles'}
		<div class="space-y-4">
			{#each filteredRoles as role (role.id)}
				<Card.Card>
					<Card.CardHeader>
						<div class="flex items-center justify-between">
							<div class="flex items-center gap-3">
								<button
									onclick={() => toggleRoleExpansion(role.id)}
									class="rounded-md p-1 hover:bg-accent"
								>
									{#if expandedRoles.has(role.id)}
										<ChevronDown class="h-4 w-4" />
									{:else}
										<ChevronRight class="h-4 w-4" />
									{/if}
								</button>
								<div>
									<Card.CardTitle>{role.name}</Card.CardTitle>
									{#if role.description}
										<Card.CardDescription>{role.description}</Card.CardDescription>
									{/if}
								</div>
							</div>
							<div class="flex items-center gap-2">
								<Badge variant="secondary">
									{role.permissions?.length || 0} permissions
								</Badge>
								<Button
									variant="outline"
									size="sm"
									onclick={() => goto(`/dashboard/admin/permissions/${role.id}`)}
								>
									<Shield class="mr-2 h-3 w-3" />
									Manage Permissions
								</Button>
								<Button variant="outline" size="sm" onclick={() => openEditRoleDialog(role)}>
									<Edit class="h-3 w-3" />
								</Button>
								<form method="POST" action="?/deleteRole" use:enhance>
									<input type="hidden" name="id" value={role.id} />
									<Button
										type="submit"
										variant="outline"
										size="sm"
										onclick={() => {
											if (!confirm(`Delete role "${role.name}"? This action cannot be undone.`)) {
												event?.preventDefault();
											}
										}}
									>
										<Trash2 class="h-3 w-3 text-destructive" />
									</Button>
								</form>
							</div>
						</div>
					</Card.CardHeader>

					{#if expandedRoles.has(role.id)}
						<Card.CardContent>
							<div class="space-y-2">
								<h4 class="text-sm font-medium text-foreground">Assigned Permissions:</h4>
								{#if role.permissions && role.permissions.length > 0}
									<div class="flex flex-wrap gap-2">
										{#each role.permissions as permission (permission.id)}
											<Badge variant={getPermissionBadgeVariant(permission.action)}>
												{permission.resource}:{permission.action}
											</Badge>
										{/each}
									</div>
								{:else}
									<p class="text-sm text-muted-foreground">No permissions assigned</p>
								{/if}
							</div>
						</Card.CardContent>
					{/if}
				</Card.Card>
			{:else}
				<Card.Card>
					<Card.CardContent class="py-8">
						<p class="text-center text-muted-foreground">No roles found</p>
					</Card.CardContent>
				</Card.Card>
			{/each}
		</div>
	{/if}

	<!-- User Role Assignment Tab -->
	{#if activeTab === 'users'}
		<Card.Card>
			<Table.Table>
				<Table.TableHeader>
					<Table.TableRow>
						<Table.TableHead>Email</Table.TableHead>
						<Table.TableHead>Display Name</Table.TableHead>
						<Table.TableHead>Department</Table.TableHead>
						<Table.TableHead>Assigned Roles</Table.TableHead>
						<Table.TableHead>Status</Table.TableHead>
						<Table.TableHead class="text-right">Actions</Table.TableHead>
					</Table.TableRow>
				</Table.TableHeader>
				<Table.TableBody>
					{#each filteredUsers as user (user.id)}
						<Table.TableRow>
							<Table.TableCell class="font-medium">{user.email}</Table.TableCell>
							<Table.TableCell>{user.displayName || '—'}</Table.TableCell>
							<Table.TableCell>{user.department?.name || '—'}</Table.TableCell>
							<Table.TableCell>
								<div class="flex flex-wrap gap-1">
									{#if user.roles && user.roles.length > 0}
										{#each user.roles as role}
											<Badge variant="secondary">{role.name}</Badge>
										{/each}
									{:else}
										<span class="text-sm text-muted-foreground">No roles</span>
									{/if}
								</div>
							</Table.TableCell>
							<Table.TableCell>
								{#if user.isActive}
									<Badge
										variant="default"
										class="bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400"
									>
										Active
									</Badge>
								{:else}
									<Badge variant="secondary">Inactive</Badge>
								{/if}
							</Table.TableCell>
							<Table.TableCell class="text-right">
								<Button variant="outline" size="sm" onclick={() => openUserRoleDialog(user)}>
									<Shield class="mr-2 h-3 w-3" />
									Manage Roles
								</Button>
							</Table.TableCell>
						</Table.TableRow>
					{:else}
						<Table.TableRow>
							<Table.TableCell colspan={6} class="text-center text-muted-foreground">
								No users found
							</Table.TableCell>
						</Table.TableRow>
					{/each}
				</Table.TableBody>
			</Table.Table>
		</Card.Card>
	{/if}
</div>

<!-- Create Role Dialog -->
<Dialog.Root bind:open={showCreateRoleDialog}>
	<Dialog.Content>
		<Dialog.Header>
			<Dialog.Title>Create New Role</Dialog.Title>
			<Dialog.Description>
				Create a new role and assign permissions to control access.
			</Dialog.Description>
		</Dialog.Header>

		<form
			id="create-role-form"
			method="POST"
			action="?/createRole"
			use:enhance={() => {
				handleFormSubmit();
				return async ({ result, update }) => {
					handleFormResult();
					if (result.type === 'success') {
						closeDialogs();
					}
					await update();
				};
			}}
			class="space-y-4"
		>
			<div>
				<label for="role-name" class="block text-sm font-medium text-foreground">Role Name *</label>
				<input
					id="role-name"
					name="name"
					type="text"
					bind:value={roleForm.name}
					required
					class="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none"
					placeholder="e.g., HR Manager, Team Lead"
				/>
			</div>

			<div>
				<label for="role-description" class="block text-sm font-medium text-foreground"
					>Description</label
				>
				<textarea
					id="role-description"
					name="description"
					bind:value={roleForm.description}
					rows="3"
					class="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none"
					placeholder="Describe the role's responsibilities..."
				></textarea>
			</div>
		</form>

		<Dialog.Footer>
			<Button type="button" variant="outline" onclick={closeDialogs}>Cancel</Button>
			<Button type="submit" form="create-role-form" disabled={loading}>
				{loading ? 'Creating...' : 'Create Role'}
			</Button>
		</Dialog.Footer>
	</Dialog.Content>
</Dialog.Root>

<!-- Edit Role Dialog -->
<Dialog.Root bind:open={showEditRoleDialog}>
	<Dialog.Content>
		<Dialog.Header>
			<Dialog.Title>Edit Role</Dialog.Title>
			<Dialog.Description>Update role name and description.</Dialog.Description>
		</Dialog.Header>

		<form
			id="edit-role-form"
			method="POST"
			action="?/updateRole"
			use:enhance={() => {
				handleFormSubmit();
				return async ({ result, update }) => {
					handleFormResult();
					if (result.type === 'success') {
						closeDialogs();
					}
					await update();
				};
			}}
			class="space-y-4"
		>
			<input type="hidden" name="id" value={selectedRole?.id} />

			<div>
				<label for="edit-role-name" class="block text-sm font-medium text-foreground"
					>Role Name *</label
				>
				<input
					id="edit-role-name"
					name="name"
					type="text"
					bind:value={roleForm.name}
					required
					class="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none"
				/>
			</div>

			<div>
				<label for="edit-role-description" class="block text-sm font-medium text-foreground"
					>Description</label
				>
				<textarea
					id="edit-role-description"
					name="description"
					bind:value={roleForm.description}
					rows="3"
					class="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none"
				></textarea>
			</div>
		</form>

		<Dialog.Footer>
			<Button type="button" variant="outline" onclick={closeDialogs}>Cancel</Button>
			<Button type="submit" form="edit-role-form" disabled={loading}>
				{loading ? 'Updating...' : 'Update Role'}
			</Button>
		</Dialog.Footer>
	</Dialog.Content>
</Dialog.Root>

<!-- Manage Permissions Dialog -->
<Dialog.Root bind:open={showPermissionDialog}>
	<Dialog.Content class="max-w-2xl max-h-[80vh] overflow-y-auto">
		<Dialog.Header>
			<Dialog.Title>Manage Permissions for {selectedRole?.name}</Dialog.Title>
			<Dialog.Description>
				Select permissions to assign to this role. Changes are saved when you click Apply.
			</Dialog.Description>
		</Dialog.Header>

		<form
			id="permissions-form"
			method="POST"
			action="?/bulkAssignPermissions"
			use:enhance={() => {
				handleFormSubmit();
				return async ({ result, update }) => {
					handleFormResult();
					if (result.type === 'success') {
						closeDialogs();
					}
					await update();
				};
			}}
			class="space-y-4"
		>
			<input type="hidden" name="roleId" value={selectedRole?.id} />
			<input
				type="hidden"
				name="permissionIds"
				value={JSON.stringify(Array.from(permissionsSelection))}
			/>

			<div class="space-y-4">
				{#each Object.entries(permissionsByResource) as [resource, permissions]}
					<div class="rounded-md border p-3">
						<h4 class="mb-2 font-medium capitalize text-foreground">{resource}</h4>
						<div class="space-y-2">
							{#each permissions as permission}
								<label class="flex items-center gap-2 cursor-pointer hover:bg-accent rounded p-2">
									<input
										type="checkbox"
										checked={permissionsSelection.has(permission.id)}
										onchange={() => togglePermissionSelection(permission.id)}
										class="h-4 w-4 rounded border-gray-300"
									/>
									<div class="flex-1">
										<span class="text-sm font-medium text-foreground">
											{permission.resource}:{permission.action}
										</span>
										{#if permission.description}
											<p class="text-xs text-muted-foreground">{permission.description}</p>
										{/if}
									</div>
									{#if auth.hasPermission(selectedRole, permission.id)}
										<Badge variant="secondary" class="text-xs">Current</Badge>
									{/if}
								</label>
							{/each}
						</div>
					</div>
				{/each}
			</div>
		</form>

		<div class="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end mt-4">
			<button
				type="button"
				class="inline-flex items-center justify-center h-9 px-4 py-2 rounded-md border border-input bg-background text-foreground text-sm font-medium hover:bg-accent hover:text-accent-foreground transition-colors shadow-xs"
				onclick={() => {
					showPermissionDialog = false;
					selectedRole = null;
					permissionsSelection.clear();
				}}
			>
				Cancel
			</button>
			<button
				type="submit"
				form="permissions-form"
				disabled={loading}
				class="inline-flex items-center justify-center h-9 px-4 py-2 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50 shadow-xs"
			>
				{loading ? 'Applying...' : 'Apply Changes'}
			</button>
		</div>
	</Dialog.Content>
</Dialog.Root>

<!-- User Role Assignment Dialog -->
<Dialog.Root bind:open={showUserRoleDialog}>
	<Dialog.Content>
		<Dialog.Header>
			<Dialog.Title>Manage Roles for {selectedUser?.email}</Dialog.Title>
			<Dialog.Description>Assign or remove roles for this user.</Dialog.Description>
		</Dialog.Header>

		<div class="space-y-4">
			<div class="rounded-md border">
				<div class="p-4">
					<h4 class="mb-3 text-sm font-medium text-foreground">Available Roles</h4>
					<div class="space-y-2">
						{#each data.roles as role}
							<div class="flex items-center justify-between rounded-md border p-3">
								<div>
									<p class="font-medium text-foreground">{role.name}</p>
									{#if role.description}
										<p class="text-xs text-muted-foreground">{role.description}</p>
									{/if}
								</div>
								{#if userHasRole(selectedUser, role.id)}
									<form
										method="POST"
										action="?/removeRoleFromUser"
										use:enhance={() => {
											handleFormSubmit();
											return async ({ result, update }) => {
												handleFormResult();
												await update();
											};
										}}
									>
										<input type="hidden" name="userId" value={selectedUser?.id} />
										<input type="hidden" name="roleId" value={role.id} />
										<Button type="submit" variant="outline" size="sm" disabled={loading}>
											<X class="mr-1 h-3 w-3" />
											Remove
										</Button>
									</form>
								{:else}
									<form
										method="POST"
										action="?/assignRoleToUser"
										use:enhance={() => {
											handleFormSubmit();
											return async ({ result, update }) => {
												handleFormResult();
												await update();
											};
										}}
									>
										<input type="hidden" name="userId" value={selectedUser?.id} />
										<input type="hidden" name="roleId" value={role.id} />
										<Button type="submit" variant="outline" size="sm" disabled={loading}>
											<Plus class="mr-1 h-3 w-3" />
											Assign
										</Button>
									</form>
								{/if}
							</div>
						{/each}
					</div>
				</div>
			</div>
		</div>

		<Dialog.Footer>
			<Button type="button" variant="outline" onclick={closeDialogs}>Close</Button>
		</Dialog.Footer>
	</Dialog.Content>
</Dialog.Root>
