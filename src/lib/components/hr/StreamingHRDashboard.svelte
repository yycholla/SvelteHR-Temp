<script lang="ts">
	import { Users, CheckSquare, Shield, AlertCircle, Calendar, TrendingUp, FileText, Target, Briefcase, Clock } from 'lucide-svelte';
	import Badge from '$lib/components/ui/badge/badge.svelte';
	import Button from '$lib/components/ui/button/button.svelte';
	
	// Import our new modular components
	import StatCard from '$lib/components/common/StatCard.svelte';
	import StreamingCard from '$lib/components/common/StreamingCard.svelte';
	import EmployeeList from '$lib/components/common/EmployeeList.svelte';
	import ActivityFeed from '$lib/components/common/ActivityFeed.svelte';
	import TaskList from '$lib/components/common/TaskList.svelte';
	import DepartmentChart from '$lib/components/common/DepartmentChart.svelte';
	
	// Import our data transformation utilities
	import { 
		transformEmployeeStats,
		transformTaskStats,
		transformDepartmentData,
		transformActivityData,
		transformTaskData,
		hasData
	} from '$lib/utils/dataTransformers.js';

	interface Props {
		data: Record<string, any>;
	}

	let { data }: Props = $props();

	// Transform streaming data using our utilities
	let employees = $derived(data['employees'] || { data: [], total: 0 });
	let tasks = $derived(data['tasks'] || []);
	let compliance = $derived(data['compliance'] || { overallRate: 0 });
	let events = $derived(data['events'] || []);
	let notifications = $derived(data['notifications'] || { unread: 0 });

	// Calculate statistics using our transformers
	let employeeStats = $derived(transformEmployeeStats(employees));
	let taskStats = $derived(transformTaskStats(tasks));
	let departmentData = $derived(transformDepartmentData(employees));
	let activityData = $derived(transformActivityData(events, 5));
	let taskData = $derived(transformTaskData(tasks, 5));

	// Data loading states
	let employeesLoaded = $derived(hasData(data['employees']));
	let tasksLoaded = $derived(hasData(data['tasks']));
	let eventsLoaded = $derived(hasData(data['events']));
	let complianceLoaded = $derived(hasData(data['compliance']));

	// Calculate trends (mock data - would come from historical data in real app)
	let employeeTrend = $derived({
		value: employeeStats.activeEmployees > 0 ? '+2 this month' : 'No change',
		type: employeeStats.activeEmployees > 0 ? 'positive' as const : 'neutral' as const
	});

	let taskTrend = $derived({
		value: taskStats.overdueTasks > 0 ? `${taskStats.overdueTasks} overdue` : 'On track',
		type: taskStats.overdueTasks > 0 ? 'warning' as const : 'positive' as const
	});

	let complianceTrend = $derived({
		value: compliance.overallRate >= 90 ? 'Excellent' : 'Needs attention',
		type: compliance.overallRate >= 90 ? 'positive' as const : 'warning' as const
	});
</script>

