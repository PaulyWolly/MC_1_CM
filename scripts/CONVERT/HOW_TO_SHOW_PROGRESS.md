# 🎬 How to Show Progress in Scripts

This guide explains how to add beautiful animated progress bars to any script using the `animation-helper.js` module.

## 📋 Quick Start

### 1. Import the Animation Helper
```javascript
const { ProgressAnimation } = require('./animation-helper');
```

### 2. Create an Animation Instance
```javascript
const animation = new ProgressAnimation('classic', 20);
```

### 3. Use in Your Loop
```javascript
for (let i = 0; i < items.length; i++) {
    const progressLine = animation.getCustomProgress(i + 1, items.length, 'Processing', '[PREFIX] ');
    console.log(`${progressLine} : ${items[i].name}`);
    // ... your processing code
}
```

## 🎨 Available Spinner Types

The animation helper provides 5 different spinner types:

| Type | Example | Description |
|------|---------|-------------|
| `classic` | ⠋⠙⠹⠸⠼⠴⠦⠧⠇⠏ | Braille dots (default) |
| `dots` | ⠋⠙⠹⠸⠼⠴⠦⠧⠇⠏ | Same as classic |
| `line` | \|/-\ | Simple rotating line |
| `simple` | . .. ... .... | Growing dots |
| `arrows` | ←↖↑↗→↘↓↙ | Rotating arrows |

## 📝 Usage Examples

### Example 1: Basic Progress Bar
```javascript
const { ProgressAnimation } = require('./animation-helper');

async function processFiles(files) {
    const animation = new ProgressAnimation('classic', 20);
    
    for (let i = 0; i < files.length; i++) {
        const progressLine = animation.getCustomProgress(i + 1, files.length, 'Processing', '[FILES] ');
        console.log(`${progressLine} : ${files[i].name}`);
        
        // Your processing code here
        await processFile(files[i]);
    }
}
```

**Output:**
```
[FILES] ⠋ Processing 3/10 [████████████░░░░░░░░] 30% : file3.txt
```

### Example 2: Different Spinner Types
```javascript
const { ProgressAnimation } = require('./animation-helper');

// Try different spinner types
const spinnerTypes = ['classic', 'line', 'simple', 'arrows'];

for (const type of spinnerTypes) {
    const animation = new ProgressAnimation(type, 15);
    console.log(animation.getSpinnerLine(`Using ${type} spinner`));
}
```

### Example 3: Convenience Functions
```javascript
const { getProgressLine, getSpinnerLine } = require('./animation-helper');

// Quick progress line
console.log(getProgressLine(5, 10, 'Converting'));

// Simple spinner
console.log(getSpinnerLine('Loading...'));
```

## 🔧 API Reference

### ProgressAnimation Class

#### Constructor
```javascript
new ProgressAnimation(type = 'classic', barLength = 20)
```
- `type`: Spinner type ('classic', 'dots', 'line', 'simple', 'arrows')
- `barLength`: Length of the progress bar (default: 20)

#### Methods

##### getCustomProgress(current, total, message, prefix = '')
Creates a full progress line with spinner, progress bar, and percentage.
```javascript
animation.getCustomProgress(3, 10, 'Processing', '[SCAN] ')
// Returns: "[SCAN] ⠋ Processing 3/10 [████████████░░░░░░░░] 30%"
```

##### getSpinnerLine(message)
Creates a simple spinner line.
```javascript
animation.getSpinnerLine('Loading...')
// Returns: "⠋ Loading..."
```

##### getProgressLine(current, total, prefix = '', suffix = '')
Creates a progress line with custom prefix/suffix.
```javascript
animation.getProgressLine(3, 10, '[TASK] ', ' complete')
// Returns: "[TASK] ⠋ Processing 3/10 [████████████░░░░░░░░] 30% complete"
```

##### getProgressBar(current, total)
Returns just the progress bar and percentage.
```javascript
animation.getProgressBar(3, 10)
// Returns: { bar: "████████████░░░░░░░░", progress: 30 }
```

##### getSpinner()
Returns just the current spinner frame.
```javascript
animation.getSpinner()
// Returns: "⠋"
```

### Convenience Functions

#### getProgressLine(current, total, message = 'Processing', prefix = '')
Quick way to get a progress line without creating an instance.
```javascript
const { getProgressLine } = require('./animation-helper');
console.log(getProgressLine(3, 10, 'Converting', '[CONVERT] '));
```

