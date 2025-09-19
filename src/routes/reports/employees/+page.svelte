<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import * as Card from '$lib/components/ui/card';
	import * as Tabs from '$lib/components/ui/tabs';
	import * as Badge from '$lib/components/ui/badge';
	import {
		FileText,
		Download,
		Calendar,
		Users,
		TrendingUp,
		Filter,
		ArrowLeft,
		BarChart3,
		PieChart
	} from 'lucide-svelte';

	// Mock reports data
	const reportCategories = [
		{
			title: 'Employee Summary Report',
			description: 'Comprehensive overview of all employees',
			lastGenerated: '2024-01-15',
			format: 'PDF',
			status: 'Ready'
		},
		{
			title: 'Department Headcount',
			description: 'Employee distribution by department',
			lastGenerated: '2024-01-14',
			format: 'Excel',
			status: 'Ready'
		},
		{
			title: 'New Hires Report',
			description: 'Recent additions to the team',
			lastGenerated: '2024-01-13',
			format: 'PDF',
			status: 'Generating'
		},
		{
			title: 'Employee Turnover Analysis',
			description: 'Turnover trends and metrics',
			lastGenerated: '2024-01-10',
			format: 'Excel',
			status: 'Ready'
		}
	];

	const quickStats = [
		{ label: 'Total Employees', value: '247', change: '+12', trend: 'up' },
		{ label: 'Active Employees', value: '238', change: '+8', trend: 'up' },
		{ label: 'New Hires (MTD)', value: '5', change: '-2', trend: 'down' },
		{ label: 'Departments', value: '12', change: '0', trend: 'neutral' }
	];

	const getStatusColor = (status: string) => {
		switch (status) {
			case 'Ready': return 'default';
			case 'Generating': return 'secondary';
			case 'Error': return 'destructive';
			default: return 'outline';
		}
	};
</script>

<svelte:head>
	<title>Employee Reports - SvelteHR</title>
	<meta name="description" content="Generate and download employee reports" />
</svelte:head>