<div class="hr-dashboard-container">
	<!-- HR Dashboard Header -->
	<div class="dashboard-header">
		<div class="header-content">
			<h1 class="dashboard-title">HR Dashboard</h1>
			<p class="dashboard-subtitle">Comprehensive human resources management overview</p>
			<div class="header-tags">
				<Badge variant="secondary" class="header-tag">#hr</Badge>
				<Badge variant="outline" class="header-tag">Live Data</Badge>
				<Badge variant="outline" class="header-tag">Real-time</Badge>
			</div>
		</div>
	</div>

	<!-- Overview Stats Section -->
	<div class="section">
		<div class="section-header">
			<h2 class="section-title">Overview</h2>
			<p class="section-description">Key HR metrics and statistics</p>
		</div>
		<div class="stats-grid">
			<StatCard
				title="Total Employees"
				value={employeeStats.totalEmployees}
				icon={Users}
				trend={employeeTrend}
				tag="#hr"
				href="/hr/employees"
				loading={!employeesLoaded}
			/>
			<StatCard
				title="Active Tasks"
				value={taskStats.pendingTasks + taskStats.inProgressTasks}
				icon={CheckSquare}
				trend={taskTrend}
				tag="#hr"
				href="/hr/tasks"
				loading={!tasksLoaded}
			/>
			<StatCard
				title="Compliance Rate"
				value="{compliance.overallRate || 0}%"
				icon={Shield}
				trend={complianceTrend}
				tag="#hr"
				href="/hr/compliance"
				loading={!complianceLoaded}
			/>
			<StatCard
				title="Onboarding"
				value={employeeStats.onboardingEmployees}
				icon={Target}
				trend={{ value: `${employeeStats.onboardingEmployees} in progress`, type: 'neutral' }}
				tag="#hr"
				href="/hr/onboarding"
				loading={!employeesLoaded}
			/>
		</div>
	</div>

	<!-- Operations Section -->
	<div class="section">
		<div class="section-header">
			<h2 class="section-title">Operations</h2>
			<p class="section-description">Active HR processes and workflows</p>
		</div>
		<div class="cards-grid">
			<StreamingCard
				title="Onboarding Pipeline"
				description="New hire progress and status tracking"
				icon={Target}
				tag="#hr"
				href="/hr/onboarding"
				loading={!employeesLoaded}
				empty={employeeStats.onboardingEmployees === 0}
				emptyMessage="No employees currently onboarding"
			>
				{#snippet children()}
					<EmployeeList
						employees={employees.data?.filter(e => e.status === 'Onboarding') || []}
						showCount={3}
						showDepartment={true}
					/>
				{/snippet}
			</StreamingCard>

			<StreamingCard
				title="Recent HR Activities"
				description="Latest HR system updates and changes"
				icon={Clock}
				tag="#hr"
				href="/hr/activities"
				loading={!eventsLoaded}
				empty={activityData.length === 0}
				emptyMessage="No recent activities"
			>
				{#snippet children()}
					<ActivityFeed activities={activityData} showCount={4} />
				{/snippet}
			</StreamingCard>

			<StreamingCard
				title="Document Management"
				description="HR documents and policy status"
				icon={FileText}
				tag="#hr"
				href="/hr/documents"
				loading={false}
				empty={false}
			>
				{#snippet children()}
					<div class="document-stats">
						<div class="stat-row">
							<span class="stat-label">Active Policies</span>
							<Badge variant="default">24</Badge>
						</div>
						<div class="stat-row">
							<span class="stat-label">Pending Review</span>
							<Badge variant="secondary">3</Badge>
						</div>
						<div class="stat-row">
							<span class="stat-label">Compliance Docs</span>
							<Badge variant="outline">156</Badge>
						</div>
					</div>
				{/snippet}
			</StreamingCard>
		</div>
	</div>

	<!-- Insights Section -->
	<div class="section">
		<div class="section-header">
			<h2 class="section-title">Insights</h2>
			<p class="section-description">Analytics and priority information</p>
		</div>
		<div class="insights-grid">
			<StreamingCard
				title="Department Distribution"
				description="Employee allocation across departments"
				icon={Briefcase}
				tag="#hr"
				href="/hr/reports"
				loading={!employeesLoaded}
				empty={departmentData.length === 0}
				emptyMessage="No department data available"
				class="department-card"
			>
				{#snippet children()}
					<DepartmentChart 
						departments={departmentData.slice(0, 4)}
						showPercentage={true}
						showProgress={true}
					/>
				{/snippet}
			</StreamingCard>

			<StreamingCard
				title="Priority Tasks"
				description="High-priority HR tasks requiring attention"
				icon={AlertCircle}
				tag="#hr"
				href="/hr/tasks"
				loading={!tasksLoaded}
				empty={taskData.filter(t => t.priority === 'high' || t.priority === 'critical').length === 0}
				emptyMessage="No high priority tasks"
			>
				{#snippet children()}
					<TaskList
						tasks={taskData.filter(t => t.priority === 'high' || t.priority === 'critical')}
						showCount={3}
						showType={false}
					/>
				{/snippet}
			</StreamingCard>
		</div>
	</div>

	<!-- Quick Actions -->
	<div class="section">
		<div class="section-header">
			<h2 class="section-title">Quick Actions</h2>
			<p class="section-description">Common HR tasks and workflows</p>
		</div>
		<div class="quick-actions-grid">
			<Button variant="outline" class="action-card" onclick={() => window.location.href = '/hr/employees/new'}>
				<Users size={24} />
				<div class="action-content">
					<div class="action-title">Add Employee</div>
					<div class="action-subtitle">Create new employee record</div>
				</div>
			</Button>

			<Button variant="outline" class="action-card" onclick={() => window.location.href = '/hr/tasks/new'}>
				<CheckSquare size={24} />
				<div class="action-content">
					<div class="action-title">Create Task</div>
					<div class="action-subtitle">Add new HR task</div>
				</div>
			</Button>

			<Button variant="outline" class="action-card" onclick={() => window.location.href = '/hr/onboarding'}>
				<Target size={24} />
				<div class="action-content">
					<div class="action-title">Start Onboarding</div>
					<div class="action-subtitle">Begin new hire process</div>
				</div>
			</Button>

			<Button variant="outline" class="action-card" onclick={() => window.location.href = '/hr/compliance'}>
				<Shield size={24} />
				<div class="action-content">
					<div class="action-title">Check Compliance</div>
					<div class="action-subtitle">Review compliance status</div>
				</div>
			</Button>

			<Button variant="outline" class="action-card" onclick={() => window.location.href = '/hr/documents'}>
				<FileText size={24} />
				<div class="action-content">
					<div class="action-title">Manage Documents</div>
					<div class="action-subtitle">HR policies and files</div>
				</div>
			</Button>

			<Button variant="outline" class="action-card" onclick={() => window.location.href = '/hr/reports'}>
				<TrendingUp size={24} />
				<div class="action-content">
					<div class="action-title">View Reports</div>
					<div class="action-subtitle">Analytics and insights</div>
				</div>
			</Button>
		</div>
	</div>
</div>

<style>
	.hr-dashboard-container {
		padding: 1.5rem;
		max-width: 1400px;
		margin: 0 auto;
		display: flex;
		flex-direction: column;
		gap: 2rem;
	}

	/* Dashboard Header */
	.dashboard-header {
		text-align: center;
		padding: 2rem;
		background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
		border-radius: 16px;
		color: white;
		margin-bottom: 1rem;
	}

	.header-content {
		max-width: 600px;
		margin: 0 auto;
	}

	.dashboard-title {
		font-size: 2.5rem;
		font-weight: 700;
		margin-bottom: 0.5rem;
		text-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
	}

	.dashboard-subtitle {
		font-size: 1.1rem;
		opacity: 0.9;
		margin-bottom: 1.5rem;
	}

	.header-tags {
		display: flex;
		justify-content: center;
		gap: 0.75rem;
		flex-wrap: wrap;
	}

	.header-tag {
		background: rgba(255, 255, 255, 0.2);
		color: white;
		border: 1px solid rgba(255, 255, 255, 0.3);
		backdrop-filter: blur(10px);
	}

	/* Sections */
	.section {
		margin-bottom: 2rem;
	}

	.section-header {
		margin-bottom: 1.5rem;
		text-align: center;
	}

	.section-title {
		font-size: 1.75rem;
		font-weight: 600;
		color: #1f2937;
		margin-bottom: 0.5rem;
	}

	.section-description {
		font-size: 1rem;
		color: #6b7280;
		max-width: 500px;
		margin: 0 auto;
	}

	/* Grids */
	.stats-grid {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
		gap: 1.5rem;
	}

	.cards-grid {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(350px, 1fr));
		gap: 1.5rem;
	}

	.insights-grid {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(400px, 1fr));
		gap: 1.5rem;
	}

	/* Document Stats */
	.document-stats {
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
	}

	.stat-row {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 0.75rem;
		background: #f9fafb;
		border-radius: 8px;
		border: 1px solid #f3f4f6;
	}

	.stat-label {
		font-size: 0.875rem;
		color: #1f2937;
		font-weight: 500;
	}

	/* Quick Actions */
	.quick-actions-grid {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
		gap: 1rem;
	}

	.action-card {
		display: flex;
		align-items: center;
		gap: 1rem;
		padding: 1.25rem;
		height: auto;
		justify-content: flex-start;
		text-align: left;
		border-radius: 12px;
		border: 2px solid #e5e7eb;
		background: white;
		transition: all 0.2s ease;
	}

	.action-card:hover {
		border-color: #6366f1;
		transform: translateY(-1px);
		box-shadow: 0 4px 12px rgba(99, 102, 241, 0.15);
	}

	.action-content {
		flex: 1;
		display: flex;
		flex-direction: column;
		gap: 0.25rem;
	}

	.action-title {
		font-weight: 600;
		color: #1f2937;
		font-size: 0.875rem;
	}

	.action-subtitle {
		font-size: 0.75rem;
		color: #6b7280;
	}

	/* Responsive Design */
	@media (max-width: 768px) {
		.hr-dashboard-container {
			padding: 1rem;
		}

		.dashboard-title {
			font-size: 2rem;
		}

		.section-title {
			font-size: 1.5rem;
		}

		.stats-grid,
		.cards-grid,
		.insights-grid {
			grid-template-columns: 1fr;
		}

		.quick-actions-grid {
			grid-template-columns: 1fr;
		}
	}

	@media (max-width: 480px) {
		.dashboard-header {
			padding: 1.5rem;
		}

		.dashboard-title {
			font-size: 1.75rem;
		}

		.header-tags {
			justify-content: center;
		}
	}
</style>