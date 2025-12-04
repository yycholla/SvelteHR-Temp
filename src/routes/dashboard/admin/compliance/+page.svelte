<script lang="ts">
	import {
		Shield,
		CheckCircle,
		AlertTriangle,
		XCircle,
		Download,
		RefreshCw,
		FileText,
		TrendingUp
	} from '@lucide/svelte';

	export let data;

	const { complianceMetrics, complianceReports, stats } = data;

	function getStatusColor(status: string): string {
		switch (status) {
			case 'Compliant':
			case 'good':
				return 'text-green-600 bg-green-100';
			case 'Needs Review':
			case 'warning':
				return 'text-yellow-600 bg-yellow-100';
			case 'Non-Compliant':
			case 'critical':
				return 'text-red-600 bg-red-100';
			default:
				return 'text-gray-600 bg-gray-100';
		}
	}

	function getStatusIcon(status: string) {
		switch (status) {
			case 'Compliant':
			case 'good':
				return CheckCircle;
			case 'Needs Review':
			case 'warning':
				return AlertTriangle;
			case 'Non-Compliant':
			case 'critical':
				return XCircle;
			default:
				return Shield;
		}
	}

	function getScoreColor(score: number): string {
		if (score >= 90) return 'text-green-600';
		if (score >= 70) return 'text-yellow-600';
		return 'text-red-600';
	}

	function exportReport(reportId: string) {
		const report = complianceReports.find((r) => r.id === reportId);
		if (!report) return;

		const content = `
Compliance Report: ${report.title}
Type: ${report.type}
Status: ${report.status}
Last Run: ${new Date(report.lastRun).toLocaleString()}
Schedule: ${report.schedule}

Findings:
${report.findings}

${report.actions.length > 0 ? `Required Actions:\n${report.actions.map((a) => `- ${a}`).join('\n')}` : 'No actions required.'}
		`.trim();

		const blob = new Blob([content], { type: 'text/plain' });
		const url = window.URL.createObjectURL(blob);
		const a = document.createElement('a');
		a.href = url;
		a.download = `compliance-report-${reportId}-${new Date().toISOString().split('T')[0]}.txt`;
		a.click();
		window.URL.revokeObjectURL(url);
	}

	function exportAllReports() {
		const content = complianceReports
			.map((report) =>
				`
Compliance Report: ${report.title}
Type: ${report.type}
Status: ${report.status}
Last Run: ${new Date(report.lastRun).toLocaleString()}
Schedule: ${report.schedule}
Findings: ${report.findings}
${report.actions.length > 0 ? `Actions: ${report.actions.join(', ')}` : 'No actions required'}
---
		`.trim()
			)
			.join('\n\n');

		const blob = new Blob([content], { type: 'text/plain' });
		const url = window.URL.createObjectURL(blob);
		const a = document.createElement('a');
		a.href = url;
		a.download = `all-compliance-reports-${new Date().toISOString().split('T')[0]}.txt`;
		a.click();
		window.URL.revokeObjectURL(url);
	}
</script>

