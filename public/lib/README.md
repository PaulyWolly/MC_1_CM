# Third-Party Libraries

This directory contains locally hosted third-party libraries to ensure reliable loading and avoid CDN dependencies.

## Video.js
- **Version**: 8.10.0
- **Files**: 
  - `videojs/video.min.js` - Minified JavaScript library
  - `videojs/video-js.css` - CSS styles
- **Source**: https://vjs.zencdn.net/8.10.0/
- **License**: Apache 2.0

## Benefits of Local Libraries
- No dependency on external CDN availability
- Faster loading times
- Works offline
- Version control and stability
- No external network requests

## Adding New Libraries
When adding new third-party libraries:
1. Create a subdirectory for the library
2. Download the files locally
3. Update references in HTML/CSS/JS files
4. Document the version and source here 