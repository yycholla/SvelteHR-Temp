<script lang="ts">
	import { page } from '$app/stores';
	import { goto } from '$app/navigation';
	import {
		BarChart3,
		FileText,
		Plus,
	} from '@lucide/svelte';
	import * as Tabs from '$lib/components/ui/tabs';
	import type { HrReport, ReportAnalytics as ReportAnalyticsType } from '$lib/graphql/reports-operations';
	import {
		REPORT_CATEGORIES,
		REPORT_STATUSES,
		REPORT_TYPES
	} from '$lib/graphql/reports-operations';

	// Import new decomposed components
	import ReportStats from './components/ReportStats.svelte';
	import ReportAnalytics from './components/ReportAnalytics.svelte';
	import ReportFilters from './components/ReportFilters.svelte';
	import ReportList from './components/ReportList.svelte';
	import ReportCreateModal from './components/ReportCreateModal.svelte';
	import ReportViewModal from './components/ReportViewModal.svelte';

	// Extended report type with UI-specific fields
	interface HRReport extends Omit<HrReport, 'creator' | 'department'> {
		description?: string;
		visibility?: string;
		outputFormat?: string;
		schedule?: string;
		recipients?: string[];
		parameters?: Record<string, any>;
		generatedCount?: number;
		lastRunAt?: string | null;
		// Override department and creator to make them optional for safer access
		department: {
			id: string;
			name: string;
		} | null;
		creator: {
			id: string;
			displayName: string;
			email: string;
		} | null;
	}

	// Extended analytics type with UI-specific fields
	interface ExtendedReportAnalytics extends ReportAnalyticsType {
		performanceMetrics: {
			successRate: number;
			errorRate: number;
			avgExecutionTime?: number;
			totalExecutionTime?: number;
		};
		popularReports?: Array<{
			title: string;
			runCount: number;
			lastRun: string | null;
		}>;
		departmentUsage?: Array<{
			department: string;
			reportCount: number;
			lastActivity: string | null;
		}>;
	}

	// Define props interface
	interface Props {
		data: {
			user: any;
			userSession: any;
			reports: HRReport[];
			totalReports: number;
			reportAnalytics: ExtendedReportAnalytics;
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
	const { data }: Props = $props();

	// Derived state from server-side data
	const reports = $derived(data.reports);
	const reportAnalytics = $derived(data.reportAnalytics);
	const filters = $derived(data.filters);

	// Local reactive state using Svelte 5 runes
	let activeTab = $state('reports');
	let selectedReports = $state<string[]>([]);
	let showCreateModal = $state(false);
	// showRunModal was defined but no template existed. Keeping variable for logic consistency.
	// TODO: Implement ReportRunModal
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
		runForm = {
			reportId: report.id,
			parameters: {}
		};
		showRunModal = true;
		// Note: Modal template missing in original file
	}

	function handleViewReport(report: HRReport) {
		selectedReport = report;
		showViewModal = true;
	}

	function handleDownloadReport(report: HRReport) {
		// Simulate report download
		const link = document.createElement('a');
		link.href = `/api/reports/${report.id}/download`;
		link.download = `${report.title}.${report.outputFormat || 'pdf'}`;
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

	// Placeholder for delete selected
	function handleDeleteSelected() {
		console.log('Delete selected', selectedReports);
	}

	// Placeholder for run selected
	function handleRunSelected() {
		console.log('Run selected', selectedReports);
	}

	// Placeholder for save new report
	function handleSaveReport() {
		console.log('Save report', createForm);
		closeModals();
	}
</script>

<svelte:head>
	<title>Reports Management - MountainHR</title>
	<meta
		name="description"
		content="Generate, schedule, and manage HR reports. Access analytics dashboards, export data, and monitor report performance across your organization."
	/>
</svelte:head>

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
<Tabs.Root bind:value={activeTab} class="mb-6">
	<Tabs.List>
		<Tabs.Trigger value="reports" class="inline-flex items-center gap-2">
			<FileText class="h-4 w-4" />
			Reports
		</Tabs.Trigger>
		{#if data.canViewAnalytics}
			<Tabs.Trigger value="analytics" class="inline-flex items-center gap-2">
				<BarChart3 class="h-4 w-4" />
				Analytics
			</Tabs.Trigger>
		{/if}
	</Tabs.List>

	<Tabs.Content value="reports">
		<!-- Statistics Cards -->
		<ReportStats {reportAnalytics} />

		<!-- Filters -->
		<ReportFilters
			bind:searchQuery
			bind:typeFilter
			bind:categoryFilter
			bind:statusFilter
			selectedReportsCount={selectedReports.length}
			canRunReports={data.canRunReports}
			onApplyFilters={applyFilters}
			onClearFilters={clearFilters}
			onRunSelected={handleRunSelected}
			onDeleteSelected={handleDeleteSelected}
		/>

		<!-- Reports Table -->
		<ReportList
			{reports}
			bind:selectedReports
			canCreateReports={data.canCreateReports}
			canRunReports={data.canRunReports}
			canEditReports={data.canEditReports}
			onCreate={handleCreateReport}
			onView={handleViewReport}
			onRun={handleRunReport}
			onDownload={handleDownloadReport}
		/>
	</Tabs.Content>

	{#if data.canViewAnalytics}
		<Tabs.Content value="analytics">
			<ReportAnalytics {reportAnalytics} />
		</Tabs.Content>
	{/if}
</Tabs.Root>

<!-- Create Report Modal -->
<ReportCreateModal
	bind:open={showCreateModal}
	bind:createForm={createForm}
	onClose={closeModals}
	onSave={handleSaveReport}
/>

<!-- View Report Modal -->
<ReportViewModal
	bind:open={showViewModal}
	{selectedReport}
	canRunReports={data.canRunReports}
	canEditReports={data.canEditReports}
	onClose={closeModals}
	onDownload={handleDownloadReport}
	onRun={handleRunReport}
/>