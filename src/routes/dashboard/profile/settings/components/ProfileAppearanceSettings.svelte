<script lang="ts">
	import { Save } from '@lucide/svelte';
	import * as Card from '$lib/components/ui/card';
	import { Button } from '$lib/components/ui/button';
	import { Label } from '$lib/components/ui/label';

	interface Props {
		selectedTheme: string;
		onThemeSubmit: (event: Event) => void;
	}

	let { selectedTheme = $bindable(), onThemeSubmit }: Props = $props();
</script>

<Card.Root>
	<Card.Header>
		<Card.Title>Appearance</Card.Title>
		<Card.Description>Customize the look and feel of the application</Card.Description>
	</Card.Header>
	<Card.Content>
		<form method="POST" action="?/updateTheme" onsubmit={onThemeSubmit}>
			<div class="space-y-6">
				<div class="space-y-4">
					<Label for="theme">Theme</Label>
					<select
						id="theme"
						name="theme"
						bind:value={selectedTheme}
						class="flex h-9 w-full min-w-0 rounded-md border border-input bg-muted px-3 py-1 text-base shadow-xs ring-offset-background transition-[color,box-shadow] outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50 md:text-sm dark:bg-input/80"
					>
						<option value="light">Light</option>
						<option value="dark">Dark</option>
						<option value="system">System</option>
					</select>
					<p class="text-sm text-muted-foreground">
						Choose your preferred color theme. System will match your operating system's theme.
					</p>
				</div>

				<div class="flex justify-end">
					<Button type="submit">
						<Save class="mr-2 h-4 w-4" />
						Save Theme
					</Button>
				</div>
			</div>
		</form>
	</Card.Content>
</Card.Root>
