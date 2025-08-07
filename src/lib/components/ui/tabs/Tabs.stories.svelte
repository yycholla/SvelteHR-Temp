<script context="module">
  import { defineMeta } from '@storybook/addon-svelte-csf';

  const { Story } = defineMeta({
    title: 'UI/Tabs',
    component: Tabs,
    parameters: {
      layout: 'centered',
    },
    tags: ['autodocs'],
    args: {},
  });
</script>

<script>
  import Tabs from './tabs.svelte';
  import TabsList from './tabs-list.svelte';
  import TabsTrigger from './tabs-trigger.svelte';
  import TabsContent from './tabs-content.svelte';
  import Card from '../card/card.svelte';
  import CardHeader from '../card/card-header.svelte';
  import CardTitle from '../card/card-title.svelte';
  import CardDescription from '../card/card-description.svelte';
  import CardContent from '../card/card-content.svelte';
  import CardFooter from '../card/card-footer.svelte';
  import Button from '../button/button.svelte';
  import Input from '../input/input.svelte';
  import Label from '../label/label.svelte';
  import Textarea from '../textarea/textarea.svelte';
  import { User, Settings, Bell, Shield } from 'lucide-svelte';

  let activeTab = $state('account');
</script>

<Story name="Default">
  <Tabs value="account" class="w-[400px]">
    <TabsList class="grid w-full grid-cols-2">
      <TabsTrigger value="account">Account</TabsTrigger>
      <TabsTrigger value="password">Password</TabsTrigger>
    </TabsList>
    <TabsContent value="account" class="space-y-2">
      <div class="space-y-1">
        <h3 class="text-sm font-medium">Account</h3>
        <p class="text-sm text-muted-foreground">
          Make changes to your account here. Click save when you're done.
        </p>
      </div>
    </TabsContent>
    <TabsContent value="password" class="space-y-2">
      <div class="space-y-1">
        <h3 class="text-sm font-medium">Password</h3>
        <p class="text-sm text-muted-foreground">
          Change your password here. After saving, you'll be logged out.
        </p>
      </div>
    </TabsContent>
  </Tabs>
</Story>

<Story name="Settings Form">
  <Tabs value="account" class="w-[500px]">
    <TabsList class="grid w-full grid-cols-3">
      <TabsTrigger value="account">Account</TabsTrigger>
      <TabsTrigger value="preferences">Preferences</TabsTrigger>
      <TabsTrigger value="security">Security</TabsTrigger>
    </TabsList>
    
    <TabsContent value="account">
      <Card>
        <CardHeader>
          <CardTitle>Account</CardTitle>
          <CardDescription>
            Make changes to your account here. Click save when you're done.
          </CardDescription>
        </CardHeader>
        <CardContent class="space-y-2">
          <div class="space-y-1">
            <Label for="name">Name</Label>
            <Input id="name" value="John Doe" />
          </div>
          <div class="space-y-1">
            <Label for="username">Username</Label>
            <Input id="username" value="@johndoe" />
          </div>
        </CardContent>
        <CardFooter>
          <Button>Save changes</Button>
        </CardFooter>
      </Card>
    </TabsContent>
    
    <TabsContent value="preferences">
      <Card>
        <CardHeader>
          <CardTitle>Preferences</CardTitle>
          <CardDescription>
            Configure your application preferences here.
          </CardDescription>
        </CardHeader>
        <CardContent class="space-y-4">
          <div class="flex items-center justify-between">
            <Label for="notifications">Email notifications</Label>
            <input type="checkbox" id="notifications" checked />
          </div>
          <div class="flex items-center justify-between">
            <Label for="marketing">Marketing emails</Label>
            <input type="checkbox" id="marketing" />
          </div>
          <div class="space-y-1">
            <Label for="language">Language</Label>
            <select id="language" class="w-full p-2 border rounded">
              <option>English</option>
              <option>Spanish</option>
              <option>French</option>
            </select>
          </div>
        </CardContent>
        <CardFooter>
          <Button>Save preferences</Button>
        </CardFooter>
      </Card>
    </TabsContent>
    
    <TabsContent value="security">
      <Card>
        <CardHeader>
          <CardTitle>Security</CardTitle>
          <CardDescription>
            Manage your account security settings.
          </CardDescription>
        </CardHeader>
        <CardContent class="space-y-2">
          <div class="space-y-1">
            <Label for="current">Current password</Label>
            <Input id="current" type="password" />
          </div>
          <div class="space-y-1">
            <Label for="new">New password</Label>
            <Input id="new" type="password" />
          </div>
          <div class="space-y-1">
            <Label for="confirm">Confirm password</Label>
            <Input id="confirm" type="password" />
          </div>
        </CardContent>
        <CardFooter>
          <Button>Update password</Button>
        </CardFooter>
      </Card>
    </TabsContent>
  </Tabs>
