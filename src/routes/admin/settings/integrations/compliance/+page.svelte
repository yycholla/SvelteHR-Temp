<script lang="ts">
	import { invalidate, goto } from '$app/navigation';
	import { page } from '$app/stores';
	import {
		FileText,
		Download,
		Calendar,
		Clock,
		User,
		AlertCircle,
		CheckCircle,
		Shield,
		FileSpreadsheet,
		RefreshCw,
		Search,
		Plus
	} from '@lucide/svelte';
	import * as Dialog from '$lib/components/ui/dialog';
	import { createUrqlClient } from '$lib/graphql/client';
	import { browser } from '$app/environment';
	import { SvelteDate } from 'svelte/reactivity';

	let { data } = $props();

	// GraphQL mutation for generating compliance reports
	const GENERATE_REPORT_MUTATION = `
		mutation GenerateComplianceReport($input: GenerateComplianceReportInput!) {
			compliance {
				generateComplianceReport(input: $input) {
					reportId
					reportType
					periodStart
					periodEnd
					status
					totalRecords
					findingsCount
					generatedAt
					generatedBy
					pdfPath
					csvPath
				}
			}
		}
	`;

	let searchQuery = $state('');
	let selectedTab = $state<'reports' | 'schedules'>('reports');
	let selectedReportType = $state(data.filters?.reportType || '');
	let refreshing = $state(false);

	// Generate report dialog state
	let generateDialogOpen = $state(false);
	let generating = $state(false);
	let generateError = $state('');
	let generateSuccess = $state('');

	// Form state for report generation
	let formReportType = $state<'SOX' | 'GDPR' | 'SOC2' | 'DataChanges' | 'UserActivity' | 'AccessLog'>('SOX');
	let formPeriodStart = $state('');
	let formPeriodEnd = $state('');
	let formIncludePdf = $state(true);
	let formIncludeCsv = $state(true);

	let reports = $derived(data.reports || []);
	let schedules = $derived(data.schedules || []);
	let selectedReport = $derived(data.selectedReport);

	// Filtered reports based on search query
	const filteredReports = $derived(
		reports.filter((report: {
			reportType: string;
			status: string;
			id: string;
			generatedBy?: string;
		}) => {
			if (!searchQuery) return true;
			const query = searchQuery.toLowerCase();
			return (
				report.reportType?.toLowerCase().includes(query) ||
				report.status?.toLowerCase().includes(query) ||
				report.id?.toLowerCase().includes(query) ||
				report.generatedBy?.toLowerCase().includes(query)
			);
		})
	);

	const reportTypes = [
		{ value: '', label: 'All Reports' },
		{ value: 'SOX', label: 'SOX Compliance' },
		{ value: 'GDPR', label: 'GDPR Compliance' },
		{ value: 'SOC2', label: 'SOC2 Compliance' },
		{ value: 'DataChanges', label: 'Data Changes' },
		{ value: 'UserActivity', label: 'User Activity' },
		{ value: 'AccessLog', label: 'Access Log' }
	];

	function getStatusBadgeColor(status: string): string {
		switch (status?.toLowerCase()) {
			case 'completed':
				return 'bg-green-100 text-green-700';
			case 'failed':
				return 'bg-red-100 text-red-700';
			case 'in_progress':
				return 'bg-blue-100 text-blue-700';
			default:
				return 'bg-gray-100 text-gray-700';
		}
	}

	function getReportTypeBadgeColor(reportType: string): string {
		switch (reportType) {
			case 'SOX':
			case 'SOC2':
				return 'bg-red-100 text-red-700';
			case 'GDPR':
				return 'bg-blue-100 text-blue-700';
			default:
				return 'bg-gray-100 text-gray-700';
		}
	}

	function formatDate(dateStr: string): string {
		if (!dateStr) return 'N/A';
		return new Date(dateStr).toLocaleString();
	}

	function formatDateShort(dateStr: string): string {
		if (!dateStr) return 'N/A';
		return new Date(dateStr).toLocaleDateString();
	}

	async function handleRefresh() {
		refreshing = true;
		await invalidate('app:compliance');
		refreshing = false;
	}

	function handleReportTypeChange(event: Event) {
		const target = event.target as HTMLSelectElement;
		const value = target.value;
		const url = new URL($page.url);
		if (value) {
			url.searchParams.set('reportType', value);
		} else {
			url.searchParams.delete('reportType');
		}
		window.location.href = url.toString();
	}

	async function handleGenerateReport() {
		generateError = '';
		generateSuccess = '';
		generating = true;

		try {
			if (!browser) {
				throw new Error('Browser environment required');
			}

			// Validate form
			if (!formPeriodStart || !formPeriodEnd) {
				generateError = 'Please select both start and end dates';
				generating = false;
				return;
			}

			if (new Date(formPeriodStart) > new Date(formPeriodEnd)) {
				generateError = 'Start date must be before end date';
				generating = false;
				return;
			}

			// Create GraphQL client
			const client = createUrqlClient(fetch);

			// Execute mutation
			const result = await client.mutation(GENERATE_REPORT_MUTATION, {
				input: {
					reportType: formReportType,
					periodStart: new Date(formPeriodStart + 'T00:00:00Z').toISOString(),
					periodEnd: new Date(formPeriodEnd + 'T23:59:59Z').toISOString(),
					includePdf: formIncludePdf,
					includeCsv: formIncludeCsv
				}
			}).toPromise();

			if (result.error) {
				throw new Error(result.error.message || 'Failed to generate report');
			}

			if (!result.data?.compliance?.generateComplianceReport) {
				throw new Error('No data returned from mutation');
			}

			generateSuccess = 'Report generated successfully!';

			// Wait a moment to show success message
			setTimeout(() => {
				generateDialogOpen = false;
				generateSuccess = '';
				// Refresh data
				invalidate('app:compliance');
			}, 1500);

		} catch (error) {
			console.error('Error generating report:', error);
			generateError = error instanceof Error ? error.message : 'Failed to generate report';
		} finally {
			generating = false;
		}
	}

	function handleOpenGenerateDialog() {
		// Reset form
		generateError = '';
		generateSuccess = '';
		formReportType = 'SOX';

		// Set default date range to last 30 days
		const endDate = new SvelteDate();
		const startDate = new SvelteDate();
		startDate.setDate(startDate.getDate() - 30);

		formPeriodEnd = endDate.toISOString().split('T')[0];
		formPeriodStart = startDate.toISOString().split('T')[0];
		formIncludePdf = true;
		formIncludeCsv = true;

		generateDialogOpen = true;
	}

	async function handleDownloadFile(filePath: string, fileName: string) {
		if (!filePath) return;

		try {
			// In a real implementation, you would fetch the file from the server
			// For now, we'll just log the action
			console.log('Downloading file:', filePath);

			// TODO: Implement actual file download
			// const response = await fetch(`/api/files/download?path=${encodeURIComponent(filePath)}`);
			// if (!response.ok) throw new Error('Failed to download file');
			// const blob = await response.blob();
			// const url = window.URL.createObjectURL(blob);
			// const a = document.createElement('a');
			// a.href = url;
			// a.download = fileName;
			// document.body.appendChild(a);
			// a.click();
			// window.URL.revokeObjectURL(url);
			// document.body.removeChild(a);

			alert(`Download functionality not yet implemented.\nFile path: ${filePath}`);
		} catch (error) {
			console.error('Error downloading file:', error);
			alert('Failed to download file');
		}
	}
