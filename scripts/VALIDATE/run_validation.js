/*
  RUN_VALIDATION.JS
  Version: 2.0
  AppName: MultiChat_Chatty [v2.0]
  Updated: 12/31/2025 @10:00AM
  Created by Paul Welby
*/

console.log('🚀 [VALIDATE] Running validation...');
console.log('='.repeat(60));

// Import the validation function
const { validateBeforePush } = require('./validate_before_push.js');

// Run validation
validateBeforePush()
    .then(() => {
        console.log('\n✅ [VALIDATE] All checks passed!');
        process.exit(0);
    })
    .catch((error) => {
        console.error('\n❌ [VALIDATE] Validation failed:', error.message);
        process.exit(1);
    }); 