</Story>

<Story name="With Icons">
  <Tabs value="profile" class="w-[600px]">
    <TabsList class="grid w-full grid-cols-4">
      <TabsTrigger value="profile" class="flex items-center gap-2">
        <User class="h-4 w-4" />
        Profile
      </TabsTrigger>
      <TabsTrigger value="settings" class="flex items-center gap-2">
        <Settings class="h-4 w-4" />
        Settings
      </TabsTrigger>
      <TabsTrigger value="notifications" class="flex items-center gap-2">
        <Bell class="h-4 w-4" />
        Notifications
      </TabsTrigger>
      <TabsTrigger value="security" class="flex items-center gap-2">
        <Shield class="h-4 w-4" />
        Security
      </TabsTrigger>
    </TabsList>
    
    <TabsContent value="profile" class="mt-6">
      <div class="space-y-4">
        <h3 class="text-lg font-medium">Profile Information</h3>
        <div class="grid gap-4">
          <div class="grid grid-cols-2 gap-4">
            <div class="space-y-2">
              <Label>First name</Label>
              <Input value="John" />
            </div>
            <div class="space-y-2">
              <Label>Last name</Label>
              <Input value="Doe" />
            </div>
          </div>
          <div class="space-y-2">
            <Label>Bio</Label>
            <Textarea placeholder="Tell us about yourself" rows="3" />
          </div>
        </div>
      </div>
    </TabsContent>
    
    <TabsContent value="settings" class="mt-6">
      <div class="space-y-4">
        <h3 class="text-lg font-medium">Application Settings</h3>
        <div class="space-y-3">
          <div class="flex items-center justify-between">
            <div>
              <div class="font-medium">Dark mode</div>
              <div class="text-sm text-muted-foreground">Use dark theme</div>
            </div>
            <input type="checkbox" />
          </div>
          <div class="flex items-center justify-between">
            <div>
              <div class="font-medium">Auto-save</div>
              <div class="text-sm text-muted-foreground">Automatically save changes</div>
            </div>
            <input type="checkbox" checked />
          </div>
        </div>
      </div>
    </TabsContent>
    
    <TabsContent value="notifications" class="mt-6">
      <div class="space-y-4">
        <h3 class="text-lg font-medium">Notification Preferences</h3>
        <div class="space-y-3">
          <div class="flex items-center justify-between">
            <div>
              <div class="font-medium">Email notifications</div>
              <div class="text-sm text-muted-foreground">Receive updates via email</div>
            </div>
            <input type="checkbox" checked />
          </div>
          <div class="flex items-center justify-between">
            <div>
              <div class="font-medium">Push notifications</div>
              <div class="text-sm text-muted-foreground">Receive push notifications</div>
            </div>
            <input type="checkbox" />
          </div>
        </div>
      </div>
    </TabsContent>
    
    <TabsContent value="security" class="mt-6">
      <div class="space-y-4">
        <h3 class="text-lg font-medium">Security Settings</h3>
        <div class="space-y-3">
          <div class="flex items-center justify-between">
            <div>
              <div class="font-medium">Two-factor authentication</div>
              <div class="text-sm text-muted-foreground">Add an extra layer of security</div>
            </div>
            <Button variant="outline" size="sm">Enable</Button>
          </div>
          <div class="flex items-center justify-between">
            <div>
              <div class="font-medium">Login notifications</div>
              <div class="text-sm text-muted-foreground">Get notified of new sign-ins</div>
            </div>
            <input type="checkbox" checked />
          </div>
        </div>
      </div>
    </TabsContent>
  </Tabs>
