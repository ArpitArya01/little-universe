# The Little Universe I Made For You ❤️

*A tiny universe, created for one very special person.*

This is an interactive apology website in twelve chapters. Each chapter has its own world, its own animations, and things to tap. It is plain HTML, CSS and JavaScript with no build step and no required downloads.

## Opening it

Double-click `index.html`; it works straight from the file system.

For the best result (and to test on a phone on the same Wi-Fi), serve the folder:

```bash
cd little-universe
python -m http.server 8080
# then open http://localhost:8080
```

To share it, upload the folder to any static host (GitHub Pages, Netlify, Vercel, Cloudflare Pages). There is no server code.

## Making it yours: edit `content.js`

Every word she reads is in **`content.js`**. You never need to touch the other files.

| What | Where in `content.js` |
| --- | --- |
| Your signature on the final letter | `signature` |
| Intro lines (Scene 1) | `intro` |
| The apology (Scene 3) | `apology.greeting`, `apology.paragraphs` |
| Compliments, scientist notes, hug text (Scene 4) | `compliments`, `scientistNotes`, `hugText` |
| Game messages and the secret letter (Scene 5) | `gameMessages`, `secretLetter` |
| The seven flowers (Scene 6) | `flowers` |
| **Your photos** (Scene 7 and the time capsule) | `photos` |
| Promises (Scenes 8 and 10) | `promises`, `starIntro`, `starRestored` |
| Constellation messages and the special star (Scene 9) | `constellation`, `specialStar` |
| Time capsule contents (Scene 10) | `capsule` |
| The final love letter (Scene 11) | `finalLetter` |
| Ending lines and the last surprise (Scene 12) | `ending`, `endingHug`, `endingFlower`, `lastSurprise`, `finalText` |
| Pop-up surprises, hidden secrets, companion lines | `surprises`, `secrets`, `companionLines`, `companionHints` |
| Small status lines (door, garden, sky, capsule, music tip) | `little` |
| Music | `music.src` |

Text tips: keep the quotes; `\n` is a line break and `\n\n` starts a new paragraph.

### Adding your photos

1. Put the images in `assets/photos/` (JPG or WebP, roughly 1200px on the long side keeps it fast).
2. Fill in each entry in `photos`:

```js
{ src: "assets/photos/first-date.jpg", date: "14 Feb 2024", caption: "Our first date", message: "You laughed so hard at my terrible joke..." }
```

Add or remove entries freely. A photo with an empty `src` (or a file that fails to load) shows a decorated empty frame instead of a broken image. The defaults are deliberately blank: no memories are invented for you.

### Adding your song

Put an MP3 in `assets/music/` and set `music: { src: "assets/music/our-song.mp3" }`. Leave it empty to use the built-in music box melody, which is generated in the browser. Music only starts when she taps the 🎵 button.

## The twelve chapters

1. **A Message from the Universe**: starfield, moon, planets, a spaceship carrying a heart, typed intro, zoom into the glowing planet.
2. **The Magical Door**: garden house, the bunny walks up and waves, *Knock Knock* opens the door and a letter flies out.
3. **The Apology Cinema**: the apology appears line by line while the rain stops, clouds part, flowers bloom and the bunny offers a glowing heart.
4. **The Happiness Lab**: five working machines (hug generator, flower generator, compliment TV, smile detector, happiness dispenser) and a bunny scientist.
5. **Collect the Little Hearts**: canvas mini-game. Arrows/WASD, on-screen D-pad, or drag on touch screens. Five hearts unlock a secret letter.
6. **The Garden of Little Things**: seven SVG flowers bloom into messages and release butterflies.
7. **Our Little Memory Museum**: hanging polaroids with 3D tilt, a photo viewer, and draggable stickers.
8. **The Broken Star Repair Shop**: six fragments, six promises; the cracks disappear and the star shines.
9. **The Secret Constellation**: eight stars that join into a hidden heart, plus one golden star with a longer message.
10. **The Time Capsule**: a glass capsule holding a letter, photos, promises and a message for the future.
11. **The Final Love Letter**: the envelope opens, the letter unfolds and types itself, then your signature appears.
12. **The Final Surprise**: teddy bear, moon, a virtual hug, flowers you can plant in the sky, and a confetti-and-balloons surprise.

Things that show up along the way: Twinkle the companion star (tap it), balloons carrying surprise messages, five hidden secrets (a shooting star, the moon, a snail, a lab cat, a mushroom), a heart cursor on desktop, a chapter progress bar, *Back* and *Skip* buttons, and confetti.

## Technical notes

- **No dependencies.** Animations use CSS keyframes, the Web Animations API, SVG and `<canvas>`. Sound effects and music are synthesised with the Web Audio API. The only external request is Google Fonts, and each font has a system fallback. To work fully offline, download the fonts into `assets/fonts/` and replace the `<link>` in `index.html` with `@font-face` rules.
- **Why no GSAP, Lottie or Three.js?** Each scene is a full-screen chapter rather than a long scrolling page, so ScrollTrigger has nothing to drive, and the effects here don't need a 3D engine. Leaving them out avoids CDN failures and broken-asset risks, and keeps the whole site around 200 KB. You can still add them; nothing conflicts.
- **Performance:** canvases only animate while their chapter is visible, CSS animations in hidden chapters are paused, and particle counts scale with screen size.
- **Accessibility:** everything is a real `<button>` with a label, there are visible focus rings and keyboard support (Esc closes dialogs, the game uses the arrow keys), hidden chapters are `inert`, and messages are announced through live regions. With *reduce motion* enabled, the movement stops but the whole story still plays.

## Folder structure

```
little-universe/
├── index.html      all 12 scenes (markup and inline SVG scenery)
├── style.css       design tokens, shared UI, one section per scene
├── script.js       sound, effects, scene manager, scene logic
├── content.js      ← every editable message, photo and promise
├── assets/
│   ├── characters/ backgrounds/ stickers/ gifs/   (optional extras)
│   ├── photos/     ← your photos go here
│   ├── music/      ← your song goes here (optional)
│   ├── sounds/     (optional; effects are generated)
│   └── fonts/      (optional; for offline fonts)
└── README.md
```

The characters (bunny, teddy, Twinkle) are original SVG drawn in `script.js` (`bunnySVG`, `teddySVG`), so the `characters`, `backgrounds`, `stickers` and `gifs` folders start empty. They're there if you want to add your own GIFs or art later.