#### getSpinnerLine(message)
Quick way to get a spinner line.
```javascript
const { getSpinnerLine } = require('./animation-helper');
console.log(getSpinnerLine('Loading...'));
```

#### getSpinner()
Quick way to get just a spinner.
```javascript
const { getSpinner } = require('./animation-helper');
console.log(getSpinner());
```

## 🎯 Real-World Examples

### Example: File Processing Script
```javascript
const fs = require('fs');
const path = require('path');
const { ProgressAnimation } = require('./animation-helper');

async function processDirectory(dirPath) {
    const files = fs.readdirSync(dirPath);
    const animation = new ProgressAnimation('classic', 20);
    
    console.log(`Processing ${files.length} files in ${dirPath}`);
    
    for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const progressLine = animation.getCustomProgress(i + 1, files.length, 'Processing', '[FILES] ');
        console.log(`${progressLine} : ${file}`);
        
        // Your file processing code here
        await processFile(path.join(dirPath, file));
    }
    
    console.log('✅ Processing complete!');
}
```

### Example: Database Operations
```javascript
const { ProgressAnimation } = require('./animation-helper');

async function updateDatabase(records) {
    const animation = new ProgressAnimation('arrows', 25);
    
    console.log(`Updating ${records.length} database records`);
    
    for (let i = 0; i < records.length; i++) {
        const progressLine = animation.getCustomProgress(i + 1, records.length, 'Updating', '[DB] ');
        console.log(`${progressLine} : Record ${records[i].id}`);
        
        await updateRecord(records[i]);
    }
}
```

### Example: Network Requests
```javascript
const { ProgressAnimation } = require('./animation-helper');

async function fetchData(urls) {
    const animation = new ProgressAnimation('line', 15);
    
    for (let i = 0; i < urls.length; i++) {
        const progressLine = animation.getCustomProgress(i + 1, urls.length, 'Fetching', '[NET] ');
        console.log(`${progressLine} : ${urls[i]}`);
        
        await fetch(urls[i]);
    }
}
```

## 🎨 Customization Tips

### Custom Bar Length
```javascript
// Short bar for compact display
const shortAnimation = new ProgressAnimation('classic', 10);

// Long bar for detailed progress
const longAnimation = new ProgressAnimation('classic', 40);
```

### Custom Prefixes
```javascript
// Use consistent prefixes for different operations
animation.getCustomProgress(current, total, 'Scanning', '[SCAN] ');
animation.getCustomProgress(current, total, 'Converting', '[CONVERT] ');
animation.getCustomProgress(current, total, 'Uploading', '[UPLOAD] ');
```

### Different Spinners for Different Tasks
```javascript
// Use different spinners to distinguish operations
const scanAnimation = new ProgressAnimation('classic', 20);
const convertAnimation = new ProgressAnimation('arrows', 20);
const uploadAnimation = new ProgressAnimation('line', 20);
```

## 🚀 Best Practices

1. **Consistent Prefixes**: Use consistent prefixes like `[SCAN]`, `[CONVERT]`, `[UPLOAD]` to identify different operations.

2. **Appropriate Bar Length**: Use shorter bars (10-15) for quick operations, longer bars (20-30) for longer operations.

3. **Meaningful Messages**: Use descriptive messages like "Processing", "Converting", "Uploading" instead of generic "Processing".

4. **Error Handling**: Don't let errors break the progress display - catch them and continue.

5. **Completion Messages**: Always show a completion message when done.

## 🔧 Troubleshooting

### Common Issues

**Problem**: Progress bar not updating
**Solution**: Make sure you're calling the animation method in each loop iteration.

**Problem**: Spinner not rotating
**Solution**: The spinner automatically rotates with each call to `getSpinner()` or related methods.

**Problem**: Bar length too long/short
**Solution**: Adjust the `barLength` parameter in the constructor.

### Performance Tips

- For very fast operations, consider using a shorter delay between updates
- For very slow operations, you might want to update progress less frequently
- The animation helper is lightweight and won't impact performance significantly

## 📚 See Also

- `scripts/animation-example.js` - Complete working examples
- `scripts/animation-helper.js` - Source code of the animation helper
- `scripts/scan_prehistoric_planet_audio.js` - Real-world usage example
- `scripts/convert_prehistoric_planet_audio.js` - Real-world usage example

---

**Happy coding! 🎬✨** 