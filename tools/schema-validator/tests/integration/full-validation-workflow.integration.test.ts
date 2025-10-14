import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { execSync } from 'child_process';
import { join } from 'path';
import { mkdirSync, writeFileSync, rmSync } from 'fs';

describe('Full validation workflow integration', () => {
  const testProjectDir = join(process.cwd(), '.test-integration');
  const cliPath = join(process.cwd(), 'dist/cli/index.js');

  beforeAll(() => {
    mkdirSync(testProjectDir, { recursive: true });
    // Initialize test project
    execSync(`node ${cliPath} init`, { cwd: testProjectDir, stdio: 'pipe' });
  });

  afterAll(() => {
    rmSync(testProjectDir, { recursive: true, force: true });
  });

  it('should complete full validation workflow from init to report', async () => {
    // Create test GraphQL file
    const graphqlFile = join(testProjectDir, 'test-query.ts');
    writeFileSync(graphqlFile, `
      import { gql } from '@urql/svelte';
      export const GET_USERS = gql\`
        query GetUsers {
          users {
            id
            email
            fullName
          }
        }
      \`;
    `);

    // Run validation
    const validateResult = execSync(`node ${cliPath} validate --full`, {
      cwd: testProjectDir,
      encoding: 'utf-8',
    });

    expect(validateResult).toBeDefined();

    // Generate report
    const reportResult = execSync(`node ${cliPath} report --format json`, {
      cwd: testProjectDir,
      encoding: 'utf-8',
    });

    const report = JSON.parse(reportResult);
    expect(report).toHaveProperty('summary');
    expect(report.summary).toHaveProperty('totalChecks');
  }, 30000);

  it('should persist cache between validation runs', async () => {
    // First run - cold cache
    const startTime1 = Date.now();
    execSync(`node ${cliPath} validate --full`, {
      cwd: testProjectDir,
      stdio: 'pipe',
    });
    const duration1 = Date.now() - startTime1;

    // Second run - warm cache
    const startTime2 = Date.now();
    execSync(`node ${cliPath} validate --full`, {
      cwd: testProjectDir,
      stdio: 'pipe',
    });
    const duration2 = Date.now() - startTime2;

    // Cached run should be faster
    expect(duration2).toBeLessThan(duration1);
  }, 60000);
});
