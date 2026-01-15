<script lang="ts">
	import { page } from '$app/stores';
	import { goto } from '$app/navigation';
	import {
		CheckCircle2,
		Edit3,
		FileText,
		Play,
		RotateCcw,
		ThumbsDown,
		ThumbsUp,
		Trash2,
		Upload,
		UserMinus,
		UserPlus
	} from '@lucide/svelte';
	import type { PageData } from './$types';

	// Import decomposed components
	import LogHeader from '$lib/components/activities/logs/LogHeader.svelte';
	import StatsCards from '$lib/components/activities/logs/StatsCards.svelte';
	import LogFilters from '$lib/components/activities/logs/LogFilters.svelte';
	import LogTable from '$lib/components/activities/logs/LogTable.svelte';
	import { exportLogs } from '$lib/components/activities/logs/utils';

	let { data }: { data: PageData } = $props();

	// Local filter state
	let searchQuery = $state(data.filters.searchTerm);
	let selectedAction = $state(data.filters.action);
	let selectedResourceType = $state(data.filters.resourceType);
	let selectedUser = $state(data.filters.userId || '');

	// Statistics cards configuration
	let statsCards = $derived([
		{
			label: 'Total Logs',
			value: data.stats.total,
			icon: FileText,
			color: 'text-primary',
			bgColor: 'bg-primary/10'
		},
		{
			label: 'Creates',
			value: data.stats.creates,
			icon: CheckCircle2,
			color: 'text-green-600',
			bgColor: 'bg-green-100 dark:bg-green-900/30'
		},
		{
			label: 'Updates',
			value: data.stats.updates,
			icon: Edit3,
			color: 'text-blue-600',
			bgColor: 'bg-blue-100 dark:bg-blue-900/30'
		},
		{
			label: 'Deletes',
			value: data.stats.deletes,
			icon: Trash2,
			color: 'text-red-600',
			bgColor: 'bg-red-100 dark:bg-red-900/30'
		},
		{
			label: 'Uploads',
			value: data.stats.uploads,
			icon: Upload,
			color: 'text-purple-600',
			bgColor: 'bg-purple-100 dark:bg-purple-900/30'
		},
		{
			label: 'Assigns',
			value: data.stats.assigns,
			icon: UserPlus,
			color: 'text-cyan-600',
			bgColor: 'bg-cyan-100 dark:bg-cyan-900/30'
		},
		{
			label: 'Unassigns',
			value: data.stats.unassigns,
			icon: UserMinus,
			color: 'text-orange-600',
			bgColor: 'bg-orange-100 dark:bg-orange-900/30'
		},
		{
			label: 'Approves',
			value: data.stats.approves,
			icon: ThumbsUp,
			color: 'text-emerald-600',
			bgColor: 'bg-emerald-100 dark:bg-emerald-900/30'
		},
		{
			label: 'Rejects',
			value: data.stats.rejects,
			icon: ThumbsDown,
			color: 'text-rose-600',
			bgColor: 'bg-rose-100 dark:bg-rose-900/30'
		},
		{
			label: 'Executes',
			value: data.stats.executes,
			icon: Play,
			color: 'text-slate-600',
			bgColor: 'bg-slate-100 dark:bg-slate-900/30'
		},
		{
			label: 'Rollbacks',
			value: data.stats.rollbacks,
			icon: RotateCcw,
			color: 'text-amber-600',
			bgColor: 'bg-amber-100 dark:bg-amber-900/30'
		}
	]);

	// Debounce timer for URL updates
	let urlUpdateTimer: any = null;

	// Update URL with filters
	function updateURL() {
		const params = new URLSearchParams();
		if (searchQuery) params.set('search', searchQuery);
		if (selectedAction) params.set('action', selectedAction);
		if (selectedResourceType) params.set('resourceType', selectedResourceType);
		if (selectedUser) params.set('userId', selectedUser);
		params.set('page', '1'); // Reset to page 1 when filters change

		const queryString = params.toString();
		const newUrl = queryString ? `?${queryString}` : '/dashboard/activities/logs';
		window.history.replaceState({}, '', newUrl);
		goto(newUrl);
	}

	// Handle search input with debounce
	function handleSearchInput(e: Event) {
		searchQuery = (e.target as HTMLInputElement).value;

		if (urlUpdateTimer) clearTimeout(urlUpdateTimer);

		urlUpdateTimer = setTimeout(() => {
			updateURL();
		}, 500);
	}

	// Handle filter changes
	function handleFilterChange() {
		updateURL();
	}

	// Clear all filters
	function clearFilters() {
		searchQuery = '';
		selectedAction = '';
		selectedResourceType = '';
		selectedUser = '';
		goto('/dashboard/activities/logs');
	}

	// Navigate to log detail page
	function handleLogClick(logId: string) {
		goto(`/dashboard/activities/logs/${logId}`);
	}

	function handleRefresh() {
		window.location.reload();
	}

	function handleExport() {
		exportLogs(data.logs);
	}
</script>

<svelte:head>
	<title>Audit Logs - MountainHR</title>
	<meta name="description" content="View comprehensive system activity logs" />
</svelte:head>

<div class="space-y-6" data-testid="audit-logs-page">
	<LogHeader onRefresh={handleRefresh} onExport={handleExport} />

	<StatsCards {statsCards} />

	<LogFilters
		bind:searchQuery
		bind:selectedAction
		bind:selectedResourceType
		bind:selectedUser
		uniqueActions={data.uniqueActions as string[]}
		uniqueResourceTypes={data.uniqueResourceTypes as string[]}
		onSearchInput={handleSearchInput}
		onFilterChange={handleFilterChange}
		onClear={clearFilters}
	/>

	<LogTable logs={data.logs} totalLogs={data.totalLogs} onLogClick={handleLogClick} />
</div>
