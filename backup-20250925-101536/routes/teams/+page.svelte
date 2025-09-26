<script lang="ts">
	import { onMount } from 'svelte';
	import { page } from '$app/stores';
	import { getOperationStore, queryStore } from '@urql/svelte';
	import { toast } from 'svelte-sonner';
	import {
		Building,
		Users,
		Plus,
		Search,
		Filter,
		X,
		Eye,
		Edit,
		Trash2,
		UserCheck,
		ArrowRight,
		ChevronDown,
		ChevronRight,
		Crown
	} from 'lucide-svelte';

	import HrDataTable from '$lib/components/data-table/hr-data-table.svelte';
	import DataExport from '$lib/components/export/data-export.svelte';
	import {
		GET_ALL_TEAMS,
		GET_TEAM_DETAILS,
		GET_TEAM_HIERARCHY,
		CREATE_TEAM,
		UPDATE_TEAM,
		DELETE_TEAM,
		ASSIGN_DEPARTMENT_HEAD,
		MOVE_EMPLOYEE_TO_TEAM,
		categorizeTeamSize,
		getDepartmentTypeInfo,
		buildTeamHierarchy,
		calculateTeamStats,
		teamSizeCategories,
		departmentTypes
	} from '$lib/graphql/team-management-operations';

	// Page data from server
	export let data;

	// Local state using Svelte 5 runes
	let selectedTeams = $state<any[]>([]);
	let showCreateModal = $state(false);
	let showEditModal = $state(false);
	let showViewModal = $state(false);
	let showAssignHeadModal = $state(false);
	let showMoveEmployeeModal = $state(false);
	let currentTeam = $state<any>(null);
	let viewMode = $state<'table' | 'hierarchy'>('table');
	let sizeFilter = $state('all');
	let headFilter = $state('all');
	let parentFilter = $state('all');
	let searchQuery = $state('');

	// Pagination state
	let currentPage = $state(1);
	let pageSize = $state(20);

	// Create/Edit form state
	let teamForm = $state({
		name: '',
		description: '',
		parentDepartmentId: '',
		departmentHeadId: '',
		departmentType: 'operations'
	});

	// Assign head form state
	let assignHeadForm = $state({
		departmentHeadId: '',
		searchTerm: ''
	});

	// Move employee form state
	let moveEmployeeForm = $state({
		employeeId: '',
		newDepartmentId: '',
		newManagerId: ''
	});

	// Query for all teams
	const teams = queryStore({
		client: getOperationStore(),
		query: GET_ALL_TEAMS,
		variables: {
			first: pageSize,
			offset: (currentPage - 1) * pageSize,
			filter: {
				...(sizeFilter !== 'all' &&
					{
						// This would need server-side logic to filter by employee count
					}),
				...(headFilter === 'with-head' && {
					departmentHeadId: { isNull: false }
				}),
				...(headFilter === 'without-head' && {
					departmentHeadId: { isNull: true }
				}),
				...(parentFilter !== 'all' && {
					parentDepartmentId: parentFilter === 'root' ? { isNull: true } : { equalTo: parentFilter }
				}),
				...(searchQuery && {
					name: { includesInsensitive: searchQuery }
				})
			}
		}
	});

	// Query for team hierarchy
	const teamHierarchy = queryStore({
		client: getOperationStore(),
		query: GET_TEAM_HIERARCHY,
		variables: {
			rootDepartmentId: null // Get root departments
		}
	});

	// Mutation operations
	const createTeam = getOperationStore(CREATE_TEAM);
	const updateTeam = getOperationStore(UPDATE_TEAM);
	const deleteTeam = getOperationStore(DELETE_TEAM);
	const assignHead = getOperationStore(ASSIGN_DEPARTMENT_HEAD);
	const moveEmployee = getOperationStore(MOVE_EMPLOYEE_TO_TEAM);

	// Table columns configuration
	const columns = [
		{
			key: 'name',
			label: 'Team Name',
			sortable: true,
			render: (value: string, row: any) => {
				const typeInfo = getDepartmentTypeInfo(value);
				const sizeInfo = categorizeTeamSize(row.employees?.totalCount || 0);
				const hasParent = row.parentDepartmentId;
				return `<div data-testid="team-name">
					<div class="flex items-center gap-2">
						<div class="p-1 bg-${typeInfo.color}-100 rounded">
							<Building class="w-4 h-4 text-${typeInfo.color}-600" />
						</div>
						<div>
							<div class="font-medium">${value}</div>
							<div class="text-sm text-gray-500 flex items-center gap-2">
								${hasParent ? '<span class="text-xs bg-gray-100 px-1 rounded">Sub-team</span>' : '<span class="text-xs bg-blue-100 px-1 rounded">Root</span>'}
								<span class="px-1 py-0.5 bg-${sizeInfo.color}-100 text-${sizeInfo.color}-800 text-xs rounded">${sizeInfo.label}</span>
							</div>
						</div>
					</div>
				</div>`;
			}
		},
		{
			key: 'departmentHead',
			label: 'Department Head',
			render: (value: any) => {
				if (!value) {
					return `<span data-testid="no-head" class="text-gray-400 italic">No head assigned</span>`;
				}
				return `<div data-testid="department-head">
					<div class="flex items-center gap-2">
						<Crown class="w-4 h-4 text-yellow-600" />
						<div>
							<div class="font-medium">${value.displayName}</div>
							<div class="text-sm text-gray-500">${value.jobTitle || 'No title'}</div>
						</div>
					</div>
				</div>`;
			}
		},
		{
			key: 'employees',
			label: 'Team Size',
			sortable: true,
			align: 'center',
			render: (value: any, row: any) => {
				const total = row.employees?.totalCount || 0;
				const active = row.activeEmployees?.totalCount || 0;
				const sizeInfo = categorizeTeamSize(total);
				return `<div data-testid="team-size" class="text-center">
					<div class="text-lg font-bold text-${sizeInfo.color}-600">${total}</div>
					<div class="text-xs text-gray-500">${active} active</div>
				</div>`;
			}
		},
		{
			key: 'subDepartments',
			label: 'Sub-teams',
			align: 'center',
			render: (value: any) => {
				const count = value?.totalCount || 0;
				return `<div data-testid="sub-teams" class="text-center">
					<span class="text-sm font-medium ${count > 0 ? 'text-blue-600' : 'text-gray-400'}">${count}</span>
				</div>`;
			}
		},
		{
			key: 'description',
			label: 'Description',
			render: (value: string) => {
				return `<div data-testid="team-description" class="text-sm text-gray-600 max-w-xs truncate">
					${value || 'No description'}
				</div>`;
			}
		},
		{
			key: 'actions',
			label: 'Actions',
			align: 'center',
			render: (value: any, row: any) => {
				return `
					<div class="flex gap-2 justify-center">
						<button
							data-testid="view-team"
							class="p-1 text-blue-600 hover:bg-blue-50 rounded"
							title="View Team"
						>
							<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path>
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"></path>
							</svg>
						</button>
						<button
							data-testid="assign-head"
							class="p-1 text-purple-600 hover:bg-purple-50 rounded"
							title="Assign Department Head"
						>
							<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z"></path>
							</svg>
						</button>
						<button
							data-testid="edit-team"
							class="p-1 text-green-600 hover:bg-green-50 rounded"
							title="Edit Team"
						>
							<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path>
							</svg>
						</button>
						<button
							data-testid="delete-team"
							class="p-1 text-red-600 hover:bg-red-50 rounded"
							title="Delete Team"
						>
							<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path>
							</svg>
						</button>
					</div>
				`;
			}
		}
	];

	// Handle create team
	function handleCreateTeam() {
		teamForm = {
			name: '',
			description: '',
			parentDepartmentId: '',
			departmentHeadId: '',
			departmentType: 'operations'
		};
		currentTeam = null;
		showCreateModal = true;
	}

	// Handle edit team
	function handleEditTeam(team: any) {
		teamForm = {
			name: team.name || '',
			description: team.description || '',
			parentDepartmentId: team.parentDepartmentId || '',
			departmentHeadId: team.departmentHead?.id || '',
			departmentType: getDepartmentTypeInfo(team.name).value
		};
		currentTeam = team;
		showEditModal = true;
	}

	// Handle view team
	function handleViewTeam(team: any) {
		currentTeam = team;
		showViewModal = true;
	}

	// Handle assign head
	function handleAssignHead(team: any) {
		currentTeam = team;
		assignHeadForm = {
			departmentHeadId: team.departmentHead?.id || '',
			searchTerm: ''
		};
		showAssignHeadModal = true;
	}

	// Handle delete team
	async function handleDeleteTeam(team: any) {
		const hasEmployees = (team.employees?.totalCount || 0) > 0;
		const hasSubTeams = (team.subDepartments?.totalCount || 0) > 0;

		let confirmMessage = `Are you sure you want to delete "${team.name}"?`;
		if (hasEmployees || hasSubTeams) {
			confirmMessage += '\n\nWarning: This team has ';
			if (hasEmployees) confirmMessage += `${team.employees.totalCount} employees`;
			if (hasEmployees && hasSubTeams) confirmMessage += ' and ';
			if (hasSubTeams) confirmMessage += `${team.subDepartments.totalCount} sub-teams`;
			confirmMessage += '. You should reassign them first.';
		}

		if (!confirm(confirmMessage)) return;

		try {
			const result = await deleteTeam({
				input: { id: team.id }
			});

			if (result.data) {
				toast.success('Team deleted successfully');
				teams.reexecute();
			}
		} catch (error) {
			toast.error('Failed to delete team');
		}
	}

	// Submit team form
	async function submitTeamForm() {
		try {
			if (currentTeam) {
				// Update existing team
				const result = await updateTeam({
					input: {
						id: currentTeam.id,
						patch: {
							name: teamForm.name,
							description: teamForm.description,
							parentDepartmentId: teamForm.parentDepartmentId || null,
							departmentHeadId: teamForm.departmentHeadId || null
						}
					}
				});

				if (result.data) {
					toast.success('Team updated successfully');
					closeModals();
					teams.reexecute();
				}
			} else {
				// Create new team
				const result = await createTeam({
					input: {
						department: {
							name: teamForm.name,
							description: teamForm.description,
							parentDepartmentId: teamForm.parentDepartmentId || undefined,
							departmentHeadId: teamForm.departmentHeadId || undefined
						}
					}
				});

				if (result.data) {
					toast.success('Team created successfully');
					closeModals();
					teams.reexecute();
				}
			}
		} catch (error) {
			toast.error(currentTeam ? 'Failed to update team' : 'Failed to create team');
		}
	}

	// Submit assign head form
	async function submitAssignHead() {
		try {
			const result = await assignHead({
				input: {
					id: currentTeam.id,
					patch: {
						departmentHeadId: assignHeadForm.departmentHeadId || null
					}
				}
			});

			if (result.data) {
				toast.success('Department head assigned successfully');
				closeModals();
				teams.reexecute();
			}
		} catch (error) {
			toast.error('Failed to assign department head');
		}
	}

	// Close modals
	function closeModals() {
		showCreateModal = false;
		showEditModal = false;
		showViewModal = false;
		showAssignHeadModal = false;
		showMoveEmployeeModal = false;
		currentTeam = null;
	}

	// Apply filters
	function applyFilters() {
		currentPage = 1;
		teams.reexecute();
	}

	// Clear filters
	function clearFilters() {
		sizeFilter = 'all';
		headFilter = 'all';
		parentFilter = 'all';
		searchQuery = '';
		applyFilters();
	}

	// Handle row click
	function handleRowClick(event: CustomEvent) {
		const row = event.detail;
		const target = event.target as HTMLElement;

		// Check which action button was clicked
		if (target.closest('[data-testid="view-team"]')) {
			handleViewTeam(row);
		} else if (target.closest('[data-testid="assign-head"]')) {
			handleAssignHead(row);
		} else if (target.closest('[data-testid="edit-team"]')) {
			handleEditTeam(row);
		} else if (target.closest('[data-testid="delete-team"]')) {
			handleDeleteTeam(row);
		}
	}

	// Calculate team statistics
	$: teamStats = $teams.data?.departments?.nodes
		? calculateTeamStats($teams.data.departments.nodes)
		: {
				totalTeams: 0,
				totalEmployees: 0,
				activeEmployees: 0,
				teamsWithHeads: 0,
				averageTeamSize: 0,
				sizeDistribution: [],
				utilizationRate: 0
			};
