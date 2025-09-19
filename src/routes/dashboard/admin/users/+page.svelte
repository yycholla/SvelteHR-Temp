<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import { Badge } from '$lib/components/ui/badge';
	import { Switch } from '$lib/components/ui/switch';
	import * as Card from '$lib/components/ui/card';
	import * as Table from '$lib/components/ui/table';
	import * as Select from '$lib/components/ui/select';
	import * as Dialog from '$lib/components/ui/dialog';
	import * as Tabs from '$lib/components/ui/tabs';
	import * as Alert from '$lib/components/ui/alert';
	import * as DropdownMenu from '$lib/components/ui/dropdown-menu';
	import HrAnalyticsCharts from '$lib/components/hr-analytics-charts.svelte';
	import {
		Users,
		Plus,
		Search,
		Filter,
		MoreHorizontal,
		Edit,
		Trash2,
		UserPlus,
		Download,
		RefreshCw,
		ArrowLeft,
		UserCheck,
		UserX,
		Mail,
		Phone,
		Calendar,
		Building2,
		Shield,
		Eye,
		Settings,
		CheckCircle,
		AlertTriangle
	} from 'lucide-svelte';
	import {
		getAllUsers,
		getUserById,
		getUserRoles,
		updateUserStatus,
		deleteUser as deleteUserAPI,
		formatUserRole,
		getUserRoleLevel,
		formatUserStatus,
		getUserDepartment,
		type User,
		type UserRole
	} from '$lib/graphql/user-operations.js';

	// Real user data from GraphQL API
	let users: User[] = $state([]);
	let userRoles: UserRole[] = $state([]);

	// State management
	let searchQuery = $state('');
	let selectedRole = $state('all');
	let selectedStatus = $state('all');
	let selectedDepartment = $state('all');
	let loading = $state(false);
	let initialLoading = $state(true);
	let showUserModal = $state(false);
	let showDeleteConfirm = $state(false);
	let selectedUser = $state<User | null>(null);
	let userToDelete = $state<User | null>(null);
	let notification = $state<{ type: string; title: string; message: string } | null>(null);

	// Load data on component mount
	onMount(async () => {
		console.log('🔄 onMount started');

		// Ensure filter defaults are set
		searchQuery = '';
		selectedRole = 'all';
		selectedStatus = 'all';
		selectedDepartment = 'all';
		console.log('🔧 Filter defaults set explicitly');

		await loadUsers();
		await loadUserRoles();
		initialLoading = false;
		console.log('✅ onMount completed - initialLoading set to false');
	});

	async function loadUsers() {
		try {
			console.log('📡 loadUsers started - setting loading = true');
			loading = true;
			const loadedUsers = await getAllUsers();
			users = loadedUsers;
			console.log('✅ Successfully loaded', users.length, 'users');
		} catch (error) {
			console.error('❌ Error loading users:', error);
			showNotification('error', 'Error Loading Users', 'Failed to load user data from the server.');
		} finally {
			loading = false;
			console.log('📡 loadUsers completed - setting loading = false');
		}
	}

	async function loadUserRoles() {
		try {
			userRoles = await getUserRoles();
		} catch (error) {
			console.error('Error loading user roles:', error);
		}
	}

	// Statistics with real data
	const userStats = $derived(() => {
		// Ensure we have actual user data before calculating
		if (!users || users.length === 0) {
			console.log('⚠️  No users data available for stats calculation');
			return {
				total: 0,
				active: 0,
				inactive: 0,
				admins: 0,
				managers: 0,
				employees: 0
			};
		}

		console.log('📊 Calculating stats for', users.length, 'users');
		console.log('First user structure:', users[0]);

		const stats = {
			total: users.length,
			active: users.filter((u) => u.isActive).length,
			inactive: users.filter((u) => !u.isActive).length,
			admins: users.filter((u) => {
				const level = getUserRoleLevel(u);
				console.log(
					`${u.displayName || u.email}: level ${level} (${level >= 80 ? 'admin' : 'not admin'})`
				);
				return level >= 80;
			}).length,
			managers: users.filter((u) => {
				const level = getUserRoleLevel(u);
				return level >= 60 && level < 80;
			}).length,
			employees: users.filter((u) => {
				const level = getUserRoleLevel(u);
				return level > 0 && level < 60;
			}).length
		};

		console.log('📈 Final calculated stats:', stats);
		return stats;
	});

	// Filtered users - temporarily simplified to isolate issue
	let filteredUsers = $state([]);

	// Update filtered users whenever relevant data changes
	$effect(() => {
		console.log('🔍 EFFECT RUNNING - users.length:', users.length);
		console.log('🔍 Filter values:', {
			searchQuery,
			selectedRole,
			selectedStatus,
			selectedDepartment
		});
		console.log('🔍 Filter types:', {
			searchQuery: typeof searchQuery,
			selectedRole: typeof selectedRole,
			selectedStatus: typeof selectedStatus,
			selectedDepartment: typeof selectedDepartment
		});

		if (users.length === 0) {
			console.log('❌ No users to filter');
			filteredUsers = [];
			return;
		}

		try {
			const filtered = users.filter((user) => {
				const displayName = user.displayName || user.email;
				const userRole = formatUserRole(user);
				const userDept = getUserDepartment(user);

				// Search filter
				const matchesSearch =
					searchQuery === '' ||
					displayName.toLowerCase().includes(searchQuery.toLowerCase()) ||
					user.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
					userDept.toLowerCase().includes(searchQuery.toLowerCase()) ||
					(user.jobTitle && user.jobTitle.toLowerCase().includes(searchQuery.toLowerCase()));

				// Role filter - ensure selectedRole is a string
				const roleStr = typeof selectedRole === 'string' ? selectedRole : 'all';
				const matchesRole =
					roleStr === 'all' || userRole.toLowerCase().includes(roleStr.toLowerCase());

				// Status filter - ensure selectedStatus is a string
				const statusStr = typeof selectedStatus === 'string' ? selectedStatus : 'all';
				const matchesStatus =
					statusStr === 'all' ||
					(statusStr === 'active' && user.isActive) ||
					(statusStr === 'inactive' && !user.isActive);

				// Department filter - ensure selectedDepartment is a string
				const deptStr = typeof selectedDepartment === 'string' ? selectedDepartment : 'all';
				const matchesDepartment = deptStr === 'all' || userDept === deptStr;

				const passes = matchesSearch && matchesRole && matchesStatus && matchesDepartment;

				if (!passes) {
					console.log(
						`❌ ${user.email} filtered out - Search:${matchesSearch} Role:${matchesRole} Status:${matchesStatus} Dept:${matchesDepartment}`
					);
				}

				return passes;
			});

			console.log('✅ Filtered result:', filtered.length, 'users');
			filteredUsers = filtered;
		} catch (error) {
			console.error('❌ Error in filtering:', error);
			filteredUsers = [];
		}
	});

	// Get unique departments for filter
	const departments = $derived(() => {
		if (users.length === 0) return [];

		try {
			const deptCounts = users.reduce(
				(acc, user) => {
					const dept = getUserDepartment(user);
					if (dept && dept !== 'undefined') {
						acc[dept] = (acc[dept] || 0) + 1;
					}
					return acc;
				},
				{} as Record<string, number>
			);

			const deptList = Object.keys(deptCounts)
				.filter((d) => d && d.length > 0)
				.sort();
			console.log('🏢 Departments found:', deptList);
			return deptList;
		} catch (error) {
			console.error('❌ Error getting departments:', error);
			return [];
		}
	});

	function getRoleVariant(role: string) {
		switch (role) {
			case 'admin':
				return 'destructive';
			case 'hr_admin':
				return 'secondary';
			case 'manager':
				return 'default';
			case 'employee':
				return 'outline';
			default:
				return 'outline';
		}
	}

	function getRoleLabel(role: string) {
		switch (role) {
			case 'admin':
				return 'Administrator';
			case 'hr_admin':
				return 'HR Admin';
			case 'manager':
				return 'Manager';
			case 'employee':
				return 'Employee';
			default:
				return role;
		}
	}

	function formatDate(dateString: string) {
		return new Date(dateString).toLocaleDateString();
	}

	function formatLastLogin(dateString: string) {
		if (!dateString) return 'Never';
		const date = new Date(dateString);
		const now = new Date();
		const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));

		if (diffInHours < 1) return 'Just now';
		if (diffInHours < 24) return `${diffInHours}h ago`;
		if (diffInHours < 168) return `${Math.floor(diffInHours / 24)}d ago`;
		return formatDate(dateString);
	}

	function viewUser(user: any) {
		selectedUser = { ...user };
		showUserModal = true;
	}

	function editUser(user: any) {
		goto(`/dashboard/admin/users/${user.id}/edit`);
	}

	function deleteUser(user: User) {
		userToDelete = user;
		showDeleteConfirm = true;
	}

	async function confirmDelete() {
		if (userToDelete) {
			try {
				await deleteUserAPI(userToDelete.id);
				users = users.filter((u) => u.id !== userToDelete.id);
				const displayName = userToDelete.displayName || userToDelete.email;
				showNotification(
					'success',
					'User Deleted',
					`${displayName} has been deleted successfully.`
				);
				userToDelete = null;
			} catch (error) {
				console.error('Error deleting user:', error);
				showNotification('error', 'Delete Failed', 'Failed to delete user. Please try again.');
			}
		}
		showDeleteConfirm = false;
	}

	async function toggleUserStatus(user: User) {
		try {
			const newStatus = !user.isActive;
			await updateUserStatus(user.id, newStatus);

			// Update local state
			const index = users.findIndex((u) => u.id === user.id);
			if (index !== -1) {
				users[index].isActive = newStatus;
			}

			const displayName = user.displayName || user.email;
			showNotification(
				'success',
				'Status Updated',
				`${displayName} has been ${newStatus ? 'activated' : 'deactivated'}.`
			);
		} catch (error) {
			console.error('Error updating user status:', error);
			showNotification('error', 'Update Failed', 'Failed to update user status. Please try again.');
		}
	}

	function showNotification(type: string, title: string, message: string) {
		notification = { type, title, message };
		setTimeout(() => {
			notification = null;
		}, 5000);
	}

	function exportUsers() {
		const csvContent = generateCSV(filteredUsers);
		downloadCSV(csvContent, 'users.csv');
		showNotification('success', 'Export Complete', 'User data has been exported successfully.');
	}

	function generateCSV(data: any[]): string {
		const headers = ['Name', 'Email', 'Role', 'Department', 'Status', 'Last Login', 'Created'].join(
			','
		);
		const rows = data
			.map((user) =>
				[
					`"${user.display_name}"`,
					`"${user.email}"`,
					`"${getRoleLabel(user.role)}"`,
					`"${user.department}"`,
					`"${user.is_active ? 'Active' : 'Inactive'}"`,
					`"${formatLastLogin(user.last_login)}"`,
					`"${formatDate(user.created_at)}"`
				].join(',')
			)
			.join('\n');

		return `${headers}\n${rows}`;
	}

	function downloadCSV(content: string, filename: string) {
		const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
		const link = document.createElement('a');
		const url = URL.createObjectURL(blob);
		link.setAttribute('href', url);
		link.setAttribute('download', filename);
		link.style.visibility = 'hidden';
		document.body.appendChild(link);
		link.click();
		document.body.removeChild(link);
	}

	async function refreshUsers() {
		await loadUsers();
		showNotification('success', 'Data Refreshed', 'User data has been refreshed successfully.');
	}

	function resetFilters() {
		searchQuery = '';
		selectedRole = 'all';
		selectedStatus = 'all';
		selectedDepartment = 'all';
		console.log('🔄 Filters reset to defaults');
	}

	function closeModal() {
		showUserModal = false;
		selectedUser = null;
	}
