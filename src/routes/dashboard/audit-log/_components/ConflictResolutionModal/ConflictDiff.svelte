<script lang="ts">
	interface ConflictDiffProps {
		field: string;
		currentValue: unknown;
		targetValue: unknown;
	}

	let { field, currentValue, targetValue }: ConflictDiffProps = $props();
</script>

<div class="conflict-diff border rounded p-3 mb-2">
	<div class="font-medium mb-2">{field}</div>
	<div class="grid grid-cols-2 gap-3">
		<div>
			<div class="text-sm text-gray-600 mb-1">Current:</div>
			<pre class="text-xs bg-red-50 p-2 rounded overflow-x-auto">
{JSON.stringify(currentValue, null, 2)}
			</pre>
		</div>
		<div>
			<div class="text-sm text-gray-600 mb-1">Target:</div>
			<pre class="text-xs bg-green-50 p-2 rounded overflow-x-auto">
{JSON.stringify(targetValue, null, 2)}
			</pre>
		</div>
	</div>
</div>
