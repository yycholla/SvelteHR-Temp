<script lang="ts">
	import { onMount } from 'svelte';
	import { Users, UserPlus, UserCheck, UserX, TrendingUp } from 'lucide-svelte';
	import { apiClient } from '$lib/api/client.js';
	import type { CardProps } from '../types.js';

	let { instance, metadata, data }: CardProps = $props();
	// If live stream supplied, prefer it
	// Accept shapes: { employees: Employee[] } | Employee[] | { data, total }
	let live = $state<any>(data);

	// State
	let loading = $state(true);
	let error = $state<string | null>(null);
	let stats = $state({
		totalEmployees: 0,
		activeEmployees: 0,
		newThisMonth: 0,
		inactiveEmployees: 0,
		averageHireDate: null as string | null
	});

	// Fetch employee statistics
	async function fetchEmployeeStats() {
		try {
			loading = true;
			error = null;

			// Fetch employee data with statistics
			const employeeResponse = await apiClient.get('employees');
			const employees = employeeResponse.data || [];

			// Calculate statistics
			const now = new Date();
			const currentMonth = now.getMonth();
			const currentYear = now.getFullYear();

			const activeEmployees = employees.filter((emp: any) => emp.onboardingStatus === 'Active');

			const newThisMonth = employees.filter((emp: any) => {
				if (!emp.hireDate) return false;
				const hireDate = new Date(emp.hireDate);
				return hireDate.getMonth() === currentMonth && hireDate.getFullYear() === currentYear;
			});

			const inactiveEmployees = employees.filter(
				(emp: any) => emp.onboardingStatus === 'Terminated' || emp.onboardingStatus === 'Inactive'
			);

			stats = {
				totalEmployees: employees.length,
				activeEmployees: activeEmployees.length,
				newThisMonth: newThisMonth.length,
				inactiveEmployees: inactiveEmployees.length,
				averageHireDate: null // Could calculate if needed
			};
		} catch (err: any) {
			console.error('Failed to fetch employee statistics:', err);
			error = 'Failed to load employee statistics';
		} finally {
			loading = false;
		}
	}

	onMount(() => {
		if (!live) fetchEmployeeStats();
	});

	$effect(() => {
		if (data) {
			// Update from stream when provided
			const employees = Array.isArray(data)
				? data
				: Array.isArray(data?.employees)
					? data.employees
					: Array.isArray(data?.data)
						? data.data
						: [];
			if (employees.length) {
				const now = new Date();
				const currentMonth = now.getMonth();
				const currentYear = now.getFullYear();
				const activeEmployees = employees.filter((emp: any) => emp.onboardingStatus === 'Active');
				const newThisMonth = employees.filter((emp: any) => {
					if (!emp.hireDate) return false;
					const hireDate = new Date(emp.hireDate);
					return hireDate.getMonth() === currentMonth && hireDate.getFullYear() === currentYear;
				});
				const inactiveEmployees = employees.filter(
					(emp: any) => emp.onboardingStatus === 'Terminated' || emp.onboardingStatus === 'Inactive'
				);
				stats = {
					totalEmployees: employees.length,
					activeEmployees: activeEmployees.length,
					newThisMonth: newThisMonth.length,
					inactiveEmployees: inactiveEmployees.length,
					averageHireDate: null
				};
				loading = false;
				error = null;
			}
		}
	});
</script>

<div class="h-full overflow-hidden">
	{#if loading}
		<div class="flex h-full items-center justify-center">
			<div class="h-8 w-8 animate-spin rounded-full border-b-2 border-primary"></div>
		</div>
	{:else if error}
		<div class="flex h-full items-center justify-center text-center">
			<div class="space-y-2">
				<UserX class="mx-auto h-8 w-8 text-destructive" />
				<p class="text-sm text-destructive">{error}</p>
			</div>
		</div>
	{:else}
		<div class="grid h-full grid-cols-2 gap-3">
			<!-- Total Employees -->
			<div class="flex flex-col items-center justify-center rounded-lg bg-primary/5 p-3">
				<Users class="mb-1 h-6 w-6 text-primary" />
				<div class="text-2xl font-bold text-primary">{stats.totalEmployees}</div>
				<div class="text-center text-xs text-muted-foreground">Total</div>
			</div>

			<!-- Active Employees -->
			<div class="flex flex-col items-center justify-center rounded-lg bg-green-50 p-3">
				<UserCheck class="mb-1 h-6 w-6 text-green-600" />
				<div class="text-2xl font-bold text-green-600">{stats.activeEmployees}</div>
				<div class="text-center text-xs text-muted-foreground">Active</div>
			</div>

			<!-- New This Month -->
			<div class="flex flex-col items-center justify-center rounded-lg bg-blue-50 p-3">
				<UserPlus class="mb-1 h-6 w-6 text-blue-600" />
				<div class="text-2xl font-bold text-blue-600">{stats.newThisMonth}</div>
				<div class="text-center text-xs text-muted-foreground">New</div>
			</div>

			<!-- Growth Rate -->
			<div class="flex flex-col items-center justify-center rounded-lg bg-orange-50 p-3">
				<TrendingUp class="mb-1 h-6 w-6 text-orange-600" />
				<div class="text-2xl font-bold text-orange-600">
					{stats.totalEmployees > 0
						? Math.round((stats.newThisMonth / stats.totalEmployees) * 100)
						: 0}%
				</div>
				<div class="text-center text-xs text-muted-foreground">Growth</div>
			</div>
		</div>
	{/if}
</div>
