'use client'

import { forwardRef, useEffect, useImperativeHandle, useRef } from 'react'

export interface TetrisHandle {
  restart: () => void
}

interface Props {
  paused: boolean
  onScore: (score: number) => void
  onLives: (lines: number) => void
  onLevel: (level: number) => void
  onGameOver: () => void
}

/* ── Constants ────────────────────────────────────────────────────────── */

const COLS = 10
const ROWS = 20
const BLOCK = 30
const BOARD_W = COLS * BLOCK   // 300
const BOARD_H = ROWS * BLOCK   // 600
const SIDE_W = 120
const W = BOARD_W + SIDE_W     // 420
const H = BOARD_H              // 600

const NEON = {
  bg: '#000010',
  colors: [null, '#00ffff', '#ffff00', '#ff00ff', '#00ff88', '#ff3366', '#3399ff', '#ff8800', '#aaff00'] as (string | null)[],
  renderBlock(ctx: CanvasRenderingContext2D, x: number, y: number, color: string, size: number, alpha?: number) {
    ctx.globalAlpha = alpha ?? 1
    ctx.shadowColor = color
    ctx.shadowBlur = 15
    ctx.fillStyle = color
    ctx.fillRect(x * size + 2, y * size + 2, size - 4, size - 4)
    ctx.shadowBlur = 0
    ctx.fillStyle = 'rgba(255,255,255,0.35)'
    const cx = x * size + Math.floor(size / 2) - 3
    const cy = y * size + Math.floor(size / 2) - 3
    ctx.fillRect(cx, cy, 6, 6)
    ctx.globalAlpha = 1
  },
}

const PIECES = [
  null,
  [[0,0,0,0],[1,1,1,1],[0,0,0,0],[0,0,0,0]], // I
  [[2,2],[2,2]],                               // O
  [[0,3,0],[3,3,3],[0,0,0]],                  // T
  [[0,4,4],[4,4,0],[0,0,0]],                  // S
  [[5,5,0],[0,5,5],[0,0,0]],                  // Z
  [[6,0,0],[6,6,6],[0,0,0]],                  // J
  [[0,0,7],[7,7,7],[0,0,0]],                  // L
  [[8,8,8],[8,0,8],[8,8,8]],                  // P
]

const LINE_SCORES = [0, 100, 300, 500, 800]
const POWERUPS = ['bomb', 'ray', 'gravity'] as const
type PowerupType = typeof POWERUPS[number]
const POWER_COLORS: Record<PowerupType, string> = { bomb: '#e53935', ray: '#fdd835', gravity: '#42a5f5' }
const POWER_LABELS: Record<PowerupType, string>  = { bomb: '💣', ray: '⚡', gravity: '🌍' }
const POWERUP_INTERVAL = 5

/* ── Types ────────────────────────────────────────────────────────────── */

type Board = number[][]
interface Piece {
  type: number
  shape: number[][]
  x: number
  y: number
  power?: PowerupType
}

interface GS {
  board: Board
  current: Piece
  next: Piece
  score: number
  lines: number
  level: number
  state: 'playing' | 'gameover'
  dropAccum: number
  dropInterval: number
  lastTime: number
  powerupPending: boolean
  powerupCounter: number
}

/* ── Engine ───────────────────────────────────────────────────────────── */

function createBoard(): Board {
  return Array.from({ length: ROWS }, () => new Array(COLS).fill(0))
}

function randomPiece(): Piece {
  const type = Math.floor(Math.random() * 8) + 1
  const shape = (PIECES[type] as number[][]).map(row => [...row])
  return { type, shape, x: Math.floor(COLS / 2) - Math.floor(shape[0].length / 2), y: 0 }
}

function randomPowerup(): Piece {
  const type = Math.floor(Math.random() * 8) + 1
  const shape = (PIECES[type] as number[][]).map(row => [...row])
  const power = POWERUPS[Math.floor(Math.random() * POWERUPS.length)]
  return { type, shape, x: Math.floor(COLS / 2) - Math.floor(shape[0].length / 2), y: 0, power }
}

function generatePiece(g: GS): Piece {
  if (g.powerupPending) {
    g.powerupPending = false
    return randomPowerup()
  }
  return randomPiece()
}

function collide(board: Board, shape: number[][], ox: number, oy: number): boolean {
  for (let r = 0; r < shape.length; r++) {
    for (let c = 0; c < shape[r].length; c++) {
      if (!shape[r][c]) continue
      const nx = ox + c
      const ny = oy + r
      if (nx < 0 || nx >= COLS || ny >= ROWS) return true
      if (ny >= 0 && board[ny][nx]) return true
    }
  }
  return false
}

