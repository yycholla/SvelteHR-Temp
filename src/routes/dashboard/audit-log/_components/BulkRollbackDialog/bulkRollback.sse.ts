export interface BulkRollbackProgress {
	batchId: string;
	total: number;
	completed: number;
	failed: number;
	percentage: number;
	errors?: Array<{ logId: string; message: string }>;
}

export function createProgressStream(batchId: string) {
	const eventSource = new EventSource(`/api/rollback-progress/${batchId}`);

	return {
		onProgress(callback: (progress: BulkRollbackProgress) => void) {
			eventSource.addEventListener('progress', (e: MessageEvent) => {
				callback(JSON.parse(e.data));
			});
		},
		onComplete(callback: () => void) {
			eventSource.addEventListener('complete', () => {
				callback();
				eventSource.close();
			});
		},
		onError(callback: (error: Error) => void) {
			eventSource.addEventListener('error', () => {
				callback(new Error('SSE connection failed'));
			});
		},
		close() {
			eventSource.close();
		}
	};
}
