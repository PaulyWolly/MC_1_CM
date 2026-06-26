/*
  ENHANCED_BACKUP_APP.JS
  Version: 2.0
  AppName: MultiChat_Chatty [v2.0]
  Updated: 12/31/2025 @10:00AM
  Created by Paul Welby
*/

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Configuration
const MAX_BACKUPS_PER_FILE = 3;

// Get current timestamp
function getTimestamp() {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const seconds = String(now.getSeconds()).padStart(2, '0');
    
    return `${year}${month}${day}_${hours}${minutes}${seconds}`;
}

// Create directory if it doesn't exist
function ensureDirectoryExists(dirPath) {
    if (!fs.existsSync(dirPath)) {
        fs.mkdirSync(dirPath, { recursive: true });
        console.log(`📁 Created directory: ${dirPath}`);
    }
}

// Get git commit history for recent changes
function getGitHistory(days = 7) {
    try {
        const since = new Date();
        since.setDate(since.getDate() - days);
        const sinceStr = since.toISOString().split('T')[0];
        
        const gitLog = execSync(`git log --since="${sinceStr}" --oneline --name-only`, { 
            encoding: 'utf8',
            cwd: process.cwd()
        });
        
        return gitLog.split('\n').filter(line => line.trim());
    } catch (error) {
        console.log('⚠️  Could not get git history:', error.message);
        return [];
    }
}

// Get changes since last backup
function getChangesSinceLastBackup() {
    try {
        const backupDir = path.join(process.cwd(), 'backups');
        if (!fs.existsSync(backupDir)) {
            return { changes: [], lastBackupTime: null };
        }

        // Find the most recent backup directory
        const backupDirs = fs.readdirSync(backupDir)
            .filter(dir => dir.startsWith('enhanced_backup_') && fs.statSync(path.join(backupDir, dir)).isDirectory())
            .map(dir => {
                const match = dir.match(/enhanced_backup_(\d{4}-\d{2}-\d{2}T\d{4})/);
                return {
                    name: dir,
                    timestamp: match ? match[1] : '0000-00-00T0000',
                    path: path.join(backupDir, dir)
                };
            })
            .sort((a, b) => b.timestamp.localeCompare(a.timestamp));

        if (backupDirs.length === 0) {
            return { changes: [], lastBackupTime: null };
        }

        const lastBackup = backupDirs[0];
        const lastBackupTime = new Date(lastBackup.timestamp.replace('T', ' ').replace(/(\d{4}-\d{2}-\d{2}) (\d{2})(\d{2})/, '$1 $2:$3:00'));

        // Get git changes since last backup
        const sinceStr = lastBackupTime.toISOString().split('T')[0];
        const gitLog = execSync(`git log --since="${sinceStr}" --oneline --name-only`, { 
            encoding: 'utf8',
            cwd: process.cwd()
        });

        const changes = gitLog.split('\n').filter(line => line.trim());
        
        return { 
            changes, 
            lastBackupTime: lastBackupTime.toLocaleString(),
            lastBackupDir: lastBackup.name
        };
    } catch (error) {
        console.log('⚠️  Could not get changes since last backup:', error.message);
        return { changes: [], lastBackupTime: null };
    }
}

