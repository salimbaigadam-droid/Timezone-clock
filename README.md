# Animated World Clock Web App

Features
- Multiple clocks, add/remove any timezone
- Analog (SVG) + digital display
- Animated backgrounds: gradient, particles
- Tick sound and hourly chime (generated via WebAudio)
- Theme selector (dark / light / pastel)
- 12/24-hour toggle and show/hide seconds
- Works offline; supports adding custom audio files

How to run
1. Put these files in a folder.
2. (Optional) Add sound files in `sounds/` e.g. `sounds/tick.mp3`, `sounds/chime.mp3`. The app synthesizes sounds if none are provided.
3. Open `index.html` in a modern browser (Chrome, Edge, Firefox, Safari).
4. Click "Add Clock" to add more timezones; use settings to change themes and sound.

Customizing & Extending
- Replace or add more visual backgrounds in `app.js` drawBg function.
- To load external sound files, update `playTick` and `playChime` to fetch `sounds/tick.mp3` or `sounds/chime.mp3` and play via `audioCtx.decodeAudioData(...)`.
- To persist settings and clocks, add `localStorage` read/write in `init()` and when clocks are changed.

Notes
- For accurate timezone listing, modern browsers support `Intl.supportedValuesOf('timeZone')`. If unsupported, a small fallback list is used.
- Browsers require a user gesture to start audio; click anywhere if sound doesn't start immediately.

Enjoy!