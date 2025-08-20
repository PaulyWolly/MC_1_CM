# AmplifyManager Component

## Overview

**AmplifyManager** is a standalone audio amplification component designed to work independently with video players. It provides real-time audio amplification using the Web Audio API, with a clean, modern interface that includes visual feedback and responsive controls.

## Features

### 🎵 **Audio Processing**
- **Real-time amplification** from 100% to 300%
- **Web Audio API integration** for high-quality audio processing
- **Automatic audio context management** with error recovery
- **Clean audio routing** that doesn't interfere with video playback

### 🎨 **User Interface**
- **🔊 AMPLIFY button** - Grey by default, turns red when active
- **🎚️ Gradient slider** - Green → Orange → Red color progression
- **💡 LED indicator** - Always visible, shows amplification status
- **📊 Percentage display** - Real-time level feedback
- **Responsive design** - Works on all device sizes

### 🔧 **Technical Features**
- **Event-driven architecture** - Communicates via Video.js events
- **Automatic state management** - Resets when loading new videos
- **Memory leak prevention** - Proper cleanup and destruction
- **Cross-browser compatibility** - Works with modern browsers
- **Accessibility support** - Keyboard navigation and screen readers

## Installation

### 1. Include Files
```html
<link rel="stylesheet" href="AmplifyManager.css">
<script type="module" src="AmplifyManager.js"></script>
```

### 2. Create Instance
```javascript
import { AmplifyManager } from './AmplifyManager.js';

const container = document.getElementById('video-player-container');
const videoPlayer = yourVideoJsInstance;

const amplifyManager = new AmplifyManager(container, videoPlayer);
```

## Usage

### Basic Integration
```javascript
// In your VideoPlayer component
import { AmplifyManager } from '../AmplifyManager/AmplifyManager.js';

class VideoPlayer {
    constructor() {
        // ... other initialization ...
        
        // Create AmplifyManager instance
        this.amplifyManager = new AmplifyManager(
            this.container, 
            this.vjsPlayer
        );
    }
    
    // Cleanup on destroy
    destroy() {
        if (this.amplifyManager) {
            this.amplifyManager.destroy();
        }
        // ... other cleanup ...
    }
}
```

### Event Handling
The component automatically listens for these Video.js events:
- `loadeddata` - Resets amplification when new video loads
- `ended` - Resets amplification when video ends
- `userinactive` / `useractive` - Manages control visibility

## API Reference

### Constructor
```javascript
new AmplifyManager(container, videoPlayer)
```
- `container` - DOM element where AMPLIFY controls will be placed
- `videoPlayer` - Video.js player instance for event handling

### Public Methods

#### `toggleAmplification()`
Toggles amplification on/off. When enabled, sets level to 200% and shows slider.

#### `setAmplificationLevel(level)`
Sets amplification level (1.0 = 100%, 2.0 = 200%, etc.)
- Range: 1.0 to 3.0 (100% to 300%)
- Auto-enables amplification if level > 1.0

#### `resetAmplification()`
Resets to default state (100%, disabled) and cleans up audio connections.

#### `reinitializeAudioSystem()`
Completely reinitializes the audio system (useful for troubleshooting).

#### `show()` / `hide()`
Controls visibility of the AMPLIFY controls container.

#### `destroy()`
Cleans up all resources, removes event listeners, and destroys the component.

## CSS Classes

### Main Container
- `.amplify-controls-container` - Main controls wrapper

### Button
- `.video-player-amplify-btn` - AMPLIFY button
- `.active` - Applied when amplification is enabled

### Slider
- `.video-player-amplify-controls` - Slider container
- `.video-player-amplify-slider` - Range input slider
- `.video-player-amplify-level` - Percentage display

### LED Indicator
- `.amplify-led-indicator` - Status LED
- `.active` - Applied when amplification is enabled

## Styling Customization

### Button Colors
```css
.video-player-amplify-btn {
    /* Default (grey) */
    background: linear-gradient(135deg, #666 0%, #888 50%, #666 100%);
}

.video-player-amplify-btn.active {
    /* Active (red) */
    background: linear-gradient(135deg, #d32f2f 0%, #f44336 50%, #d32f2f 100%);
}
```

### Slider Colors
```css
.video-player-amplify-slider {
    background: linear-gradient(to right, 
        #4caf50 0%,    /* Green (100%) */
        #4caf50 33%,   /* Green (100-133%) */
        #ff9800 33%,   /* Orange (133-166%) */
        #ff9800 66%,   /* Orange (166-200%) */
        #f44336 66%,   /* Red (200-233%) */
        #f44336 100%); /* Red (233-300%) */
}
```

### LED Indicator
```css
.amplify-led-indicator {
    /* Default (grey) */
    background: #333;
    border-color: #666;
}

.amplify-led-indicator.active {
    /* Active (red) with pulse animation */
    background: #f44336;
    border-color: #d32f2f;
    animation: ledPulse 2s ease-in-out infinite;
}
```

## Browser Support

- **Chrome** 66+ (Web Audio API)
- **Firefox** 60+ (Web Audio API)
- **Safari** 11+ (Web Audio API)
- **Edge** 79+ (Web Audio API)

## Performance Considerations

- **Audio context** is created only when needed
- **MediaElementSource** is created once per video element
- **Event listeners** are properly cleaned up on destruction
- **DOM manipulation** is minimized for better performance

## Troubleshooting

### Common Issues

#### "Audio context suspended"
- User must interact with the page first (browser autoplay policy)
- Component automatically resumes context when needed

#### "MediaElementSource already connected"
- Component automatically handles this by checking `sourceCreated` flag
- Reset is called automatically when loading new videos

#### Controls not visible
- Check z-index values in CSS
- Ensure container has proper positioning
- Verify Video.js control bar is visible

### Debug Mode
Enable detailed logging by checking browser console:
```
[AMPLIFY-MANAGER] Initializing AmplifyManager...
[AMPLIFY-MANAGER] AMPLIFY UI created
[AMPLIFY-MANAGER] Audio context initialized
```

## Examples

### Demo Page
Open `AmplifyManager.html` in a browser to see a working demo with:
- Interactive AMPLIFY button
- Live slider demonstration
- LED indicator animation
- Component lifecycle testing

### Integration Example
```javascript
// In your main application
import { AmplifyManager } from './components/AmplifyManager/AmplifyManager.js';

// When video player is ready
videoPlayer.ready(() => {
    const amplifyManager = new AmplifyManager(
        videoPlayer.el(), 
        videoPlayer
    );
    
    // Store reference for cleanup
    this.amplifyManager = amplifyManager;
});
```

## License

This component is part of the MultiChat_Chatty project and follows the same licensing terms.

## Version History

- **v1.0** - Initial release as AmplifyManager
- Extracted from working VideoPlayer implementation
- Standalone component architecture
- Event-driven design
- Comprehensive error handling
