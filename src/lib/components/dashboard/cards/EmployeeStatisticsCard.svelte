<script lang="ts">
	import { onMount } from 'svelte';
	import { Users, UserPlus, UserCheck, UserX, TrendingUp } from 'lucide-svelte';
	import { apiClient } from '$lib/api/client.js';
	import type { CardProps } from '../types.js';
	
	let { instance, metadata, data }: CardProps = $props();
	
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
			
			const activeEmployees = employees.filter((emp: any) => 
				emp.onboardingStatus === 'Active'
			);
			
			const newThisMonth = employees.filter((emp: any) => {
				if (!emp.hireDate) return false;
				const hireDate = new Date(emp.hireDate);
				return hireDate.getMonth() === currentMonth && 
					   hireDate.getFullYear() === currentYear;
			});
			
			const inactiveEmployees = employees.filter((emp: any) => 
				emp.onboardingStatus === 'Terminated' || emp.onboardingStatus === 'Inactive'
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
		fetchEmployeeStats();
	});
</script>

<div class="h-full overflow-hidden">
	{#if loading}
		<div class="flex items-center justify-center h-full">
			<div class="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
		</div>
	{:else if error}
		<div class="flex items-center justify-center h-full text-center">
			<div class="space-y-2">
				<UserX class="h-8 w-8 text-destructive mx-auto" />
				<p class="text-sm text-destructive">{error}</p>
			</div>
		</div>
	{:else}
		<div class="grid grid-cols-2 gap-3 h-full">
			<!-- Total Employees -->
			<div class="flex flex-col items-center justify-center bg-primary/5 rounded-lg p-3">
				<Users class="h-6 w-6 text-primary mb-1" />
				<div class="text-2xl font-bold text-primary">{stats.totalEmployees}</div>
				<div class="text-xs text-muted-foreground text-center">Total</div>
			</div>
			
			<!-- Active Employees -->
			<div class="flex flex-col items-center justify-center bg-green-50 rounded-lg p-3">
				<UserCheck class="h-6 w-6 text-green-600 mb-1" />
				<div class="text-2xl font-bold text-green-600">{stats.activeEmployees}</div>
				<div class="text-xs text-muted-foreground text-center">Active</div>
			</div>
			
			<!-- New This Month -->
			<div class="flex flex-col items-center justify-center bg-blue-50 rounded-lg p-3">
				<UserPlus class="h-6 w-6 text-blue-600 mb-1" />
				<div class="text-2xl font-bold text-blue-600">{stats.newThisMonth}</div>
				<div class="text-xs text-muted-foreground text-center">New</div>
			</div>
			
			<!-- Growth Rate -->
			<div class="flex flex-col items-center justify-center bg-orange-50 rounded-lg p-3">
				<TrendingUp class="h-6 w-6 text-orange-600 mb-1" />
				<div class="text-2xl font-bold text-orange-600">
					{stats.totalEmployees > 0 ? Math.round((stats.newThisMonth / stats.totalEmployees) * 100) : 0}%
				</div>
				<div class="text-xs text-muted-foreground text-center">Growth</div>
			</div>
		</div>
	{/if}
</div>