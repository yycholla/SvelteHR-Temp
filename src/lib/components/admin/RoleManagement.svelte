<script lang="ts">
	import { onMount } from 'svelte';
	import { isAdmin, permissionsService, userPermissions } from '$lib/services/permissionsService';
	import { currentUser } from '$lib/services/auth';
	import { userService, users } from '$lib/services/userService';
	import Button from '../base/Button.svelte';
	import Card from '../base/Card.svelte';
	import Badge from '../base/Badge.svelte';
	import Input from '../base/Input.svelte';
	import Select from '../base/Select.svelte';
	import DataTable from '../tables/DataTable.svelte';
	import type { Column } from '../tables/DataTable.svelte';
	import type { Permission, User } from '$lib/types';

	// Component state
	let selectedTab: 'users' | 'roles' | 'permissions' = 'users';
	const selectedUser: User | null = null;
	const selectedRole: string | null = null;
	let showUserRoleModal = false;
	let searchQuery = '';
	let filterRole = '';

	// Modal state
	let modalUser: User | null = null;
	let modalRoles: string[] = [];

	// Available roles
	const availableRoles = [
		{ value: 'admin', label: 'Admin', level: 100, description: 'Full system access' },
		{
			value: 'hr_manager',
			label: 'HR Manager',
			level: 80,
			description: 'HR operations and user management'
		},
		{ value: 'manager', label: 'Manager', level: 60, description: 'Team management' },
		{ value: 'employee', label: 'Employee', level: 20, description: 'Standard employee access' }
	];

	// Role definitions for display
	const roleDefinitions = {
		admin: {
			name: 'Administrator',
			color: 'red',
			permissions: [
				'Full system access',
				'User management',
				'Department management',
				'System configuration',
				'Audit logs',
				'Reports generation'
			]
		},
		hr_manager: {
			name: 'HR Manager',
			color: 'blue',
			permissions: [
				'User management',
				'Onboarding workflows',
				'Department oversight',
				'Compensation management',
				'HR reports'
			]
		},
		manager: {
			name: 'Manager',
			color: 'green',
			permissions: [
				'Team member management',
				'Team onboarding',
				'Department visibility',
				'Team reports'
			]
		},
		employee: {
			name: 'Employee',
			color: 'gray',
			permissions: ['Self-service profile', 'Own onboarding tasks', 'Basic department info']
		}
	};

	// Table columns for users
	const userColumns: Column[] = [
		{
			key: 'display_name',
			label: 'Name',
			sortable: true,
			type: 'custom'
		},
		{
			key: 'email',
			label: 'Email',
			sortable: true,
			type: 'text'
		},
		{
			key: 'roles',
			label: 'Roles',
			sortable: false,
			type: 'custom'
		},
		{
			key: 'is_active',
			label: 'Status',
			sortable: true,
			type: 'badge',
			badgeVariant: (value) => (value ? 'success' : 'secondary')
		},
		{
			key: 'actions',
			label: 'Actions',
			sortable: false,
			type: 'custom',
			align: 'center',
			width: '120px'
		}
	];

	// Filtered users based on search and role filter
	$: filteredUsers = $users.filter((user) => {
		const matchesSearch =
			!searchQuery ||
			user.display_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
			user.email.toLowerCase().includes(searchQuery.toLowerCase());

		const matchesRole =
			!filterRole ||
			user.role_assignments?.some((ra) => ra.role.name.toLowerCase() === filterRole.toLowerCase());

		return matchesSearch && matchesRole;
	});

	function getRoleBadgeVariant(
		roleName: string
	): 'default' | 'secondary' | 'success' | 'warning' | 'danger' {
		const role = roleDefinitions[roleName.toLowerCase()];
		if (!role) return 'default';

		switch (role.color) {
			case 'red':
				return 'danger';
			case 'blue':
				return 'secondary';
			case 'green':
				return 'success';
			default:
				return 'default';
		}
	}

	function getUserRoles(user: User): string[] {
		return user.role_assignments?.map((ra) => ra.role.name) || [];
	}

	function getHighestRole(user: User): string {
		const roles = getUserRoles(user);
		const rolesByLevel = availableRoles
			.filter((r) => roles.includes(r.value))
			.sort((a, b) => b.level - a.level);
		return rolesByLevel[0]?.label || 'No Role';
	}

	function openUserRoleModal(user: User) {
		modalUser = user;
		modalRoles = getUserRoles(user);
		showUserRoleModal = true;
	}

	function closeUserRoleModal() {
		showUserRoleModal = false;
		modalUser = null;
		modalRoles = [];
	}

	async function saveUserRoles() {
		if (!modalUser) return;

		try {
			// TODO: Implement role assignment API call
			console.log('Saving roles for user:', modalUser.id, modalRoles);

			// For now, just close the modal
			closeUserRoleModal();

			// Refresh user data
			await userService.loadUsers({ reset: true });
		} catch (error) {
			console.error('Failed to save user roles:', error);
		}
	}

	function toggleRole(roleName: string) {
		if (modalRoles.includes(roleName)) {
			modalRoles = modalRoles.filter((r) => r !== roleName);
		} else {
			modalRoles = [...modalRoles, roleName];
		}
	}

	function getPermissionsList(roleName: string): string[] {
		return roleDefinitions[roleName.toLowerCase()]?.permissions || [];
	}

	onMount(() => {
		// Load users if not already loaded
		if ($users.length === 0) {
			userService.loadUsers({ reset: true });
		}
	});