function rotateCW(shape: number[][]): number[][] {
  const rows = shape.length, cols = shape[0].length
  const result = Array.from({ length: cols }, () => new Array(rows).fill(0))
  for (let r = 0; r < rows; r++)
    for (let c = 0; c < cols; c++)
      result[c][rows - 1 - r] = shape[r][c]
  return result
}

function tryRotate(g: GS) {
  const rotated = rotateCW(g.current.shape)
  for (const kick of [0, -1, 1, -2, 2]) {
    if (!collide(g.board, rotated, g.current.x + kick, g.current.y)) {
      g.current.shape = rotated
      g.current.x += kick
      return
    }
  }
}

function merge(g: GS) {
  for (let r = 0; r < g.current.shape.length; r++)
    for (let c = 0; c < g.current.shape[r].length; c++)
      if (g.current.shape[r][c])
        g.board[g.current.y + r][g.current.x + c] = g.current.shape[r][c]
}

function clearLines(g: GS) {
  let cleared = 0
  for (let r = ROWS - 1; r >= 0; r--) {
    if (g.board[r].every(v => v !== 0)) {
      g.board.splice(r, 1)
      g.board.unshift(new Array(COLS).fill(0))
      cleared++
      r++
    }
  }
  if (cleared) {
    g.lines += cleared
    g.score += (LINE_SCORES[cleared] || 0) * g.level
    g.level = Math.floor(g.lines / 10) + 1
    g.dropInterval = Math.max(100, 1000 - (g.level - 1) * 90)
    g.powerupCounter += cleared
    while (g.powerupCounter >= POWERUP_INTERVAL) {
      g.powerupCounter -= POWERUP_INTERVAL
      g.powerupPending = true
    }
  }
}

function ghostY(g: GS): number {
  let gy = g.current.y
  while (!collide(g.board, g.current.shape, g.current.x, gy + 1)) gy++
  return gy
}

function hardDrop(g: GS) {
  const gy = ghostY(g)
  g.score += (gy - g.current.y) * 2
  g.current.y = gy
  lockPiece(g)
}

function softDrop(g: GS) {
  if (!collide(g.board, g.current.shape, g.current.x, g.current.y + 1)) {
    g.current.y++
    g.score += 1
  } else {
    lockPiece(g)
  }
}

function pieceAnchor(p: Piece) {
  let sumX = 0, sumY = 0, count = 0
  for (let r = 0; r < p.shape.length; r++)
    for (let c = 0; c < p.shape[r].length; c++)
      if (p.shape[r][c]) { sumX += p.x + c; sumY += p.y + r; count++ }
  return { ax: Math.round(sumX / count), ay: Math.round(sumY / count) }
}

function applyBomb(g: GS, ax: number, ay: number) {
  let destroyed = 0
  for (let r = ay - 1; r <= ay + 1; r++)
    for (let c = ax - 1; c <= ax + 1; c++)
      if (r >= 0 && r < ROWS && c >= 0 && c < COLS && g.board[r][c]) {
        g.board[r][c] = 0
        destroyed++
      }
  g.score += destroyed * 10
}

function applyRay(g: GS, ax: number, ay: number) {
  let destroyed = 0
  for (let c = 0; c < COLS; c++) if (g.board[ay][c]) { g.board[ay][c] = 0; destroyed++ }
  for (let r = 0; r < ROWS; r++) if (g.board[r][ax]) { g.board[r][ax] = 0; destroyed++ }
  g.score += destroyed * 10
}

function applyGravity(g: GS) {
  for (let c = 0; c < COLS; c++) {
    const cells: number[] = []
    for (let r = 0; r < ROWS; r++) if (g.board[r][c]) cells.push(g.board[r][c])
    for (let r = 0; r < ROWS; r++)
      g.board[r][c] = r < ROWS - cells.length ? 0 : cells[r - (ROWS - cells.length)]
  }
}

function applyPowerup(g: GS, p: Piece) {
  const { ax, ay } = pieceAnchor(p)
  if (p.power === 'bomb')    applyBomb(g, ax, ay)
  if (p.power === 'ray')     applyRay(g, ax, ay)
  if (p.power === 'gravity') applyGravity(g)
}

function lockPiece(g: GS) {
  if (g.current.power) {
    applyPowerup(g, g.current)
  } else {
    merge(g)
  }
  clearLines(g)
  spawn(g)
}

function spawn(g: GS) {
  g.current = g.next
  g.next = generatePiece(g)
  if (collide(g.board, g.current.shape, g.current.x, g.current.y)) {
    g.state = 'gameover'
  }
}

