<script lang="ts">
	import { Phone } from '@lucide/svelte';
	import { Input } from '$lib/components/ui/input';
	import * as Select from '$lib/components/ui/select';
	import * as Card from '$lib/components/ui/card';
	import { Label } from '$lib/components/ui/label';

	interface Props {
		emergencyContactName: string;
		emergencyContactPhone: string;
		emergencyContactRelationship: string;
		relationshipOptions: any[];
	}

	let {
		emergencyContactName = $bindable(),
		emergencyContactPhone = $bindable(),
		emergencyContactRelationship = $bindable(),
		relationshipOptions
	}: Props = $props();
</script>

<Card.Root>
	<Card.Header>
		<Card.Title class="flex items-center gap-2">
			<Phone class="h-5 w-5" />
			Emergency Contact
		</Card.Title>
		<Card.Description>Emergency contact person details</Card.Description>
	</Card.Header>
	<Card.Content class="space-y-4">
		<div class="grid grid-cols-1 gap-4 md:grid-cols-2">
			<div class="space-y-2">
				<Label for="emergencyContactName">Contact Name</Label>
				<Input
					id="emergencyContactName"
					bind:value={emergencyContactName}
					placeholder="Enter contact name"
				/>
			</div>

			<div class="space-y-2">
				<Label for="emergencyContactPhone">Contact Phone</Label>
				<Input
					id="emergencyContactPhone"
					type="tel"
					bind:value={emergencyContactPhone}
					placeholder="Enter contact phone"
				/>
			</div>

			<div class="space-y-2 md:col-span-2">
				<Label for="emergencyContactRelationship">Relationship</Label>
				<Select.Root
					type="single"
					value={emergencyContactRelationship}
					onValueChange={(v: string | undefined) => (emergencyContactRelationship = v || '')}
				>
					<Select.Trigger>
						<Select.Value placeholder="Select relationship" />
					</Select.Trigger>
					<Select.Content>
						{#each relationshipOptions as option}
							<Select.Item value={option.value}>{option.label}</Select.Item>
						{/each}
					</Select.Content>
				</Select.Root>
			</div>
		</div>
	</Card.Content>
</Card.Root>
