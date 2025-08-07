/*
  ENFORCE_STANDARDS.JS
  Version: 14
  AppName: MultiChat_Chatty [v14]
  Updated: 8/7/2025 @7:00AM
  Created by Paul Welby
*/

const fs = require('fs');
const path = require('path');

console.log('🏗️ [STANDARDS] Enforcing Project Standards...');
console.log('='.repeat(60));

// Standards definitions
const STANDARDS = {
    // File naming patterns
    naming: {
        scripts: /^[a-z_]+_[a-z_]+(_[A-Z]+)?\.js$/,
        dataFiles: /^[a-z-]+_normalized\.json$/,
        components: /^[A-Z][a-zA-Z]+\.(js|css|html)$/
    },
    
    // Required file headers
    headers: {
        js: /^\/\*\s*\n\s*[A-Z\s]+\s*\n\s*Version:\s*\d+\s*\n\s*AppName:\s*MC_1_CM\s*\[v\d+\]\s*\n\s*Created:\s*\d+\/\d+\/\d+\s*\n\s*Created by Paul Welby\s*\n/,
        css: /^\/\*\s*\n\s*[A-Z\s]+\s*\n\s*Version:\s*\d+\s*\n\s*AppName:\s*MC_1_CM\s*\[v\d+\]\s*\n\s*Created:\s*\d+\/\d+\/\d+\s*\n\s*Created by Paul Welby\s*\n/,
        html: /^<!--\s*\n\s*[A-Z\s]+\s*\n\s*Version:\s*\d+\s*\n\s*AppName:\s*MC_1_CM\s*\[v\d+\]\s*\n\s*Created:\s*\d+\/\d+\/\d+\s*\n\s*Created by Paul Welby\s*\n/
    },
    
    // Required console logging format
    consoleLogs: /console\.(log|error|warn)\(\[[A-Z\s-]+\]\s*[^)]+\)/g,
    
    // Data structure validation
    dataStructures: {
        movies: {
            required: ['path', 'folders'],
            folderStructure: ['path', 'normalizedKey', 'tmdbId', 'folders', 'files']
        },
        tvShows: {
            required: ['path', 'folders'],
            folderStructure: ['path', 'normalizedKey', 'folders']
        }
    }
};

// Check file naming standards
function checkNamingStandards(filePath) {
    const filename = path.basename(filePath);
    const ext = path.extname(filePath);
    
    if (filePath.includes('scripts/') && ext === '.js') {
        if (!STANDARDS.naming.scripts.test(filename)) {
            return `Script file naming violation: ${filename} (expected: action_target_specifier.js)`;
        }
    }
    
    if (filePath.includes('data/') && ext === '.json') {
        if (!STANDARDS.naming.dataFiles.test(filename)) {
            return `Data file naming violation: ${filename} (expected: type_name_normalized.json)`;
        }
    }
    
    if (filePath.includes('components/') && ['js', 'css', 'html'].includes(ext.slice(1))) {
        if (!STANDARDS.naming.components.test(filename)) {
            return `Component file naming violation: ${filename} (expected: ComponentName.ext)`;
        }
    }
    
    return null;
}

// Check file headers
function checkFileHeaders(filePath) {
    const content = fs.readFileSync(filePath, 'utf8');
    const ext = path.extname(filePath);
    
    let headerPattern;
    switch (ext) {
        case '.js':
            headerPattern = STANDARDS.headers.js;
            break;
        case '.css':
            headerPattern = STANDARDS.headers.css;
            break;
        case '.html':
            headerPattern = STANDARDS.headers.html;
            break;
        default:
            return null; // Skip non-standard files
    }
    
    if (!headerPattern.test(content)) {
        return `Missing or incorrect file header in ${path.basename(filePath)}`;
    }
    
    return null;
}

// Check console logging standards
function checkConsoleLogs(filePath) {
    const content = fs.readFileSync(filePath, 'utf8');
    const ext = path.extname(filePath);
    
    if (ext !== '.js') return null;
    
    const consoleStatements = content.match(/console\.(log|error|warn)\([^)]+\)/g) || [];
    const violations = [];
    
    consoleStatements.forEach(statement => {
        if (!statement.includes('[') || !statement.includes(']')) {
            violations.push(`Console statement missing context brackets: ${statement.trim()}`);
        }
    });
    
    return violations.length > 0 ? violations : null;
}

