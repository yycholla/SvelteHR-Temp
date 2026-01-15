<script lang="ts">
	import { Download, Eye, FileText, Plus, RotateCcw, Trash2 } from '@lucide/svelte';

	interface Props {
		reports: any[];
		selectedReports: string[];
		canCreateReports: boolean;
		canRunReports: boolean;
		canEditReports: boolean;
		onCreate: () => void;
		onView: (report: any) => void;
		onRun: (report: any) => void;
		onDownload: (report: any) => void;
	}

	let {
		reports,
		selectedReports = $bindable(),
		canCreateReports,
		canRunReports,
		canEditReports,
		onCreate,
		onView,
		onRun,
		onDownload
	}: Props = $props();

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
</script>

<div class="overflow-hidden rounded-lg border bg-card shadow-sm">
	<div class="overflow-x-auto">
		<table class="w-full text-sm">
			<thead class="bg-muted/50">
				<tr>
					<th class="px-6 py-3 text-left">
						<input
							type="checkbox"
							class="rounded border-input text-primary focus:outline-none"
							checked={selectedReports.length === reports.length && reports.length > 0}
							indeterminate={selectedReports.length > 0 && selectedReports.length < reports.length}
							onchange={selectAllReports}
						/>
					</th>
					{#each tableColumns as column}
						<th
							class="px-6 py-3 text-left text-xs font-medium tracking-wider text-muted-foreground uppercase"
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
							<span class="text-sm text-foreground capitalize">{report.category}</span>
						</td>
						<td class="px-6 py-4">
							<span
								class="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium {statusBadge.color}"
							>
								{statusBadge.label}
							</span>
						</td>
						<td class="px-6 py-4 text-sm text-foreground">
							{report.department ? report.department.name : 'All'}
						</td>
						<td class="px-6 py-4 text-sm text-foreground">
							{report.generatedCount ?? 0}
						</td>
						<td class="px-6 py-4 text-sm text-foreground">
							{formatDate(report.lastRunAt ?? null)}
						</td>
						<td class="px-6 py-4">
							<div class="flex items-center gap-2">
								<button
									onclick={() => onView(report)}
									class="rounded p-1 text-blue-600 hover:bg-blue-100"
									title="View Report"
								>
									<Eye class="h-4 w-4" />
								</button>
								{#if canRunReports}
									<button
										onclick={() => onRun(report)}
										class="rounded p-1 text-green-600 hover:bg-green-100"
										title="Run Report"
									>
										<RotateCcw class="h-4 w-4" />
									</button>
								{/if}
								<button
									onclick={() => onDownload(report)}
									class="rounded p-1 text-purple-600 hover:bg-purple-100"
									title="Download Report"
								>
									<Download class="h-4 w-4" />
								</button>
								{#if canEditReports}
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
			{#if canCreateReports}
				<button
					onclick={onCreate}
					class="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-primary-foreground hover:bg-primary/90"
				>
					<Plus class="h-5 w-5" />
					Create Report
				</button>
			{/if}
		</div>
	{/if}
</div>