<div class="space-y-6">
	<!-- Header -->
	<div class="flex items-center space-x-4">
		<Button variant="outline" size="sm" href="/dashboard">
			<ArrowLeft class="mr-2 h-4 w-4" />
			Back to Dashboard
		</Button>

		<div class="flex-1">
			<h1 class="flex items-center gap-3 text-3xl font-bold tracking-tight">
				<FileText class="h-8 w-8" />
				Employee Reports
			</h1>
			<p class="text-muted-foreground">Generate comprehensive reports and analytics</p>
		</div>

		<Button>
			<Filter class="mr-2 h-4 w-4" />
			Custom Report
		</Button>
	</div>

	<!-- Quick Stats -->
	<div class="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
		{#each quickStats as stat}
			<Card.Root>
				<Card.Header class="flex flex-row items-center justify-between space-y-0 pb-2">
					<Card.Title class="text-sm font-medium">{stat.label}</Card.Title>
					<Users class="h-4 w-4 text-muted-foreground" />
				</Card.Header>
				<Card.Content>
					<div class="text-2xl font-bold">{stat.value}</div>
					<p class="text-xs text-muted-foreground flex items-center gap-1">
						{#if stat.trend === 'up'}
							<TrendingUp class="h-3 w-3 text-green-500" />
							<span class="text-green-500">{stat.change}</span>
						{:else if stat.trend === 'down'}
							<TrendingUp class="h-3 w-3 text-red-500 rotate-180" />
							<span class="text-red-500">{stat.change}</span>
						{:else}
							<span class="text-muted-foreground">{stat.change}</span>
						{/if}
						from last month
					</p>
				</Card.Content>
			</Card.Root>
		{/each}
	</div>

	<!-- Reports Tabs -->
	<Tabs.Root value="standard" class="w-full">
		<Tabs.List class="grid w-full grid-cols-3">
			<Tabs.Trigger value="standard">Standard Reports</Tabs.Trigger>
			<Tabs.Trigger value="analytics">Analytics</Tabs.Trigger>
			<Tabs.Trigger value="custom">Custom Reports</Tabs.Trigger>
		</Tabs.List>

		<!-- Standard Reports -->
		<Tabs.Content value="standard" class="space-y-6">
			<Card.Root>
				<Card.Header>
					<Card.Title>Available Reports</Card.Title>
					<Card.Description>Pre-configured reports ready for download</Card.Description>
				</Card.Header>
				<Card.Content>
					<div class="space-y-4">
						{#each reportCategories as report}
							<div class="flex items-center justify-between p-4 border rounded-lg">
								<div class="space-y-1">
									<h4 class="font-medium">{report.title}</h4>
									<p class="text-sm text-muted-foreground">{report.description}</p>
									<p class="text-xs text-muted-foreground">
										Last generated: {report.lastGenerated} • Format: {report.format}
									</p>
								</div>
								<div class="flex items-center gap-2">
									<Badge.Root variant={getStatusColor(report.status)}>
										{report.status}
									</Badge.Root>
									<Button size="sm" variant="outline" disabled={report.status === 'Generating'}>
										<Download class="mr-2 h-4 w-4" />
										Download
									</Button>
								</div>
							</div>
						{/each}
					</div>
				</Card.Content>
			</Card.Root>

			<div class="grid gap-6 md:grid-cols-2">
				<Card.Root>
					<Card.Header>
						<Card.Title>Report Scheduler</Card.Title>
						<Card.Description>Set up automated report generation</Card.Description>
					</Card.Header>
					<Card.Content class="space-y-4">
						<div class="space-y-2">
							<label class="text-sm font-medium">Report Type</label>
							<select class="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
								<option>Employee Summary</option>
								<option>Department Headcount</option>
								<option>Turnover Analysis</option>
							</select>
						</div>
						<div class="space-y-2">
							<label class="text-sm font-medium">Frequency</label>
							<select class="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
								<option>Weekly</option>
								<option>Monthly</option>
								<option>Quarterly</option>
							</select>
						</div>
					</Card.Content>
					<Card.Footer>
						<Button class="w-full">
							<Calendar class="mr-2 h-4 w-4" />
							Schedule Report
						</Button>
					</Card.Footer>
				</Card.Root>

				<Card.Root>
					<Card.Header>
						<Card.Title>Export Options</Card.Title>
						<Card.Description>Choose your preferred export format</Card.Description>
					</Card.Header>
					<Card.Content class="space-y-3">
						<Button variant="outline" class="w-full justify-start">
							<FileText class="mr-2 h-4 w-4" />
							Export to PDF
						</Button>
						<Button variant="outline" class="w-full justify-start">
							<BarChart3 class="mr-2 h-4 w-4" />
							Export to Excel
						</Button>
						<Button variant="outline" class="w-full justify-start">
							<PieChart class="mr-2 h-4 w-4" />
							Export to CSV
						</Button>
					</Card.Content>
				</Card.Root>
			</div>
		</Tabs.Content>

		<!-- Analytics -->
		<Tabs.Content value="analytics" class="space-y-6">
			<Card.Root>
				<Card.Header>
					<Card.Title>Employee Analytics Dashboard</Card.Title>
					<Card.Description>Visual insights and trends</Card.Description>
				</Card.Header>
				<Card.Content>
					<div class="grid gap-4 md:grid-cols-2">
						<div class="h-32 rounded border-2 border-dashed border-muted-foreground/25 flex items-center justify-center">
							<p class="text-muted-foreground">Department Distribution Chart</p>
						</div>
						<div class="h-32 rounded border-2 border-dashed border-muted-foreground/25 flex items-center justify-center">
							<p class="text-muted-foreground">Headcount Trend</p>
						</div>
						<div class="h-32 rounded border-2 border-dashed border-muted-foreground/25 flex items-center justify-center">
							<p class="text-muted-foreground">Turnover Rate</p>
						</div>
						<div class="h-32 rounded border-2 border-dashed border-muted-foreground/25 flex items-center justify-center">
							<p class="text-muted-foreground">Hiring Trends</p>
						</div>
					</div>
				</Card.Content>
			</Card.Root>
		</Tabs.Content>

		<!-- Custom Reports -->
		<Tabs.Content value="custom" class="space-y-6">
			<Card.Root>
				<Card.Header>
					<Card.Title>Custom Report Builder</Card.Title>
					<Card.Description>Create tailored reports with specific criteria</Card.Description>
				</Card.Header>
				<Card.Content class="space-y-4">
					<div class="grid gap-4 md:grid-cols-2">
						<div class="space-y-2">
							<label class="text-sm font-medium">Data Source</label>
							<select class="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
								<option>Employee Records</option>
								<option>Department Data</option>
								<option>Performance Data</option>
								<option>Leave Records</option>
							</select>
						</div>
						<div class="space-y-2">
							<label class="text-sm font-medium">Date Range</label>
							<select class="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
								<option>Last 30 days</option>
								<option>Last 3 months</option>
								<option>Last 6 months</option>
								<option>Custom range</option>
							</select>
						</div>
					</div>

					<div class="space-y-2">
						<label class="text-sm font-medium">Include Fields</label>
						<div class="grid grid-cols-2 gap-2">
							<label class="flex items-center space-x-2">
								<input type="checkbox" checked />
								<span class="text-sm">Employee Name</span>
							</label>
							<label class="flex items-center space-x-2">
								<input type="checkbox" checked />
								<span class="text-sm">Department</span>
							</label>
							<label class="flex items-center space-x-2">
								<input type="checkbox" />
								<span class="text-sm">Position</span>
							</label>
							<label class="flex items-center space-x-2">
								<input type="checkbox" />
								<span class="text-sm">Start Date</span>
							</label>
							<label class="flex items-center space-x-2">
								<input type="checkbox" />
								<span class="text-sm">Salary Range</span>
							</label>
							<label class="flex items-center space-x-2">
								<input type="checkbox" />
								<span class="text-sm">Performance Rating</span>
							</label>
						</div>
					</div>
				</Card.Content>
				<Card.Footer>
					<Button class="w-full">
						<FileText class="mr-2 h-4 w-4" />
						Generate Custom Report
					</Button>
				</Card.Footer>
			</Card.Root>
		</Tabs.Content>
	</Tabs.Root>
</div>