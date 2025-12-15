<script lang="ts">
	import { enhance } from '$app/forms';
	import { History } from '@lucide/svelte';
	import { Button } from '$lib/components/ui/button';
	import { Avatar, AvatarFallback } from '$lib/components/ui/avatar';
	import { Textarea } from '$lib/components/ui/textarea';
	import { toast } from 'svelte-sonner';

	interface Props {
		auditTrail: any[];
		taskCreatedAt: string;
		user: any;
		formatDate: (date: string) => string;
		getInitials: (name: string) => string;
		formatDistanceToNow: (date: Date) => string;
	}

	const {
		auditTrail,
		taskCreatedAt,
		user,
		formatDate,
		getInitials,
		formatDistanceToNow
	}: Props = $props();

	let commentText = $state('');
	let isPostingComment = $state(false);
</script>

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
				<AvatarFallback>{getInitials(user?.display_name)}</AvatarFallback>
			</Avatar>
			<div class="flex-1 gap-2">
				<Textarea
					name="comment"
					placeholder="Write a comment..."
					class="min-h-[80px]"
					bind:value={commentText}
				/>
				<div class="mt-2 flex justify-end">
					<Button size="sm" type="submit" disabled={!commentText.trim() || isPostingComment}>
						{isPostingComment ? 'Posting...' : 'Post Comment'}
					</Button>
				</div>
			</div>
		</form>

		<!-- Activity Stream -->
		<div class="relative">
			<div class="absolute top-0 bottom-0 left-5 w-px bg-border"></div>

			{#if auditTrail && auditTrail.length > 0}
				<!-- Render actual audit trail if available -->
				{#each auditTrail as entry}
					<div class="relative py-4 pl-12">
						<div
							class="absolute top-5 left-2 z-10 flex h-6 w-6 items-center justify-center rounded-full border-2 border-border bg-background"
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
						class="absolute top-5 left-2 z-10 flex h-6 w-6 items-center justify-center rounded-full border-2 border-border bg-background"
					>
						<History class="h-3 w-3 text-muted-foreground" />
					</div>
					<div class="text-sm text-muted-foreground">
						Task created on {formatDate(taskCreatedAt)}
					</div>
				</div>
			{/if}
		</div>
	</div>
</div>
