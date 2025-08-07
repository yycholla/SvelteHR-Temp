<script context="module">
  import { defineMeta } from '@storybook/addon-svelte-csf';

  const { Story } = defineMeta({
    title: 'UI/Switch',
    component: Switch,
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
  import Switch from './switch.svelte';
  import Label from '../label/label.svelte';
  import Card from '../card/card.svelte';
  import CardHeader from '../card/card-header.svelte';
  import CardTitle from '../card/card-title.svelte';
  import CardContent from '../card/card-content.svelte';
  
  let notifications = $state(true);
  let emailNotifications = $state(false);
  let pushNotifications = $state(true);
  let darkMode = $state(false);
  let autoSave = $state(true);
  let publicProfile = $state(false);
</script>

<Story name="Default">
  <div class="flex items-center space-x-2">
    <Switch id="airplane-mode" />
    <Label for="airplane-mode">Airplane Mode</Label>
  </div>
</Story>

<Story name="Checked">
  <div class="flex items-center space-x-2">
    <Switch id="notifications" checked={true} />
    <Label for="notifications">Enable notifications</Label>
  </div>
</Story>

<Story name="Disabled">
  <div class="space-y-3">
    <div class="flex items-center space-x-2">
      <Switch id="disabled-off" disabled />
      <Label for="disabled-off">Disabled (off)</Label>
    </div>
    <div class="flex items-center space-x-2">
      <Switch id="disabled-on" checked disabled />
      <Label for="disabled-on">Disabled (on)</Label>
    </div>
  </div>
</Story>

<Story name="Sizes">
  <div class="space-y-4">
    <div class="flex items-center space-x-2">
      <Switch id="small" size="sm" />
      <Label for="small">Small</Label>
    </div>
    <div class="flex items-center space-x-2">
      <Switch id="default" size="default" />
      <Label for="default">Default</Label>
    </div>
    <div class="flex items-center space-x-2">
      <Switch id="large" size="lg" />
      <Label for="large">Large</Label>
    </div>
  </div>
</Story>

<Story name="Interactive">
  <div class="flex items-center space-x-2">
    <Switch id="interactive" bind:checked={notifications} />
    <Label for="interactive">
      Notifications are {notifications ? 'enabled' : 'disabled'}
    </Label>
  </div>
</Story>

<Story name="Settings Form">
  <Card class="w-80">
    <CardHeader>
      <CardTitle>Settings</CardTitle>
    </CardHeader>
    <CardContent class="space-y-4">
      <div class="flex items-center justify-between">
        <Label for="email-notifications" class="flex flex-col space-y-1">
          <span>Email Notifications</span>
          <span class="font-normal text-sm text-muted-foreground">
            Receive notifications via email
          </span>
        </Label>
        <Switch id="email-notifications" bind:checked={emailNotifications} />
      </div>
      
      <div class="flex items-center justify-between">
        <Label for="push-notifications" class="flex flex-col space-y-1">
          <span>Push Notifications</span>
          <span class="font-normal text-sm text-muted-foreground">
            Receive push notifications on your device
          </span>
        </Label>
        <Switch id="push-notifications" bind:checked={pushNotifications} />
      </div>
      
      <div class="flex items-center justify-between">
        <Label for="dark-mode" class="flex flex-col space-y-1">
          <span>Dark Mode</span>
          <span class="font-normal text-sm text-muted-foreground">
            Enable dark theme
          </span>
        </Label>
        <Switch id="dark-mode" bind:checked={darkMode} />
      </div>
      
      <div class="flex items-center justify-between">
        <Label for="auto-save" class="flex flex-col space-y-1">
          <span>Auto Save</span>
          <span class="font-normal text-sm text-muted-foreground">
            Automatically save your work
          </span>
        </Label>
        <Switch id="auto-save" bind:checked={autoSave} />
      </div>
      
      <div class="flex items-center justify-between">
        <Label for="public-profile" class="flex flex-col space-y-1">
          <span>Public Profile</span>
          <span class="font-normal text-sm text-muted-foreground">
            Make your profile visible to others
          </span>
        </Label>
        <Switch id="public-profile" bind:checked={publicProfile} />
      </div>
      
      {#if emailNotifications || pushNotifications || darkMode || autoSave || publicProfile}
        <div class="p-3 bg-muted rounded text-sm">
          <p class="font-medium mb-1">Current Settings:</p>
          <ul class="text-xs space-y-1">
            <li>Email: {emailNotifications ? '✓' : '✗'}</li>
            <li>Push: {pushNotifications ? '✓' : '✗'}</li>
            <li>Dark Mode: {darkMode ? '✓' : '✗'}</li>
            <li>Auto Save: {autoSave ? '✓' : '✗'}</li>
            <li>Public: {publicProfile ? '✓' : '✗'}</li>
          </ul>
        </div>
      {/if}
    </CardContent>
  </Card>
</Story>

<Story name="With Descriptions">
  <div class="max-w-md space-y-6">
    <div class="space-y-3">
      <div class="flex items-start space-x-3">
        <Switch id="marketing-emails" class="mt-1" />
        <div class="space-y-1">
          <Label for="marketing-emails">Marketing emails</Label>
          <p class="text-sm text-muted-foreground">
            Receive emails about new products, features, and more.
          </p>
        </div>
      </div>
      
      <div class="flex items-start space-x-3">
        <Switch id="security-emails" checked class="mt-1" />
        <div class="space-y-1">
          <Label for="security-emails">Security emails</Label>
          <p class="text-sm text-muted-foreground">
            Receive emails about your account security.
          </p>
        </div>
      </div>
    </div>
  </div>
</Story>

<Story name="Toggle States">
  <div class="space-y-4 max-w-sm">
    <div class="flex items-center justify-between p-3 border rounded-lg">
      <div>
        <div class="font-medium">WiFi</div>
        <div class="text-sm text-muted-foreground">Connected to Home Network</div>
      </div>
      <Switch checked />
    </div>
    
    <div class="flex items-center justify-between p-3 border rounded-lg">
      <div>
        <div class="font-medium">Bluetooth</div>
        <div class="text-sm text-muted-foreground">Not connected</div>
      </div>
      <Switch />
    </div>
    
    <div class="flex items-center justify-between p-3 border rounded-lg opacity-50">
      <div>
        <div class="font-medium">Location Services</div>
        <div class="text-sm text-muted-foreground">Requires permission</div>
      </div>
      <Switch disabled />
    </div>
  </div>
</Story>

<Story name="Compact Layout">
  <div class="space-y-2 max-w-xs">
    <div class="flex items-center justify-between">
      <Label for="compact-1" class="text-sm">Show line numbers</Label>
      <Switch id="compact-1" size="sm" />
    </div>
    
    <div class="flex items-center justify-between">
      <Label for="compact-2" class="text-sm">Word wrap</Label>
      <Switch id="compact-2" size="sm" checked />
    </div>
    
    <div class="flex items-center justify-between">
      <Label for="compact-3" class="text-sm">Auto-indent</Label>
      <Switch id="compact-3" size="sm" checked />
    </div>
    
    <div class="flex items-center justify-between">
      <Label for="compact-4" class="text-sm">Vim mode</Label>
      <Switch id="compact-4" size="sm" />
    </div>
  </div>
</Story>

<Story name="Playground" let:args>
  <div class="flex items-center space-x-2">
    <Switch {...args} id="playground" />
    <Label for="playground">Switch label</Label>
  </div>
</Story>