function buildGS(): GS {
  const g: GS = {
    board: createBoard(),
    current: randomPiece(),
    next: randomPiece(),
    score: 0,
    lines: 0,
    level: 1,
    state: 'playing',
    dropAccum: 0,
    dropInterval: 1000,
    lastTime: performance.now(),
    powerupPending: false,
    powerupCounter: 0,
  }
  // spawn first piece properly
  g.current = g.next
  g.next = generatePiece(g)
  return g
}

/* ── Rendering ────────────────────────────────────────────────────────── */

function drawBlock(ctx: CanvasRenderingContext2D, x: number, y: number, colorIdx: number, size: number, alpha?: number) {
  if (!colorIdx) return
  const color = NEON.colors[colorIdx]
  if (!color) return
  NEON.renderBlock(ctx, x, y, color, size, alpha)
}

function drawPowerCell(ctx: CanvasRenderingContext2D, x: number, y: number, power: PowerupType, size: number, alpha?: number) {
  ctx.globalAlpha = alpha ?? 1
  ctx.fillStyle = POWER_COLORS[power]
  ctx.fillRect(x * size + 1, y * size + 1, size - 2, size - 2)
  ctx.fillStyle = 'rgba(255,255,255,0.18)'
  ctx.fillRect(x * size + 1, y * size + 1, size - 2, 4)
  ctx.globalAlpha = (alpha ?? 1) * 0.9
  ctx.font = `bold ${Math.floor(size * 0.55)}px sans-serif`
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillStyle = '#fff'
  ctx.fillText(POWER_LABELS[power], x * size + size / 2, y * size + size / 2)
  ctx.globalAlpha = 1
}

function renderGame(ctx: CanvasRenderingContext2D, g: GS) {
  // Background
  ctx.fillStyle = NEON.bg
  ctx.fillRect(0, 0, W, H)

  // Subtle grid
  ctx.strokeStyle = '#1a1a2e'
  ctx.lineWidth = 0.5
  for (let c = 1; c < COLS; c++) {
    ctx.beginPath(); ctx.moveTo(c * BLOCK, 0); ctx.lineTo(c * BLOCK, H); ctx.stroke()
  }
  for (let r = 1; r < ROWS; r++) {
    ctx.beginPath(); ctx.moveTo(0, r * BLOCK); ctx.lineTo(BOARD_W, r * BLOCK); ctx.stroke()
  }

  // Board cells
  for (let r = 0; r < ROWS; r++)
    for (let c = 0; c < COLS; c++)
      drawBlock(ctx, c, r, g.board[r][c], BLOCK)

  // Ghost
  const gy = ghostY(g)
  for (let r = 0; r < g.current.shape.length; r++)
    for (let c = 0; c < g.current.shape[r].length; c++)
      if (g.current.shape[r][c]) {
        if (g.current.power)
          drawPowerCell(ctx, g.current.x + c, gy + r, g.current.power, BLOCK, 0.2)
        else
          drawBlock(ctx, g.current.x + c, gy + r, g.current.shape[r][c], BLOCK, 0.2)
      }

  // Current piece
  for (let r = 0; r < g.current.shape.length; r++)
    for (let c = 0; c < g.current.shape[r].length; c++)
      if (g.current.shape[r][c]) {
        if (g.current.power)
          drawPowerCell(ctx, g.current.x + c, g.current.y + r, g.current.power, BLOCK)
        else
          drawBlock(ctx, g.current.x + c, g.current.y + r, g.current.shape[r][c], BLOCK)
      }

  // Right panel divider
  ctx.strokeStyle = '#00ffff33'
  ctx.lineWidth = 1
  ctx.beginPath(); ctx.moveTo(BOARD_W, 0); ctx.lineTo(BOARD_W, H); ctx.stroke()

  // NEXT label
  ctx.fillStyle = '#00ffff'
  ctx.shadowColor = '#00ffff'
  ctx.shadowBlur = 8
  ctx.font = 'bold 11px monospace'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'top'
  ctx.fillText('NEXT', BOARD_W + SIDE_W / 2, 20)
  ctx.shadowBlur = 0

  // Next piece preview in right panel (centered in 4×4 area, NB=24)
  const NB = 24
  const shape = g.next.shape
  const offX = Math.floor((4 - shape[0].length) / 2)
  const offY = Math.floor((4 - shape.length) / 2)
  const panelStartX = BOARD_W + (SIDE_W - 4 * NB) / 2
  const panelStartY = 44

  ctx.save()
  ctx.translate(panelStartX, panelStartY)
  for (let r = 0; r < shape.length; r++)
    for (let c = 0; c < shape[r].length; c++)
      if (shape[r][c]) {
        if (g.next.power)
          drawPowerCell(ctx, offX + c, offY + r, g.next.power, NB)
        else
          drawBlock(ctx, offX + c, offY + r, shape[r][c], NB)
      }
  ctx.restore()
}

