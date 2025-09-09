/*
  TEST-AUTH.JS
  Version: 24
  AppName: mc_1_cm [v24]
  Updated: 9/8/2025 @9:30AM
  Created by Paul Welby
*/

/*
  Test Authentication System
  CLI script to test the authentication endpoints
*/

const axios = require('axios');

// Configuration
const SERVER_URL = process.env.SERVER_URL || 'http://localhost:4800';

// Test user data
const testUser = {
    email: 'test@example.com',
    password: 'testpassword123'
};

async function testAuth() {
    console.log('🧪 Testing Authentication System...');
    console.log(`📡 Server URL: ${SERVER_URL}\n`);

    try {
        // Test 1: Register a new user
        console.log('1️⃣ Testing user registration...');
        const registerResponse = await axios.post(`${SERVER_URL}/api/auth/register`, testUser);
        
        if (registerResponse.data.success) {
            console.log('✅ Registration successful');
            console.log(`   User ID: ${registerResponse.data.user.id}`);
            console.log(`   Role: ${registerResponse.data.user.role}`);
            console.log(`   Token: ${registerResponse.data.token.substring(0, 20)}...`);
        } else {
            console.log('❌ Registration failed:', registerResponse.data.message);
        }

        // Test 2: Login with the same user
        console.log('\n2️⃣ Testing user login...');
        const loginResponse = await axios.post(`${SERVER_URL}/api/auth/login`, testUser);
        
        if (loginResponse.data.success) {
            console.log('✅ Login successful');
            console.log(`   User ID: ${loginResponse.data.user.id}`);
            console.log(`   Role: ${loginResponse.data.user.role}`);
            console.log(`   Token: ${loginResponse.data.token.substring(0, 20)}...`);
        } else {
            console.log('❌ Login failed:', loginResponse.data.message);
        }

        // Test 3: Verify token
        console.log('\n3️⃣ Testing token verification...');
        const token = loginResponse.data.token;
        const verifyResponse = await axios.post(`${SERVER_URL}/api/auth/verify`, { token });
        
        if (verifyResponse.data.success) {
            console.log('✅ Token verification successful');
            console.log(`   User ID: ${verifyResponse.data.user.id}`);
            console.log(`   Role: ${verifyResponse.data.user.role}`);
        } else {
            console.log('❌ Token verification failed:', verifyResponse.data.message);
        }

        // Test 4: Test SuperAdmin code generation
        console.log('\n4️⃣ Testing SuperAdmin code generation...');
        const codeResponse = await axios.post(`${SERVER_URL}/api/auth/generate-superadmin-code`, {
            secret: 'cli-secret-2025'
        });
        
        if (codeResponse.data.success) {
            console.log('✅ SuperAdmin code generation successful');
            console.log(`   Code: ${codeResponse.data.oneTimeCode}`);
            console.log(`   Expires: ${codeResponse.data.expiresIn}`);
        } else {
            console.log('❌ SuperAdmin code generation failed:', codeResponse.data.message);
        }

        console.log('\n🎉 All authentication tests completed!');

    } catch (error) {
        console.error('❌ Test failed:');
        
        if (error.response) {
            console.error(`   Status: ${error.response.status}`);
            console.error(`   Message: ${error.response.data?.message || 'Unknown error'}`);
        } else if (error.request) {
            console.error('   Network error: Could not connect to server');
            console.error(`   Make sure the server is running at: ${SERVER_URL}`);
        } else {
            console.error('   Error:', error.message);
        }
        
        process.exit(1);
    }
}

// Run the test
if (require.main === module) {
    testAuth();
}

module.exports = { testAuth }; 