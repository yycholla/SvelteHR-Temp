<script context="module">
  import { defineMeta } from '@storybook/addon-svelte-csf';

  const { Story } = defineMeta({
    title: 'UI/Dialog',
    component: Dialog,
    parameters: {
      layout: 'centered',
    },
    tags: ['autodocs'],
    args: {},
  });
</script>

<script>
  import Dialog from './dialog.svelte';
  import DialogTrigger from './dialog-trigger.svelte';
  import DialogContent from './dialog-content.svelte';
  import DialogHeader from './dialog-header.svelte';
  import DialogTitle from './dialog-title.svelte';
  import DialogDescription from './dialog-description.svelte';
  import DialogFooter from './dialog-footer.svelte';
  import Button from '../button/button.svelte';
  import Input from '../input/input.svelte';
  import Label from '../label/label.svelte';
  import { Copy, Edit3, Trash2, Settings } from 'lucide-svelte';

  let open1 = $state(false);
  let open2 = $state(false);
  let open3 = $state(false);
  let profileData = $state({ name: 'John Doe', email: 'john@example.com' });
</script>

<Story name="Default">
  <Dialog>
    <DialogTrigger>
      <Button variant="outline">Open Dialog</Button>
    </DialogTrigger>
    <DialogContent>
      <DialogHeader>
        <DialogTitle>Are you absolutely sure?</DialogTitle>
        <DialogDescription>
          This action cannot be undone. This will permanently delete your account
          and remove your data from our servers.
        </DialogDescription>
      </DialogHeader>
      <DialogFooter>
        <Button variant="outline">Cancel</Button>
        <Button variant="destructive">Continue</Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
</Story>

<Story name="Custom Content">
  <Dialog>
    <DialogTrigger>
      <Button>
        <Edit3 class="mr-2 h-4 w-4" />
        Edit Profile
      </Button>
    </DialogTrigger>
    <DialogContent class="sm:max-w-[425px]">
      <DialogHeader>
        <DialogTitle>Edit profile</DialogTitle>
        <DialogDescription>
          Make changes to your profile here. Click save when you're done.
        </DialogDescription>
      </DialogHeader>
      <div class="grid gap-4 py-4">
        <div class="grid grid-cols-4 items-center gap-4">
          <Label for="name" class="text-right">Name</Label>
          <Input id="name" bind:value={profileData.name} class="col-span-3" />
        </div>
        <div class="grid grid-cols-4 items-center gap-4">
          <Label for="email" class="text-right">Email</Label>
          <Input id="email" bind:value={profileData.email} class="col-span-3" />
        </div>
      </div>
      <DialogFooter>
        <Button>Save changes</Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
</Story>

<Story name="Confirmation Dialog">
  <Dialog>
    <DialogTrigger>
      <Button variant="destructive">
        <Trash2 class="mr-2 h-4 w-4" />
        Delete Item
      </Button>
    </DialogTrigger>
    <DialogContent>
      <DialogHeader>
        <DialogTitle>Delete Item</DialogTitle>
        <DialogDescription>
          Are you sure you want to delete this item? This action cannot be undone
          and will permanently remove the item from your account.
        </DialogDescription>
      </DialogHeader>
      <DialogFooter class="gap-2">
        <Button variant="outline">Cancel</Button>
        <Button variant="destructive">Delete</Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
</Story>

<Story name="Settings Dialog">
  <Dialog>
    <DialogTrigger>
      <Button variant="outline">
        <Settings class="mr-2 h-4 w-4" />
        Settings
      </Button>
    </DialogTrigger>
    <DialogContent class="sm:max-w-md">
      <DialogHeader>
        <DialogTitle>Settings</DialogTitle>
        <DialogDescription>
          Configure your application settings below.
        </DialogDescription>
      </DialogHeader>
      <div class="space-y-4">
        <div class="space-y-2">
          <Label for="api-key">API Key</Label>
          <div class="flex space-x-2">
            <Input id="api-key" value="sk-..." readonly />
            <Button size="icon" variant="outline">
              <Copy class="h-4 w-4" />
            </Button>
          </div>
        </div>
        <div class="space-y-2">
          <Label for="webhook-url">Webhook URL</Label>
          <Input id="webhook-url" placeholder="https://example.com/webhook" />
        </div>
      </div>
      <DialogFooter>
        <Button variant="outline">Cancel</Button>
        <Button>Save Settings</Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
</Story>

<Story name="Controlled State">
  <div class="space-x-2">
    <Button onclick={() => open1 = true}>Open Controlled Dialog</Button>
    <Button variant="outline" onclick={() => open1 = false} disabled={!open1}>
      Close Externally
    </Button>
    
    <Dialog bind:open={open1}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Controlled Dialog</DialogTitle>
          <DialogDescription>
            This dialog's open state is controlled externally. 
            Current state: {open1 ? 'Open' : 'Closed'}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button onclick={() => open1 = false}>Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  </div>
</Story>

<Story name="No Header Dialog">
  <Dialog>
    <DialogTrigger>
      <Button variant="outline">Simple Dialog</Button>
    </DialogTrigger>
    <DialogContent class="sm:max-w-md">
      <div class="p-6 text-center">
        <h3 class="text-lg font-semibold mb-2">Are you sure?</h3>
        <p class="text-sm text-muted-foreground mb-4">
          This will perform the action immediately.
        </p>
        <div class="flex justify-center space-x-2">
          <Button variant="outline" size="sm">Cancel</Button>
          <Button size="sm">Confirm</Button>
        </div>
      </div>
    </DialogContent>
  </Dialog>
</Story>

<Story name="Large Content Dialog">
  <Dialog>
    <DialogTrigger>
      <Button>View Large Content</Button>
    </DialogTrigger>
    <DialogContent class="sm:max-w-2xl max-h-[80vh] overflow-y-auto">
      <DialogHeader>
        <DialogTitle>Terms of Service</DialogTitle>
        <DialogDescription>
          Please read our terms of service carefully.
        </DialogDescription>
      </DialogHeader>
      <div class="py-4">
        <div class="prose prose-sm max-w-none">
          <h4 class="font-semibold">1. Acceptance of Terms</h4>
          <p class="text-sm mb-4">
            By accessing and using this service, you accept and agree to be bound by the terms and provision of this agreement.
          </p>
          
          <h4 class="font-semibold">2. Use License</h4>
          <p class="text-sm mb-4">
            Permission is granted to temporarily download one copy of the materials on this website for personal, non-commercial transitory viewing only.
          </p>
          
          <h4 class="font-semibold">3. Disclaimer</h4>
          <p class="text-sm mb-4">
            The materials on this website are provided on an 'as is' basis. We make no warranties, expressed or implied, and hereby disclaim all other warranties.
          </p>
          
          <h4 class="font-semibold">4. Limitations</h4>
          <p class="text-sm mb-4">
            In no event shall our company or its suppliers be liable for any damages arising out of the use or inability to use the materials.
          </p>
          
          <h4 class="font-semibold">5. Privacy Policy</h4>
          <p class="text-sm mb-4">
            Your privacy is important to us. Our Privacy Policy explains how we collect, use, and protect your information.
          </p>
          
          <h4 class="font-semibold">6. Contact Information</h4>
          <p class="text-sm">
            If you have any questions about these Terms, please contact us at legal@example.com.
          </p>
        </div>
      </div>
      <DialogFooter>
        <Button variant="outline">Decline</Button>
        <Button>Accept Terms</Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
</Story>