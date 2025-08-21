#!/usr/bin/env node

// Test script to verify Tailscale connection to backend
async function testTailscaleConnection() {
  const tailscaleIP = '100.71.207.7';
  const baseUrl = `http://${tailscaleIP}:8080`;
  
  console.log('🌐 Testing Tailscale connection to backend...\n');

  try {
    // Test 1: Health check
    console.log('1️⃣ Testing health endpoint...');
    const healthResponse = await fetch(`${baseUrl}/health`, {
      method: 'GET',
      headers: {
        'Accept': 'application/json'
      }
    });

    if (!healthResponse.ok) {
      throw new Error(`Health check failed: ${healthResponse.status} ${healthResponse.statusText}`);
    }

    const healthData = await healthResponse.json();
    console.log('✅ Health check successful');
    console.log(`   Status: ${healthData.status}`);
    console.log(`   Database: ${healthData.database}`);

    // Test 2: CORS preflight for login endpoint
    console.log('\n2️⃣ Testing CORS preflight...');
    const corsResponse = await fetch(`${baseUrl}/api/v2/auth/rbac/login`, {
      method: 'OPTIONS',
      headers: {
        'Origin': 'http://localhost:5173', // Typical SvelteKit dev server
        'Access-Control-Request-Method': 'POST',
        'Access-Control-Request-Headers': 'Content-Type'
      }
    });

    console.log(`   CORS preflight status: ${corsResponse.status}`);
    console.log(`   Access-Control-Allow-Origin: ${corsResponse.headers.get('Access-Control-Allow-Origin')}`);
    console.log(`   Access-Control-Allow-Methods: ${corsResponse.headers.get('Access-Control-Allow-Methods')}`);

    if (corsResponse.status === 200 || corsResponse.status === 204) {
      console.log('✅ CORS preflight successful');
    } else {
      console.log('⚠️  CORS preflight returned unexpected status');
    }

    // Test 3: Actual login attempt
    console.log('\n3️⃣ Testing login endpoint...');
    const loginResponse = await fetch(`${baseUrl}/api/v2/auth/rbac/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Origin': 'http://localhost:5173'
      },
      body: JSON.stringify({
        username: 'admin',
        password: 'admin123'
      })
    });

    if (loginResponse.ok) {
      console.log('✅ Login endpoint accessible');
      const loginData = await loginResponse.json();
      console.log(`   Token received: ${loginData.token ? 'Yes' : 'No'}`);
    } else {
      console.log(`⚠️  Login failed: ${loginResponse.status} ${loginResponse.statusText}`);
      const errorText = await loginResponse.text();
      console.log(`   Error: ${errorText}`);
    }

    console.log('\n🎉 Tailscale connection tests complete!');
    console.log('\n💡 Next steps:');
    console.log('   1. Restart your SvelteKit dev server: npm run dev');
    console.log('   2. Try logging in through the web interface');
    
  } catch (error) {
    console.error('❌ Connection test failed:', error.message);
    console.log('\n🔍 Troubleshooting tips:');
    console.log('   1. Ensure the backend server is running: go run ./cmd/server/main_gel.go');
    console.log('   2. Check that Tailscale is connected on both machines');
    console.log('   3. Verify the Tailscale IP is correct: tailscale ip');
  }
}

testTailscaleConnection();