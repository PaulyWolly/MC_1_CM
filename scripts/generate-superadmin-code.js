/*
  GENERATE-SUPERADMIN-CODE.JS
  Version: 7
  AppName: MCC_1_CCM [v7]
  Updated: 7/16/2025 @7:00AM
  Created by Paul Welby
*/

/*
  Generate SuperAdmin One-Time Code
  CLI script to generate a one-time code for SuperAdmin access
*/

const axios = require('axios');

// Configuration
const SERVER_URL = process.env.SERVER_URL || 'http://localhost:4800';
const CLI_SECRET = process.env.CLI_SECRET || 'cli-secret-2025';

async function generateSuperAdminCode() {
    try {
        console.log('🔐 Generating SuperAdmin one-time code...');
        console.log(`📡 Connecting to: ${SERVER_URL}`);
        
        const response = await axios.post(`${SERVER_URL}/api/auth/generate-superadmin-code`, {
            secret: CLI_SECRET
        });

        if (response.data.success) {
            console.log('\n✅ SuperAdmin one-time code generated successfully!');
            console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
            console.log(`🔑 Code: ${response.data.oneTimeCode}`);
            console.log(`⏰ ${response.data.expiresIn}`);
            console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
            console.log('\n💡 Use this code in the SuperAdmin login form or via API call.');
            console.log('⚠️  This code can only be used once and expires quickly.');
        } else {
            console.error('❌ Failed to generate code:', response.data.message);
            process.exit(1);
        }

    } catch (error) {
        console.error('❌ Error generating SuperAdmin code:');
        
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

// Run the script
if (require.main === module) {
    generateSuperAdminCode();
}

module.exports = { generateSuperAdminCode }; 