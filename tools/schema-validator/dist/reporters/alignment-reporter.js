/**
 * Alignment Reporter - Generate validation reports in multiple formats
 * Supports markdown, JSON, HTML, and terminal output
 */
import chalk from 'chalk';
/**
 * Alignment Reporter class
 * Generates reports in various formats
 */
export class AlignmentReporter {
    /**
     * Generate report in specified format
     */
    generate(result, format, options = {}) {
        switch (format) {
            case 'markdown':
                return this.generateMarkdown(result, options);
            case 'json':
                return this.generateJSON(result, options);
            case 'html':
                return this.generateHTML(result, options);
            case 'terminal':
                return this.generateTerminal(result, options);
            default:
                throw new Error(`Unsupported format: ${format}`);
        }
    }
    /**
     * Generate markdown format report
     */
    generateMarkdown(result, options = {}) {
        const lines = [];
        // Header
        lines.push('# Schema Alignment Report');
        lines.push('');
        lines.push(`**Generated:** ${result.timestamp.toISOString()}`);
        lines.push(`**Duration:** ${result.durationMs}ms`);
        lines.push(`**Status:** ${result.passed ? '✅ PASSED' : '❌ FAILED'}`);
        lines.push('');
        // Summary
        lines.push('## Summary');
        lines.push('');
        lines.push('| Metric | Count |');
        lines.push('|--------|-------|');
        lines.push(`| Total Fields | ${result.summary.totalFields} |`);
        lines.push(`| Aligned | ${result.summary.alignedCount} |`);
        lines.push(`| Misaligned | ${result.summary.misalignedCount} |`);
        lines.push(`| Missing DB | ${result.summary.byStatus.missing_db} |`);
        lines.push(`| Missing API | ${result.summary.byStatus.missing_api} |`);
        lines.push(`| Type Mismatch | ${result.summary.byStatus.type_mismatch} |`);
        lines.push(`| Nullability Mismatch | ${result.summary.byStatus.nullability_mismatch} |`);
        lines.push('');
        // Filter alignments
        const alignments = this.filterAlignments(result.alignments, options);
        if (alignments.length === 0) {
            lines.push('*No alignments to display with current filters.*');
            lines.push('');
            return lines.join('\n');
        }
        // Misalignments
        const misaligned = alignments.filter((a) => a.status !== 'aligned');
        if (misaligned.length > 0) {
            lines.push('## Misalignments');
            lines.push('');
            for (const alignment of misaligned) {
                lines.push(`### ${alignment.fieldPath}`);
                lines.push('');
                lines.push(`**Status:** \`${alignment.status}\``);
                lines.push(`**Location:** ${alignment.sourceLocation.file}:${alignment.sourceLocation.line}`);
                lines.push('');
                if (alignment.error) {
                    lines.push(`**Error:** ${alignment.error}`);
                    lines.push('');
                }
                if (options.includeSuggestions && alignment.suggestion) {
                    lines.push('**Suggestion:**');
                    lines.push('```sql');
                    lines.push(alignment.suggestion);
                    lines.push('```');
                    lines.push('');
                }
            }
        }
        return lines.join('\n');
    }
    /**
     * Generate JSON format report
     */
    generateJSON(result, options = {}) {
        const alignments = this.filterAlignments(result.alignments, options);
        const report = {
            summary: {
                passed: result.passed,
                timestamp: result.timestamp.toISOString(),
                durationMs: result.durationMs,
                totalFields: result.summary.totalFields,
                alignedCount: result.summary.alignedCount,
                misalignedCount: result.summary.misalignedCount,
                byStatus: result.summary.byStatus,
            },
            alignments: alignments.map((a) => ({
                fieldPath: a.fieldPath,
                status: a.status,
                error: a.error,
                suggestion: options.includeSuggestions ? a.suggestion : undefined,
                sourceLocation: a.sourceLocation,
                graphqlType: a.graphqlField.graphqlType,
                dbType: a.dbColumn?.pgType,
                apiType: a.apiField?.graphqlType,
            })),
            errors: result.errors,
            warnings: result.warnings,
            cacheInfo: result.cacheInfo,
        };
        return JSON.stringify(report, null, 2);
    }
    /**
     * Generate HTML format report
     */
    generateHTML(result, options = {}) {
        const alignments = this.filterAlignments(result.alignments, options);
        const statusColor = result.passed ? '#22c55e' : '#ef4444';
        const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Schema Alignment Report</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      line-height: 1.6;
      color: #333;
      max-width: 1200px;
      margin: 0 auto;
      padding: 20px;
      background: #f5f5f5;
    }
    .header {
      background: white;
      padding: 20px;
      border-radius: 8px;
      margin-bottom: 20px;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    }
    .header h1 {
      margin: 0 0 10px 0;
      color: #1a1a1a;
    }
    .status {
      display: inline-block;
      padding: 4px 12px;
      border-radius: 4px;
      font-weight: 600;
      background: ${statusColor};
      color: white;
    }
    .summary {
      background: white;
      padding: 20px;
      border-radius: 8px;
      margin-bottom: 20px;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    }
    .summary table {
      width: 100%;
      border-collapse: collapse;
    }
    .summary th, .summary td {
      padding: 8px;
      text-align: left;
      border-bottom: 1px solid #e5e5e5;
    }
    .summary th {
      font-weight: 600;
      color: #666;
    }
    .alignment {
      background: white;
      padding: 20px;
      border-radius: 8px;
      margin-bottom: 15px;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    }
    .alignment h3 {
      margin: 0 0 10px 0;
      color: #1a1a1a;
    }
    .badge {
      display: inline-block;
      padding: 2px 8px;
      border-radius: 3px;
      font-size: 12px;
      font-weight: 600;
    }
    .badge-error { background: #fee; color: #c00; }
    .badge-warning { background: #ffc; color: #880; }
    .error-message {
      margin: 10px 0;
      padding: 10px;
      background: #fee;
      border-left: 3px solid #c00;
      border-radius: 4px;
    }
    .suggestion {
      margin: 10px 0;
      padding: 10px;
      background: #f0f0f0;
      border-left: 3px solid #666;
      border-radius: 4px;
      font-family: 'Monaco', 'Courier New', monospace;
      font-size: 13px;
      white-space: pre-wrap;
    }
  </style>
</head>
<body>
  <div class="header">
    <h1>Schema Alignment Report</h1>
    <p>
      <span class="status">${result.passed ? 'PASSED' : 'FAILED'}</span>
      Generated: ${result.timestamp.toISOString()} | Duration: ${result.durationMs}ms
    </p>
  </div>

  <div class="summary">
    <h2>Summary</h2>
    <table>
      <tr><th>Metric</th><th>Count</th></tr>
      <tr><td>Total Fields</td><td>${result.summary.totalFields}</td></tr>
      <tr><td>Aligned</td><td>${result.summary.alignedCount}</td></tr>
      <tr><td>Misaligned</td><td>${result.summary.misalignedCount}</td></tr>
      <tr><td>Missing DB</td><td>${result.summary.byStatus.missing_db}</td></tr>
      <tr><td>Missing API</td><td>${result.summary.byStatus.missing_api}</td></tr>
      <tr><td>Type Mismatch</td><td>${result.summary.byStatus.type_mismatch}</td></tr>
      <tr><td>Nullability Mismatch</td><td>${result.summary.byStatus.nullability_mismatch}</td></tr>
    </table>
  </div>

  ${alignments
            .filter((a) => a.status !== 'aligned')
            .map((a) => `
    <div class="alignment">
      <h3>${a.fieldPath}</h3>
      <p>
        <span class="badge badge-error">${a.status}</span>
        <code>${a.sourceLocation.file}:${a.sourceLocation.line}</code>
      </p>
      ${a.error ? `<div class="error-message">${a.error}</div>` : ''}
      ${options.includeSuggestions && a.suggestion ? `<div class="suggestion">${this.escapeHtml(a.suggestion)}</div>` : ''}
    </div>
  `)
            .join('\n')}
</body>
</html>`;
        return html;
    }
    /**
     * Generate terminal format report with colors
     */
    generateTerminal(result, options = {}) {
        const lines = [];
        // Header
        lines.push(chalk.bold.underline('\n📋 Schema Alignment Report'));
        lines.push('');
        lines.push(`${chalk.gray('Generated:')} ${result.timestamp.toISOString()}`);
        lines.push(`${chalk.gray('Duration:')} ${result.durationMs}ms`);
        lines.push(`${chalk.gray('Status:')} ${result.passed ? chalk.green.bold('✅ PASSED') : chalk.red.bold('❌ FAILED')}`);
        lines.push('');
        // Summary
        lines.push(chalk.bold('📊 Summary'));
        lines.push('');
        lines.push(`  ${chalk.cyan('Total Fields:')} ${result.summary.totalFields}`);
        lines.push(`  ${chalk.green('Aligned:')} ${result.summary.alignedCount}`);
        lines.push(`  ${chalk.red('Misaligned:')} ${result.summary.misalignedCount}`);
        lines.push('');
        lines.push(`  ${chalk.yellow('Missing DB:')} ${result.summary.byStatus.missing_db}`);
        lines.push(`  ${chalk.yellow('Missing API:')} ${result.summary.byStatus.missing_api}`);
        lines.push(`  ${chalk.yellow('Type Mismatch:')} ${result.summary.byStatus.type_mismatch}`);
        lines.push(`  ${chalk.yellow('Nullability Mismatch:')} ${result.summary.byStatus.nullability_mismatch}`);
        lines.push('');
        // Filter alignments
        const alignments = this.filterAlignments(result.alignments, options);
        const misaligned = alignments.filter((a) => a.status !== 'aligned');
        if (misaligned.length === 0) {
            lines.push(chalk.green('✨ All fields are properly aligned!'));
            lines.push('');
            return lines.join('\n');
        }
        // Misalignments
        lines.push(chalk.bold.red('🚨 Misalignments'));
        lines.push('');
        for (const alignment of misaligned) {
            lines.push(chalk.bold(`  ${alignment.fieldPath}`));
            lines.push(`    ${chalk.gray('Status:')} ${this.colorizeStatus(alignment.status)}`);
            lines.push(`    ${chalk.gray('Location:')} ${alignment.sourceLocation.file}:${alignment.sourceLocation.line}`);
            if (alignment.error) {
                lines.push(`    ${chalk.red('Error:')} ${alignment.error}`);
            }
            if (options.includeSuggestions && alignment.suggestion) {
                lines.push(`    ${chalk.blue('Suggestion:')}`);
                alignment.suggestion.split('\n').forEach((line) => {
                    lines.push(`      ${chalk.dim(line)}`);
                });
            }
            lines.push('');
        }
        return lines.join('\n');
    }
    /**
     * Filter alignments based on options
     * @private
     */
    filterAlignments(alignments, options) {
        if (!options.filter) {
            return alignments;
        }
        switch (options.filter) {
            case 'aligned':
                return alignments.filter((a) => a.status === 'aligned');
            case 'misaligned':
                return alignments.filter((a) => a.status !== 'aligned');
            case 'errors-only':
                return alignments.filter((a) => a.status !== 'aligned' && a.error);
            default:
                return alignments;
        }
    }
    /**
     * Colorize alignment status for terminal output
     * @private
     */
    colorizeStatus(status) {
        switch (status) {
            case 'aligned':
                return chalk.green(status);
            case 'missing_db':
            case 'missing_api':
                return chalk.red(status);
            case 'type_mismatch':
            case 'nullability_mismatch':
                return chalk.yellow(status);
            default:
                return chalk.gray(status);
        }
    }
    /**
     * Escape HTML special characters
     * @private
     */
    escapeHtml(text) {
        return text
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
    }
}
//# sourceMappingURL=alignment-reporter.js.map