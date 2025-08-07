<script context="module">
  import { defineMeta } from '@storybook/addon-svelte-csf';

  const { Story } = defineMeta({
    title: 'UI/Label',
    component: Label,
    parameters: {
      layout: 'centered',
    },
    tags: ['autodocs'],
    args: {},
  });
</script>

<script>
  import Label from './label.svelte';
  import Input from '../input/input.svelte';
  import Checkbox from '../checkbox/checkbox.svelte';
  import { required } from '@lucide/svelte';
</script>

<Story name="Default">
  <Label>Default Label</Label>
</Story>

<Story name="With Input">
  <div class="w-80 space-y-2">
    <Label for="username">Username</Label>
    <Input id="username" placeholder="Enter username" />
  </div>
</Story>

<Story name="With Checkbox">
  <div class="flex items-center space-x-2">
    <Checkbox id="terms" />
    <Label for="terms">I agree to the terms and conditions</Label>
  </div>
</Story>

<Story name="Required Field">
  <div class="w-80 space-y-2">
    <Label for="email">
      Email <span class="text-destructive">*</span>
    </Label>
    <Input id="email" type="email" placeholder="your@email.com" />
  </div>
</Story>

<Story name="With Description">
  <div class="w-80 space-y-2">
    <Label for="password">
      Password
      <span class="text-sm font-normal text-muted-foreground">(optional)</span>
    </Label>
    <Input id="password" type="password" placeholder="Your password" />
  </div>
</Story>

<Story name="Form Example">
  <form class="w-80 space-y-4">
    <div class="space-y-2">
      <Label for="first-name">
        First Name <span class="text-destructive">*</span>
      </Label>
      <Input id="first-name" placeholder="John" required />
    </div>
    
    <div class="space-y-2">
      <Label for="last-name">
        Last Name <span class="text-destructive">*</span>
      </Label>
      <Input id="last-name" placeholder="Doe" required />
    </div>
    
    <div class="space-y-2">
      <Label for="company">
        Company
        <span class="text-sm font-normal text-muted-foreground">(optional)</span>
      </Label>
      <Input id="company" placeholder="Acme Corp" />
    </div>
    
    <div class="flex items-center space-x-2">
      <Checkbox id="newsletter" />
      <Label for="newsletter">Subscribe to our newsletter</Label>
    </div>
    
    <div class="flex items-center space-x-2">
      <Checkbox id="marketing" />
      <Label for="marketing">
        I agree to receive marketing communications
        <span class="text-destructive">*</span>
      </Label>
    </div>
  </form>
</Story>

<Story name="Disabled State">
  <div class="w-80 space-y-4">
    <div class="space-y-2">
      <Label for="disabled-input">Disabled Input</Label>
      <Input id="disabled-input" disabled placeholder="Disabled input" />
    </div>
    
    <div class="flex items-center space-x-2">
      <Checkbox id="disabled-checkbox" disabled />
      <Label for="disabled-checkbox">Disabled checkbox option</Label>
    </div>
  </div>
</Story>

<Story name="Custom Styling">
  <div class="space-y-4">
    <Label class="text-lg font-bold">Large Bold Label</Label>
    <Label class="text-sm text-muted-foreground">Small Muted Label</Label>
    <Label class="text-destructive">Error Label</Label>
    <Label class="text-green-600 dark:text-green-400">Success Label</Label>
  </div>
</Story>