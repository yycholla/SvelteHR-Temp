<script lang="ts">
	import { format, formatDistanceToNow } from 'date-fns';
	import { CHANGE_TASK_STATUS } from '$lib/graphql/tasks-operations';
	import { client } from '$lib/graphql/client';
	import { toast } from 'svelte-sonner';
	import { cn } from '$lib/utils';
	import QuickAddTask from '$lib/components/tasks/QuickAddTask.svelte';
	import { enhance } from '$app/forms';
	import FileUploader from '$lib/components/documents/FileUploader.svelte';
	import { Input } from '$lib/components/ui/input';
	import {
		AlertCircle,
		Calendar,
		CheckCircle2,
		Clock,
		FileText,
		History,
		Link2,
		Pencil,
		Plus,
		Share2,
		Target,
		X
	} from '@lucide/svelte';
	import { invalidateAll } from '$app/navigation';
	import { goto } from '$app/navigation';
	import { Button } from '$lib/components/ui/button';
	import { Avatar, AvatarFallback } from '$lib/components/ui/avatar';
	import { Textarea } from '$lib/components/ui/textarea';
	import { Progress } from '$lib/components/ui/progress';
	import type { Task, TaskStatus } from '$lib/types/task';
	import type { DocumentMetadata } from '$lib/types/document';
	import { untrack } from 'svelte';

	// Page data from server
	const { data } = $props();

	// Get task data - safe access with fallback
	const task = $derived(data?.task);

	// Local state
	let isUploading = $state(false);
	let uploadError = $state<string | null>(null);
	let fileUploader = $state<FileUploader>();
	let metadata = $state<DocumentMetadata>({
		filename: '',
		category: 'Other',
		sensitivityLevel: 'Internal',
		metadataTags: {},
		assignToEmployees: [],
		assignToDepartments: []
	});
	let hasFile = $state(false);

	// Tags state
	let tags = $state<string[]>(untrack(() => task?.tags || []));

	$effect(() => {
		if (task?.tags) {
			tags = task.tags;
		}
	});

	let newTag = $state('');
	let isAddingTag = $state(false);
	let isUpdatingTags = $state(false);

	// Comments state
	let commentText = $state('');
	let isPostingComment = $state(false);

	// Determine user permissions for assignee selection
	const canAssignToAnyone = $derived(
		data?.user?.role === 'hr_admin' ||
			data?.user?.role === 'system_admin' ||
			data?.user?.role === 'super_admin'
	);
	const canAssignToTeam = $derived(data?.user?.role === 'manager');
	const canAssign = $derived(canAssignToAnyone || canAssignToTeam);

	// Derived state for progress
	const subtaskProgress = $derived.by(() => {
		if (!task?.subtasks || task.subtasks.length === 0) return 0;
		const completed = task.subtasks.filter(
			(st: Task) => st.status === 'DONE' || st.status === 'COMPLETED'
		).length;
		return Math.round((completed / task.subtasks.length) * 100);
	});

	const completedSubtasksCount = $derived.by(() => {
		if (!task?.subtasks) return 0;
		return task.subtasks.filter((st: Task) => st.status === 'DONE' || st.status === 'COMPLETED')
			.length;
	});

	// Status configuration matching the mockup's aesthetic
	const statusConfig = {
		TODO: {
			label: 'To Do',
			color: 'text-slate-600',
			bgColor: 'bg-slate-100',
			borderColor: 'border-slate-200'
		},
		IN_PROGRESS: {
			label: 'In Progress',
			color: 'text-blue-600',
			bgColor: 'bg-blue-100',
			borderColor: 'border-blue-200'
		},
		REVIEW: {
			label: 'In Review',
			color: 'text-indigo-600',
			bgColor: 'bg-indigo-100',
			borderColor: 'border-indigo-200'
		},
		BLOCKED: {
			label: 'Blocked',
			color: 'text-red-600',
			bgColor: 'bg-red-100',
			borderColor: 'border-red-200'
		},
		COMPLETED: {
			label: 'Completed',
			color: 'text-green-600',
			bgColor: 'bg-green-100',
			borderColor: 'border-green-200'
		},
		DONE: {
			label: 'Done',
			color: 'text-green-600',
			bgColor: 'bg-green-100',
			borderColor: 'border-green-200'
		},
		CANCELLED: {
			label: 'Cancelled',
			color: 'text-gray-500',
			bgColor: 'bg-gray-100',
			borderColor: 'border-gray-200'
		},
		DEFERRED: {
			label: 'Deferred',
			color: 'text-amber-600',
			bgColor: 'bg-amber-100',
			borderColor: 'border-amber-200'
		}
	};

	// Priority configuration
	const priorityConfig = {
		LOW: {
			label: 'Low',
			color: 'text-slate-600',
			bgColor: 'bg-slate-100',
			borderColor: 'border-slate-200'
		},
		MEDIUM: {
			label: 'Medium',
			color: 'text-blue-600',
			bgColor: 'bg-blue-100',
			borderColor: 'border-blue-200'
		},
		HIGH: {
			label: 'High',
			color: 'text-orange-600',
			bgColor: 'bg-orange-100',
			borderColor: 'border-orange-200'
		},
		URGENT: {
			label: 'Urgent',
			color: 'text-red-600',
			bgColor: 'bg-red-100',
			borderColor: 'border-red-200'
		}
	};

	// Helper to get initials
	function getInitials(name: string | undefined | null): string {
		if (!name) return '??';
		return name
			.split(' ')
			.map((n) => n[0])
			.join('')
			.toUpperCase()
			.slice(0, 2);
	}

	// Helper to format date
	function formatDate(dateString: string | null): string {
		if (!dateString) return 'Not set';
		return format(new Date(dateString), 'MMM d, yyyy');
	}

	// Handle status change
	async function handleStatusChange(taskId: string, newStatus: TaskStatus) {
		try {
			const result = await client
				.mutation(CHANGE_TASK_STATUS, {
					input: {
						taskId,
						status: newStatus
					}
				})
				.toPromise();

			if (result.error) {
				throw result.error;
			}
			toast.success('Task status updated');
			await invalidateAll();
		} catch (error) {
			console.error('Failed to change task status:', error);
			toast.error('Failed to update task status');
		}
	}

	// Handle tags update
	async function updateTags(newTags: string[]) {
		if (isUpdatingTags) return;
		isUpdatingTags = true;

		const formData = new FormData();
		formData.append('tags', JSON.stringify(newTags));

		try {
			const response = await fetch(`?/updateTags`, {
				method: 'POST',
				body: formData
			});

			const result = await response.json();

			if (result.type === 'success') {
				tags = newTags;
				toast.success('Tags updated');
				await invalidateAll();
			} else {
				toast.error('Failed to update tags');
			}
		} catch (error) {
			console.error('Tag update error:', error);
			toast.error('Failed to update tags');
		} finally {
			isUpdatingTags = false;
		}
	}

	function addTag() {
		if (!newTag.trim()) return;
		if (tags.includes(newTag.trim())) {
			newTag = '';
			return;
		}

		const updatedTags = [...tags, newTag.trim()];
		updateTags(updatedTags);
		newTag = '';
		isAddingTag = false;
	}

	function removeTag(tagToRemove: string) {
		const updatedTags = tags.filter((t) => t !== tagToRemove);
		updateTags(updatedTags);
	}

	// Navigation
	function handleEditClick() {
		if (task) {
			goto(`/dashboard/tasks/${task.id}/edit`);
		}
	}

	// Derived configs
	const currentStatus = $derived(
		task
			? statusConfig[task.status as keyof typeof statusConfig] || statusConfig.TODO
			: statusConfig.TODO
	);
	const currentPriority = $derived(
		task
			? priorityConfig[task.priority as keyof typeof priorityConfig] || priorityConfig.MEDIUM
			: priorityConfig.MEDIUM
	);
