<script lang="ts">
	import * as Card from '$lib/components/ui/card';
	import { Button } from '$lib/components/ui/button';
	import { Badge } from '$lib/components/ui/badge';
	import { Separator } from '$lib/components/ui/separator';
	import * as Tabs from '$lib/components/ui/tabs';
	import * as Avatar from '$lib/components/ui/avatar';
	import {
		Briefcase,
		Building2,
		Calendar,
		Download,
		FileText,
		Mail,
		MapPin,
		Phone,
		User
	} from '@lucide/svelte';
	import { format } from 'date-fns';

	// Type definitions for employee data
	interface LeaveBalance {
		id: string;
		year: number;
		totalDays: number;
		usedDays: number;
		remainingDays: number;
		leaveTypeName: string;
		leaveTypeDefaultDays: number;
	}

	interface LeaveRequest {
		id: string;
		leaveType?: {
			id: string;
			name: string;
			color?: string;
		};
		startDate: string;
		endDate: string;
		status: string;
		reason: string;
		createdAt: string;
	}

	interface AssignedDocument {
		id: string;
		filename: string;
		fileType: string;
		fileSizeBytes: number;
		category?: string;
		sensitivityLevel?: string;
		uploadedAt: string;
		uploadedByEmail?: string;
		assignedAt?: string;
		assignmentReason?: string;
	}

	interface Props {
		data: {
			employee: Record<string, unknown> & {
				leaveBalances?: LeaveBalance[];
				leaveRequests?: LeaveRequest[];
				assignedDocuments?: AssignedDocument[];
			};
			permissions: Record<string, unknown>;
		};
	}

	const { data }: Props = $props();

	// Use derived state for reactivity
	const employee = $derived(data.employee ?? {});
	const permissions = $derived(data.permissions ?? {});

	// Helpers
	const initials = $derived((employee.firstName?.[0] ?? '') + (employee.lastName?.[0] ?? ''));

	function formatDate(dateStr: string | null) {
		if (!dateStr) return 'N/A';
		try {
			return format(new Date(dateStr), 'MMM dd, yyyy');
		} catch {
			return dateStr;
		}
	}
</script>

