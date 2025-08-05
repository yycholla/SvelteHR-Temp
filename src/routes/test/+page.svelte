<script lang="ts">
	import { Card, CardHeader, CardContent, CardTitle } from '$lib/components/ui/card';
	import { Button } from '$lib/components/ui/button';
</script>

<div class="p-8">
	<Card>
		<CardHeader>
			<CardTitle>Test Page</CardTitle>
		</CardHeader>
		<CardContent>
			<p>This is a simple test page to verify components work.</p>
			<Button>Test Button</Button>
		</CardContent>
	</Card>
</div>