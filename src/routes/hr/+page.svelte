<script lang="ts">
	import StatCard from '$lib/components/common/StatCard.svelte';
	import { Users, CheckSquare, Shield, AlertCircle, Calendar } from 'lucide-svelte';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	// Basic stats from server data
	const stats = {
		totalEmployees: data.employees?.total || 0,
		activeEmployees: data.employees?.data?.filter(e => e.status === 'Active').length || 0,
		pendingTasks: data.tasks?.data?.filter(t => t.status === 'Pending').length || 0,
		complianceRate: 95
	};
</script>

<svelte:head>
	<title>HR Dashboard - SvelteHR</title>
</svelte:head>

<div class="container mx-auto px-4 py-8">
	<div class="mb-8">
		<h1 class="text-3xl font-bold text-gray-900 dark:text-white mb-2">HR Dashboard</h1>
		<p class="text-gray-600 dark:text-gray-400">Overview of your human resources management</p>
	</div>

	<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
		<StatCard 
			title="Total Employees" 
			value={stats.totalEmployees} 
			icon={Users} 
			tag="#hr" 
			loading={false} 
			href="/hr/employees"
		/>
		<StatCard 
			title="Active Employees" 
			value={stats.activeEmployees} 
			icon={CheckSquare} 
			tag="#hr" 
			loading={false} 
			href="/hr/employees"
		/>
		<StatCard 
			title="Pending Tasks" 
			value={stats.pendingTasks} 
			icon={AlertCircle} 
			tag="#hr" 
			loading={false} 
			href="/hr/tasks"
		/>
		<StatCard 
			title="Compliance Rate" 
			value={`${stats.complianceRate}%`} 
			icon={Shield} 
			tag="#hr" 
			loading={false} 
			href="/hr/compliance"
		/>
	</div>

	<div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
		<div class="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
			<h2 class="text-xl font-semibold text-gray-900 dark:text-white mb-4">Quick Actions</h2>
			<div class="grid grid-cols-2 gap-4">
				<a href="/hr/employees" class="flex items-center gap-2 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors">
					<Users class="w-5 h-5 text-blue-600" />
					<span class="text-sm font-medium">Manage Employees</span>
				</a>
				<a href="/hr/tasks" class="flex items-center gap-2 p-3 bg-green-50 dark:bg-green-900/20 rounded-lg hover:bg-green-100 dark:hover:bg-green-900/30 transition-colors">
					<CheckSquare class="w-5 h-5 text-green-600" />
					<span class="text-sm font-medium">View Tasks</span>
				</a>
				<a href="/hr/compliance" class="flex items-center gap-2 p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg hover:bg-yellow-100 dark:hover:bg-yellow-900/30 transition-colors">
					<Shield class="w-5 h-5 text-yellow-600" />
					<span class="text-sm font-medium">Compliance</span>
				</a>
				<a href="/hr/leave" class="flex items-center gap-2 p-3 bg-purple-50 dark:bg-purple-900/20 rounded-lg hover:bg-purple-100 dark:hover:bg-purple-900/30 transition-colors">
					<Calendar class="w-5 h-5 text-purple-600" />
					<span class="text-sm font-medium">Leave Requests</span>
				</a>
			</div>
		</div>

		<div class="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
			<h2 class="text-xl font-semibold text-gray-900 dark:text-white mb-4">Recent Activity</h2>
			<div class="space-y-3">
				<div class="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
					<Users class="w-5 h-5 text-blue-600" />
					<div>
						<p class="text-sm font-medium text-gray-900 dark:text-white">System initialized</p>
						<p class="text-xs text-gray-500">HR system is ready for use</p>
					</div>
				</div>
			</div>
		</div>
	</div>
</div>

