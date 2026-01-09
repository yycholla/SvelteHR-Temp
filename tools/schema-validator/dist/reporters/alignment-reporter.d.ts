/**
 * Alignment Reporter - Generate validation reports in multiple formats
 * Supports markdown, JSON, HTML, and terminal output
 */
import type { ValidationResult } from '../types/results.js';
import type { ReportFormat } from '../types/enums.js';
/**
 * Report options
 */
export interface ReportOptions {
  /** Filter by alignment status */
  filter?: 'aligned' | 'misaligned' | 'errors-only';
  /** Include source code snippets */
  includeSnippets?: boolean;
  /** Include suggestions */
  includeSuggestions?: boolean;
}
/**
 * Alignment Reporter class
 * Generates reports in various formats
 */
export declare class AlignmentReporter {
  /**
   * Generate report in specified format
   */
  generate(result: ValidationResult, format: ReportFormat, options?: ReportOptions): string;
  /**
   * Generate markdown format report
   */
  generateMarkdown(result: ValidationResult, options?: ReportOptions): string;
  /**
   * Generate JSON format report
   */
  generateJSON(result: ValidationResult, options?: ReportOptions): string;
  /**
   * Generate HTML format report
   */
  generateHTML(result: ValidationResult, options?: ReportOptions): string;
  /**
   * Generate terminal format report with colors
   */
  generateTerminal(result: ValidationResult, options?: ReportOptions): string;
  /**
   * Filter alignments based on options
   * @private
   */
  private filterAlignments;
  /**
   * Colorize alignment status for terminal output
   * @private
   */
  private colorizeStatus;
  /**
   * Escape HTML special characters
   * @private
   */
  private escapeHtml;
}
//# sourceMappingURL=alignment-reporter.d.ts.map
