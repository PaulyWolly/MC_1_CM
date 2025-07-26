/*
  TEST_PARAMETERIZED_SCRIPT.JS
  Version: 9
  AppName: MC_1_CM [v9]
  Updated: 7/24/2025 @5:20PM
  Created by Paul Welby
*/

// Test script for parameterized execution
const args = process.argv.slice(2);

console.log('🧪 Test Parameterized Script');
console.log('Arguments received:', args);

if (args.includes('--dry-run')) {
    console.log('✅ Dry run mode detected');
}

if (args.includes('--rename-folders')) {
    console.log('✅ Rename folders mode detected');
}

if (args.includes('--rename-files')) {
    console.log('✅ Rename files mode detected');
}

if (args.includes('--test')) {
    console.log('✅ Test mode detected');
}

console.log('🎉 Script completed successfully!'); 