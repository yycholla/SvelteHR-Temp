<script lang="ts">
	import { goto } from '$app/navigation';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import * as Card from '$lib/components/ui/card';
	import { Badge } from '$lib/components/ui/badge';
	import { Separator } from '$lib/components/ui/separator';
	import * as Table from '$lib/components/ui/table';
	import {
		User,
		ArrowLeft,
		Edit,
		Trash2,
		Mail,
		Calendar,
		Briefcase,
		Building2,
		Clock,
		CheckCircle,
		XCircle,
		AlertCircle,
		Award,
		Plane,
		TrendingUp
	} from 'lucide-svelte';

	interface Props {
		data: {
			user: any;
			userSession: any;
			employee: {
				id: string;
				displayName: string;
				firstName: string;
				lastName: string;
				email: string;
				role: string;
				hireDate: string | null;
				isActive: boolean;
				departmentId: string | null;
				createdAt: string;
				updatedAt: string;
				lastLogin: string | null;
				department: {
					id: string;
					name: string;
					description: string | null;
					managerId: string | null;
					userByManagerId: {
						id: string;
						displayName: string;
						role: string;
					} | null;
				} | null;
				leaveRequests: Array<{
					id: string;
					leaveType: string;
					startDate: string;
					endDate: string;
					status: string;
					reason: string | null;
					createdAt: string;
				}>;
				leaveRequestCount: number;
				performanceReviews: Array<{
					id: string;
					reviewPeriod: string;
					overallRating: number | null;
					status: string;
					createdAt: string;
					reviewer: {
						id: string;
						displayName: string;
					} | null;
				}>;
				performanceReviewCount: number;
				timeOffBalances: Array<{
					id: string;
					year: number;
					balanceDays: number;
					usedDays: number;
					remainingDays: number;
					policyName: string;
					totalDays: number;
				}>;
			};
			permissions: string[];
			canManageEmployees: boolean;
			canViewEmployees: boolean;
			loadedAt: string;
		};
	}

	let { data }: Props = $props();

	// Extract server-loaded data
	const employee = $derived(data.employee);
	const canManageEmployees = $derived(data.canManageEmployees);

	// Format date helper
	function formatDate(dateString: string | null): string {
		if (!dateString) return 'N/A';
		return new Date(dateString).toLocaleDateString('en-US', {
			year: 'numeric',
			month: 'short',
			day: 'numeric'
		});
	}

	// Format datetime helper
	function formatDateTime(dateString: string | null): string {
		if (!dateString) return 'N/A';
		return new Date(dateString).toLocaleString('en-US', {
			year: 'numeric',
			month: 'short',
			day: 'numeric',
			hour: '2-digit',
			minute: '2-digit'
		});
	}

	// Calculate tenure
	function calculateTenure(hireDate: string | null): string {
		if (!hireDate) return 'N/A';
		const hire = new Date(hireDate);
		const now = new Date();
		const months = (now.getFullYear() - hire.getFullYear()) * 12 + (now.getMonth() - hire.getMonth());
		const years = Math.floor(months / 12);
		const remainingMonths = months % 12;

		if (years === 0) {
			return `${remainingMonths} ${remainingMonths === 1 ? 'month' : 'months'}`;
		} else if (remainingMonths === 0) {
			return `${years} ${years === 1 ? 'year' : 'years'}`;
		} else {
			return `${years} ${years === 1 ? 'year' : 'years'}, ${remainingMonths} ${remainingMonths === 1 ? 'month' : 'months'}`;
		}
	}

	// Get status badge variant
	function getStatusVariant(status: string): 'default' | 'secondary' | 'destructive' | 'outline' {
		switch (status.toLowerCase()) {
			case 'approved':
				return 'default';
			case 'pending':
				return 'secondary';
			case 'rejected':
				return 'destructive';
			default:
				return 'outline';
		}
	}

	// Get status icon
	function getStatusIcon(status: string) {
		switch (status.toLowerCase()) {
			case 'approved':
				return CheckCircle;
			case 'pending':
				return AlertCircle;
			case 'rejected':
				return XCircle;
			default:
				return Clock;
		}
	}

	// Navigate back to employees list
	function goBack() {
		goto('/dashboard/employees');
	}
