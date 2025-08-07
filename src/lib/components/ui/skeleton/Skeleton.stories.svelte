<script context="module">
  import { defineMeta } from '@storybook/addon-svelte-csf';

  const { Story } = defineMeta({
    title: 'UI/Skeleton',
    component: Skeleton,
    parameters: {
      layout: 'centered',
    },
    tags: ['autodocs'],
    argTypes: {
      variant: {
        control: { type: 'select' },
        options: ['default', 'text', 'avatar', 'button', 'card'],
      },
    },
    args: {
      variant: 'default',
    },
  });
</script>

<script>
  import Skeleton from './skeleton.svelte';
  import Card from '../card/card.svelte';
  import CardHeader from '../card/card-header.svelte';
  import CardContent from '../card/card-content.svelte';
  import CardFooter from '../card/card-footer.svelte';
</script>

<Story name="Default">
  <Skeleton class="h-4 w-64" />
</Story>

<Story name="Variants">
  <div class="space-y-4">
    <div class="space-y-2">
      <p class="text-sm font-medium">Text Skeleton</p>
      <Skeleton variant="text" />
    </div>
    
    <div class="space-y-2">
      <p class="text-sm font-medium">Avatar Skeleton</p>
      <Skeleton variant="avatar" />
    </div>
    
    <div class="space-y-2">
      <p class="text-sm font-medium">Button Skeleton</p>
      <Skeleton variant="button" />
    </div>
    
    <div class="space-y-2">
      <p class="text-sm font-medium">Card Skeleton</p>
      <Skeleton variant="card" class="w-80" />
    </div>
  </div>
</Story>

<Story name="Text Skeletons">
  <div class="space-y-3 max-w-md">
    <Skeleton class="h-4 w-full" />
    <Skeleton class="h-4 w-4/5" />
    <Skeleton class="h-4 w-3/4" />
    <Skeleton class="h-4 w-1/2" />
  </div>
</Story>

<Story name="Profile Card Loading">
  <Card class="w-80">
    <CardHeader class="flex flex-row items-center space-y-0 space-x-4">
      <Skeleton variant="avatar" />
      <div class="flex-1 space-y-2">
        <Skeleton class="h-4 w-32" />
        <Skeleton class="h-3 w-24" />
      </div>
    </CardHeader>
    <CardContent class="space-y-2">
      <Skeleton class="h-3 w-full" />
      <Skeleton class="h-3 w-5/6" />
      <Skeleton class="h-3 w-4/6" />
    </CardContent>
    <CardFooter class="space-x-2">
      <Skeleton variant="button" />
      <Skeleton variant="button" />
    </CardFooter>
  </Card>
</Story>

<Story name="Article Loading">
  <div class="max-w-2xl space-y-4">
    <!-- Header -->
    <div class="space-y-2">
      <Skeleton class="h-6 w-3/4" />
      <div class="flex items-center space-x-2">
        <Skeleton class="h-3 w-16" />
        <Skeleton class="h-3 w-20" />
        <Skeleton class="h-3 w-12" />
      </div>
    </div>
    
    <!-- Featured Image -->
    <Skeleton class="h-48 w-full rounded-lg" />
    
    <!-- Content -->
    <div class="space-y-2">
      <Skeleton class="h-4 w-full" />
      <Skeleton class="h-4 w-full" />
      <Skeleton class="h-4 w-4/5" />
      <Skeleton class="h-4 w-full" />
      <Skeleton class="h-4 w-3/4" />
    </div>
    
    <!-- Tags -->
    <div class="flex space-x-2">
      <Skeleton class="h-6 w-16 rounded-full" />
      <Skeleton class="h-6 w-20 rounded-full" />
      <Skeleton class="h-6 w-14 rounded-full" />
    </div>
  </div>
</Story>

<Story name="Dashboard Grid Loading">
  <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 max-w-4xl">
    {#each Array(6) as _, i}
      <Card>
        <CardHeader>
          <div class="flex items-center space-x-2">
            <Skeleton class="h-8 w-8 rounded-full" />
            <div class="space-y-1">
              <Skeleton class="h-4 w-20" />
              <Skeleton class="h-3 w-16" />
            </div>
          </div>
        </CardHeader>
        <CardContent class="space-y-2">
          <Skeleton class="h-8 w-16" />
          <Skeleton class="h-3 w-full" />
        </CardContent>
      </Card>
    {/each}
  </div>
</Story>

<Story name="List Loading">
  <div class="w-80 space-y-3">
    {#each Array(5) as _, i}
      <div class="flex items-center space-x-3 p-3 border rounded-lg">
        <Skeleton variant="avatar" class="h-10 w-10" />
        <div class="flex-1 space-y-2">
          <Skeleton class="h-4 w-32" />
          <Skeleton class="h-3 w-48" />
        </div>
        <Skeleton class="h-8 w-16" />
      </div>
    {/each}
  </div>
</Story>

<Story name="Form Loading">
  <div class="w-80 space-y-4">
    <div class="space-y-2">
      <Skeleton class="h-4 w-16" />
      <Skeleton class="h-10 w-full" />
    </div>
    
    <div class="space-y-2">
      <Skeleton class="h-4 w-20" />
      <Skeleton class="h-10 w-full" />
    </div>
    
    <div class="space-y-2">
      <Skeleton class="h-4 w-24" />
      <Skeleton class="h-20 w-full" />
    </div>
    
    <div class="flex space-x-2">
      <Skeleton variant="button" />
      <Skeleton variant="button" />
    </div>
  </div>
</Story>

<Story name="Table Loading">
  <div class="w-full max-w-3xl">
    <!-- Header -->
    <div class="grid grid-cols-4 gap-4 p-4 border-b">
      <Skeleton class="h-4 w-16" />
      <Skeleton class="h-4 w-20" />
      <Skeleton class="h-4 w-14" />
      <Skeleton class="h-4 w-18" />
    </div>
    
    <!-- Rows -->
    {#each Array(5) as _, i}
      <div class="grid grid-cols-4 gap-4 p-4 border-b">
        <div class="flex items-center space-x-2">
          <Skeleton class="h-6 w-6 rounded-full" />
          <Skeleton class="h-4 w-20" />
        </div>
        <Skeleton class="h-4 w-24" />
        <Skeleton class="h-6 w-16 rounded-full" />
        <Skeleton class="h-8 w-20" />
      </div>
    {/each}
  </div>
</Story>

<Story name="Custom Sizes">
  <div class="space-y-4">
    <div class="space-y-2">
      <p class="text-sm font-medium">Different Heights</p>
      <div class="space-y-2">
        <Skeleton class="h-2 w-64" />
        <Skeleton class="h-3 w-64" />
        <Skeleton class="h-4 w-64" />
        <Skeleton class="h-6 w-64" />
        <Skeleton class="h-8 w-64" />
      </div>
    </div>
    
    <div class="space-y-2">
      <p class="text-sm font-medium">Different Widths</p>
      <div class="space-y-2">
        <Skeleton class="h-4 w-16" />
        <Skeleton class="h-4 w-32" />
        <Skeleton class="h-4 w-48" />
        <Skeleton class="h-4 w-64" />
        <Skeleton class="h-4 w-80" />
      </div>
    </div>
  </div>
</Story>

<Story name="Playground" let:args>
  <Skeleton {...args} class="h-12 w-48" />
</Story>