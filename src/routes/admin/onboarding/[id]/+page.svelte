<script lang="ts">
	import { logger } from '$lib/utils/logger';
	import { onDestroy, onMount } from 'svelte';
	import { page } from '$app/stores';
	import { goto } from '$app/navigation';
	import { browser } from '$app/environment';
	import {
		ArrowLeft,
		Calendar,
		FileText,
		UserPlus,
		Building,
		UserMinus,
		Search,
		Edit,
		Users
	} from '@lucide/svelte';
	import { Button } from '$lib/components/ui/button';
	import { Badge } from '$lib/components/ui/badge';
	import { Separator } from '$lib/components/ui/separator';
	import { Label } from '$lib/components/ui/label';
	import { Popover, PopoverContent, PopoverTrigger } from '$lib/components/ui/popover';
	import { Calendar as CalendarComponent } from '$lib/components/ui/calendar';
	import MultiSearchInput from '$lib/components/ui/tag-input/MultiSearchInput.svelte';
	import { DateFormatter, getLocalTimeZone, parseDate } from '@internationalized/date';
	import { cn } from '$lib/utils';
	import { formatDistanceToNow } from 'date-fns';

	const { data } = $props();

	// Stats
	const completedAssignments = $derived(data.assignments.filter((a: any) => a.completedAt).length);
	const totalAssignments = $derived(data.assignments.length);
	const completionRate = $derived(
		totalAssignments > 0 ? Math.round((completedAssignments / totalAssignments) * 100) : 0
	);

	// Assignment state
	let selectedUsersToAssign = $state<string[]>([]);
	let selectedDepartmentsToAssign = $state<string[]>([]);
	let assignmentType = $state<'user' | 'department'>('user');
	let assignmentDueDate = $state<string | undefined>(undefined);
	let isAssigning = $state(false);
	let searchTerms = $state<string[]>([]);

	// Date formatter
	const df = new DateFormatter('en-US', { dateStyle: 'long' });

	// Transform allUsers for MultiSearchInput options
	const userOptions = data.allUsers.map((user: any) => {
		const displayName = user.displayName || user.display_name || '';
		const firstName = user.firstName || user.first_name || '';
		const lastName = user.lastName || user.last_name || '';
		const email = user.email || '';
		const primaryName = displayName || `${firstName} ${lastName}`.trim() || email;
		const label =
			displayName || `${firstName} ${lastName}`.trim() ? `${primaryName} (${email})` : email;
		return { value: user.id, label };
	});

	// Transform departments for Select options
	const departmentOptions = data.departments.map((dept: any) => ({
		value: dept.id,
		label: dept.name
	}));

	async function handleAssign() {
		if (isAssigning) return;
		isAssigning = true;

		try {
			let successCount = 0;
			let failCount = 0;

			if (assignmentType === 'user') {
				for (const userId of selectedUsersToAssign) {
					const formData = new FormData();
					formData.append('userId', userId);
					if (assignmentDueDate)
						formData.append('dueDate', new Date(assignmentDueDate).toISOString());
					const response = await fetch('?/assign', { method: 'POST', body: formData });
					if (response.ok && (await response.json()).type === 'success') successCount++;
					else failCount++;
				}
			} else if (assignmentType === 'department') {
				for (const departmentId of selectedDepartmentsToAssign) {
					const formData = new FormData();
					formData.append('departmentId', departmentId);
					if (assignmentDueDate)
						formData.append('dueDate', new Date(assignmentDueDate).toISOString());
					const response = await fetch('?/assignToDepartment', { method: 'POST', body: formData });
					if (response.ok && (await response.json()).type === 'success') successCount++;
					else failCount++;
				}
			}

			if (successCount > 0) alert(`Successfully assigned to ${successCount} targets.`);
			if (failCount > 0) alert(`Failed to assign to ${failCount} targets.`);
			goto($page.url.pathname, { invalidateAll: true });
		} catch (error) {
			console.error(error);
			alert('An error occurred during assignment');
		} finally {
			isAssigning = false;
			selectedUsersToAssign = [];
			selectedDepartmentsToAssign = [];
			assignmentDueDate = undefined;
		}
	}

	async function handleUnassignUser(assignmentId: string) {
		if (!confirm('Are you sure you want to unassign this user?')) return;
		isAssigning = true;
		const formData = new FormData();
		formData.append('assignmentId', assignmentId);
		try {
			const response = await fetch(`?/unassign`, { method: 'POST', body: formData });
			if (response.ok) goto($page.url.pathname, { invalidateAll: true });
			else alert(`Failed to unassign user`);
		} catch (error) {
			alert('An error occurred during unassignment');
		} finally {
			isAssigning = false;
		}
	}

	const filteredAssignments = $derived.by(() => {
		if (searchTerms.length === 0) return data.assignments;
		const lowerSearchTerms = searchTerms.map((term) => term.toLowerCase());
		return data.assignments.filter((assignment: any) => {
			const displayName = (assignment.user?.displayName || '').toLowerCase();
			const email = (assignment.user?.email || '').toLowerCase();
			return lowerSearchTerms.some((term) => displayName.includes(term) || email.includes(term));
		});
	});

	function formatDueDateStr(dateStr: string | null | undefined) {
		if (!dateStr) return 'No due date';
		return new Date(dateStr).toLocaleDateString();
	}
