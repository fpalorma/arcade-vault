'use client'

import { forwardRef, useEffect, useImperativeHandle, useRef } from 'react'

export interface ArkanoidHandle {
  restart: () => void
}

interface Props {
  paused: boolean
  onScore: (score: number) => void
  onLives: (lives: number) => void
  onLevel: (level: number) => void
  onGameOver: () => void
}

// ── Canvas / grid constants ───────────────────────────────────────────────────
const W          = 480
const H          = 640
const BRICK_W    = 32
const BRICK_H    = 16
const BRICK_COLS = 13
const OFF_X      = (W - BRICK_COLS * BRICK_W) / 2   // 32
const OFF_Y      = 60
const PAD_SPEED  = 6

// ── Spritesheet (inlined from public/games/arkanoid/spritesheet.ts) ───────────
type Frame = { sx: number; sy: number; sw: number; sh: number }

const EXPLOSION_FRAMES: Record<string, Frame[]> = {
  red:     [{ sx: 256, sy: 176, sw: 32, sh: 16 }, { sx: 288, sy: 176, sw: 32, sh: 16 }, { sx: 320, sy: 176, sw: 32, sh: 16 }, { sx: 352, sy: 176, sw: 32, sh: 16 }],
  cyan:    [{ sx: 256, sy: 192, sw: 32, sh: 16 }, { sx: 288, sy: 192, sw: 32, sh: 16 }, { sx: 320, sy: 192, sw: 32, sh: 16 }, { sx: 352, sy: 192, sw: 32, sh: 16 }],
  green:   [{ sx: 256, sy: 208, sw: 32, sh: 16 }, { sx: 288, sy: 208, sw: 32, sh: 16 }, { sx: 320, sy: 208, sw: 32, sh: 16 }, { sx: 352, sy: 208, sw: 32, sh: 16 }],
  magenta: [{ sx: 256, sy: 224, sw: 32, sh: 16 }, { sx: 288, sy: 224, sw: 32, sh: 16 }, { sx: 320, sy: 224, sw: 32, sh: 16 }, { sx: 352, sy: 224, sw: 32, sh: 16 }],
  yellow:  [{ sx: 256, sy: 240, sw: 32, sh: 16 }, { sx: 288, sy: 240, sw: 32, sh: 16 }, { sx: 320, sy: 240, sw: 32, sh: 16 }, { sx: 352, sy: 240, sw: 32, sh: 16 }],
  hotpink: [{ sx: 256, sy: 256, sw: 32, sh: 16 }, { sx: 288, sy: 256, sw: 32, sh: 16 }, { sx: 320, sy: 256, sw: 32, sh: 16 }, { sx: 352, sy: 256, sw: 32, sh: 16 }],
  gray:    [{ sx: 256, sy: 176, sw: 32, sh: 16 }, { sx: 288, sy: 176, sw: 32, sh: 16 }, { sx: 320, sy: 176, sw: 32, sh: 16 }, { sx: 352, sy: 176, sw: 32, sh: 16 }],
}
const EXPLOSION_DURATION = 150

const SPRITES_MAP: Record<string, Frame> = {
  paddle:         { sx: 32, sy: 112, sw: 162, sh: 14 },
  ball:           { sx: 32, sy: 32,  sw: 16,  sh: 16  },
  block_gray:     { sx: 32, sy: 288, sw: 32,  sh: 16  },
  block_red:      { sx: 32, sy: 176, sw: 32,  sh: 16  },
  block_yellow:   { sx: 32, sy: 240, sw: 32,  sh: 16  },
  block_cyan:     { sx: 32, sy: 192, sw: 32,  sh: 16  },
  block_magenta:  { sx: 32, sy: 224, sw: 32,  sh: 16  },
  block_hotpink:  { sx: 32, sy: 256, sw: 32,  sh: 16  },
  block_green:    { sx: 32, sy: 208, sw: 32,  sh: 16  },
}

let ssImg:         HTMLCanvasElement | null = null
let ssLoaded       = false
let ssLoadStarted  = false
const ssCallbacks: (() => void)[] = []

function loadSpritesheet(): Promise<void> {
  return new Promise<void>(resolve => {
    if (ssLoaded) { resolve(); return }
    ssCallbacks.push(resolve)
    if (ssLoadStarted) return
    ssLoadStarted = true
    const rawImg = new Image()
    rawImg.onload = () => {
      const oc = document.createElement('canvas')
      oc.width  = rawImg.width
      oc.height = rawImg.height
      oc.getContext('2d')!.drawImage(rawImg, 0, 0)
      ssImg    = oc
      ssLoaded = true
      ssCallbacks.forEach(f => f())
      ssCallbacks.length = 0
    }
    rawImg.onerror = () => console.error('ArkanoidCanvas: failed to load spritesheet')
    rawImg.src = '/games/arkanoid/spritesheet-breakout.png'
  })
}

