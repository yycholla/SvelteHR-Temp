<script lang="ts">
	import { page } from '$app/stores';
	import { logger } from '$lib/utils/logger';
	import { goto } from '$app/navigation';
	import { Plus, Filter } from '@lucide/svelte';
	import { createUrqlClient } from '$lib/graphql/client';

	// Import decomposed components
	import UserFilters from './components/UserFilters.svelte';
	import UserTable from './components/UserTable.svelte';
	import UserSpreadsheet from './components/UserSpreadsheet.svelte';
	import UserCreateModal from './components/UserCreateModal.svelte';
	import UserEditModal from './components/UserEditModal.svelte';
	import type { RowEdit } from '$lib/components/ui/spreadsheet';

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
		managerId: '',
		jobTitle: '',
		phone: '',
		mobilePhone: '',
		birthDate: '',
		hireDate: '',
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
			managerId: '',
			jobTitle: '',
			phone: '',
			mobilePhone: '',
			birthDate: '',
			hireDate: '',
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
			managerId: user.manager?.id || '',
			jobTitle: user.jobTitle || '',
			phone: user.phone || '',
			mobilePhone: user.mobilePhone || '',
			birthDate: user.birthDate || '',
			hireDate: user.hireDate || '',
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
					users {
						createUser(input: $input) {
							id
							email
							displayName
						}
					}
				}
			`;

			// Parse displayName into firstName and lastName
			const nameParts = (formData.displayName || '').trim().split(' ');
			const firstName = nameParts[0] || 'User';
			const lastName = nameParts.slice(1).join(' ') || '';

			await client.mutation(mutation, {
				input: {
					email: formData.email,
					firstName,
					lastName,
					password: formData.password,
					status: formData.isActive ? 'active' : 'inactive', // Backend expects lowercase
					departmentId: formData.departmentId || null,
					roleName: formData.roleId || 'Employee' // roleId is actually the role name
				}
			});

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
				mutation UpdateUser($id: UUID!, $input: UpdateUserInput!) {
					users {
						updateUser(id: $id, input: $input) {
							id
							email
							displayName
							isActive
						}
					}
				}
			`;

			// Parse displayName into firstName and lastName
			const nameParts = (formData.displayName || '').trim().split(' ');
			const firstName = nameParts[0] || '';
			const lastName = nameParts.slice(1).join(' ') || '';

			await client.mutation(mutation, {
				id: selectedUser.id,
				input: {
					email: formData.email,
					firstName: firstName || undefined,
					lastName: lastName || undefined,
					departmentId: formData.departmentId || null,
					managerId: formData.managerId || null,
					jobTitle: formData.jobTitle || null,
					phone: formData.phone || null,
					mobile: formData.mobilePhone || null,
					birthDate: formData.birthDate || null,
					hireDate: formData.hireDate || null
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
				mutation DeleteUser($id: UUID!) {
					users {
						deleteUser(id: $id)
					}
				}
			`;

			await client.mutation(mutation, {
				id: userId
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
				mutation UpdateUserStatus($id: UUID!, $input: UpdateUserInput!) {
					users {
						updateUser(id: $id, input: $input) {
							id
							isActive
						}
					}
				}
			`;

			// Toggle status enum (active <-> inactive) - backend expects lowercase
			const newStatus = user.isActive ? 'inactive' : 'active';

			await client.mutation(mutation, {
				id: user.id,
				input: {
					status: newStatus
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

	// Handle inline edits from spreadsheet
	async function handleSaveEdits(edits: RowEdit<unknown>[]) {
		loading = true;
		errorMessage = '';

		try {
			const client = createUrqlClient();

			// Process each edit
			for (const edit of edits) {
				const mutation = `
					mutation UpdateUser($id: UUID!, $input: UpdateUserInput!) {
						users {
							updateUser(id: $id, input: $input) {
								id
								email
								displayName
								firstName
								lastName
							}
						}
					}
				`;

				let inputValue = edit.value;

				// Handle displayName - convert to firstName/lastName
				if (edit.field === 'displayName') {
					const nameParts = String(edit.value || '')
						.trim()
						.split(' ');
					const firstName = nameParts[0] || '';
					const lastName = nameParts.slice(1).join(' ') || '';

					await client.mutation(mutation, {
						id: edit.rowId,
						input: {
							firstName: firstName || undefined,
							lastName: lastName || undefined
						}
					});
					continue;
				}

				// Handle firstName and lastName directly
				if (edit.field === 'firstName') {
					await client.mutation(mutation, {
						id: edit.rowId,
						input: {
							firstName: String(inputValue || '')
						}
					});
					continue;
				}

				if (edit.field === 'lastName') {
					await client.mutation(mutation, {
						id: edit.rowId,
						input: {
							lastName: String(inputValue || '')
						}
					});
					continue;
				}

				// Handle department change
				if (edit.field === 'departmentId') {
					await client.mutation(mutation, {
						id: edit.rowId,
						input: {
							departmentId: inputValue || null
						}
					});
					continue;
				}

				// Handle manager change
				if (edit.field === 'managerId') {
					await client.mutation(mutation, {
						id: edit.rowId,
						input: {
							managerId: inputValue || null
						}
					});
					continue;
				}

				// Handle jobTitle change
				if (edit.field === 'jobTitle') {
					await client.mutation(mutation, {
						id: edit.rowId,
						input: {
							jobTitle: String(inputValue || '')
						}
					});
					continue;
				}

				// Handle phone change
				if (edit.field === 'phone') {
					await client.mutation(mutation, {
						id: edit.rowId,
						input: {
							phone: String(inputValue || '')
						}
					});
					continue;
				}

				// Handle mobile change
				if (edit.field === 'mobilePhone') {
					await client.mutation(mutation, {
						id: edit.rowId,
						input: {
							mobilePhone: String(inputValue || '')
						}
					});
					continue;
				}

				// Handle birthDate change
				if (edit.field === 'birthDate') {
					await client.mutation(mutation, {
						id: edit.rowId,
						input: {
							birthDate: inputValue ? String(inputValue) : null
						}
					});
					continue;
				}

				// Handle hireDate change
				if (edit.field === 'hireDate') {
					await client.mutation(mutation, {
						id: edit.rowId,
						input: {
							hireDate: inputValue ? String(inputValue) : null
						}
					});
					continue;
				}

				// Handle role change - requires RBAC mutations
				if (edit.field === 'role') {
					const newRoleName = String(inputValue);

					// Find the role ID from the role name
					const newRole = data.roles.find(
						(r: { id: string; name: string }) => r.name === newRoleName
					);
					if (!newRole) {
						logger.error(`Role not found: ${newRoleName}`);
						continue;
					}

					// Get the user's current role assignments
					const user = edit.originalRow as any;
					const currentRoleAssignments = user.roles || [];

					// Remove all existing role assignments
					for (const roleAssignment of currentRoleAssignments) {
						const removeRoleMutation = `
							mutation RemoveRoleFromUser($userId: UUID!, $roleId: UUID!) {
								rbac {
									removeRoleFromUser(userId: $userId, roleId: $roleId) {
										success
										message
									}
								}
							}
						`;

						await client.mutation(removeRoleMutation, {
							userId: edit.rowId,
							roleId: roleAssignment.id
						});
					}

					// Assign the new role
					const assignRoleMutation = `
						mutation AssignRoleToUser($input: AssignRoleInput!) {
							rbac {
								assignRoleToUser(input: $input) {
									id
									userId
									roleId
								}
							}
						}
					`;

					await client.mutation(assignRoleMutation, {
						input: {
							userId: edit.rowId,
							roleId: newRole.id
						}
					});

					continue;
				}

				// Handle other fields (email, etc.)
				await client.mutation(mutation, {
					id: edit.rowId,
					input: {
						[edit.field]: inputValue
					}
				});
			}

			// Refresh data
			await goto($page.url.pathname, { invalidateAll: true });
		} catch (error) {
			logger.error('Save edits error:', error as Error);
			errorMessage = 'Failed to save changes';
		} finally {
			loading = false;
		}
	}
</script>

<div class="flex flex-col h-full overflow-hidden bg-background">
	<!-- Toolbar -->
	<header
		class="flex-shrink-0 flex items-center justify-between h-14 px-4 border-b bg-background z-20"
	>
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
				<div
					class="rounded-md bg-destructive/10 p-3 text-sm text-destructive font-medium border border-destructive/20"
				>
					{data.error}
				</div>
			{/if}
			{#if errorMessage}
				<div
					class="rounded-md bg-destructive/10 p-3 text-sm text-destructive font-medium border border-destructive/20 mt-2"
				>
					{errorMessage}
				</div>
			{/if}
		</div>
	{/if}

	<!-- Table Area - Enhanced Spreadsheet -->
	<div class="flex-1 overflow-hidden min-h-0 relative">
		<UserSpreadsheet
			{filteredUsers}
			allUsers={data.users}
			{loading}
			roles={data.roles}
			departments={data.departments}
			onToggleStatus={toggleUserStatus}
			onEditUser={openEditModal}
			onDeleteUser={handleDeleteUser}
			onSaveEdits={handleSaveEdits}
		/>
	</div>

	<!-- Footer status -->
	<footer
		class="flex-shrink-0 border-t bg-muted/20 px-3 py-1.5 flex items-center justify-between text-xs"
	>
		<div class="text-muted-foreground">
			{filteredUsers.length} users found
		</div>
		<div class="text-muted-foreground">
			💡 <span class="font-medium">Tip:</span> Double-click cells to edit • Click <Filter
				class="inline h-3 w-3"
			/> to filter • Click sort arrows to sort
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
	allUsers={data.users}
	{loading}
	onClose={closeModals}
	onSubmit={handleUpdateUser}
/>