<div class="space-y-6 p-6">
	<!-- Header -->
	<div class="flex items-center justify-between">
		<div>
			<h1 class="text-3xl font-bold">Compliance Reports</h1>
			<p class="text-muted-foreground">System compliance status and audit reports</p>
		</div>
		<button
			onclick={exportAllReports}
			class="flex items-center gap-2 rounded-md border px-4 py-2 text-sm font-medium hover:bg-accent"
		>
			<Download class="h-4 w-4" />
			Export All Reports
		</button>
	</div>

	<!-- Error message -->
	{#if data.error}
		<div class="rounded-md bg-destructive/10 p-4 text-destructive">
			{data.error}
		</div>
	{/if}

	<!-- Compliance Score Overview -->
	<div class="rounded-lg border bg-card p-6">
		<h2 class="mb-4 text-xl font-semibold">Compliance Overview</h2>
		<div class="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
			{#each Object.entries(complianceMetrics) as [key, metric]}
				{@const StatusIcon = getStatusIcon(metric.status)}
				<div class="rounded-lg border bg-muted/50 p-4">
					<div class="mb-2 flex items-center justify-between">
						<p class="text-sm font-medium">{metric.description}</p>
						<StatusIcon class="h-5 w-5 {getStatusColor(metric.status).split(' ')[0]}" />
					</div>
					<p class="text-3xl font-bold {getScoreColor(metric.score)}">{metric.score}%</p>
					<div class="mt-2 h-2 w-full overflow-hidden rounded-full bg-muted">
						<div
							class="h-full transition-all"
							class:bg-green-600={metric.score >= 90}
							class:bg-yellow-600={metric.score >= 70 && metric.score < 90}
							class:bg-red-600={metric.score < 70}
							style="width: {metric.score}%"
						></div>
					</div>
				</div>
			{/each}
		</div>
	</div>

	<!-- Stats Cards -->
	<div class="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
		<div class="rounded-lg border bg-card p-4">
			<p class="text-sm text-muted-foreground">Total Users</p>
			<p class="text-2xl font-bold">{stats.totalUsers}</p>
		</div>
		<div class="rounded-lg border bg-card p-4">
			<p class="text-sm text-muted-foreground">Active Users</p>
			<p class="text-2xl font-bold text-green-600">{stats.activeUsers}</p>
		</div>
		<div class="rounded-lg border bg-card p-4">
			<p class="text-sm text-muted-foreground">Inactive Users</p>
			<p class="text-2xl font-bold text-orange-600">{stats.inactiveUsers}</p>
		</div>
		<div class="rounded-lg border bg-card p-4">
			<p class="text-sm text-muted-foreground">Recently Updated</p>
			<p class="text-2xl font-bold">{stats.recentlyUpdated}</p>
		</div>
		<div class="rounded-lg border bg-card p-4">
			<p class="text-sm text-muted-foreground">Stale Records</p>
			<p class="text-2xl font-bold text-red-600">{stats.staleUsers}</p>
		</div>
	</div>

	<!-- Compliance Reports Table -->
	<div class="rounded-lg border bg-card">
		<div class="border-b p-4">
			<h2 class="flex items-center gap-2 text-xl font-semibold">
				<FileText class="h-5 w-5" />
				Compliance Reports
			</h2>
		</div>

		<div class="overflow-x-auto">
			<table class="w-full text-sm">
				<thead class="border-b bg-muted/50">
					<tr>
						<th class="px-4 py-3 text-left font-medium">Report</th>
						<th class="px-4 py-3 text-left font-medium">Type</th>
						<th class="px-4 py-3 text-left font-medium">Status</th>
						<th class="px-4 py-3 text-left font-medium">Last Run</th>
						<th class="px-4 py-3 text-left font-medium">Schedule</th>
						<th class="px-4 py-3 text-left font-medium">Findings</th>
						<th class="px-4 py-3 text-right font-medium">Actions</th>
					</tr>
				</thead>
				<tbody>
					{#each complianceReports as report (report.id)}
						{@const StatusIcon = getStatusIcon(report.status)}
						<tr class="border-b hover:bg-muted/50">
							<td class="px-4 py-3 font-medium">{report.title}</td>
							<td class="px-4 py-3">{report.type}</td>
							<td class="px-4 py-3">
								<span
									class="flex items-center gap-1 rounded-full px-2 py-1 text-xs font-medium {getStatusColor(
										report.status
									)}"
								>
									<StatusIcon class="h-3 w-3" />
									{report.status}
								</span>
							</td>
							<td class="px-4 py-3 text-xs text-muted-foreground">
								{new Date(report.lastRun).toLocaleDateString()}
							</td>
							<td class="px-4 py-3">{report.schedule}</td>
							<td class="px-4 py-3 max-w-xs truncate" title={report.findings}>
								{report.findings}
							</td>
							<td class="px-4 py-3 text-right">
								<button
									onclick={() => exportReport(report.id)}
									class="rounded-md p-2 hover:bg-accent"
									title="Export report"
								>
									<Download class="h-4 w-4" />
								</button>
							</td>
						</tr>
					{:else}
						<tr>
							<td colspan="7" class="px-4 py-8 text-center text-muted-foreground">
								No compliance reports available
							</td>
						</tr>
					{/each}
				</tbody>
			</table>
		</div>
	</div>

	<!-- Action Items -->
	{#if complianceReports.filter((r) => r.actions.length > 0).length > 0}
		{@const reportsWithActions = complianceReports.filter((r) => r.actions.length > 0)}
		<div class="rounded-lg border bg-card p-6">
			<h2 class="mb-4 flex items-center gap-2 text-xl font-semibold">
				<AlertTriangle class="h-5 w-5 text-yellow-600" />
				Required Actions
			</h2>
			<div class="space-y-4">
				{#each reportsWithActions as report}
					<div class="rounded-lg border bg-muted/50 p-4">
						<h3 class="mb-2 font-medium">{report.title}</h3>
						<ul class="space-y-1 text-sm text-muted-foreground">
							{#each report.actions as action}
								<li class="flex items-start gap-2">
									<span class="mt-1 h-1.5 w-1.5 rounded-full bg-yellow-600"></span>
									{action}
								</li>
							{/each}
						</ul>
					</div>
				{/each}
			</div>
		</div>
	{/if}

	<!-- Compliance Trends -->
	<div class="rounded-lg border bg-card p-6">
		<h2 class="mb-4 flex items-center gap-2 text-xl font-semibold">
			<TrendingUp class="h-5 w-5" />
			Compliance Trends
		</h2>
		<div class="grid gap-4 md:grid-cols-3">
			<div class="rounded-lg border bg-muted/50 p-4">
				<p class="text-sm text-muted-foreground">Overall Score</p>
				<p class="text-3xl font-bold text-green-600">92%</p>
				<p class="mt-1 flex items-center gap-1 text-sm text-green-600">
					<TrendingUp class="h-3 w-3" />
					+3% from last month
				</p>
			</div>
			<div class="rounded-lg border bg-muted/50 p-4">
				<p class="text-sm text-muted-foreground">Compliant Reports</p>
				<p class="text-3xl font-bold">
					{complianceReports.filter((r) => r.status === 'Compliant')
						.length}/{complianceReports.length}
				</p>
				<p class="mt-1 text-sm text-muted-foreground">
					{Math.round(
						(complianceReports.filter((r) => r.status === 'Compliant').length /
							complianceReports.length) *
							100
					)}% compliance rate
				</p>
			</div>
			<div class="rounded-lg border bg-muted/50 p-4">
				<p class="text-sm text-muted-foreground">Last Audit</p>
				<p class="text-xl font-bold">
					{new Date(
						Math.max(...complianceReports.map((r) => new Date(r.lastRun).getTime()))
					).toLocaleDateString()}
				</p>
				<p class="mt-1 text-sm text-muted-foreground">Most recent check</p>
			</div>
		</div>
	</div>
</div>
