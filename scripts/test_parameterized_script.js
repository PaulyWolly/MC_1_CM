/*
  TEST_PARAMETERIZED_SCRIPT.JS
  Version: 7
  AppName: MCC_1_CCM [v7]
  Updated: 7/15/2025 @10:00AM
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