<script lang="ts" module>
	import { tv, type VariantProps } from 'tailwind-variants';
	import { cn } from '$lib/utils.js';

	export const bulkActionsBarVariants = tv({
		base: 'fixed bottom-6 left-1/2 -translate-x-1/2 z-50 transition-all duration-300',
		variants: {
			state: {
				hidden: 'scale-95 opacity-0 translate-y-full pointer-events-none',
				visible: 'scale-100 opacity-100 translate-y-0'
			}
		},
		defaultVariants: {
			state: 'visible'
		}
	});

	export const bulkActionItemVariants = tv({
		base: 'flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium transition-all duration-200 hover:scale-[1.02]',
		variants: {
			variant: {
				default: 'bg-primary text-primary-foreground hover:bg-primary/90',
				secondary: 'bg-secondary text-secondary-foreground hover:bg-secondary/80',
				outline: 'border border-border bg-background hover:bg-muted/50',
				destructive: 'bg-destructive text-destructive-foreground hover:bg-destructive/90',
				ghost: 'hover:bg-muted/50'
			}
		},
		defaultVariants: {
			variant: 'outline'
		}
	});

	export interface BulkAction {
		id: string;
		label: string;
		icon: any; // Lucide icon component
		variant: VariantProps<typeof bulkActionItemVariants>['variant'];
		description?: string;
		requiresConfirmation?: boolean;
		confirmationTitle?: string;
		confirmationMessage?: string;
		disabled?: boolean;
		shortcut?: string;
	}

	export type BulkActionsBarState = VariantProps<typeof bulkActionsBarVariants>['state'];
	export type BulkActionVariant = VariantProps<typeof bulkActionItemVariants>['variant'];

	export type EnhancedBulkActionsBarProps = {
		selectedCount: number;
		totalCount?: number;
		actions: BulkAction[];
		onAction: (actionId: string, selectedItems?: string[]) => Promise<void> | void;
		onClear: () => void;
		selectedItems?: string[];
		isProcessing?: boolean;
		progress?: number;
		progressMessage?: string;
		class?: string;
	};
</script>

<script lang="ts">
	import { X, Loader, CheckSquare } from 'lucide-svelte';
	import Button from '../button/button.svelte';
	import Badge from '../badge/badge.svelte';
	import Separator from '../separator/separator.svelte';
	import Progress from '../progress/progress.svelte';
	import {
		Dialog,
		DialogContent,
		DialogHeader,
		DialogTitle,
		DialogDescription,
		DialogFooter
	} from '../dialog';

	let {
		selectedCount,
		totalCount,
		actions,
		onAction,
		onClear,
		selectedItems = [],
		isProcessing = false,
		progress = 0,
		progressMessage = '',
		class: className
	}: EnhancedBulkActionsBarProps = $props();

	let confirmationDialog = $state<{
		open: boolean;
		action?: BulkAction;
		title?: string;
		message?: string;
	}>({ open: false });

	let processingAction = $state<string | null>(null);

	async function handleAction(action: BulkAction) {
		if (action.disabled) return;

		if (action.requiresConfirmation) {
			confirmationDialog = {
				open: true,
				action,
				title: action.confirmationTitle || `Confirm ${action.label}`,
				message:
					action.confirmationMessage ||
					`Are you sure you want to ${action.label.toLowerCase()} ${selectedCount} items?`
			};
			return;
		}

		await executeAction(action);
	}

	async function executeAction(action: BulkAction) {
		try {
			processingAction = action.id;
			await onAction(action.id, selectedItems);
		} catch (error) {
			console.error(`Failed to execute ${action.label}:`, error);
			// You might want to show a toast notification here
		} finally {
			processingAction = null;
			confirmationDialog.open = false;
		}
	}

	function handleConfirm() {
		if (confirmationDialog.action) {
			executeAction(confirmationDialog.action);
		}
	}

	function handleCancel() {
		confirmationDialog.open = false;
	}

	// Keyboard shortcuts
	function handleKeydown(event: KeyboardEvent) {
		if (event.key === 'Escape') {
			if (confirmationDialog.open) {
				handleCancel();
			} else {
				onClear();
			}
		}

		// Handle action shortcuts
		const action = actions.find(
			(a) => a.shortcut && event.key === a.shortcut && (event.ctrlKey || event.metaKey)
		);
		if (action && !action.disabled) {
			event.preventDefault();
			handleAction(action);
		}
	}

	const state = $derived(selectedCount > 0 ? 'visible' : 'hidden');
