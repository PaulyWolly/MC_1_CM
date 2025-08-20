/*
  VALIDATE_FUNCTIONS.JS
<<<<<<< FIXES/general-fixes
  Version: 10
  AppName: MultiChat_Chatty [v10]
  Updated: 7/30/2025 @12:35PM
=======
  Version: 20
  AppName: MultiChat_Chatty MC_1_CM [v20]
  Updated: 8/19/2025 @10:00AM
>>>>>>> local
  Created by Paul Welby
*/

/**
 * VALIDATE_FUNCTIONS.js - Function Dependency Validator
 * 
 * Checks app.js for:
 * - Function calls without definitions
 * - Commented out functions that are still being called
 * - Missing dependencies
 */

const fs = require('fs');
const path = require('path');

function validateFunctions() {
    console.log('🔍 Validating function dependencies in app.js...');
    console.log('=' .repeat(60));
    
    try {
        const appJs = fs.readFileSync('public/app.js', 'utf8');
        
        // Extract function definitions
        const functionDefinitions = new Set();
        const funcDefRegex = /function\s+([a-zA-Z_][a-zA-Z0-9_]*)\s*\(/g;
        let match;
        
        while ((match = funcDefRegex.exec(appJs)) !== null) {
            functionDefinitions.add(match[1]);
        }
        
        // Extract function calls (simplified - catches most cases)
        const functionCalls = new Set();
        const funcCallRegex = /([a-zA-Z_][a-zA-Z0-9_]*)\s*\(/g;
        
        while ((match = funcCallRegex.exec(appJs)) !== null) {
            const funcName = match[1];
            // Skip common keywords and built-ins
            if (!['if', 'for', 'while', 'switch', 'catch', 'typeof', 'instanceof', 
                  'console', 'setTimeout', 'setInterval', 'clearTimeout', 'clearInterval',
                  'document', 'window', 'Array', 'Object', 'String', 'Number', 'Date',
                  'Math', 'JSON', 'localStorage', 'sessionStorage', 'fetch', 'require',
                  'addEventListener', 'removeEventListener', 'querySelector', 'querySelectorAll'].includes(funcName)) {
                functionCalls.add(funcName);
            }
        }
        
        // Find commented out functions
        const commentedFunctions = new Set();
        const commentedFuncRegex = /\/\/\s*function\s+([a-zA-Z_][a-zA-Z0-9_]*)\s*\(/g;
        
        while ((match = commentedFuncRegex.exec(appJs)) !== null) {
            commentedFunctions.add(match[1]);
        }
        
        // Check for missing functions
        const missingFunctions = [];
        const possiblyMissing = [];
        
        for (const funcCall of functionCalls) {
            if (!functionDefinitions.has(funcCall)) {
                if (commentedFunctions.has(funcCall)) {
                    missingFunctions.push(`${funcCall} (commented out but still called)`);
                } else {
                    possiblyMissing.push(funcCall);
                }
            }
        }
        
        // Report results
        console.log(`✅ Functions defined: ${functionDefinitions.size}`);
        console.log(`📞 Function calls found: ${functionCalls.size}`);
        console.log(`💬 Commented functions: ${commentedFunctions.size}`);
        
        if (missingFunctions.length > 0) {
            console.log('\n🚨 CRITICAL - Missing Functions:');
            missingFunctions.forEach(func => console.log(`   ❌ ${func}`));
        }
        
        if (possiblyMissing.length > 0) {
            console.log('\n⚠️  Possibly Missing (may be external/built-in):');
            // Filter out likely external functions
            const filtered = possiblyMissing.filter(func => 
                !func.match(/^(get|set|add|remove|create|update|delete|find|filter|map|forEach|push|pop|shift|slice|splice|join|split|replace|match|test|parse|stringify|toString|toFixed|indexOf|includes|startsWith|endsWith|toLowerCase|toUpperCase|trim|length)$/) &&
                !func.match(/^[A-Z]/) && // Skip constructors
                func.length > 3 // Skip very short names
            );
            
            filtered.slice(0, 10).forEach(func => console.log(`   ⚠️  ${func}`));
            if (filtered.length > 10) {
                console.log(`   ... and ${filtered.length - 10} more`);
            }
        }
        
        if (commentedFunctions.size > 0) {
            console.log('\n💬 Commented Out Functions:');
            commentedFunctions.forEach(func => {
                const isCalled = functionCalls.has(func);
                console.log(`   ${isCalled ? '🚨' : '📝'} ${func} ${isCalled ? '(STILL BEING CALLED!)' : ''}`);
            });
        }
        
        console.log('\n' + '=' .repeat(60));
        
        if (missingFunctions.length === 0) {
            console.log('🎉 No critical missing functions detected!');
        } else {
            console.log(`🚨 Found ${missingFunctions.length} critical issues to fix`);
        }
        
        return missingFunctions.length === 0;
        
    } catch (error) {
        console.error('❌ Error validating functions:', error.message);
        return false;
    }
}

// Run validation
if (require.main === module) {
    const isValid = validateFunctions();
    process.exit(isValid ? 0 : 1);
}

module.exports = { validateFunctions }; 