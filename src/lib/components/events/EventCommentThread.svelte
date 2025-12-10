<script lang="ts">
	/**
	 * EventCommentThread Component
	 * Feature: 025-events-flesh-out
	 *
	 * Displays event comments with @mention parsing.
	 * Allows users to edit/delete their own comments.
	 */

	import { Button } from '$lib/components/ui/button';
	import { Textarea } from '$lib/components/ui/textarea';
	import { Avatar, AvatarFallback, AvatarImage } from '$lib/components/ui/avatar';
	import { Edit2, MessageSquare, Send, Trash2 } from '@lucide/svelte';
	import { toast } from 'svelte-sonner';
	import { formatDistanceToNow } from 'date-fns';
	import DOMPurify from 'dompurify';

	interface Comment {
		id: string;
		content: string;
		author: {
			id: string;
			name: string;
			avatarUrl?: string;
		};
		mentions: Array<{ id: string; name: string }>;
		createdAt: string;
		updatedAt?: string;
	}

	interface Props {
		eventId: string;
		comments: Comment[];
		currentUserId: string;
		currentUserRole?: string;
		eventOrganizerId?: string;
		onAddComment?: (content: string, mentions: string[]) => Promise<void>;
		onUpdateComment?: (commentId: string, content: string) => Promise<void>;
		onDeleteComment?: (commentId: string) => Promise<void>;
		readonly?: boolean;
		hasMore?: boolean;
		onLoadMore?: () => Promise<void>;
	}

	const {
		eventId,
		comments = [],
		currentUserId,
		currentUserRole,
		eventOrganizerId,
		onAddComment,
		onUpdateComment,
		onDeleteComment,
		readonly = false,
		hasMore = false,
		onLoadMore
	}: Props = $props();

	let newCommentContent = $state('');
	let editingCommentId = $state<string | null>(null);
	let editContent = $state('');
	let loading = $state(false);

	/**
	 * Check if the current user can delete a comment.
	 * Users can delete comments if they are:
	 * - The comment author (comment.author.id === currentUserId)
	 * - The event organizer/creator (currentUserId === eventOrganizerId)
	 * - HR Manager (role: hr_manager)
	 * - Admin (role: admin or super_admin)
	 */
	function canDeleteComment(comment: Comment): boolean {
		// Comment author can always delete their own comment
		if (comment.author.id === currentUserId) {
			return true;
		}

		// Event organizer can delete any comment on their event
		if (eventOrganizerId && currentUserId === eventOrganizerId) {
			return true;
		}

		// HR managers and admins can delete any comment
		if (currentUserRole) {
			const role = currentUserRole.toLowerCase();
			if (role === 'hr_manager' || role === 'admin' || role === 'super_admin') {
				return true;
			}
		}

		return false;
	}

	function getInitials(name: string): string {
		return name
			.split(' ')
			.map((part) => part[0])
			.join('')
			.toUpperCase()
			.slice(0, 2);
	}

	function parseContent(content: string): string {
		// Convert @mentions to highlighted spans
		const html = content.replace(/@(\w+)/g, '<span class="mention">@$1</span>');
		return DOMPurify.sanitize(html);
	}

	function extractMentions(content: string): string[] {
		const mentionRegex = /@(\w+)/g;
		const mentions: string[] = [];
		let match;

		while ((match = mentionRegex.exec(content)) !== null) {
			mentions.push(match[1]);
		}

		return mentions;
	}

	async function handleAddComment() {
		if (!newCommentContent.trim() || !onAddComment) return;

		loading = true;
		try {
			const mentions = extractMentions(newCommentContent);
			await onAddComment(newCommentContent, mentions);
			newCommentContent = '';
			toast.success('Comment added');
		} catch (error) {
			toast.error('Failed to add comment', {
				description: error instanceof Error ? error.message : 'Please try again.'
			});
		} finally {
			loading = false;
		}
	}

	function startEditing(comment: Comment) {
		editingCommentId = comment.id;
		editContent = comment.content;
	}

	function cancelEditing() {
		editingCommentId = null;
		editContent = '';
	}

	async function handleUpdateComment(commentId: string) {
		if (!editContent.trim() || !onUpdateComment) return;

		loading = true;
		try {
			await onUpdateComment(commentId, editContent);
			editingCommentId = null;
			editContent = '';
			toast.success('Comment updated');
		} catch (error) {
			toast.error('Failed to update comment', {
				description: error instanceof Error ? error.message : 'Please try again.'
			});
		} finally {
			loading = false;
		}
	}

	async function handleDeleteComment(commentId: string) {
		if (!onDeleteComment) return;
		if (!confirm('Are you sure you want to delete this comment?')) return;

		loading = true;
		try {
			await onDeleteComment(commentId);
			toast.success('Comment deleted');
		} catch (error) {
			toast.error('Failed to delete comment', {
				description: error instanceof Error ? error.message : 'Please try again.'
			});
		} finally {
			loading = false;
		}
	}

	function formatTimestamp(timestamp: string): string {
		return formatDistanceToNow(new Date(timestamp), { addSuffix: true });
	}
