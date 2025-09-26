<!--
T042: Fix reports management pages with standardized error handling
Modern Svelte 5 implementation with server-side data loading, comprehensive analytics, and RBAC integration
-->

<script lang="ts">
	import { page } from '$app/stores';
	import { goto } from '$app/navigation';
	import { FileText, BarChart3, Calendar, Clock, Plus, Download, Eye, RotateCcw, Trash2, Search, Filter, X } from 'lucide-svelte';
	import type { HRReport, ReportAnalytics } from '$lib/graphql/reports-operations';
	import { REPORT_TYPES, REPORT_CATEGORIES, REPORT_STATUSES } from '$lib/graphql/reports-operations';

	// Define props interface
	interface Props {
		data: {
			user: any;
			userSession: any;
			reports: HRReport[];
			totalReports: number;
			reportAnalytics: ReportAnalytics;
			filters: {
				searchTerm: string;
				typeFilter: string;
				categoryFilter: string;
				statusFilter: string;
				departmentFilter: string;
				page: number;
				limit: number;
			};
			permissions: string[];
			canCreateReports: boolean;
			canEditReports: boolean;
			canRunReports: boolean;
			canViewAnalytics: boolean;
			loadedAt: string;
		};
	}

	// Destructure props using Svelte 5 runes
	let { data }: Props = $props();

	// Derived state from server-side data
	const reports = $derived(data.reports);
	const reportAnalytics = $derived(data.reportAnalytics);
	const filters = $derived(data.filters);

	// Local reactive state using Svelte 5 runes
	let activeTab = $state('reports');
	let selectedReports = $state<string[]>([]);
	let showCreateModal = $state(false);
	let showRunModal = $state(false);
	let showViewModal = $state(false);
	let selectedReport = $state<HRReport | null>(null);

	// Filter state
	let searchQuery = $state(filters.searchTerm || '');
	let typeFilter = $state(filters.typeFilter || '');
	let categoryFilter = $state(filters.categoryFilter || '');
	let statusFilter = $state(filters.statusFilter || '');
	let departmentFilter = $state(filters.departmentFilter || '');

	// Create report form state
	let createForm = $state({
		title: '',
		description: '',
		reportType: 'employee' as any,
		category: 'operational' as any,
		visibility: 'department' as any,
		outputFormat: 'pdf' as any,
		schedule: '',
		recipients: [] as string[],
		parameters: {}
	});

	// Run report form state
	let runForm = $state({
		reportId: '',
		parameters: {}
	});

	// Statistics cards derived from analytics
	const statsCards = $derived([
		{
			title: 'Total Reports',
			value: reportAnalytics.summary.totalReports,
			icon: FileText,
			color: 'blue',
			description: 'All reports in system'
		},
		{
			title: 'Active Reports',
			value: reportAnalytics.summary.activeReports,
			icon: BarChart3,
			color: 'green',
			description: 'Currently active reports'
		},
		{
			title: 'Generated Today',
			value: reportAnalytics.summary.generatedToday,
			icon: Calendar,
			color: 'purple',
			description: 'Reports generated today'
		},
		{
			title: 'Avg Run Time',
			value: `${reportAnalytics.summary.avgRunTime}s`,
			icon: Clock,
			color: 'orange',
			description: 'Average execution time'
		}
	]);

	// Table configuration
	const tableColumns = [
		{ key: 'title', label: 'Report', sortable: true },
		{ key: 'reportType', label: 'Type', sortable: false },
		{ key: 'category', label: 'Category', sortable: false },
		{ key: 'status', label: 'Status', sortable: true },
		{ key: 'department', label: 'Department', sortable: false },
		{ key: 'generatedCount', label: 'Runs', sortable: true },
		{ key: 'lastRunAt', label: 'Last Run', sortable: true },
		{ key: 'actions', label: 'Actions', sortable: false }
	];

	// Functions
	function handleCreateReport() {
		createForm = {
			title: '',
			description: '',
			reportType: 'employee',
			category: 'operational',
			visibility: 'department',
			outputFormat: 'pdf',
			schedule: '',
			recipients: [],
			parameters: {}
		};
		showCreateModal = true;
	}

	function handleRunReport(report: HRReport) {
		selectedReport = report;
		runForm.reportId = report.id;
		runForm.parameters = {};
		showRunModal = true;
	}

	function handleViewReport(report: HRReport) {
		selectedReport = report;
		showViewModal = true;
	}

	function handleDownloadReport(report: HRReport) {
		// Simulate report download
		const link = document.createElement('a');
		link.href = `/api/reports/${report.id}/download`;
		link.download = `${report.title}.${report.outputFormat}`;
		document.body.appendChild(link);
		link.click();
		document.body.removeChild(link);
	}

	function closeModals() {
		showCreateModal = false;
		showRunModal = false;
		showViewModal = false;
		selectedReport = null;
	}

	function applyFilters() {
		const searchParams = new URLSearchParams($page.url.searchParams);

		if (searchQuery) searchParams.set('search', searchQuery);
		else searchParams.delete('search');

		if (typeFilter) searchParams.set('type', typeFilter);
		else searchParams.delete('type');

		if (categoryFilter) searchParams.set('category', categoryFilter);
		else searchParams.delete('category');

		if (statusFilter) searchParams.set('status', statusFilter);
		else searchParams.delete('status');

		if (departmentFilter) searchParams.set('department', departmentFilter);
		else searchParams.delete('department');

		searchParams.set('page', '1'); // Reset to first page

		goto(`${$page.url.pathname}?${searchParams.toString()}`, { invalidateAll: true });
	}

	function clearFilters() {
		searchQuery = '';
		typeFilter = '';
		categoryFilter = '';
		statusFilter = '';
		departmentFilter = '';

		goto($page.url.pathname, { invalidateAll: true });
	}

	function toggleReportSelection(reportId: string) {
		if (selectedReports.includes(reportId)) {
			selectedReports = selectedReports.filter(id => id !== reportId);
		} else {
			selectedReports = [...selectedReports, reportId];
		}
	}

	function selectAllReports() {
		if (selectedReports.length === reports.length) {
			selectedReports = [];
		} else {
			selectedReports = reports.map(report => report.id);
		}
	}

	function formatDate(dateString: string | null) {
		if (!dateString) return 'Never';
		return new Date(dateString).toLocaleDateString('en-US', {
			month: 'short',
			day: 'numeric',
			year: 'numeric',
			hour: '2-digit',
			minute: '2-digit'
		});
	}

	function getStatusBadge(status: string) {
		const statusMap = {
			active: { label: 'Active', color: 'bg-green-100 text-green-800' },
			draft: { label: 'Draft', color: 'bg-gray-100 text-gray-800' },
			scheduled: { label: 'Scheduled', color: 'bg-blue-100 text-blue-800' },
			archived: { label: 'Archived', color: 'bg-red-100 text-red-800' }
		};
		return statusMap[status as keyof typeof statusMap] || { label: status, color: 'bg-gray-100 text-gray-800' };
	}

	function getTypeBadge(type: string) {
		const typeMap = {
			employee: { label: 'Employee', color: 'bg-purple-100 text-purple-800' },
			payroll: { label: 'Payroll', color: 'bg-green-100 text-green-800' },
			performance: { label: 'Performance', color: 'bg-blue-100 text-blue-800' },
			attendance: { label: 'Attendance', color: 'bg-orange-100 text-orange-800' },
			compliance: { label: 'Compliance', color: 'bg-red-100 text-red-800' },
			custom: { label: 'Custom', color: 'bg-gray-100 text-gray-800' }
		};
		return typeMap[type as keyof typeof typeMap] || { label: type, color: 'bg-gray-100 text-gray-800' };
	}
