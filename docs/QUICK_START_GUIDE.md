# 🚀 QUICK START GUIDE - STANDARDS & CONSISTENCY

## **🎯 THE GOAL: NO MORE BREAKING CHANGES**

This guide shows you how to use the new standardized system to prevent regressions and maintain consistency.

---

## **📋 BEFORE YOU START CODING**

### **1. Check Current State**
```bash
# See what's working right now
node validate.js

# Establish a baseline of working functionality
node scripts/VALIDATE/check_functionality_baseline.js establish
```

### **2. Generate New Files (if needed)**
```bash
# Create a new script following standards
node scripts/TEMPLATES/generate_template.js script scan_new_movies

# Create a new component
node scripts/TEMPLATES/generate_template.js component NewFeature

# Create a new validation check
node scripts/TEMPLATES/generate_template.js validation check_new_feature
```

---

## **🔧 WHILE YOU'RE CODING**

### **1. Follow the Standards**
- **File Naming**: `action_target_specifier.js`
- **Data Structures**: `{ path: "", folders: [...] }`
- **Console Logs**: `[DEBUG - CONTEXT] Message`
- **File Headers**: Use the template format

### **2. Test After Each Change**
```bash
# Check for regressions
node scripts/VALIDATE/validate_existing_functionality.js

# Check standards compliance
node scripts/VALIDATE/enforce_standards.js
```

---

## **✅ BEFORE YOU PUSH TO GITHUB**

### **1. Full Validation**
```bash
# Comprehensive check
node validate.js

# Compare against baseline
node scripts/VALIDATE/check_functionality_baseline.js compare
```

### **2. Standards Check**
```bash
# Ensure all files follow standards
node scripts/VALIDATE/enforce_standards.js
```

---

## **🛠️ COMMON TASKS**

### **Adding a New Movie**
```bash
# 1. Scan for new movies
node scripts/SCAN/scan_media_library_movies.js

# 2. Validate the data
node validate.js

# 3. Test in browser
# 4. Push to GitHub
```

### **Fixing a Bug**
```bash
# 1. Establish baseline
node scripts/VALIDATE/check_functionality_baseline.js establish

# 2. Make the fix
# 3. Test the fix
node scripts/VALIDATE/validate_existing_functionality.js

# 4. Compare against baseline
node scripts/VALIDATE/check_functionality_baseline.js compare

# 5. Full validation
node validate.js
```

### **Creating a New Feature**
```bash
# 1. Generate template
node scripts/TEMPLATES/generate_template.js component NewFeature

# 2. Implement the feature
# 3. Test thoroughly
node scripts/VALIDATE/validate_existing_functionality.js

# 4. Check standards
node scripts/VALIDATE/enforce_standards.js

# 5. Validate everything
node validate.js
```

---

## **🚨 EMERGENCY PROCEDURES**

### **If Something Breaks**
```bash
# 1. Check what's broken
node validate.js

# 2. Compare against baseline
node scripts/VALIDATE/check_functionality_baseline.js compare

# 3. Fix the issue
# 4. Test the fix
node scripts/VALIDATE/validate_existing_functionality.js

# 5. Re-establish baseline
node scripts/VALIDATE/check_functionality_baseline.js establish
```

### **If Standards Are Violated**
```bash
# 1. Check what's wrong
node scripts/VALIDATE/enforce_standards.js

# 2. Fix violations
# 3. Re-check standards
node scripts/VALIDATE/enforce_standards.js
```

---

## **📊 SUCCESS METRICS**

### **✅ You're Doing It Right If:**
- `node validate.js` shows all ✅
- `node scripts/VALIDATE/enforce_standards.js` shows no violations
- No regressions after changes
- Clear, specific error messages

### **❌ You Need to Fix If:**
- Validation shows ❌
- Standards enforcement shows violations
- Existing functionality breaks
- Generic error messages

---

## **🎯 THE WORKFLOW SUMMARY**

```
1. ESTABLISH BASELINE
   ↓
2. MAKE CHANGES
   ↓
3. TEST CHANGES
   ↓
4. VALIDATE NO REGRESSIONS
   ↓
5. CHECK STANDARDS
   ↓
6. PUSH TO GITHUB
```

---

## **💡 PRO TIPS**

### **1. One Change at a Time**
- Make small, focused changes
- Test after each change
- Don't make multiple changes simultaneously

### **2. Use the Templates**
- Always use `generate_template.js` for new files
- Follow the naming conventions
- Use the standard file headers

### **3. Validate Frequently**
- Run validation after every change
- Don't wait until the end
- Catch issues early

### **4. Read the Error Messages**
- They're specific and actionable
- They tell you exactly what's wrong
- They show you how to fix it

---

## **📚 RESOURCES**

- **Standards**: `PROJECT_STANDARDS.md`
- **Maintenance**: `MAINTAINING_WORKING_CODE.md`
- **Templates**: `scripts/TEMPLATES/generate_template.js`
- **Validation**: `validate.js`

---

**🎯 REMEMBER: CONSISTENCY = RELIABILITY = NO MORE BREAKING CHANGES** 