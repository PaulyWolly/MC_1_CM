# 🔍 CODE REVIEW CHECKLIST

## ⚠️ CRITICAL: Preventing NaN Corruption

Before committing ANY code that modifies JSON data files, verify the following:

---

## 📋 NaN Prevention Checklist

### **1. parseInt() Usage**
- [ ] **Every `parseInt()` call is validated with `isNaN()` check**
  ```javascript
  // ❌ DANGEROUS:
  const num = parseInt(value);
  
  // ✅ SAFE:
  const num = parseInt(value);
  if (isNaN(num)) {
    // Handle the error case
  }
  ```

- [ ] **No arithmetic operations directly on `parseInt()` results**
  ```javascript
  // ❌ DANGEROUS:
  return parseInt(a) - parseInt(b);
  
  // ✅ SAFE:
  const numA = parseInt(a);
  const numB = parseInt(b);
  if (isNaN(numA) || isNaN(numB)) return 0;
  return numA - numB;
  ```

### **2. Array Sorting with Numbers**
- [ ] **All `.sort()` comparisons validate numeric values**
  ```javascript
  // ❌ DANGEROUS:
  array.sort((a, b) => parseInt(a) - parseInt(b));
  
  // ✅ SAFE:
  array.sort((a, b) => {
    const numA = parseInt(a);
    const numB = parseInt(b);
    if (isNaN(numA) || isNaN(numB)) return 0;
    return numA - numB;
  });
  ```

### **3. Object Key Filtering**
- [ ] **Filter out non-numeric keys BEFORE parseInt operations**
  ```javascript
  // ❌ DANGEROUS:
  Object.keys(seasons).forEach(seasonNum => {
    const parsed = parseInt(seasonNum);  // May be NaN!
  });
  
  // ✅ SAFE:
  Object.keys(seasons)
    .filter(key => !isNaN(parseInt(key)))
    .forEach(seasonNum => {
      const parsed = parseInt(seasonNum);  // Guaranteed to be valid
    });
  ```

### **4. JSON Writing**
- [ ] **Use `safeJSONWrite()` instead of `fs.writeFileSync()`**
  ```javascript
  // ❌ DANGEROUS:
  fs.writeFileSync(path, JSON.stringify(data, null, 2));
  
  // ✅ SAFE:
  const { safeJSONWrite } = require('./utils/safeJSONWrite');
  const result = safeJSONWrite(path, data, { 
    validateTVShows: true,
    createBackup: true 
  });
  if (!result.success) {
    throw new Error(result.error);
  }
  ```

### **5. Data Validation**
- [ ] **Validate data BEFORE writing to JSON**
  ```javascript
  const { validateData } = require('./utils/validateJSONData');
  const validation = validateData(data, { validateTVShows: true });
  if (!validation.isValid) {
    console.error('Validation failed:', validation.errors);
    return;
  }
  ```

---

## 📊 JSON Data Structure Checklist

### **TV Shows Data (`tv-shows-unified.json`)**

- [ ] **Season keys can be non-numeric** (e.g., "Featurettes", "Specials", "Extras")
- [ ] **Always filter for numeric seasons when needed**
- [ ] **Episode numbers in files array MUST be numbers, not NaN**
- [ ] **Season numbers in files array MUST be numbers, not NaN**

### **Field Type Validation**
- [ ] `season` field: **number** (not NaN, not string)
- [ ] `episode` field: **number** (not NaN, not string)
- [ ] `TMDBId` field: **number or null** (not NaN)
- [ ] `voteAverage` field: **number or null** (not NaN)
- [ ] `voteCount` field: **number or null** (not NaN)

---

## 🧪 Testing Checklist

### **Before Committing:**
1. [ ] Run validation script:
   ```bash
   node scripts/VALIDATE/check_for_nan.js
   ```

2. [ ] Test with shows that have non-numeric seasons:
   - [ ] Grimm (has "Featurettes")
   - [ ] Buffy (has "Specials")
   - [ ] Any show with special content

3. [ ] Verify JSON integrity:
   ```bash
   node -e "JSON.parse(require('fs').readFileSync('./public/components/MediaLibrary/data/tv-shows/tv-shows-unified.json', 'utf8'))"
   ```

4. [ ] Check for literal "NaN" strings:
   ```bash
   grep -r "NaN" public/components/MediaLibrary/data/tv-shows/tv-shows-unified.json
   ```

---

## 🚨 Red Flags

Watch out for these dangerous patterns:

### **1. Unvalidated parseInt in Arithmetic**
```javascript
// 🚨 RED FLAG:
const result = parseInt(value1) - parseInt(value2);
```

### **2. Direct parseInt in Sort Comparator**
```javascript
// 🚨 RED FLAG:
array.sort((a, b) => parseInt(a) - parseInt(b));
```

### **3. Assuming All Object Keys Are Numeric**
```javascript
// 🚨 RED FLAG:
Object.keys(seasons).forEach(seasonNum => {
  const num = parseInt(seasonNum);  // May be "Featurettes"!
});
```

### **4. No Fallback for Failed parseInt**
```javascript
// 🚨 RED FLAG:
season: parseInt(seasonNum),  // Could be NaN!

// ✅ CORRECT:
season: isNaN(parseInt(seasonNum)) ? 0 : parseInt(seasonNum),
```

### **5. Raw JSON.stringify Without Validation**
```javascript
// 🚨 RED FLAG:
fs.writeFileSync(path, JSON.stringify(data, null, 2));
```

---

## ✅ Safe Patterns Library

### **Safe parseInt Pattern**
```javascript
function safeParseInt(value, defaultValue = 0) {
  const parsed = parseInt(value);
  return isNaN(parsed) ? defaultValue : parsed;
}
```

### **Safe Sort Pattern**
```javascript
function numericSort(a, b) {
  const numA = parseInt(a);
  const numB = parseInt(b);
  if (isNaN(numA) || isNaN(numB)) return 0;
  return numA - numB;
}
```

### **Safe Filter-Then-Sort Pattern**
```javascript
Object.keys(data)
  .filter(key => !isNaN(parseInt(key)))
  .sort(numericSort)
  .forEach(key => { /* process */ });
```

---

## 📝 Commit Message Requirements

When fixing NaN-related issues, include in commit message:
- `[NaN-FIX]` prefix
- Description of what was fixed
- Which files were affected
- Reference to validation test results

Example:
```
[NaN-FIX] Add parseInt validation to organize_files_array_with_seasons.js

- Added isNaN checks before all parseInt operations
- Filtered non-numeric season keys before processing
- Used safeJSONWrite for file operations
- Validated with check_for_nan.js script (PASSED)

Fixes: NaN corruption in files array for shows with Featurettes/Specials
```

---

## 🔧 Tools Available

1. **Validation Script:** `scripts/VALIDATE/check_for_nan.js`
2. **Safe Write Utility:** `utils/safeJSONWrite.js`
3. **Data Validator:** `utils/validateJSONData.js`
4. **Audit Report:** `docs/NaN_CORRUPTION_AUDIT_REPORT.md`

---

## 📞 Questions?

If unsure about any parseInt usage or numeric operations:
1. Check `docs/NaN_CORRUPTION_AUDIT_REPORT.md` for examples
2. Use safe patterns from this checklist
3. Run validation before committing
4. When in doubt, add extra isNaN checks

**Remember: It's better to be overly cautious than to corrupt data!**