</script>

<div class="flex flex-col h-full overflow-hidden bg-background">
	<!-- Toolbar -->
	<header class="flex-shrink-0 flex items-center justify-between h-14 px-4 border-b bg-background z-20">
		<div class="flex items-center gap-4 flex-1">
			<h1 class="text-sm font-semibold tracking-tight">Compliance Reports</h1>
			<div class="h-4 w-px bg-border"></div>

			<!-- Search -->
			<div class="relative w-64">
				<Search class="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
				<input
					type="text"
					bind:value={searchQuery}
					placeholder="Search reports..."
					class="w-full h-8 rounded-sm border border-input bg-background pl-8 pr-3 text-xs focus:border-primary focus:outline-none transition-colors"
				/>
			</div>
		</div>
		<div class="flex items-center gap-2">
			<button
				onclick={handleOpenGenerateDialog}
				class="flex items-center gap-1.5 h-8 px-3 rounded-sm bg-primary text-primary-foreground text-xs hover:bg-primary/90 transition-colors"
			>
				<Plus class="h-3.5 w-3.5" />
				Generate Report
			</button>
			<button
				onclick={handleRefresh}
				disabled={refreshing}
				class="flex items-center gap-1.5 h-8 px-3 rounded-sm border border-input bg-background text-xs hover:bg-accent transition-colors disabled:opacity-50"
			>
				<RefreshCw class="h-3.5 w-3.5 {refreshing ? 'animate-spin' : ''}" />
				Refresh
			</button>
		</div>
	</header>

	<!-- Filters Bar -->
	<div class="flex-shrink-0 p-2 border-b bg-muted/5 flex items-center gap-2 overflow-x-auto">
		<select
			bind:value={selectedReportType}
			onchange={handleReportTypeChange}
			class="h-8 rounded-sm border border-input bg-background px-2 text-xs focus:border-primary focus:outline-none min-w-[150px]"
		>
			{#each reportTypes as type}
				<option value={type.value}>{type.label}</option>
			{/each}
		</select>

		<!-- Tab Selector -->
		<div class="flex gap-1 ml-auto">
			<button
				onclick={() => selectedTab = 'reports'}
				class="h-8 px-3 rounded-sm text-xs transition-colors {selectedTab === 'reports' ? 'bg-accent font-medium' : 'hover:bg-accent/50'}"
			>
				Reports
			</button>
			<button
				onclick={() => selectedTab = 'schedules'}
				class="h-8 px-3 rounded-sm text-xs transition-colors {selectedTab === 'schedules' ? 'bg-accent font-medium' : 'hover:bg-accent/50'}"
			>
				Schedules
			</button>
		</div>
	</div>

	<!-- Error message -->
	{#if data.error}
		<div class="flex-shrink-0 p-4 pb-0">
			<div class="rounded-md bg-destructive/10 p-3 text-sm text-destructive font-medium border border-destructive/20">
				{data.error}
			</div>
		</div>
	{/if}

	<!-- Single Report Detail View -->
	{#if selectedReport}
		<div class="flex-1 overflow-auto p-4">
			<div class="max-w-5xl mx-auto space-y-4">
				<!-- Report Header -->
				<div class="bg-background border rounded-sm p-4">
					<div class="flex items-start justify-between mb-4">
						<div>
							<div class="flex items-center gap-2 mb-2">
								<span class="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium {getReportTypeBadgeColor(selectedReport.reportType)}">
									{selectedReport.reportType}
								</span>
								<span class="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium {getStatusBadgeColor(selectedReport.status)}">
									{selectedReport.status}
								</span>
							</div>
							<h2 class="text-lg font-semibold">Report #{selectedReport.id.slice(0, 8)}</h2>
							<p class="text-xs text-muted-foreground mt-1">
								Period: {formatDateShort(selectedReport.periodStart)} - {formatDateShort(selectedReport.periodEnd)}
							</p>
						</div>
						<div class="flex gap-2">
							{#if selectedReport.pdfPath}
								<button
									onclick={() => handleDownloadFile(selectedReport.pdfPath, `report-${selectedReport.id}.pdf`)}
									class="flex items-center gap-1.5 h-8 px-3 rounded-sm border border-input bg-background text-xs hover:bg-accent transition-colors"
								>
									<FileText class="h-3.5 w-3.5" />
									PDF
								</button>
							{/if}
							{#if selectedReport.csvPath}
								<button
									onclick={() => handleDownloadFile(selectedReport.csvPath, `report-${selectedReport.id}.csv`)}
									class="flex items-center gap-1.5 h-8 px-3 rounded-sm border border-input bg-background text-xs hover:bg-accent transition-colors"
								>
									<FileSpreadsheet class="h-3.5 w-3.5" />
									CSV
								</button>
							{/if}
						</div>
					</div>

					<!-- KPI Metrics -->
					<div class="grid grid-cols-4 gap-4">
						<div class="bg-muted/30 rounded-sm p-3 h-32 flex flex-col justify-between">
							<p class="text-[10px] text-muted-foreground uppercase tracking-wider">Generated At</p>
							<p class="text-sm font-semibold">{formatDate(selectedReport.generatedAt)}</p>
						</div>
						<div class="bg-muted/30 rounded-sm p-3 h-32 flex flex-col justify-between">
							<p class="text-[10px] text-muted-foreground uppercase tracking-wider">Generated By</p>
							<p class="text-sm font-semibold">{selectedReport.generatedBy || 'System'}</p>
						</div>
						<div class="bg-muted/30 rounded-sm p-3 h-32 flex flex-col justify-between">
							<p class="text-[10px] text-muted-foreground uppercase tracking-wider">Findings</p>
							<p class="text-2xl font-bold">{selectedReport.findings?.length || 0}</p>
						</div>
						<div class="bg-muted/30 rounded-sm p-3 h-32 flex flex-col justify-between">
							<p class="text-[10px] text-muted-foreground uppercase tracking-wider">Created</p>
							<p class="text-sm font-semibold">{formatDateShort(selectedReport.createdAt)}</p>
						</div>
					</div>
				</div>

				<!-- Error Message -->
				{#if selectedReport.errorMessage}
					<div class="rounded-md bg-destructive/10 p-3 text-sm text-destructive font-medium border border-destructive/20">
						<div class="flex items-center gap-2">
							<AlertCircle class="h-4 w-4" />
							{selectedReport.errorMessage}
						</div>
					</div>
				{/if}

				<!-- Findings -->
				{#if selectedReport.findings && selectedReport.findings.length > 0}
					<div class="bg-background border rounded-sm p-4">
						<h3 class="text-sm font-semibold mb-3">Findings</h3>
						<div class="space-y-2">
							{#each selectedReport.findings as finding}
								<div class="rounded-md bg-muted/20 p-3 text-xs border">
									<div class="flex items-start gap-2">
										<AlertCircle class="h-3.5 w-3.5 flex-shrink-0 mt-0.5 text-muted-foreground" />
										<span>{finding}</span>
									</div>
								</div>
							{/each}
						</div>
					</div>
				{/if}

				<!-- Report Data -->
				{#if selectedReport.reportData}
					<div class="bg-background border rounded-sm p-4">
						<h3 class="text-sm font-semibold mb-3">Report Data</h3>
						<pre class="bg-muted/20 p-4 rounded-sm overflow-auto text-[10px] font-mono border">{JSON.stringify(selectedReport.reportData, null, 2)}</pre>
					</div>
				{/if}
			</div>
		</div>
	{:else if selectedTab === 'reports'}
		<!-- Reports Table -->
		<div class="flex-1 overflow-auto min-h-0 relative bg-background">
			<table class="w-full text-sm text-left border-collapse">
				<thead class="sticky top-0 z-10 bg-muted/40 backdrop-blur-sm border-b">
					<tr>
						<th class="px-3 py-2 font-semibold text-xs uppercase tracking-wider text-muted-foreground border-r last:border-r-0 w-24">ID</th>
						<th class="px-3 py-2 font-semibold text-xs uppercase tracking-wider text-muted-foreground border-r last:border-r-0 w-32">Type</th>
						<th class="px-3 py-2 font-semibold text-xs uppercase tracking-wider text-muted-foreground border-r last:border-r-0 w-28">Status</th>
						<th class="px-3 py-2 font-semibold text-xs uppercase tracking-wider text-muted-foreground border-r last:border-r-0">Period</th>
						<th class="px-3 py-2 font-semibold text-xs uppercase tracking-wider text-muted-foreground border-r last:border-r-0 w-40">Generated</th>
						<th class="px-3 py-2 font-semibold text-xs uppercase tracking-wider text-muted-foreground border-r last:border-r-0 w-32">Generated By</th>
						<th class="px-3 py-2 font-semibold text-xs uppercase tracking-wider text-muted-foreground text-center w-24">Findings</th>
						<th class="px-3 py-2 font-semibold text-xs uppercase tracking-wider text-muted-foreground text-center w-24">Actions</th>
					</tr>
				</thead>
				<tbody class="divide-y">
					{#each filteredReports as report (report.id)}
						<tr
							class="hover:bg-muted/30 cursor-pointer transition-colors group"
							onclick={() => goto(`?reportId=${report.id}`)}
						>
							<td class="px-3 py-1.5 border-r last:border-r-0 text-xs font-mono text-muted-foreground">
								#{report.id.slice(0, 8)}
							</td>
							<td class="px-3 py-1.5 border-r last:border-r-0">
								<span class="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium {getReportTypeBadgeColor(report.reportType)}">
									{report.reportType}
								</span>
							</td>
							<td class="px-3 py-1.5 border-r last:border-r-0">
								<span class="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium {getStatusBadgeColor(report.status)}">
									{report.status}
								</span>
							</td>
							<td class="px-3 py-1.5 border-r last:border-r-0 text-xs whitespace-nowrap">
								{formatDateShort(report.periodStart)} - {formatDateShort(report.periodEnd)}
							</td>
							<td class="px-3 py-1.5 border-r last:border-r-0 text-xs text-muted-foreground whitespace-nowrap">
								{formatDate(report.generatedAt)}
							</td>
							<td class="px-3 py-1.5 border-r last:border-r-0 text-xs">
								{report.generatedBy || 'System'}
							</td>
							<td class="px-3 py-1.5 border-r last:border-r-0 text-xs text-center">
								{#if report.findings && report.findings.length > 0}
									<span class="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-yellow-100 text-yellow-700">
										<AlertCircle class="h-3 w-3" />
										{report.findings.length}
									</span>
								{:else}
									<span class="text-muted-foreground">—</span>
								{/if}
							</td>
							<td class="px-3 py-1.5 text-xs text-center">
								<div class="flex items-center justify-center gap-1">
									{#if report.pdfPath}
										<button
											onclick={(e) => {
												e.stopPropagation();
												handleDownloadFile(report.pdfPath, `report-${report.id}.pdf`);
											}}
											class="p-1 hover:bg-accent rounded transition-colors"
											title="Download PDF"
										>
											<FileText class="h-3.5 w-3.5" />
										</button>
									{/if}
									{#if report.csvPath}
										<button
											onclick={(e) => {
												e.stopPropagation();
												handleDownloadFile(report.csvPath, `report-${report.id}.csv`);
											}}
											class="p-1 hover:bg-accent rounded transition-colors"
											title="Download CSV"
										>
											<FileSpreadsheet class="h-3.5 w-3.5" />
										</button>
									{/if}
								</div>
							</td>
						</tr>
					{:else}
						<tr>
							<td colspan="8" class="px-4 py-12 text-center text-muted-foreground text-xs">
								<FileText class="h-12 w-12 mx-auto mb-3 opacity-50" />
								<p>No compliance reports found</p>
							</td>
						</tr>
					{/each}
				</tbody>
			</table>
		</div>
	{:else}
		<!-- Schedules Table -->
		<div class="flex-1 overflow-auto min-h-0 relative bg-background">
			<table class="w-full text-sm text-left border-collapse">
				<thead class="sticky top-0 z-10 bg-muted/40 backdrop-blur-sm border-b">
					<tr>
						<th class="px-3 py-2 font-semibold text-xs uppercase tracking-wider text-muted-foreground border-r last:border-r-0 w-32">Type</th>
						<th class="px-3 py-2 font-semibold text-xs uppercase tracking-wider text-muted-foreground border-r last:border-r-0 w-24">Status</th>
						<th class="px-3 py-2 font-semibold text-xs uppercase tracking-wider text-muted-foreground border-r last:border-r-0 w-32">Cron Schedule</th>
						<th class="px-3 py-2 font-semibold text-xs uppercase tracking-wider text-muted-foreground border-r last:border-r-0 w-40">Last Run</th>
						<th class="px-3 py-2 font-semibold text-xs uppercase tracking-wider text-muted-foreground border-r last:border-r-0 w-40">Next Run</th>
						<th class="px-3 py-2 font-semibold text-xs uppercase tracking-wider text-muted-foreground border-r last:border-r-0 w-32">Created By</th>
						<th class="px-3 py-2 font-semibold text-xs uppercase tracking-wider text-muted-foreground">Recipients</th>
					</tr>
				</thead>
				<tbody class="divide-y">
					{#each schedules as schedule (schedule.id)}
						<tr class="hover:bg-muted/30 transition-colors">
							<td class="px-3 py-1.5 border-r last:border-r-0">
								<span class="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium {getReportTypeBadgeColor(schedule.reportType)}">
									{schedule.reportType}
								</span>
							</td>
							<td class="px-3 py-1.5 border-r last:border-r-0">
								<span class="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium {schedule.enabled ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'}">
									{schedule.enabled ? 'Enabled' : 'Disabled'}
								</span>
							</td>
							<td class="px-3 py-1.5 border-r last:border-r-0 text-xs font-mono">
								{schedule.scheduleCron}
							</td>
							<td class="px-3 py-1.5 border-r last:border-r-0 text-xs text-muted-foreground whitespace-nowrap">
								{schedule.lastRunAt ? formatDate(schedule.lastRunAt) : 'Never'}
							</td>
							<td class="px-3 py-1.5 border-r last:border-r-0 text-xs text-muted-foreground whitespace-nowrap">
								{schedule.nextRunAt ? formatDate(schedule.nextRunAt) : 'N/A'}
							</td>
							<td class="px-3 py-1.5 border-r last:border-r-0 text-xs">
								{schedule.createdBy || 'System'}
							</td>
							<td class="px-3 py-1.5 text-xs">
								{#if schedule.recipients && schedule.recipients.length > 0}
									<div class="flex flex-wrap gap-1">
										{#each schedule.recipients.slice(0, 3) as recipient}
											<span class="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] bg-muted border">
												{recipient}
											</span>
										{/each}
										{#if schedule.recipients.length > 3}
											<span class="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] bg-muted border text-muted-foreground">
												+{schedule.recipients.length - 3}
											</span>
										{/if}
									</div>
								{:else}
									<span class="text-muted-foreground">—</span>
								{/if}
							</td>
						</tr>
					{:else}
						<tr>
							<td colspan="7" class="px-4 py-12 text-center text-muted-foreground text-xs">
								<Calendar class="h-12 w-12 mx-auto mb-3 opacity-50" />
								<p>No report schedules configured</p>
							</td>
						</tr>
					{/each}
				</tbody>
			</table>
		</div>
	{/if}
</div>

<!-- Generate Report Dialog -->
<Dialog.Root bind:open={generateDialogOpen}>
	<Dialog.Portal>
		<Dialog.Overlay />
		<Dialog.Content class="sm:max-w-md">
			<Dialog.Header>
				<Dialog.Title>Generate Compliance Report</Dialog.Title>
				<Dialog.Description>
					Create a new compliance report for the specified period and type.
				</Dialog.Description>
			</Dialog.Header>

			<div class="space-y-4 py-4">
				<!-- Report Type -->
				<div class="space-y-2">
					<label for="report-type" class="text-xs font-medium text-foreground">
						Report Type
					</label>
					<select
						id="report-type"
						bind:value={formReportType}
						class="w-full h-9 rounded-sm border border-input bg-background px-3 text-sm focus:border-primary focus:outline-none"
					>
						<option value="SOX">SOX Compliance</option>
						<option value="GDPR">GDPR Compliance</option>
						<option value="SOC2">SOC2 Compliance</option>
						<option value="DataChanges">Data Changes</option>
						<option value="UserActivity">User Activity</option>
						<option value="AccessLog">Access Log</option>
					</select>
				</div>

				<!-- Date Range -->
				<div class="grid grid-cols-2 gap-4">
					<div class="space-y-2">
						<label for="period-start" class="text-xs font-medium text-foreground">
							Period Start
						</label>
						<input
							id="period-start"
							type="date"
							bind:value={formPeriodStart}
							class="w-full h-9 rounded-sm border border-input bg-background px-3 text-sm focus:border-primary focus:outline-none"
						/>
					</div>
					<div class="space-y-2">
						<label for="period-end" class="text-xs font-medium text-foreground">
							Period End
						</label>
						<input
							id="period-end"
							type="date"
							bind:value={formPeriodEnd}
							class="w-full h-9 rounded-sm border border-input bg-background px-3 text-sm focus:border-primary focus:outline-none"
						/>
					</div>
				</div>

				<!-- Format Options -->
				<div class="space-y-2">
					<div class="text-xs font-medium text-foreground">Export Formats</div>
					<div class="flex flex-col gap-2">
						<label class="flex items-center gap-2 cursor-pointer">
							<input
								type="checkbox"
								bind:checked={formIncludePdf}
								class="w-4 h-4 rounded border-input"
							/>
							<span class="text-sm">Include PDF</span>
						</label>
						<label class="flex items-center gap-2 cursor-pointer">
							<input
								type="checkbox"
								bind:checked={formIncludeCsv}
								class="w-4 h-4 rounded border-input"
							/>
							<span class="text-sm">Include CSV</span>
						</label>
					</div>
				</div>

				<!-- Error Message -->
				{#if generateError}
					<div class="rounded-md bg-destructive/10 p-3 text-sm text-destructive font-medium border border-destructive/20">
						<div class="flex items-center gap-2">
							<AlertCircle class="h-4 w-4" />
							{generateError}
						</div>
					</div>
				{/if}

				<!-- Success Message -->
				{#if generateSuccess}
					<div class="rounded-md bg-green-50 p-3 text-sm text-green-700 font-medium border border-green-200">
						<div class="flex items-center gap-2">
							<CheckCircle class="h-4 w-4" />
							{generateSuccess}
						</div>
					</div>
				{/if}
			</div>

			<Dialog.Footer>
				<button
					type="button"
					onclick={() => generateDialogOpen = false}
					disabled={generating}
					class="h-9 px-4 rounded-sm border border-input bg-background text-sm hover:bg-accent transition-colors disabled:opacity-50"
				>
					Cancel
				</button>
				<button
					type="button"
					onclick={handleGenerateReport}
					disabled={generating || !formIncludePdf && !formIncludeCsv}
					class="h-9 px-4 rounded-sm bg-primary text-primary-foreground text-sm hover:bg-primary/90 transition-colors disabled:opacity-50 flex items-center gap-2"
				>
					{#if generating}
						<RefreshCw class="h-3.5 w-3.5 animate-spin" />
						Generating...
					{:else}
						Generate Report
					{/if}
				</button>
			</Dialog.Footer>
		</Dialog.Content>
	</Dialog.Portal>
</Dialog.Root>
