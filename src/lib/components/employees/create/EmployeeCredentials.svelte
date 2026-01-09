<script lang="ts">
	import { Input } from '$lib/components/ui/input';
	import { Button } from '$lib/components/ui/button';
	import { Label } from '$lib/components/ui/label';
	import { X } from '@lucide/svelte';

	interface Props {
		password: string;
		fieldErrors: Record<string, string>;
		passwordTouched: boolean;
		passwordValidations: Array<{ id: string; label: string; valid: boolean }>;
		submitting: boolean;
		onGeneratePassword: () => void;
		onClearError: (field: string) => void;
		onValidate: (field: string, value: string) => void;
		onPasswordTouch: () => void;
	}

	let {
		password = $bindable(),
		fieldErrors,
		passwordTouched,
		passwordValidations,
		submitting,
		onGeneratePassword,
		onClearError,
		onValidate,
		onPasswordTouch
	}: Props = $props();
</script>

<div class="space-y-4">
	<h3 class="text-sm font-semibold text-muted-foreground">Account Credentials</h3>

	<div class="space-y-2">
		<Label for="password">Password (Optional)</Label>
		<div class="flex gap-2">
			<Input
				id="password"
				name="password"
				type="text"
				bind:value={password}
				oninput={() => {
					onClearError('password');
					onPasswordTouch();
				}}
				onblur={() => onValidate('password', password)}
				placeholder="Leave blank to auto-generate"
				disabled={submitting}
				class="flex-1 {fieldErrors.password
					? 'border-red-500 focus-visible:ring-red-500'
					: ''}"
			/>
			<Button
				type="button"
				variant="outline"
				onclick={onGeneratePassword}
				disabled={submitting}
			>
				Generate
			</Button>
		</div>

		{#if passwordTouched && password}
			<div class="space-y-1 mt-1">
				{#each passwordValidations as req}
					{#if !req.valid}
						<div class="flex items-center text-xs text-red-500 transition-all">
							<X class="mr-1 h-3 w-3" />
							{req.label}
						</div>
					{/if}
				{/each}
			</div>
		{/if}

		{#if fieldErrors.password}
			<p class="text-sm text-red-500">{fieldErrors.password}</p>
		{:else}
			<p class="text-xs text-muted-foreground mt-1">
				If no password is provided, a secure temporary password will be generated automatically and
				logged.
			</p>
		{/if}
	</div>
</div>
