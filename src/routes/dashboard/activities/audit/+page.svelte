<script lang="ts">
	// Audit Logs Page (Admin Only)
	// Feature: 019-we-need-to - Task T031
	// Purpose: Display system-wide activity logs for administrators

	import type { PageData } from './$types';
	import ActivityFeed from '$lib/components/activities/ActivityFeed.svelte';
	import { goto } from '$app/navigation';
	import { page } from '$app/stores';
	import type { ActivityAction, ResourceType } from '$lib/graphql/types';

	const { data }: { data: PageData } = $props();

	// Filter state
	let selectedEmployee = $state(data.filters.employeeId || '');
	let selectedAction = $state<ActivityAction | 'all'>(data.filters.action || 'all');
	let selectedResourceType = $state<ResourceType | 'all'>(data.filters.resourceType || 'all');
	let selectedDaysBack = $state(data.filters.daysBack || 7);
	let searchQuery = $state(data.filters.searchQuery || '');

	// Handle activity click (navigate to related resource)
	function handleActivityClick(activity: any) {
		if (activity.relatedResourceId && activity.relatedResourceType) {
			const resourceMap: Record<string, string> = {
				event: '/dashboard/events',
				task: '/dashboard/tasks',
				leave_request: '/dashboard/leave',
				performance_review: '/dashboard/reviews',
				employee: '/dashboard/employees',
				department: '/dashboard/departments'
			};

			const basePath = resourceMap[activity.relatedResourceType];
			if (basePath) {
				goto(`${basePath}/${activity.relatedResourceId}`);
			}
		}
	}

	// Apply filters
	function applyFilters() {
		const params = new URLSearchParams($page.url.searchParams);

		if (selectedEmployee) {
			params.set('employee', selectedEmployee);
		} else {
			params.delete('employee');
		}

		if (selectedAction !== 'all') {
			params.set('action', selectedAction);
		} else {
			params.delete('action');
		}

		if (selectedResourceType !== 'all') {
			params.set('resourceType', selectedResourceType);
		} else {
			params.delete('resourceType');
		}

		params.set('days', selectedDaysBack.toString());

		if (searchQuery) {
			params.set('search', searchQuery);
		} else {
			params.delete('search');
		}

		params.set('page', '1'); // Reset to first page

		goto(`?${params.toString()}`, { replaceState: true });
	}

	// Search handler
	function handleSearch(event: Event) {
		event.preventDefault();
		applyFilters();
	}

	// Export to CSV (basic implementation)
	function exportToCsv() {
		// Create CSV header
		const headers = ['Timestamp', 'Employee', 'Action', 'Resource Type', 'Resource ID', 'Details'];
		const csvRows = [headers.join(',')];

		// Add data rows
		data.logs.forEach((log: any) => {
			const row = [
				log.createdAt,
				log.employeeName || 'Unknown',
				log.action,
				log.resourceType,
				log.resourceId || '',
				JSON.stringify(log.details || {}).replace(/,/g, ';') // Escape commas in JSON
			];
			csvRows.push(row.join(','));
		});

		// Create blob and download
		const csvContent = csvRows.join('\n');
		const blob = new Blob([csvContent], { type: 'text/csv' });
		const url = window.URL.createObjectURL(blob);
		const a = document.createElement('a');
		a.href = url;
		a.download = `audit-logs-${new Date().toISOString().split('T')[0]}.csv`;
		a.click();
		window.URL.revokeObjectURL(url);
	}

	// Pagination
	function goToPage(pageNum: number) {
		const params = new URLSearchParams($page.url.searchParams);
		params.set('page', pageNum.toString());
		goto(`?${params.toString()}`);
	}
</script>

<svelte:head>
	<title>Audit Logs - MountainHR</title>
	<meta name="description" content="System-wide activity audit logs" />
</svelte:head>