</script>

<svelte:window on:keydown={handleKeydown} />

<!-- Floating Bulk Actions Bar -->
<div class={cn(bulkActionsBarVariants({ state }), className)}>
	<div class="rounded-2xl border border-border/40 bg-background/95 p-4 shadow-2xl backdrop-blur-xl">
		{#if isProcessing}
			<!-- Processing State -->
			<div class="flex min-w-96 items-center gap-4">
				<div class="flex items-center gap-3">
					<Loader class="h-5 w-5 animate-spin text-primary" />
					<div class="space-y-1">
						<p class="text-sm font-medium">Processing...</p>
						{#if progressMessage}
							<p class="text-xs text-muted-foreground">{progressMessage}</p>
						{/if}
					</div>
				</div>

				{#if progress > 0}
					<div class="flex-1">
						<Progress value={progress} class="h-2" />
						<p class="mt-1 text-right text-xs text-muted-foreground">{progress}%</p>
					</div>
				{/if}
			</div>
		{:else}
			<!-- Normal State -->
			<div class="flex items-center space-x-4">
				<!-- Selection Info -->
				<div class="flex items-center space-x-3">
					<Badge variant="secondary" class="rounded-lg px-3 py-1 font-medium">
						<CheckSquare class="mr-2 h-4 w-4" />
						{selectedCount} selected
						{#if totalCount}
							<span class="ml-1 text-muted-foreground">of {totalCount}</span>
						{/if}
					</Badge>

					<Button
						variant="outline"
						size="sm"
						onclick={onClear}
						class="rounded-xl px-3 py-2"
						title="Clear selection (Esc)"
					>
						<X class="mr-2 h-4 w-4" />
						Clear
					</Button>
				</div>

				<Separator orientation="vertical" class="h-8" />

				<!-- Bulk Actions -->
				<div class="flex items-center space-x-2">
					{#each actions as action (action.id)}
						{@const IconComponent = action.icon}
						<Button
							variant={action.variant}
							size="sm"
							onclick={() => handleAction(action)}
							disabled={action.disabled || processingAction === action.id}
							class={cn(bulkActionItemVariants({ variant: action.variant }))}
							title={action.description + (action.shortcut ? ` (${action.shortcut})` : '')}
						>
							{#if processingAction === action.id}
								<Loader class="mr-2 h-4 w-4 animate-spin" />
							{:else}
								<IconComponent class="mr-2 h-4 w-4" />
							{/if}
							{action.label}
						</Button>
					{/each}
				</div>
			</div>
		{/if}
	</div>
</div>

<!-- Confirmation Dialog -->
<Dialog bind:open={confirmationDialog.open}>
	<DialogContent class="max-w-md">
		<DialogHeader>
			<DialogTitle>{confirmationDialog.title}</DialogTitle>
			<DialogDescription>
				{confirmationDialog.message}
			</DialogDescription>
		</DialogHeader>

		<DialogFooter>
			<Button variant="outline" onclick={handleCancel}>Cancel</Button>
			<Button
				variant={confirmationDialog.action?.variant === 'destructive' ? 'destructive' : 'default'}
				onclick={handleConfirm}
				disabled={processingAction !== null}
			>
				{#if processingAction}
					<Loader class="mr-2 h-4 w-4 animate-spin" />
				{/if}
				Confirm
			</Button>
		</DialogFooter>
	</DialogContent>
</Dialog>
