<!--
T042: Fix reports management pages with standardized error handling
Modern Svelte 5 implementation with server-side data loading, comprehensive analytics, and RBAC integration
-->

<script lang="ts">
	import { page } from '$app/stores';
	import { goto } from '$app/navigation';
	import {
		FileText,
		BarChart3,
		Calendar,
		Clock,
		Plus,
		Download,
		Eye,
		RotateCcw,
		Trash2,
		Search,
		Filter,
		X
	} from 'lucide-svelte';
	import type { HRReport, ReportAnalytics } from '$lib/graphql/reports-operations';
	import {
		REPORT_TYPES,
		REPORT_CATEGORIES,
		REPORT_STATUSES
	} from '$lib/graphql/reports-operations';

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
	let searchQuery = $state('');
	let typeFilter = $state('');
	let categoryFilter = $state('');
	let statusFilter = $state('');
	let departmentFilter = $state('');

	// Synchronize with filters data using $effect()
	$effect(() => {
		searchQuery = filters.searchTerm || '';
		typeFilter = filters.typeFilter || '';
		categoryFilter = filters.categoryFilter || '';
		statusFilter = filters.statusFilter || '';
		departmentFilter = filters.departmentFilter || '';
	});

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
			selectedReports = selectedReports.filter((id) => id !== reportId);
		} else {
			selectedReports = [...selectedReports, reportId];
		}
	}

	function selectAllReports() {
		if (selectedReports.length === reports.length) {
			selectedReports = [];
		} else {
			selectedReports = reports.map((report) => report.id);
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
			draft: { label: 'Draft', color: 'bg-gray-100 text-foreground' },
			scheduled: { label: 'Scheduled', color: 'bg-blue-100 text-blue-800' },
			archived: { label: 'Archived', color: 'bg-red-100 text-red-800' }
		};
		return (
			statusMap[status as keyof typeof statusMap] || {
				label: status,
				color: 'bg-gray-100 text-foreground'
			}
		);
	}

	function getTypeBadge(type: string) {
		const typeMap = {
			employee: { label: 'Employee', color: 'bg-purple-100 text-purple-800' },
			payroll: { label: 'Payroll', color: 'bg-green-100 text-green-800' },
			performance: { label: 'Performance', color: 'bg-blue-100 text-blue-800' },
			attendance: { label: 'Attendance', color: 'bg-orange-100 text-orange-800' },
			compliance: { label: 'Compliance', color: 'bg-red-100 text-red-800' },
			custom: { label: 'Custom', color: 'bg-gray-100 text-foreground' }
		};
		return (
			typeMap[type as keyof typeof typeMap] || { label: type, color: 'bg-gray-100 text-foreground' }
		);
	}
</script>

<!-- Page Header -->
<div class="mb-8">
	<div class="flex items-center justify-between">
		<div>
			<h1 class="text-3xl font-bold text-foreground">Reports Management</h1>
			<p class="mt-2 text-muted-foreground">Generate, manage, and schedule HR reports</p>
		</div>
		{#if data.canCreateReports}
			<button
				onclick={handleCreateReport}
				class="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-primary-foreground hover:bg-primary/90"
			>
				<Plus class="h-5 w-5" />
				Create Report
			</button>
		{/if}
	</div>
</div>

<!-- Tab Navigation -->
<div class="mb-6 border-b border">
	<nav class="flex space-x-8">
		<button
			onclick={() => (activeTab = 'reports')}
			class="border-b-2 px-1 py-2 text-sm font-medium {activeTab === 'reports'
				? 'border-blue-500 text-blue-600'
				: 'border-transparent text-muted-foreground hover:border-input hover:text-foreground'}"
		>
			<FileText class="mr-2 inline h-4 w-4" />
			Reports
		</button>
		{#if data.canViewAnalytics}
			<button
				onclick={() => (activeTab = 'analytics')}
				class="border-b-2 px-1 py-2 text-sm font-medium {activeTab === 'analytics'
					? 'border-blue-500 text-blue-600'
					: 'border-transparent text-muted-foreground hover:border-input hover:text-foreground'}"
			>
				<BarChart3 class="mr-2 inline h-4 w-4" />
				Analytics
			</button>
		{/if}
	</nav>
