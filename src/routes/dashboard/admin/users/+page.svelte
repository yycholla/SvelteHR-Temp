<script lang="ts">
	import { page } from '$app/stores';
	import { logger } from '$lib/utils/logger';
	import { goto } from '$app/navigation';
	import { Plus } from '@lucide/svelte';
	import { createUrqlClient } from '$lib/graphql/client';

	// Import decomposed components
	import UserFilters from './components/UserFilters.svelte';
	import UserTable from './components/UserTable.svelte';
	import UserCreateModal from './components/UserCreateModal.svelte';
	import UserEditModal from './components/UserEditModal.svelte';

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
			logger.error('Create user error:', error as Error);
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
			logger.error('Update user error:', error as Error);
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
			logger.error('Delete user error:', error as Error);
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
			logger.error('Toggle status error:', error as Error);
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
	<UserFilters
		bind:searchQuery
		bind:filters
		roles={data.roles}
		departments={data.departments}
		onApplyFilters={applyFilters}
		onClearFilters={clearFilters}
	/>

	<!-- Users Table -->
	<UserTable
		{filteredUsers}
		{loading}
		onToggleStatus={toggleUserStatus}
		onEditUser={openEditModal}
		onDeleteUser={handleDeleteUser}
	/>

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
<UserCreateModal
	bind:open={showCreateModal}
	bind:formData
	roles={data.roles}
	departments={data.departments}
	{loading}
	onClose={closeModals}
	onSubmit={handleCreateUser}
/>

<!-- Edit User Modal -->
<UserEditModal
	bind:open={showEditModal}
	{selectedUser}
	bind:formData
	departments={data.departments}
	{loading}
	onClose={closeModals}
	onSubmit={handleUpdateUser}
/>