</script>

<svelte:head>
	<title>User Management - Admin Dashboard</title>
</svelte:head>

<div class="space-y-6">
	<!-- Header -->
	<div class="flex items-center justify-between">
		<div>
			<div class="mb-2 flex items-center gap-3">
				<Button variant="ghost" size="sm" href="/dashboard/admin" class="p-2">
					<ArrowLeft class="h-4 w-4" />
				</Button>
				<h1 class="flex items-center gap-3 text-3xl font-bold tracking-tight">
					<Users class="h-8 w-8" />
					User Management
				</h1>
			</div>
			<p class="text-muted-foreground">
				Manage user accounts, roles, and permissions for your organization
			</p>
		</div>
		<div class="flex items-center gap-3">
			<Button variant="outline" onclick={refreshUsers} disabled={loading}>
				{#if loading}
					<RefreshCw class="mr-2 h-4 w-4 animate-spin" />
				{:else}
					<RefreshCw class="mr-2 h-4 w-4" />
				{/if}
				Refresh
			</Button>
			<Button variant="outline" onclick={exportUsers}>
				<Download class="mr-2 h-4 w-4" />
				Export
			</Button>
			<Button href="/dashboard/admin/users/new">
				<Plus class="mr-2 h-4 w-4" />
				Add User
			</Button>
		</div>
	</div>

	<!-- Analytics Charts -->
	<HrAnalyticsCharts {users} />

	<!-- Notification -->
	{#if notification}
		<Alert.Root
			class={notification.type === 'success'
				? 'border-green-200 bg-green-50'
				: 'border-red-200 bg-red-50'}
		>
			{#if notification.type === 'success'}
				<CheckCircle class="h-4 w-4 text-green-600" />
			{:else}
				<AlertTriangle class="h-4 w-4 text-red-600" />
			{/if}
			<Alert.Title class={notification.type === 'success' ? 'text-green-800' : 'text-red-800'}>
				{notification.title}
			</Alert.Title>
			<Alert.Description
				class={notification.type === 'success' ? 'text-green-700' : 'text-red-700'}
			>
				{notification.message}
			</Alert.Description>
		</Alert.Root>
	{/if}

	<!-- Stats Cards -->
	<div class="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
		<Card.Root>
			<Card.Content class="p-6">
				<div class="flex items-center justify-between">
					<div>
						<p class="text-sm font-medium text-muted-foreground">Total Users</p>
						<p class="text-2xl font-bold">{userStats.total}</p>
					</div>
					<Users class="h-8 w-8 text-muted-foreground" />
				</div>
			</Card.Content>
		</Card.Root>
		<Card.Root>
			<Card.Content class="p-6">
				<div class="flex items-center justify-between">
					<div>
						<p class="text-sm font-medium text-muted-foreground">Active Users</p>
						<p class="text-2xl font-bold text-green-600">{userStats.active}</p>
					</div>
					<UserCheck class="h-8 w-8 text-green-600" />
				</div>
			</Card.Content>
		</Card.Root>
		<Card.Root>
			<Card.Content class="p-6">
				<div class="flex items-center justify-between">
					<div>
						<p class="text-sm font-medium text-muted-foreground">Inactive Users</p>
						<p class="text-2xl font-bold text-red-600">{userStats.inactive}</p>
					</div>
					<UserX class="h-8 w-8 text-red-600" />
				</div>
			</Card.Content>
		</Card.Root>
		<Card.Root>
			<Card.Content class="p-6">
				<div class="flex items-center justify-between">
					<div>
						<p class="text-sm font-medium text-muted-foreground">Administrators</p>
						<p class="text-2xl font-bold text-blue-600">{userStats.admins}</p>
					</div>
					<Shield class="h-8 w-8 text-blue-600" />
				</div>
			</Card.Content>
		</Card.Root>
	</div>

	<!-- Filters -->
	<Card.Root>
		<Card.Header>
			<Card.Title class="flex items-center gap-2">
				<Filter class="h-5 w-5" />
				Filters & Search
			</Card.Title>
		</Card.Header>
		<Card.Content>
			<div class="grid grid-cols-1 gap-4 md:grid-cols-4">
				<div class="space-y-2">
					<Label>Search Users</Label>
					<div class="relative">
						<Search class="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
						<Input placeholder="Search by name, email..." bind:value={searchQuery} class="pl-10" />
					</div>
				</div>
				<div class="space-y-2">
					<Label>Role</Label>
					<select
						bind:value={selectedRole}
						class="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
					>
						<option value="all">All Roles</option>
						<option value="admin">Administrator</option>
						<option value="hr">HR</option>
						<option value="manager">Manager</option>
						<option value="employee">Employee</option>
					</select>
				</div>
				<div class="space-y-2">
					<Label>Status</Label>
					<select
						bind:value={selectedStatus}
						class="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
					>
						<option value="all">All Status</option>
						<option value="active">Active</option>
						<option value="inactive">Inactive</option>
					</select>
				</div>
				<div class="space-y-2">
					<Label>Department</Label>
					<select
						bind:value={selectedDepartment}
						class="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
					>
						<option value="all">All Departments</option>
						{#each departments as dept}
							<option value={dept}>{dept}</option>
						{/each}
					</select>
				</div>
			</div>
		</Card.Content>
	</Card.Root>

	<!-- Users Table -->
	<Card.Root>
		<Card.Header>
			<div class="flex items-center justify-between">
				<Card.Title>Users ({filteredUsers.length})</Card.Title>
				<Badge variant="outline">{filteredUsers.length} of {users.length} users</Badge>
			</div>
		</Card.Header>
		<Card.Content>
			<!-- DEBUG: Loading states -->
			<div class="mb-4 bg-yellow-100 p-2 text-sm">
				DEBUG: initialLoading = {initialLoading}, loading = {loading}, users.length = {users.length}
			</div>

			{#if initialLoading || loading}
				<div class="space-y-4">
					{#each Array(5) as _}
						<div class="h-16 animate-pulse rounded bg-muted"></div>
					{/each}
				</div>
			{:else}
				<Table.Root>
					<Table.Header>
						<Table.Row>
							<Table.Head>User</Table.Head>
							<Table.Head>Role</Table.Head>
							<Table.Head>Department</Table.Head>
							<Table.Head>Status</Table.Head>
							<Table.Head>Last Login</Table.Head>
							<Table.Head>Created</Table.Head>
							<Table.Head class="text-right">Actions</Table.Head>
						</Table.Row>
					</Table.Header>
					<Table.Body>
						{#each filteredUsers as user}
							<Table.Row>
								<Table.Cell>
									<div class="flex items-center gap-3">
										<div
											class="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10"
										>
											<span class="text-sm font-medium">
												{(user.displayName || user.email)
													.split(' ')
													.map((n) => n[0])
													.join('')
													.slice(0, 2)}
											</span>
										</div>
										<div>
											<div class="font-medium">{user.displayName || user.email}</div>
											<div class="text-sm text-muted-foreground">{user.email}</div>
											{#if user.jobTitle}
												<div class="text-xs text-muted-foreground">{user.jobTitle}</div>
											{/if}
										</div>
									</div>
								</Table.Cell>
								<Table.Cell>
									<Badge variant="outline">
										{formatUserRole(user)}
									</Badge>
								</Table.Cell>
								<Table.Cell>{getUserDepartment(user)}</Table.Cell>
								<Table.Cell>
									<div class="flex items-center gap-2">
										<Badge variant={user.isActive ? 'default' : 'secondary'}>
											{user.isActive ? 'Active' : 'Inactive'}
										</Badge>
									</div>
								</Table.Cell>
								<Table.Cell class="text-sm text-muted-foreground">
									{user.lastLogin ? formatLastLogin(user.lastLogin) : 'Never'}
								</Table.Cell>
								<Table.Cell class="text-sm text-muted-foreground">
									{formatDate(user.createdAt)}
								</Table.Cell>
								<Table.Cell class="text-right">
									<DropdownMenu.Root>
										<DropdownMenu.Trigger>
											<Button variant="ghost" size="sm">
												<MoreHorizontal class="h-4 w-4" />
											</Button>
										</DropdownMenu.Trigger>
										<DropdownMenu.Content align="end">
											<DropdownMenu.Item onclick={() => viewUser(user)}>
												<Eye class="mr-2 h-4 w-4" />
												View Details
											</DropdownMenu.Item>
											<DropdownMenu.Item onclick={() => editUser(user)}>
												<Edit class="mr-2 h-4 w-4" />
												Edit User
											</DropdownMenu.Item>
											<DropdownMenu.Item onclick={() => toggleUserStatus(user)}>
												{#if user.isActive}
													<UserX class="mr-2 h-4 w-4" />
													Deactivate
												{:else}
													<UserCheck class="mr-2 h-4 w-4" />
													Activate
												{/if}
											</DropdownMenu.Item>
											<DropdownMenu.Separator />
											<DropdownMenu.Item onclick={() => deleteUser(user)} class="text-red-600">
												<Trash2 class="mr-2 h-4 w-4" />
												Delete User
											</DropdownMenu.Item>
										</DropdownMenu.Content>
									</DropdownMenu.Root>
								</Table.Cell>
							</Table.Row>
						{/each}
					</Table.Body>
				</Table.Root>

				{#if filteredUsers.length === 0}
					<div class="py-12 text-center">
						<Users class="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
						<h3 class="text-lg font-medium">No users found</h3>
						<p class="text-muted-foreground">Try adjusting your search criteria or filters.</p>
					</div>
				{/if}
			{/if}
		</Card.Content>
	</Card.Root>
</div>

<!-- User Details Modal -->
<Dialog.Root bind:open={showUserModal}>
	<Dialog.Content class="max-w-4xl">
		<Dialog.Header>
			<Dialog.Title>User Details</Dialog.Title>
			<Dialog.Description>View and manage user information and permissions.</Dialog.Description>
		</Dialog.Header>
		{#if selectedUser}
			<Tabs.Root value="details" class="space-y-6">
				<Tabs.List>
					<Tabs.Trigger value="details">Personal Details</Tabs.Trigger>
					<Tabs.Trigger value="employment">Employment</Tabs.Trigger>
					<Tabs.Trigger value="permissions">Permissions</Tabs.Trigger>
					<Tabs.Trigger value="activity">Activity</Tabs.Trigger>
				</Tabs.List>

				<Tabs.Content value="details">
					<div class="grid grid-cols-1 gap-6 md:grid-cols-2">
						<div class="space-y-4">
							<div>
								<Label class="text-sm font-medium">Full Name</Label>
								<p class="text-sm text-muted-foreground">{selectedUser.display_name}</p>
							</div>
							<div>
								<Label class="text-sm font-medium">Email Address</Label>
								<p class="text-sm text-muted-foreground">{selectedUser.email}</p>
							</div>
							<div>
								<Label class="text-sm font-medium">Phone Number</Label>
								<p class="text-sm text-muted-foreground">{selectedUser.phone || 'Not provided'}</p>
							</div>
						</div>
						<div class="space-y-4">
							<div>
								<Label class="text-sm font-medium">User ID</Label>
								<p class="text-sm text-muted-foreground">{selectedUser.id}</p>
							</div>
							<div>
								<Label class="text-sm font-medium">Account Status</Label>
								<Badge variant={selectedUser.is_active ? 'default' : 'secondary'}>
									{selectedUser.is_active ? 'Active' : 'Inactive'}
								</Badge>
							</div>
							<div>
								<Label class="text-sm font-medium">Last Login</Label>
								<p class="text-sm text-muted-foreground">
									{formatLastLogin(selectedUser.last_login)}
								</p>
							</div>
						</div>
					</div>
				</Tabs.Content>

				<Tabs.Content value="employment">
					<div class="grid grid-cols-1 gap-6 md:grid-cols-2">
						<div class="space-y-4">
							<div>
								<Label class="text-sm font-medium">Position</Label>
								<p class="text-sm text-muted-foreground">{selectedUser.position}</p>
							</div>
							<div>
								<Label class="text-sm font-medium">Department</Label>
								<p class="text-sm text-muted-foreground">{selectedUser.department}</p>
							</div>
							<div>
								<Label class="text-sm font-medium">Manager</Label>
								<p class="text-sm text-muted-foreground">{selectedUser.manager}</p>
							</div>
						</div>
						<div class="space-y-4">
							<div>
								<Label class="text-sm font-medium">Start Date</Label>
								<p class="text-sm text-muted-foreground">{formatDate(selectedUser.startDate)}</p>
							</div>
							<div>
								<Label class="text-sm font-medium">Employment Type</Label>
								<Badge variant="outline">{selectedUser.employmentType}</Badge>
							</div>
							<div>
								<Label class="text-sm font-medium">Annual Salary</Label>
								<p class="text-sm text-muted-foreground">
									${selectedUser.salary?.toLocaleString() || 'Not specified'}
								</p>
							</div>
						</div>
					</div>
				</Tabs.Content>

				<Tabs.Content value="permissions">
					<div class="space-y-6">
						<div>
							<Label class="text-sm font-medium">Current Role</Label>
							<div class="mt-2 flex items-center gap-2">
								<Badge variant={getRoleVariant(selectedUser.role)}>
									{getRoleLabel(selectedUser.role)}
								</Badge>
								<span class="text-sm text-muted-foreground">
									Level {selectedUser.role_level}
								</span>
							</div>
						</div>
						<div class="space-y-3">
							<Label class="text-sm font-medium">System Permissions</Label>
							<div class="grid grid-cols-1 gap-4 md:grid-cols-2">
								<div class="flex items-center justify-between">
									<span class="text-sm">Can view all users</span>
									<Badge variant={selectedUser.role_level >= 80 ? 'default' : 'secondary'}>
										{selectedUser.role_level >= 80 ? 'Yes' : 'No'}
									</Badge>
								</div>
								<div class="flex items-center justify-between">
									<span class="text-sm">Can manage users</span>
									<Badge variant={selectedUser.role_level >= 100 ? 'default' : 'secondary'}>
										{selectedUser.role_level >= 100 ? 'Yes' : 'No'}
									</Badge>
								</div>
								<div class="flex items-center justify-between">
									<span class="text-sm">Can view reports</span>
									<Badge variant={selectedUser.role_level >= 60 ? 'default' : 'secondary'}>
										{selectedUser.role_level >= 60 ? 'Yes' : 'No'}
									</Badge>
								</div>
								<div class="flex items-center justify-between">
									<span class="text-sm">Can manage leave</span>
									<Badge variant={selectedUser.role_level >= 60 ? 'default' : 'secondary'}>
										{selectedUser.role_level >= 60 ? 'Yes' : 'No'}
									</Badge>
								</div>
							</div>
						</div>
					</div>
				</Tabs.Content>

				<Tabs.Content value="activity">
					<div class="space-y-4">
						<div>
							<Label class="text-sm font-medium">Account Created</Label>
							<p class="text-sm text-muted-foreground">{formatDate(selectedUser.created_at)}</p>
						</div>
						<div>
							<Label class="text-sm font-medium">Last Login</Label>
							<p class="text-sm text-muted-foreground">
								{formatLastLogin(selectedUser.last_login)}
							</p>
						</div>
						<div>
							<Label class="text-sm font-medium">Recent Activity</Label>
							<div class="text-sm text-muted-foreground">
								<p>• Last updated profile information</p>
								<p>• Submitted leave request</p>
								<p>• Accessed employee directory</p>
							</div>
						</div>
					</div>
				</Tabs.Content>
			</Tabs.Root>
		{/if}
		<Dialog.Footer>
			<Button variant="outline" onclick={closeModal}>Close</Button>
			<Button
				onclick={() => {
					closeModal();
					editUser(selectedUser);
				}}
			>
				<Edit class="mr-2 h-4 w-4" />
				Edit User
			</Button>
		</Dialog.Footer>
	</Dialog.Content>
</Dialog.Root>

<!-- Delete Confirmation Dialog -->
<Dialog.Root bind:open={showDeleteConfirm}>
	<Dialog.Content>
		<Dialog.Header>
			<Dialog.Title>Delete User</Dialog.Title>
			<Dialog.Description>
				Are you sure you want to delete this user? This action cannot be undone.
			</Dialog.Description>
		</Dialog.Header>
		{#if userToDelete}
			<div class="py-4">
				<p class="text-sm">
					<strong>{userToDelete.display_name}</strong> ({userToDelete.email}) will be permanently
					deleted.
				</p>
			</div>
		{/if}
		<Dialog.Footer>
			<Button variant="outline" onclick={() => (showDeleteConfirm = false)}>Cancel</Button>
			<Button variant="destructive" onclick={confirmDelete}>
				<Trash2 class="mr-2 h-4 w-4" />
				Delete User
			</Button>
		</Dialog.Footer>
	</Dialog.Content>
</Dialog.Root>