</div>

{#if activeTab === 'reports'}
	<!-- Statistics Cards -->
	<div class="mb-8 grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
		{#each statsCards as card}
			{@const CardIcon = card.icon}
			<div class="rounded-lg border border bg-card p-6 shadow-sm">
				<div class="flex items-center justify-between">
					<div>
						<p class="text-sm font-medium text-muted-foreground">{card.title}</p>
						<p class="text-2xl font-bold text-foreground">{card.value}</p>
						<p class="mt-1 text-xs text-muted-foreground">{card.description}</p>
					</div>
					<div class="p-3 bg-{card.color}-100 rounded-lg">
						<CardIcon class="h-6 w-6 text-{card.color}-600" />
					</div>
				</div>
			</div>
		{/each}
	</div>

	<!-- Filters -->
	<div class="mb-8 rounded-lg border border bg-card p-6 shadow-sm">
		<div class="mb-4 flex items-center gap-4">
			<div class="flex-1">
				<label for="search" class="sr-only">Search reports</label>
				<div class="relative">
					<Search
						class="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 transform text-muted-foreground"
					/>
					<input
						id="search"
						type="text"
						bind:value={searchQuery}
						placeholder="Search reports..."
						class="w-full rounded-md border border-input bg-background py-2 pl-10 pr-4 text-sm focus:border-primary focus:outline-none"
					/>
				</div>
			</div>
			<select
				bind:value={typeFilter}
				class="rounded-md border border-input bg-background px-4 py-2 text-sm focus:border-primary focus:outline-none"
			>
				<option value="">All Types</option>
				{#each REPORT_TYPES as type}
					<option value={type.value}>{type.label}</option>
				{/each}
			</select>
			<select
				bind:value={categoryFilter}
				class="rounded-md border border-input bg-background px-4 py-2 text-sm focus:border-primary focus:outline-none"
			>
				<option value="">All Categories</option>
				{#each REPORT_CATEGORIES as category}
					<option value={category.value}>{category.label}</option>
				{/each}
			</select>
			<select
				bind:value={statusFilter}
				class="rounded-md border border-input bg-background px-4 py-2 text-sm focus:border-primary focus:outline-none"
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
					class="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-primary-foreground hover:bg-primary/90"
				>
					<Filter class="h-4 w-4" />
					Apply Filters
				</button>
				<button
					onclick={clearFilters}
					class="inline-flex items-center gap-2 rounded-lg bg-gray-100 px-4 py-2 text-foreground hover:bg-gray-200"
				>
					<X class="h-4 w-4" />
					Clear
				</button>
			</div>

			{#if selectedReports.length > 0}
				<div class="flex items-center gap-4">
					<span class="text-sm text-muted-foreground">{selectedReports.length} selected</span>
					<div class="flex gap-2">
						{#if data.canRunReports}
							<button class="rounded bg-primary px-3 py-1 text-sm text-primary-foreground hover:bg-primary/90">
								Run Selected
							</button>
						{/if}
						<button class="rounded bg-destructive px-3 py-1 text-sm text-destructive-foreground hover:bg-destructive/90">
							Delete Selected
						</button>
					</div>
				</div>
			{/if}
		</div>
	</div>

	<!-- Reports Table -->
	<div class="overflow-hidden rounded-lg border border bg-card shadow-sm">
		<div class="overflow-x-auto">
			<table class="w-full text-sm">
				<thead class="bg-muted/50">
					<tr>
						<th class="px-6 py-3 text-left">
							<input
								type="checkbox"
								class="rounded border-input text-primary focus:outline-none"
								checked={selectedReports.length === reports.length && reports.length > 0}
								indeterminate={selectedReports.length > 0 &&
									selectedReports.length < reports.length}
								onchange={selectAllReports}
							/>
						</th>
						{#each tableColumns as column}
							<th
								class="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground"
							>
								{column.label}
							</th>
						{/each}
					</tr>
				</thead>
				<tbody class="">
					{#each reports as report}
						{@const typeBadge = getTypeBadge(report.reportType)}
						{@const statusBadge = getStatusBadge(report.status)}
						<tr class="border-b hover:bg-muted/50">
							<td class="px-6 py-4">
								<input
									type="checkbox"
									class="rounded border-input text-primary focus:outline-none"
									checked={selectedReports.includes(report.id)}
									onchange={() => toggleReportSelection(report.id)}
								/>
							</td>
							<td class="px-6 py-4">
								<div class="flex items-center">
									<div class="ml-4">
										<div class="text-sm font-medium text-foreground">{report.title}</div>
										{#if report.description}
											<div class="text-sm text-muted-foreground">{report.description}</div>
										{/if}
									</div>
								</div>
							</td>
							<td class="px-6 py-4">
								<span
									class="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium {typeBadge.color}"
								>
									{typeBadge.label}
								</span>
							</td>
							<td class="px-6 py-4">
								<span class="text-sm capitalize text-foreground">{report.category}</span>
							</td>
							<td class="px-6 py-4">
								<span
									class="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium {statusBadge.color}"
								>
									{statusBadge.label}
								</span>
							</td>
							<td class="px-6 py-4 text-sm text-foreground">
								{report.department || 'All'}
							</td>
							<td class="px-6 py-4 text-sm text-foreground">
								{report.generatedCount}
							</td>
							<td class="px-6 py-4 text-sm text-foreground">
								{formatDate(report.lastRunAt)}
							</td>
							<td class="px-6 py-4">
								<div class="flex items-center gap-2">
									<button
										onclick={() => handleViewReport(report)}
										class="rounded p-1 text-blue-600 hover:bg-blue-100"
										title="View Report"
									>
										<Eye class="h-4 w-4" />
									</button>
									{#if data.canRunReports}
										<button
											onclick={() => handleRunReport(report)}
											class="rounded p-1 text-green-600 hover:bg-green-100"
											title="Run Report"
										>
											<RotateCcw class="h-4 w-4" />
										</button>
									{/if}
									<button
										onclick={() => handleDownloadReport(report)}
										class="rounded p-1 text-purple-600 hover:bg-purple-100"
										title="Download Report"
									>
										<Download class="h-4 w-4" />
									</button>
									{#if data.canEditReports}
										<button class="rounded p-1 text-red-600 hover:bg-red-100" title="Delete Report">
											<Trash2 class="h-4 w-4" />
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
			<div class="py-12 text-center">
				<FileText class="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
				<h3 class="mb-2 text-lg font-medium text-foreground">No reports found</h3>
				<p class="mb-4 text-muted-foreground">Get started by creating your first report.</p>
				{#if data.canCreateReports}
					<button
						onclick={handleCreateReport}
						class="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-primary-foreground hover:bg-primary/90"
					>
						<Plus class="h-5 w-5" />
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
		<div class="rounded-lg border border bg-card p-6 shadow-sm">
			<h3 class="mb-6 text-lg font-semibold text-foreground">Performance Metrics</h3>
			<div class="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
				<div class="text-center">
					<div class="text-2xl font-bold text-green-600">
						{reportAnalytics.performanceMetrics.successRate}%
					</div>
					<div class="text-sm text-muted-foreground">Success Rate</div>
				</div>
				<div class="text-center">
					<div class="text-2xl font-bold text-blue-600">
						{reportAnalytics.performanceMetrics.avgExecutionTime}s
					</div>
					<div class="text-sm text-muted-foreground">Avg Execution Time</div>
				</div>
				<div class="text-center">
					<div class="text-2xl font-bold text-purple-600">
						{reportAnalytics.performanceMetrics.totalExecutionTime}s
					</div>
					<div class="text-sm text-muted-foreground">Total Execution Time</div>
				</div>
			</div>
		</div>

		<!-- Type Breakdown -->
		<div class="rounded-lg border border bg-card p-6 shadow-sm">
			<h3 class="mb-6 text-lg font-semibold text-foreground">Report Type Distribution</h3>
			<div class="space-y-4">
				{#each reportAnalytics.typeBreakdown as type}
					<div class="flex items-center justify-between">
						<span class="text-sm font-medium capitalize text-foreground">{type.type}</span>
						<div class="flex items-center gap-4">
							<div class="h-2 w-32 rounded-full bg-gray-200">
								<div class="h-2 rounded-full bg-primary" style="width: {type.percentage}%"></div>
							</div>
							<span class="w-12 text-right text-sm text-muted-foreground">{type.count}</span>
						</div>
					</div>
				{/each}
			</div>
		</div>

		<!-- Popular Reports -->
		<div class="rounded-lg border border bg-card p-6 shadow-sm">
			<h3 class="mb-6 text-lg font-semibold text-foreground">Most Popular Reports</h3>
			<div class="space-y-4">
				{#each reportAnalytics.popularReports as report}
					<div class="flex items-center justify-between rounded-lg bg-muted dark:bg-muted p-4">
						<div>
							<div class="font-medium text-foreground">{report.title}</div>
							<div class="text-sm text-muted-foreground">Last run: {formatDate(report.lastRun)}</div>
						</div>
						<div class="text-right">
							<div class="text-lg font-semibold text-blue-600">{report.runCount}</div>
							<div class="text-sm text-muted-foreground">runs</div>
						</div>
					</div>
				{/each}
			</div>
		</div>

		<!-- Department Usage -->
		<div class="rounded-lg border border bg-card p-6 shadow-sm">
			<h3 class="mb-6 text-lg font-semibold text-foreground">Department Usage</h3>
			<div class="space-y-4">
				{#each reportAnalytics.departmentUsage as dept}
					<div class="flex items-center justify-between">
						<span class="text-sm font-medium text-foreground">{dept.department}</span>
						<div class="flex items-center gap-4">
							<span class="text-sm text-muted-foreground">{dept.reportCount} reports</span>
							<span class="text-xs text-muted-foreground">Last: {formatDate(dept.lastActivity)}</span>
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
		<div
			class="flex min-h-screen items-center justify-center px-4 pb-20 pt-4 text-center sm:block sm:p-0"
		>
			<div
				class="fixed inset-0 bg-muted dark:bg-muted0 bg-opacity-75 transition-opacity"
				onclick={closeModals}
			></div>

			<div
				class="inline-block transform overflow-hidden rounded-lg bg-card text-left align-bottom shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-lg sm:align-middle"
			>
				<div class="bg-card px-4 pb-4 pt-5 sm:p-6 sm:pb-4">
					<h3 class="mb-4 text-lg font-medium text-foreground">Create New Report</h3>

					<div class="space-y-4">
						<div>
							<label for="title" class="block text-sm font-medium text-foreground">Title</label>
							<input
								id="title"
								type="text"
								bind:value={createForm.title}
								class="mt-1 block w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none"
								placeholder="Enter report title"
							/>
						</div>

						<div>
							<label for="description" class="block text-sm font-medium text-foreground"
								>Description</label
							>
							<textarea
								id="description"
								bind:value={createForm.description}
								rows="3"
								class="mt-1 block w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none"
								placeholder="Enter report description"
							></textarea>
						</div>

						<div class="grid grid-cols-2 gap-4">
							<div>
								<label for="reportType" class="block text-sm font-medium text-foreground">Type</label>
								<select
									id="reportType"
									bind:value={createForm.reportType}
									class="mt-1 block w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none"
								>
									{#each REPORT_TYPES as type}
										<option value={type.value}>{type.label}</option>
									{/each}
								</select>
							</div>

							<div>
								<label for="category" class="block text-sm font-medium text-foreground"
									>Category</label
								>
								<select
									id="category"
									bind:value={createForm.category}
									class="mt-1 block w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none"
								>
									{#each REPORT_CATEGORIES as category}
										<option value={category.value}>{category.label}</option>
									{/each}
								</select>
							</div>
						</div>
					</div>
				</div>

				<div class="bg-muted dark:bg-muted px-4 py-3 sm:flex sm:flex-row-reverse sm:px-6">
					<button
						type="button"
						class="inline-flex w-full justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 focus:outline-none sm:ml-3 sm:w-auto"
					>
						Create Report
					</button>
					<button
						type="button"
						onclick={closeModals}
						class="mt-3 inline-flex w-full justify-center rounded-md border px-4 py-2 text-sm font-medium hover:bg-accent focus:outline-none sm:ml-3 sm:mt-0 sm:w-auto"
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
		<div
			class="flex min-h-screen items-center justify-center px-4 pb-20 pt-4 text-center sm:block sm:p-0"
		>
			<div
				class="fixed inset-0 bg-muted dark:bg-muted0 bg-opacity-75 transition-opacity"
				onclick={closeModals}
			></div>

			<div
				class="inline-block transform overflow-hidden rounded-lg bg-card text-left align-bottom shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-2xl sm:align-middle"
			>
				<div class="bg-card px-4 pb-4 pt-5 sm:p-6 sm:pb-4">
					<div class="mb-4 flex items-center justify-between">
						<h3 class="text-lg font-medium text-foreground">{selectedReport.title}</h3>
						<button onclick={closeModals} class="text-muted-foreground hover:text-muted-foreground">
							<X class="h-6 w-6" />
						</button>
					</div>

					<div class="space-y-4">
						<div class="grid grid-cols-2 gap-4">
							<div>
								<dt class="text-sm font-medium text-muted-foreground">Type</dt>
								<dd class="mt-1 text-sm capitalize text-foreground">{selectedReport.reportType}</dd>
							</div>
							<div>
								<dt class="text-sm font-medium text-muted-foreground">Category</dt>
								<dd class="mt-1 text-sm capitalize text-foreground">{selectedReport.category}</dd>
							</div>
							<div>
								<dt class="text-sm font-medium text-muted-foreground">Status</dt>
								<dd class="mt-1">
									<span
										class="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium {viewStatusBadge.color}"
									>
										{viewStatusBadge.label}
									</span>
								</dd>
							</div>
							<div>
								<dt class="text-sm font-medium text-muted-foreground">Generated Count</dt>
								<dd class="mt-1 text-sm text-foreground">{selectedReport.generatedCount}</dd>
							</div>
						</div>

						{#if selectedReport.description}
							<div>
								<dt class="text-sm font-medium text-muted-foreground">Description</dt>
								<dd class="mt-1 text-sm text-foreground">{selectedReport.description}</dd>
							</div>
						{/if}

						<div class="grid grid-cols-2 gap-4">
							<div>
								<dt class="text-sm font-medium text-muted-foreground">Created</dt>
								<dd class="mt-1 text-sm text-foreground">{formatDate(selectedReport.createdAt)}</dd>
							</div>
							<div>
								<dt class="text-sm font-medium text-muted-foreground">Last Run</dt>
								<dd class="mt-1 text-sm text-foreground">{formatDate(selectedReport.lastRunAt)}</dd>
							</div>
						</div>

						<div>
							<dt class="text-sm font-medium text-muted-foreground">Created By</dt>
							<dd class="mt-1 text-sm text-foreground">{selectedReport.createdBy.displayName}</dd>
						</div>
					</div>
				</div>

				<div class="bg-muted dark:bg-muted px-4 py-3 sm:flex sm:flex-row-reverse sm:px-6">
					<button
						onclick={() => handleDownloadReport(selectedReport)}
						class="inline-flex w-full justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 focus:outline-none sm:ml-3 sm:w-auto"
					>
						<Download class="mr-2 h-4 w-4" />
						Download
					</button>
					{#if data.canRunReports}
						<button
							onclick={() => handleRunReport(selectedReport)}
							class="mt-3 inline-flex w-full justify-center rounded-md border px-4 py-2 text-sm font-medium hover:bg-accent focus:outline-none sm:ml-3 sm:mt-0 sm:w-auto"
						>
							<RotateCcw class="mr-2 h-4 w-4" />
							Run Report
						</button>
					{/if}
				</div>
			</div>
		</div>
	</div>
{/if}