function drawSprite(ctx: CanvasRenderingContext2D, name: string, x: number, y: number, w: number, h: number) {
  if (!ssLoaded || !ssImg) return
  const sp = SPRITES_MAP[name]
  if (!sp) return
  ctx.drawImage(ssImg, sp.sx, sp.sy, sp.sw, sp.sh, x, y, w, h)
}

function drawFrame(ctx: CanvasRenderingContext2D, frame: Frame, x: number, y: number, w: number, h: number) {
  if (!ssLoaded || !ssImg) return
  ctx.drawImage(ssImg, frame.sx, frame.sy, frame.sw, frame.sh, x, y, w, h)
}

// ── Level layouts ─────────────────────────────────────────────────────────────
type BrickColor = string | null

function makeRow(color: string, start: number, end: number): BrickColor[] {
  return Array.from({ length: BRICK_COLS }, (_, i) => (i >= start && i <= end) ? color : null)
}

const BRICK_COLORS = ['red', 'cyan', 'green', 'magenta', 'yellow', 'hotpink', 'gray']
const LEVELS: BrickColor[][][] = [
  [
    makeRow('red',     0, 12),
    makeRow('cyan',    1, 11),
    makeRow('green',   2, 10),
    makeRow('magenta', 3,  9),
    makeRow('yellow',  4,  8),
  ],
  [
    makeRow('cyan',    5,  7),
    makeRow('green',   3,  9),
    makeRow('magenta', 1, 11),
    makeRow('yellow',  3,  9),
    makeRow('hotpink', 5,  7),
  ],
  Array.from({ length: 6 }, (_, row) =>
    Array.from({ length: BRICK_COLS }, (_, col) =>
      (row + col) % 2 === 0 ? BRICK_COLORS[row % BRICK_COLORS.length] : null
    )
  ),
]

// ── Types ─────────────────────────────────────────────────────────────────────
interface Brick {
  x: number; y: number; w: number; h: number
  color: string; alive: boolean
}
interface Explosion {
  x: number; y: number; color: string; startTime: number
}
interface GS {
  screen:     'ready' | 'playing' | 'gameover'
  score:      number
  lives:      number
  level:      number
  cycle:      number
  baseSpeed:  number
  ball:       { x: number; y: number; vx: number; vy: number; w: number; h: number }
  paddle:     { x: number; y: number; w: number; h: number }
  bricks:     Brick[]
  explosions: Explosion[]
  keys:       Set<string>
}

// ── Builders ──────────────────────────────────────────────────────────────────
function buildBricks(level: number): Brick[] {
  const layout = LEVELS[(level - 1) % 3]
  const out: Brick[] = []
  layout.forEach((row, ri) => {
    row.forEach((color, ci) => {
      if (!color) return
      out.push({ x: OFF_X + ci * BRICK_W, y: OFF_Y + ri * BRICK_H, w: BRICK_W, h: BRICK_H, color, alive: true })
    })
  })
  return out
}

function buildGS(): GS {
  const paddle = { x: (W - 162) / 2, y: H - 40, w: 162, h: 14 }
  return {
    screen: 'ready',
    score: 0, lives: 3, level: 1, cycle: 1, baseSpeed: 4,
    ball:   { x: paddle.x + 81 - 8, y: paddle.y - 20, vx: 0, vy: 0, w: 16, h: 16 },
    paddle,
    bricks: buildBricks(1),
    explosions: [],
    keys: new Set(),
  }
}

// ── Game logic ────────────────────────────────────────────────────────────────
function updatePaddle(gs: GS) {
  const k = gs.keys
  if (k.has('ArrowLeft') || k.has('KeyA'))  gs.paddle.x = Math.max(0, gs.paddle.x - PAD_SPEED)
  if (k.has('ArrowRight') || k.has('KeyD')) gs.paddle.x = Math.min(W - gs.paddle.w, gs.paddle.x + PAD_SPEED)
}

function snapBallToPaddle(gs: GS) {
  gs.ball.x = gs.paddle.x + gs.paddle.w / 2 - gs.ball.w / 2
  gs.ball.y = gs.paddle.y - gs.ball.h - 4
}

function launchBall(gs: GS) {
  gs.ball.vx = gs.baseSpeed * (Math.random() < 0.5 ? 1 : -1)
  gs.ball.vy = -gs.baseSpeed
  gs.screen  = 'playing'
}