</script>

<div class="space-y-4">
	<div class="flex items-center gap-2">
		<MessageSquare class="h-5 w-5" />
		<h3 class="font-semibold">
			Comments {#if comments.length > 0}({comments.length}){/if}
		</h3>
	</div>

	<!-- Comments List -->
	<div class="space-y-4">
		{#each comments as comment (comment.id)}
			<div class="border rounded-lg p-4">
				<div class="flex gap-3">
					<Avatar class="h-10 w-10">
						<AvatarImage src={comment.author.avatarUrl} alt={comment.author.name} />
						<AvatarFallback>{getInitials(comment.author.name)}</AvatarFallback>
					</Avatar>

					<div class="flex-1 space-y-2">
						<div class="flex items-center justify-between">
							<div>
								<span class="font-medium">{comment.author.name}</span>
								<span class="text-sm text-muted-foreground ml-2">
									{formatTimestamp(comment.createdAt)}
								</span>
								{#if comment.updatedAt && comment.updatedAt !== comment.createdAt}
									<span class="text-sm text-muted-foreground ml-1">(edited)</span>
								{/if}
							</div>

							{#if !readonly && (comment.author.id === currentUserId || canDeleteComment(comment))}
								<div class="flex gap-1">
									<!-- Edit button only for comment author -->
									{#if comment.author.id === currentUserId}
										<Button
											variant="ghost"
											size="sm"
											onclick={() => startEditing(comment)}
											disabled={loading}
										>
											<Edit2 class="h-4 w-4" />
										</Button>
									{/if}
									<!-- Delete button for authorized users -->
									{#if canDeleteComment(comment)}
										<Button
											variant="ghost"
											size="sm"
											onclick={() => handleDeleteComment(comment.id)}
											disabled={loading}
										>
											<Trash2 class="h-4 w-4" />
										</Button>
									{/if}
								</div>
							{/if}
						</div>

						{#if editingCommentId === comment.id}
							<div class="space-y-2">
								<Textarea
									bind:value={editContent}
									placeholder="Edit comment..."
									rows={3}
									disabled={loading}
								/>
								<div class="flex gap-2">
									<Button
										size="sm"
										onclick={() => handleUpdateComment(comment.id)}
										disabled={loading || !editContent.trim()}
									>
										Save
									</Button>
									<Button variant="outline" size="sm" onclick={cancelEditing} disabled={loading}>
										Cancel
									</Button>
								</div>
							</div>
						{:else}
							<div class="text-sm whitespace-pre-wrap">
								{@html parseContent(comment.content)}
							</div>
						{/if}

						{#if comment.mentions.length > 0}
							<div class="flex gap-2 items-center text-xs text-muted-foreground">
								<span>Mentioned:</span>
								{#each comment.mentions as mention}
									<span class="bg-muted px-2 py-1 rounded">{mention.name}</span>
								{/each}
							</div>
						{/if}
					</div>
				</div>
			</div>
		{/each}

		{#if comments.length === 0}
			<p class="text-center text-muted-foreground py-8">
				No comments yet. Be the first to comment!
			</p>
		{/if}
	</div>

	<!-- Add Comment Form -->
	{#if !readonly}
		<div class="border-t pt-4">
			<div class="space-y-2">
				<Textarea
					bind:value={newCommentContent}
					placeholder="Add a comment... Use @name to mention someone"
					rows={3}
					disabled={loading}
				/>
				<div class="flex justify-between items-center">
					<p class="text-xs text-muted-foreground">Tip: Use @username to mention someone</p>
					<Button
						onclick={handleAddComment}
						disabled={loading || !newCommentContent.trim()}
						class="gap-2"
					>
						<Send class="h-4 w-4" />
						Post Comment
					</Button>
				</div>
			</div>
		</div>
	{/if}
</div>