/* ── Component ────────────────────────────────────────────────────────── */

const TetrisCanvas = forwardRef<TetrisHandle, Props>(function TetrisCanvas(
  { paused, onScore, onLives, onLevel, onGameOver },
  ref,
) {
  const canvasRef   = useRef<HTMLCanvasElement>(null)
  const rafRef      = useRef(0)
  const pausedRef   = useRef(paused)
  const cbRef       = useRef({ onScore, onLives, onLevel, onGameOver })
  cbRef.current     = { onScore, onLives, onLevel, onGameOver }

  const gsRef       = useRef<GS | null>(null)
  const emitted     = useRef({ score: -1, lines: -1, level: -1 })
  const gOverFired  = useRef(false)
  const tickRef     = useRef<(ts: number) => void>(() => {})
  const firstPause  = useRef(true)

  // Main game loop
  useEffect(() => {
    const canvas = canvasRef.current!
    const ctx = canvas.getContext('2d')!
    gsRef.current = buildGS()

    function tick(ts: number) {
      const g = gsRef.current!

      if (!pausedRef.current && g.state === 'playing') {
        const dt = ts - g.lastTime
        g.lastTime = ts
        g.dropAccum += dt
        if (g.dropAccum >= g.dropInterval) {
          g.dropAccum = 0
          if (!collide(g.board, g.current.shape, g.current.x, g.current.y + 1)) {
            g.current.y++
          } else {
            lockPiece(g)
          }
        }
      } else {
        g.lastTime = ts
      }

      renderGame(ctx, g)

      const e  = emitted.current
      const cb = cbRef.current
      if (g.score !== e.score) { cb.onScore(g.score); e.score = g.score }
      if (g.lines !== e.lines) { cb.onLives(g.lines); e.lines = g.lines }
      if (g.level !== e.level) { cb.onLevel(g.level); e.level = g.level }
      if (g.state === 'gameover' && !gOverFired.current) {
        gOverFired.current = true
        cb.onGameOver()
      }

      if (g.state !== 'gameover') {
        rafRef.current = requestAnimationFrame(tick)
      }
    }

    tickRef.current = tick
    rafRef.current  = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(rafRef.current)
  }, [])

  // Pause / resume
  useEffect(() => {
    pausedRef.current = paused
    if (firstPause.current) { firstPause.current = false; return }
    if (paused) {
      cancelAnimationFrame(rafRef.current)
    } else if (gsRef.current?.state === 'playing') {
      gsRef.current.lastTime = performance.now()
      rafRef.current = requestAnimationFrame(tickRef.current)
    }
  }, [paused])

  // Keyboard
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      const g = gsRef.current
      if (!g || pausedRef.current || g.state !== 'playing') return
      switch (e.code) {
        case 'ArrowLeft':
          e.preventDefault()
          if (!collide(g.board, g.current.shape, g.current.x - 1, g.current.y)) g.current.x--
          break
        case 'ArrowRight':
          e.preventDefault()
          if (!collide(g.board, g.current.shape, g.current.x + 1, g.current.y)) g.current.x++
          break
        case 'ArrowDown':
          e.preventDefault()
          softDrop(g)
          break
        case 'ArrowUp':
        case 'KeyX':
          e.preventDefault()
          tryRotate(g)
          break
        case 'Space':
          e.preventDefault()
          hardDrop(g)
          break
      }
    }
    window.addEventListener('keydown', down)
    return () => window.removeEventListener('keydown', down)
  }, [])

  useImperativeHandle(ref, () => ({
    restart() {
      cancelAnimationFrame(rafRef.current)
      gsRef.current      = buildGS()
      emitted.current    = { score: -1, lines: -1, level: -1 }
      gOverFired.current = false
      if (!pausedRef.current) rafRef.current = requestAnimationFrame(tickRef.current)
    },
  }))

  return (
    <canvas
      ref={canvasRef}
      width={W}
      height={H}
      style={{ display: 'block', position: 'absolute', top: 0, bottom: 0, left: '50%', transform: 'translateX(-50%)', height: '100%', width: 'auto' }}
    />
  )
})

TetrisCanvas.displayName = 'TetrisCanvas'
export default TetrisCanvas
