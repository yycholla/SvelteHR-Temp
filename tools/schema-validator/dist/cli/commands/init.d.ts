/**
 * Init command - Initialize schema validator configuration
 */
interface InitCommandOptions {
  installHooks?: boolean;
  cacheDir?: string;
  customDir?: string;
  config?: string;
}
/**
 * Init command handler
 */
export declare function initCommand(options: InitCommandOptions): Promise<void>;
export {};
//# sourceMappingURL=init.d.ts.map