</script>

<svelte:head>
	<title>{task?.title || 'Task Not Found'} - Task Details - MountainHR</title>
	<meta name="description" content={task?.description || 'Task details'} />
</svelte:head>

<div class="min-h-screen bg-background p-4 md:p-8">
	{#if !task}
		<div class="mx-auto max-w-md text-center py-12 space-y-4">
			<div class="bg-muted rounded-full h-16 w-16 flex items-center justify-center mx-auto mb-4">
				<AlertCircle class="h-8 w-8 text-muted-foreground" />
			</div>
			<h1 class="text-2xl font-bold">Task Not Found</h1>
			<p class="text-muted-foreground">
				The task you are looking for does not exist or you do not have permission to view it.
			</p>
			<div class="pt-4">
				<Button href="/dashboard/tasks/my-tasks" variant="outline">Back to My Tasks</Button>
			</div>
		</div>
	{:else}
		<div class="mx-auto max-w-7xl space-y-8">
			<!-- Breadcrumb / Header Area -->
			<div class="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
				<div class="space-y-1.5">
					<div class="flex items-center gap-2 text-sm text-muted-foreground">
						<a href="/dashboard" class="transition-colors hover:text-foreground">Dashboard</a>
						<span>/</span>
						<a href="/dashboard/tasks" class="transition-colors hover:text-foreground">Tasks</a>
						<span>/</span>
						<span class="font-medium text-foreground">T-{task.id.slice(0, 8)}</span>
					</div>
					<h1 class="text-3xl font-bold tracking-tight">{task.title}</h1>
				</div>
				<div class="flex items-center gap-2">
					<Button variant="outline" size="sm" class="h-9" disabled>
						<Share2 class="mr-2 h-4 w-4" />
						Share
					</Button>
					<Button size="sm" class="h-9" onclick={handleEditClick}>
						<Pencil class="mr-2 h-4 w-4" />
						Edit Task
					</Button>
				</div>
			</div>

			<div class="grid grid-cols-1 gap-8 lg:grid-cols-3">
				<!-- Main Content Column (Left/Center) -->
				<div class="space-y-6 lg:col-span-2">
					<!-- Status and Priority Header -->
					<div
						class="flex flex-wrap items-center gap-4 rounded-lg border bg-card p-4 text-card-foreground shadow-sm"
					>
						<div class="flex items-center gap-2">
							<span class="text-sm font-medium text-muted-foreground">Status:</span>
							<span
								class={cn(
									'inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2',
									currentStatus.bgColor,
									currentStatus.color,
									currentStatus.borderColor,
									'border-transparent' // Override border for cleaner look if preferred
								)}
							>
								{currentStatus.label}
							</span>
						</div>
						<div class="h-4 w-px bg-border"></div>
						<div class="flex items-center gap-2">
							<span class="text-sm font-medium text-muted-foreground">Priority:</span>
							<span
								class={cn(
									'inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2',
									currentPriority.bgColor,
									currentPriority.color,
									currentPriority.borderColor,
									'border-transparent'
								)}
							>
								{currentPriority.label}
							</span>
						</div>
						<div class="h-4 w-px bg-border"></div>
						<div class="flex items-center gap-2">
							<span class="text-sm font-medium text-muted-foreground">Type:</span>
							<div class="flex items-center gap-1.5">
								{#if task.taskType?.colorCode}
									<div
										class="h-3 w-3 rounded-full"
										style="background-color: {task.taskType.colorCode}"
									></div>
								{:else}
									<Target class="h-4 w-4 text-purple-500" />
								{/if}
								<span class="text-sm font-medium">{task.taskType?.name || 'Task'}</span>
							</div>
						</div>
					</div>

					<!-- Description -->
					<div class="rounded-lg border bg-card text-card-foreground shadow-sm">
						<div class="flex flex-col space-y-1.5 p-6 pb-4">
							<h3 class="text-lg font-semibold leading-none tracking-tight">Description</h3>
						</div>
						<div class="p-6 pt-0 text-sm leading-relaxed text-muted-foreground">
							{#if task.description}
								<div class="prose prose-sm dark:prose-invert max-w-none whitespace-pre-wrap">
									{task.description}
								</div>
							{:else}
								<p class="italic text-muted-foreground">No description provided.</p>
							{/if}
						</div>
					</div>

					<!-- Subtasks / Checklist -->
					<div class="rounded-lg border bg-card text-card-foreground shadow-sm">
						<div class="flex flex-col space-y-1.5 p-6">
							<div class="flex items-center justify-between">
								<h3 class="text-lg font-semibold leading-none tracking-tight">Subtasks</h3>
								<span class="text-xs text-muted-foreground">
									{completedSubtasksCount} of {task.subtasks?.length || 0} completed
								</span>
							</div>
							<!-- Progress Bar -->
							<Progress value={subtaskProgress} class="mt-2 h-2 w-full" />
						</div>
						<div class="space-y-3 p-6 pt-0">
							{#if task.subtasks && task.subtasks.length > 0}
								{#each task.subtasks as subtask (subtask.id)}
									<div class="group flex items-start space-x-3">
										<button
											class={cn(
												'mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2',
												subtask.status === 'DONE' || subtask.status === 'COMPLETED'
													? 'bg-primary border-primary text-primary-foreground'
													: 'border-input hover:bg-accent hover:text-accent-foreground'
											)}
											onclick={() => {
												const newStatus =
													subtask.status === 'DONE' || subtask.status === 'COMPLETED'
														? 'TODO'
														: 'DONE';
												handleStatusChange(subtask.id, newStatus as TaskStatus);
											}}
											aria-label={subtask.status === 'DONE' || subtask.status === 'COMPLETED'
												? 'Mark as incomplete'
												: 'Mark as complete'}
										>
											{#if subtask.status === 'DONE' || subtask.status === 'COMPLETED'}
												<CheckCircle2 class="h-3.5 w-3.5" />
											{/if}
										</button>
										<div class="flex-1 space-y-1">
											<a
												href="/dashboard/tasks/{subtask.id}"
												class={cn(
													'block text-sm font-medium leading-none hover:underline',
													(subtask.status === 'DONE' || subtask.status === 'COMPLETED') &&
														'line-through text-muted-foreground'
												)}
											>
												{subtask.title}
											</a>
											{#if subtask.assignee}
												<p class="text-xs text-muted-foreground">
													Assigned to {subtask.assignee.displayName}
												</p>
											{/if}
										</div>
									</div>
								{/each}
							{:else}
								<div class="py-4 text-center text-sm text-muted-foreground">No subtasks yet.</div>
							{/if}

							<QuickAddTask
								currentUser={data.user}
								assignees={data.assignees}
								taskTypes={data.taskTypes}
								{canAssign}
								parentTaskId={task.id}
								triggerLabel="Add Subtask"
								triggerVariant="ghost"
								triggerSize="sm"
								onSuccess={async () => await invalidateAll()}
							/>
						</div>
					</div>

					<!-- Attachments -->
					<div class="rounded-lg border bg-card text-card-foreground shadow-sm">
						<div class="flex flex-col space-y-1.5 p-6">
							<h3 class="text-lg font-semibold leading-none tracking-tight">Attachments</h3>
						</div>
						<div class="p-6 pt-0 space-y-4">
							<!-- File Upload Form -->
							<form
								method="POST"
								action="?/uploadFile"
								enctype="multipart/form-data"
								use:enhance={({ formData }) => {
									isUploading = true;
									uploadError = null;

									const file = fileUploader?.getSelectedFile();
									if (file) {
										formData.set('file', file);
									}

									return async ({ result, update }) => {
										isUploading = false;
										if (result.type === 'success') {
											toast.success('File uploaded successfully');
											fileUploader?.clearFile();
											await update();
										} else if (result.type === 'failure') {
											uploadError = (result.data?.error as string) || 'Upload failed';
											toast.error(uploadError);
										}
									};
								}}
							>
								<FileUploader
									bind:this={fileUploader}
									bind:metadata
									bind:hasFile
									maxSizeMB={50}
									allowedTypes={['PDF', 'JPEG', 'PNG', 'GIF', 'DOCX', 'XLSX', 'TXT', 'CSV']}
								/>
								{#if hasFile}
									<div class="mt-2 flex justify-end">
										<Button type="submit" size="sm" disabled={isUploading}>
											{isUploading ? 'Uploading...' : 'Upload'}
										</Button>
									</div>
								{/if}
							</form>

							<!-- List of linked resources (Documents) -->
							{#if task.linkedResources && task.linkedResources.length > 0}
								<div class="space-y-2">
									{#each task.linkedResources as resource}
										{#if resource.resourceType === 'document'}
											<div
												class="flex items-center gap-3 p-3 rounded-md border bg-secondary/20 hover:bg-secondary/40 transition-colors"
											>
												<div
													class="h-10 w-10 rounded bg-blue-100 flex items-center justify-center text-blue-600"
												>
													<FileText class="h-5 w-5" />
												</div>
												<div class="flex flex-col flex-1 min-w-0">
													<span class="text-sm font-medium truncate">{resource.resourceTitle}</span>
													<span class="text-xs text-muted-foreground"
														>Document • {formatDate(resource.createdAt.toString())}</span
													>
												</div>
												<Button
													variant="ghost"
													size="icon"
													href={`/dashboard/documents/${resource.resourceId}`}
													title="View Document"
												>
													<Link2 class="h-4 w-4" />
												</Button>
											</div>
										{/if}
									{/each}
								</div>
							{/if}
						</div>
					</div>

					<!-- Comments / Activity -->
					<div class="rounded-lg border bg-card text-card-foreground shadow-sm">
						<div class="flex flex-col space-y-1.5 p-6">
							<h3 class="text-lg font-semibold leading-none tracking-tight">Activity</h3>
						</div>
						<div class="space-y-6 p-6 pt-0">
							<!-- Comment Input -->
							<form
								method="POST"
								action="?/addComment"
								use:enhance={() => {
									isPostingComment = true;
									return async ({ result, update }) => {
										isPostingComment = false;
										if (result.type === 'success') {
											commentText = '';
											toast.success('Comment added');
											await update();
										} else if (result.type === 'failure' && result.status === 501) {
											toast.info('Comments are not yet supported by the backend');
										} else {
											toast.error('Failed to post comment');
										}
									};
								}}
								class="flex gap-4"
							>
								<Avatar class="h-10 w-10">
									<AvatarFallback>{getInitials(data.user?.display_name)}</AvatarFallback>
								</Avatar>
								<div class="flex-1 gap-2">
									<Textarea
										name="comment"
										placeholder="Write a comment..."
										class="min-h-[80px]"
										bind:value={commentText}
									/>
									<div class="mt-2 flex justify-end">
										<Button
											size="sm"
											type="submit"
											disabled={!commentText.trim() || isPostingComment}
										>
											{isPostingComment ? 'Posting...' : 'Post Comment'}
										</Button>
									</div>
								</div>
							</form>

							<!-- Activity Stream -->
							<div class="relative">
								<div class="absolute bottom-0 left-5 top-0 w-px bg-border"></div>

								{#if data.auditTrail && data.auditTrail.length > 0}
									<!-- Render actual audit trail if available -->
									{#each data.auditTrail as entry}
										<div class="relative py-4 pl-12">
											<div
												class="absolute left-2 top-5 z-10 flex h-6 w-6 items-center justify-center rounded-full border-2 border-border bg-background"
											>
												<div class="h-2 w-2 rounded-full bg-muted-foreground"></div>
											</div>
											<div class="text-sm text-muted-foreground">
												<span class="font-medium text-foreground"
													>{entry.user?.displayName || 'System'}</span
												>
												{entry.action}
												<div class="mt-1 text-xs">
													{formatDistanceToNow(new Date(entry.createdAt))} ago
												</div>
											</div>
										</div>
									{/each}
								{:else}
									<!-- Empty state / Placeholder -->
									<div class="relative py-4 pl-12">
										<div
											class="absolute left-2 top-5 z-10 flex h-6 w-6 items-center justify-center rounded-full border-2 border-border bg-background"
										>
											<History class="h-3 w-3 text-muted-foreground" />
										</div>
										<div class="text-sm text-muted-foreground">
											Task created on {formatDate(task.createdAt)}
										</div>
									</div>
								{/if}
							</div>
						</div>
					</div>
				</div>

				<!-- Sidebar Column (Right) -->
				<div class="space-y-6">
					<!-- Details Card -->
					<div class="rounded-lg border bg-card text-card-foreground shadow-sm">
						<div class="flex flex-col space-y-1.5 border-b p-6">
							<h3 class="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
								Details
							</h3>
						</div>
						<div class="space-y-4 p-6">
							<!-- Assignee -->
							<div class="space-y-1">
								<p class="text-xs font-medium text-muted-foreground">Assignee</p>
								<div class="flex items-center gap-2">
									<Avatar class="h-6 w-6">
										<AvatarFallback class="bg-indigo-100 text-[10px] font-bold text-indigo-700">
											{getInitials(task.assignee?.displayName)}
										</AvatarFallback>
									</Avatar>
									<span class="text-sm font-medium"
										>{task.assignee?.displayName || 'Unassigned'}</span
									>
								</div>
							</div>

							<!-- Reporter -->
							<div class="space-y-1">
								<p class="text-xs font-medium text-muted-foreground">Reporter</p>
								<div class="flex items-center gap-2">
									<Avatar class="h-6 w-6">
										<AvatarFallback class="bg-emerald-100 text-[10px] font-bold text-emerald-700">
											{getInitials(task.creator?.displayName)}
										</AvatarFallback>
									</Avatar>
									<span class="text-sm">{task.creator?.displayName || 'Unknown'}</span>
								</div>
							</div>

							<div class="my-2 h-px bg-border"></div>

							<!-- Dates -->
							<div class="grid grid-cols-1 gap-4">
								<div class="space-y-1">
									<p class="text-xs font-medium text-muted-foreground">Due Date</p>
									<div class="flex items-center gap-2 text-sm">
										<Calendar class="h-3.5 w-3.5 text-muted-foreground" />
										<span>{formatDate(task.dueDate)}</span>
									</div>
								</div>
								{#if task.createdAt}
									<div class="space-y-1">
										<p class="text-xs font-medium text-muted-foreground">Created</p>
										<div class="flex items-center gap-2 text-sm">
											<Clock class="h-3.5 w-3.5 text-muted-foreground" />
											<span>{formatDate(task.createdAt)}</span>
										</div>
									</div>
								{/if}
							</div>

							<!-- Parent Task -->
							{#if task.parentTask}
								<div class="my-2 h-px bg-border"></div>
								<div class="space-y-1">
									<p class="text-xs font-medium text-muted-foreground">Parent Task</p>
									<a
										href="/dashboard/tasks/{task.parentTask.id}"
										class="flex items-center gap-2 text-sm font-medium text-primary hover:underline"
									>
										<Target class="h-3.5 w-3.5" />
										{task.parentTask.title}
									</a>
								</div>
							{/if}
						</div>
					</div>

					<!-- Tags -->
					<div class="rounded-lg border bg-card text-card-foreground shadow-sm">
						<div class="flex flex-col space-y-1.5 border-b p-6">
							<h3 class="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
								Tags
							</h3>
						</div>
						<div class="p-6">
							<div class="flex flex-wrap gap-2">
								{#if task.taskType}
									<span
										class="inline-flex items-center rounded-full border border-transparent bg-secondary px-2.5 py-0.5 text-xs font-semibold text-secondary-foreground transition-colors hover:bg-secondary/80"
									>
										{task.taskType.name}
									</span>
								{/if}

								{#each tags as tag}
									<span
										class="inline-flex items-center rounded-full border border-transparent bg-primary/10 text-primary px-2.5 py-0.5 text-xs font-semibold transition-colors"
									>
										{tag}
										<button
											class="ml-1 hover:text-destructive focus:outline-none"
											onclick={() => removeTag(tag)}
										>
											<X class="h-3 w-3" />
										</button>
									</span>
								{/each}

								{#if isAddingTag}
									<div class="flex items-center">
										<Input
											bind:value={newTag}
											class="h-6 w-24 text-xs px-2 py-0"
											autofocus
											onkeydown={(e) => {
												if (e.key === 'Enter') {
													e.preventDefault();
													addTag();
												} else if (e.key === 'Escape') {
													isAddingTag = false;
													newTag = '';
												}
											}}
											onblur={() => {
												// Delay to allow click to register if needed, or just close
												setTimeout(() => {
													isAddingTag = false;
													newTag = '';
												}, 200);
											}}
										/>
									</div>
								{:else}
									<button
										class="inline-flex items-center rounded-full border border-dashed border-muted-foreground px-2.5 py-0.5 text-xs font-semibold text-muted-foreground transition-colors hover:border-foreground hover:text-foreground"
										onclick={() => (isAddingTag = true)}
									>
										<Plus class="mr-1 h-3 w-3" /> Add
									</button>
								{/if}
							</div>
						</div>
					</div>
				</div>
			</div>
		</div>
	{/if}
</div>
