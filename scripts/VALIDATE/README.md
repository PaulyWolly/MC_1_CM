# Testing and Validation System

This directory contains tools to prevent breaking changes and ensure core functionality remains working.

## 🧪 Test Scripts

### `test_watch_later_functionality.js`
Tests the Watch Later functionality including:
- TV show vs movie filtering
- Path conversion logic
- TV show detection

**Run:** `node scripts/TEST/test_watch_later_functionality.js`

## 🔍 Validation Scripts

### `validate_core_functionality.js`
Comprehensive validation that runs:
- Syntax checks on critical files
- Functionality tests
- Pre-commit validation

**Run:** `node scripts/VALIDATE/validate_core_functionality.js`

### `analyze_change_impact.js`
Analyzes what might be affected by changes to specific files.

**Usage:**
```bash
# Analyze specific file
node scripts/VALIDATE/analyze_change_impact.js public/components/MediaLibrary/MediaLibraryManager.js

# Analyze last commit
node scripts/VALIDATE/analyze_change_impact.js --git

# Analyze staged changes
node scripts/VALIDATE/analyze_change_impact.js --staged

# Analyze all tracked files
node scripts/VALIDATE/analyze_change_impact.js --all
```

## 🚦 Git Hooks

### Pre-commit Hook
Automatically runs validation before each commit to prevent breaking changes.

**Location:** `.git/hooks/pre-commit`

**What it does:**
- Runs syntax checks on critical files
- Executes functionality tests
- Blocks commit if critical failures are detected

## 📋 Best Practices

### Before Making Changes
1. **Analyze Impact:** Run `analyze_change_impact.js` to see what might be affected
2. **Create Backup:** Consider backing up critical files
3. **Test Small:** Test changes on a small subset first

### Before Committing
1. **Run Validation:** Execute `validate_core_functionality.js`
2. **Manual Testing:** Test affected functionality manually
3. **Check Logs:** Review console logs for any warnings

### After Making Changes
1. **Run Tests:** Execute relevant test scripts
2. **Verify Functionality:** Test the specific feature you changed
3. **Check Integration:** Ensure related features still work

## 🎯 Critical Files

These files are considered critical and changes to them require extra validation:

- `public/components/MediaLibrary/MediaLibraryManager.js` - Core media library functionality
- `public/components/VideoPlayer/VideoPlayer.js` - Video player component
- `public/app.js` - Main application file

## 🚨 When Things Break

If functionality breaks after changes:

1. **Check Recent Changes:** Use `analyze_change_impact.js --git`
2. **Run Validation:** Execute `validate_core_functionality.js`
3. **Review Logs:** Check browser console and server logs
4. **Test Manually:** Verify the specific broken functionality
5. **Revert if Needed:** Use git to revert problematic changes

## 🔧 Adding New Tests

To add tests for new functionality:

1. Create test file in `scripts/TEST/`
2. Add to `validate_core_functionality.js` if critical
3. Update `analyze_change_impact.js` dependencies
4. Test thoroughly before committing

## 📊 Test Results

Tests provide clear pass/fail results with:
- ✅ **PASSED** - Functionality working correctly
- ❌ **FAILED** - Functionality broken, needs fixing
- ⚠️ **WARNING** - Potential issues, review needed

## 🎉 Success Indicators

When all systems are working correctly:
- All validation tests pass
- No critical failures detected
- Manual testing confirms functionality
- Console logs show no errors 