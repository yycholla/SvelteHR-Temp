<script lang="ts">
	import { DollarSign } from '@lucide/svelte';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import * as Card from '$lib/components/ui/card';

	interface Props {
		compensationId: string;
		salaryAmount: number;
		salaryCurrency: string;
		payFrequency: string;
		payType: string;
		hourlyRate: number;
		effectiveDate: string;
		bankName: string;
		bankAccountType: string;
		bankAccountNumberLast4: string;
		bankRoutingNumber: string;
		paymentMethod: string;
		taxIdLast4: string;
	}

	let {
		compensationId,
		salaryAmount = $bindable(),
		salaryCurrency = $bindable(),
		payFrequency = $bindable(),
		payType = $bindable(),
		hourlyRate = $bindable(),
		effectiveDate = $bindable(),
		bankName = $bindable(),
		bankAccountType = $bindable(),
		bankAccountNumberLast4 = $bindable(),
		bankRoutingNumber = $bindable(),
		paymentMethod = $bindable(),
		taxIdLast4 = $bindable()
	}: Props = $props();
</script>

<Card.Root>
	<Card.Header class="pb-3">
		<div class="flex items-center gap-2">
			<DollarSign class="h-4 w-4" />
			<Card.Title class="text-base">Compensation</Card.Title>
		</div>
		<Card.Description class="text-xs">Sensitive information - Admin only</Card.Description>
	</Card.Header>
	<Card.Content class="space-y-3">
		<input type="hidden" name="compensationId" value={compensationId || ''} />

		<div class="grid gap-3 sm:grid-cols-3">
			<div class="space-y-1.5">
				<Label for="salaryAmount" class="text-sm">Salary Amount</Label>
				<Input
					id="salaryAmount"
					name="salaryAmount"
					type="number"
					step="0.01"
					bind:value={salaryAmount}
					placeholder="75000.00"
					class="h-9"
				/>
			</div>

			<div class="space-y-1.5">
				<Label for="payType" class="text-sm">Pay Type</Label>
				<select
					id="payType"
					name="payType"
					bind:value={payType}
					class="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
				>
					<option value="salary">Salary</option>
					<option value="hourly">Hourly</option>
				</select>
			</div>

			<div class="space-y-1.5">
				<Label for="payFrequency" class="text-sm">Pay Frequency</Label>
				<select
					id="payFrequency"
					name="payFrequency"
					bind:value={payFrequency}
					class="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
				>
					<option value="weekly">Weekly</option>
					<option value="biweekly">Bi-weekly</option>
					<option value="monthly">Monthly</option>
				</select>
			</div>
		</div>

		<div class="grid gap-3 sm:grid-cols-2">
			<div class="space-y-1.5">
				<Label for="bankName" class="text-sm">Bank Name</Label>
				<Input
					id="bankName"
					name="bankName"
					type="text"
					bind:value={bankName}
					placeholder="Chase Bank"
					class="h-9"
				/>
			</div>

			<div class="space-y-1.5">
				<Label for="bankAccountType" class="text-sm">Account Type</Label>
				<select
					id="bankAccountType"
					name="bankAccountType"
					bind:value={bankAccountType}
					class="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
				>
					<option value="checking">Checking</option>
					<option value="savings">Savings</option>
				</select>
			</div>
		</div>

		<div class="grid gap-3 sm:grid-cols-2">
			<div class="space-y-1.5">
				<Label for="bankRoutingNumber" class="text-sm">Routing Number</Label>
				<Input
					id="bankRoutingNumber"
					name="bankRoutingNumber"
					type="text"
					bind:value={bankRoutingNumber}
					placeholder="123456789"
					maxlength={9}
					class="h-9"
				/>
			</div>

			<div class="space-y-1.5">
				<Label for="bankAccountNumberLast4" class="text-sm">Account Last 4</Label>
				<Input
					id="bankAccountNumberLast4"
					name="bankAccountNumberLast4"
					type="text"
					bind:value={bankAccountNumberLast4}
					placeholder="1234"
					maxlength={4}
					class="h-9"
				/>
			</div>
		</div>
	</Card.Content>
</Card.Root>
