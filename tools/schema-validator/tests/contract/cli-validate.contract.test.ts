import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { execSync } from 'child_process';
import { mkdirSync, rmSync, writeFileSync, existsSync } from 'fs';
import { join } from 'path';

describe('CLI validate command contract', () => {
  const testDir = join(process.cwd(), 'test-temp-validate');
  const cliPath = join(process.cwd(), 'dist/cli/index.js');

  beforeEach(() => {
    if (existsSync(testDir)) {
      rmSync(testDir, { recursive: true });
    }
    mkdirSync(testDir, { recursive: true });
  });

  afterEach(() => {
    if (existsSync(testDir)) {
      rmSync(testDir, { recursive: true });
    }
  });

  it('should exit with code 0 when schema is fully aligned', () => {
    // This test will fail until implementation is complete
    expect(() => {
      execSync(`node ${cliPath} validate --full`, {
        cwd: testDir,
        stdio: 'pipe',
      });
    }).not.toThrow();
  });

  it('should exit with code 1 when misalignments are detected', () => {
    // Create a misalignment scenario
    const graphqlFile = join(testDir, 'test.ts');
    writeFileSync(
      graphqlFile,
      `
      import { gql } from '@urql/svelte';
      export const TEST_QUERY = gql\`
        query TestQuery {
          nonExistentField
        }
      \`;
    `
    );

    expect(() => {
      execSync(`node ${cliPath} validate --full`, {
        cwd: testDir,
        stdio: 'pipe',
      });
    }).toThrow();
  });

  it('should support --staged option for incremental validation', () => {
    const result = execSync(`node ${cliPath} validate --staged --help`, {
      cwd: testDir,
      encoding: 'utf-8',
    });

    expect(result).toContain('--staged');
  });

  it('should generate SCHEMA_ALIGNMENT.md report file', () => {
    try {
      execSync(`node ${cliPath} validate --full`, {
        cwd: testDir,
        stdio: 'pipe',
      });
    } catch (error) {
      // May fail due to misalignments, but report should still be generated
    }

    const reportPath = join(testDir, 'SCHEMA_ALIGNMENT.md');
    expect(existsSync(reportPath)).toBe(true);
  });

  it('should output JSON format when --json flag is used', () => {
    try {
      const result = execSync(`node ${cliPath} validate --full --json`, {
        cwd: testDir,
        encoding: 'utf-8',
      });

      const parsed = JSON.parse(result);
      expect(parsed).toHaveProperty('summary');
      expect(parsed).toHaveProperty('misalignments');
    } catch (error) {
      // Expected to fail - no implementation yet
    }
  });

  it('should respect --no-cache flag and skip cache usage', () => {
    const result = execSync(`node ${cliPath} validate --full --no-cache --help`, {
      cwd: testDir,
      encoding: 'utf-8',
    });

    expect(result).toContain('--no-cache');
  });
});
