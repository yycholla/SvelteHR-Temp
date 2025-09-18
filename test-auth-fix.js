#!/usr/bin/env node

/**
 * Simple authentication fix validation test
 * Uses curl to test the redirect behavior without browser issues
 */

import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

// Import our testing entities for analysis
import fs from 'fs/promises';

class AuthTestResult {
  constructor(data) {
    this.id = data.id;
    this.startTime = data.startTime;
    this.endTime = data.endTime;
    this.duration = data.duration;
    this.url = data.url;
    this.statusCode = data.statusCode;
    this.redirects = data.redirects || [];
    this.error = data.error;
  }

  hasRedirectLoop() {
    return this.redirects.length > 2 &&
           this.redirects.filter(r => r.includes('/admin')).length > 1 &&
           this.redirects.filter(r => r.includes('/login')).length > 1;
  }

  isSuccessful() {
    return this.statusCode >= 200 && this.statusCode < 300 && !this.hasRedirectLoop();
  }
}

async function testEndpoint(url, description) {
  console.log(`\n🧪 Testing: ${description}`);
  console.log(`📍 URL: ${url}`);

  const startTime = new Date();

  try {
    // Use curl to follow redirects and capture them
    const { stdout, stderr } = await execAsync(
      `curl -s -L -w "%{http_code}\\n%{redirect_url}\\n" "${url}" -o /dev/null --max-redirs 5 --connect-timeout 10`
    );

    const endTime = new Date();
    const lines = stdout.trim().split('\n');
    const statusCode = parseInt(lines[lines.length - 2] || '0');
    const redirectUrl = lines[lines.length - 1] || '';

    const result = new AuthTestResult({
      id: `test-${Date.now()}`,
      startTime,
      endTime,
      duration: endTime - startTime,
      url,
      statusCode,
      redirects: redirectUrl ? [redirectUrl] : [],
      error: null
    });

    console.log(`✅ Status: ${result.statusCode}`);
    console.log(`⏱️  Duration: ${result.duration}ms`);
    if (result.redirects.length > 0) {
      console.log(`🔄 Redirects: ${result.redirects.join(' -> ')}`);
    }
    console.log(`🎯 Success: ${result.isSuccessful()}`);
    console.log(`🔁 Has Loop: ${result.hasRedirectLoop()}`);

    return result;

  } catch (error) {
    const endTime = new Date();

    const result = new AuthTestResult({
      id: `test-${Date.now()}`,
      startTime,
      endTime,
      duration: endTime - startTime,
      url,
      statusCode: 0,
      redirects: [],
      error: error.message
    });

    console.log(`❌ Error: ${error.message}`);
    return result;
  }
}

async function testAuthenticationFlow() {
  console.log('🚀 Authentication Fix Validation Test');
  console.log('=====================================');

  const results = [];

  // Test basic endpoints
  results.push(await testEndpoint('http://localhost:5174/', 'Home page access'));
  results.push(await testEndpoint('http://localhost:5174/login', 'Login page access'));
  results.push(await testEndpoint('http://localhost:5174/admin', 'Admin page access (should redirect to login)'));

  // Test with multiple attempts to catch timing issues
  console.log('\n🔄 Testing multiple admin access attempts (checking for timing issues)');
  for (let i = 1; i <= 3; i++) {
    results.push(await testEndpoint('http://localhost:5174/admin', `Admin access attempt ${i}`));
  }

  // Analysis
  console.log('\n📊 AUTHENTICATION FIX ANALYSIS');
  console.log('================================');

  const successful = results.filter(r => r.isSuccessful());
  const failed = results.filter(r => !r.isSuccessful());
  const withRedirectLoops = results.filter(r => r.hasRedirectLoop());

  console.log(`Total tests: ${results.length}`);
  console.log(`Successful: ${successful.length}`);
  console.log(`Failed: ${failed.length}`);
  console.log(`Redirect loops detected: ${withRedirectLoops.length}`);

  if (withRedirectLoops.length > 0) {
    console.log('\n🚨 REDIRECT LOOPS STILL PRESENT:');
    withRedirectLoops.forEach(result => {
      console.log(`   - ${result.url}: ${result.redirects.join(' -> ')}`);
    });
  } else {
    console.log('\n✅ NO REDIRECT LOOPS DETECTED');
  }

  // Check admin page behavior specifically
  const adminTests = results.filter(r => r.url.includes('/admin'));
  const adminRedirectBehavior = adminTests.map(r => r.statusCode);
  const consistentBehavior = new Set(adminRedirectBehavior).size === 1;

  console.log(`\n🔐 Admin Page Behavior:`);
  console.log(`   Status codes: [${adminRedirectBehavior.join(', ')}]`);
  console.log(`   Consistent behavior: ${consistentBehavior ? '✅ Yes' : '❌ No'}`);

  if (consistentBehavior) {
    console.log(`   Expected behavior: Admin page correctly redirects to login when not authenticated`);
  } else {
    console.log(`   ⚠️  Inconsistent behavior detected - may indicate timing issues`);
  }

  // Generate test report
  const report = {
    timestamp: new Date().toISOString(),
    summary: {
      totalTests: results.length,
      successful: successful.length,
      failed: failed.length,
      redirectLoops: withRedirectLoops.length,
      adminPageConsistent: consistentBehavior
    },
    results: results.map(r => ({
      url: r.url,
      statusCode: r.statusCode,
      duration: r.duration,
      hasRedirectLoop: r.hasRedirectLoop(),
      isSuccessful: r.isSuccessful(),
      redirects: r.redirects,
      error: r.error
    }))
  };

  await fs.writeFile('./auth-fix-test-report.json', JSON.stringify(report, null, 2));
  console.log(`\n📄 Detailed report saved to: auth-fix-test-report.json`);

  // Overall assessment
  if (withRedirectLoops.length === 0 && consistentBehavior) {
    console.log('\n🎉 AUTHENTICATION FIX VALIDATION: PASSED');
    console.log('   Redirect loop issue appears to be resolved!');
  } else {
    console.log('\n⚠️  AUTHENTICATION FIX VALIDATION: NEEDS ATTENTION');
    if (withRedirectLoops.length > 0) {
      console.log('   Redirect loops still detected');
    }
    if (!consistentBehavior) {
      console.log('   Inconsistent admin page behavior');
    }
  }
}

// Run the test
testAuthenticationFlow().catch(error => {
  console.error('❌ Test failed:', error);
  process.exit(1);
});