// Check data structure standards
function checkDataStructures(filePath) {
    if (!filePath.includes('data/') || !filePath.endsWith('.json')) {
        return null;
    }
    
    try {
        const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
        
        // Check if it's a media library file
        if (filePath.includes('movies')) {
            return checkMediaStructure(data, STANDARDS.dataStructures.movies, 'Movies');
        } else if (filePath.includes('tv-shows')) {
            return checkMediaStructure(data, STANDARDS.dataStructures.tvShows, 'TV Shows');
        }
        
    } catch (error) {
        return `JSON parsing error in ${path.basename(filePath)}: ${error.message}`;
    }
    
    return null;
}

// Check media structure
function checkMediaStructure(data, standard, type) {
    const violations = [];
    
    // Check required top-level properties
    standard.required.forEach(prop => {
        if (!(prop in data)) {
            violations.push(`${type} data missing required property: "${prop}"`);
        }
    });
    
    if (violations.length > 0) return violations;
    
    // Check folders structure
    if (data.folders && Array.isArray(data.folders) && data.folders.length > 0) {
        const firstItem = data.folders[0];
        
        standard.folderStructure.forEach(prop => {
            if (!(prop in firstItem)) {
                violations.push(`${type} folder items missing required property: "${prop}"`);
            }
        });
    }
    
    return violations.length > 0 ? violations : null;
}

// Scan directory for standards violations
function scanDirectory(dirPath, violations = []) {
    const items = fs.readdirSync(dirPath);
    
    for (const item of items) {
        const fullPath = path.join(dirPath, item);
        const stat = fs.statSync(fullPath);
        
        if (stat.isDirectory()) {
            // Skip node_modules and .git
            if (item !== 'node_modules' && item !== '.git') {
                scanDirectory(fullPath, violations);
            }
        } else {
            // Check file standards
            const namingViolation = checkNamingStandards(fullPath);
            if (namingViolation) violations.push({ file: fullPath, type: 'Naming', issue: namingViolation });
            
            const headerViolation = checkFileHeaders(fullPath);
            if (headerViolation) violations.push({ file: fullPath, type: 'Header', issue: headerViolation });
            
            const consoleViolations = checkConsoleLogs(fullPath);
            if (consoleViolations) {
                consoleViolations.forEach(violation => {
                    violations.push({ file: fullPath, type: 'Console', issue: violation });
                });
            }
            
            const dataViolations = checkDataStructures(fullPath);
            if (dataViolations) {
                if (Array.isArray(dataViolations)) {
                    dataViolations.forEach(violation => {
                        violations.push({ file: fullPath, type: 'Data Structure', issue: violation });
                    });
                } else {
                    violations.push({ file: fullPath, type: 'Data Structure', issue: dataViolations });
                }
            }
        }
    }
    
    return violations;
}

// Main execution
async function main() {
    try {
        console.log('🔍 [STANDARDS] Scanning project for standards violations...\n');
        
        const violations = scanDirectory('.');
        
        if (violations.length === 0) {
            console.log('✅ [STANDARDS] All files comply with project standards!');
            console.log('🎯 [STANDARDS] No violations found');
        } else {
            console.log(`❌ [STANDARDS] Found ${violations.length} standards violations:\n`);
            
            // Group violations by type
            const grouped = violations.reduce((acc, violation) => {
                if (!acc[violation.type]) acc[violation.type] = [];
                acc[violation.type].push(violation);
                return acc;
            }, {});
            
            Object.entries(grouped).forEach(([type, typeViolations]) => {
                console.log(`📋 [STANDARDS] ${type} Violations (${typeViolations.length}):`);
                typeViolations.forEach(violation => {
                    console.log(`   ❌ ${path.relative('.', violation.file)}: ${violation.issue}`);
                });
                console.log('');
            });
            
            console.log('💡 [STANDARDS] Fix violations to maintain project consistency');
            console.log('📖 [STANDARDS] See PROJECT_STANDARDS.md for guidelines');
            
            process.exit(1);
        }
        
    } catch (error) {
        console.error('💥 [STANDARDS] Standards check failed:', error.message);
        process.exit(1);
    }
}

if (require.main === module) {
    main();
}

module.exports = { scanDirectory, checkNamingStandards, checkFileHeaders, checkConsoleLogs, checkDataStructures }; 