function advanceLevel(gs: GS) {
  if (gs.level % 3 === 0) {
    gs.cycle     += 1
    gs.baseSpeed += 0.5
  }
  gs.level     += 1
  gs.bricks     = buildBricks(gs.level)
  gs.explosions = []
  gs.paddle.x   = (W - gs.paddle.w) / 2
  gs.ball.vx    = 0
  gs.ball.vy    = 0
  snapBallToPaddle(gs)
  gs.screen = 'ready'
}

function stepGame(
  gs:         GS,
  playBounce: () => void,
  playBreak:  () => void,
) {
  updatePaddle(gs)

  gs.ball.x += gs.ball.vx
  gs.ball.y += gs.ball.vy

  if (gs.ball.x <= 0) {
    gs.ball.x  = 0;              gs.ball.vx = Math.abs(gs.ball.vx);  playBounce()
  } else if (gs.ball.x + gs.ball.w >= W) {
    gs.ball.x  = W - gs.ball.w; gs.ball.vx = -Math.abs(gs.ball.vx); playBounce()
  }
  if (gs.ball.y <= 0) {
    gs.ball.y  = 0;              gs.ball.vy = Math.abs(gs.ball.vy);  playBounce()
  }

  const b = gs.ball
  const p = gs.paddle

  for (const brick of gs.bricks) {
    if (!brick.alive) continue
    if (b.x + b.w > brick.x && b.x < brick.x + brick.w &&
        b.y + b.h > brick.y && b.y < brick.y + brick.h) {
      brick.alive  = false
      gs.score    += 10
      gs.explosions.push({ x: brick.x, y: brick.y, color: brick.color, startTime: performance.now() })
      playBreak()
      const ol = (b.x + b.w) - brick.x
      const or_ = (brick.x + brick.w) - b.x
      const ot = (b.y + b.h) - brick.y
      const ob = (brick.y + brick.h) - b.y
      if (Math.min(ol, or_) < Math.min(ot, ob)) b.vx = -b.vx
      else                                       b.vy = -b.vy
      break
    }
  }

  if (b.x + b.w > p.x && b.x < p.x + p.w &&
      b.y + b.h > p.y && b.y + b.h < p.y + p.h + Math.abs(b.vy)) {
    b.y  = p.y - b.h
    b.vy = -Math.abs(b.vy)
    playBounce()
  }

  if (b.y + b.h >= H) {
    gs.lives -= 1
    if (gs.lives <= 0) {
      gs.lives  = 0
      gs.screen = 'gameover'
    } else {
      gs.paddle.x = (W - gs.paddle.w) / 2
      b.vx = 0; b.vy = 0
      snapBallToPaddle(gs)
      gs.screen = 'ready'
    }
    return
  }

  if (gs.bricks.every(br => !br.alive)) {
    advanceLevel(gs)
  }
}

function renderGame(ctx: CanvasRenderingContext2D, gs: GS) {
  ctx.fillStyle = '#1a1a2e'
  ctx.fillRect(0, 0, W, H)

  for (const brick of gs.bricks) {
    if (brick.alive) drawSprite(ctx, `block_${brick.color}`, brick.x, brick.y, brick.w, brick.h)
  }

  drawSprite(ctx, 'paddle', gs.paddle.x, gs.paddle.y, gs.paddle.w, gs.paddle.h)
  drawSprite(ctx, 'ball',   gs.ball.x,   gs.ball.y,   gs.ball.w,   gs.ball.h)

  const now = performance.now()
  gs.explosions = gs.explosions.filter(ex => now - ex.startTime < EXPLOSION_DURATION)
  for (const ex of gs.explosions) {
    const fi     = Math.min(Math.floor((now - ex.startTime) / EXPLOSION_DURATION * 4), 3)
    const frames = EXPLOSION_FRAMES[ex.color]
    if (frames) drawFrame(ctx, frames[fi], ex.x, ex.y, BRICK_W, BRICK_H)
  }
}

