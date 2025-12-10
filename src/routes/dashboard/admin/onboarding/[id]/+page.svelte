<script lang="ts">
	import {
		ArrowLeft,
		Building,
		Calendar,
		Edit,
		FileText,
		Search,
		Tag,
		UserMinus,
		UserPlus,
		Users
	} from '@lucide/svelte';
	import { Button } from '$lib/components/ui/button';
	import * as Card from '$lib/components/ui/card';
	import { Badge } from '$lib/components/ui/badge';
	import { Label } from '$lib/components/ui/label';
	import { Popover, PopoverContent, PopoverTrigger } from '$lib/components/ui/popover';
	import { Calendar as CalendarComponent } from '$lib/components/ui/calendar';
	import MultiSearchInput from '$lib/components/ui/tag-input/MultiSearchInput.svelte';
	import { formatDistanceToNow } from 'date-fns';
	import { DateFormatter, getLocalTimeZone, parseDate } from '@internationalized/date';
	import { onDestroy, onMount } from 'svelte';
	import { page } from '$app/stores';
	import { goto } from '$app/navigation';
	import { browser } from '$app/environment';
	import { cn } from '$lib/utils';

	const { data } = $props();

	const completedAssignments = data.assignments.filter((a: any) => a.completedAt).length;
	const totalAssignments = data.assignments.length;
	const completionRate =
		totalAssignments > 0 ? Math.round((completedAssignments / totalAssignments) * 100) : 0;

	// Assignment state
	let selectedUsersToAssign = $state<string[]>([]);
	let selectedDepartmentsToAssign = $state<string[]>([]);
	let assignmentType = $state<'user' | 'department'>('user');
	let assignmentDueDate = $state<string | undefined>(undefined);
	let isAssigning = $state(false);
	let searchTerms = $state<string[]>([]);

	const df = new DateFormatter('en-US', {
		dateStyle: 'long'
	});

	function formatDueDate(dateStr: string | null | undefined) {
		if (!dateStr) return 'No due date';
		const date = new Date(dateStr);
		return date.toLocaleDateString();
	}

	// Transform allUsers for MultiSearchInput options
	const userOptions = data.allUsers.map((user: any) => {
		const displayName = user.displayName || user.display_name || '';
		const firstName = user.firstName || user.first_name || '';
		const lastName = user.lastName || user.last_name || '';
		const email = user.email || '';

		// Primary display name
		const primaryName = displayName || `${firstName} ${lastName}`.trim() || email;

		// Include email in label for searchability (MultiSearchInput only searches label field)
		// Format: "Display Name (email@example.com)" or just "email@example.com" if no name
		const label =
			displayName || `${firstName} ${lastName}`.trim() ? `${primaryName} (${email})` : email;

		return {
			value: user.id,
			label
		};
	});

	// Debug: Log user options to console
	console.log('[ONBOARDING] User options:', userOptions.slice(0, 5));

	// Transform departments for Select options
	const departmentOptions = data.departments.map((dept: any) => ({
		value: dept.id,
		label: dept.name
	}));

	// Filtered assignments based on search terms
	const filteredAssignments = $derived(() => {
		if (searchTerms.length === 0) {
			return data.assignments;
		}

		const lowerSearchTerms = searchTerms.map((term) => term.toLowerCase());
		return data.assignments.filter((assignment: any) => {
			const displayName = (assignment.user?.displayName || '').toLowerCase();
			const email = (assignment.user?.email || '').toLowerCase();
			const firstName = (assignment.user?.firstName || '').toLowerCase();
			const lastName = (assignment.user?.lastName || '').toLowerCase();
			const fullName = `${firstName} ${lastName}`.trim().toLowerCase();

			return lowerSearchTerms.some(
				(term) =>
					displayName.includes(term) ||
					email.includes(term) ||
					firstName.includes(term) ||
					lastName.includes(term) ||
					fullName.includes(term)
			);
		});
	});

	async function handleAssign() {
		if (isAssigning) return;
		isAssigning = true;

		try {
			let successCount = 0;
			let failCount = 0;

			if (assignmentType === 'user') {
				// Assign to multiple users
				for (const userId of selectedUsersToAssign) {
					const formData = new FormData();
					formData.append('userId', userId);
					if (assignmentDueDate) {
						formData.append('dueDate', new Date(assignmentDueDate).toISOString());
					}

					const response = await fetch('?/assign', {
						method: 'POST',
						body: formData
					});

					if (response.ok) {
						const result = await response.json();
						if (result.type === 'success') {
							successCount++;
						} else {
							failCount++;
						}
					} else {
						failCount++;
					}
				}
			} else if (assignmentType === 'department') {
				// Assign to multiple departments
				for (const departmentId of selectedDepartmentsToAssign) {
					const formData = new FormData();
					formData.append('departmentId', departmentId);
					if (assignmentDueDate) {
						formData.append('dueDate', new Date(assignmentDueDate).toISOString());
					}

					const response = await fetch('?/assignToDepartment', {
						method: 'POST',
						body: formData
					});

					if (response.ok) {
						const result = await response.json();
						if (result.type === 'success') {
							successCount++;
						} else {
							failCount++;
						}
					} else {
						failCount++;
					}
				}
			}

			if (successCount > 0) {
				alert(
					`Successfully assigned to ${successCount} ${assignmentType === 'user' ? 'user(s)' : 'department(s)'}`
				);
			}
			if (failCount > 0) {
				alert(
					`Failed to assign ${failCount} ${assignmentType === 'user' ? 'user(s)' : 'department(s)'}`
				);
			}

			goto($page.url.pathname, { invalidateAll: true });
		} catch (error) {
			alert('An error occurred during assignment');
			console.error(error);
		} finally {
			isAssigning = false;
			selectedUsersToAssign = [];
			selectedDepartmentsToAssign = [];
			assignmentDueDate = undefined;
		}
	}

	async function handleUnassignUser(assignmentId: string) {
		isAssigning = true;
		const formData = new FormData();
		formData.append('assignmentId', assignmentId);

		try {
			const response = await fetch(`?/unassign`, {
				method: 'POST',
				body: formData
			});
			if (response.ok) {
				goto($page.url.pathname, { invalidateAll: true });
			} else {
				const result = await response.json();
				alert(`Failed to unassign user: ${result.error}`);
			}
		} catch (error) {
			alert('An error occurred during unassignment');
		} finally {
			isAssigning = false;
		}
	}

	onMount(() => {
		console.log('[ONBOARDING DETAIL] Component mounted', {
			moduleId: data.module.id,
			url: $page.url.href,
			pathname: $page.url.pathname,
			timestamp: new Date().toISOString()
		});

		// Listen for navigation events
		const handlePopState = (event: PopStateEvent) => {
			console.log('[ONBOARDING DETAIL] PopState event detected', {
				event,
				url: window.location.href,
				timestamp: new Date().toISOString()
			});
		};

		const handleBeforeUnload = () => {
			console.log('[ONBOARDING DETAIL] Page unloading', {
				url: window.location.href,
				timestamp: new Date().toISOString()
			});
		};

		window.addEventListener('popstate', handlePopState);
		window.addEventListener('beforeunload', handleBeforeUnload);

		return () => {
			window.removeEventListener('popstate', handlePopState);
			window.removeEventListener('beforeunload', handleBeforeUnload);
		};
	});

	onDestroy(() => {
		if (browser) {
			console.log('[ONBOARDING DETAIL] Component destroying', {
				url: $page.url.href,
				timestamp: new Date().toISOString()
			});
		}
	});

	// Track page store changes
	$effect(() => {
		if (browser) {
			console.log('[ONBOARDING DETAIL] Page store changed', {
				url: $page.url.href,
				pathname: $page.url.pathname,
				timestamp: new Date().toISOString()
			});
		}
	});
