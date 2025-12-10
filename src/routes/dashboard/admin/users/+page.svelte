<script lang="ts">
	import { page } from '$app/stores';
	import { goto } from '$app/navigation';
	import { Edit, Filter, Plus, Search, Trash2, UserCheck, UserX } from '@lucide/svelte';
	import { createUrqlClient } from '$lib/graphql/client';

	const { data } = $props();

	let showCreateModal = $state(false);
	let showEditModal = $state(false);
	let selectedUser = $state<any>(null);
	let searchQuery = $state('');
	let loading = $state(false);
	let errorMessage = $state('');

	// Form state for create/edit
	let formData = $state({
		email: '',
		displayName: '',
		password: '',
		roleId: '',
		departmentId: '',
		isActive: true
	});

	// Filter state
	let filters = $state({
		role: data.filters.role,
		department: data.filters.department,
		status: data.filters.status
	});

	// Filtered users based on search query
	const filteredUsers = $derived(
		data.users.filter((user: any) => {
			if (!searchQuery) return true;
			const query = searchQuery.toLowerCase();
			return (
				user.email?.toLowerCase().includes(query) ||
				user.displayName?.toLowerCase().includes(query) ||
				user.department?.name?.toLowerCase().includes(query)
			);
		})
	);

	function openCreateModal() {
		formData = {
			email: '',
			displayName: '',
			password: '',
			roleId: String(data.roles[0]?.id || ''),
			departmentId: '',
			isActive: true
		};
		showCreateModal = true;
		errorMessage = '';
	}

	function openEditModal(user: any) {
		selectedUser = user;
		formData = {
			email: user.email,
			displayName: user.displayName || '',
			password: '',
			roleId: user.role || '',
			departmentId: user.department?.id || '',
			isActive: user.isActive
		};
		showEditModal = true;
		errorMessage = '';
	}

	function closeModals() {
		showCreateModal = false;
		showEditModal = false;
		selectedUser = null;
		errorMessage = '';
	}

	async function handleCreateUser() {
		if (!formData.email || !formData.password) {
			errorMessage = 'Email and password are required';
			return;
		}

		loading = true;
		errorMessage = '';

		try {
			const client = createUrqlClient();
			const mutation = `
				mutation CreateUser($input: CreateUserInput!) {
					createUser(input: $input) {
						user {
							id
							email
							displayName
						}
					}
				}
			`;

			await client.mutation(mutation, {
				input: {
					user: {
						email: formData.email,
						displayName: formData.displayName,
						role: 'employee', // Default role
						isActive: formData.isActive,
						departmentId: formData.departmentId || null
					}
				}
			});

			// Assign role if selected
			if (formData.roleId) {
				const roleAssignMutation = `
					mutation AssignRole($input: CreateUserRoleInput!) {
						createUserRole(input: $input) {
							userRole {
								id
							}
						}
					}
				`;

				await client.mutation(roleAssignMutation, {
					input: {
						userRole: {
							userId: '...', // Need user ID from previous mutation
							roleId: formData.roleId
						}
					}
				});
			}

			closeModals();
			goto($page.url.pathname, { invalidateAll: true });
		} catch (error) {
			console.error('Create user error:', error);
			errorMessage = 'Failed to create user';
		} finally {
			loading = false;
		}
	}

	async function handleUpdateUser() {
		if (!selectedUser || !formData.email) {
			errorMessage = 'Invalid user data';
			return;
		}

		loading = true;
		errorMessage = '';

		try {
			const client = createUrqlClient();
			const mutation = `
				mutation UpdateUser($input: UpdateUserInput!) {
					updateUser(input: $input) {
						user {
							id
							email
							displayName
							isActive
						}
					}
				}
			`;

			await client.mutation(mutation, {
				input: {
					id: selectedUser.id,
					patch: {
						email: formData.email,
						displayName: formData.displayName,
						isActive: formData.isActive,
						departmentId: formData.departmentId || null
					}
				}
			});

			closeModals();
			goto($page.url.pathname, { invalidateAll: true });
		} catch (error) {
			console.error('Update user error:', error);
			errorMessage = 'Failed to update user';
		} finally {
			loading = false;
		}
	}

	async function handleDeleteUser(userId: string) {
		if (!confirm('Are you sure you want to delete this user?')) {
			return;
		}

		loading = true;
		try {
			const client = createUrqlClient();
			const mutation = `
				mutation DeleteUser($input: DeleteUserInput!) {
					deleteUser(input: $input) {
						deletedUserId
					}
				}
			`;

			await client.mutation(mutation, {
				input: {
					id: userId
				}
			});

			goto($page.url.pathname, { invalidateAll: true });
		} catch (error) {
			console.error('Delete user error:', error);
			errorMessage = 'Failed to delete user';
		} finally {
			loading = false;
		}
	}

	async function toggleUserStatus(user: any) {
		loading = true;
		try {
			const client = createUrqlClient();
			const mutation = `
				mutation UpdateUserStatus($input: UpdateUserInput!) {
					updateUser(input: $input) {
						user {
							id
							isActive
						}
					}
				}
			`;

			await client.mutation(mutation, {
				input: {
					id: user.id,
					patch: {
						isActive: !user.isActive
					}
				}
			});

			goto($page.url.pathname, { invalidateAll: true });
		} catch (error) {
			console.error('Toggle status error:', error);
			errorMessage = 'Failed to update user status';
		} finally {
			loading = false;
		}
	}

	function applyFilters() {
		const params = new URLSearchParams($page.url.searchParams);
		if (filters.role) params.set('role', filters.role);
		else params.delete('role');
		if (filters.department) params.set('department', filters.department);
		else params.delete('department');
		if (filters.status) params.set('status', filters.status);
		else params.delete('status');
		goto(`${$page.url.pathname}?${params.toString()}`);
	}

	function clearFilters() {
		filters = { role: '', department: '', status: '' };
		goto($page.url.pathname);
	}
