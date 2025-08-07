<script context="module">
  import { defineMeta } from '@storybook/addon-svelte-csf';

  const { Story } = defineMeta({
    title: 'UI/Checkbox',
    component: Checkbox,
    parameters: {
      layout: 'centered',
    },
    tags: ['autodocs'],
    argTypes: {
      size: {
        control: { type: 'select' },
        options: ['sm', 'default', 'lg'],
      },
      checked: {
        control: { type: 'boolean' },
      },
      disabled: {
        control: { type: 'boolean' },
      },
    },
    args: {
      size: 'default',
      checked: false,
      disabled: false,
    },
  });
</script>

<script>
  import Checkbox from './checkbox.svelte';
  import Label from '../label/label.svelte';
  
  let checked = $state(false);
  let indeterminate = $state("indeterminate");
  let checkedItems = $state([false, true, false]);
</script>

<Story name="Default">
  <div class="flex items-center space-x-2">
    <Checkbox id="terms" />
    <Label for="terms">Accept terms and conditions</Label>
  </div>
</Story>

<Story name="Checked">
  <div class="flex items-center space-x-2">
    <Checkbox id="checked" checked={true} />
    <Label for="checked">Checked checkbox</Label>
  </div>
</Story>

<Story name="Disabled">
  <div class="space-y-3">
    <div class="flex items-center space-x-2">
      <Checkbox id="disabled" disabled />
      <Label for="disabled">Disabled unchecked</Label>
    </div>
    <div class="flex items-center space-x-2">
      <Checkbox id="disabled-checked" checked={true} disabled />
      <Label for="disabled-checked">Disabled checked</Label>
    </div>
  </div>
</Story>

<Story name="Sizes">
  <div class="flex items-end space-x-4">
    <div class="flex items-center space-x-2">
      <Checkbox id="small" size="sm" />
      <Label for="small">Small</Label>
    </div>
    <div class="flex items-center space-x-2">
      <Checkbox id="default" size="default" />
      <Label for="default">Default</Label>
    </div>
    <div class="flex items-center space-x-2">
      <Checkbox id="large" size="lg" />
      <Label for="large">Large</Label>
    </div>
  </div>
</Story>

<Story name="Interactive">
  <div class="flex items-center space-x-2">
    <Checkbox id="interactive" bind:checked />
    <Label for="interactive">
      {checked ? 'Checked' : 'Unchecked'} - Click to toggle
    </Label>
  </div>
</Story>

<Story name="Form Example">
  <div class="space-y-4 max-w-xs">
    <div class="space-y-3">
      <div class="flex items-center space-x-2">
        <Checkbox id="emails" bind:checked={checkedItems[0]} />
        <Label for="emails">Email notifications</Label>
      </div>
      <div class="flex items-center space-x-2">
        <Checkbox id="sms" bind:checked={checkedItems[1]} />
        <Label for="sms">SMS notifications</Label>
      </div>
      <div class="flex items-center space-x-2">
        <Checkbox id="push" bind:checked={checkedItems[2]} />
        <Label for="push">Push notifications</Label>
      </div>
    </div>
    <div class="text-sm text-muted-foreground">
      Selected: {checkedItems.filter(Boolean).length} of {checkedItems.length}
    </div>
  </div>
</Story>

<Story name="With Description">
  <div class="space-y-3 max-w-sm">
    <div class="flex items-start space-x-2">
      <Checkbox id="marketing" class="mt-1" />
      <div>
        <Label for="marketing">Marketing emails</Label>
        <p class="text-sm text-muted-foreground">
          Receive emails about new products, features, and more.
        </p>
      </div>
    </div>
  </div>
</Story>

<Story name="Playground" let:args>
  <div class="flex items-center space-x-2">
    <Checkbox {...args} id="playground" />
    <Label for="playground">Checkbox label</Label>
  </div>
</Story>