/*
  GENERATE_TEMPLATE.JS
  Version: 15
  AppName: MultiChat_Chatty [v15]
  Updated: 8/9/2025 @12:15AM
  Created by Paul Welby
*/

const fs = require('fs');
const path = require('path');

console.log('🏗️ [TEMPLATE] Project Template Generator');
console.log('='.repeat(60));

// Template definitions
const TEMPLATES = {
    script: {
        name: 'Script File',
        extension: '.js',
        template: `/*
  [FILENAME].JS
  Version: 1
  AppName: MC_1_CM [v9]
  Created: [DATE]
  Created by Paul Welby
  Purpose: [DESCRIPTION]
*/

const fs = require('fs');
const path = require('path');

// Configuration
const CONFIG = {
    inputPath: 'path/to/input',
    outputPath: 'path/to/output'
};

// Main function
async function main() {
    try {
        console.log('🚀 [SCRIPT] Starting...');
        
        // Implementation
        
        console.log('✅ [SCRIPT] Complete');
    } catch (error) {
        console.error('💥 [SCRIPT] Failed:', error.message);
        process.exit(1);
    }
}

// Run if called directly
if (require.main === module) {
    main();
}

module.exports = { main };
`
    },
    
    class: {
        name: 'JavaScript Class',
        extension: '.js',
        template: `/*
  [FILENAME].JS
  Version: 1
  AppName: MC_1_CM [v9]
  Created: [DATE]
  Created by Paul Welby
  Purpose: [DESCRIPTION]
*/

class [CLASSNAME] {
    constructor() {
        // Initialize properties
        this.property = value;
    }

    // Public methods
    methodName() {
        // Implementation
    }

    // Private methods (prefixed with _)
    _privateMethod() {
        // Implementation
    }
}

// Export
if (typeof module !== 'undefined' && module.exports) {
    module.exports = [CLASSNAME];
}
`
    },
    
    validation: {
        name: 'Validation Check',
        extension: '.js',
        template: `/*
  [FILENAME].JS
  Version: 1
  AppName: MC_1_CM [v9]
  Created: [DATE]
  Created by Paul Welby
  Purpose: [DESCRIPTION]
*/

const fs = require('fs');
const path = require('path');

// Validation check
const VALIDATION_CHECK = {
    name: '[CHECK_NAME]',
    path: 'path/to/file',
    check: (filePath) => {
        if (!fs.existsSync(filePath)) {
            return 'File missing: [specific error]';
        }
        
        try {
            const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
            
            // Specific checks
            if (!data.property) {
                return 'Missing "property" in data structure';
            }
            
            return null; // Success
        } catch (parseError) {
            return \`JSON parsing error: \${parseError.message}\`;
        }
    }
};

// Run validation
function runValidation() {
    const error = VALIDATION_CHECK.check(VALIDATION_CHECK.path);
    if (error) {
        console.log(\`❌ [VALIDATE] \${VALIDATION_CHECK.name}: \${error}\`);
        return false;
    } else {
        console.log(\`✅ [VALIDATE] \${VALIDATION_CHECK.name}: OK\`);
        return true;
    }
}

if (require.main === module) {
    runValidation();
}

module.exports = { VALIDATION_CHECK, runValidation };
`
    },
    
    component: {
        name: 'UI Component',
        extension: '.js',
        template: `/*
  [FILENAME].JS
  Version: 1
  AppName: MC_1_CM [v9]
  Created: [DATE]
  Created by Paul Welby
  Purpose: [DESCRIPTION]
*/

class [CLASSNAME] {
    constructor() {
        this.isInitialized = false;
        this.element = null;
    }

    // Initialize component
    init() {
        if (this.isInitialized) return;
        
        this.element = document.getElementById('[ELEMENT_ID]');
        if (!this.element) {
            console.error('[ERROR - [CONTEXT]] Element not found: [ELEMENT_ID]');
            return;
        }
        
        this.attachEventListeners();
        this.isInitialized = true;
        console.log('[DEBUG - [CONTEXT]] Component initialized');
    }

    // Attach event listeners
    attachEventListeners() {
        // Implementation
    }

    // Render content
    render() {
        // Implementation
    }

    // Cleanup
    destroy() {
        // Implementation
        this.isInitialized = false;
    }
}

// Export
if (typeof module !== 'undefined' && module.exports) {
    module.exports = [CLASSNAME];
}
`
    },
    
    css: {
        name: 'CSS File',
        extension: '.css',
        template: `/*
  [FILENAME].CSS
  Version: 1
  AppName: MC_1_CM [v9]
  Created: [DATE]
  Created by Paul Welby
  Purpose: [DESCRIPTION]
*/

/* Component styles */
.[COMPONENT]-container {
    /* Container styles */
}

.[COMPONENT]-element {
    /* Element styles */
}

.[COMPONENT]-element-active {
    /* Active state styles */
}

/* Responsive design */
@media (max-width: 768px) {
    .[COMPONENT]-container {
        /* Mobile styles */
    }
}
`
    },
    
    html: {
        name: 'HTML Template',
        extension: '.html',
        template: `<!--
  [FILENAME].HTML
  Version: 1
  AppName: MC_1_CM [v9]
  Created: [DATE]
  Created by Paul Welby
  Purpose: [DESCRIPTION]
-->

<div class="[COMPONENT]-container">
    <div class="[COMPONENT]-header">
        <h2>[TITLE]</h2>
    </div>
    
    <div class="[COMPONENT]-content">
        <!-- Content here -->
    </div>
    
    <div class="[COMPONENT]-footer">
        <!-- Footer content -->
    </div>
</div>
`
    }
};

