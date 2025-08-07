<script context="module">
  import { defineMeta } from '@storybook/addon-svelte-csf';

  const { Story } = defineMeta({
    title: 'UI/Badge',
    component: Badge,
    parameters: {
      layout: 'centered',
    },
    tags: ['autodocs'],
    argTypes: {
      variant: {
        control: { type: 'select' },
        options: ['default', 'secondary', 'destructive', 'outline', 'success', 'warning', 'info'],
      },
    },
    args: {
      variant: 'default',
    },
  });
</script>

<script>
  import Badge from './badge.svelte';
</script>

<Story name="Default">
  <Badge variant="default">Default</Badge>
</Story>

<Story name="Secondary">
  <Badge variant="secondary">Secondary</Badge>
</Story>

<Story name="Destructive">
  <Badge variant="destructive">Destructive</Badge>
</Story>

<Story name="Outline">
  <Badge variant="outline">Outline</Badge>
</Story>

<Story name="Success">
  <Badge variant="success">Success</Badge>
</Story>

<Story name="Warning">
  <Badge variant="warning">Warning</Badge>
</Story>

<Story name="Info">
  <Badge variant="info">Info</Badge>
</Story>

<Story name="All Variants" let:args>
  <div class="flex flex-wrap gap-2">
    <Badge variant="default">Default</Badge>
    <Badge variant="secondary">Secondary</Badge>
    <Badge variant="destructive">Destructive</Badge>
    <Badge variant="outline">Outline</Badge>
    <Badge variant="success">Success</Badge>
    <Badge variant="warning">Warning</Badge>
    <Badge variant="info">Info</Badge>
  </div>
</Story>