<script lang="ts">
  import Card from '$lib/components/ui/card/card.svelte';
  import CardHeader from '$lib/components/ui/card/card-header.svelte';
  import CardTitle from '$lib/components/ui/card/card-title.svelte';
  import CardDescription from '$lib/components/ui/card/card-description.svelte';
  import CardContent from '$lib/components/ui/card/card-content.svelte';
  import Button from '$lib/components/ui/button/button.svelte';
  import Avatar from '$lib/components/ui/avatar/avatar.svelte';
  import AvatarImage from '$lib/components/ui/avatar/avatar-image.svelte';
  import AvatarFallback from '$lib/components/ui/avatar/avatar-fallback.svelte';
  import { User, Mail, Briefcase } from 'lucide-svelte';
</script>

<svelte:head>
  <title>Profile - SvelteHR</title>
  <meta name="description" content="Your user profile" />
  </svelte:head>

<div class="container mx-auto px-6 pb-6 pt-6 max-w-3xl">
  <Card class="rounded-2xl border-border/40 bg-background/20 backdrop-blur-md shadow-xl">
    <CardHeader>
      <CardTitle>Profile</CardTitle>
      <CardDescription>View your account info</CardDescription>
    </CardHeader>
    <CardContent class="space-y-6">
      <div class="flex items-center space-x-4">
        <Avatar size="lg">
          <AvatarImage src="https://github.com/shadcn.png" alt="User" />
          <AvatarFallback class="bg-primary/10 text-primary font-semibold">JD</AvatarFallback>
        </Avatar>
        <div>
          <div class="text-xl font-semibold">John Doe</div>
          <div class="text-sm text-muted-foreground">HR Manager</div>
        </div>
      </div>
      <div class="space-y-3">
        <div class="flex items-center space-x-2 text-sm"><User class="h-4 w-4" /> <span>Username: johndoe</span></div>
        <div class="flex items-center space-x-2 text-sm"><Mail class="h-4 w-4" /> <span>Email: john.doe@company.com</span></div>
        <div class="flex items-center space-x-2 text-sm"><Briefcase class="h-4 w-4" /> <span>Role: HR</span></div>
      </div>
      <div class="pt-2">
        <Button disabled>Update Profile (coming soon)</Button>
      </div>
    </CardContent>
  </Card>
</div>

