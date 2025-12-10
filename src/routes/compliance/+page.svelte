<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import * as Card from '$lib/components/ui/card';
	import * as Tabs from '$lib/components/ui/tabs';
	import { Badge } from '$lib/components/ui/badge';
	import * as Progress from '$lib/components/ui/progress';
	import {
		AlertTriangle,
		ArrowLeft,
		CheckCircle,
		Clock,
		Download,
		Eye,
		FileText,
		RefreshCw,
		Shield,
		UserCheck
	} from '@lucide/svelte';

	// Mock compliance data
	const complianceOverview = {
		overallScore: 87,
		totalChecks: 45,
		passed: 39,
		pending: 4,
		failed: 2
	};

	const complianceAreas = [
		{
			name: 'Data Privacy (GDPR)',
			score: 92,
			status: 'compliant',
			lastReview: '2024-01-10',
			nextReview: '2024-04-10',
			description: 'Employee data handling and privacy protection'
		},
		{
			name: 'Employment Law',
			score: 85,
			status: 'compliant',
			lastReview: '2024-01-05',
			nextReview: '2024-03-05',
			description: 'Labor regulations and employment standards'
		},
		{
			name: 'Health & Safety',
			score: 78,
			status: 'warning',
			lastReview: '2023-12-15',
			nextReview: '2024-02-15',
			description: 'Workplace safety and health regulations'
		},
		{
			name: 'Anti-Discrimination',
			score: 95,
			status: 'compliant',
			lastReview: '2024-01-12',
			nextReview: '2024-07-12',
			description: 'Equal opportunity and non-discrimination policies'
		}
	];

	const recentAudits = [
		{
			type: 'Internal Audit',
			area: 'Data Privacy',
			date: '2024-01-10',
			status: 'passed',
			findings: 'Minor documentation updates needed'
		},
		{
			type: 'External Audit',
			area: 'Employment Law',
			date: '2023-12-20',
			status: 'passed',
			findings: 'All requirements met'
		},
		{
			type: 'Self Assessment',
			area: 'Health & Safety',
			date: '2023-12-15',
			status: 'action-required',
			findings: 'Emergency procedures need updating'
		}
	];

	const pendingActions = [
		{
			task: 'Update emergency evacuation procedures',
			area: 'Health & Safety',
			priority: 'high',
			dueDate: '2024-02-15',
			assignee: 'Safety Officer'
		},
		{
			task: 'Review data retention policies',
			area: 'Data Privacy',
			priority: 'medium',
			dueDate: '2024-03-01',
			assignee: 'Legal Team'
		},
		{
			task: 'Conduct harassment prevention training',
			area: 'Anti-Discrimination',
			priority: 'medium',
			dueDate: '2024-02-28',
			assignee: 'HR Team'
		}
	];

	const getStatusColor = (
		status: string
	): 'default' | 'secondary' | 'destructive' | 'outline' => {
		switch (status) {
			case 'compliant':
			case 'passed':
				return 'default';
			case 'warning':
			case 'action-required':
				return 'secondary';
			case 'non-compliant':
			case 'failed':
				return 'destructive';
			default:
				return 'outline';
		}
	};

	const getStatusIcon = (status: string) => {
		switch (status) {
			case 'compliant':
			case 'passed':
				return CheckCircle;
			case 'warning':
			case 'action-required':
				return AlertTriangle;
			case 'non-compliant':
			case 'failed':
				return AlertTriangle;
			default:
				return Clock;
		}
	};

	const getPriorityColor = (
		priority: string
	): 'destructive' | 'secondary' | 'outline' => {
		switch (priority) {
			case 'high':
				return 'destructive';
			case 'medium':
				return 'secondary';
			case 'low':
				return 'outline';
			default:
				return 'outline';
		}
	};
</script>

