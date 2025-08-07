<script context="module">
  import { defineMeta } from '@storybook/addon-svelte-csf';

  const { Story } = defineMeta({
    title: 'UI/Calendar',
    component: Calendar,
    parameters: {
      layout: 'centered',
    },
    tags: ['autodocs'],
    args: {},
  });
</script>

<script>
  import Calendar from './Calendar.svelte';
  import { Calendar as CalendarPrimitive } from 'bits-ui';
  import { getLocalTimeZone, today, isWeekend } from '@internationalized/date';
  
  let selectedDate = $state(today(getLocalTimeZone()));
  let rangeStart = $state(null);
  let rangeEnd = $state(null);
  
  const isDateUnavailable = (date) => {
    return date.day === 15 || date.day === 22 || date.day === 29;
  };
  
  const isWeekendDate = (date) => {
    return isWeekend(date, 'en-US');
  };
</script>

<Story name="Default">
  <Calendar />
</Story>

<Story name="With Selection">
  <div class="space-y-4">
    <CalendarPrimitive.Root
      class="inline-block border rounded-lg p-4"
      type="single"
      bind:value={selectedDate}
    >
      {#snippet children({ months, weekdays })}
        <CalendarPrimitive.Header class="flex items-center justify-between mb-4">
          <CalendarPrimitive.PrevButton class="p-2 hover:bg-muted rounded">
            <span>←</span>
          </CalendarPrimitive.PrevButton>
          <CalendarPrimitive.Heading class="font-semibold" />
          <CalendarPrimitive.NextButton class="p-2 hover:bg-muted rounded">
            <span>→</span>
          </CalendarPrimitive.NextButton>
        </CalendarPrimitive.Header>

        {#each months as month}
          <CalendarPrimitive.Grid class="border-collapse">
            <CalendarPrimitive.GridHead>
              <CalendarPrimitive.GridRow class="flex">
                {#each weekdays as day}
                  <CalendarPrimitive.HeadCell class="w-10 h-10 text-center text-sm font-medium text-muted-foreground">
                    {day}
                  </CalendarPrimitive.HeadCell>
                {/each}
              </CalendarPrimitive.GridRow>
            </CalendarPrimitive.GridHead>
            <CalendarPrimitive.GridBody>
              {#each month.weeks as weekDates}
                <CalendarPrimitive.GridRow class="flex">
                  {#each weekDates as date}
                    <CalendarPrimitive.Cell {date} month={month.value} class="w-10 h-10">
                      <CalendarPrimitive.Day class="w-full h-full flex items-center justify-center text-sm rounded hover:bg-accent hover:text-accent-foreground data-[selected]:bg-primary data-[selected]:text-primary-foreground data-[outside-month]:text-muted-foreground/50 data-[disabled]:opacity-50" />
                    </CalendarPrimitive.Cell>
                  {/each}
                </CalendarPrimitive.GridRow>
              {/each}
            </CalendarPrimitive.GridBody>
          </CalendarPrimitive.Grid>
        {/each}
      {/snippet}
    </CalendarPrimitive.Root>
    
    <p class="text-sm text-muted-foreground">
      Selected: {selectedDate ? selectedDate.toString() : 'None'}
    </p>
  </div>
</Story>

<Story name="With Unavailable Dates">
  <div class="space-y-4">
    <CalendarPrimitive.Root
      class="inline-block border rounded-lg p-4"
      type="single"
      {isDateUnavailable}
    >
      {#snippet children({ months, weekdays })}
        <CalendarPrimitive.Header class="flex items-center justify-between mb-4">
          <CalendarPrimitive.PrevButton class="p-2 hover:bg-muted rounded">
            <span>←</span>
          </CalendarPrimitive.PrevButton>
          <CalendarPrimitive.Heading class="font-semibold" />
          <CalendarPrimitive.NextButton class="p-2 hover:bg-muted rounded">
            <span>→</span>
          </CalendarPrimitive.NextButton>
        </CalendarPrimitive.Header>

        {#each months as month}
          <CalendarPrimitive.Grid class="border-collapse">
            <CalendarPrimitive.GridHead>
              <CalendarPrimitive.GridRow class="flex">
                {#each weekdays as day}
                  <CalendarPrimitive.HeadCell class="w-10 h-10 text-center text-sm font-medium text-muted-foreground">
                    {day}
                  </CalendarPrimitive.HeadCell>
                {/each}
              </CalendarPrimitive.GridRow>
            </CalendarPrimitive.GridHead>
            <CalendarPrimitive.GridBody>
              {#each month.weeks as weekDates}
                <CalendarPrimitive.GridRow class="flex">
                  {#each weekDates as date}
                    <CalendarPrimitive.Cell {date} month={month.value} class="w-10 h-10">
                      <CalendarPrimitive.Day class="w-full h-full flex items-center justify-center text-sm rounded hover:bg-accent hover:text-accent-foreground data-[selected]:bg-primary data-[selected]:text-primary-foreground data-[outside-month]:text-muted-foreground/50 data-[disabled]:opacity-50 data-[unavailable]:opacity-25 data-[unavailable]:line-through" />
                    </CalendarPrimitive.Cell>
                  {/each}
                </CalendarPrimitive.GridRow>
              {/each}
            </CalendarPrimitive.GridBody>
          </CalendarPrimitive.Grid>
        {/each}
      {/snippet}
    </CalendarPrimitive.Root>
    
    <p class="text-sm text-muted-foreground">
      Dates 15, 22, and 29 are unavailable (crossed out)
    </p>
  </div>
</Story>

<Story name="Range Selection">
  <div class="space-y-4">
    <CalendarPrimitive.Root
      class="inline-block border rounded-lg p-4"
      type="range"
      bind:startValue={rangeStart}
      bind:endValue={rangeEnd}
    >
      {#snippet children({ months, weekdays })}
        <CalendarPrimitive.Header class="flex items-center justify-between mb-4">
          <CalendarPrimitive.PrevButton class="p-2 hover:bg-muted rounded">
            <span>←</span>
          </CalendarPrimitive.PrevButton>
          <CalendarPrimitive.Heading class="font-semibold" />
          <CalendarPrimitive.NextButton class="p-2 hover:bg-muted rounded">
            <span>→</span>
          </CalendarPrimitive.NextButton>
        </CalendarPrimitive.Header>

        {#each months as month}
          <CalendarPrimitive.Grid class="border-collapse">
            <CalendarPrimitive.GridHead>
              <CalendarPrimitive.GridRow class="flex">
                {#each weekdays as day}
                  <CalendarPrimitive.HeadCell class="w-10 h-10 text-center text-sm font-medium text-muted-foreground">
                    {day}
                  </CalendarPrimitive.HeadCell>
                {/each}
              </CalendarPrimitive.GridRow>
            </CalendarPrimitive.GridHead>
            <CalendarPrimitive.GridBody>
              {#each month.weeks as weekDates}
                <CalendarPrimitive.GridRow class="flex">
                  {#each weekDates as date}
                    <CalendarPrimitive.Cell {date} month={month.value} class="w-10 h-10">
                      <CalendarPrimitive.Day class="w-full h-full flex items-center justify-center text-sm rounded hover:bg-accent hover:text-accent-foreground data-[selected]:bg-primary data-[selected]:text-primary-foreground data-[range-start]:bg-primary data-[range-start]:text-primary-foreground data-[range-end]:bg-primary data-[range-end]:text-primary-foreground data-[range-middle]:bg-accent data-[outside-month]:text-muted-foreground/50" />
                    </CalendarPrimitive.Cell>
                  {/each}
                </CalendarPrimitive.GridRow>
              {/each}
            </CalendarPrimitive.GridBody>
          </CalendarPrimitive.Grid>
        {/each}
      {/snippet}
    </CalendarPrimitive.Root>
    
    <div class="text-sm text-muted-foreground space-y-1">
      <p>Start: {rangeStart ? rangeStart.toString() : 'Not selected'}</p>
      <p>End: {rangeEnd ? rangeEnd.toString() : 'Not selected'}</p>
      <p class="text-xs">Click and drag to select a date range</p>
    </div>
  </div>
</Story>

<Story name="Multiple Months">
  <CalendarPrimitive.Root
    class="inline-block border rounded-lg p-4"
    type="single"
    numberOfMonths={2}
  >
    {#snippet children({ months, weekdays })}
      <CalendarPrimitive.Header class="flex items-center justify-between mb-4">
        <CalendarPrimitive.PrevButton class="p-2 hover:bg-muted rounded">
          <span>←</span>
        </CalendarPrimitive.PrevButton>
        <CalendarPrimitive.Heading class="font-semibold" />
        <CalendarPrimitive.NextButton class="p-2 hover:bg-muted rounded">
          <span>→</span>
        </CalendarPrimitive.NextButton>
      </CalendarPrimitive.Header>

      <div class="flex gap-8">
        {#each months as month}
          <CalendarPrimitive.Grid class="border-collapse">
            <CalendarPrimitive.GridHead>
              <CalendarPrimitive.GridRow class="flex">
                {#each weekdays as day}
                  <CalendarPrimitive.HeadCell class="w-10 h-10 text-center text-sm font-medium text-muted-foreground">
                    {day}
                  </CalendarPrimitive.HeadCell>
                {/each}
              </CalendarPrimitive.GridRow>
            </CalendarPrimitive.GridHead>
            <CalendarPrimitive.GridBody>
              {#each month.weeks as weekDates}
                <CalendarPrimitive.GridRow class="flex">
                  {#each weekDates as date}
                    <CalendarPrimitive.Cell {date} month={month.value} class="w-10 h-10">
                      <CalendarPrimitive.Day class="w-full h-full flex items-center justify-center text-sm rounded hover:bg-accent hover:text-accent-foreground data-[selected]:bg-primary data-[selected]:text-primary-foreground data-[outside-month]:text-muted-foreground/50" />
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
</Story>

<Story name="Compact Calendar">
  <CalendarPrimitive.Root
    class="inline-block border rounded-lg p-3"
    type="single"
  >
    {#snippet children({ months, weekdays })}
      <CalendarPrimitive.Header class="flex items-center justify-between mb-3">
        <CalendarPrimitive.PrevButton class="p-1 hover:bg-muted rounded text-sm">
          <span>‹</span>
        </CalendarPrimitive.PrevButton>
        <CalendarPrimitive.Heading class="font-medium text-sm" />
        <CalendarPrimitive.NextButton class="p-1 hover:bg-muted rounded text-sm">
          <span>›</span>
        </CalendarPrimitive.NextButton>
      </CalendarPrimitive.Header>

      {#each months as month}
        <CalendarPrimitive.Grid class="border-collapse">
          <CalendarPrimitive.GridHead>
            <CalendarPrimitive.GridRow class="flex">
              {#each weekdays as day}
                <CalendarPrimitive.HeadCell class="w-8 h-6 text-center text-xs font-medium text-muted-foreground">
                  {day.slice(0, 1)}
                </CalendarPrimitive.HeadCell>
              {/each}
            </CalendarPrimitive.GridRow>
          </CalendarPrimitive.GridHead>
          <CalendarPrimitive.GridBody>
            {#each month.weeks as weekDates}
              <CalendarPrimitive.GridRow class="flex">
                {#each weekDates as date}
                  <CalendarPrimitive.Cell {date} month={month.value} class="w-8 h-8">
                    <CalendarPrimitive.Day class="w-full h-full flex items-center justify-center text-xs rounded hover:bg-accent hover:text-accent-foreground data-[selected]:bg-primary data-[selected]:text-primary-foreground data-[outside-month]:text-muted-foreground/50" />
                  </CalendarPrimitive.Cell>
                {/each}
              </CalendarPrimitive.GridRow>
            {/each}
          </CalendarPrimitive.GridBody>
        </CalendarPrimitive.Grid>
      {/each}
    {/snippet}
  </CalendarPrimitive.Root>
</Story>

<Story name="Event Calendar">
  <div class="space-y-4">
    <CalendarPrimitive.Root
      class="inline-block border rounded-lg p-4"
      type="single"
    >
      {#snippet children({ months, weekdays })}
        <CalendarPrimitive.Header class="flex items-center justify-between mb-4">
          <CalendarPrimitive.PrevButton class="p-2 hover:bg-muted rounded">
            <span>←</span>
          </CalendarPrimitive.PrevButton>
          <CalendarPrimitive.Heading class="font-semibold" />
          <CalendarPrimitive.NextButton class="p-2 hover:bg-muted rounded">
            <span>→</span>
          </CalendarPrimitive.NextButton>
        </CalendarPrimitive.Header>

        {#each months as month}
          <CalendarPrimitive.Grid class="border-collapse">
            <CalendarPrimitive.GridHead>
              <CalendarPrimitive.GridRow class="flex">
                {#each weekdays as day}
                  <CalendarPrimitive.HeadCell class="w-12 h-10 text-center text-sm font-medium text-muted-foreground">
                    {day}
                  </CalendarPrimitive.HeadCell>
                {/each}
              </CalendarPrimitive.GridRow>
            </CalendarPrimitive.GridHead>
            <CalendarPrimitive.GridBody>
              {#each month.weeks as weekDates}
                <CalendarPrimitive.GridRow class="flex">
                  {#each weekDates as date}
                    <CalendarPrimitive.Cell {date} month={month.value} class="w-12 h-12 relative">
                      <CalendarPrimitive.Day class="w-full h-full flex flex-col items-center justify-center text-sm rounded hover:bg-accent hover:text-accent-foreground data-[selected]:bg-primary data-[selected]:text-primary-foreground data-[outside-month]:text-muted-foreground/50 relative">
                        {#if date.day === 5 || date.day === 12 || date.day === 18}
                          <div class="absolute bottom-1 left-1/2 transform -translate-x-1/2 w-1 h-1 bg-blue-500 rounded-full"></div>
                        {/if}
                        {#if date.day === 8 || date.day === 25}
                          <div class="absolute bottom-1 left-1/2 transform -translate-x-1/2 w-1 h-1 bg-red-500 rounded-full"></div>
                        {/if}
                      </CalendarPrimitive.Day>
                    </CalendarPrimitive.Cell>
                  {/each}
                </CalendarPrimitive.GridRow>
              {/each}
            </CalendarPrimitive.GridBody>
          </CalendarPrimitive.Grid>
        {/each}
      {/snippet}
    </CalendarPrimitive.Root>
    
    <div class="text-sm space-y-2">
      <h4 class="font-medium">Legend:</h4>
      <div class="flex items-center gap-2">
        <div class="w-2 h-2 bg-blue-500 rounded-full"></div>
        <span class="text-muted-foreground">Meetings</span>
      </div>
      <div class="flex items-center gap-2">
        <div class="w-2 h-2 bg-red-500 rounded-full"></div>
        <span class="text-muted-foreground">Deadlines</span>
      </div>
    </div>
  </div>
</Story>