#!/usr/bin/env node

// Simple test script to verify the auth refresh flow
async function testAuthFlow() {
  const baseUrl = 'http://localhost:8080/api/v2/auth/rbac';
  
  console.log('🧪 Testing RBAC Authentication Flow...\n');

  try {
    // Test 1: Login
    console.log('1️⃣ Testing login...');
    const loginResponse = await fetch(`${baseUrl}/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        username: 'admin',
        password: 'admin123'
      })
    });

    if (!loginResponse.ok) {
      throw new Error(`Login failed: ${loginResponse.status} ${loginResponse.statusText}`);
    }

    const loginData = await loginResponse.json();
    console.log('✅ Login successful');
    console.log(`   Token: ${loginData.token.substring(0, 20)}...`);
    
    const token = loginData.token;

    // Test 2: Verify token
    console.log('\n2️⃣ Testing token verification...');
    const verifyResponse = await fetch(`${baseUrl}/verify`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    if (!verifyResponse.ok) {
      throw new Error(`Verify failed: ${verifyResponse.status} ${verifyResponse.statusText}`);
    }

    const verifyData = await verifyResponse.json();
    console.log('✅ Token verification successful');
    console.log(`   User: ${verifyData.user?.username || 'Unknown'}`);

    // Test 3: Refresh token
    console.log('\n3️⃣ Testing token refresh...');
    const refreshResponse = await fetch(`${baseUrl}/refresh`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    if (!refreshResponse.ok) {
      throw new Error(`Refresh failed: ${refreshResponse.status} ${refreshResponse.statusText}`);
    }

    const refreshData = await refreshResponse.json();
    console.log('✅ Token refresh successful');
    console.log(`   New token: ${refreshData.token.substring(0, 20)}...`);
    console.log(`   Expires at: ${refreshData.expires_at}`);

    // Test 4: Verify new token
    console.log('\n4️⃣ Testing new token verification...');
    const newVerifyResponse = await fetch(`${baseUrl}/verify`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${refreshData.token}`
      }
    });

    if (!newVerifyResponse.ok) {
      throw new Error(`New token verify failed: ${newVerifyResponse.status} ${newVerifyResponse.statusText}`);
    }

    console.log('✅ New token verification successful');
    
    console.log('\n🎉 All authentication flow tests passed!');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    
    // Check if server is running
    try {
      const healthResponse = await fetch('http://localhost:8080/health');
      if (!healthResponse.ok) {
        console.log('\n💡 Tip: Make sure the backend server is running on localhost:8080');
      }
    } catch {
      console.log('\n💡 Tip: Make sure the backend server is running on localhost:8080');
    }
  }
}

testAuthFlow();