</script>

<div class="container mx-auto px-4 py-8">
	<!-- Page Header -->
	<div class="mb-6 flex items-center justify-between">
		<div>
			<h1 class="text-3xl font-bold text-gray-900">Teams Administration</h1>
			<p class="mt-2 text-gray-600">Manage departments, assign heads, and organize your teams</p>
		</div>
		<div class="flex gap-2">
			<div class="flex rounded-lg border border-gray-300">
				<button
					onclick={() => (viewMode = 'table')}
					class="px-3 py-2 text-sm {viewMode === 'table'
						? 'border-blue-200 bg-blue-50 text-blue-700'
						: 'text-gray-600 hover:text-gray-900'}"
					data-testid="table-view"
				>
					Table View
				</button>
				<button
					onclick={() => (viewMode = 'hierarchy')}
					class="border-l px-3 py-2 text-sm {viewMode === 'hierarchy'
						? 'border-blue-200 bg-blue-50 text-blue-700'
						: 'text-gray-600 hover:text-gray-900'}"
					data-testid="hierarchy-view"
				>
					Hierarchy
				</button>
			</div>
			<button
				onclick={handleCreateTeam}
				class="flex items-center gap-2 rounded-md bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
				data-testid="create-team"
			>
				<Plus class="h-4 w-4" />
				Create Team
			</button>
		</div>
	</div>

	<!-- Team Statistics -->
	<div
		class="mb-8 grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4"
		data-testid="team-statistics"
	>
		<div class="rounded-lg bg-white p-6 shadow">
			<div class="flex items-center justify-between">
				<div>
					<p class="text-sm font-medium text-gray-600">Total Teams</p>
					<p class="text-2xl font-bold text-gray-900">{teamStats.totalTeams}</p>
					<p class="text-sm text-blue-600">{teamStats.teamsWithHeads} with heads</p>
				</div>
				<div class="rounded-full bg-blue-100 p-3">
					<Building class="h-6 w-6 text-blue-600" />
				</div>
			</div>
		</div>

		<div class="rounded-lg bg-white p-6 shadow">
			<div class="flex items-center justify-between">
				<div>
					<p class="text-sm font-medium text-gray-600">Total Employees</p>
					<p class="text-2xl font-bold text-gray-900">{teamStats.totalEmployees}</p>
					<p class="text-sm text-green-600">{teamStats.activeEmployees} active</p>
				</div>
				<div class="rounded-full bg-green-100 p-3">
					<Users class="h-6 w-6 text-green-600" />
				</div>
			</div>
		</div>

		<div class="rounded-lg bg-white p-6 shadow">
			<div class="flex items-center justify-between">
				<div>
					<p class="text-sm font-medium text-gray-600">Average Team Size</p>
					<p class="text-2xl font-bold text-gray-900">{teamStats.averageTeamSize}</p>
					<p class="text-sm text-purple-600">employees per team</p>
				</div>
				<div class="rounded-full bg-purple-100 p-3">
					<UserCheck class="h-6 w-6 text-purple-600" />
				</div>
			</div>
		</div>

		<div class="rounded-lg bg-white p-6 shadow">
			<div class="flex items-center justify-between">
				<div>
					<p class="text-sm font-medium text-gray-600">Utilization Rate</p>
					<p class="text-2xl font-bold text-gray-900">{teamStats.utilizationRate}%</p>
					<p class="text-sm text-orange-600">active employees</p>
				</div>
				<div class="rounded-full bg-orange-100 p-3">
					<Crown class="h-6 w-6 text-orange-600" />
				</div>
			</div>
		</div>
	</div>

	{#if viewMode === 'table'}
		<!-- Filters Section -->
		<div class="mb-6 rounded-lg bg-white p-4 shadow">
			<div class="grid grid-cols-1 gap-4 md:grid-cols-4">
				<!-- Team Size Filter -->
				<div>
					<label for="size-filter" class="mb-1 block text-sm font-medium text-gray-700">
						Team Size
					</label>
					<select
						id="size-filter"
						bind:value={sizeFilter}
						class="w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:ring-blue-500"
						data-testid="size-filter"
					>
						<option value="all">All Sizes</option>
						{#each teamSizeCategories as size}
							<option value={size.value}>{size.label}</option>
						{/each}
					</select>
				</div>

				<!-- Department Head Filter -->
				<div>
					<label for="head-filter" class="mb-1 block text-sm font-medium text-gray-700">
						Department Head
					</label>
					<select
						id="head-filter"
						bind:value={headFilter}
						class="w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:ring-blue-500"
						data-testid="head-filter"
					>
						<option value="all">All Teams</option>
						<option value="with-head">With Head</option>
						<option value="without-head">Without Head</option>
					</select>
				</div>

				<!-- Parent Filter -->
				<div>
					<label for="parent-filter" class="mb-1 block text-sm font-medium text-gray-700">
						Team Level
					</label>
					<select
						id="parent-filter"
						bind:value={parentFilter}
						class="w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:ring-blue-500"
						data-testid="parent-filter"
					>
						<option value="all">All Levels</option>
						<option value="root">Root Teams</option>
						<option value="sub">Sub-teams</option>
					</select>
				</div>

				<!-- Search -->
				<div>
					<label for="search" class="mb-1 block text-sm font-medium text-gray-700">
						Search Teams
					</label>
					<input
						id="search"
						type="text"
						bind:value={searchQuery}
						placeholder="Search by name..."
						class="w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:ring-blue-500"
						data-testid="team-search"
					/>
				</div>
			</div>

			<!-- Filter Actions -->
			<div class="mt-4 flex gap-2">
				<button
					onclick={applyFilters}
					class="rounded-md bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
					data-testid="apply-filters"
				>
					Apply Filters
				</button>
				<button
					onclick={clearFilters}
					class="rounded-md border border-gray-300 px-4 py-2 hover:bg-gray-50"
					data-testid="clear-filters"
				>
					Clear Filters
				</button>
			</div>
		</div>

		<!-- Data Table -->
		<div class="rounded-lg bg-white shadow">
			<HrDataTable
				data={$teams.data?.departments?.nodes || []}
				{columns}
				loading={$teams.fetching}
				searchable={false}
				selectable={true}
				onSelectionChange={(selected) => (selectedTeams = selected)}
				onRowClick={handleRowClick}
				pagination={{
					page: currentPage,
					pageSize,
					total: $teams.data?.departments?.totalCount || 0,
					pageSizes: [10, 20, 50, 100]
				}}
				onPageChange={(page) => {
					currentPage = page;
					teams.reexecute();
				}}
				onPageSizeChange={(size) => {
					pageSize = size;
					currentPage = 1;
					teams.reexecute();
				}}
				emptyMessage="No teams found"
				testId="teams-table"
			/>
		</div>
	{:else}
		<!-- Hierarchy View -->
		<div class="rounded-lg bg-white p-6 shadow" data-testid="hierarchy-view">
			<h3 class="mb-4 text-lg font-semibold text-gray-900">Organization Hierarchy</h3>
			<div class="space-y-2">
				{#if $teams.data?.departments?.nodes}
					{@const hierarchy = buildTeamHierarchy($teams.data.departments.nodes)}
					{#each hierarchy as rootTeam}
						<div class="rounded-lg border p-4">
							<div class="flex items-center justify-between">
								<div class="flex items-center gap-3">
									<div class="rounded-lg bg-blue-100 p-2">
										<Building class="h-5 w-5 text-blue-600" />
									</div>
									<div>
										<h4 class="font-semibold text-gray-900">{rootTeam.name}</h4>
										<p class="text-sm text-gray-600">
											{rootTeam.employeeCount} employees • Level {rootTeam.level}
										</p>
									</div>
								</div>
								<div class="flex items-center gap-2">
									{#if rootTeam.departmentHead}
										<div class="flex items-center gap-1 text-sm text-yellow-600">
											<Crown class="h-4 w-4" />
											{rootTeam.departmentHead.displayName}
										</div>
									{/if}
									<span class="rounded bg-gray-100 px-2 py-1 text-xs text-gray-800">
										{rootTeam.children.length} sub-teams
									</span>
								</div>
							</div>

							{#if rootTeam.children.length > 0}
								<div class="ml-8 mt-4 space-y-2">
									{#each rootTeam.children as childTeam}
										<div class="flex items-center gap-3 rounded bg-gray-50 p-2">
											<ArrowRight class="h-4 w-4 text-gray-400" />
											<div class="rounded bg-green-100 p-1">
												<Building class="h-4 w-4 text-green-600" />
											</div>
											<div class="flex-1">
												<span class="font-medium">{childTeam.name}</span>
												<span class="ml-2 text-sm text-gray-500"
													>({childTeam.employeeCount} employees)</span
												>
											</div>
											{#if childTeam.departmentHead}
												<div class="flex items-center gap-1 text-sm text-yellow-600">
													<Crown class="h-3 w-3" />
													{childTeam.departmentHead.displayName}
												</div>
											{/if}
										</div>
									{/each}
								</div>
							{/if}
						</div>
					{/each}
				{/if}
			</div>
		</div>
	{/if}

	<!-- Export Component -->
	<DataExport data={$teams.data?.departments?.nodes || []} filename="teams" testId="export-csv" />
</div>

<!-- Create Team Modal -->
{#if showCreateModal}
	<div
		class="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50"
		data-testid="create-team-modal"
	>
		<div class="w-full max-w-2xl rounded-lg bg-white p-6">
			<div class="mb-4 flex items-center justify-between">
				<h2 class="text-xl font-bold" data-testid="modal-title">Create New Team</h2>
				<button onclick={closeModals} class="text-gray-400 hover:text-gray-600">
					<X class="h-6 w-6" />
				</button>
			</div>

			<form on:submit|preventDefault={submitTeamForm}>
				<div class="mb-4 grid grid-cols-1 gap-4 md:grid-cols-2">
					<div class="md:col-span-2">
						<label class="mb-1 block text-sm font-medium text-gray-700">Team Name *</label>
						<input
							type="text"
							bind:value={teamForm.name}
							required
							class="w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:ring-blue-500"
							data-testid="team-name"
							placeholder="Enter team name..."
						/>
					</div>
					<div>
						<label class="mb-1 block text-sm font-medium text-gray-700">Department Type</label>
						<select
							bind:value={teamForm.departmentType}
							class="w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:ring-blue-500"
							data-testid="department-type"
						>
							{#each departmentTypes as type}
								<option value={type.value}>{type.label}</option>
							{/each}
						</select>
					</div>
					<div>
						<label class="mb-1 block text-sm font-medium text-gray-700"
							>Parent Team (Optional)</label
						>
						<input
							type="text"
							bind:value={teamForm.parentDepartmentId}
							class="w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:ring-blue-500"
							data-testid="parent-team"
							placeholder="Parent team ID"
						/>
					</div>
				</div>

				<div class="mb-4">
					<label class="mb-1 block text-sm font-medium text-gray-700">Description</label>
					<textarea
						bind:value={teamForm.description}
						rows="3"
						class="w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:ring-blue-500"
						data-testid="team-description"
						placeholder="Describe the team's purpose and responsibilities..."
					></textarea>
				</div>

				<div class="mb-4">
					<label class="mb-1 block text-sm font-medium text-gray-700"
						>Department Head (Optional)</label
					>
					<input
						type="text"
						bind:value={teamForm.departmentHeadId}
						class="w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:ring-blue-500"
						data-testid="department-head-id"
						placeholder="Employee ID for department head"
					/>
				</div>

				<div class="flex justify-end gap-2">
					<button
						type="button"
						onclick={closeModals}
						class="rounded-md border border-gray-300 px-4 py-2 hover:bg-gray-50"
					>
						Cancel
					</button>
					<button
						type="submit"
						class="rounded-md bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
						data-testid="submit-team"
					>
						Create Team
					</button>
				</div>
			</form>
		</div>
	</div>
{/if}

<!-- Assign Department Head Modal -->
{#if showAssignHeadModal && currentTeam}
	<div
		class="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50"
		data-testid="assign-head-modal"
	>
		<div class="w-full max-w-md rounded-lg bg-white p-6">
			<div class="mb-4 flex items-center justify-between">
				<h2 class="text-xl font-bold" data-testid="modal-title">Assign Department Head</h2>
				<button onclick={closeModals} class="text-gray-400 hover:text-gray-600">
					<X class="h-6 w-6" />
				</button>
			</div>

			<div class="mb-4">
				<h3 class="mb-2 font-medium text-gray-900">{currentTeam.name}</h3>
				<p class="text-sm text-gray-600">
					{currentTeam.employees?.totalCount || 0} employees
				</p>
			</div>

			<form on:submit|preventDefault={submitAssignHead}>
				<div class="mb-4">
					<label class="mb-1 block text-sm font-medium text-gray-700">Employee ID *</label>
					<input
						type="text"
						bind:value={assignHeadForm.departmentHeadId}
						required
						class="w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:ring-blue-500"
						data-testid="head-employee-id"
						placeholder="Enter employee ID"
					/>
				</div>

				<div class="mb-4">
					<label class="mb-1 block text-sm font-medium text-gray-700">Search Employee</label>
					<input
						type="text"
						bind:value={assignHeadForm.searchTerm}
						class="w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:ring-blue-500"
						data-testid="search-employee"
						placeholder="Search by name or email"
					/>
				</div>

				<div class="flex justify-end gap-2">
					<button
						type="button"
						onclick={closeModals}
						class="rounded-md border border-gray-300 px-4 py-2 hover:bg-gray-50"
					>
						Cancel
					</button>
					<button
						type="submit"
						class="rounded-md bg-purple-600 px-4 py-2 text-white hover:bg-purple-700"
						data-testid="submit-assign-head"
					>
						Assign Head
					</button>
				</div>
			</form>
		</div>
	</div>
{/if}

<!-- View Team Modal -->
{#if showViewModal && currentTeam}
	<div
		class="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50"
		data-testid="view-team-modal"
	>
		<div class="max-h-[90vh] w-full max-w-4xl overflow-y-auto rounded-lg bg-white p-6">
			<div class="mb-6 flex items-center justify-between">
				<div>
					<h2 class="text-xl font-bold" data-testid="modal-title">{currentTeam.name}</h2>
					<p class="text-gray-600">{getDepartmentTypeInfo(currentTeam.name).label} Department</p>
				</div>
				<button onclick={closeModals} class="text-gray-400 hover:text-gray-600">
					<X class="h-6 w-6" />
				</button>
			</div>

			<div class="space-y-6" data-testid="team-details">
				<!-- Team Overview -->
				<div class="grid grid-cols-1 gap-4 md:grid-cols-3">
					<div class="text-center">
						<p class="text-sm text-gray-600">Total Employees</p>
						<p class="text-2xl font-bold text-blue-600">{currentTeam.employees?.totalCount || 0}</p>
					</div>
					<div class="text-center">
						<p class="text-sm text-gray-600">Active Employees</p>
						<p class="text-2xl font-bold text-green-600">
							{currentTeam.activeEmployees?.totalCount || 0}
						</p>
					</div>
					<div class="text-center">
						<p class="text-sm text-gray-600">Sub-teams</p>
						<p class="text-2xl font-bold text-purple-600">
							{currentTeam.subDepartments?.totalCount || 0}
						</p>
					</div>
				</div>

				<!-- Department Head -->
				{#if currentTeam.departmentHead}
					<div>
						<h4 class="mb-3 font-medium text-gray-900">Department Head</h4>
						<div class="flex items-center gap-3 rounded-lg bg-yellow-50 p-3">
							<Crown class="h-6 w-6 text-yellow-600" />
							<div>
								<p class="font-medium">{currentTeam.departmentHead.displayName}</p>
								<p class="text-sm text-gray-600">{currentTeam.departmentHead.jobTitle}</p>
								<p class="text-sm text-gray-500">{currentTeam.departmentHead.email}</p>
							</div>
						</div>
					</div>
				{:else}
					<div>
						<h4 class="mb-3 font-medium text-gray-900">Department Head</h4>
						<div class="rounded-lg bg-gray-50 p-3 text-center">
							<p class="text-gray-500">No department head assigned</p>
						</div>
					</div>
				{/if}

				<!-- Description -->
				{#if currentTeam.description}
					<div>
						<h4 class="mb-2 font-medium text-gray-900">Description</h4>
						<p class="rounded-md bg-gray-50 p-3 text-gray-700">{currentTeam.description}</p>
					</div>
				{/if}

				<!-- Team Statistics -->
				<div>
					<h4 class="mb-3 font-medium text-gray-900">Team Statistics</h4>
					<div class="grid grid-cols-2 gap-3 md:grid-cols-4">
						<div class="rounded-lg bg-blue-50 p-3 text-center">
							<p class="text-xs uppercase text-blue-600">Team Size</p>
							<p class="text-lg font-bold text-blue-900">
								{categorizeTeamSize(currentTeam.employees?.totalCount || 0).label}
							</p>
						</div>
						<div class="rounded-lg bg-green-50 p-3 text-center">
							<p class="text-xs uppercase text-green-600">Utilization</p>
							<p class="text-lg font-bold text-green-900">
								{Math.round(
									((currentTeam.activeEmployees?.totalCount || 0) /
										Math.max(currentTeam.employees?.totalCount || 1, 1)) *
										100
								)}%
							</p>
						</div>
						<div class="rounded-lg bg-purple-50 p-3 text-center">
							<p class="text-xs uppercase text-purple-600">Sub-teams</p>
							<p class="text-lg font-bold text-purple-900">
								{currentTeam.subDepartments?.totalCount || 0}
							</p>
						</div>
						<div class="rounded-lg bg-orange-50 p-3 text-center">
							<p class="text-xs uppercase text-orange-600">Level</p>
							<p class="text-lg font-bold text-orange-900">
								{currentTeam.parentDepartmentId ? 'Sub' : 'Root'}
							</p>
						</div>
					</div>
				</div>
			</div>

			<div class="mt-6 flex justify-between">
				<div class="flex gap-2">
					<button
						onclick={() => {
							closeModals();
							handleAssignHead(currentTeam);
						}}
						class="rounded-md bg-purple-600 px-4 py-2 text-white hover:bg-purple-700"
					>
						Assign Head
					</button>
					<button
						onclick={() => {
							closeModals();
							handleEditTeam(currentTeam);
						}}
						class="rounded-md bg-green-600 px-4 py-2 text-white hover:bg-green-700"
					>
						Edit Team
					</button>
				</div>
				<button
					onclick={closeModals}
					class="rounded-md bg-gray-600 px-4 py-2 text-white hover:bg-gray-700"
				>
					Close
				</button>
			</div>
		</div>
	</div>
{/if}

<!-- Success/Error Notifications (handled by svelte-sonner toast) -->
<div data-testid="success-notification" class="hidden"></div>
<div data-testid="access-denied" class="hidden"></div>
<div data-testid="empty-state" class="hidden"></div>