</script>

{#if $isAdmin}
	<div class="role-management">
		<!-- Header -->
		<div class="management-header">
			<div class="header-content">
				<h1 class="text-2xl font-bold text-gray-900">Role & Permission Management</h1>
				<p class="mt-1 text-sm text-gray-600">
					Manage user roles and access permissions across the system
				</p>
			</div>
		</div>

		<!-- Tabs -->
		<div class="management-tabs">
			<div class="tab-list">
				<button
					class="tab-button"
					class:active={selectedTab === 'users'}
					onclick={() => (selectedTab = 'users')}
				>
					<i class="icon-users h-4 w-4"></i>
					User Roles
				</button>
				<button
					class="tab-button"
					class:active={selectedTab === 'roles'}
					onclick={() => (selectedTab = 'roles')}
				>
					<i class="icon-shield h-4 w-4"></i>
					Role Definitions
				</button>
				<button
					class="tab-button"
					class:active={selectedTab === 'permissions'}
					onclick={() => (selectedTab = 'permissions')}
				>
					<i class="icon-lock h-4 w-4"></i>
					Permission Matrix
				</button>
			</div>
		</div>

		<!-- Tab Content -->
		<div class="tab-content">
			{#if selectedTab === 'users'}
				<!-- Users Tab -->
				<Card padding="md" class="users-section">
					<!-- Filters -->
					<div class="filters-section">
						<div class="filter-row">
							<Input
								type="search"
								placeholder="Search users..."
								leftIcon="search"
								bind:value={searchQuery}
								class="search-input"
							/>

							<Select
								options={[
									{ value: '', label: 'All Roles' },
									...availableRoles.map((role) => ({ value: role.value, label: role.label }))
								]}
								bind:value={filterRole}
								placeholder="Filter by role"
								class="role-filter"
							/>
						</div>
					</div>

					<!-- Users Table -->
					<DataTable
						data={filteredUsers}
						columns={userColumns}
						loading={false}
						selectable={false}
						hoverable={true}
						emptyMessage="No users found"
					>
						<svelte:fragment slot="cell" let:column let:value let:row>
							{#if column.key === 'display_name'}
								<div class="user-info">
									<div class="user-name">{row.display_name}</div>
									<div class="user-title">{row.job_title || 'No title'}</div>
								</div>
							{:else if column.key === 'roles'}
								<div class="user-roles">
									{#each getUserRoles(row) as roleName}
										<Badge variant={getRoleBadgeVariant(roleName)} size="sm">
											{roleDefinitions[roleName.toLowerCase()]?.name || roleName}
										</Badge>
									{:else}
										<span class="text-gray-500 text-sm">No roles assigned</span>
									{/each}
								</div>
							{:else if column.key === 'is_active'}
								<Badge variant={row.is_active ? 'success' : 'secondary'} size="sm">
									{row.is_active ? 'Active' : 'Inactive'}
								</Badge>
							{:else if column.key === 'actions'}
								<Button
									variant="secondary"
									size="xs"
									leftIcon="edit"
									onclick={() => openUserRoleModal(row)}
								>
									Edit Roles
								</Button>
							{/if}
						</svelte:fragment>
					</DataTable>
				</Card>
			{:else if selectedTab === 'roles'}
				<!-- Roles Tab -->
				<div class="roles-grid">
					{#each availableRoles as role}
						<Card padding="md" class="role-card">
							<div class="role-header">
								<div class="role-info">
									<h3 class="role-name">{role.label}</h3>
									<p class="role-description">{role.description}</p>
								</div>
								<Badge variant={getRoleBadgeVariant(role.value)} size="sm">
									Level {role.level}
								</Badge>
							</div>

							<div class="role-permissions">
								<h4 class="permissions-title">Key Permissions:</h4>
								<ul class="permissions-list">
									{#each getPermissionsList(role.value) as permission}
										<li class="permission-item">
											<i class="icon-check h-4 w-4 text-green-600"></i>
											{permission}
										</li>
									{/each}
								</ul>
							</div>

							<div class="role-stats">
								<div class="stat-item">
									<span class="stat-label">Users with this role:</span>
									<span class="stat-value">
										{$users.filter((u) => getUserRoles(u).includes(role.value)).length}
									</span>
								</div>
							</div>
						</Card>
					{/each}
				</div>
			{:else if selectedTab === 'permissions'}
				<!-- Permissions Matrix Tab -->
				<Card padding="md" class="permissions-matrix">
					<div class="matrix-header">
						<h3 class="text-lg font-semibold text-gray-900">Permission Matrix</h3>
						<p class="text-sm text-gray-600">View all permissions by role and resource</p>
					</div>

					<div class="matrix-table">
						<table class="permissions-table">
							<thead>
								<tr>
									<th class="resource-header">Resource / Action</th>
									{#each availableRoles as role}
										<th class="role-header">
											<div class="role-header-content">
												<span>{role.label}</span>
												<Badge variant={getRoleBadgeVariant(role.value)} size="xs">
													L{role.level}
												</Badge>
											</div>
										</th>
									{/each}
								</tr>
							</thead>
							<tbody>
								{#each ['users', 'departments', 'onboarding', 'compensation', 'reports'] as resource}
									{#each ['create', 'read', 'update', 'delete'] as action}
										<tr class="matrix-row">
											<td class="resource-cell">
												<div class="resource-info">
													<span class="resource-name">{resource}</span>
													<span class="action-name">:{action}</span>
												</div>
											</td>
											{#each availableRoles as role}
												<td class="permission-cell">
													{#if permissionsService.hasPermission(resource, action)}
														<i class="icon-check h-4 w-4 text-green-600"></i>
													{:else}
														<i class="icon-x h-4 w-4 text-gray-300"></i>
													{/if}
												</td>
											{/each}
										</tr>
									{/each}
								{/each}
							</tbody>
						</table>
					</div>
				</Card>
			{/if}
		</div>
	</div>

	<!-- User Role Assignment Modal -->
	{#if showUserRoleModal && modalUser}
		<div class="modal-overlay">
			<div class="modal-content">
				<div class="modal-header">
					<h3 class="modal-title">Edit Roles for {modalUser.display_name}</h3>
					<button class="modal-close" onclick={closeUserRoleModal} aria-label="Close modal">
						<i class="icon-x h-5 w-5"></i>
					</button>
				</div>

				<div class="modal-body">
					<div class="user-info-section">
						<div class="user-details">
							<span class="user-email">{modalUser.email}</span>
							<span class="user-dept"
								>{modalUser.job_information?.department?.name || 'No department'}</span
							>
						</div>
					</div>

					<div class="roles-section">
						<h4 class="section-title">Assign Roles</h4>
						<div class="roles-list">
							{#each availableRoles as role}
								<label class="role-checkbox">
									<input
										type="checkbox"
										bind:group={modalRoles}
										value={role.value}
										class="checkbox"
									/>
									<div class="role-option">
										<div class="role-main">
											<span class="role-label">{role.label}</span>
											<Badge variant={getRoleBadgeVariant(role.value)} size="xs">
												Level {role.level}
											</Badge>
										</div>
										<p class="role-desc">{role.description}</p>
									</div>
								</label>
							{/each}
						</div>
					</div>
				</div>

				<div class="modal-footer">
					<Button variant="secondary" onclick={closeUserRoleModal}>Cancel</Button>
					<Button variant="primary" leftIcon="save" onclick={saveUserRoles}>Save Roles</Button>
				</div>
			</div>
		</div>
	{/if}
{:else}
	<!-- Access Denied -->
	<Card padding="lg" class="access-denied">
		<div class="denied-content">
			<i class="icon-shield-off mx-auto h-12 w-12 text-red-500"></i>
			<h3 class="mt-4 text-lg font-medium text-gray-900">Access Denied</h3>
			<p class="mt-2 text-sm text-gray-600">You don't have permission to access role management.</p>
		</div>
	</Card>
{/if}
