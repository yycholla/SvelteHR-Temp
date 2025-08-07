<script context="module">
  import { defineMeta } from '@storybook/addon-svelte-csf';

  const { Story } = defineMeta({
    title: 'UI/Button',
    component: Button,
    parameters: {
      layout: 'centered',
    },
    tags: ['autodocs'],
    argTypes: {
      variant: {
        control: { type: 'select' },
        options: ['default', 'destructive', 'outline', 'secondary', 'ghost', 'link', 'success', 'warning', 'info'],
      },
      size: {
        control: { type: 'select' },
        options: ['xs', 'sm', 'md', 'lg', 'xl', 'icon'],
      },
      loading: {
        control: { type: 'boolean' },
      },
      disabled: {
        control: { type: 'boolean' },
      },
      fullWidth: {
        control: { type: 'boolean' },
      },
    },
    args: {
      variant: 'default',
      size: 'md',
      loading: false,
      disabled: false,
      fullWidth: false,
    },
  });
</script>

<script>
  import Button from './button.svelte';
  import { Mail, Download, ArrowRight, Loader2 } from 'lucide-svelte';
</script>

<Story name="Default">
  <Button>Button</Button>
</Story>

<Story name="Variants">
  <div class="flex flex-wrap gap-2">
    <Button variant="default">Default</Button>
    <Button variant="destructive">Destructive</Button>
    <Button variant="outline">Outline</Button>
    <Button variant="secondary">Secondary</Button>
    <Button variant="ghost">Ghost</Button>
    <Button variant="link">Link</Button>
    <Button variant="success">Success</Button>
    <Button variant="warning">Warning</Button>
    <Button variant="info">Info</Button>
  </div>
</Story>

<Story name="Sizes">
  <div class="flex flex-wrap items-end gap-2">
    <Button size="xs">Extra Small</Button>
    <Button size="sm">Small</Button>
    <Button size="md">Medium</Button>
    <Button size="lg">Large</Button>
    <Button size="xl">Extra Large</Button>
  </div>
</Story>

<Story name="With Icons">
  <div class="flex flex-wrap gap-2">
    <Button icon={{ component: Mail, position: "left" }}>Email</Button>
    <Button icon={{ component: ArrowRight, position: "right" }}>Continue</Button>
    <Button size="icon" icon={{ component: Download, position: "only" }}></Button>
  </div>
</Story>

<Story name="Loading States">
  <div class="flex flex-wrap gap-2">
    <Button loading>Loading</Button>
    <Button loading loadingText="Saving...">Save</Button>
    <Button variant="outline" loading>Loading</Button>
  </div>
</Story>

<Story name="Disabled">
  <div class="flex flex-wrap gap-2">
    <Button disabled>Disabled</Button>
    <Button variant="outline" disabled>Disabled Outline</Button>
    <Button variant="destructive" disabled>Disabled Destructive</Button>
  </div>
</Story>

<Story name="Full Width">
  <div class="w-80">
    <Button fullWidth>Full Width Button</Button>
  </div>
</Story>

<Story name="As Link">
  <div class="flex flex-wrap gap-2">
    <Button href="https://example.com" external>External Link</Button>
    <Button href="/internal-link" variant="outline">Internal Link</Button>
    <Button href="https://example.com" variant="link" external>Link Style</Button>
  </div>
</Story>

<Story name="Interactive Examples">
  <div class="flex flex-wrap gap-2">
    <Button onclick={() => alert('Button clicked!')}>Click Me</Button>
    <Button variant="destructive" onclick={() => confirm('Are you sure?')}>Delete Item</Button>
    <Button 
      variant="success" 
      icon={{ component: Download, position: "left" }}
      onclick={() => alert('Download started!')}
    >
      Download File
    </Button>
  </div>
</Story>

<Story name="Form Buttons">
  <div class="flex gap-2">
    <Button type="submit" variant="default">Submit</Button>
    <Button type="reset" variant="outline">Reset</Button>
    <Button type="button" variant="ghost">Cancel</Button>
  </div>
</Story>

<Story name="Playground" let:args>
  <Button {...args}>Button Text</Button>
</Story>