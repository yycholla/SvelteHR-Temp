import type { NPlusOneDetectorConfig } from './types';

export const DEFAULT_CONFIG: NPlusOneDetectorConfig = {
	enableRealTimeDetection: true,
	severityThreshold: 'medium',
	maxNestedDepth: 10,
	listFieldThreshold: 10,
	enableDataLoaderSuggestions: true,
	performanceThreshold: 100
};
