<script lang="ts">
	import { Plus, Shield, Trash2 } from '@lucide/svelte';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import * as Card from '$lib/components/ui/card';
	import { Checkbox } from '$lib/components/ui/checkbox';

	interface EmergencyContact {
		id?: string;
		fullName: string;
		relationship: string;
		phoneNumber: string;
		alternatePhone?: string;
		email?: string;
		isPrimary: boolean;
	}

	interface Props {
		emergencyContacts: EmergencyContact[];
	}

	let { emergencyContacts = $bindable() }: Props = $props();

	function addEmergencyContact() {
		emergencyContacts = [
			...emergencyContacts,
			{ fullName: '', relationship: '', phoneNumber: '', isPrimary: false }
		];
	}

	function removeEmergencyContact(index: number) {
		emergencyContacts = emergencyContacts.filter((_, i) => i !== index);
	}
</script>

<Card.Root>
	<Card.Header class="pb-3">
		<div class="flex items-center justify-between">
			<div class="flex items-center gap-2">
				<Shield class="h-4 w-4" />
				<Card.Title class="text-base">Emergency Contacts</Card.Title>
			</div>
			<Button type="button" variant="outline" size="sm" onclick={addEmergencyContact}>
				<Plus class="mr-1 h-3 w-3" />
				Add Contact
			</Button>
		</div>
	</Card.Header>
	<Card.Content class="space-y-3">
		{#each emergencyContacts as contact, index}
			<div class="rounded-lg border p-3 space-y-3">
				<div class="flex items-center justify-between">
					<span class="text-sm font-medium">Contact #{index + 1}</span>
					{#if emergencyContacts.length > 1}
						<Button
							type="button"
							variant="ghost"
							size="sm"
							onclick={() => removeEmergencyContact(index)}
						>
							<Trash2 class="h-3 w-3 text-destructive" />
						</Button>
					{/if}
				</div>

				<input type="hidden" name="emergencyContacts[{index}].id" value={contact.id || ''} />

				<div class="grid gap-3 sm:grid-cols-2">
					<div class="space-y-1.5">
						<Label for="emergencyContacts[{index}].fullName" class="text-sm">Full Name</Label>
						<Input
							id="emergencyContacts[{index}].fullName"
							name="emergencyContacts[{index}].fullName"
							type="text"
							bind:value={contact.fullName}
							placeholder="John Doe"
							class="h-9"
						/>
					</div>

					<div class="space-y-1.5">
						<Label for="emergencyContacts[{index}].relationship" class="text-sm">Relationship</Label
						>
						<Input
							id="emergencyContacts[{index}].relationship"
							name="emergencyContacts[{index}].relationship"
							type="text"
							bind:value={contact.relationship}
							placeholder="Spouse"
							class="h-9"
						/>
					</div>
				</div>

				<div class="grid gap-3 sm:grid-cols-2">
					<div class="space-y-1.5">
						<Label for="emergencyContacts[{index}].phoneNumber" class="text-sm">Phone Number</Label>
						<Input
							id="emergencyContacts[{index}].phoneNumber"
							name="emergencyContacts[{index}].phoneNumber"
							type="tel"
							bind:value={contact.phoneNumber}
							placeholder="(555) 123-4567"
							class="h-9"
						/>
					</div>

					<div class="space-y-1.5">
						<Label for="emergencyContacts[{index}].email" class="text-sm">Email</Label>
						<Input
							id="emergencyContacts[{index}].email"
							name="emergencyContacts[{index}].email"
							type="email"
							bind:value={contact.email}
							placeholder="john@example.com"
							class="h-9"
						/>
					</div>
				</div>

				<div class="flex items-center gap-2">
					<input
						type="hidden"
						name="emergencyContacts[{index}].isPrimary"
						value={contact.isPrimary ? 'true' : 'false'}
					/>
					<Checkbox id="emergencyContacts[{index}].isPrimary" bind:checked={contact.isPrimary} />
					<Label for="emergencyContacts[{index}].isPrimary" class="text-sm font-normal"
						>Primary Contact</Label
					>
				</div>
			</div>
		{/each}
	</Card.Content>
</Card.Root>