</Story>

<Story name="Dashboard Tabs">
  <Tabs value="overview" class="w-[700px]">
    <TabsList>
      <TabsTrigger value="overview">Overview</TabsTrigger>
      <TabsTrigger value="analytics">Analytics</TabsTrigger>
      <TabsTrigger value="reports">Reports</TabsTrigger>
      <TabsTrigger value="notifications">Notifications</TabsTrigger>
    </TabsList>
    
    <TabsContent value="overview" class="mt-6">
      <div class="space-y-4">
        <h2 class="text-xl font-semibold">Dashboard Overview</h2>
        <div class="grid grid-cols-3 gap-4">
          <Card>
            <CardHeader class="pb-2">
              <CardTitle class="text-sm font-medium">Total Users</CardTitle>
            </CardHeader>
            <CardContent>
              <div class="text-2xl font-bold">2,543</div>
              <p class="text-xs text-muted-foreground">+20.1% from last month</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader class="pb-2">
              <CardTitle class="text-sm font-medium">Revenue</CardTitle>
            </CardHeader>
            <CardContent>
              <div class="text-2xl font-bold">$45,231</div>
              <p class="text-xs text-muted-foreground">+12.5% from last month</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader class="pb-2">
              <CardTitle class="text-sm font-medium">Active Now</CardTitle>
            </CardHeader>
            <CardContent>
              <div class="text-2xl font-bold">573</div>
              <p class="text-xs text-muted-foreground">+2.5% from last hour</p>
            </CardContent>
          </Card>
        </div>
      </div>
    </TabsContent>
    
    <TabsContent value="analytics" class="mt-6">
      <div class="space-y-4">
        <h2 class="text-xl font-semibold">Analytics</h2>
        <Card>
          <CardHeader>
            <CardTitle>Traffic Analytics</CardTitle>
            <CardDescription>Your website traffic overview</CardDescription>
          </CardHeader>
          <CardContent>
            <div class="h-32 bg-muted rounded flex items-center justify-center">
              <span class="text-muted-foreground">Chart placeholder</span>
            </div>
          </CardContent>
        </Card>
      </div>
    </TabsContent>
    
    <TabsContent value="reports" class="mt-6">
      <div class="space-y-4">
        <h2 class="text-xl font-semibold">Reports</h2>
        <div class="space-y-3">
          <div class="flex items-center justify-between p-3 border rounded">
            <div>
              <div class="font-medium">Monthly Report</div>
              <div class="text-sm text-muted-foreground">Generated on March 1, 2024</div>
            </div>
            <Button variant="outline" size="sm">Download</Button>
          </div>
          <div class="flex items-center justify-between p-3 border rounded">
            <div>
              <div class="font-medium">Quarterly Report</div>
              <div class="text-sm text-muted-foreground">Generated on March 1, 2024</div>
            </div>
            <Button variant="outline" size="sm">Download</Button>
          </div>
        </div>
      </div>
    </TabsContent>
    
    <TabsContent value="notifications" class="mt-6">
      <div class="space-y-4">
        <h2 class="text-xl font-semibold">Recent Notifications</h2>
        <div class="space-y-2">
          <div class="p-3 border rounded">
            <div class="font-medium">New user registered</div>
            <div class="text-sm text-muted-foreground">2 minutes ago</div>
          </div>
          <div class="p-3 border rounded">
            <div class="font-medium">Payment received</div>
            <div class="text-sm text-muted-foreground">1 hour ago</div>
          </div>
          <div class="p-3 border rounded">
            <div class="font-medium">System update completed</div>
            <div class="text-sm text-muted-foreground">3 hours ago</div>
          </div>
        </div>
      </div>
    </TabsContent>
  </Tabs>