</script>

<div class="flex flex-col h-full bg-background overflow-hidden">
	<!-- Sticky Header -->
	<header
		class="flex-shrink-0 flex items-center justify-between h-14 px-4 border-b bg-background z-20"
	>
		<div class="flex items-center gap-4">
			<Button variant="ghost" size="icon" href="/admin/onboarding" title="Back">
				<ArrowLeft class="h-4 w-4" />
			</Button>
			<div class="flex items-center gap-2">
				<h1 class="text-sm font-semibold tracking-tight">{data.module.title}</h1>
				{#if data.module.isActive}
					<Badge variant="default" class="text-[10px] h-5 px-1.5">Active</Badge>
				{:else}
					<Badge variant="secondary" class="text-[10px] h-5 px-1.5">Inactive</Badge>
				{/if}
			</div>
			<div class="h-4 w-px bg-border"></div>
			<div class="flex items-center gap-4 text-xs text-muted-foreground">
				<span><strong>{totalAssignments}</strong> Assigned</span>
				<span><strong>{completedAssignments}</strong> Completed</span>
				<span><strong>{completionRate}%</strong> Rate</span>
			</div>
		</div>
		<div class="flex items-center gap-2">
			<Button
				variant="outline"
				size="sm"
				href={`/admin/onboarding/${data.module.id}/forms`}
				class="h-8"
			>
				<FileText class="mr-2 h-3.5 w-3.5" /> Forms
			</Button>
			<Button
				variant="default"
				size="sm"
				href={`/admin/onboarding/${data.module.id}/content`}
				class="h-8"
			>
				<Edit class="mr-2 h-3.5 w-3.5" /> Builder
			</Button>
		</div>
	</header>

	<!-- Main Content Area -->
	<div class="flex flex-1 overflow-hidden">
		<!-- Left Panel: Module Info & Assignment Form -->
		<div class="w-80 border-r bg-muted/5 flex flex-col overflow-y-auto">
			<div class="p-4 space-y-6">
				<!-- Module Info -->
				<div class="space-y-2">
					<h3 class="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
						Details
					</h3>
					<div class="rounded-md border bg-background p-3 space-y-2 text-sm">
						{#if data.module.description}
							<p class="text-muted-foreground">{data.module.description}</p>
						{/if}
						<div class="flex items-center gap-2 text-xs text-muted-foreground">
							<Calendar class="h-3 w-3" />
							<span
								>Created {formatDistanceToNow(new Date(data.module.createdAt), {
									addSuffix: true
								})}</span
							>
						</div>
						{#if data.module.tags && data.module.tags.length > 0}
							<div class="flex flex-wrap gap-1 pt-1">
								{#each data.module.tags as tag}
									<Badge variant="outline" class="text-[10px] h-5 px-1">{tag}</Badge>
								{/each}
							</div>
						{/if}
					</div>
				</div>

				<!-- Content Blocks Summary -->
				<div class="space-y-2">
					<div class="flex items-center justify-between">
						<h3 class="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
							Content
						</h3>
						<span class="text-xs text-muted-foreground">{data.contentBlocks.length} blocks</span>
					</div>
					<div class="rounded-md border bg-background divide-y">
						{#if data.contentBlocks.length === 0}
							<div class="p-3 text-center text-xs text-muted-foreground">No content yet.</div>
						{:else}
							{#each data.contentBlocks as block}
								<div class="p-2 flex items-center gap-2 text-xs hover:bg-muted/50">
									<span class="font-mono text-muted-foreground w-4 text-center"
										>{block.sequenceOrder + 1}</span
									>
									<span class="truncate flex-1">{block.title}</span>
									<Badge variant="outline" class="text-[9px] h-4 px-1"
										>{block.type.replace('_', ' ').toLowerCase()}</Badge
									>
								</div>
							{/each}
						{/if}
					</div>
				</div>

				<!-- Assign Form -->
				<div class="space-y-3 pt-4 border-t">
					<h3
						class="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2"
					>
						<UserPlus class="h-3 w-3" /> Assign To
					</h3>

					<div class="grid grid-cols-2 gap-1 rounded-md bg-muted p-1">
						<button
							class="rounded text-xs font-medium py-1 {assignmentType === 'user'
								? 'bg-background shadow-sm'
								: 'text-muted-foreground hover:text-foreground'}"
							onclick={() => (assignmentType = 'user')}
						>
							User
						</button>
						<button
							class="rounded text-xs font-medium py-1 {assignmentType === 'department'
								? 'bg-background shadow-sm'
								: 'text-muted-foreground hover:text-foreground'}"
							onclick={() => (assignmentType = 'department')}
						>
							Department
						</button>
					</div>

					<div class="space-y-3">
						{#if assignmentType === 'user'}
							<MultiSearchInput
								bind:searchTerms={selectedUsersToAssign}
								placeholder="Select users..."
								options={userOptions}
								allowCustomTerms={false}
							/>
						{:else}
							<MultiSearchInput
								bind:searchTerms={selectedDepartmentsToAssign}
								placeholder="Select departments..."
								options={departmentOptions}
								allowCustomTerms={false}
							/>
						{/if}

						<Popover>
							<PopoverTrigger>
								{#snippet child({ props })}
									<Button
										variant="outline"
										size="sm"
										class={cn(
											'w-full justify-start text-left font-normal h-8',
											!assignmentDueDate && 'text-muted-foreground'
										)}
										{...props}
									>
										<Calendar class="mr-2 h-3.5 w-3.5" />
										{assignmentDueDate
											? df.format(new Date(assignmentDueDate))
											: 'Due Date (Optional)'}
									</Button>
								{/snippet}
							</PopoverTrigger>
							<PopoverContent class="w-auto p-0">
								<CalendarComponent
									type="single"
									value={assignmentDueDate ? parseDate(assignmentDueDate.split('T')[0]) : undefined}
									onValueChange={(v) => {
										if (v) {
											const d = v.toDate(getLocalTimeZone());
											d.setHours(23, 59, 59, 999);
											assignmentDueDate = d.toISOString();
										} else assignmentDueDate = undefined;
									}}
								/>
							</PopoverContent>
						</Popover>

						<Button
							size="sm"
							class="w-full h-8"
							onclick={handleAssign}
							disabled={isAssigning ||
								(assignmentType === 'user' && !selectedUsersToAssign.length) ||
								(assignmentType === 'department' && !selectedDepartmentsToAssign.length)}
						>
							{isAssigning ? 'Assigning...' : 'Assign'}
						</Button>
					</div>
				</div>
			</div>
		</div>

		<!-- Right Panel: Assignments List -->
		<div class="flex-1 flex flex-col min-w-0 bg-background">
			<div class="p-3 border-b flex items-center justify-between gap-4">
				<div class="flex items-center gap-2 text-sm font-medium">
					<Users class="h-4 w-4 text-muted-foreground" />
					Current Assignments
				</div>
				<div class="relative w-64">
					<Search
						class="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground"
					/>
					<MultiSearchInput
						bind:searchTerms
						placeholder="Filter assignments..."
						allowCustomTerms={true}
					/>
				</div>
			</div>

			<div class="flex-1 overflow-y-auto p-0">
				{#if data.assignments.length === 0}
					<div class="flex flex-col items-center justify-center h-full text-muted-foreground">
						<UserPlus class="h-8 w-8 mb-2 opacity-20" />
						<p class="text-sm">No assignments yet</p>
					</div>
				{:else}
					<div class="divide-y">
						{#each filteredAssignments as assignment (assignment.id)}
							<div
								class="flex items-center justify-between p-3 hover:bg-muted/5 group transition-colors"
							>
								<div class="flex items-center gap-3 min-w-0">
									<div
										class="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary shrink-0"
									>
										{(assignment.user?.displayName || assignment.user?.email || '?')
											.charAt(0)
											.toUpperCase()}
									</div>
									<div class="min-w-0">
										<div class="text-sm font-medium truncate">
											{assignment.user?.displayName || assignment.user?.email}
										</div>
										<div class="text-xs text-muted-foreground flex items-center gap-2">
											{#if assignment.completedAt}
												<span class="text-green-600 flex items-center gap-1">
													Completed {formatDueDateStr(assignment.completedAt)}
												</span>
											{:else if assignment.dueDate}
												<span class="text-orange-600 flex items-center gap-1">
													Due {formatDueDateStr(assignment.dueDate)}
												</span>
											{:else}
												<span>No due date</span>
											{/if}
										</div>
									</div>
								</div>
								<Button
									variant="ghost"
									size="icon"
									class="h-8 w-8 text-muted-foreground opacity-0 group-hover:opacity-100 hover:text-destructive hover:bg-destructive/10"
									onclick={() => handleUnassignUser(assignment.id)}
									title="Unassign"
								>
									<UserMinus class="h-4 w-4" />
								</Button>
							</div>
						{/each}
					</div>
				{/if}
			</div>
		</div>
	</div>
</div>
