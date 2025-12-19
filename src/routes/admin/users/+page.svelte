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
		role: '',
		department: '',
		status: ''
	});

	// Filtered users based on search query AND filters (Client-side)
	const filteredUsers = $derived(
		data.users.filter((user: any) => {
			// Search Query
			if (searchQuery) {
				const query = searchQuery.toLowerCase();
				const matchesSearch = 
					user.email?.toLowerCase().includes(query) ||
					user.displayName?.toLowerCase().includes(query) ||
					user.department?.name?.toLowerCase().includes(query);
				if (!matchesSearch) return false;
			}

			// Role Filter
			if (filters.role) {
				const hasRole = user.roles?.some((r: any) => r.name === filters.role);
				if (!hasRole) return false;
			}

			// Department Filter
			if (filters.department) {
				if (user.department?.id !== filters.department) return false;
			}

			// Status Filter
			if (filters.status) {
				const isActive = filters.status === 'active';
				if (user.isActive !== isActive) return false;
			}

			return true;
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
		// No-op: Filters are reactive state now
	}

	function clearFilters() {
		filters = { role: '', department: '', status: '' };
		searchQuery = '';
	}
</script>

<div class="flex flex-col h-full overflow-hidden bg-background">
	<!-- Toolbar -->
	<header class="flex-shrink-0 flex items-center justify-between h-14 px-4 border-b bg-background z-20">
		<div class="flex items-center gap-4">
			<h1 class="text-sm font-semibold tracking-tight">Users</h1>
			<div class="h-4 w-px bg-border"></div>
			<!-- Inline Filters -->
			<div class="flex items-center gap-2">
				<UserFilters
					bind:searchQuery
					bind:filters
					roles={data.roles}
					departments={data.departments}
					onApplyFilters={applyFilters}
					onClearFilters={clearFilters}
				/>
			</div>
		</div>
		<div class="flex items-center gap-2">
			<button
				onclick={openCreateModal}
				class="flex items-center gap-1.5 rounded-sm bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90 transition-colors shadow-sm"
				data-testid="admin-add-user-button"
			>
				<Plus class="h-3.5 w-3.5" />
				Add User
			</button>
		</div>
	</header>

	<!-- Messages -->
	{#if data.error || errorMessage}
		<div class="flex-shrink-0 p-4 pb-0">
			{#if data.error}
				<div class="rounded-md bg-destructive/10 p-3 text-sm text-destructive font-medium border border-destructive/20">
					{data.error}
				</div>
			{/if}
			{#if errorMessage}
				<div class="rounded-md bg-destructive/10 p-3 text-sm text-destructive font-medium border border-destructive/20 mt-2">
					{errorMessage}
				</div>
			{/if}
		</div>
	{/if}

	<!-- Table Area - Flush -->
	<div class="flex-1 overflow-hidden min-h-0 relative">
		<UserTable
			{filteredUsers}
			{loading}
			onToggleStatus={toggleUserStatus}
			onEditUser={openEditModal}
			onDeleteUser={handleDeleteUser}
		/>
	</div>

	<!-- Footer status -->
	<footer class="flex-shrink-0 border-t bg-muted/20 px-3 py-1.5 flex items-center justify-between text-xs">
		<div class="text-muted-foreground">
			{filteredUsers.length} users found
		</div>
	</footer>
</div>

<!-- Modals -->
<UserCreateModal
	bind:open={showCreateModal}
	bind:formData
	roles={data.roles}
	departments={data.departments}
	{loading}
	onClose={closeModals}
	onSubmit={handleCreateUser}
/>

<UserEditModal
	bind:open={showEditModal}
	{selectedUser}
	bind:formData
	departments={data.departments}
	{loading}
	onClose={closeModals}
	onSubmit={handleUpdateUser}
/>