</Story>

<Story name="Controlled State">
  <div class="space-y-4">
    <div class="flex gap-2">
      <Button 
        variant={activeTab === 'tab1' ? 'default' : 'outline'} 
        onclick={() => activeTab = 'tab1'}
        size="sm"
      >
        Set Tab 1
      </Button>
      <Button 
        variant={activeTab === 'tab2' ? 'default' : 'outline'} 
        onclick={() => activeTab = 'tab2'}
        size="sm"
      >
        Set Tab 2
      </Button>
      <Button 
        variant={activeTab === 'tab3' ? 'default' : 'outline'} 
        onclick={() => activeTab = 'tab3'}
        size="sm"
      >
        Set Tab 3
      </Button>
    </div>
    
    <Tabs bind:value={activeTab} class="w-[400px]">
      <TabsList class="grid w-full grid-cols-3">
        <TabsTrigger value="tab1">Tab 1</TabsTrigger>
        <TabsTrigger value="tab2">Tab 2</TabsTrigger>
        <TabsTrigger value="tab3">Tab 3</TabsTrigger>
      </TabsList>
      
      <TabsContent value="tab1">
        <Card>
          <CardHeader>
            <CardTitle>Tab 1 Content</CardTitle>
          </CardHeader>
          <CardContent>
            <p>This is the content for Tab 1. Current active tab: <strong>{activeTab}</strong></p>
          </CardContent>
        </Card>
      </TabsContent>
      
      <TabsContent value="tab2">
        <Card>
          <CardHeader>
            <CardTitle>Tab 2 Content</CardTitle>
          </CardHeader>
          <CardContent>
            <p>This is the content for Tab 2. Current active tab: <strong>{activeTab}</strong></p>
          </CardContent>
        </Card>
      </TabsContent>
      
      <TabsContent value="tab3">
        <Card>
          <CardHeader>
            <CardTitle>Tab 3 Content</CardTitle>
          </CardHeader>
          <CardContent>
            <p>This is the content for Tab 3. Current active tab: <strong>{activeTab}</strong></p>
          </CardContent>
        </Card>
      </TabsContent>
    </Tabs>
  </div>
</Story>

<Story name="Vertical Tabs">
  <div class="flex space-x-4 w-[600px]">
    <div class="w-48">
      <Tabs value="general" orientation="vertical" class="flex">
        <TabsList class="flex flex-col h-auto w-full">
          <TabsTrigger value="general" class="w-full justify-start">General</TabsTrigger>
          <TabsTrigger value="billing" class="w-full justify-start">Billing</TabsTrigger>
          <TabsTrigger value="team" class="w-full justify-start">Team</TabsTrigger>
          <TabsTrigger value="integrations" class="w-full justify-start">Integrations</TabsTrigger>
        </TabsList>
        
        <div class="flex-1 ml-4">
          <TabsContent value="general">
            <Card>
              <CardHeader>
                <CardTitle>General Settings</CardTitle>
                <CardDescription>Manage your general account settings</CardDescription>
              </CardHeader>
              <CardContent>
                <p>General settings content goes here.</p>
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="billing">
            <Card>
              <CardHeader>
                <CardTitle>Billing</CardTitle>
                <CardDescription>Manage your billing information</CardDescription>
              </CardHeader>
              <CardContent>
                <p>Billing settings content goes here.</p>
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="team">
            <Card>
              <CardHeader>
                <CardTitle>Team</CardTitle>
                <CardDescription>Manage your team members</CardDescription>
              </CardHeader>
              <CardContent>
                <p>Team settings content goes here.</p>
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="integrations">
            <Card>
              <CardHeader>
                <CardTitle>Integrations</CardTitle>
                <CardDescription>Manage your third-party integrations</CardDescription>
              </CardHeader>
              <CardContent>
                <p>Integration settings content goes here.</p>
              </CardContent>
            </Card>
          </TabsContent>
        </div>
      </Tabs>
    </div>
  </div>
</Story>