</script>

<div class="container mx-auto py-8 max-w-6xl px-4">
	<!-- Header -->
	<div class="mb-8 flex items-center justify-between">
		<div class="flex items-center gap-4">
			<Button variant="outline" size="icon" href="/dashboard/admin/onboarding">
				<ArrowLeft class="h-4 w-4" />
			</Button>
			<div>
				<h1 class="text-2xl font-bold tracking-tight">{data.module.title}</h1>
				<p class="text-muted-foreground text-sm">Onboarding Module Details</p>
			</div>
		</div>
		<div class="flex gap-2">
			<Button variant="outline" href={`/dashboard/admin/onboarding/${data.module.id}/forms`}>
				<FileText class="mr-2 h-4 w-4" /> Manage Forms
			</Button>
			<Button variant="outline" href={`/dashboard/admin/onboarding/${data.module.id}/content`}>
				<FileText class="mr-2 h-4 w-4" /> Edit Content (Legacy)
			</Button>
		</div>
	</div>

	<div class="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
		<!-- Main Info -->
		<div class="lg:col-span-2 space-y-6">
			<!-- Module Info Card -->
			<Card.Root>
				<Card.Header class="flex flex-row items-start justify-between">
					<div>
						<Card.Title>Module Information</Card.Title>
						<Card.Description>Basic details about this onboarding module</Card.Description>
					</div>
					{#if data.module.isActive}
						<Badge variant="default">Active</Badge>
					{:else}
						<Badge variant="secondary">Inactive</Badge>
					{/if}
				</Card.Header>
				<Card.Content class="space-y-4">
					{#if data.module.description}
						<div>
							<h4 class="text-sm font-semibold mb-2">Description</h4>
							<p class="text-sm text-muted-foreground">{data.module.description}</p>
						</div>
					{/if}

					{#if data.module.category}
						<div class="flex items-center gap-2">
							<Tag class="h-4 w-4 text-muted-foreground" />
							<span class="text-sm">Category: <strong>{data.module.category}</strong></span>
						</div>
					{/if}

					{#if data.module.tags && data.module.tags.length > 0}
						<div>
							<h4 class="text-sm font-semibold mb-2">Tags</h4>
							<div class="flex flex-wrap gap-2">
								{#each data.module.tags as tag}
									<Badge variant="outline">{tag}</Badge>
								{/each}
							</div>
						</div>
					{/if}

					<div class="flex items-center gap-2 text-sm text-muted-foreground pt-4 border-t">
						<Calendar class="h-4 w-4" />
						<span>
							Created {formatDistanceToNow(new Date(data.module.createdAt), { addSuffix: true })}
						</span>
					</div>
				</Card.Content>
			</Card.Root>

			<!-- Content Blocks -->
			<Card.Root>
				<Card.Header class="flex flex-row items-center justify-between">
					<div>
						<Card.Title>Content Blocks</Card.Title>
						<Card.Description>{data.contentBlocks.length} blocks configured</Card.Description>
					</div>
					<Button href={`/dashboard/admin/onboarding/${data.module.id}/content`} size="sm">
						<Edit class="mr-2 h-3 w-3" /> Edit
					</Button>
				</Card.Header>
				<Card.Content>
					{#if data.contentBlocks.length === 0}
						<div class="text-center py-8 text-muted-foreground text-sm">
							No content blocks yet. Click "Edit Content" to add some.
						</div>
					{:else}
						<div class="space-y-2">
							{#each data.contentBlocks as block}
								<div
									class="flex items-center justify-between p-3 border rounded-lg hover:bg-accent/50 transition-colors"
								>
									<div class="flex items-center gap-3">
										<span class="text-xs font-mono text-muted-foreground"
											>#{block.sequenceOrder + 1}</span
										>
										<div>
											<div class="font-medium text-sm flex items-center gap-2">
												{block.title}
												{#if block.isRequired}
													<Badge variant="secondary" class="h-4 text-[10px]">Required</Badge>
												{/if}
											</div>
											<div class="text-xs text-muted-foreground capitalize">
												{block.type.replace('_', ' ').toLowerCase()}
											</div>
										</div>
									</div>
								</div>
							{/each}
						</div>
					{/if}
				</Card.Content>
			</Card.Root>
		</div>

		<!-- Sidebar Stats -->
		<div class="space-y-6">
			<!-- Statistics -->
			<Card.Root>
				<Card.Header>
					<Card.Title>Statistics</Card.Title>
				</Card.Header>
				<Card.Content class="space-y-4">
					<div>
						<div class="text-2xl font-bold">{totalAssignments}</div>
						<div class="text-xs text-muted-foreground">Total Assignments</div>
					</div>
					<div>
						<div class="text-2xl font-bold">{completedAssignments}</div>
						<div class="text-xs text-muted-foreground">Completed</div>
					</div>
					<div>
						<div class="text-2xl font-bold">{completionRate}%</div>
						<div class="text-xs text-muted-foreground">Completion Rate</div>
					</div>
				</Card.Content>
			</Card.Root>

			<!-- Quick Actions -->
			<Card.Root>
				<Card.Header>
					<Card.Title>Quick Actions</Card.Title>
				</Card.Header>
				<Card.Content class="space-y-2">
					<Button
						href={`/dashboard/admin/onboarding/${data.module.id}/content`}
						class="w-full"
						variant="outline"
					>
						<FileText class="mr-2 h-4 w-4" /> Manage Content
					</Button>
				</Card.Content>
			</Card.Root>
		</div>
	</div>

	<!-- Assignments Section (Full Width) -->
	<div class="mb-6">
		<Card.Root>
			<Card.Header class="border-b p-6">
				<div class="flex items-center justify-between">
					<div>
						<Card.Title>Assignments</Card.Title>
						<Card.Description>Manage user assignments for this onboarding module.</Card.Description>
					</div>
					<Badge variant="secondary" class="text-xs">{data.assignments.length} Assigned</Badge>
				</div>
			</Card.Header>
			<Card.Content class="p-6">
				<div class="flex flex-col lg:flex-row gap-8">
					<!-- Assignment Form (Left Side) -->
					<div class="w-full lg:w-1/3 space-y-6 lg:border-r lg:border-border lg:pr-8">
						<div class="space-y-4">
							<h4 class="font-semibold text-sm flex items-center gap-2">
								<UserPlus class="h-4 w-4" /> Assign Onboarding
							</h4>

							<!-- Assignment Type Tabs -->
							<div class="grid grid-cols-2 gap-1 p-1 bg-muted rounded-lg text-xs font-medium">
								<button
									type="button"
									class="px-2 py-1.5 rounded-md transition-all {assignmentType === 'user'
										? 'bg-background shadow-sm text-foreground'
										: 'text-muted-foreground hover:text-foreground'}"
									onclick={() => (assignmentType = 'user')}
								>
									Individual
								</button>
								<button
									type="button"
									class="px-2 py-1.5 rounded-md transition-all {assignmentType === 'department'
										? 'bg-background shadow-sm text-foreground'
										: 'text-muted-foreground hover:text-foreground'}"
									onclick={() => (assignmentType = 'department')}
								>
									Department
								</button>
							</div>

							{#if assignmentType === 'user'}
								<div class="space-y-2">
									<Label for="userToAssign">Select Users</Label>
									<MultiSearchInput
										bind:searchTerms={selectedUsersToAssign}
										placeholder="Search and select users..."
										options={userOptions}
										allowCustomTerms={false}
									/>
									{#if selectedUsersToAssign.length > 0}
										<p class="text-xs text-muted-foreground">
											{selectedUsersToAssign.length} user(s) selected
										</p>
									{/if}
								</div>
							{:else if assignmentType === 'department'}
								<div class="space-y-2">
									<Label for="departmentToAssign">Select Departments</Label>
									<MultiSearchInput
										bind:searchTerms={selectedDepartmentsToAssign}
										placeholder="Search and select departments..."
										options={departmentOptions}
										allowCustomTerms={false}
									/>
									{#if selectedDepartmentsToAssign.length > 0}
										<p class="text-xs text-muted-foreground">
											{selectedDepartmentsToAssign.length} department(s) selected
										</p>
									{/if}
								</div>
							{/if}

							<div class="space-y-2">
								<Label>Due Date (Optional)</Label>
								<Popover>
									<PopoverTrigger>
										{#snippet child({ props })}
											<Button
												variant="outline"
												class={cn(
													'w-full justify-start text-left font-normal',
													!assignmentDueDate && 'text-muted-foreground'
												)}
												{...props}
											>
												<Calendar class="mr-2 h-4 w-4" />
												{assignmentDueDate ? df.format(new Date(assignmentDueDate)) : 'Pick a date'}
											</Button>
										{/snippet}
									</PopoverTrigger>
									<PopoverContent class="w-auto p-0">
										<CalendarComponent
											type="single"
											value={assignmentDueDate ? parseDate(assignmentDueDate.split('T')[0]) : undefined}
											onValueChange={(v) => {
												if (v) {
													const dateObj = v.toDate(getLocalTimeZone());
													dateObj.setHours(23, 59, 59, 999);
													assignmentDueDate = dateObj.toISOString();
												} else {
													assignmentDueDate = undefined;
												}
											}}
											initialFocus
										/>
									</PopoverContent>
								</Popover>
							</div>

							<Button
								type="button"
								class="w-full mt-2"
								onclick={handleAssign}
								disabled={isAssigning ||
									(assignmentType === 'user' && selectedUsersToAssign.length === 0) ||
									(assignmentType === 'department' && selectedDepartmentsToAssign.length === 0)}
							>
								{#if isAssigning}
									Assigning...
								{:else if assignmentType === 'user'}
									<UserPlus class="mr-2 h-4 w-4" />
									Assign {selectedUsersToAssign.length > 0
										? `(${selectedUsersToAssign.length})`
										: 'Users'}
								{:else if assignmentType === 'department'}
									<Building class="mr-2 h-4 w-4" />
									Assign {selectedDepartmentsToAssign.length > 0
										? `(${selectedDepartmentsToAssign.length})`
										: 'Departments'}
								{/if}
							</Button>
						</div>
					</div>

					<!-- Assignment List (Right Side) -->
					<div class="w-full lg:w-2/3">
						<div class="flex flex-col gap-3 mb-4">
							<h4 class="font-semibold text-sm">Currently Assigned</h4>
							<div class="w-full max-w-md">
								<MultiSearchInput
									bind:searchTerms
									placeholder="Search by name or email..."
									allowCustomTerms={true}
								/>
							</div>
						</div>

						{#if data.assignments.length === 0}
							<div
								class="flex flex-col items-center justify-center h-48 text-muted-foreground border-2 border-dashed rounded-lg bg-muted/5"
							>
								<UserPlus class="h-8 w-8 mb-2 opacity-20" />
								<p class="text-sm font-medium">No users assigned yet.</p>
								<p class="text-xs">Use the form on the left to assign users.</p>
							</div>
						{:else if filteredAssignments().length === 0}
							<div
								class="flex flex-col items-center justify-center h-48 text-muted-foreground border-2 border-dashed rounded-lg bg-muted/5"
							>
								<Search class="h-8 w-8 mb-2 opacity-20" />
								<p class="text-sm font-medium">No users found matching your search.</p>
								<p class="text-xs">Try different search terms.</p>
							</div>
						{:else}
							<div class="space-y-2">
								<p class="text-xs text-muted-foreground">
									Showing {filteredAssignments().length} of {data.assignments.length} assigned users
								</p>
								<div
									class="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[400px] overflow-y-auto pr-2"
								>
									{#each filteredAssignments() as assignment (assignment.id)}
										<div
											class="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors group"
										>
											<div class="flex flex-col min-w-0 gap-1">
												<div class="font-medium text-sm truncate flex items-center gap-2">
													<div
														class="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center text-xs text-primary font-bold"
													>
														{(assignment.user?.displayName || assignment.user?.email || 'U')
															.charAt(0)
															.toUpperCase()}
													</div>
													{assignment.user?.displayName || assignment.user?.email || 'Unknown User'}
												</div>
												<div class="text-xs text-muted-foreground pl-8">
													{#if assignment.completedAt}
														<span class="flex items-center gap-1 text-green-600">
															Completed {formatDueDate(assignment.completedAt)}
														</span>
													{:else if assignment.dueDate}
														<span class="flex items-center gap-1 text-orange-600/80">
															<Calendar class="h-3 w-3" />
															Due {formatDueDate(assignment.dueDate)}
														</span>
													{:else}
														<span>No due date</span>
													{/if}
												</div>
											</div>
											<Button
												variant="ghost"
												size="icon"
												class="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10 opacity-0 group-hover:opacity-100 transition-opacity"
												onclick={() => handleUnassignUser(assignment.id)}
												disabled={isAssigning || !!assignment.completedAt}
												title="Remove assignment"
											>
												<UserMinus class="h-4 w-4" />
											</Button>
										</div>
									{/each}
								</div>
							</div>
						{/if}
					</div>
				</div>
			</Card.Content>
		</Card.Root>
	</div>
</div>