</script>

<!-- Page Header -->
<div class="mb-8">
	<div class="flex items-center justify-between">
		<div>
			<h1 class="text-3xl font-bold text-gray-900">Reports Management</h1>
			<p class="mt-2 text-gray-600">Generate, manage, and schedule HR reports</p>
		</div>
		{#if data.canCreateReports}
			<button
				onclick={handleCreateReport}
				class="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
			>
				<Plus class="w-5 h-5" />
				Create Report
			</button>
		{/if}
	</div>
</div>

<!-- Tab Navigation -->
<div class="border-b border-gray-200 mb-6">
	<nav class="flex space-x-8">
		<button
			onclick={() => activeTab = 'reports'}
			class="py-2 px-1 border-b-2 font-medium text-sm {activeTab === 'reports'
				? 'border-blue-500 text-blue-600'
				: 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}"
		>
			<FileText class="w-4 h-4 inline mr-2" />
			Reports
		</button>
		{#if data.canViewAnalytics}
			<button
				onclick={() => activeTab = 'analytics'}
				class="py-2 px-1 border-b-2 font-medium text-sm {activeTab === 'analytics'
					? 'border-blue-500 text-blue-600'
					: 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}"
			>
				<BarChart3 class="w-4 h-4 inline mr-2" />
				Analytics
			</button>
		{/if}
	</nav>
