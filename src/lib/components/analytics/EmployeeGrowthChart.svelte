<script lang="ts">
	import * as Card from '$lib/components/ui/card';
	import { logger } from '$lib/utils/logger';
	import * as Select from '$lib/components/ui/select';
	import { ChartContainer } from '$lib/components/ui/chart';
	import { scaleUtc } from 'd3-scale';
	import { Area, AreaChart, ChartClipPath } from 'layerchart';
	import { curveNatural } from 'd3-shape';
	import { cubicInOut } from 'svelte/easing';
	import * as Chart from '$lib/components/ui/chart';
	import { onMount } from 'svelte';
	import { processHireDepartmentData, getUserDepartment } from './growth-data';
	import type { User } from './growth-data';

	interface Props {
		users: User[];
	}

	const { users }: Props = $props();

	// Chart ready state to prevent rendering before container is ready
	let chartsReady = $state(false);

	// Time range selection
	let timeRange = $state('ytd');

	const selectedLabel = $derived.by(() => {
		switch (timeRange) {
			case 'ytd':
				return 'Year to Date';
			case '3m':
				return 'Last 3 months';
			case '6m':
				return 'Last 6 months';
			case '1y':
				return 'Last 12 months';
			case '2y':
				return 'Last 2 years';
			case 'all':
				return 'All time';
			default:
				return 'Year to Date';
		}
	});

	// Get unique departments for chart config
	const uniqueDepartments = $derived.by(() => {
		if (!users || users.length === 0) return [];
		const depts = new Set(users.map((user) => getUserDepartment(user)));
		return Array.from(depts).sort();
	});

	// Chart configurations using shadcn-svelte chart config
	const hireChartConfig = $derived.by(() => {
		const config: any = {
			totalEmployees: {
				label: 'Total Active Employees',
				color: 'hsl(var(--chart-1))'
			}
		};

		// Add department configurations
		uniqueDepartments.forEach((dept, index) => {
			config[dept] = {
				label: dept,
				color: `hsl(var(--chart-${(index % 6) + 2}))`
			};
		});

		return config;
	});

	// Initialize charts after component mounts and DOM is ready
	onMount(() => {
		logger.info('Analytics charts component mounted, users:', { users });
	});

	// Set charts ready only when we have data AND after sufficient delay for container sizing
	$effect(() => {
		if (users && users.length > 0) {
			// Longer delay to ensure LayerChart containers have proper dimensions
			setTimeout(() => {
				chartsReady = true;
				logger.info('Charts ready set to true', {
					usersLength: users.length,
					hireDepartmentDataLength: hireDepartmentData.length
				});
			}, 100);
		}
	});

	// Process hire date data by department for LayerChart
	const hireDepartmentData = $derived(processHireDepartmentData(users, timeRange));
</script>

