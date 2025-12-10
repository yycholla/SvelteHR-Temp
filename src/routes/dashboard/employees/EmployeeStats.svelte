<script lang="ts">
	import * as Accordion from '$lib/components/ui/accordion';
	import * as Chart from '$lib/components/ui/chart';
	import { Slider } from '$lib/components/ui/slider';
	import { TrendingUp } from '@lucide/svelte';
	import { Area, AreaChart } from 'layerchart';
	import { scaleUtc } from 'd3-scale';
	import { getContextClient, queryStore } from '@urql/svelte';
	import { GET_EMPLOYEE_STATISTICS_QUERY } from '$lib/graphql/employee-operations';
	import type { EmployeeStatistic } from '$lib/graphql/employee-operations';

	interface Props {
		totalEmployees: number;
		totalActiveEmployees: number;
		totalInactiveEmployees: number;
		departmentCount: number;
		canViewInactiveEmployees: boolean;
	}

	const {
		totalEmployees,
		totalActiveEmployees,
		totalInactiveEmployees,
		departmentCount,
		canViewInactiveEmployees
	}: Props = $props();

	// Historical employee statistics query with range slider
	// Slider positions 0-365 represent chronological time:
	// Position 0 = 1 year ago (365 days back)
	// Position 365 = today (0 days back)
	// Default: all available data
	let dateRangeSlider = $state([0, 365]);

	const today = new Date();

	// Calculate dates based on slider values
	// Convert slider position to days back: daysBack = 365 - sliderPosition
	// Left thumb (index 0) = start date (older)
	// Right thumb (index 1) = end date (newer)
	const startDate = $derived.by(() => {
		const date = new Date(today);
		const daysBack = 365 - dateRangeSlider[0];
		date.setDate(today.getDate() - daysBack);
		return date.toISOString().split('T')[0];
	});

	const endDate = $derived.by(() => {
		const date = new Date(today);
		const daysBack = 365 - dateRangeSlider[1];
		date.setDate(today.getDate() - daysBack);
		return date.toISOString().split('T')[0];
	});

	const client = getContextClient();

	// Create reactive query - urql queryStore is reactive and will update when variables change
	// Wrap in $derived to signal to Svelte that this tracks startDate/endDate reactively
	const employeeStatisticsQuery = $derived(
		queryStore({
			client,
			query: GET_EMPLOYEE_STATISTICS_QUERY,
			variables: { startDate, endDate }
		})
	);

	// Transform employee statistics for area chart
	const historicalChartData = $derived.by(() => {
		if (!$employeeStatisticsQuery?.data?.employeeStatistics) {
			return [];
		}
		const stats = $employeeStatisticsQuery.data.employeeStatistics;
		if (!Array.isArray(stats) || stats.length === 0) {
			return [];
		}
		return stats.map((stat: EmployeeStatistic) => ({
			date: new Date(stat.snapshotDate), // Keep as Date object for time scale
			active: stat.activeCount,
			inactive: stat.inactiveCount,
			total: stat.totalCount
		}));
	});

	const isHistoricalDataLoading = $derived($employeeStatisticsQuery?.fetching ?? true);
	const hasHistoricalData = $derived(historicalChartData.length > 0);

	// Calculate the earliest available date to set slider minimum
	const earliestDataDate = $derived.by(() => {
		if (historicalChartData.length === 0) return null;
		// Find the earliest date in the dataset
		const earliest = historicalChartData.reduce((earliest, item) => {
			return item.date < earliest ? item.date : earliest;
		}, historicalChartData[0].date);
		return earliest;
	});

	// Calculate slider minimum based on earliest data
	// Position 0 = 365 days ago, Position 365 = today
	const sliderMin = $derived.by(() => {
		if (!earliestDataDate) return 0;
		const daysAgo = Math.floor(
			(today.getTime() - earliestDataDate.getTime()) / (1000 * 60 * 60 * 24)
		);
		// Convert days ago to slider position: position = 365 - daysAgo
		return Math.max(0, 365 - daysAgo);
	});

	// Update slider to show all available data when data first loads
	$effect(() => {
		if (hasHistoricalData && sliderMin > 0 && dateRangeSlider[0] < sliderMin) {
			dateRangeSlider = [sliderMin, 365];
		}
	});

	// Filter chart data based on slider range for responsive UI
	const filteredChartData = $derived.by(() => {
		if (historicalChartData.length === 0) return [];

		// Calculate actual date range from slider positions
		const startMs = new Date(startDate).getTime();
		const endMs = new Date(endDate).getTime();

		// Filter data to only show dates within the slider range
		return historicalChartData.filter((item) => {
			const itemMs = item.date.getTime();
			return itemMs >= startMs && itemMs <= endMs;
		});
	});

	const historicalChartConfig = {
		active: {
			label: 'Active',
			color: 'var(--chart-1)'
		},
		inactive: {
			label: 'Inactive',
			color: 'var(--chart-2)'
		},
		total: {
			label: 'Total',
			color: 'var(--chart-3)'
		}
	} satisfies Chart.ChartConfig;
