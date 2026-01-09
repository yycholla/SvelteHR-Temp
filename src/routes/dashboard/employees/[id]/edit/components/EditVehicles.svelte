<script lang="ts">
	import { Car, Plus, Trash2 } from '@lucide/svelte';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import * as Card from '$lib/components/ui/card';

	interface Vehicle {
		id?: string;
		make: string;
		model: string;
		year?: number;
		color?: string;
		licensePlate: string;
		isPrimary: boolean;
	}

	interface Props {
		vehicles: Vehicle[];
	}

	let { vehicles = $bindable() }: Props = $props();

	function addVehicle() {
		vehicles = [...vehicles, { make: '', model: '', licensePlate: '', isPrimary: false }];
	}

	function removeVehicle(index: number) {
		vehicles = vehicles.filter((_, i) => i !== index);
	}
</script>

<Card.Root>
	<Card.Header class="pb-3">
		<div class="flex items-center justify-between">
			<div class="flex items-center gap-2">
				<Car class="h-4 w-4" />
				<Card.Title class="text-base">Vehicles</Card.Title>
			</div>
			<Button type="button" variant="outline" size="sm" onclick={addVehicle}>
				<Plus class="mr-1 h-3 w-3" />
				Add Vehicle
			</Button>
		</div>
	</Card.Header>
	<Card.Content class="space-y-3">
		{#each vehicles as vehicle, index}
			<div class="rounded-lg border p-3 space-y-3">
				<div class="flex items-center justify-between">
					<span class="text-sm font-medium">Vehicle #{index + 1}</span>
					<Button type="button" variant="ghost" size="sm" onclick={() => removeVehicle(index)}>
						<Trash2 class="h-3 w-3 text-destructive" />
					</Button>
				</div>

				<input type="hidden" name="vehicles[{index}].id" value={vehicle.id || ''} />

				<div class="grid gap-3 sm:grid-cols-3">
					<div class="space-y-1.5">
						<Label for="vehicles[{index}].make" class="text-sm">Make</Label>
						<Input
							id="vehicles[{index}].make"
							name="vehicles[{index}].make"
							type="text"
							bind:value={vehicle.make}
							placeholder="Toyota"
							class="h-9"
						/>
					</div>

					<div class="space-y-1.5">
						<Label for="vehicles[{index}].model" class="text-sm">Model</Label>
						<Input
							id="vehicles[{index}].model"
							name="vehicles[{index}].model"
							type="text"
							bind:value={vehicle.model}
							placeholder="Camry"
							class="h-9"
						/>
					</div>

					<div class="space-y-1.5">
						<Label for="vehicles[{index}].year" class="text-sm">Year</Label>
						<Input
							id="vehicles[{index}].year"
							name="vehicles[{index}].year"
							type="number"
							bind:value={vehicle.year}
							placeholder="2024"
							min="1900"
							max="2099"
							class="h-9"
						/>
					</div>
				</div>

				<div class="grid gap-3 sm:grid-cols-2">
					<div class="space-y-1.5">
						<Label for="vehicles[{index}].color" class="text-sm">Color</Label>
						<Input
							id="vehicles[{index}].color"
							name="vehicles[{index}].color"
							type="text"
							bind:value={vehicle.color}
							placeholder="Silver"
							class="h-9"
						/>
					</div>

					<div class="space-y-1.5">
						<Label for="vehicles[{index}].licensePlate" class="text-sm">License Plate</Label>
						<Input
							id="vehicles[{index}].licensePlate"
							name="vehicles[{index}].licensePlate"
							type="text"
							bind:value={vehicle.licensePlate}
							placeholder="ABC-1234"
							class="h-9"
						/>
					</div>
				</div>
			</div>
		{/each}
	</Card.Content>
</Card.Root>