<svelte:head>
	<title>Compliance Center - MountainHR</title>
	<meta name="description" content="Monitor compliance status and regulatory requirements" />
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
				<UserCheck class="h-8 w-8" />
				Compliance Center
			</h1>
			<p class="text-muted-foreground">Monitor regulatory compliance and audit requirements</p>
		</div>

		<Button>
			<RefreshCw class="mr-2 h-4 w-4" />
			Run Compliance Check
		</Button>
	</div>

	<!-- Compliance Overview -->
	<div class="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
		<Card.Root class="lg:col-span-2">
			<Card.Header>
				<Card.Title>Overall Compliance Score</Card.Title>
			</Card.Header>
			<Card.Content>
				<div class="space-y-2 text-center">
					<div class="text-4xl font-bold text-green-600">{complianceOverview.overallScore}%</div>
					<Progress.Root value={complianceOverview.overallScore} class="w-full" />
					<p class="text-sm text-muted-foreground">
						{complianceOverview.passed} of {complianceOverview.totalChecks} checks passed
					</p>
				</div>
			</Card.Content>
		</Card.Root>

		<Card.Root>
			<Card.Header class="flex flex-row items-center justify-between space-y-0 pb-2">
				<Card.Title class="text-sm font-medium">Passed</Card.Title>
				<CheckCircle class="h-4 w-4 text-green-500" />
			</Card.Header>
			<Card.Content>
				<div class="text-2xl font-bold text-green-600">{complianceOverview.passed}</div>
				<p class="text-xs text-muted-foreground">Compliant areas</p>
			</Card.Content>
		</Card.Root>

		<Card.Root>
			<Card.Header class="flex flex-row items-center justify-between space-y-0 pb-2">
				<Card.Title class="text-sm font-medium">Pending</Card.Title>
				<Clock class="h-4 w-4 text-yellow-500" />
			</Card.Header>
			<Card.Content>
				<div class="text-2xl font-bold text-yellow-600">{complianceOverview.pending}</div>
				<p class="text-xs text-muted-foreground">Under review</p>
			</Card.Content>
		</Card.Root>

		<Card.Root>
			<Card.Header class="flex flex-row items-center justify-between space-y-0 pb-2">
				<Card.Title class="text-sm font-medium">Failed</Card.Title>
				<AlertTriangle class="h-4 w-4 text-red-500" />
			</Card.Header>
			<Card.Content>
				<div class="text-2xl font-bold text-red-600">{complianceOverview.failed}</div>
				<p class="text-xs text-muted-foreground">Action required</p>
			</Card.Content>
		</Card.Root>
	</div>

	<!-- Compliance Tabs -->
	<Tabs.Root value="areas" class="w-full">
		<Tabs.List class="grid w-full grid-cols-4">
			<Tabs.Trigger value="areas">Compliance Areas</Tabs.Trigger>
			<Tabs.Trigger value="audits">Audit History</Tabs.Trigger>
			<Tabs.Trigger value="actions">Pending Actions</Tabs.Trigger>
			<Tabs.Trigger value="documents">Documents</Tabs.Trigger>
		</Tabs.List>

		<!-- Compliance Areas -->
		<Tabs.Content value="areas" class="space-y-4">
			{#each complianceAreas as area}
				<Card.Root>
					<Card.Content class="pt-6">
						<div class="flex items-center justify-between">
							<div class="space-y-1">
								<div class="flex items-center gap-3">
									<h3 class="font-semibold">{area.name}</h3>
									<Badge variant={getStatusColor(area.status)}>
										{area.status}
									</Badge>
								</div>
								<p class="text-sm text-muted-foreground">{area.description}</p>
								<div class="flex items-center gap-4 text-xs text-muted-foreground">
									<span>Last Review: {area.lastReview}</span>
									<span>Next Review: {area.nextReview}</span>
								</div>
							</div>
							<div class="space-y-2 text-right">
								<div class="text-2xl font-bold">{area.score}%</div>
								<Progress.Root value={area.score} class="w-24" />
								<div class="flex gap-1">
									<Button size="sm" variant="outline">
										<Eye class="mr-1 h-3 w-3" />
										Details
									</Button>
									<Button size="sm" variant="outline">
										<FileText class="mr-1 h-3 w-3" />
										Report
									</Button>
								</div>
							</div>
						</div>
					</Card.Content>
				</Card.Root>
			{/each}
		</Tabs.Content>

		<!-- Audit History -->
		<Tabs.Content value="audits" class="space-y-4">
			<Card.Root>
				<Card.Header>
					<Card.Title>Recent Audits</Card.Title>
					<Card.Description>History of compliance audits and assessments</Card.Description>
				</Card.Header>
				<Card.Content>
					<div class="space-y-4">
						{#each recentAudits as audit}
							<div class="flex items-center justify-between rounded-lg border p-4">
								<div class="flex items-center gap-3">
									<svelte:component
										this={getStatusIcon(audit.status)}
										class="h-5 w-5 {audit.status === 'passed'
											? 'text-green-500'
											: audit.status === 'action-required'
												? 'text-yellow-500'
												: audit.status === 'failed'
													? 'text-red-500'
													: ''}"
									/>
									<div>
										<h4 class="font-medium">{audit.type}</h4>
										<p class="text-sm text-muted-foreground">{audit.area} • {audit.date}</p>
										<p class="text-xs text-muted-foreground">{audit.findings}</p>
									</div>
								</div>
								<div class="flex items-center gap-2">
									<Badge variant={getStatusColor(audit.status)}>
										{audit.status.replace('-', ' ')}
									</Badge>
									<Button size="sm" variant="outline">
										<Download class="mr-1 h-3 w-3" />
										Report
									</Button>
								</div>
							</div>
						{/each}
					</div>
				</Card.Content>
			</Card.Root>
		</Tabs.Content>

		<!-- Pending Actions -->
		<Tabs.Content value="actions" class="space-y-4">
			<Card.Root>
				<Card.Header>
					<Card.Title>Action Items</Card.Title>
					<Card.Description>Pending compliance tasks requiring attention</Card.Description>
				</Card.Header>
				<Card.Content>
					<div class="space-y-4">
						{#each pendingActions as action}
							<div class="flex items-center justify-between rounded-lg border p-4">
								<div class="space-y-1">
									<div class="flex items-center gap-3">
										<h4 class="font-medium">{action.task}</h4>
										<Badge variant={getPriorityColor(action.priority)}>
											{action.priority} priority
										</Badge>
									</div>
									<p class="text-sm text-muted-foreground">{action.area}</p>
									<div class="flex items-center gap-4 text-xs text-muted-foreground">
										<span>Due: {action.dueDate}</span>
										<span>Assigned to: {action.assignee}</span>
									</div>
								</div>
								<div class="flex gap-2">
									<Button size="sm" variant="outline">Assign</Button>
									<Button size="sm">Complete</Button>
								</div>
							</div>
						{/each}
					</div>
				</Card.Content>
			</Card.Root>
		</Tabs.Content>

		<!-- Documents -->
		<Tabs.Content value="documents" class="space-y-4">
			<Card.Root>
				<Card.Header>
					<Card.Title>Compliance Documents</Card.Title>
					<Card.Description>Policies, procedures, and regulatory documents</Card.Description>
				</Card.Header>
				<Card.Content>
					<div class="grid gap-4 md:grid-cols-2">
						<div class="space-y-3">
							<h4 class="font-medium">Policies & Procedures</h4>
							<div class="space-y-2">
								<div class="flex items-center justify-between rounded border p-2">
									<span class="text-sm">Employee Handbook</span>
									<Button size="sm" variant="outline">
										<Download class="h-3 w-3" />
									</Button>
								</div>
								<div class="flex items-center justify-between rounded border p-2">
									<span class="text-sm">Data Privacy Policy</span>
									<Button size="sm" variant="outline">
										<Download class="h-3 w-3" />
									</Button>
								</div>
								<div class="flex items-center justify-between rounded border p-2">
									<span class="text-sm">Anti-Harassment Policy</span>
									<Button size="sm" variant="outline">
										<Download class="h-3 w-3" />
									</Button>
								</div>
							</div>
						</div>
						<div class="space-y-3">
							<h4 class="font-medium">Regulatory Documents</h4>
							<div class="space-y-2">
								<div class="flex items-center justify-between rounded border p-2">
									<span class="text-sm">GDPR Compliance Report</span>
									<Button size="sm" variant="outline">
										<Download class="h-3 w-3" />
									</Button>
								</div>
								<div class="flex items-center justify-between rounded border p-2">
									<span class="text-sm">Safety Audit Certificate</span>
									<Button size="sm" variant="outline">
										<Download class="h-3 w-3" />
									</Button>
								</div>
								<div class="flex items-center justify-between rounded border p-2">
									<span class="text-sm">Employment Law Checklist</span>
									<Button size="sm" variant="outline">
										<Download class="h-3 w-3" />
									</Button>
								</div>
							</div>
						</div>
					</div>
				</Card.Content>
			</Card.Root>
		</Tabs.Content>
	</Tabs.Root>
</div>
