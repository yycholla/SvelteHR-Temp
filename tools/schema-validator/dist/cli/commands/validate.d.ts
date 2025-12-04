/**
 * Validate command - Main schema alignment validation
 */
interface ValidateCommandOptions {
  full?: boolean;
  staged?: boolean;
  json?: boolean;
  cache?: boolean;
  filterField?: string;
  filterType?: string;
  filterPage?: string;
  config?: string;
  verbose?: boolean;
}
/**
 * Validate command handler
 */
export declare function validateCommand(options: ValidateCommandOptions): Promise<void>;
export {};
//# sourceMappingURL=validate.d.ts.map
