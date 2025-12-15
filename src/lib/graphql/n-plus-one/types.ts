// Type definitions for N+1 detection
export interface QueryAnalysis {
	operationName?: string;
	resolverCalls: ResolverCall[];
	potentialNPlusOne: boolean;
	duplicateQueries: string[];
	recommendations: string[];
}

export interface ResolverCall {
	fieldName: string;
	parentType: string;
	returnType: string;
	executionTime: number;
	callCount: number;
}

export interface NPlusOnePattern {
	fieldPath: string[];
	parentType: string;
	fieldName: string;
	returnType: string;
	isListField: boolean;
	hasNestedSelection: boolean;
	estimatedCallCount: number;
	severity: 'low' | 'medium' | 'high' | 'critical';
	recommendation: string;
}

export interface DataLoaderSuggestion {
	resolverPath: string;
	batchKey: string;
	loaderType: 'simple' | 'composite' | 'nested';
	implementation: string;
	estimatedImprovement: number; // Percentage
}

export interface QueryOptimization {
	originalComplexity: number;
	optimizedComplexity: number;
	patterns: NPlusOnePattern[];
	dataLoaderSuggestions: DataLoaderSuggestion[];
	queryRewrite?: string;
	performanceGain: number;
}

export interface NPlusOneDetectorConfig {
	enableRealTimeDetection: boolean;
	severityThreshold: 'low' | 'medium' | 'high' | 'critical';
	maxNestedDepth: number;
	listFieldThreshold: number;
	enableDataLoaderSuggestions: boolean;
	performanceThreshold: number; // milliseconds
}
