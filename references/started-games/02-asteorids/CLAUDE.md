# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Running the game

Open `index.html` directly in a browser, or serve locally:

```bash
npx serve .
# then open http://localhost:3000
```

No build step, no bundler, no dependencies.

## Architecture

The entire game logic lives in a single file: `game.js` (~424 lines). There is no module system.

**Game loop:** `requestAnimationFrame` drives `loop(ts)` → `update(dt)` → `draw()`. Delta time (`dt`) is capped at 50 ms to prevent physics tunneling on tab-blur.

**State machine:** A single `state` variable (`'playing' | 'dead' | 'gameover'`) gates logic inside `update()`.

**Classes:** `Ship`, `Asteroid`, `Bullet`, `Particle` — all follow the same `update(dt)` / `draw()` / `dead` flag pattern. Dead objects are filtered from their arrays each frame.

**Toroidal wrapping:** `wrap(v, max)` is used everywhere positions are updated — objects exit one edge and re-enter the opposite.

**Asteroid splitting:** `Asteroid.split()` returns 2 smaller asteroids (`size - 1`); size 1 returns `[]`. Sizes map to radii/speeds/points via the `RADII`, `SPEEDS`, `POINTS` arrays indexed by size (1–3).

**Input:** `keys` holds continuous state; `justPressed` tracks rising-edge presses (consumed on read via `pressed(code)`).

**Canvas:** Fixed 800×600, referenced via module-level `W`/`H` constants.