</script>

<div class="mb-6 border-b pb-6">
	<!-- Historical Employee Trend Chart -->
	{#if !isHistoricalDataLoading && hasHistoricalData}
		<Accordion.Root type="single">
			<Accordion.Item value="trend-chart">
				<Accordion.Trigger class="hover:no-underline">
					<div class="flex items-center gap-2">
						<TrendingUp class="h-5 w-5" />
						<span class="text-lg font-semibold">
							Employee Trend ({dateRangeSlider[1] - dateRangeSlider[0]} days)
						</span>
					</div>
				</Accordion.Trigger>
				<Accordion.Content>
					<p class="mb-4 text-sm text-muted-foreground">Historical employee count over time</p>

					<div class="h-[300px]">
						<Chart.Container config={historicalChartConfig} class="h-full w-full">
							<AreaChart
								data={filteredChartData}
								x="date"
								xScale={scaleUtc()}
								series={[
									{
										key: 'active',
										label: 'Active Employees',
										color: historicalChartConfig.active.color
									},
									{
										key: 'inactive',
										label: 'Inactive Employees',
										color: historicalChartConfig.inactive.color
									}
								]}
								props={{
									area: {
										'fill-opacity': 0.4,
										line: { class: 'stroke-1' },
										motion: 'tween'
									},
									xAxis: {
										format: (v) => {
											return v.toLocaleDateString('en-US', {
												month: 'short',
												day: 'numeric'
											});
										}
									},
									yAxis: {
										format: (v) => v.toString()
									}
								}}
							>
								{#snippet marks({ series, getAreaProps })}
									<defs>
										<linearGradient id="fillActive" x1="0" y1="0" x2="0" y2="1">
											<stop offset="5%" stop-color="var(--color-active)" stop-opacity={1.0} />
											<stop offset="95%" stop-color="var(--color-active)" stop-opacity={0.1} />
										</linearGradient>
										<linearGradient id="fillInactive" x1="0" y1="0" x2="0" y2="1">
											<stop offset="5%" stop-color="var(--color-inactive)" stop-opacity={0.8} />
											<stop offset="95%" stop-color="var(--color-inactive)" stop-opacity={0.1} />
										</linearGradient>
									</defs>
									{#each series as s, i (s.key)}
										<Area
											{...getAreaProps(s, i)}
											fill={s.key === 'active' ? 'url(#fillActive)' : 'url(#fillInactive)'}
										/>
									{/each}
								{/snippet}
								{#snippet tooltip()}
									<Chart.Tooltip
										labelFormatter={(v) => {
											return v.toLocaleDateString('en-US', {
												month: 'short',
												day: 'numeric'
											});
										}}
										indicator="line"
									/>
								{/snippet}
							</AreaChart>
						</Chart.Container>
					</div>

					<!-- Date Range Slider -->
					<div class="mt-6 px-3">
						<div class="mb-3 flex items-center justify-between">
							<span class="text-sm font-medium">Date Range</span>
							<span class="text-sm text-muted-foreground">
								{new Date(startDate).toLocaleDateString('en-US', {
									month: 'short',
									day: 'numeric',
									year: 'numeric'
								})}
								-
								{new Date(endDate).toLocaleDateString('en-US', {
									month: 'short',
									day: 'numeric',
									year: 'numeric'
								})}
							</span>
						</div>
						<Slider
							type="multiple"
							bind:value={dateRangeSlider}
							min={sliderMin}
							max={365}
							step={1}
							class="w-full"
						/>
						<div class="mt-2 flex items-center justify-between text-xs text-muted-foreground">
							<span>
								{#if earliestDataDate}
									{earliestDataDate.toLocaleDateString('en-US', {
										month: 'short',
										day: 'numeric'
									})}
								{:else}
									Earliest
								{/if}
							</span>
							<span>Today</span>
						</div>
					</div>

					<!-- Stats Summary -->
					<div class="mt-6 grid grid-cols-3 gap-4">
						<div>
							<div class="text-3xl font-bold">{totalEmployees}</div>
							<p class="text-sm text-muted-foreground">Total Employees</p>
						</div>
						<div>
							<div class="text-2xl font-bold text-green-600">
								{totalActiveEmployees}
							</div>
							<p class="text-xs text-muted-foreground">Active</p>
						</div>
						{#if canViewInactiveEmployees}
							<div>
								<div class="text-2xl font-bold text-orange-600">
									{totalInactiveEmployees}
								</div>
								<p class="text-xs text-muted-foreground">Inactive</p>
							</div>
						{/if}
					</div>
					<p class="mt-4 text-xs text-muted-foreground">
						Across {departmentCount} departments
					</p>
				</Accordion.Content>
			</Accordion.Item>
		</Accordion.Root>
	{/if}
</div>
