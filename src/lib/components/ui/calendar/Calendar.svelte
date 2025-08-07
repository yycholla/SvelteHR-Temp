<script lang="ts">
	import { Calendar as CalendarPrimitive } from "bits-ui";
	import { ChevronLeft, ChevronRight } from "lucide-svelte";
	import { getLocalTimeZone, today } from "@internationalized/date";
	import { cn } from "$lib/utils";
	import type { DateValue } from "@internationalized/date";
	import type { ComponentProps } from "svelte";

	interface CalendarProps extends ComponentProps<CalendarPrimitive.Root> {
		value?: DateValue | DateValue[];
		placeholder?: DateValue;
		multiple?: boolean;
		range?: boolean;
		class?: string;
		weekdayFormat?: "narrow" | "short" | "long";
	}

	let {
		value = $bindable(),
		placeholder = $bindable(today(getLocalTimeZone())),
		multiple = false,
		range = false,
		class: className,
		weekdayFormat = "short",
		...restProps
	}: CalendarProps = $props();

	// Determine calendar type based on props
	let calendarType: "single" | "multiple" = $derived(multiple ? "multiple" : "single");
</script>

<CalendarPrimitive.Root
	bind:value
	bind:placeholder
	type={calendarType}
	{weekdayFormat}
	fixedWeeks={true}
	class={cn(
		"bg-background/20 backdrop-blur-md border-border/40 shadow-lg hover:shadow-xl transition-all duration-200 rounded-2xl border p-6",
		className
	)}
	{...restProps}
>
	{#snippet children({ months, weekdays })}
		<CalendarPrimitive.Header class="flex items-center justify-between mb-6">
			<CalendarPrimitive.PrevButton
				class="rounded-2xl bg-background/30 backdrop-blur-sm border-border/30 hover:bg-background/50 hover:scale-105 inline-flex size-12 items-center justify-center transition-all duration-200 border shadow-sm"
			>
				<ChevronLeft class="size-5 text-foreground" />
			</CalendarPrimitive.PrevButton>
			
			<CalendarPrimitive.Heading class="text-2xl font-bold bg-gradient-to-r from-foreground to-foreground/80 bg-clip-text text-transparent" />
			
			<CalendarPrimitive.NextButton
				class="rounded-2xl bg-background/30 backdrop-blur-sm border-border/30 hover:bg-background/50 hover:scale-105 inline-flex size-12 items-center justify-center transition-all duration-200 border shadow-sm"
			>
				<ChevronRight class="size-5 text-foreground" />
			</CalendarPrimitive.NextButton>
		</CalendarPrimitive.Header>

		<div class="flex flex-col space-y-6 sm:flex-row sm:space-x-6 sm:space-y-0">
			{#each months as month, i (i)}
				<CalendarPrimitive.Grid class="w-full border-collapse select-none table">
					<CalendarPrimitive.GridHead>
						<CalendarPrimitive.GridRow class="mb-4 grid grid-cols-7 w-full">
							{#each weekdays as day, i (i)}
								<CalendarPrimitive.HeadCell
									class="text-muted-foreground font-semibold rounded-xl text-sm uppercase tracking-wide flex items-center justify-center h-12"
								>
									<div class="p-3">{day}</div>
								</CalendarPrimitive.HeadCell>
							{/each}
						</CalendarPrimitive.GridRow>
					</CalendarPrimitive.GridHead>
					
					<CalendarPrimitive.GridBody>
						{#each month.weeks as weekDates, i (i)}
							<CalendarPrimitive.GridRow class="grid grid-cols-7 w-full">
								{#each weekDates as date, i (i)}
									<CalendarPrimitive.Cell
										{date}
										month={month.value}
										class="relative h-20 text-center text-sm p-0 flex items-center justify-center"
									>
										<CalendarPrimitive.Day
											class="rounded-full text-foreground hover:bg-primary/20 hover:scale-105 data-selected:bg-primary data-selected:text-primary-foreground data-selected:shadow-lg data-disabled:text-foreground/30 data-selected:scale-105 data-unavailable:text-muted-foreground data-disabled:pointer-events-none data-outside-month:text-muted-foreground/50 data-outside-month:hover:text-muted-foreground data-selected:font-semibold data-unavailable:line-through group relative inline-flex size-14 items-center justify-center whitespace-nowrap border border-transparent bg-transparent text-sm font-medium transition-all duration-200"
										>
											<!-- Today indicator dot -->
											<div
												class="bg-primary group-data-selected:bg-primary-foreground group-data-today:block absolute top-2 hidden size-1.5 rounded-full shadow-sm"
											></div>
											{date.day}
										</CalendarPrimitive.Day>
									</CalendarPrimitive.Cell>
								{/each}
							</CalendarPrimitive.GridRow>
						{/each}
					</CalendarPrimitive.GridBody>
				</CalendarPrimitive.Grid>
			{/each}
		</div>
	{/snippet}
</CalendarPrimitive.Root>