</div>

{#if activeTab === 'reports'}
	<!-- Statistics Cards -->
	<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
		{#each statsCards as card}
			<div class="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
				<div class="flex items-center justify-between">
					<div>
						<p class="text-sm font-medium text-gray-600">{card.title}</p>
						<p class="text-2xl font-bold text-gray-900">{card.value}</p>
						<p class="text-xs text-gray-500 mt-1">{card.description}</p>
					</div>
					<div class="p-3 bg-{card.color}-100 rounded-lg">
						<svelte:component this={card.icon} class="w-6 h-6 text-{card.color}-600" />
					</div>
				</div>
			</div>
		{/each}
	</div>

	<!-- Filters -->
	<div class="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-8">
		<div class="flex items-center gap-4 mb-4">
			<div class="flex-1">
				<label for="search" class="sr-only">Search reports</label>
				<div class="relative">
					<Search class="w-5 h-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
					<input
						id="search"
						type="text"
						bind:value={searchQuery}
						placeholder="Search reports..."
						class="pl-10 pr-4 py-2 w-full border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
					/>
				</div>
			</div>
			<select
				bind:value={typeFilter}
				class="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
			>
				<option value="">All Types</option>
				{#each REPORT_TYPES as type}
					<option value={type.value}>{type.label}</option>
				{/each}
			</select>
			<select
				bind:value={categoryFilter}
				class="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
			>
				<option value="">All Categories</option>
				{#each REPORT_CATEGORIES as category}
					<option value={category.value}>{category.label}</option>
				{/each}
			</select>
			<select
				bind:value={statusFilter}
				class="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
			>
				<option value="">All Statuses</option>
				{#each REPORT_STATUSES as status}
					<option value={status.value}>{status.label}</option>
				{/each}
			</select>
		</div>

		<div class="flex items-center justify-between">
			<div class="flex gap-2">
				<button
					onclick={applyFilters}
					class="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
				>
					<Filter class="w-4 h-4" />
					Apply Filters
				</button>
				<button
					onclick={clearFilters}
					class="inline-flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
				>
					<X class="w-4 h-4" />
					Clear
				</button>
			</div>

			{#if selectedReports.length > 0}
				<div class="flex items-center gap-4">
					<span class="text-sm text-gray-600">{selectedReports.length} selected</span>
					<div class="flex gap-2">
						{#if data.canRunReports}
							<button class="px-3 py-1 bg-green-600 text-white rounded text-sm hover:bg-green-700">
								Run Selected
							</button>
						{/if}
						<button class="px-3 py-1 bg-red-600 text-white rounded text-sm hover:bg-red-700">
							Delete Selected
						</button>
					</div>
				</div>
			{/if}
		</div>
	</div>

	<!-- Reports Table -->
	<div class="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
		<div class="overflow-x-auto">
			<table class="min-w-full divide-y divide-gray-200">
				<thead class="bg-gray-50">
					<tr>
						<th class="px-6 py-3 text-left">
							<input
								type="checkbox"
								class="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
								checked={selectedReports.length === reports.length && reports.length > 0}
								indeterminate={selectedReports.length > 0 && selectedReports.length < reports.length}
								onchange={selectAllReports}
							/>
						</th>
						{#each tableColumns as column}
							<th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
								{column.label}
							</th>
						{/each}
					</tr>
				</thead>
				<tbody class="bg-white divide-y divide-gray-200">
					{#each reports as report}
						{@const typeBadge = getTypeBadge(report.reportType)}
						{@const statusBadge = getStatusBadge(report.status)}
						<tr class="hover:bg-gray-50">
							<td class="px-6 py-4">
								<input
									type="checkbox"
									class="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
									checked={selectedReports.includes(report.id)}
									onchange={() => toggleReportSelection(report.id)}
								/>
							</td>
							<td class="px-6 py-4">
								<div class="flex items-center">
									<div class="ml-4">
										<div class="text-sm font-medium text-gray-900">{report.title}</div>
										{#if report.description}
											<div class="text-sm text-gray-500">{report.description}</div>
										{/if}
									</div>
								</div>
							</td>
							<td class="px-6 py-4">
								<span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium {typeBadge.color}">
									{typeBadge.label}
								</span>
							</td>
							<td class="px-6 py-4">
								<span class="capitalize text-sm text-gray-900">{report.category}</span>
							</td>
							<td class="px-6 py-4">
								<span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium {statusBadge.color}">
									{statusBadge.label}
								</span>
							</td>
							<td class="px-6 py-4 text-sm text-gray-900">
								{report.department || 'All'}
							</td>
							<td class="px-6 py-4 text-sm text-gray-900">
								{report.generatedCount}
							</td>
							<td class="px-6 py-4 text-sm text-gray-900">
								{formatDate(report.lastRunAt)}
							</td>
							<td class="px-6 py-4">
								<div class="flex items-center gap-2">
									<button
										onclick={() => handleViewReport(report)}
										class="p-1 text-blue-600 hover:bg-blue-100 rounded"
										title="View Report"
									>
										<Eye class="w-4 h-4" />
									</button>
									{#if data.canRunReports}
										<button
											onclick={() => handleRunReport(report)}
											class="p-1 text-green-600 hover:bg-green-100 rounded"
											title="Run Report"
										>
											<RotateCcw class="w-4 h-4" />
										</button>
									{/if}
									<button
										onclick={() => handleDownloadReport(report)}
										class="p-1 text-purple-600 hover:bg-purple-100 rounded"
										title="Download Report"
									>
										<Download class="w-4 h-4" />
									</button>
									{#if data.canEditReports}
										<button
											class="p-1 text-red-600 hover:bg-red-100 rounded"
											title="Delete Report"
										>
											<Trash2 class="w-4 h-4" />
										</button>
									{/if}
								</div>
							</td>
						</tr>
					{/each}
				</tbody>
			</table>
		</div>

		{#if reports.length === 0}
			<div class="text-center py-12">
				<FileText class="w-12 h-12 text-gray-400 mx-auto mb-4" />
				<h3 class="text-lg font-medium text-gray-900 mb-2">No reports found</h3>
				<p class="text-gray-500 mb-4">Get started by creating your first report.</p>
				{#if data.canCreateReports}
					<button
						onclick={handleCreateReport}
						class="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
					>
						<Plus class="w-5 h-5" />
						Create Report
					</button>
				{/if}
			</div>
		{/if}
	</div>

{:else if activeTab === 'analytics' && data.canViewAnalytics}
	<!-- Analytics Dashboard -->
	<div class="space-y-8">
		<!-- Performance Metrics -->
		<div class="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
			<h3 class="text-lg font-semibold text-gray-900 mb-6">Performance Metrics</h3>
			<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
				<div class="text-center">
					<div class="text-2xl font-bold text-green-600">{reportAnalytics.performanceMetrics.successRate}%</div>
					<div class="text-sm text-gray-600">Success Rate</div>
				</div>
				<div class="text-center">
					<div class="text-2xl font-bold text-blue-600">{reportAnalytics.performanceMetrics.avgExecutionTime}s</div>
					<div class="text-sm text-gray-600">Avg Execution Time</div>
				</div>
				<div class="text-center">
					<div class="text-2xl font-bold text-purple-600">{reportAnalytics.performanceMetrics.totalExecutionTime}s</div>
					<div class="text-sm text-gray-600">Total Execution Time</div>
				</div>
			</div>
		</div>

		<!-- Type Breakdown -->
		<div class="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
			<h3 class="text-lg font-semibold text-gray-900 mb-6">Report Type Distribution</h3>
			<div class="space-y-4">
				{#each reportAnalytics.typeBreakdown as type}
					<div class="flex items-center justify-between">
						<span class="text-sm font-medium text-gray-900 capitalize">{type.type}</span>
						<div class="flex items-center gap-4">
							<div class="w-32 bg-gray-200 rounded-full h-2">
								<div class="bg-blue-600 h-2 rounded-full" style="width: {type.percentage}%"></div>
							</div>
							<span class="text-sm text-gray-600 w-12 text-right">{type.count}</span>
						</div>
					</div>
				{/each}
			</div>
		</div>

		<!-- Popular Reports -->
		<div class="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
			<h3 class="text-lg font-semibold text-gray-900 mb-6">Most Popular Reports</h3>
			<div class="space-y-4">
				{#each reportAnalytics.popularReports as report}
					<div class="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
						<div>
							<div class="font-medium text-gray-900">{report.title}</div>
							<div class="text-sm text-gray-600">Last run: {formatDate(report.lastRun)}</div>
						</div>
						<div class="text-right">
							<div class="text-lg font-semibold text-blue-600">{report.runCount}</div>
							<div class="text-sm text-gray-600">runs</div>
						</div>
					</div>
				{/each}
			</div>
		</div>

		<!-- Department Usage -->
		<div class="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
			<h3 class="text-lg font-semibold text-gray-900 mb-6">Department Usage</h3>
			<div class="space-y-4">
				{#each reportAnalytics.departmentUsage as dept}
					<div class="flex items-center justify-between">
						<span class="text-sm font-medium text-gray-900">{dept.department}</span>
						<div class="flex items-center gap-4">
							<span class="text-sm text-gray-600">{dept.reportCount} reports</span>
							<span class="text-xs text-gray-500">Last: {formatDate(dept.lastActivity)}</span>
						</div>
					</div>
				{/each}
			</div>
		</div>
	</div>
{/if}

<!-- Create Report Modal -->
{#if showCreateModal}
	<div class="fixed inset-0 z-50 overflow-y-auto">
		<div class="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
			<div class="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" onclick={closeModals}></div>

			<div class="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
				<div class="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
					<h3 class="text-lg font-medium text-gray-900 mb-4">Create New Report</h3>

					<div class="space-y-4">
						<div>
							<label for="title" class="block text-sm font-medium text-gray-700">Title</label>
							<input
								id="title"
								type="text"
								bind:value={createForm.title}
								class="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
								placeholder="Enter report title"
							/>
						</div>

						<div>
							<label for="description" class="block text-sm font-medium text-gray-700">Description</label>
							<textarea
								id="description"
								bind:value={createForm.description}
								rows="3"
								class="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
								placeholder="Enter report description"
							></textarea>
						</div>

						<div class="grid grid-cols-2 gap-4">
							<div>
								<label for="reportType" class="block text-sm font-medium text-gray-700">Type</label>
								<select
									id="reportType"
									bind:value={createForm.reportType}
									class="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
								>
									{#each REPORT_TYPES as type}
										<option value={type.value}>{type.label}</option>
									{/each}
								</select>
							</div>

							<div>
								<label for="category" class="block text-sm font-medium text-gray-700">Category</label>
								<select
									id="category"
									bind:value={createForm.category}
									class="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
								>
									{#each REPORT_CATEGORIES as category}
										<option value={category.value}>{category.label}</option>
									{/each}
								</select>
							</div>
						</div>
					</div>
				</div>

				<div class="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
					<button
						type="button"
						class="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-blue-600 text-base font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:ml-3 sm:w-auto sm:text-sm"
					>
						Create Report
					</button>
					<button
						type="button"
						onclick={closeModals}
						class="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm"
					>
						Cancel
					</button>
				</div>
			</div>
		</div>
	</div>
{/if}

<!-- View Report Modal -->
{#if showViewModal && selectedReport}
	{@const viewStatusBadge = getStatusBadge(selectedReport.status)}
	<div class="fixed inset-0 z-50 overflow-y-auto">
		<div class="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
			<div class="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" onclick={closeModals}></div>

			<div class="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-2xl sm:w-full">
				<div class="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
					<div class="flex items-center justify-between mb-4">
						<h3 class="text-lg font-medium text-gray-900">{selectedReport.title}</h3>
						<button onclick={closeModals} class="text-gray-400 hover:text-gray-600">
							<X class="w-6 h-6" />
						</button>
					</div>

					<div class="space-y-4">
						<div class="grid grid-cols-2 gap-4">
							<div>
								<dt class="text-sm font-medium text-gray-500">Type</dt>
								<dd class="mt-1 text-sm text-gray-900 capitalize">{selectedReport.reportType}</dd>
							</div>
							<div>
								<dt class="text-sm font-medium text-gray-500">Category</dt>
								<dd class="mt-1 text-sm text-gray-900 capitalize">{selectedReport.category}</dd>
							</div>
							<div>
								<dt class="text-sm font-medium text-gray-500">Status</dt>
								<dd class="mt-1">
									<span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium {viewStatusBadge.color}">
										{viewStatusBadge.label}
									</span>
								</dd>
							</div>
							<div>
								<dt class="text-sm font-medium text-gray-500">Generated Count</dt>
								<dd class="mt-1 text-sm text-gray-900">{selectedReport.generatedCount}</dd>
							</div>
						</div>

						{#if selectedReport.description}
							<div>
								<dt class="text-sm font-medium text-gray-500">Description</dt>
								<dd class="mt-1 text-sm text-gray-900">{selectedReport.description}</dd>
							</div>
						{/if}

						<div class="grid grid-cols-2 gap-4">
							<div>
								<dt class="text-sm font-medium text-gray-500">Created</dt>
								<dd class="mt-1 text-sm text-gray-900">{formatDate(selectedReport.createdAt)}</dd>
							</div>
							<div>
								<dt class="text-sm font-medium text-gray-500">Last Run</dt>
								<dd class="mt-1 text-sm text-gray-900">{formatDate(selectedReport.lastRunAt)}</dd>
							</div>
						</div>

						<div>
							<dt class="text-sm font-medium text-gray-500">Created By</dt>
							<dd class="mt-1 text-sm text-gray-900">{selectedReport.createdBy.displayName}</dd>
						</div>
					</div>
				</div>

				<div class="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
					<button
						onclick={() => handleDownloadReport(selectedReport)}
						class="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-blue-600 text-base font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:ml-3 sm:w-auto sm:text-sm"
					>
						<Download class="w-4 h-4 mr-2" />
						Download
					</button>
					{#if data.canRunReports}
						<button
							onclick={() => handleRunReport(selectedReport)}
							class="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm"
						>
							<RotateCcw class="w-4 h-4 mr-2" />
							Run Report
						</button>
					{/if}
				</div>
			</div>
		</div>
	</div>
{/if}