<Card.Root class="w-full">
	<Card.Header>
		<Card.Title>Employee Growth Analytics</Card.Title>
		<Card.Description>
			Track organizational growth over time with departmental breakdown based on actual hire dates
		</Card.Description>
	</Card.Header>
	<Card.Content>
		<!-- Employee Growth Chart -->
		<div class="space-y-4">
			<div class="space-y-4">
				<!-- Header with time range selector -->
				<div class="flex items-center gap-2 space-y-0 border-b pb-4 sm:flex-row">
					<div class="grid flex-1 gap-1 text-center sm:text-left">
						<h3 class="text-lg font-semibold">Employee Growth Over Time by Department</h3>
						<p class="text-sm text-muted-foreground">
							Cumulative count of active employees by department based on actual hire dates. Each
							colored area represents growth within that department, stacked to show total
							organizational growth.
						</p>
					</div>
					<Select.Root type="single" bind:value={timeRange}>
						<Select.Trigger class="w-[160px] rounded-lg sm:ml-auto" aria-label="Select time range">
							{selectedLabel}
						</Select.Trigger>
						<Select.Content class="rounded-xl">
							<Select.Item value="ytd" class="rounded-lg">Year to Date</Select.Item>
							<Select.Item value="3m" class="rounded-lg">Last 3 months</Select.Item>
							<Select.Item value="6m" class="rounded-lg">Last 6 months</Select.Item>
							<Select.Item value="1y" class="rounded-lg">Last 12 months</Select.Item>
							<Select.Item value="2y" class="rounded-lg">Last 2 years</Select.Item>
							<Select.Item value="all" class="rounded-lg">All time</Select.Item>
						</Select.Content>
					</Select.Root>
				</div>
				<!-- DEBUG: Always show this for testing -->
				<div class="mb-4 rounded-lg bg-blue-50 p-4 text-sm">
					<strong>Debug Info:</strong>
					chartsReady: {chartsReady}, hireDepartmentData.length: {hireDepartmentData.length},
					users.length: {users?.length || 0}, timeRange: {timeRange} ({selectedLabel}), departments: {uniqueDepartments.join(
						', '
					)}
					<br />
					<strong>First user sample:</strong>
					{users && users.length > 0
						? `${users[0].email} - ${users[0].hireDate || users[0].createdAt}`
						: 'No users'}
				</div>

				{#if chartsReady && hireDepartmentData && hireDepartmentData.length > 0}
					<!-- Department Growth Area Chart -->
					<div class="chart-wrapper">
						<ChartContainer config={hireChartConfig} class="h-full w-full">
							<AreaChart
								legend
								data={hireDepartmentData}
								x="date"
								xScale={scaleUtc()}
								series={uniqueDepartments.map((dept, index) => ({
									key: dept,
									label: dept,
									color: hireChartConfig[dept]?.color || `var(--chart-${(index % 6) + 2})`
								}))}
								seriesLayout="stack"
								props={{
									area: {
										curve: curveNatural,
										'fill-opacity': 0.6,
										line: { class: 'stroke-1' },
										motion: 'tween'
									},
									xAxis: {
										format: (v) =>
											v.toLocaleDateString('en-US', {
												month: 'short',
												year: '2-digit'
											})
									},
									yAxis: {
										format: (v) => Math.round(v).toString(),
										label: 'Active Employees'
									}
								}}
							>
								{#snippet marks({ series, getAreaProps })}
									<defs>
										{#each series as s, i}
											<linearGradient
												id="fill{s.key.replace(/\s+/g, '')}"
												x1="0"
												y1="0"
												x2="0"
												y2="1"
											>
												<stop offset="5%" stop-color={s.color} stop-opacity={0.8} />
												<stop offset="95%" stop-color={s.color} stop-opacity={0.1} />
											</linearGradient>
										{/each}
									</defs>
									<ChartClipPath
										initialWidth={0}
										motion={{
											width: { type: 'tween', duration: 1000, easing: cubicInOut }
										}}
									>
										{#each series as s, i (s.key)}
											<Area {...getAreaProps(s, i)} fill="url(#fill{s.key.replace(/\s+/g, '')})" />
										{/each}
									</ChartClipPath>
								{/snippet}
								{#snippet tooltip()}
									<Chart.Tooltip
										labelFormatter={(v) =>
											v.toLocaleDateString('en-US', {
												month: 'long',
												year: 'numeric'
											})}
										indicator="line"
									/>
								{/snippet}
							</AreaChart>
						</ChartContainer>
					</div>
				{:else}
					<div class="chart-wrapper">
						<div class="flex h-full w-full items-center justify-center rounded-lg bg-muted/20">
							<div class="text-center">
								<p class="text-muted-foreground">Loading department growth chart...</p>
								<p class="mt-2 text-xs text-muted-foreground">
									Ready: {chartsReady}, Data: {hireDepartmentData.length}
								</p>
							</div>
						</div>
					</div>
				{/if}
			</div>
		</div>
	</Card.Content>
</Card.Root>

<style>
	/* Fix LayerChart container sizing to prevent negative width errors */
	.chart-wrapper {
		width: 100%;
		height: 450px;
		min-width: 500px;
		min-height: 400px;
		position: relative;
		overflow: hidden;
		padding: 1rem;
		box-sizing: border-box;
	}

	/* Ensure LayerChart and its children have proper dimensions */
	:global(.layerchart) {
		width: 100% !important;
		height: 100% !important;
		min-width: 450px !important;
		min-height: 350px !important;
		position: relative !important;
		box-sizing: border-box !important;
	}

	/* LayerChart SVG styling */
	:global(.layerchart svg) {
		width: 100% !important;
		height: 100% !important;
		min-width: 450px !important;
		min-height: 350px !important;
		box-sizing: border-box !important;
	}

	/* Center the LayerChart legend container */
	:global(.lc-legend-container) {
		position: absolute !important;
		bottom: 0 !important;
		left: 50% !important;
		transform: translateX(-50%) !important;
		display: inline-block !important;
	}

	/* Ensure the legend group is centered */
	:global(.lc-legend-swatch-group) {
		justify-content: center !important;
		align-items: center !important;
		gap: 1rem !important;
	}
</style>
