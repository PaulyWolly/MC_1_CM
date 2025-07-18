/*
  TEST_LOGGING.JS
  Version: 7
  AppName: MCC_1_CCM [v7]
  Updated: 7/16/2025 @7:00AM
  Created by Paul Welby
*/

const { logToFile } = require('./logging-helper');

async function testLogging() {
    console.log('🧪 [TEST] Starting logging test...');
    
    // Test basic logging
    logToFile('test_logging', '🧪 [TEST] Starting logging test...');
    
    // Simulate some work
    for (let i = 1; i <= 5; i++) {
        const message = `📝 [TEST] Step ${i}/5 - Processing test data...`;
        logToFile('test_logging', message);
        console.log(message);
        
        // Wait 2 seconds between steps
        await new Promise(resolve => setTimeout(resolve, 2000));
    }
    
    // Final message
    const finalMessage = '✅ [TEST] Logging test completed successfully!';
    logToFile('test_logging', finalMessage);
    console.log(finalMessage);
}

// Run the test
testLogging().catch(console.error); 