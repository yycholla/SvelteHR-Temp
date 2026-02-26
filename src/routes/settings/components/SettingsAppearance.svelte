<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import { Label } from '$lib/components/ui/label';
	import * as Card from '$lib/components/ui/card';
	import * as Switch from '$lib/components/ui/switch';
	import { Palette, Save } from '@lucide/svelte';
	import {
		colorSchemeOptions,
		fontSizeOptions,
		languageOptions
	} from '$lib/graphql/settings-operations';
	import type { AppearanceSettingsState } from '../types';

	interface Props {
		appearanceSettings: AppearanceSettingsState;
		isUpdating: boolean;
		onUpdate: () => void;
	}

	let { appearanceSettings = $bindable(), isUpdating, onUpdate }: Props = $props();
</script>

<div class="space-y-6" data-testid="appearance-content">
	<Card.Root>
		<Card.Header>
			<Card.Title class="flex items-center gap-2">
				<Palette class="h-5 w-5" />
				Appearance & Language
			</Card.Title>
			<Card.Description>Customize how MountainHR looks and feels</Card.Description>
		</Card.Header>
		<Card.Content class="space-y-4">
			<div class="flex items-center justify-between">
				<div class="space-y-0.5">
					<Label>Dark Mode</Label>
					<p class="text-sm text-gray-500">Switch to dark theme</p>
				</div>
				<Switch.Root bind:checked={appearanceSettings.darkMode} data-testid="dark-mode" />
			</div>

			<div class="flex items-center justify-between">
				<div class="space-y-0.5">
					<Label>Compact View</Label>
					<p class="text-sm text-gray-500">Show more content in less space</p>
				</div>
				<Switch.Root bind:checked={appearanceSettings.compactView} data-testid="compact-view" />
			</div>

			<div class="space-y-2">
				<Label for="language">Language</Label>
				<select
					id="language"
					bind:value={appearanceSettings.language}
					class="w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:ring-blue-500"
					data-testid="language-select"
				>
					{#each languageOptions as lang}
						<option value={lang.value}>{lang.flag} {lang.label}</option>
					{/each}
				</select>
			</div>

			<div class="space-y-2">
				<Label for="fontSize">Font Size</Label>
				<select
					id="fontSize"
					bind:value={appearanceSettings.fontSize}
					class="w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:ring-blue-500"
					data-testid="font-size-select"
				>
					{#each fontSizeOptions as size}
						<option value={size.value}>{size.label} - {size.description}</option>
					{/each}
				</select>
			</div>

			<div class="space-y-2">
				<Label for="colorScheme">Color Scheme</Label>
				<div class="grid grid-cols-2 gap-3">
					{#each colorSchemeOptions as scheme}
						<label
							class="flex cursor-pointer items-center space-x-3 rounded-md border p-3 hover:bg-gray-50 {appearanceSettings.colorScheme ===
							scheme.value
								? 'border-blue-500 bg-blue-50'
								: 'border-gray-200'}"
						>
							<input
								type="radio"
								bind:group={appearanceSettings.colorScheme}
								value={scheme.value}
								class="text-blue-600"
								data-testid="color-scheme-{scheme.value}"
							/>
							<div class="flex items-center space-x-2">
								<div class="h-4 w-4 rounded-full" style="background-color: {scheme.color}"></div>
								<div>
									<div class="font-medium">{scheme.label}</div>
									<div class="text-sm text-gray-500">{scheme.description}</div>
								</div>
							</div>
						</label>
					{/each}
				</div>
			</div>
		</Card.Content>
		<Card.Footer>
			<Button onclick={onUpdate} disabled={isUpdating} data-testid="save-appearance-button">
				{#if isUpdating}
					<div
						class="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"
					></div>
				{:else}
					<Save class="mr-2 h-4 w-4" />
				{/if}
				{isUpdating ? 'Applying...' : 'Apply Changes'}
			</Button>
		</Card.Footer>
	</Card.Root>
</div>