// Generate file from template
function generateFile(templateType, filename, options = {}) {
    const template = TEMPLATES[templateType];
    if (!template) {
        console.log(`❌ [TEMPLATE] Unknown template type: ${templateType}`);
        console.log(`Available types: ${Object.keys(TEMPLATES).join(', ')}`);
        return false;
    }

    // Get current date
    const date = new Date().toLocaleDateString();
    
    // Replace placeholders in template
    let content = template.template
        .replace(/\[FILENAME\]/g, filename)
        .replace(/\[DATE\]/g, date)
        .replace(/\[DESCRIPTION\]/g, options.description || '[DESCRIPTION]')
        .replace(/\[CLASSNAME\]/g, options.className || filename.replace(/[-_]/g, ''))
        .replace(/\[COMPONENT\]/g, options.component || filename.toLowerCase())
        .replace(/\[ELEMENT_ID\]/g, options.elementId || `${options.component || filename.toLowerCase()}-container`)
        .replace(/\[CONTEXT\]/g, options.context || 'COMPONENT')
        .replace(/\[CHECK_NAME\]/g, options.checkName || filename.replace(/[-_]/g, ' '))
        .replace(/\[TITLE\]/g, options.title || '[TITLE]');

    // Create file path
    const filePath = options.outputPath || `scripts/TEMPLATES/generated/${filename}${template.extension}`;
    
    // Ensure directory exists
    const dir = path.dirname(filePath);
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }
    
    // Write file
    fs.writeFileSync(filePath, content);
    
    console.log(`✅ [TEMPLATE] Generated: ${filePath}`);
    return filePath;
}

// Interactive mode
function interactiveMode() {
    console.log('\n📋 [TEMPLATE] Available templates:');
    Object.entries(TEMPLATES).forEach(([key, template]) => {
        console.log(`   ${key}: ${template.name}`);
    });
    
    console.log('\n🎯 [TEMPLATE] Usage:');
    console.log('   node scripts/TEMPLATES/generate_template.js [type] [filename] [options]');
    console.log('\n📝 [TEMPLATE] Examples:');
    console.log('   node scripts/TEMPLATES/generate_template.js script scan_new_movies');
    console.log('   node scripts/TEMPLATES/generate_template.js class NewComponent');
    console.log('   node scripts/TEMPLATES/generate_template.js validation check_movie_data');
}

// Main execution
function main() {
    const args = process.argv.slice(2);
    
    if (args.length === 0) {
        interactiveMode();
        return;
    }
    
    const [templateType, filename, ...options] = args;
    
    if (!templateType || !filename) {
        console.log('❌ [TEMPLATE] Missing required arguments');
        interactiveMode();
        return;
    }
    
    // Parse options
    const parsedOptions = {};
    options.forEach(option => {
        const [key, value] = option.split('=');
        if (key && value) {
            parsedOptions[key] = value;
        }
    });
    
    // Generate file
    const result = generateFile(templateType, filename, parsedOptions);
    
    if (result) {
        console.log('\n🎯 [TEMPLATE] File generated successfully!');
        console.log('📋 [TEMPLATE] Remember to:');
        console.log('   1. Review the generated file');
        console.log('   2. Update placeholders with actual values');
        console.log('   3. Follow project standards');
        console.log('   4. Test the new functionality');
    }
}

if (require.main === module) {
    main();
}

module.exports = { generateFile, TEMPLATES }; 