</script>

<div class="space-y-6 p-6">
	<!-- Header -->
	<div class="flex items-center justify-between">
		<div>
			<h1 class="text-3xl font-bold">User Management</h1>
			<p class="text-muted-foreground">Manage all system users and their roles</p>
		</div>
		<button
			onclick={openCreateModal}
			class="flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
			data-testid="admin-add-user-button"
		>
			<Plus class="h-4 w-4" />
			Create User
		</button>
	</div>

	<!-- Error message -->
	{#if data.error}
		<div class="rounded-md bg-destructive/10 p-4 text-destructive">
			{data.error}
		</div>
	{/if}

	{#if errorMessage}
		<div class="rounded-md bg-destructive/10 p-4 text-destructive">
			{errorMessage}
		</div>
	{/if}

	<!-- Search and Filters -->
	<div class="flex flex-col gap-4 sm:flex-row">
		<!-- Search -->
		<div class="relative flex-1">
			<Search class="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
			<input
				type="text"
				bind:value={searchQuery}
				placeholder="Search users by email, name, or department..."
				class="w-full rounded-md border border-input bg-background py-2 pl-10 pr-4 text-sm focus:border-primary focus:outline-none"
			/>
		</div>

		<!-- Filters -->
		<div class="flex gap-2">
			<select
				bind:value={filters.role}
				onchange={applyFilters}
				class="rounded-md border border-input bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none"
			>
				<option value="">All Roles</option>
				{#each data.roles as role}
					<option value={role.name}>{role.name}</option>
				{/each}
			</select>

			<select
				bind:value={filters.department}
				onchange={applyFilters}
				class="rounded-md border border-input bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none"
			>
				<option value="">All Departments</option>
				{#each data.departments as dept}
					<option value={dept.id}>{dept.name}</option>
				{/each}
			</select>

			<select
				bind:value={filters.status}
				onchange={applyFilters}
				class="rounded-md border border-input bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none"
			>
				<option value="">All Status</option>
				<option value="active">Active</option>
				<option value="inactive">Inactive</option>
			</select>

			{#if filters.role || filters.department || filters.status}
				<button
					onclick={clearFilters}
					class="rounded-md border border-input bg-background px-3 py-2 text-sm hover:bg-accent"
				>
					Clear
				</button>
			{/if}
		</div>
	</div>

	<!-- Users Table -->
	<div class="overflow-x-auto rounded-md border">
		<table class="w-full text-sm" data-testid="admin-users-table">
			<thead class="border-b bg-muted/50">
				<tr>
					<th class="px-4 py-3 text-left font-medium">Email</th>
					<th class="px-4 py-3 text-left font-medium">Display Name</th>
					<th class="px-4 py-3 text-left font-medium">Role</th>
					<th class="px-4 py-3 text-left font-medium">Department</th>
					<th class="px-4 py-3 text-left font-medium">Status</th>
					<th class="px-4 py-3 text-right font-medium">Actions</th>
				</tr>
			</thead>
			<tbody>
				{#each filteredUsers as user (user.id)}
					<tr class="border-b hover:bg-muted/50">
						<td class="px-4 py-3">{user.email}</td>
						<td class="px-4 py-3">{user.displayName || '—'}</td>
						<td class="px-4 py-3">
							{user.role || 'employee'}
						</td>
						<td class="px-4 py-3">{user.department?.name || '—'}</td>
						<td class="px-4 py-3">
							<button
								onclick={() => toggleUserStatus(user)}
								disabled={loading}
								class="flex items-center gap-1 rounded-full px-2 py-1 text-xs font-medium"
								class:bg-green-100={user.isActive}
								class:text-green-700={user.isActive}
								class:bg-red-100={!user.isActive}
								class:text-red-700={!user.isActive}
							>
								{#if user.isActive}
									<UserCheck class="h-3 w-3" />
									Active
								{:else}
									<UserX class="h-3 w-3" />
									Inactive
								{/if}
							</button>
						</td>
						<td class="px-4 py-3 text-right">
							<div class="flex justify-end gap-2">
								<button
									onclick={() => openEditModal(user)}
									disabled={loading}
									class="rounded-md p-2 hover:bg-accent"
									title="Edit user"
									data-testid="admin-edit-user-button"
								>
									<Edit class="h-4 w-4" />
								</button>
								<button
									onclick={() => handleDeleteUser(user.id)}
									disabled={loading}
									class="rounded-md p-2 text-destructive hover:bg-destructive/10"
									title="Delete user"
									data-testid="admin-delete-user-button"
								>
									<Trash2 class="h-4 w-4" />
								</button>
							</div>
						</td>
					</tr>
				{:else}
					<tr>
						<td colspan="6" class="px-4 py-8 text-center text-muted-foreground">
							No users found
						</td>
					</tr>
				{/each}
			</tbody>
		</table>
	</div>

	<!-- Pagination -->
	{#if data.pagination.totalPages > 1}
		<div class="flex items-center justify-between">
			<p class="text-sm text-muted-foreground">
				Page {data.pagination.page} of {data.pagination.totalPages}
			</p>
			<div class="flex gap-2">
				{#if data.pagination.page > 1}
					<a
						href="?page={data.pagination.page - 1}"
						class="rounded-md border px-3 py-2 text-sm hover:bg-accent"
					>
						Previous
					</a>
				{/if}
				{#if data.pagination.page < data.pagination.totalPages}
					<a
						href="?page={data.pagination.page + 1}"
						class="rounded-md border px-3 py-2 text-sm hover:bg-accent"
					>
						Next
					</a>
				{/if}
			</div>
		</div>
	{/if}
</div>

<!-- Create User Modal -->
{#if showCreateModal}
	<div class="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
		<div class="w-full max-w-md rounded-lg bg-background p-6 shadow-lg">
			<h2 class="mb-4 text-xl font-bold">Create New User</h2>

			<form
				onsubmit={(e) => {
					e.preventDefault();
					handleCreateUser();
				}}
				class="space-y-4"
			>
				<div>
					<label for="email" class="block text-sm font-medium">Email *</label>
					<input
						id="email"
						type="email"
						bind:value={formData.email}
						required
						class="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none"
					/>
				</div>

				<div>
					<label for="displayName" class="block text-sm font-medium">Display Name</label>
					<input
						id="displayName"
						type="text"
						bind:value={formData.displayName}
						class="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none"
					/>
				</div>

				<div>
					<label for="password" class="block text-sm font-medium">Password *</label>
					<input
						id="password"
						type="password"
						bind:value={formData.password}
						required
						class="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none"
					/>
				</div>

				<div>
					<label for="role" class="block text-sm font-medium">Role</label>
					<select
						id="role"
						bind:value={formData.roleId}
						class="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none"
					>
						{#each data.roles as role}
							<option value={role.id}>{role.name}</option>
						{/each}
					</select>
				</div>

				<div>
					<label for="department" class="block text-sm font-medium">Department</label>
					<select
						id="department"
						bind:value={formData.departmentId}
						class="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none"
					>
						<option value="">None</option>
						{#each data.departments as dept}
							<option value={dept.id}>{dept.name}</option>
						{/each}
					</select>
				</div>

				<div class="flex items-center gap-2">
					<input id="isActive" type="checkbox" bind:checked={formData.isActive} />
					<label for="isActive" class="text-sm font-medium">Active</label>
				</div>

				<div class="flex justify-end gap-2">
					<button
						type="button"
						onclick={closeModals}
						class="rounded-md border px-4 py-2 text-sm hover:bg-accent"
					>
						Cancel
					</button>
					<button
						type="submit"
						disabled={loading}
						class="rounded-md bg-primary px-4 py-2 text-sm text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
					>
						{loading ? 'Creating...' : 'Create User'}
					</button>
				</div>
			</form>
		</div>
	</div>
{/if}

<!-- Edit User Modal -->
{#if showEditModal && selectedUser}
	<div class="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
		<div class="w-full max-w-md rounded-lg bg-background p-6 shadow-lg">
			<h2 class="mb-4 text-xl font-bold">Edit User</h2>

			<form
				onsubmit={(e) => {
					e.preventDefault();
					handleUpdateUser();
				}}
				class="space-y-4"
			>
				<div>
					<label for="edit-email" class="block text-sm font-medium">Email *</label>
					<input
						id="edit-email"
						type="email"
						bind:value={formData.email}
						required
						class="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none"
					/>
				</div>

				<div>
					<label for="edit-displayName" class="block text-sm font-medium">Display Name</label>
					<input
						id="edit-displayName"
						type="text"
						bind:value={formData.displayName}
						class="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none"
					/>
				</div>

				<div>
					<label for="edit-department" class="block text-sm font-medium">Department</label>
					<select
						id="edit-department"
						bind:value={formData.departmentId}
						class="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none"
					>
						<option value="">None</option>
						{#each data.departments as dept}
							<option value={dept.id}>{dept.name}</option>
						{/each}
					</select>
				</div>

				<div class="flex items-center gap-2">
					<input id="edit-isActive" type="checkbox" bind:checked={formData.isActive} />
					<label for="edit-isActive" class="text-sm font-medium">Active</label>
				</div>

				<div class="flex justify-end gap-2">
					<button
						type="button"
						onclick={closeModals}
						class="rounded-md border px-4 py-2 text-sm hover:bg-accent"
					>
						Cancel
					</button>
					<button
						type="submit"
						disabled={loading}
						class="rounded-md bg-primary px-4 py-2 text-sm text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
					>
						{loading ? 'Updating...' : 'Update User'}
					</button>
				</div>
			</form>
		</div>
	</div>
{/if}
