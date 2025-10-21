/**
 * Check command - Quick status check using cache
 */
interface CheckCommandOptions {
    field?: string;
    type?: string;
    page?: string;
    config?: string;
}
export declare function checkCommand(options: CheckCommandOptions): Promise<void>;
export {};
//# sourceMappingURL=check.d.ts.map