// ── Component ─────────────────────────────────────────────────────────────────
const ArkanoidCanvas = forwardRef<ArkanoidHandle, Props>(function ArkanoidCanvas(
  { paused, onScore, onLives, onLevel, onGameOver },
  ref,
) {
  const canvasRef   = useRef<HTMLCanvasElement>(null)
  const rafRef      = useRef(0)
  const pausedRef   = useRef(paused)
  const cbRef       = useRef({ onScore, onLives, onLevel, onGameOver })
  cbRef.current     = { onScore, onLives, onLevel, onGameOver }

  const gsRef       = useRef<GS | null>(null)
  const emitted     = useRef({ score: -1, lives: -1, level: -1 })
  const gOverFired  = useRef(false)
  const tickRef     = useRef<() => void>(() => {})
  const firstPause  = useRef(true)

  useEffect(() => {
    const bounceAudio = new Audio('/games/arkanoid/sounds/ball-bounce.mp3')
    const breakAudio  = new Audio('/games/arkanoid/sounds/break-sound.mp3')
    let lastBounceMs  = 0

    function playBounce() {
      const now = performance.now()
      if (now - lastBounceMs < 30) return
      lastBounceMs = now
      ;(bounceAudio.cloneNode(true) as HTMLAudioElement).play().catch(() => {})
    }
    function playBreak() {
      ;(breakAudio.cloneNode(true) as HTMLAudioElement).play().catch(() => {})
    }

    const canvas = canvasRef.current!
    const ctx    = canvas.getContext('2d')!
    gsRef.current = buildGS()

    function tick() {
      const gs = gsRef.current!
      if (!pausedRef.current) {
        if (gs.screen === 'ready') {
          updatePaddle(gs)
          snapBallToPaddle(gs)
        } else if (gs.screen === 'playing') {
          stepGame(gs, playBounce, playBreak)
        }
      }
      renderGame(ctx, gs)

      const e  = emitted.current
      const cb = cbRef.current
      if (gs.score !== e.score) { cb.onScore(gs.score); e.score = gs.score }
      if (gs.lives !== e.lives) { cb.onLives(gs.lives); e.lives = gs.lives }
      if (gs.level !== e.level) { cb.onLevel(gs.level); e.level = gs.level }
      if (gs.screen === 'gameover' && !gOverFired.current) {
        gOverFired.current = true
        cb.onGameOver()
      }

      if (gs.screen !== 'gameover') {
        rafRef.current = requestAnimationFrame(tick)
      }
    }

    tickRef.current = tick

    loadSpritesheet().then(() => {
      rafRef.current = requestAnimationFrame(tick)
    })

    return () => cancelAnimationFrame(rafRef.current)
  }, [])

  // Pause / resume
  useEffect(() => {
    pausedRef.current = paused
    if (firstPause.current) { firstPause.current = false; return }
    if (paused) {
      cancelAnimationFrame(rafRef.current)
    } else if (gsRef.current?.screen !== 'gameover') {
      rafRef.current = requestAnimationFrame(tickRef.current)
    }
  }, [paused])

  // Keyboard
  useEffect(() => {
    const ctrl = new Set(['ArrowLeft', 'ArrowRight', 'KeyA', 'KeyD', 'Space'])
    const down = (e: KeyboardEvent) => {
      if (ctrl.has(e.code)) e.preventDefault()
      const gs = gsRef.current
      if (!gs) return
      gs.keys.add(e.code)
      if (e.code === 'Space' && gs.screen === 'ready' && !pausedRef.current) {
        launchBall(gs)
      }
    }
    const up = (e: KeyboardEvent) => gsRef.current?.keys.delete(e.code)
    window.addEventListener('keydown', down)
    window.addEventListener('keyup',   up)
    return () => {
      window.removeEventListener('keydown', down)
      window.removeEventListener('keyup',   up)
    }
  }, [])

  // Mouse: move paddle + click to launch
  useEffect(() => {
    const canvas = canvasRef.current!
    const onMove = (e: MouseEvent) => {
      const gs = gsRef.current
      if (!gs || pausedRef.current) return
      const rect   = canvas.getBoundingClientRect()
      const mouseX = (e.clientX - rect.left) * (W / rect.width)
      gs.paddle.x  = Math.max(0, Math.min(W - gs.paddle.w, mouseX - gs.paddle.w / 2))
      if (gs.screen === 'ready') snapBallToPaddle(gs)
    }
    const onClick = () => {
      const gs = gsRef.current
      if (!gs || pausedRef.current) return
      if (gs.screen === 'ready') launchBall(gs)
    }
    canvas.addEventListener('mousemove', onMove)
    canvas.addEventListener('click',     onClick)
    return () => {
      canvas.removeEventListener('mousemove', onMove)
      canvas.removeEventListener('click',     onClick)
    }
  }, [])

  useImperativeHandle(ref, () => ({
    restart() {
      cancelAnimationFrame(rafRef.current)
      gsRef.current      = buildGS()
      emitted.current    = { score: -1, lives: -1, level: -1 }
      gOverFired.current = false
      if (!pausedRef.current) rafRef.current = requestAnimationFrame(tickRef.current)
    },
  }))

  return (
    <canvas
      ref={canvasRef}
      width={W}
      height={H}
      style={{ display: 'block', position: 'absolute', inset: 0, width: '100%', height: '100%' }}
    />
  )
})

ArkanoidCanvas.displayName = 'ArkanoidCanvas'
export default ArkanoidCanvas
