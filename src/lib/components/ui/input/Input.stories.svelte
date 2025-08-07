<script context="module">
  import { defineMeta } from '@storybook/addon-svelte-csf';

  const { Story } = defineMeta({
    title: 'UI/Input',
    component: Input,
    parameters: {
      layout: 'centered',
    },
    tags: ['autodocs'],
    argTypes: {
      type: {
        control: { type: 'select' },
        options: ['text', 'email', 'password', 'number', 'tel', 'url', 'search'],
      },
      variant: {
        control: { type: 'select' },
        options: ['default', 'error', 'success', 'warning'],
      },
      size: {
        control: { type: 'select' },
        options: ['xs', 'sm', 'md', 'lg', 'xl'],
      },
      disabled: {
        control: { type: 'boolean' },
      },
      readonly: {
        control: { type: 'boolean' },
      },
      clearable: {
        control: { type: 'boolean' },
      },
      showCount: {
        control: { type: 'boolean' },
      },
    },
    args: {
      type: 'text',
      variant: 'default',
      size: 'md',
      disabled: false,
      readonly: false,
      clearable: false,
      showCount: false,
    },
  });
</script>

<script>
  import Input from './input.svelte';
  import Label from '../label/label.svelte';
  
  let email = $state('');
  let password = $state('');
  let searchValue = $state('');
</script>

<Story name="Default">
  <div class="w-80">
    <Input placeholder="Enter your name" />
  </div>
</Story>

<Story name="With Label">
  <div class="w-80 space-y-2">
    <Label for="email-input">Email</Label>
    <Input id="email-input" type="email" placeholder="Enter your email" />
  </div>
</Story>

<Story name="Types">
  <div class="w-80 space-y-4">
    <div class="space-y-2">
      <Label for="text-input">Text</Label>
      <Input id="text-input" type="text" placeholder="Text input" />
    </div>
    <div class="space-y-2">
      <Label for="email-input">Email</Label>
      <Input id="email-input" type="email" placeholder="email@example.com" />
    </div>
    <div class="space-y-2">
      <Label for="password-input">Password</Label>
      <Input id="password-input" type="password" placeholder="Your password" />
    </div>
    <div class="space-y-2">
      <Label for="number-input">Number</Label>
      <Input id="number-input" type="number" placeholder="123" />
    </div>
    <div class="space-y-2">
      <Label for="tel-input">Phone</Label>
      <Input id="tel-input" type="tel" placeholder="+1 (555) 000-0000" />
    </div>
  </div>
</Story>

<Story name="Sizes">
  <div class="w-80 space-y-3">
    <Input size="xs" placeholder="Extra small input" />
    <Input size="sm" placeholder="Small input" />
    <Input size="md" placeholder="Medium input" />
    <Input size="lg" placeholder="Large input" />
    <Input size="xl" placeholder="Extra large input" />
  </div>
</Story>

<Story name="Variants">
  <div class="w-80 space-y-3">
    <Input variant="default" placeholder="Default variant" />
    <Input variant="error" placeholder="Error variant" error="This field is required" />
    <Input variant="success" placeholder="Success variant" success="Looks good!" />
    <Input variant="warning" placeholder="Warning variant" warning="Please double-check this" />
  </div>
</Story>

<Story name="With Messages">
  <div class="w-80 space-y-4">
    <Input placeholder="Default input" description="This is a helper description" />
    <Input placeholder="Error input" error="This field is required" />
    <Input placeholder="Success input" success="Validation passed" />
    <Input placeholder="Warning input" warning="Please review this field" />
  </div>
</Story>

<Story name="Disabled and Readonly">
  <div class="w-80 space-y-3">
    <Input disabled placeholder="Disabled input" />
    <Input readonly value="Read-only input" />
    <Input disabled value="Disabled with value" />
  </div>
</Story>

<Story name="Character Count">
  <div class="w-80 space-y-3">
    <Input placeholder="With character count" showCount maxlength={50} />
    <Input placeholder="Over limit styling" showCount maxlength={10} value="This text is too long" />
  </div>
</Story>

<Story name="Clearable">
  <div class="w-80 space-y-3">
    <Input clearable placeholder="Clearable input" />
    <Input clearable value="Text to clear" />
  </div>
</Story>

<Story name="With Prefix/Suffix">
  <div class="w-80 space-y-3">
    <Input prefix="$" placeholder="0.00" type="number" />
    <Input suffix="@company.com" placeholder="username" />
    <Input prefix="https://" suffix=".com" placeholder="example" />
  </div>
</Story>

<Story name="File Input">
  <div class="w-80 space-y-2">
    <Label for="file-input">Upload file</Label>
    <Input id="file-input" type="file" accept="image/*" />
  </div>
</Story>

<Story name="Form Example">
  <div class="w-80 space-y-4">
    <div class="space-y-2">
      <Label for="form-email">Email</Label>
      <Input 
        id="form-email" 
        type="email" 
        placeholder="your@email.com"
        bind:value={email}
        clearable
      />
    </div>
    <div class="space-y-2">
      <Label for="form-password">Password</Label>
      <Input 
        id="form-password" 
        type="password" 
        placeholder="Your password"
        bind:value={password}
        description="Must be at least 8 characters"
      />
    </div>
    <div class="space-y-2">
      <Label for="form-search">Search</Label>
      <Input 
        id="form-search" 
        type="search" 
        placeholder="Search..."
        bind:value={searchValue}
        clearable
      />
    </div>
    {#if email || password || searchValue}
      <div class="p-3 bg-muted rounded text-sm">
        <p>Form values:</p>
        <p>Email: {email || '(empty)'}</p>
        <p>Password: {password ? '•'.repeat(password.length) : '(empty)'}</p>
        <p>Search: {searchValue || '(empty)'}</p>
      </div>
    {/if}
  </div>
</Story>

<Story name="Playground" let:args>
  <div class="w-80">
    <Input {...args} placeholder="Playground input" />
  </div>
</Story>