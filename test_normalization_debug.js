/*
  TEST_NORMALIZATION_DEBUG.JS
  Purpose: Debug the normalization function to see why E.T. becomes Eperiodt
*/

const { normalizeKey } = require('./shared/NormalizationService');

// Test cases
const testCases = [
  'E.T. the Extra-Terrestrial (1982)',
  'Blade II (2002)',
  'U.S.A. (1990)',
  'Dr. Strangelove (1964)',
  'A.I. Artificial Intelligence (2001)'
];

console.log('🧪 Testing Normalization Function:\n');

testCases.forEach(testCase => {
  const result = normalizeKey(testCase);
  console.log(`Input:  "${testCase}"`);
  console.log(`Output: "${result}"`);
  console.log('---');
});

// Test the specific E.T. case step by step
console.log('\n🔍 Debugging E.T. case step by step:');
const testName = 'E.T. the Extra-Terrestrial (1982)';
console.log(`Original: "${testName}"`);

// Simulate the steps manually
let step1 = testName.replace(/\\/g, '/');
console.log(`Step 1 (backslash): "${step1}"`);

let step2 = step1.replace(/(\w+)\.(\w+)/g, '$1__PERIOD__$2');
console.log(`Step 2 (word.word): "${step2}"`);

let step3 = step2.replace(/(\b\w)\.(\w\b)/g, '$1__PERIOD__$2');
console.log(`Step 3 (single letter): "${step3}"`);

// Continue with more steps...
console.log('\nThis should help identify where the problem occurs.');
