# Versioning System Guide

## Overview
This project uses a centralized versioning system to manage version headers across all files, preventing merge conflicts and ensuring consistency.

## Quick Start

### Update Core Files Only (Recommended)
```bash
npm run update-version:core
```

### Update All Files
```bash
npm run update-version:all
```

### Update Specific Components
```bash
npm run update-version:components
npm run update-version:scripts
```

## Version Configuration

The version information is centralized in `config/version.js`:

```javascript
export const VERSION_INFO = {
    version: "1.24.0",
    appName: "mc_1_cm",
    lastUpdated: "2025-09-08",
    buildNumber: "20250908-001",
    environment: "development"
};
```

## When to Update Versions

### ✅ Good Times
- After completing a major feature
- Before creating a release
- After merging to main/dev
- After significant refactoring

### ❌ Avoid
- During active development
- Before merging other changes
- In the middle of complex merges

## Update Strategies

### 1. Core Files Only (Default)
Updates only the most important files:
- `public/app.js`
- `server/server.js`
- `package.json`
- `README.md`

### 2. Components
Updates files in:
- `public/components/`
- `server/routes/`
- `server/models/`

### 3. Scripts
Updates files in:
- `scripts/` directory

### 4. All Files
Updates every file in the project

## Workflow Recommendations

### For Feature Development
1. Work on your feature
2. Test thoroughly
3. **Don't update versions yet**

### Before Creating PR
1. Update core files only:
   ```bash
   npm run update-version:core
   ```
2. Commit the version update
3. Create your PR

### After Successful Merge
1. Update all files:
   ```bash
   npm run update-version:all
   ```
2. Commit the full version update

## File Structure

```
config/
├── version.js              # Central version configuration
└── build-info.js           # Build metadata

scripts/UPDATE/
├── update_version_headers.js    # Main updater
├── update_core_files.js         # Core files only
└── update_all_files.js          # Master script
```

## Manual Version Updates

If you need to update the version manually:

1. Edit `config/version.js`
2. Run the appropriate update command
3. Review the changes
4. Commit the updates

## Troubleshooting

### Merge Conflicts
If you get merge conflicts from version updates:
1. Use `git merge -X ours` to favor your version
2. Run `npm run update-version:all` after merge
3. Commit the resolved versions

### Files Not Updated
Check that files:
- Have the correct extension (.js, .html, .css, .json)
- Are not in the skip list
- Exist in the target directories

### Version Mismatch
If versions are inconsistent:
1. Run `npm run update-version:all`
2. Check `config/version.js` is correct
3. Verify all files were updated

## Best Practices

1. **Always update core files first** before major merges
2. **Use the centralized version system** instead of manual updates
3. **Test after version updates** to ensure nothing broke
4. **Document version changes** in commit messages
5. **Keep version numbers consistent** across all files

## Examples

### Update to version 1.25.0
1. Edit `config/version.js`:
   ```javascript
   version: "1.25.0",
   lastUpdated: "2025-09-09"
   ```
2. Run: `npm run update-version:core`
3. Test your changes
4. Commit: `git commit -m "Bump version to 1.25.0"`

### After merging a feature
1. Run: `npm run update-version:all`
2. Review changes: `git diff`
3. Commit: `git commit -m "Update version headers after merge"`

This system prevents the massive merge conflicts you experienced and makes version management much easier!
