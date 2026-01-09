<script lang="ts">
	import { Shield } from '@lucide/svelte';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import * as Card from '$lib/components/ui/card';
	import { Separator } from '$lib/components/ui/separator';
	import { Checkbox } from '$lib/components/ui/checkbox';

	interface Props {
		username: string;
		password: string;
		confirmPassword: string;
		roleIds: string[];
		validationErrors: Record<string, string>;
		roleOptions: any[];
	}

	let {
		username = $bindable(),
		password = $bindable(),
		confirmPassword = $bindable(),
		roleIds = $bindable(),
		validationErrors,
		roleOptions
	}: Props = $props();
</script>

<Card.Root>
	<Card.Header>
		<Card.Title class="flex items-center gap-2">
			<Shield class="h-5 w-5" />
			Authentication & Roles
		</Card.Title>
		<Card.Description>User credentials and role assignments</Card.Description>
	</Card.Header>
	<Card.Content class="space-y-4">
		<div class="grid grid-cols-1 gap-4 md:grid-cols-2">
			<div class="space-y-2">
				<Label for="username">Username *</Label>
				<Input
					id="username"
					bind:value={username}
					placeholder="Enter username"
					class={validationErrors.username ? 'border-destructive' : ''}
				/>
				{#if validationErrors.username}
					<p class="text-sm text-destructive">{validationErrors.username}</p>
				{/if}
			</div>

			<div class="space-y-2">
				<Label for="password">Password *</Label>
				<Input
					id="password"
					type="password"
					bind:value={password}
					placeholder="Enter password"
					class={validationErrors.password ? 'border-destructive' : ''}
				/>
				{#if validationErrors.password}
					<p class="text-sm text-destructive">{validationErrors.password}</p>
				{/if}
			</div>

			<div class="space-y-2 md:col-span-2">
				<Label for="confirmPassword">Confirm Password *</Label>
				<Input
					id="confirmPassword"
					type="password"
					bind:value={confirmPassword}
					placeholder="Confirm password"
					class={validationErrors.confirmPassword ? 'border-destructive' : ''}
				/>
				{#if validationErrors.confirmPassword}
					<p class="text-sm text-destructive">{validationErrors.confirmPassword}</p>
				{/if}
			</div>
		</div>

		<Separator />

		<div class="space-y-4">
			<Label>Role Assignments</Label>
			<div class="grid grid-cols-1 gap-4 md:grid-cols-2">
				{#each roleOptions as role}
					<div class="flex items-center space-x-2">
						<Checkbox
							id="role-{role.value}"
							checked={roleIds.includes(role.value)}
							onCheckedChange={(checked) => {
								if (checked) {
									roleIds = [...roleIds, role.value];
								} else {
									roleIds = roleIds.filter((id) => id !== role.value);
								}
							}}
						/>
						<Label for="role-{role.value}" class="text-sm font-normal">
							{role.label}
						</Label>
					</div>
				{/each}
			</div>
		</div>
	</Card.Content>
</Card.Root>
