<script context="module">
  import { defineMeta } from '@storybook/addon-svelte-csf';

  const { Story } = defineMeta({
    title: 'UI/Alert',
    component: Alert,
    parameters: {
      layout: 'centered',
    },
    tags: ['autodocs'],
    argTypes: {
      variant: {
        control: { type: 'select' },
        options: ['default', 'destructive', 'success', 'warning', 'info'],
      },
    },
    args: {
      variant: 'default',
    },
  });
</script>

<script>
  import Alert from './alert.svelte';
  import AlertTitle from './alert-title.svelte';
  import AlertDescription from './alert-description.svelte';
  import { Terminal, AlertCircle, CheckCircle2, AlertTriangle, Info } from 'lucide-svelte';
</script>

<Story name="Default">
  <Alert variant="default" class="max-w-md">
    <Terminal class="h-4 w-4" />
    <AlertTitle>Heads up!</AlertTitle>
    <AlertDescription>
      You can add components to your app using the cli.
    </AlertDescription>
  </Alert>
</Story>

<Story name="Destructive">
  <Alert variant="destructive" class="max-w-md">
    <AlertCircle class="h-4 w-4" />
    <AlertTitle>Error</AlertTitle>
    <AlertDescription>
      Your session has expired. Please log in again.
    </AlertDescription>
  </Alert>
</Story>

<Story name="Success">
  <Alert variant="success" class="max-w-md">
    <CheckCircle2 class="h-4 w-4" />
    <AlertTitle>Success!</AlertTitle>
    <AlertDescription>
      Your changes have been saved successfully.
    </AlertDescription>
  </Alert>
</Story>

<Story name="Warning">
  <Alert variant="warning" class="max-w-md">
    <AlertTriangle class="h-4 w-4" />
    <AlertTitle>Warning</AlertTitle>
    <AlertDescription>
      This action cannot be undone. Please proceed with caution.
    </AlertDescription>
  </Alert>
</Story>

<Story name="Info">
  <Alert variant="info" class="max-w-md">
    <Info class="h-4 w-4" />
    <AlertTitle>Information</AlertTitle>
    <AlertDescription>
      New features are now available in your dashboard.
    </AlertDescription>
  </Alert>
</Story>

<Story name="Simple Alert">
  <Alert variant="default" class="max-w-md">
    <AlertDescription>
      A simple alert without title or icon.
    </AlertDescription>
  </Alert>
</Story>

<Story name="All Variants">
  <div class="flex flex-col gap-4 max-w-md">
    <Alert variant="default">
      <Terminal class="h-4 w-4" />
      <AlertTitle>Default</AlertTitle>
      <AlertDescription>Default alert variant</AlertDescription>
    </Alert>
    
    <Alert variant="destructive">
      <AlertCircle class="h-4 w-4" />
      <AlertTitle>Destructive</AlertTitle>
      <AlertDescription>Destructive alert variant</AlertDescription>
    </Alert>
    
    <Alert variant="success">
      <CheckCircle2 class="h-4 w-4" />
      <AlertTitle>Success</AlertTitle>
      <AlertDescription>Success alert variant</AlertDescription>
    </Alert>
    
    <Alert variant="warning">
      <AlertTriangle class="h-4 w-4" />
      <AlertTitle>Warning</AlertTitle>
      <AlertDescription>Warning alert variant</AlertDescription>
    </Alert>
    
    <Alert variant="info">
      <Info class="h-4 w-4" />
      <AlertTitle>Info</AlertTitle>
      <AlertDescription>Info alert variant</AlertDescription>
    </Alert>
  </div>
</Story>