</script>

<svelte:head>
	<title>{employee.displayName} - Employee Details - SvelteHR</title>
	<meta name="description" content="View details for {employee.displayName}" />
</svelte:head>

<div class="space-y-6">
	<!-- Page Header -->
	<div class="flex items-center justify-between">
		<div class="flex items-center gap-4">
			<Button variant="ghost" size="icon" onclick={goBack}>
				<ArrowLeft class="h-5 w-5" />
			</Button>
			<div>
				<div class="flex items-center gap-3">
					<div class="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
						<User class="h-6 w-6 text-primary" />
					</div>
					<div>
						<h1 class="text-3xl font-bold tracking-tight">{employee.displayName}</h1>
						<p class="text-muted-foreground">
							{employee.role} • {employee.department?.name || 'No Department'}
						</p>
					</div>
				</div>
			</div>
		</div>

		{#if canManageEmployees}
			<div class="flex gap-2">
				<Button variant="outline" size="sm" href="/dashboard/employees/{employee.id}/edit">
					<Edit class="mr-2 h-4 w-4" />
					Edit Employee
				</Button>
				<Button variant="destructive" size="sm">
					<Trash2 class="mr-2 h-4 w-4" />
					Delete
				</Button>
			</div>
		{/if}
	</div>

	<!-- Status Badge -->
	<div>
		{#if employee.isActive}
			<Badge variant="default" class="text-sm">
				<CheckCircle class="mr-1 h-3 w-3" />
				Active Employee
			</Badge>
		{:else}
			<Badge variant="destructive" class="text-sm">
				<XCircle class="mr-1 h-3 w-3" />
				Inactive
			</Badge>
		{/if}
	</div>

	<!-- Statistics Cards -->
	<div class="grid grid-cols-1 gap-4 md:grid-cols-4">
		<Card.Root>
			<Card.Header class="flex flex-row items-center justify-between space-y-0 pb-2">
				<Card.Title class="text-sm font-medium">Tenure</Card.Title>
				<Calendar class="h-4 w-4 text-muted-foreground" />
			</Card.Header>
			<Card.Content>
				<div class="text-2xl font-bold">{calculateTenure(employee.hireDate)}</div>
				<p class="text-xs text-muted-foreground">since {formatDate(employee.hireDate)}</p>
			</Card.Content>
		</Card.Root>

		<Card.Root>
			<Card.Header class="flex flex-row items-center justify-between space-y-0 pb-2">
				<Card.Title class="text-sm font-medium">Leave Requests</Card.Title>
				<Plane class="h-4 w-4 text-muted-foreground" />
			</Card.Header>
			<Card.Content>
				<div class="text-2xl font-bold">{employee.leaveRequestCount}</div>
				<p class="text-xs text-muted-foreground">total requests</p>
			</Card.Content>
		</Card.Root>

		<Card.Root>
			<Card.Header class="flex flex-row items-center justify-between space-y-0 pb-2">
				<Card.Title class="text-sm font-medium">Performance Reviews</Card.Title>
				<Award class="h-4 w-4 text-muted-foreground" />
			</Card.Header>
			<Card.Content>
				<div class="text-2xl font-bold">{employee.performanceReviewCount}</div>
				<p class="text-xs text-muted-foreground">total reviews</p>
			</Card.Content>
		</Card.Root>

		<Card.Root>
			<Card.Header class="flex flex-row items-center justify-between space-y-0 pb-2">
				<Card.Title class="text-sm font-medium">Last Login</Card.Title>
				<Clock class="h-4 w-4 text-muted-foreground" />
			</Card.Header>
			<Card.Content>
				<div class="text-lg font-bold">{formatDate(employee.lastLogin)}</div>
				<p class="text-xs text-muted-foreground">last active</p>
			</Card.Content>
		</Card.Root>
	</div>

	<!-- Employee Details Grid -->
	<div class="grid grid-cols-1 gap-6 lg:grid-cols-3">
		<!-- Left Column: Personal & Department Info -->
		<div class="space-y-6 lg:col-span-1">
			<!-- Personal Information -->
			<Card.Root>
				<Card.Header>
					<Card.Title>Personal Information</Card.Title>
				</Card.Header>
				<Card.Content class="space-y-3">
					<div class="space-y-2">
						<div class="flex items-center text-sm">
							<Mail class="mr-2 h-4 w-4 text-muted-foreground" />
							<a href="mailto:{employee.email}" class="hover:underline">
								{employee.email}
							</a>
						</div>

						<div class="flex items-center text-sm">
							<Briefcase class="mr-2 h-4 w-4 text-muted-foreground" />
							<Badge>{employee.role}</Badge>
						</div>

						{#if employee.hireDate}
							<div class="flex items-center text-sm">
								<Calendar class="mr-2 h-4 w-4 text-muted-foreground" />
								<span>Hired: {formatDate(employee.hireDate)}</span>
							</div>
						{/if}

						<Separator />

						<div class="text-sm">
							<span class="font-medium text-muted-foreground">Created:</span>
							<span class="ml-2">{formatDate(employee.createdAt)}</span>
						</div>
						<div class="text-sm">
							<span class="font-medium text-muted-foreground">Last Updated:</span>
							<span class="ml-2">{formatDate(employee.updatedAt)}</span>
						</div>
					</div>
				</Card.Content>
			</Card.Root>

			<!-- Department Information -->
			{#if employee.department}
				<Card.Root>
					<Card.Header>
						<Card.Title>Department</Card.Title>
					</Card.Header>
					<Card.Content class="space-y-3">
						<div class="flex items-center gap-3">
							<div class="flex h-10 w-10 items-center justify-center rounded-full bg-blue-100">
								<Building2 class="h-5 w-5 text-blue-600" />
							</div>
							<div>
								<div class="font-semibold">{employee.department.name}</div>
								<div class="text-sm text-muted-foreground">
									{employee.department.description || 'No description'}
								</div>
							</div>
						</div>

						{#if employee.department.userByManagerId}
							<Separator />
							<div class="text-sm">
								<span class="font-medium text-muted-foreground">Manager:</span>
								<div class="mt-1">
									<Button
										variant="link"
										size="sm"
										class="h-auto p-0"
										href="/dashboard/employees/{employee.department.userByManagerId.id}"
									>
										<User class="mr-2 h-4 w-4" />
										{employee.department.userByManagerId.displayName}
									</Button>
								</div>
							</div>
						{/if}

						<Button
							variant="outline"
							size="sm"
							class="w-full"
							href="/dashboard/departments/{employee.department.id}"
						>
							<Building2 class="mr-2 h-4 w-4" />
							View Department
						</Button>
					</Card.Content>
				</Card.Root>
			{/if}

			<!-- Time Off Balances -->
			{#if employee.timeOffBalances.length > 0}
				<Card.Root>
					<Card.Header>
						<Card.Title>Time Off Balances</Card.Title>
					</Card.Header>
					<Card.Content class="space-y-3">
						{#each employee.timeOffBalances as balance}
							<div class="space-y-1">
								<div class="flex items-center justify-between">
									<span class="text-sm font-medium">{balance.policyName} ({balance.year})</span>
									<span class="text-sm font-bold">{balance.remainingDays} days left</span>
								</div>
								<div class="flex items-center gap-2 text-xs text-muted-foreground">
									<span>{balance.usedDays} used</span>
									<span>•</span>
									<span>{balance.balanceDays} total</span>
								</div>
								<div class="h-2 w-full rounded-full bg-gray-200">
									<div
										class="h-2 rounded-full bg-primary"
										style="width: {balance.balanceDays > 0 ? (balance.usedDays / balance.balanceDays) * 100 : 0}%"
									></div>
								</div>
							</div>
						{/each}
					</Card.Content>
				</Card.Root>
			{/if}
		</div>

		<!-- Right Column: Activity & Records -->
		<div class="space-y-6 lg:col-span-2">
			<!-- Leave Requests -->
			<Card.Root>
				<Card.Header>
					<div class="flex items-center justify-between">
						<div>
							<Card.Title>Leave Requests ({employee.leaveRequestCount})</Card.Title>
							<Card.Description>Recent time-off requests</Card.Description>
						</div>
					</div>
				</Card.Header>
				<Card.Content>
					{#if employee.leaveRequests.length > 0}
						<div class="rounded-md border">
							<Table.Root>
								<Table.Header>
									<Table.Row>
										<Table.Head>Type</Table.Head>
										<Table.Head>Period</Table.Head>
										<Table.Head>Status</Table.Head>
										<Table.Head>Requested</Table.Head>
									</Table.Row>
								</Table.Header>
								<Table.Body>
									{#each employee.leaveRequests.slice(0, 5) as request}
										{@const StatusIcon = getStatusIcon(request.status)}
										<Table.Row>
											<Table.Cell class="font-medium">{request.leaveType}</Table.Cell>
											<Table.Cell>
												<div class="text-sm">
													{formatDate(request.startDate)} - {formatDate(request.endDate)}
												</div>
											</Table.Cell>
											<Table.Cell>
												<Badge variant={getStatusVariant(request.status)}>
													<StatusIcon class="mr-1 h-3 w-3" />
													{request.status}
												</Badge>
											</Table.Cell>
											<Table.Cell>{formatDate(request.createdAt)}</Table.Cell>
										</Table.Row>
									{/each}
								</Table.Body>
							</Table.Root>
						</div>
					{:else}
						<div class="py-8 text-center">
							<Plane class="mx-auto h-12 w-12 text-muted-foreground" />
							<h3 class="mt-4 text-lg font-semibold">No leave requests</h3>
							<p class="text-muted-foreground">This employee hasn't submitted any leave requests yet.</p>
						</div>
					{/if}
				</Card.Content>
			</Card.Root>

			<!-- Performance Reviews -->
			<Card.Root>
				<Card.Header>
					<div class="flex items-center justify-between">
						<div>
							<Card.Title>Performance Reviews ({employee.performanceReviewCount})</Card.Title>
							<Card.Description>Review history and ratings</Card.Description>
						</div>
					</div>
				</Card.Header>
				<Card.Content>
					{#if employee.performanceReviews.length > 0}
						<div class="space-y-4">
							{#each employee.performanceReviews as review}
								<div class="flex items-start justify-between rounded-lg border p-4">
									<div class="space-y-1">
										<div class="flex items-center gap-2">
											<Award class="h-4 w-4 text-yellow-600" />
											<span class="font-medium">Period: {review.reviewPeriod}</span>
										</div>
										<div class="flex items-center gap-2">
											<Badge variant={getStatusVariant(review.status)}>
												{review.status}
											</Badge>
											<span class="text-xs text-muted-foreground">
												{formatDate(review.createdAt)}
											</span>
										</div>
										{#if review.reviewer}
											<div class="text-sm text-muted-foreground">
												Reviewed by: {review.reviewer.displayName}
											</div>
										{/if}
									</div>
									{#if review.overallRating}
										<div class="flex items-center gap-2">
											<TrendingUp class="h-4 w-4 text-green-600" />
											<span class="text-xl font-bold">{review.overallRating}/5</span>
										</div>
									{/if}
								</div>
							{/each}
						</div>
					{:else}
						<div class="py-8 text-center">
							<Award class="mx-auto h-12 w-12 text-muted-foreground" />
							<h3 class="mt-4 text-lg font-semibold">No performance reviews</h3>
							<p class="text-muted-foreground">This employee hasn't been reviewed yet.</p>
						</div>
					{/if}
				</Card.Content>
			</Card.Root>
		</div>
	</div>
</div>
