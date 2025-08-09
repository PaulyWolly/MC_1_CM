/*
  RUN_VALIDATION.JS
  Version: 15
  AppName: MultiChat_Chatty [v15]
  Updated: 8/9/2025 @12:15AM
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