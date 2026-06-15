# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Goal

Build a complete Arkanoid/Breakout game using plain HTML, CSS, and JavaScript — zero dependencies. The game must be fully playable in the browser.

## Running the Game

Open `index.html` directly in a browser, or serve it with any static file server:

```powershell
npx serve .
# or
python -m http.server 8080
```

The spritesheet loads via a relative path (`assets/spritesheet-breakout.png`), so a file server is required — opening `index.html` via `file://` will cause the image to fail to load due to CORS restrictions.

## Available Assets

- **`assets/spritesheet-breakout.png`** — sprite atlas for all game graphics
- **`assets/spritesheet.js`** — sprite loader and draw utilities; exports `loadSpritesheet`, `drawSprite`, `drawFrame`, plus the `SPRITES` and `EXPLOSION_FRAMES` constants

### Sprite names (for `drawSprite`)

- `"paddle"` — player paddle (162×14 px from sheet)
- `"ball"` — ball (16×16)
- `"block_red"`, `"block_cyan"`, `"block_green"`, `"block_magenta"`, `"block_yellow"`, `"block_hotpink"`, `"block_gray"` — brick variants (32×16 each)

### Explosion animation (for `drawFrame`)

`EXPLOSION_FRAMES[color]` holds 4 frames (32×16 each); `EXPLOSION_DURATION` is 150 ms total.

### Sounds

- `assets/sounds/ball-bounce.mp3`
- `assets/sounds/break-sound.mp3`

## Architecture Notes

The game should be canvas-based (single `<canvas>` element). The main game loop runs via `requestAnimationFrame`. Key subsystems to implement:

- **Input** — keyboard (arrow keys / A–D) and mouse/touch for paddle control
- **Physics** — ball movement, wall/paddle/brick AABB collision with correct reflection
- **Bricks** — grid layout, hit tracking, explosion particle effect using `EXPLOSION_FRAMES`
- **State machine** — `menu → playing → paused → game-over / win`
- **HUD** — score, lives, level
