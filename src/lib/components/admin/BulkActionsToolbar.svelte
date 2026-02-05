<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import { Badge } from '$lib/components/ui/badge';
	import { CheckCircle, XCircle, UserCheck, UserX } from '@lucide/svelte';
	import { enhance } from '$app/forms';

	interface Props {
		selectedEmployees: Array<{ id: string; displayName: string; isActive: boolean }>;
		onClearSelection: () => void;
	}

	let { selectedEmployees, onClearSelection }: Props = $props();

	let selectedCount = $derived(selectedEmployees.length);
	let isSubmitting = $state(false);
	let lastResult = $state<{ success: boolean; successCount: number; failureCount: number } | null>(
		null
	);

	function handleActivate() {
		if (
			!confirm(
				`Are you sure you want to activate ${selectedCount} employee${selectedCount > 1 ? 's' : ''}?`
			)
		) {
			return false;
		}
		isSubmitting = true;
		return true;
	}

	function handleDeactivate() {
		if (
			!confirm(
				`Are you sure you want to deactivate ${selectedCount} employee${selectedCount > 1 ? 's' : ''}?`
			)
		) {
			return false;
		}
		isSubmitting = true;
		return true;
	}

	function handleResult(result: any) {
		isSubmitting = false;
		if (result.type === 'success' && result.data) {
			lastResult = {
				success: result.data.success,
				successCount: result.data.successCount || 0,
				failureCount: result.data.failureCount || 0
			};
			// Clear selection after successful operation
			if (result.data.success) {
				setTimeout(() => {
					onClearSelection();
					lastResult = null;
				}, 3000);
			}
		}
	}
</script>

{#if selectedCount > 0}
	<div
		class="sticky top-0 z-10 flex items-center justify-between gap-4 rounded-lg border bg-card p-4 shadow-lg"
	>
		<div class="flex items-center gap-3">
			<Badge variant="secondary" class="text-base">
				{selectedCount} selected
			</Badge>
			<Button variant="ghost" size="sm" onclick={onClearSelection} disabled={isSubmitting}>
				Clear selection
			</Button>
		</div>

		<div class="flex items-center gap-2">
			<form
				method="POST"
				action="?/bulkActivate"
				use:enhance={() => {
					if (!handleActivate()) {
						return () => {};
					}
					return async ({ result, update }) => {
						handleResult(result);
						await update();
					};
				}}
			>
				<input
					type="hidden"
					name="employeeIds"
					value={JSON.stringify(selectedEmployees.map((e) => e.id))}
				/>
				<Button type="submit" variant="default" size="sm" class="gap-2" disabled={isSubmitting}>
					<UserCheck class="h-4 w-4" />
					Activate
				</Button>
			</form>

			<form
				method="POST"
				action="?/bulkDeactivate"
				use:enhance={() => {
					if (!handleDeactivate()) {
						return () => {};
					}
					return async ({ result, update }) => {
						handleResult(result);
						await update();
					};
				}}
			>
				<input
					type="hidden"
					name="employeeIds"
					value={JSON.stringify(selectedEmployees.map((e) => e.id))}
				/>
				<Button type="submit" variant="destructive" size="sm" class="gap-2" disabled={isSubmitting}>
					<UserX class="h-4 w-4" />
					Deactivate
				</Button>
			</form>
		</div>
	</div>
{/if}

{#if lastResult}
	<div
		class="fixed bottom-4 right-4 rounded-lg border bg-card p-4 shadow-lg transition-all"
		role="alert"
	>
		{#if lastResult.success}
			<div class="flex items-center gap-2 text-green-600">
				<CheckCircle class="h-5 w-5" />
				<span class="font-medium">
					Success: {lastResult.successCount} employee{lastResult.successCount !== 1 ? 's' : ''}
					updated
				</span>
			</div>
			{#if lastResult.failureCount > 0}
				<div class="mt-1 text-sm text-muted-foreground">
					{lastResult.failureCount} failed
				</div>
			{/if}
		{:else}
			<div class="flex items-center gap-2 text-red-600">
				<XCircle class="h-5 w-5" />
				<span class="font-medium">Operation failed</span>
			</div>
		{/if}
	</div>
{/if}
