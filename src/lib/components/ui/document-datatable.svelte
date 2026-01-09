<script lang="ts">
	import DataTable from '$lib/components/documents/table/DataTable.svelte';
	import type { Document } from '$lib/components/documents/table/types';
	import type { VisibilityState } from '@tanstack/table-core';

	interface Props {
		documents: Document[];
		assignees?: Array<{ id: string; displayName: string }>;
		canPreview: (doc: Document) => boolean;
		canDownload: (doc: Document) => boolean;
		canViewDocuments: boolean;
		currentPage: number;
		pageSize: number;
		totalPages: number;
		onPageChange: (page: number) => void;
		onPageSizeChange?: (size: number) => void;
		showPerPageControl?: boolean;
		columnVisibilityState?: VisibilityState;
		onColumnVisibilityChange?: (visibility: VisibilityState) => void;
		onPreview: (documentId: string) => void;
		onDownload: (documentId: string) => void;
		dense?: boolean;
	}

	const props: Props = $props();
</script>

<DataTable {...props} />