<div class="container mx-auto max-w-7xl px-4 py-8">
	<!-- Page Header with Export Button -->
	<div class="mb-8 flex items-center justify-between">
		<div>
			<h1 class="text-3xl font-bold text-gray-900">Audit Logs</h1>
			<p class="mt-2 text-gray-600">System-wide activity logs for administrators</p>
		</div>

		<button
			type="button"
			onclick={exportToCsv}
			class="inline-flex items-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:outline-none"
		>
			<svg
				class="mr-2 h-5 w-5"
				fill="none"
				stroke="currentColor"
				viewBox="0 0 24 24"
				xmlns="http://www.w3.org/2000/svg"
			>
				<path
					stroke-linecap="round"
					stroke-linejoin="round"
					stroke-width="2"
					d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
				></path>
			</svg>
			Export CSV
		</button>
	</div>

	<!-- Search Bar -->
	<div class="mb-6">
		<form onsubmit={handleSearch} class="flex gap-2">
			<input
				type="text"
				bind:value={searchQuery}
				placeholder="Search by resource ID or description..."
				class="flex-1 rounded-md border border-gray-300 px-4 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none"
			/>
			<button
				type="submit"
				class="rounded-md bg-blue-600 px-6 py-2 text-sm font-medium text-white hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:outline-none"
			>
				Search
			</button>
		</form>
	</div>

	<!-- Filters and Controls -->
	<div class="mb-6 rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
		<div class="flex flex-wrap items-end gap-4">
			<!-- Employee Filter -->
			<div class="min-w-[200px] flex-1">
				<label for="employee-filter" class="mb-1 block text-sm font-medium text-gray-700">
					Employee
				</label>
				<select
					id="employee-filter"
					bind:value={selectedEmployee}
					onchange={applyFilters}
					class="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none"
				>
					<option value="">All Employees</option>
					{#each data.employees as employee}
						<option value={employee.id}>{employee.name}</option>
					{/each}
				</select>
			</div>

			<!-- Action Filter -->
			<div class="min-w-[200px] flex-1">
				<label for="action-filter" class="mb-1 block text-sm font-medium text-gray-700">
					Action
				</label>
				<select
					id="action-filter"
					bind:value={selectedAction}
					onchange={applyFilters}
					class="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none"
				>
					<option value="all">All Actions</option>
					<option value="create">Create</option>
					<option value="update">Update</option>
					<option value="delete">Delete</option>
					<option value="view">View</option>
					<option value="login">Login</option>
					<option value="logout">Logout</option>
				</select>
			</div>

			<!-- Resource Type Filter -->
			<div class="min-w-[200px] flex-1">
				<label for="resource-filter" class="mb-1 block text-sm font-medium text-gray-700">
					Resource Type
				</label>
				<select
					id="resource-filter"
					bind:value={selectedResourceType}
					onchange={applyFilters}
					class="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none"
				>
					<option value="all">All Resources</option>
					<option value="event">Event</option>
					<option value="task">Task</option>
					<option value="leave_request">Leave Request</option>
					<option value="profile">Profile</option>
					<option value="document">Document</option>
					<option value="employee">Employee</option>
					<option value="department">Department</option>
					<option value="performance_review">Performance Review</option>
					<option value="notification">Notification</option>
					<option value="system">System</option>
				</select>
			</div>

			<!-- Time Range Filter -->
			<div class="min-w-[200px] flex-1">
				<label for="days-filter" class="mb-1 block text-sm font-medium text-gray-700">
					Time Range
				</label>
				<select
					id="days-filter"
					bind:value={selectedDaysBack}
					onchange={applyFilters}
					class="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none"
				>
					<option value="1">Last 24 hours</option>
					<option value="7">Last 7 days</option>
					<option value="30">Last 30 days</option>
					<option value="90">Last 90 days</option>
					<option value="365">Last year</option>
				</select>
			</div>

			<!-- Reset Filters Button -->
			<div>
				<button
					type="button"
					onclick={() => goto('/dashboard/activities/audit')}
					class="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:outline-none"
				>
					Reset
				</button>
			</div>
		</div>
	</div>

	<!-- Statistics Summary -->
	<div class="mb-6 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
		<div class="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
			<div class="text-2xl font-bold text-gray-900">{data.statistics.total}</div>
			<div class="text-sm text-gray-600">Total</div>
		</div>

		<div class="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
			<div class="text-2xl font-bold text-green-600">{data.statistics.creates}</div>
			<div class="text-sm text-gray-600">Creates</div>
		</div>

		<div class="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
			<div class="text-2xl font-bold text-blue-600">{data.statistics.updates}</div>
			<div class="text-sm text-gray-600">Updates</div>
		</div>

		<div class="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
			<div class="text-2xl font-bold text-red-600">{data.statistics.deletes}</div>
			<div class="text-sm text-gray-600">Deletes</div>
		</div>

		<div class="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
			<div class="text-2xl font-bold text-purple-600">{data.statistics.views}</div>
			<div class="text-sm text-gray-600">Views</div>
		</div>

		<div class="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
			<div class="text-2xl font-bold text-indigo-600">{data.statistics.logins}</div>
			<div class="text-sm text-gray-600">Logins</div>
		</div>
	</div>

	<!-- Activity Feed -->
	<div class="mb-6">
		<ActivityFeed
			activities={data.logs}
			onActivityClick={handleActivityClick}
			groupByDate={true}
			showUserInfo={true}
			showTimestamps={true}
			compact={false}
			emptyMessage="No audit logs found for the selected filters"
		/>
	</div>

	<!-- Pagination -->
	{#if data.totalCount > data.limit}
		<div
			class="flex items-center justify-between border-t border-gray-200 bg-white px-4 py-3 sm:px-6"
		>
			<div class="flex flex-1 justify-between sm:hidden">
				<button
					type="button"
					disabled={data.currentPage === 1}
					onclick={() => goToPage(data.currentPage - 1)}
					class="relative inline-flex items-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
				>
					Previous
				</button>
				<button
					type="button"
					disabled={!data.hasNextPage}
					onclick={() => goToPage(data.currentPage + 1)}
					class="relative ml-3 inline-flex items-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
				>
					Next
				</button>
			</div>

			<div class="hidden sm:flex sm:flex-1 sm:items-center sm:justify-between">
				<div>
					<p class="text-sm text-gray-700">
						Showing
						<span class="font-medium">{(data.currentPage - 1) * data.limit + 1}</span>
						to
						<span class="font-medium"
							>{Math.min(data.currentPage * data.limit, data.totalCount)}</span
						>
						of
						<span class="font-medium">{data.totalCount}</span>
						logs
					</p>
				</div>

				<div>
					<nav class="isolate inline-flex -space-x-px rounded-md shadow-sm" aria-label="Pagination">
						<button
							type="button"
							disabled={data.currentPage === 1}
							onclick={() => goToPage(data.currentPage - 1)}
							class="relative inline-flex items-center rounded-l-md px-2 py-2 text-gray-400 ring-1 ring-gray-300 ring-inset hover:bg-gray-50 focus:z-20 focus:outline-offset-0 disabled:cursor-not-allowed disabled:opacity-50"
						>
							<span class="sr-only">Previous</span>
							<svg class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
								<path
									fill-rule="evenodd"
									d="M12.79 5.23a.75.75 0 01-.02 1.06L8.832 10l3.938 3.71a.75.75 0 11-1.04 1.08l-4.5-4.25a.75.75 0 010-1.08l4.5-4.25a.75.75 0 011.06.02z"
									clip-rule="evenodd"
								/>
							</svg>
						</button>

						<span
							class="relative inline-flex items-center px-4 py-2 text-sm font-semibold text-gray-900 ring-1 ring-gray-300 ring-inset"
						>
							Page {data.currentPage}
						</span>

						<button
							type="button"
							disabled={!data.hasNextPage}
							onclick={() => goToPage(data.currentPage + 1)}
							class="relative inline-flex items-center rounded-r-md px-2 py-2 text-gray-400 ring-1 ring-gray-300 ring-inset hover:bg-gray-50 focus:z-20 focus:outline-offset-0 disabled:cursor-not-allowed disabled:opacity-50"
						>
							<span class="sr-only">Next</span>
							<svg class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
								<path
									fill-rule="evenodd"
									d="M7.21 14.77a.75.75 0 01.02-1.06L11.168 10 7.23 6.29a.75.75 0 111.04-1.08l4.5 4.25a.75.75 0 010 1.08l-4.5 4.25a.75.75 0 01-1.06-.02z"
									clip-rule="evenodd"
								/>
							</svg>
						</button>
					</nav>
				</div>
			</div>
		</div>
	{/if}
</div>
