/**
 * Report command - Generate alignment reports
 */
interface ReportCommandOptions {
  format?: string;
  filter?: string;
  output?: string;
  errorsOnly?: boolean;
  config?: string;
}
export declare function reportCommand(options: ReportCommandOptions): Promise<void>;
export {};
//# sourceMappingURL=report.d.ts.map
