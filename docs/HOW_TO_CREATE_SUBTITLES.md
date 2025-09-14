# HOW TO CREATE SUBTITLES FOR YOUR MOVIES (.vtt)

This guide explains how to add subtitles to any movie in your app using standard `.srt` files and the provided conversion script.

---

## **Step-by-Step Instructions**

### 1. **Download a Subtitle File (.srt)**
- Go to a reputable subtitle site (e.g., [OpenSubtitles.org](https://www.opensubtitles.org/), [Subscene.com](https://subscene.com/)).
- Search for your movie (e.g., "The Peacemaker (1997)").
- Download the `.srt` file in your preferred language.

### 2. **Place the .srt File in the Subtitles Folder**
- Move or copy the `.srt` file to:
  ```
  /public/assets/subtitles/
  ```
- **Rename the .srt file** so its base name matches the movie file (excluding extension).
  - Example: For `The.Peacemaker.(1997).[1080p].mp4`, name the subtitle `The.Peacemaker.(1997).[1080p].srt`.

### 3. **Convert .srt to .vtt**
- In your project root, run:
  ```
  node scripts/convert_srt_to_vtt.js
  ```
- This will:
  - Convert all `.srt` files in `/public/assets/subtitles/` to `.vtt` format.
  - Delete the original `.srt` files after conversion.

### 4. **Play the Movie and Use Subtitles**
- Play the movie in your app as usual.
- If a matching `.vtt` file exists, a **"Subtitles"** button will appear in the player controls.
- Click the button to toggle subtitles on/off.

---

## **Troubleshooting**
- **No Subtitles Button?**
  - Make sure the `.vtt` file exists and is named exactly like the movie (case and punctuation must match).
  - Check that the `.vtt` file is accessible in your browser (e.g., `http://localhost:4800/assets/subtitles/YourMovie.vtt`).
  - Re-run the conversion script if you add new `.srt` files.
- **Subtitles Not Showing?**
  - Open the `.vtt` file and ensure the first line is `WEBVTT` and timestamps use periods (not commas).
  - Try a hard refresh (Ctrl+F5) in your browser.

---

## **Styling Subtitles (Font, Color, Position, etc.)**

You can fully customize how subtitles look in your Video.js player using CSS!

### **Where to Add the CSS**
- Add your custom CSS to your main stylesheet (e.g., `MediaLibrary.css` or a global CSS file).
- Make sure it loads after Video.js’s CSS for your rules to take effect.

### **Example CSS for Subtitles**
```css
/* Style the subtitle text */
.video-js .vjs-text-track-cue {
  color: #fff !important; /* Text color */
  background: rgba(0,0,0,0.7) !important; /* Background */
  font-size: 1.5em !important; /* Font size */
  font-family: 'Arial Black', Arial, sans-serif !important; /* Font */
  text-shadow: 2px 2px 4px #000 !important; /* Shadow for readability */
  border-radius: 8px !important;
  padding: 6px 18px !important;
  line-height: 1.4 !important;
}

/* Move subtitles higher (e.g., 20% from bottom) */
.video-js .vjs-text-track-cue {
  bottom: 20% !important;
}
```

### **What You Can Change**
- **Font:** `font-family: 'Verdana', sans-serif !important;`
- **Size:** `font-size: 2em !important;`
- **Color:** `color: yellow !important;`
- **Background:** `background: rgba(0,0,0,0.7) !important;`
- **Position:** `bottom: 20% !important;` (move up from bottom)
- **Padding, border, etc.:** `padding: ...; border-radius: ...`

### **Summary Table**

| What you want to change | How to do it (CSS)                                 |
|------------------------|----------------------------------------------------|
| Font                   | `font-family: ...`                                 |
| Size                   | `font-size: ...`                                   |
| Color                  | `color: ...`                                       |
| Background             | `background: ...`                                  |
| Position (vertical)    | `bottom: 20%` (or other value)                     |
| Padding, border, etc.  | `padding: ...; border-radius: ...`                 |

### **Advanced**
- You can also use [WebVTT inline styling](https://developer.mozilla.org/en-US/docs/Web/API/WebVTT_API#styling_cues) for per-cue effects, but global CSS is easier for most customizations.

---

## **Summary Table**

| Movie File Name                        | Subtitle File Name                  | What Happens?                |
|----------------------------------------|-------------------------------------|------------------------------|
| The.Peacemaker.(1997).[1080p].mp4      | The.Peacemaker.(1997).[1080p].vtt   | Subtitles button appears     |
| mymovie.mp4                            | mymovie.vtt                         | Subtitles button appears     |
| mymovie.mp4                            | mymovie.srt (not converted)         | No subtitles (run script!)   |
| mymovie.mp4                            | othermovie.vtt                      | No subtitles                 |

---

## **Quick Reference**
- **Download .srt → Place in `/public/assets/subtitles/` → Run conversion script → Play movie and enjoy subtitles!**

---

For advanced help (multiple languages, styling, etc.), ask your developer or open an issue. 