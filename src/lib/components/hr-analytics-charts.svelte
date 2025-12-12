<script lang="ts">
	import * as Card from '$lib/components/ui/card';
	import { logger } from '$lib/utils/logger';
	import * as Chart from '$lib/components/ui/chart';
	import * as Select from '$lib/components/ui/select';
	import { ChartContainer } from '$lib/components/ui/chart';
	import { scaleUtc } from 'd3-scale';
	import { Area, AreaChart, ChartClipPath } from 'layerchart';
	import { curveNatural } from 'd3-shape';
	import { cubicInOut } from 'svelte/easing';
	import TrendingUpIcon from '@lucide/svelte/icons/trending-up';
	import { onMount } from 'svelte';

	interface User {
		id: string;
		email: string;
		displayName?: string;
		isActive: boolean;
		createdAt: string;
		hireDate?: string;
		departmentId?: string;
		userRoleAssignmentsByUserId?: {
			nodes: Array<{
				userRoleByRoleId: {
					name: string;
					level: number;
					description?: string;
				};
				isActive: boolean;
				createdAt: string;
			}>;
		};
	}

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

	// Helper to get user department
	function getUserDepartment(user: User): string {
		// Try to find department from role assignments or other fields if available
		// This is a placeholder logic based on available User interface
		// Ideally User interface should have department info
		return 'Unknown';
	}

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

	// Add reactive effect to monitor when users data becomes available
	$effect(() => {
		logger.info('CHART EFFECT: Users data changed', { length: users?.length || 0 });
		if (users && users.length > 0) {
			logger.info('CHART: Users data is now available');
		}
	});

	// Process hire date data by department for LayerChart
	const hireDepartmentData = $derived.by(() => {
		logger.info('CHART DERIVED: Computing hireDepartmentData', {
			usersLength: users?.length || 0,
			timeRange
		});
		if (!users || users.length === 0) {
			logger.info('CHART DERIVED: No users data, returning empty array');
			return [];
		}

		// Calculate date range based on selected timeRange
		const now = new Date();
		let startDate = new Date();

		if (timeRange !== 'all') {
			switch (timeRange) {
				case 'ytd':
					startDate = new Date(now.getFullYear(), 0, 1); // January 1st of current year
					break;
				case '3m':
					startDate.setMonth(now.getMonth() - 3);
					break;
				case '6m':
					startDate.setMonth(now.getMonth() - 6);
					break;
				case '1y':
					startDate.setFullYear(now.getFullYear() - 1);
					break;
				case '2y':
					startDate.setFullYear(now.getFullYear() - 2);
					break;
			}
		} else {
			// For "all", use the earliest hire date
			startDate = new Date('2015-01-01'); // Conservative start date
		}

		// Filter to only active employees first, then by time range
		const activeUsers = users.filter((user) => {
			if (!user.isActive) return false;

			const hireDate = new Date(user.hireDate || user.createdAt);
			if (isNaN(hireDate.getTime())) return false;

			// Include if hire date is within our range OR if they were hired before and are still active
			return hireDate >= startDate || hireDate <= startDate;
		});
		logger.info('Active users for department analysis:', { count: activeUsers.length });

		// Group active users by month-year and department
		const hiresByMonthAndDept = activeUsers.reduce(
			(acc, user) => {
				try {
					const hireDate = new Date(user.hireDate || user.createdAt);

					// Check if date is valid
					if (isNaN(hireDate.getTime())) {
						logger.warn('Invalid date for user:', { email: user.email });
						return acc;
					}

					// Get department
					const department = getUserDepartment(user);

					// Get the first day of the month for consistent grouping
					const monthStart = new Date(hireDate.getFullYear(), hireDate.getMonth(), 1);
					const monthKey = monthStart.toISOString();

					if (!acc[monthKey]) {
						acc[monthKey] = {
							date: monthStart,
							departments: {}
						};
					}

					if (!acc[monthKey].departments[department]) {
						acc[monthKey].departments[department] = 0;
					}

					acc[monthKey].departments[department] += 1;
				} catch (error) {
					logger.warn('Error processing user:', {
						email: user.email,
						error: error instanceof Error ? error.message : String(error)
					});
				}

				return acc;
			},
			{} as Record<string, any>
		);

		// Get all unique departments
		const allDepartments = new Set<string>();
		Object.values(hiresByMonthAndDept).forEach((month: any) => {
			Object.keys(month.departments).forEach((dept) => allDepartments.add(dept));
		});

		// Sort months by date
		const sortedMonths = Object.values(hiresByMonthAndDept).sort(
			(a: any, b: any) => a.date.getTime() - b.date.getTime()
		);

		// Create cumulative data with all departments
		const result = [];
		const departmentCounts: Record<string, number> = {};

		// Initialize all department counts to 0
		allDepartments.forEach((dept) => {
			departmentCounts[dept] = 0;
		});

		// Calculate employees hired before our start period for each department (baseline)
		const baselineCounts: Record<string, number> = {};
		allDepartments.forEach((dept) => {
			baselineCounts[dept] = 0;
		});

		activeUsers.forEach((user) => {
			const hireDate = new Date(user.hireDate || user.createdAt);
			if (!isNaN(hireDate.getTime()) && hireDate < startDate) {
				const dept = getUserDepartment(user);
				baselineCounts[dept] = (baselineCounts[dept] || 0) + 1;
			}
		});

		// Initialize department counts with baseline
		allDepartments.forEach((dept) => {
			departmentCounts[dept] = baselineCounts[dept] || 0;
		});

		// Add starting point at the selected start date
		const chartStartPoint: any = {
			date: new Date(startDate.getFullYear(), startDate.getMonth(), 1),
			totalEmployees: Object.values(departmentCounts).reduce(
				(sum: number, count: number) => sum + count,
				0
			)
		};

		// Add all departments with baseline count
		allDepartments.forEach((dept) => {
			chartStartPoint[dept] = departmentCounts[dept];
		});

		result.push(chartStartPoint);

		// Process each month and make cumulative, but only for months within our range
		sortedMonths.forEach((month: any) => {
			if (month.date >= startDate) {
				// Update cumulative counts for each department
				Object.keys(month.departments).forEach((dept) => {
					departmentCounts[dept] += month.departments[dept];
				});

				const dataPoint: any = {
					date: month.date,
					totalEmployees: Object.values(departmentCounts).reduce(
						(sum: number, count: number) => sum + count,
						0
					)
				};

				// Add each department's cumulative count
				allDepartments.forEach((dept) => {
					dataPoint[dept] = departmentCounts[dept];
				});

				result.push(dataPoint);
			}
		});

		// Add current month point to extend chart to present
		const currentMonth = new Date(now.getFullYear(), now.getMonth(), 1);
		const lastDataDate = result.length > 0 ? result[result.length - 1].date : chartStartPoint.date;

		if (currentMonth.getTime() > lastDataDate.getTime()) {
			const currentPoint: any = {
				date: currentMonth,
				totalEmployees: Object.values(departmentCounts).reduce(
					(sum: number, count: number) => sum + count,
					0
				)
			};

			// Add each department's current count
			allDepartments.forEach((dept) => {
				currentPoint[dept] = departmentCounts[dept];
			});

			result.push(currentPoint);
		}

		logger.info('Final hireDepartmentData:', { result });
		logger.info('All departments:', { departments: Array.from(allDepartments) });
		return result;
	});

	// Process hire date data for LayerChart - only count active employees (total line)
	const hireData = $derived.by(() => {
		logger.info('Computing hireData', { usersLength: users?.length || 0, users });
		if (!users || users.length === 0) return [];

		// Filter to only active employees first
		const activeUsers = users.filter((user) => user.isActive);
		logger.info('Active users:', { activeCount: activeUsers.length, totalCount: users.length });

		// Group active users by month-year
		const hiresByMonth = activeUsers.reduce(
			(acc, user) => {
				try {
					logger.info('Processing user:', { email: user.email, hireDate: user.hireDate });
					const hireDate = new Date(user.hireDate || user.createdAt);

					// Check if date is valid
					if (isNaN(hireDate.getTime())) {
						logger.warn('Invalid date for user:', {
							email: user.email,
							hireDate: user.hireDate,
							createdAt: user.createdAt
						});
						return acc;
					}

					// Get the first day of the month for consistent grouping
					const monthStart = new Date(hireDate.getFullYear(), hireDate.getMonth(), 1);
					const monthKey = monthStart.toISOString();

					if (!acc[monthKey]) {
						acc[monthKey] = {
							date: monthStart,
							employees: 0
						};
					}

					acc[monthKey].employees += 1;
					logger.info('Updated accumulator', { monthKey, data: acc[monthKey] });
				} catch (error) {
					logger.warn('Error processing user:', {
						email: user.email,
						error: error instanceof Error ? error.message : String(error)
					});
				}

				return acc;
			},
			{} as Record<string, any>
		);

		logger.info('Accumulated hiresByMonth:', { hiresByMonth });

		// Sort by date and convert to cumulative count
		const sortedMonths = Object.values(hiresByMonth).sort(
			(a: any, b: any) => a.date.getTime() - b.date.getTime()
		);

		// Add a starting point at 0 employees (one month before first hire)
		const result = [];

		if (sortedMonths.length > 0) {
			// Add starting point one month before first hire
			const firstHireDate = sortedMonths[0].date;
			const startDate = new Date(firstHireDate.getFullYear(), firstHireDate.getMonth() - 1, 1);
			result.push({
				date: startDate,
				totalEmployees: 0
			});
		}

		// Make it cumulative - each month shows total employees up to that point
		let cumulativeCount = 0;
		sortedMonths.forEach((month: any) => {
			cumulativeCount += month.employees;
			result.push({
				date: month.date,
				totalEmployees: cumulativeCount
			});
		});

		logger.info('Final hireData (cumulative with start point):', { result });
		return result;
	});
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
