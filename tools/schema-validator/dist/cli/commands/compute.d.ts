/**
 * Compute commands - Manage computed field configurations
 */
interface ComputeAddOptions {
  sourceColumns: string;
  resolver: string;
  description: string;
  returnType?: string;
  config?: string;
}
interface ComputeListOptions {
  json?: boolean;
  config?: string;
}
declare function addComputedField(fieldPath: string, options: ComputeAddOptions): Promise<void>;
declare function listComputedFields(options: ComputeListOptions): Promise<void>;
export declare const computeCommand: {
  add: typeof addComputedField;
  list: typeof listComputedFields;
};
export {};
//# sourceMappingURL=compute.d.ts.map
