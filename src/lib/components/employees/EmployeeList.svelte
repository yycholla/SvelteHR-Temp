<script lang="ts">
	import { onMount } from 'svelte';
	import { logger } from '$lib/utils/logger';
	import { queryStore } from '@urql/svelte';
	import { createUrqlClient } from '$lib/graphql/client';
	import { GET_EMPLOYEES_QUERY } from '$lib/graphql/employee-operations';
	import type { User } from '$lib/types';

	// Import decomposed components
	import EmployeeListHeader from './list/EmployeeListHeader.svelte';
	import EmployeeListContent from './list/EmployeeListContent.svelte';
	import EmployeeListPagination from './list/EmployeeListPagination.svelte';

	/**
	 * Employee List Component
	 * Main interface for browsing, searching, and managing employees
	 */

	interface Props {
		initialFilters?: EmployeeFilters;
		compactView?: boolean;
		showFilters?: boolean;
		showAddButton?: boolean;
		maxHeight?: string;
	}

	interface EmployeeFilters {
		search?: string;
		department?: string;
		role?: string;
		status?: string;
		manager?: string;
	}

	type Employee = User;

	const {
		initialFilters = {},
		compactView = false,
		showFilters = true,
		showAddButton = true,
		maxHeight = '600px'
	}: Props = $props();

	// State
	let filters: EmployeeFilters = $state({ ...initialFilters });
	let currentPage = $state(1);
	const itemsPerPage = 20;
	let viewMode: 'grid' | 'list' = $state('grid');
	let selectedEmployees: string[] = $state([]);

	// Direct client instance to avoid context timing issues
	const client = createUrqlClient();

	// Initialize query store immediately with direct client
	let usersQuery: any = $state(null);
	let clientReady = $state(false);

	// Store the rerun function separately to avoid reactive access
	let rerunQuery: (() => void) | null = null;

	// Refresh data
	const refresh = () => {
		if (rerunQuery) {
			rerunQuery();
		}
	};

	onMount(() => {
		// Initialize the query with the direct client
		try {
			logger.info(`URQL client:: ${client}`);

			if (!client?.createRequestOperation) {
				throw new Error('URQL client is not properly initialized');
			}

			logger.info('URQL client validated, initializing query...');
			clientReady = true;
			usersQuery = queryStore({
				client,
				query: GET_EMPLOYEES_QUERY,
				variables: {
					limit: itemsPerPage,
					offset: 0
				}
			});
		} catch (error) {
			logger.error('Catch failed', error as Error);
			clientReady = false;
		}

		// Auto-refresh every 5 minutes
		const interval = setInterval(refresh, 5 * 60 * 1000);
		return () => clearInterval(interval);
	});

	// Client-side search filter
	const searchFilter = $derived(() => {
		if (!filters.search) return null;
		const search = filters.search.toLowerCase();
		return (employee: any) =>
			employee.displayName?.toLowerCase().includes(search) ||
			employee.email?.toLowerCase().includes(search);
	});

	// Store query state in reactive variables to avoid direct store access in derived
	let queryState = $state({
		fetching: true,
		error: null as any,
		data: null as { users: User[] } | null
	});

	// Update query state when usersQuery changes
	$effect(() => {
		if (usersQuery) {
			// Subscribe to query store changes
			const unsubscribe = usersQuery.subscribe((state: any) => {
				queryState = {
					fetching: state.fetching,
					error: state.error,
					data: state.data
				};

				// Capture the rerun function
				if (state.rerun) {
					rerunQuery = () => state.rerun({ requestPolicy: 'network-only' });
				}

				logger.info('URQL Query State:', {
					fetching: state.fetching,
					error: state.error,
					dataNodes: state.data?.users?.length || 0
				});
			});

			return unsubscribe;
		}
	});

	// Filter results client-side for search
	const filteredEmployees = $derived.by(() => {
		if (!queryState.data) return [];
		const emp = queryState.data?.users || [];
		if (!searchFilter) return emp;
		return emp.filter(searchFilter);
	});

	// Derived values for display
	const totalCount = $derived(filteredEmployees?.length || 0);
	const totalPages = $derived(Math.ceil(totalCount / itemsPerPage));
	const loading = $derived(!clientReady || queryState.fetching);
	const error = $derived(queryState.error);

	// Handle selection
	const clearSelection = () => {
		selectedEmployees = [];
	};

	// Handle pagination
	const handlePageChange = (page: number) => {
		currentPage = page;
	};
</script>

<div class="employee-list" style:max-height={maxHeight}>
	<EmployeeListHeader
		{totalCount}
		selectedCount={selectedEmployees.length}
		bind:viewMode
		{showAddButton}
		{loading}
		onClearSelection={clearSelection}
		onRefresh={refresh}
	/>

	<EmployeeListContent
		{loading}
		{error}
		{filteredEmployees}
		{viewMode}
		{filters}
		onRefresh={refresh}
	/>

	{#if totalPages > 1}
		<EmployeeListPagination
			{currentPage}
			{totalPages}
			{totalCount}
			onPageChange={handlePageChange}
		/>
	{/if}
</div>

<style>
	.employee-list {
		display: flex;
		flex-direction: column;
		gap: 1rem;
		overflow-y: auto;
	}
</style>