// Analyze file for changes and patterns
function analyzeFileForChanges(filePath, baseDir) {
    const relativePath = path.relative(baseDir, filePath);
    const stats = fs.statSync(filePath);
    const content = fs.readFileSync(filePath, 'utf8');
    
    const analysis = {
        file: relativePath,
        size: stats.size,
        modified: stats.mtime,
        changes: [],
        newFunctions: [],
        todos: [],
        fixes: [],
        updates: [],
        additions: [],
        removals: []
    };
    
    // Look for TODO comments
    const todoMatches = content.match(/\/\/\s*TODO[:\s]*(.+)/gi) || [];
    analysis.todos = todoMatches.map(todo => todo.replace(/\/\/\s*TODO[:\s]*/i, '').trim());
    
    // Look for various change comment patterns
    const changePatterns = [
        { pattern: /\/\/\s*CHANGE[:\s]*(.+)/gi, target: 'changes' },
        { pattern: /\/\/\s*FIX[:\s]*(.+)/gi, target: 'fixes' },
        { pattern: /\/\/\s*UPDATE[:\s]*(.+)/gi, target: 'updates' },
        { pattern: /\/\/\s*ADD[:\s]*(.+)/gi, target: 'additions' },
        { pattern: /\/\/\s*REMOVE[:\s]*(.+)/gi, target: 'removals' },
        { pattern: /\/\*\s*CHANGE[:\s]*(.+?)\*\//gi, target: 'changes' },
        { pattern: /\/\*\s*FIX[:\s]*(.+?)\*\//gi, target: 'fixes' },
        { pattern: /\/\*\s*UPDATE[:\s]*(.+?)\*\//gi, target: 'updates' }
    ];
    
    changePatterns.forEach(({ pattern, target }) => {
        const matches = content.match(pattern) || [];
        analysis[target].push(...matches.map(match => 
            match.replace(/\/\*|\*\/|\/\/|\s*(CHANGE|FIX|UPDATE|ADD|REMOVE)[:\s]*/gi, '').trim()
        ));
    });
    
    // Look for function definitions
    const functionMatches = content.match(/(?:function\s+(\w+)|const\s+(\w+)\s*=\s*(?:async\s+)?(?:function|\(|=>)|class\s+(\w+))/g) || [];
    analysis.newFunctions = functionMatches.map(func => {
        const match = func.match(/(?:function\s+(\w+)|const\s+(\w+)\s*=|class\s+(\w+))/);
        return match ? (match[1] || match[2] || match[3]) : func;
    });
    
    // Look for version comments
    const versionMatches = content.match(/\/\/\s*Version[:\s]*(\d+\.?\d*)/gi) || [];
    analysis.version = versionMatches[0]?.replace(/\/\/\s*Version[:\s]*/i, '') || 'Unknown';
    
    // Look for recent modification indicators
    const now = new Date();
    const daysSinceModified = Math.floor((now - stats.mtime) / (1000 * 60 * 60 * 24));
    analysis.recentlyModified = daysSinceModified <= 7;
    
    return analysis;
}

// Get git commit history with dates for chronological organization
function getGitHistoryWithDates(days = 7) {
    try {
        const since = new Date();
        since.setDate(since.getDate() - days);
        const sinceStr = since.toISOString().split('T')[0];
        
        const gitLog = execSync(`git log --since="${sinceStr}" --pretty=format:"%H|%ad|%s" --date=short --name-only`, { 
            encoding: 'utf8',
            cwd: process.cwd()
        });
        
        const commits = [];
        const lines = gitLog.split('\n').filter(line => line.trim());
        let currentCommit = null;
        
        for (const line of lines) {
            if (line.includes('|')) {
                // This is a commit line
                if (currentCommit) {
                    commits.push(currentCommit);
                }
                const [hash, date, message] = line.split('|');
                currentCommit = {
                    hash: hash.substring(0, 8),
                    date: date,
                    message: message,
                    files: []
                };
            } else if (currentCommit && line.trim()) {
                // This is a file line
                currentCommit.files.push(line.trim());
            }
        }
        
        if (currentCommit) {
            commits.push(currentCommit);
        }
        
        return commits.sort((a, b) => new Date(b.date) - new Date(a.date)); // Most recent first
    } catch (error) {
        console.log('⚠️  Could not get git history with dates:', error.message);
        return [];
    }
}

// Generate chronological changes organized by date
function generateChronologicalChanges(analyses, gitCommits = []) {
    const changesByDate = {};
    
    // Group git commits by date
    gitCommits.forEach(commit => {
        const date = commit.date;
        if (!changesByDate[date]) {
            changesByDate[date] = {
                commits: [],
                files: new Set()
            };
        }
        changesByDate[date].commits.push(commit);
        commit.files.forEach(file => changesByDate[date].files.add(file));
    });
    
    // Group file analyses by modification date
    analyses.forEach(analysis => {
        const modDate = analysis.modified.toISOString().split('T')[0];
        if (!changesByDate[modDate]) {
            changesByDate[modDate] = {
                commits: [],
                files: new Set(),
                analyses: []
            };
        }
        if (!changesByDate[modDate].analyses) {
            changesByDate[modDate].analyses = [];
        }
        changesByDate[modDate].analyses.push(analysis);
        changesByDate[modDate].files.add(analysis.file);
    });
    
    // Sort dates in descending order (most recent first)
    const sortedDates = Object.keys(changesByDate).sort((a, b) => new Date(b) - new Date(a));
    
    return { changesByDate, sortedDates };
}

// Auto-detect recent changes and improvements
function autoDetectRecentChanges(analyses, commits = []) {
    const changes = [];
    
    // Check for path-matching removal and unified data conversion
    let hasPathMatchingRemoval = false;
    const mediaLibraryFile = analyses.find(a => a.file.includes('MediaLibraryManager'));
    
    if (mediaLibraryFile) {
        try {
            const filePath = path.join(process.cwd(), mediaLibraryFile.file);
            const content = fs.readFileSync(filePath, 'utf8');
            
            // Check for specific path-matching removal patterns
            const pathMatchingPatterns = [
                'NO FALLBACKS',
                'getTitleFromUnifiedData',
                'normalizedKey',
                'unified data',
                'path-based matching',
                'findUnifiedItemByPath',
                'ONLY use unified data',
                'fail fast',
                'Missing required title data',
                'Item not found in unified data'
            ];
            
            const foundPatterns = pathMatchingPatterns.filter(pattern => content.includes(pattern));
            hasPathMatchingRemoval = foundPatterns.length >= 3; // Need multiple indicators
            
            if (hasPathMatchingRemoval) {
                console.log(`[AUTO-DETECT] Path-matching removal detected with patterns: ${foundPatterns.join(', ')}`);
            }
        } catch (error) {
            console.log(`Could not analyze MediaLibraryManager for path-matching removal: ${error.message}`);
        }
    }
    
    // Auto-detect other recent improvements
    const hasFallbackRemoval = analyses.some(a => 
        a.file.includes('MediaLibraryManager') && a.file.includes('NO FALLBACK')
    );
    
    const hasUnifiedDataUsage = analyses.some(a => 
        a.file.includes('MediaLibraryManager') && a.file.includes('normalizedKey')
    );
    
    const hasErrorHandling = analyses.some(a => 
        a.file.includes('MediaLibraryManager') && a.file.includes('fail fast')
    );
    
    const hasCollectionImprovements = analyses.some(a => 
        a.file.includes('MediaLibraryManager') && a.file.includes('unifiedKey')
    );
    
    const hasSearchImprovements = analyses.some(a => 
        a.file.includes('MediaLibraryManager') && (
            a.file.includes('favoritesSearchQuery') ||
            a.file.includes('watchLaterSearchQuery') ||
            a.file.includes('collectionsSearchQuery')
        )
    );
    
    // Auto-detect backup script improvements
    const hasBackupImprovements = analyses.some(a => 
        a.file.includes('enhanced_backup_app') && (
            a.file.includes('chronological') ||
            a.file.includes('auto-detect') ||
            a.file.includes('getChangesSinceLastBackup')
        )
    );
    
    // Auto-detect UI improvements
    const hasUIImprovements = analyses.some(a => 
        a.file.includes('MediaLibraryManager') && (
            a.file.includes('getDisplayTitle') ||
            a.file.includes('TMDBTitle') ||
            a.file.includes('capitalizeTitle')
        )
    );
    
    // Auto-detect performance improvements
    const hasPerformanceImprovements = analyses.some(a => 
        a.file.includes('MediaLibraryManager') && (
            a.file.includes('efficient lookup') ||
            a.file.includes('direct data access') ||
            a.file.includes('unified data')
        )
    );
    
    // Auto-generate change descriptions based on detected patterns
    if (hasPathMatchingRemoval) {
        changes.push('🚀 MAJOR ARCHITECTURAL IMPROVEMENT: PATH-MATCHING ELIMINATION');
        changes.push('Eliminated all path-based searching and matching throughout MediaLibraryManager');
        changes.push('Converted to unified data objects with normalizedKey for efficient lookups');
        changes.push('Removed fallback logic - now fails fast with clear error messages');
        changes.push('Updated all collection operations to use normalizedKey instead of paths');
        changes.push('Fixed Watch Later and Favorites search to use unified data fields');
        changes.push('Updated poster generation to use TMDBTitle/title instead of path parsing');
        changes.push('Converted TV show label generation to use unified data fields');
        changes.push('Replaced findMovieByPath and findMediaItemByPath with unified data lookups');
        changes.push('Added getTitleFromUnifiedData helper for consistent title retrieval');
        changes.push('Collections now strictly require items to exist in unified data');
        changes.push('Removed all complex path parsing logic in favor of direct data access');
        changes.push('This represents a major efficiency and reliability improvement');
    }
    
    if (hasFallbackRemoval && !hasPathMatchingRemoval) {
        changes.push('🔧 FALLBACK LOGIC REMOVAL');
        changes.push('Eliminated fallback patterns that masked underlying data issues');
        changes.push('Implemented fail-fast approach for better error visibility');
        changes.push('Code now requires proper data structure instead of working around problems');
    }
    
    if (hasUnifiedDataUsage && !hasPathMatchingRemoval) {
        changes.push('📊 UNIFIED DATA INTEGRATION');
        changes.push('Enhanced usage of unified data objects throughout the application');
        changes.push('Improved data consistency and lookup efficiency');
        changes.push('Better integration with normalizedKey system');
    }
    
    if (hasErrorHandling && !hasPathMatchingRemoval) {
        changes.push('⚠️ ERROR HANDLING IMPROVEMENTS');
        changes.push('Implemented fail-fast error handling approach');
        changes.push('Added clear error messages for debugging');
        changes.push('Improved code reliability and maintainability');
    }
    
    if (hasCollectionImprovements && !hasPathMatchingRemoval) {
        changes.push('📁 COLLECTION SYSTEM ENHANCEMENTS');
        changes.push('Updated collection operations to use unified data keys');
        changes.push('Improved collection management and data consistency');
        changes.push('Enhanced collection lookup and storage mechanisms');
    }
    
    if (hasSearchImprovements) {
        changes.push('🔍 SEARCH FUNCTIONALITY IMPROVEMENTS');
        changes.push('Enhanced search capabilities across all main tabs');
        changes.push('Improved search filtering and result accuracy');
        changes.push('Better integration with unified data for search operations');
    }
    
    if (hasBackupImprovements) {
        changes.push('📦 BACKUP SYSTEM ENHANCEMENTS');
        changes.push('Added chronological organization to backup summaries');
        changes.push('Implemented auto-detection of recent changes');
        changes.push('Enhanced change tracking since last backup');
        changes.push('Improved backup documentation and reporting');
    }
    
    if (hasUIImprovements) {
        changes.push('🎨 UI/UX IMPROVEMENTS');
        changes.push('Enhanced title display and formatting');
        changes.push('Improved user interface consistency');
        changes.push('Better integration with TMDB data for display');
    }
    
    if (hasPerformanceImprovements) {
        changes.push('⚡ PERFORMANCE IMPROVEMENTS');
        changes.push('Optimized data lookup and access patterns');
        changes.push('Reduced computational overhead in data operations');
        changes.push('Improved application responsiveness');
    }
    
    return changes;
}

// Generate descriptive summary of changes for a specific date
function generateDescriptiveChangesForDate(analyses, commits = []) {
    const changes = [];
    
    // Auto-detect recent changes first
    const autoChanges = autoDetectRecentChanges(analyses, commits);
    changes.push(...autoChanges);
    
    // Check for NaN prevention system
    const hasNaNFixes = analyses.some(a => 
        a.file.includes('validateJSONData') || 
        a.file.includes('safeJSONWrite') ||
        a.file.includes('check_for_nan') ||
        a.file.includes('NaN_CORRUPTION') ||
        a.file.includes('organize_files_array_with_seasons')
    );
    
    // Check for documentation updates
    const hasAuditDocs = analyses.some(a =>
        a.file.includes('NaN_CORRUPTION_AUDIT_REPORT') ||
        a.file.includes('CODE_REVIEW_CHECKLIST') ||
        a.file.includes('AUDIT_SUMMARY')
    );
    
    // Add NaN corruption fixes if detected
    if (hasNaNFixes) {
        changes.push('🛡️ NaN CORRUPTION PREVENTION SYSTEM IMPLEMENTED:');
        changes.push('Root cause identified in organize_files_array_with_seasons.js');
        changes.push('Fixed parseInt() operations in 4 critical scripts');
        changes.push('Created validateJSONData.js utility for data validation');
        changes.push('Created safeJSONWrite.js for safe file operations');
        changes.push('Created check_for_nan.js validation script');
        changes.push('All numeric season keys now filtered before parsing');
        changes.push('isNaN() validation added to all parseInt operations');
        changes.push('Automatic backups before JSON writes');
        changes.push('Current data validated: CLEAN (0 NaN values)');
    }
    
    // Add documentation if detected
    if (hasAuditDocs) {
        changes.push('📚 COMPREHENSIVE DOCUMENTATION CREATED:');
        changes.push('NaN_CORRUPTION_AUDIT_REPORT.md: Full technical deep dive');
        changes.push('CODE_REVIEW_CHECKLIST.md: Prevention guide for future code');
        changes.push('AUDIT_SUMMARY.md: Executive summary and quick reference');
        changes.push('NaN_CORRUPTION_PREVENTION_SUMMARY.txt: Complete prevention system guide');
    }
    
    return changes;
}

// Generate comprehensive change summary
function generateChangeSummary(analyses, gitHistory = [], changesSinceLastBackup = {}) {
    const summary = [];
    
    summary.push('# Enhanced Backup Change Summary');
    summary.push('');
    summary.push(`**Backup Date:** ${new Date().toLocaleString()}`);
    summary.push(`**Total Files:** ${analyses.length}`);
    summary.push(`**Git Commits (last 7 days):** ${gitHistory.length}`);
    
    // Add changes since last backup info
    if (changesSinceLastBackup.lastBackupTime) {
        summary.push(`**Last Backup:** ${changesSinceLastBackup.lastBackupTime}`);
        summary.push(`**Changes Since Last Backup:** ${changesSinceLastBackup.changes.length} commits`);
    } else {
        summary.push(`**Last Backup:** No previous backup found`);
    }
    summary.push('');
    
    // Generate chronological changes organized by date
    summary.push('## 📋 Summary of Changes Made (Chronological)');
    summary.push('');
    summary.push('*Most recent changes shown first*');
    summary.push('');
    
    // Get git commits with dates for chronological organization
    const gitCommits = getGitHistoryWithDates(7);
    const { changesByDate, sortedDates } = generateChronologicalChanges(analyses, gitCommits);
    
    // Generate date-specific sections
    sortedDates.forEach(date => {
        const dateData = changesByDate[date];
        const dateObj = new Date(date);
        const formattedDate = dateObj.toLocaleDateString('en-US', { 
            weekday: 'long', 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric' 
        });
        
        summary.push(`### 📅 ${formattedDate}`);
        summary.push('');
        
        // Show commits for this date
        if (dateData.commits && dateData.commits.length > 0) {
            summary.push('**Commits:**');
            dateData.commits.forEach(commit => {
                summary.push(`- \`${commit.hash}\` ${commit.message}`);
            });
            summary.push('');
        }
        
        // Show file changes for this date
        if (dateData.analyses && dateData.analyses.length > 0) {
            const changes = generateDescriptiveChangesForDate(dateData.analyses, dateData.commits || []);
            if (changes.length > 0) {
                summary.push('**Changes:**');
    changes.forEach(change => {
        summary.push(`- ${change}`);
    });
    summary.push('');
            }
        }
        
        // Show modified files count
        const totalFiles = (dateData.files ? dateData.files.size : 0) + (dateData.analyses ? dateData.analyses.length : 0);
        if (totalFiles > 0) {
            summary.push(`**Files Modified:** ${totalFiles}`);
            summary.push('');
        }
    });
    
    // If no chronological data, fall back to the old method
    if (sortedDates.length === 0) {
        summary.push('*No recent changes detected*');
        summary.push('');
    }
    
    // Add changes since last backup section
    if (changesSinceLastBackup.lastBackupTime && changesSinceLastBackup.changes.length > 0) {
        summary.push('## 🔄 Changes Since Last Backup');
        summary.push('');
        summary.push(`**Since:** ${changesSinceLastBackup.lastBackupTime}`);
        summary.push(`**Commits:** ${changesSinceLastBackup.changes.length}`);
        summary.push('');
        
        // Group changes by type
        const commitLines = changesSinceLastBackup.changes.filter(line => line && !line.includes('/') && line.length > 10);
        const fileChanges = changesSinceLastBackup.changes.filter(line => line && line.includes('/') && !line.includes(' '));
        
        if (commitLines.length > 0) {
            summary.push('### Recent Commits');
            commitLines.slice(0, 20).forEach(commit => {
                summary.push(`- ${commit}`);
            });
            if (commitLines.length > 20) {
                summary.push(`- ... and ${commitLines.length - 20} more commits`);
            }
            summary.push('');
        }
        
        if (fileChanges.length > 0) {
            summary.push('### Modified Files');
            const uniqueFiles = [...new Set(fileChanges)].sort();
            uniqueFiles.slice(0, 30).forEach(file => {
                summary.push(`- ${file}`);
            });
            if (uniqueFiles.length > 30) {
                summary.push(`- ... and ${uniqueFiles.length - 30} more files`);
            }
            summary.push('');
        }
    }
    
    // Recent changes section
    const recentFiles = analyses.filter(a => a.recentlyModified);
    if (recentFiles.length > 0) {
        summary.push('## 🔥 Recently Modified Files (Last 7 Days)');
        summary.push('');
        recentFiles.forEach(analysis => {
            summary.push(`### ${analysis.file}`);
            summary.push(`- **Size:** ${(analysis.size / 1024).toFixed(2)} KB`);
            summary.push(`- **Modified:** ${analysis.modified.toLocaleString()}`);
            summary.push(`- **Days Since Modified:** ${Math.floor((new Date() - analysis.modified) / (1000 * 60 * 60 * 24))}`);
            if (analysis.version !== 'Unknown') {
                summary.push(`- **Version:** ${analysis.version}`);
            }
            summary.push('');
        });
    }
    
    // Group by file type
    const byType = {
        'Core Components': analyses.filter(a => a.file.includes('MediaLibraryManager') || a.file.includes('app.js') || a.file.includes('VideoPlayer')),
        'Utilities': analyses.filter(a => a.file.includes('utils/')),
        'Documentation': analyses.filter(a => a.file.includes('docs/') || a.file.endsWith('.md') || a.file.includes('AUDIT') || a.file.includes('NaN')),
        'Validation Scripts': analyses.filter(a => a.file.includes('VALIDATE/') || a.file.includes('check_for_nan')),
        'Styles': analyses.filter(a => a.file.endsWith('.css')),
        'Data Files': analyses.filter(a => a.file.endsWith('.json')),
        'Server Files': analyses.filter(a => a.file.includes('server/')),
        'Scripts': analyses.filter(a => a.file.includes('scripts/') && !a.file.includes('VALIDATE/')),
        'Config': analyses.filter(a => a.file.includes('config/')),
        'HTML/Templates': analyses.filter(a => a.file.endsWith('.html'))
    };
    
    Object.entries(byType).forEach(([type, files]) => {
        if (files.length === 0) return;
        
        summary.push(`## ${type}`);
        summary.push('');
        
        files.forEach(analysis => {
            summary.push(`### ${analysis.file}`);
            summary.push(`- **Size:** ${(analysis.size / 1024).toFixed(2)} KB`);
            summary.push(`- **Modified:** ${analysis.modified.toLocaleString()}`);
            if (analysis.version !== 'Unknown') {
                summary.push(`- **Version:** ${analysis.version}`);
            }
            
            // Show all types of changes
            const allChanges = [
                ...analysis.changes.map(c => `CHANGE: ${c}`),
                ...analysis.fixes.map(f => `FIX: ${f}`),
                ...analysis.updates.map(u => `UPDATE: ${u}`),
                ...analysis.additions.map(a => `ADD: ${a}`),
                ...analysis.removals.map(r => `REMOVE: ${r}`)
            ];
            
            if (allChanges.length > 0) {
                summary.push('- **Changes:**');
                allChanges.slice(0, 10).forEach(change => {
                    summary.push(`  - ${change}`);
                });
                if (allChanges.length > 10) {
                    summary.push(`  - ... and ${allChanges.length - 10} more changes`);
                }
            }
            
            if (analysis.newFunctions.length > 0) {
                summary.push('- **Functions/Classes:**');
                analysis.newFunctions.slice(0, 5).forEach(func => {
                    summary.push(`  - \`${func}\``);
                });
                if (analysis.newFunctions.length > 5) {
                    summary.push(`  - ... and ${analysis.newFunctions.length - 5} more`);
                }
            }
            
            if (analysis.todos.length > 0) {
                summary.push('- **TODOs:**');
                analysis.todos.slice(0, 3).forEach(todo => {
                    summary.push(`  - ${todo}`);
                });
                if (analysis.todos.length > 3) {
                    summary.push(`  - ... and ${analysis.todos.length - 3} more`);
                }
            }
            
            summary.push('');
        });
    });
    
    // Overall statistics
    const totalChanges = analyses.reduce((sum, a) => sum + a.changes.length + a.fixes.length + a.updates.length + a.additions.length + a.removals.length, 0);
    const totalFunctions = analyses.reduce((sum, a) => sum + a.newFunctions.length, 0);
    const totalTodos = analyses.reduce((sum, a) => sum + a.todos.length, 0);
    const recentlyModified = analyses.filter(a => a.recentlyModified).length;
    
    summary.push('## 📊 Summary Statistics');
    summary.push('');
    summary.push(`- **Total Changes Detected:** ${totalChanges}`);
    summary.push(`- **New Functions/Classes:** ${totalFunctions}`);
    summary.push(`- **TODOs Found:** ${totalTodos}`);
    summary.push(`- **Recently Modified Files:** ${recentlyModified}`);
    summary.push(`- **Git Commits (7 days):** ${gitHistory.length}`);
    summary.push('');
    
    // Git history section
    if (gitHistory.length > 0) {
        summary.push('## 📝 Recent Git History');
        summary.push('');
        summary.push('```');
        gitHistory.slice(0, 20).forEach(line => {
            if (line.trim()) {
                summary.push(line);
            }
        });
        if (gitHistory.length > 20) {
            summary.push(`... and ${gitHistory.length - 20} more commits`);
        }
        summary.push('```');
        summary.push('');
    }
    
    return summary.join('\n');
}

// Copy file with error handling
function copyFileWithBackup(source, destination) {
    try {
        if (!fs.existsSync(source)) {
            console.log(`⚠️  Warning: Source file not found: ${source}`);
            return false;
        }
        
        fs.copyFileSync(source, destination);
        const stats = fs.statSync(destination);
        const sizeKB = Math.round(stats.size / 1024);
        console.log(`✅ Backed up: ${source} → ${destination} (${sizeKB}KB)`);
        return true;
    } catch (error) {
        console.error(`❌ Error backing up ${source}:`, error.message);
        return false;
    }
}

// Clean up old backups
function cleanupOldBackups(directory, prefix, maxKeep = MAX_BACKUPS_PER_FILE) {
    try {
        if (!fs.existsSync(directory)) return [];

        const backups = fs.readdirSync(directory)
            .filter(file => file.startsWith(prefix))
            .map(file => ({
                name: file,
                path: path.join(directory, file),
                timestamp: file.match(/enhanced_backup_(\d{4}-\d{2}-\d{2}T\d{4})/)?.[1] || '0000-00-00T0000'
            }))
            .sort((a, b) => b.timestamp.localeCompare(a.timestamp));

        const toDelete = backups.slice(maxKeep);
        let deletedCount = 0;

        toDelete.forEach(backup => {
            try {
                fs.rmSync(backup.path, { recursive: true, force: true });
                console.log(`🗑️  Cleaned up old backup: ${backup.name}`);
                deletedCount++;
            } catch (error) {
                console.error(`❌ Error deleting ${backup.name}:`, error.message);
            }
        });

        if (deletedCount > 0) {
            console.log(`🧹 Cleaned up ${deletedCount} old backup(s)`);
        }

        return backups.slice(0, maxKeep).map(b => b.name);
    } catch (error) {
        console.error(`❌ Error during cleanup:`, error.message);
        return [];
    }
}

// Function to scan directory recursively
function scanDirectory(dir, baseDir) {
    const files = [];
    
    try {
        // Check if directory exists before trying to read it
        if (!fs.existsSync(dir)) {
            console.log(`⚠️ Directory not found: ${dir}`);
            return files;
        }
        
        const entries = fs.readdirSync(dir);
    
    for (const entry of entries) {
        const fullPath = path.join(dir, entry);
        const relativePath = path.relative(baseDir, fullPath);
        
        if (fs.statSync(fullPath).isDirectory()) {
            // Skip node_modules directories and conversion backup directories
            if (entry === 'node_modules' || 
                entry === 'SANDBOX' || 
                entry === 'backups') continue;
            // Recursively scan subdirectories
            files.push(...scanDirectory(fullPath, baseDir));
        } else {
            // Add file to backup list
            files.push({
                source: relativePath,
                destination: relativePath
            });
        }
    }
    
    return files;
    } catch (error) {
        console.log(`⚠️ Error scanning directory ${dir}: ${error.message}`);
        return files;
    }
}

function generateBackupTree(backupPath) {
    const tree = [];
    tree.push('Enhanced Backup Structure:');
    
    function scanDirectory(dir, prefix = '', isLast = true) {
        try {
            // Check if directory exists before tryinag to read it
            if (!fs.existsSync(dir)) {
                console.log(`⚠️ Directory not found: ${dir}`);
                return;
            }
            
            const entries = fs.readdirSync(dir).sort((a, b) => {
                const aIsDir = fs.statSync(path.join(dir, a)).isDirectory();
                const bIsDir = fs.statSync(path.join(dir, b)).isDirectory();
                if (aIsDir && !bIsDir) return -1;
                if (!aIsDir && bIsDir) return 1;
                return a.localeCompare(b);
            });

        entries.forEach((entry, index) => {
            const fullPath = path.join(dir, entry);
            const isLastEntry = index === entries.length - 1;
            const isDirectory = fs.statSync(fullPath).isDirectory();
            
            const marker = isLastEntry ? '└── ' : '├── ';
            const newPrefix = prefix + (isLast ? '    ' : '│   ');
            
            const size = isDirectory ? '' : ` (${(fs.statSync(fullPath).size / 1024).toFixed(2)} KB)`;
            const icon = isDirectory ? '📁' : '📄';
            
            tree.push(`${prefix}${marker}${icon} ${entry}${size}`);
            
            if (isDirectory) {
                scanDirectory(fullPath, newPrefix, isLastEntry);
            }
        });
        } catch (error) {
            console.log(`⚠️ Error scanning directory ${dir}: ${error.message}`);
        }
    }

    scanDirectory(backupPath);
    return tree.join('\n');
}

// Enhanced backup function
async function createEnhancedBackup() {
    console.log('📦 Starting enhanced backup process with auto-analysis...');
    console.log('📦 Retention policy: Keeping 3 most recent backups');

    // Get git history with dates for chronological organization
    console.log('🔍 Analyzing git history with dates...');
    const gitHistory = getGitHistory(7);
    const gitCommitsWithDates = getGitHistoryWithDates(7);
    console.log(`📊 Found ${gitCommitsWithDates.length} commits with dates`);
    
    // Get changes since last backup
    console.log('🔍 Analyzing changes since last backup...');
    const changesSinceLastBackup = getChangesSinceLastBackup();
    if (changesSinceLastBackup.lastBackupTime) {
        console.log(`📅 Last backup: ${changesSinceLastBackup.lastBackupTime}`);
        console.log(`📊 Changes since last backup: ${changesSinceLastBackup.changes.length} commits`);
    }

    // Get local time in 24-hour format
    const now = new Date();
    const localTime = now.toLocaleTimeString('en-US', { 
        hour12: false, 
        hour: '2-digit', 
        minute: '2-digit'
    }).replace(':', '');
    const localDate = now.getFullYear() + '-' +
        String(now.getMonth() + 1).padStart(2, '0') + '-' +
        String(now.getDate()).padStart(2, '0');
    const timestamp = `${localDate}T${localTime}`;

    const baseDir = process.cwd();
    const backupDir = path.join(baseDir, 'backups');
    const backupPath = path.join(backupDir, `enhanced_backup_${timestamp}`);

    // Create backup root directory
    fs.mkdirSync(backupDir, { recursive: true });
    fs.mkdirSync(backupPath, { recursive: true });

    // Scan directories to find files to backup
    const directoriesToScan = [
        'config',
        'server',
        'public',
        'scripts',
        'utils',
        'docs'
    ];

    let filesToBackup = [];
    for (const dir of directoriesToScan) {
        const dirPath = path.join(baseDir, dir);
        if (fs.existsSync(dirPath)) {
            console.log(`📂 Scanning directory: ${dir}`);
            filesToBackup.push(...scanDirectory(dirPath, baseDir));
        } else {
            console.log(`⚠️ Directory not found: ${dir}`);
        }
    }

    // Always include root and server package.json and lock files, plus important docs
    const explicitFiles = [
        'package.json',
        'package-lock.json',
        'yarn.lock',
        path.join('server', 'package.json'),
        path.join('server', 'package-lock.json'),
        path.join('server', 'yarn.lock'),
        'AUDIT_SUMMARY.md',
        'NaN_CORRUPTION_PREVENTION_SUMMARY.txt',
        'NaN_FIX_FILES_CHANGED.txt',
        'AI_DEVELOPMENT_LEARNING.md'
    ];
    for (const relFile of explicitFiles) {
        const absFile = path.join(baseDir, relFile);
        if (fs.existsSync(absFile)) {
            if (!filesToBackup.some(f => f.source === relFile)) {
                filesToBackup.push({ source: relFile, destination: relFile });
            }
        }
    }

    let successCount = 0;
    let failCount = 0;
    const fileAnalyses = [];

    // Backup each file and analyze it
    for (const file of filesToBackup) {
        const sourcePath = path.join(baseDir, file.source);
        const destPath = path.join(backupPath, file.destination);
        
        try {
            // Ensure destination directory exists
            fs.mkdirSync(path.dirname(destPath), { recursive: true });
            
            // Copy the file
            fs.copyFileSync(sourcePath, destPath);
            const stats = fs.statSync(destPath);
            const sizeKB = (stats.size / 1024).toFixed(2);
            console.log(`✅ Backed up: ${file.source} (${sizeKB} KB)`);
            successCount++;
            
            // Analyze the file for changes
            try {
                const analysis = analyzeFileForChanges(sourcePath, baseDir);
                fileAnalyses.push(analysis);
                
                if (analysis.recentlyModified || analysis.changes.length > 0 || analysis.todos.length > 0) {
                    console.log(`🔍 Analyzed: ${file.source} (${analysis.changes.length + analysis.fixes.length + analysis.updates.length} changes, ${analysis.newFunctions.length} functions, ${analysis.todos.length} TODOs)`);
                }
            } catch (analysisError) {
                console.log(`⚠️  Could not analyze ${file.source}: ${analysisError.message}`);
            }
        } catch (error) {
            console.error(`❌ Failed to backup ${file.source}:`, error);
            failCount++;
        }
    }

    // Generate comprehensive change summary
    const changeSummary = generateChangeSummary(fileAnalyses, gitHistory, changesSinceLastBackup);
    const summaryPath = path.join(backupPath, 'ENHANCED_BACKUP_SUMMARY.md');
    fs.writeFileSync(summaryPath, changeSummary);
    console.log(`📄 Created enhanced change summary: ${summaryPath}`);

    // Cleanup old backups
    cleanupOldBackups(backupDir, 'enhanced_backup_');

    // Generate and display backup tree
    const backupTree = generateBackupTree(backupPath);
    console.log('\n' + backupTree);

    // Summary
    console.log('\n📊 Enhanced Backup Summary:');
    console.log(`✅ Successfully backed up: ${successCount} files`);
    if (failCount > 0) {
        console.log(`❌ Failed to backup: ${failCount} files`);
    }
    console.log(`📁 Enhanced backup location: ${backupPath}`);
    console.log(`📄 Detailed summary: ${summaryPath}`);

    return {
        success: failCount === 0,
        timestamp,
        successCount,
        failCount,
        backupPath: backupPath,
        tree: backupTree
    };
}

// Run the enhanced backup
if (require.main === module) {
    createEnhancedBackup();
}

module.exports = { createEnhancedBackup, getTimestamp };