{#snippet profileHeader()}
	<Card.Root class="overflow-hidden border-none shadow-md bg-card">
		<div
			class="h-32 bg-gradient-to-r from-blue-500/10 to-purple-500/10 dark:from-blue-900/20 dark:to-purple-900/20 relative"
		></div>
		<div class="px-8 pb-8">
			<div class="flex flex-col md:flex-row items-start md:items-end -mt-12 gap-6">
				<Avatar.Root class="h-32 w-32 border-4 border-background shadow-xl">
					<Avatar.Image src={employee.avatarUrl} alt={employee.displayName} />
					<Avatar.Fallback class="text-3xl font-bold bg-primary/10 text-primary">
						{initials}
					</Avatar.Fallback>
				</Avatar.Root>

				<div class="flex-1 min-w-0 pt-2 md:pt-0">
					<h1 class="text-3xl font-bold tracking-tight truncate">
						{employee.displayName ?? 'Unknown'}
					</h1>
					<div class="flex flex-wrap gap-3 mt-2 items-center text-muted-foreground">
						<div class="flex items-center gap-1.5 text-sm">
							<Briefcase class="h-4 w-4" />
							{employee.jobTitle ?? 'No Job Title'}
						</div>
						<div class="flex items-center gap-1.5 text-sm">
							<Building2 class="h-4 w-4" />
							{employee.department?.name ?? 'No Department'}
						</div>
						<div class="flex items-center gap-1.5 text-sm">
							<MapPin class="h-4 w-4" />
							{employee.city ?? 'Unknown Location'}
						</div>
					</div>
					<div class="flex gap-2 mt-3">
						<Badge variant={employee.isActive ? 'default' : 'secondary'} class="px-3">
							{employee.isActive ? 'Active' : 'Inactive'}
						</Badge>
						<Badge variant="outline" class="px-3 border-primary/20 bg-primary/5 text-primary">
							{employee.role ?? 'Employee'}
						</Badge>
					</div>
				</div>

				<div class="flex gap-2 mt-4 md:mt-0 w-full md:w-auto justify-end">
					{#if permissions.canCreateReviews}
						<Button variant="outline">Start Review</Button>
					{/if}
					{#if permissions.canEditEmployees}
						<Button href="/dashboard/employees/{employee.id}/edit">Edit Profile</Button>
					{/if}
				</div>
			</div>
		</div>
	</Card.Root>
{/snippet}

{#snippet sidebar()}
	<div class="space-y-6">
		<!-- Contact Card -->
		<Card.Root>
			<Card.Header>
				<Card.Title class="text-base flex items-center gap-2">
					<User class="h-4 w-4 text-muted-foreground" />
					Contact Information
				</Card.Title>
			</Card.Header>
			<Card.Content class="grid gap-4 text-sm">
				<div class="grid gap-1">
					<span class="text-muted-foreground text-xs">Email Address</span>
					<div class="flex items-center gap-2 font-medium">
						<Mail class="h-3.5 w-3.5 text-muted-foreground" />
						<a href="mailto:{employee.email}" class="hover:underline truncate">{employee.email}</a>
					</div>
				</div>
				{#if employee.phoneNumber}
					<div class="grid gap-1">
						<span class="text-muted-foreground text-xs">Phone Number</span>
						<div class="flex items-center gap-2 font-medium">
							<Phone class="h-3.5 w-3.5 text-muted-foreground" />
							<a href="tel:{employee.phoneNumber}" class="hover:underline">{employee.phoneNumber}</a
							>
						</div>
					</div>
				{/if}
				{#if employee.addressLine1}
					<Separator />
					<div class="grid gap-1">
						<span class="text-muted-foreground text-xs">Address</span>
						<div class="font-medium leading-snug">
							{employee.addressLine1}<br />
							{#if employee.addressLine2}{employee.addressLine2}<br />{/if}
							{employee.city}, {employee.stateProvince}
							{employee.postalCode}<br />
							{employee.country}
						</div>
					</div>
				{/if}
			</Card.Content>
		</Card.Root>

		<!-- Employment Card -->
		<Card.Root>
			<Card.Header>
				<Card.Title class="text-base flex items-center gap-2">
					<Building2 class="h-4 w-4 text-muted-foreground" />
					Employment Details
				</Card.Title>
			</Card.Header>
			<Card.Content class="grid gap-4 text-sm">
				<div class="flex justify-between items-center">
					<span class="text-muted-foreground">Employee ID</span>
					<span class="font-mono text-xs">{employee.id?.slice(0, 8)}...</span>
				</div>
				<Separator />
				<div class="flex justify-between items-center">
					<span class="text-muted-foreground">Date of Hire</span>
					<span class="font-medium">{formatDate(employee.hireDate)}</span>
				</div>
				<Separator />
				<div class="grid gap-1">
					<span class="text-muted-foreground text-xs">Manager</span>
					{#if employee.department?.manager}
						<div class="flex items-center gap-2 font-medium">
							<Avatar.Root class="h-6 w-6">
								<Avatar.Fallback class="text-xs">M</Avatar.Fallback>
							</Avatar.Root>
							<span>{employee.department.manager.displayName}</span>
						</div>
					{:else}
						<span class="text-muted-foreground italic">No manager assigned</span>
					{/if}
				</div>
			</Card.Content>
		</Card.Root>
	</div>
{/snippet}

{#snippet mainContent()}
	<Tabs.Root value="overview" class="w-full">
		<Tabs.List class="w-full justify-start border-b rounded-none bg-transparent p-0 h-auto">
			<Tabs.Trigger
				value="overview"
				class="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-4 py-3 text-sm"
				>Overview</Tabs.Trigger
			>
			<Tabs.Trigger
				value="leave"
				class="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-4 py-3 text-sm"
				>Time Off</Tabs.Trigger
			>
			<Tabs.Trigger
				value="documents"
				class="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-4 py-3 text-sm"
				>Documents</Tabs.Trigger
			>
		</Tabs.List>

		<div class="mt-6">
			<Tabs.Content value="overview" class="space-y-6">
				<!-- Leave Balance Cards -->
				<div class="grid grid-cols-2 sm:grid-cols-3 gap-4">
					{#if employee.leaveBalances}
						{#each employee.leaveBalances as balance: LeaveBalance (balance.id)}
							<Card.Root>
								<Card.Content class="p-4">
									<div class="text-xs text-muted-foreground uppercase tracking-wider">
										{balance.leaveTypeName}
									</div>
									<div class="text-2xl font-bold mt-1">
										{balance.remainingDays}
										<span class="text-sm font-normal text-muted-foreground"
											>/ {balance.totalDays}</span
										>
									</div>
									<div class="h-1 w-full bg-secondary mt-3 rounded-full overflow-hidden">
										<div
											class="h-full bg-green-500"
											style="width: {(Number(balance.remainingDays) / Number(balance.totalDays) ||
												0) * 100}%"
										></div>
									</div>
								</Card.Content>
							</Card.Root>
						{/each}
					{/if}
				</div>
			</Tabs.Content>

			<Tabs.Content value="leave">
				<Card.Root>
					<Card.Header><Card.Title>Leave Requests</Card.Title></Card.Header>
					<Card.Content>
						{#if (employee.leaveRequests?.length ?? 0) > 0}
							<div class="space-y-4">
								{#each employee.leaveRequests as request: LeaveRequest (request.id)}
									<div class="flex items-center justify-between p-3 border rounded-lg">
										<div class="flex items-center gap-3">
											<div
												class="h-10 w-10 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center text-amber-600"
											>
												<Calendar class="h-5 w-5" />
											</div>
											<div>
												<div class="font-medium text-sm">{request.leaveType?.name}</div>
												<div class="text-xs text-muted-foreground">
													{formatDate(request.startDate)} - {formatDate(request.endDate)}
												</div>
											</div>
										</div>
										<Badge variant="outline">{request.status}</Badge>
									</div>
								{/each}
							</div>
						{:else}
							<div class="text-center py-8 text-muted-foreground">No leave history found.</div>
						{/if}
					</Card.Content>
				</Card.Root>
			</Tabs.Content>

			<Tabs.Content value="documents">
				<Card.Root>
					<Card.Header><Card.Title>Documents</Card.Title></Card.Header>
					<Card.Content>
						{#if (employee.assignedDocuments?.length ?? 0) > 0}
							<div class="space-y-2">
								{#each employee.assignedDocuments as doc: AssignedDocument (doc.id)}
									<div
										class="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors"
									>
										<div class="flex items-center gap-3">
											<FileText class="h-5 w-5 text-blue-600" />
											<div>
												<div class="font-medium text-sm">{doc.filename}</div>
												<div class="text-xs text-muted-foreground">{doc.category ?? 'General'}</div>
											</div>
										</div>
										<Button variant="ghost" size="icon"><Download class="h-4 w-4" /></Button>
									</div>
								{/each}
							</div>
						{:else}
							<div class="text-center py-8 text-muted-foreground">No documents assigned.</div>
						{/if}
					</Card.Content>
				</Card.Root>
			</Tabs.Content>
		</div>
	</Tabs.Root>
{/snippet}

<div>
	<div class="space-y-6 animate-in fade-in duration-500">
		{@render profileHeader()}

		<div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
			<div class="lg:col-span-1">
				{@render sidebar()}
			</div>
			<div class="lg:col-span-2">
				{@render mainContent()}
			</div>
		</div>
	</div>
</div>
