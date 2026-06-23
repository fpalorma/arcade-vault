'use client'

import { forwardRef, useEffect, useImperativeHandle, useRef } from 'react'

export interface FroggerHandle {
  restart: () => void
}

interface FroggerGameProps {
  paused: boolean
  onScoreChange: (score: number) => void
  onLivesChange: (lives: number) => void
  onLevelChange: (level: number) => void
  onGameOver: (finalScore: number) => void
}

// ─── Constants ───────────────────────────────────────────────────────────────
const COLS = 16
const ROWS = 14
const CELL = 40
const CANVAS_W = COLS * CELL // 640
const CANVAS_H = ROWS * CELL // 560

const ROW_GOALS    = 0
const ROW_RIVER_TOP = 1
const ROW_RIVER_BOT = 6
const ROW_SAFE_MID  = 7
const ROW_ROAD_TOP  = 8
const ROW_ROAD_BOT  = 12
const ROW_START     = 13

const ROUND_TIME_BASE = 15000 // ms
const JUMP_DURATION   = 120   // ms
const TURTLE_VISIBLE  = 3000  // ms
const TURTLE_SUBMERGED = 1500 // ms

// Goal mouth positions: 5 mouths at cols 1,4,7,10,13 (center col of each 2-col slot)
const GOAL_COLS = [1, 4, 7, 10, 13]

// ─── Types ────────────────────────────────────────────────────────────────────
type Direction = 'up' | 'down' | 'left' | 'right'

interface Entity {
  col: number        // fractional column position
  width: number      // in cells
  type: 'car' | 'truck' | 'log' | 'turtle'
  submerged?: boolean
  turtleTimer?: number
  color?: string
}

interface Lane {
  row: number
  speed: number      // cells per second
  dir: 1 | -1
  entities: Entity[]
  type: 'road' | 'river'
}

interface Frog {
  col: number
  row: number
  animating: boolean
  animT: number
  targetCol: number
  targetRow: number
  fromCol: number
  fromRow: number
  dead: boolean
  deadT: number
}

// ─── Lane builder ────────────────────────────────────────────────────────────
function buildLanes(level: number): Lane[] {
  const speedMul = Math.pow(1.15, level - 1)
  const lanes: Lane[] = []

  // Road lanes (rows 8–12), bottom to top
  const roadConfigs = [
    { row: 12, speed: 2.5, dir:  1 as 1|-1, entities: [
      { col: 0,  width: 2, type: 'car'   as const, color: '#e74c3c' },
      { col: 5,  width: 2, type: 'car'   as const, color: '#3498db' },
      { col: 10, width: 2, type: 'car'   as const, color: '#f39c12' },
    ]},
    { row: 11, speed: 1.8, dir: -1 as 1|-1, entities: [
      { col: 1,  width: 3, type: 'truck' as const, color: '#95a5a6' },
      { col: 8,  width: 3, type: 'truck' as const, color: '#7f8c8d' },
    ]},
    { row: 10, speed: 3.2, dir:  1 as 1|-1, entities: [
      { col: 0,  width: 1, type: 'car'   as const, color: '#9b59b6' },
      { col: 4,  width: 1, type: 'car'   as const, color: '#1abc9c' },
      { col: 8,  width: 1, type: 'car'   as const, color: '#e67e22' },
      { col: 12, width: 1, type: 'car'   as const, color: '#e74c3c' },
    ]},
    { row: 9, speed: 2.0, dir: -1 as 1|-1, entities: [
      { col: 2,  width: 2, type: 'car'   as const, color: '#2ecc71' },
      { col: 7,  width: 3, type: 'truck' as const, color: '#95a5a6' },
      { col: 13, width: 2, type: 'car'   as const, color: '#3498db' },
    ]},
    { row: 8, speed: 2.8, dir:  1 as 1|-1, entities: [
      { col: 0,  width: 2, type: 'car'   as const, color: '#f39c12' },
      { col: 5,  width: 1, type: 'car'   as const, color: '#e74c3c' },
      { col: 9,  width: 2, type: 'truck' as const, color: '#7f8c8d' },
    ]},
  ]

  for (const cfg of roadConfigs) {
    lanes.push({
      row: cfg.row,
      speed: cfg.speed * speedMul,
      dir: cfg.dir,
      type: 'road',
      entities: cfg.entities.map(e => ({ ...e })),
    })
  }

  // River lanes (rows 1–6), bottom to top
  const riverConfigs = [
    { row: 6, speed: 1.5, dir:  1 as 1|-1, entities: [
      { col: 0,  width: 2, type: 'turtle' as const, turtleTimer: 0, submerged: false },
      { col: 4,  width: 2, type: 'turtle' as const, turtleTimer: 1000, submerged: false },
      { col: 9,  width: 3, type: 'turtle' as const, turtleTimer: 500, submerged: false },
    ]},
    { row: 5, speed: 2.0, dir: -1 as 1|-1, entities: [
      { col: 0,  width: 3, type: 'log'    as const },
      { col: 6,  width: 4, type: 'log'    as const },
      { col: 12, width: 3, type: 'log'    as const },
    ]},
    { row: 4, speed: 1.2, dir:  1 as 1|-1, entities: [
      { col: 1,  width: 2, type: 'turtle' as const, turtleTimer: 0, submerged: false },
      { col: 6,  width: 2, type: 'turtle' as const, turtleTimer: 2000, submerged: false },
      { col: 11, width: 2, type: 'turtle' as const, turtleTimer: 700, submerged: false },
    ]},
    { row: 3, speed: 2.5, dir: -1 as 1|-1, entities: [
      { col: 0,  width: 4, type: 'log'    as const },
      { col: 7,  width: 3, type: 'log'    as const },
    ]},
    { row: 2, speed: 1.8, dir:  1 as 1|-1, entities: [
      { col: 2,  width: 2, type: 'turtle' as const, turtleTimer: 1500, submerged: false },
      { col: 7,  width: 3, type: 'turtle' as const, turtleTimer: 0, submerged: false },
      { col: 13, width: 2, type: 'turtle' as const, turtleTimer: 800, submerged: false },
    ]},
    { row: 1, speed: 3.0, dir: -1 as 1|-1, entities: [
      { col: 0,  width: 3, type: 'log'    as const },
      { col: 5,  width: 2, type: 'log'    as const },
      { col: 10, width: 4, type: 'log'    as const },
    ]},
  ]

  for (const cfg of riverConfigs) {
    lanes.push({
      row: cfg.row,
      speed: cfg.speed * speedMul,
      dir: cfg.dir,
      type: 'river',
      entities: cfg.entities.map(e => ({ ...e })),
    })
  }

  return lanes
}

// ─── Component ────────────────────────────────────────────────────────────────
const FroggerGame = forwardRef<FroggerHandle, FroggerGameProps>(
  ({ paused, onScoreChange, onLivesChange, onLevelChange, onGameOver }, ref) => {
    const canvasRef = useRef<HTMLCanvasElement>(null)

    // Mutable game state (avoid React re-renders in game loop)
    const state = useRef({
      lives: 3,
      score: 0,
      level: 1,
      goals: new Array<boolean>(5).fill(false),
      roundTime: ROUND_TIME_BASE,
      lastTime: 0,
      animFrame: 0,
      lanes: [] as Lane[],
      frog: {
        col: 8, row: ROW_START,
        animating: false, animT: 0,
        targetCol: 8, targetRow: ROW_START,
        fromCol: 8, fromRow: ROW_START,
        dead: false, deadT: 0,
      } as Frog,
      pendingDir: null as Direction | null,
      over: false,
      // Track advanced rows for scoring (per frog life)
      maxRow: ROW_START,
      // callbacks refs (avoid stale closures)
      onScoreChange,
      onLivesChange,
      onLevelChange,
      onGameOver,
      paused,
    })

    // Keep callback refs fresh
    useEffect(() => {
      state.current.onScoreChange = onScoreChange
      state.current.onLivesChange = onLivesChange
      state.current.onLevelChange = onLevelChange
      state.current.onGameOver    = onGameOver
    })

    useEffect(() => {
      state.current.paused = paused
    }, [paused])

    useImperativeHandle(ref, () => ({
      restart() {
        const s = state.current
        s.lives = 3
        s.score = 0
        s.level = 1
        s.goals = new Array<boolean>(5).fill(false)
        s.roundTime = ROUND_TIME_BASE
        s.over = false
        s.lanes = buildLanes(1)
        resetFrog(s.frog)
        s.maxRow = ROW_START
        s.onScoreChange(0)
        s.onLivesChange(3)
        s.onLevelChange(1)
      },
    }))

    useEffect(() => {
      const canvas = canvasRef.current
      if (!canvas) return
      const ctx = canvas.getContext('2d')
      if (!ctx) return

      const s = state.current
      s.lanes = buildLanes(1)
      s.lastTime = performance.now()

      // ── Key handler ──
      const onKey = (e: KeyboardEvent) => {
        const map: Record<string, Direction> = {
          ArrowUp: 'up', w: 'up', W: 'up',
          ArrowDown: 'down', s: 'down', S: 'down',
          ArrowLeft: 'left', a: 'left', A: 'left',
          ArrowRight: 'right', d: 'right', D: 'right',
        }
        const dir = map[e.key]
        if (dir) {
          e.preventDefault()
          s.pendingDir = dir
        }
      }
      window.addEventListener('keydown', onKey)

      // ── Game loop ──
      function loop(now: number) {
        s.animFrame = requestAnimationFrame(loop)
        const dt = Math.min(now - s.lastTime, 50)
        s.lastTime = now

        if (!s.paused && !s.over) update(dt)
        draw(ctx!)
      }

      // ── Update ──
      function update(dt: number) {
        const s = state.current

        // Update turtle timers
        for (const lane of s.lanes) {
          if (lane.type !== 'river') continue
          for (const e of lane.entities) {
            if (e.type !== 'turtle') continue
            e.turtleTimer! += dt
            const cycle = TURTLE_VISIBLE + TURTLE_SUBMERGED
            e.submerged = (e.turtleTimer! % cycle) > TURTLE_VISIBLE
          }
        }

        // Move entities
        for (const lane of s.lanes) {
          const speedPx = (lane.speed * CELL * dt) / 1000
          for (const e of lane.entities) {
            e.col += (speedPx / CELL) * lane.dir
            if (lane.dir === 1 && e.col > COLS) e.col = -e.width
            if (lane.dir === -1 && e.col < -e.width) e.col = COLS
          }
        }

        // Dead animation
        if (s.frog.dead) {
          s.frog.deadT += dt
          if (s.frog.deadT > 500) {
            s.frog.dead = false
            if (!s.over) resetFrog(s.frog)
          }
          return
        }

        // Round timer
        s.roundTime -= dt
        if (s.roundTime <= 0) {
          s.roundTime = 0
          killFrog(s, false)
          return
        }

        const frog = s.frog

        // Continuous road collision (vehicles move past stationary frog)
        if (!frog.animating && frog.row >= ROW_ROAD_TOP && frog.row <= ROW_ROAD_BOT) {
          if (checkRoadCollision(frog, s.lanes)) {
            killFrog(s, false)
            return
          }
        }

        // River drift (when not animating and on river)
        if (!frog.animating && frog.row >= ROW_RIVER_TOP && frog.row <= ROW_RIVER_BOT) {
          const support = getSupport(frog, s.lanes)
          if (!support) {
            killFrog(s, false)
            return
          }
          const lane = s.lanes.find(l => l.row === frog.row)!
          const driftPx = (lane.speed * CELL * dt) / 1000
          frog.col += (driftPx / CELL) * lane.dir
          frog.fromCol = frog.col
          // Kill if drifted off screen
          if (frog.col < 0 || frog.col >= COLS) {
            killFrog(s, false)
            return
          }
        }

        // Frog animation
        if (frog.animating) {
          frog.animT += dt
          if (frog.animT >= JUMP_DURATION) {
            frog.col = frog.targetCol
            frog.row = frog.targetRow
            frog.animating = false
            resolveCell(s)
          }
        } else {
          // Process pending input
          if (s.pendingDir) {
            const dir = s.pendingDir
            s.pendingDir = null

            let nc = frog.col
            let nr = frog.row
            if (dir === 'up')    nr--
            if (dir === 'down')  nr++
            if (dir === 'left')  nc--
            if (dir === 'right') nc++

            // Clamp horizontal
            nc = Math.max(0, Math.min(COLS - 1, nc))
            // Clamp vertical
            nr = Math.max(ROW_GOALS, Math.min(ROW_START, nr))

            frog.fromCol = frog.col
            frog.fromRow = frog.row
            frog.targetCol = nc
            frog.targetRow = nr
            frog.animating = true
            frog.animT = 0
          }
        }
      }

      // ── Resolve cell after landing ──
      function resolveCell(s: typeof state.current) {
        const frog = s.frog

        // Score for moving up (first time reaching a row)
        if (frog.row < s.maxRow) {
          const steps = s.maxRow - frog.row
          const newScore = s.score + steps * 10
          if (newScore !== s.score) {
            s.score = newScore
            s.onScoreChange(s.score)
          }
          s.maxRow = frog.row
        }

        // Goal row
        if (frog.row === ROW_GOALS) {
          checkGoal(s)
          return
        }

        // Road collision check
        if (frog.row >= ROW_ROAD_TOP && frog.row <= ROW_ROAD_BOT) {
          if (checkRoadCollision(frog, s.lanes)) {
            killFrog(s, false)
            return
          }
        }

        // River: immediate check after landing
        if (frog.row >= ROW_RIVER_TOP && frog.row <= ROW_RIVER_BOT) {
          const support = getSupport(frog, s.lanes)
          if (!support) {
            killFrog(s, false)
            return
          }
        }
      }

      // ── Draw ──
      function draw(ctx: CanvasRenderingContext2D) {
        const s = state.current

        ctx.clearRect(0, 0, CANVAS_W, CANVAS_H)

        // Background zones
        for (let r = 0; r < ROWS; r++) {
          if (r === ROW_GOALS) {
            ctx.fillStyle = '#1a3d1a'
          } else if (r >= ROW_RIVER_TOP && r <= ROW_RIVER_BOT) {
            ctx.fillStyle = '#0a1f4a'
          } else if (r === ROW_SAFE_MID || r === ROW_START) {
            ctx.fillStyle = '#1a3d1a'
          } else {
            ctx.fillStyle = '#1a1a1a' // road
          }
          ctx.fillRect(0, r * CELL, CANVAS_W, CELL)
        }

        // Road lane markings
        for (let r = ROW_ROAD_TOP; r <= ROW_ROAD_BOT; r++) {
          ctx.fillStyle = '#333'
          ctx.fillRect(0, r * CELL + CELL / 2 - 2, CANVAS_W, 4)
        }

        // Goal mouths
        for (let i = 0; i < 5; i++) {
          const gc = GOAL_COLS[i]
          const x = gc * CELL
          const y = ROW_GOALS * CELL
          ctx.fillStyle = '#0d2b0d'
          ctx.strokeStyle = '#ffd700'
          ctx.lineWidth = 2
          ctx.fillRect(x, y, CELL * 2, CELL)
          ctx.strokeRect(x + 1, y + 1, CELL * 2 - 2, CELL - 2)

          if (s.goals[i]) {
            // Filled mouth — draw frog silhouette
            ctx.fillStyle = '#00cc44'
            ctx.beginPath()
            ctx.ellipse(x + CELL, y + CELL / 2, 14, 12, 0, 0, Math.PI * 2)
            ctx.fill()
          }
        }

        // Entities
        for (const lane of s.lanes) {
          for (const e of lane.entities) {
            drawEntity(ctx, e, lane.row)
          }
        }

        // Frog
        drawFrog(ctx, s.frog)

        // HUD
        drawHUD(ctx, s)
      }

      s.animFrame = requestAnimationFrame(loop)

      return () => {
        cancelAnimationFrame(s.animFrame)
        window.removeEventListener('keydown', onKey)
      }
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])

    return (
      <canvas
        ref={canvasRef}
        width={CANVAS_W}
        height={CANVAS_H}
        style={{ width: '100%', height: '100%', display: 'block', imageRendering: 'pixelated' }}
      />
    )
  }
)

FroggerGame.displayName = 'FroggerGame'
export default FroggerGame

// ─── Helper functions ────────────────────────────────────────────────────────

function resetFrog(frog: Frog) {
  frog.col = 8
  frog.row = ROW_START
  frog.animating = false
  frog.animT = 0
  frog.targetCol = 8
  frog.targetRow = ROW_START
  frog.fromCol = 8
  frog.fromRow = ROW_START
  frog.dead = false
  frog.deadT = 0
}

function checkRoadCollision(frog: Frog, lanes: Lane[]): boolean {
  const lane = lanes.find(l => l.row === frog.row && l.type === 'road')
  if (!lane) return false
  for (const e of lane.entities) {
    if (frog.col >= e.col && frog.col < e.col + e.width) return true
  }
  return false
}

function getSupport(frog: Frog, lanes: Lane[]): Entity | null {
  const lane = lanes.find(l => l.row === frog.row && l.type === 'river')
  if (!lane) return null
  for (const e of lane.entities) {
    if (frog.col >= e.col && frog.col < e.col + e.width) {
      if (e.type === 'turtle' && e.submerged) return null
      return e
    }
  }
  return null
}

function checkGoal(s: {
  frog: Frog
  goals: boolean[]
  score: number
  roundTime: number
  level: number
  lanes: Lane[]
  over: boolean
  maxRow: number
  onScoreChange: (n: number) => void
  onLivesChange: (n: number) => void
  onLevelChange: (n: number) => void
  onGameOver: (n: number) => void
  lives: number
}) {
  const { frog, goals } = s
  // Find which goal slot
  let slotIdx = -1
  for (let i = 0; i < GOAL_COLS.length; i++) {
    const gc = GOAL_COLS[i]
    if (frog.col >= gc && frog.col < gc + 2) {
      slotIdx = i
      break
    }
  }

  if (slotIdx === -1 || goals[slotIdx]) {
    // Not a valid mouth or already occupied → death
    killFrog(s, true)
    return
  }

  goals[slotIdx] = true
  const timeBonus = Math.floor((s.roundTime / 1000) * 10)
  s.score += 50 + timeBonus
  s.onScoreChange(s.score)

  // Check if all 5 goals filled
  if (goals.every(Boolean)) {
    completeRound(s)
  } else {
    resetFrog(s.frog)
    s.maxRow = ROW_START
    s.roundTime = getRoundTime(s.level)
  }
}

function killFrog(s: {
  frog: Frog
  lives: number
  score: number
  over: boolean
  onLivesChange: (n: number) => void
  onGameOver: (n: number) => void
  level: number
  lanes: Lane[]
  goals: boolean[]
  roundTime: number
  maxRow: number
  onScoreChange: (n: number) => void
  onLevelChange: (n: number) => void
}, resetGoals: boolean) {
  s.lives--
  s.frog.dead = true
  s.frog.deadT = 0
  s.maxRow = ROW_START

  if (resetGoals) {
    // Only reset frog position, not goals
  }

  if (s.lives <= 0) {
    s.lives = 0
    s.onLivesChange(0)
    s.over = true
    s.onGameOver(s.score)
  } else {
    s.onLivesChange(s.lives)
    s.roundTime = getRoundTime(s.level)
  }
}

function completeRound(s: {
  score: number
  level: number
  goals: boolean[]
  frog: Frog
  roundTime: number
  lanes: Lane[]
  maxRow: number
  onScoreChange: (n: number) => void
  onLevelChange: (n: number) => void
}) {
  s.score += 200
  s.onScoreChange(s.score)
  s.level++
  s.onLevelChange(s.level)
  s.goals = new Array<boolean>(5).fill(false)
  s.lanes = buildLanes(s.level)
  s.roundTime = getRoundTime(s.level)
  s.maxRow = ROW_START
  resetFrog(s.frog)
}

function getRoundTime(level: number): number {
  return Math.max(5000, ROUND_TIME_BASE - (level - 1) * 1000)
}

// ─── Draw helpers ─────────────────────────────────────────────────────────────

function drawEntity(ctx: CanvasRenderingContext2D, e: Entity, row: number) {
  const x = e.col * CELL
  const y = row * CELL
  const w = e.width * CELL
  const h = CELL

  if (e.type === 'car') {
    ctx.fillStyle = e.color ?? '#e74c3c'
    ctx.beginPath()
    ctx.roundRect(x + 2, y + 6, w - 4, h - 12, 4)
    ctx.fill()
    // Wheels
    ctx.fillStyle = '#222'
    ctx.beginPath(); ctx.arc(x + 8, y + h - 6, 4, 0, Math.PI * 2); ctx.fill()
    ctx.beginPath(); ctx.arc(x + w - 8, y + h - 6, 4, 0, Math.PI * 2); ctx.fill()
    // Windows
    ctx.fillStyle = 'rgba(200,230,255,0.6)'
    ctx.fillRect(x + 8, y + 8, w - 16, 10)
  } else if (e.type === 'truck') {
    ctx.fillStyle = e.color ?? '#95a5a6'
    ctx.beginPath()
    ctx.roundRect(x + 2, y + 5, w - 4, h - 10, 3)
    ctx.fill()
    // Cab
    ctx.fillStyle = '#7f8c8d'
    ctx.fillRect(x + w - 18, y + 5, 16, h - 10)
    // Wheels
    ctx.fillStyle = '#222'
    ctx.beginPath(); ctx.arc(x + 10, y + h - 6, 5, 0, Math.PI * 2); ctx.fill()
    ctx.beginPath(); ctx.arc(x + w - 10, y + h - 6, 5, 0, Math.PI * 2); ctx.fill()
    // Windshield
    ctx.fillStyle = 'rgba(200,230,255,0.5)'
    ctx.fillRect(x + w - 16, y + 8, 10, 10)
  } else if (e.type === 'log') {
    ctx.fillStyle = '#8B4513'
    ctx.beginPath()
    ctx.roundRect(x + 1, y + 8, w - 2, h - 16, 6)
    ctx.fill()
    // Wood grain lines
    ctx.strokeStyle = '#6B3410'
    ctx.lineWidth = 1
    for (let i = 1; i < e.width; i++) {
      ctx.beginPath()
      ctx.moveTo(x + i * CELL, y + 10)
      ctx.lineTo(x + i * CELL, y + h - 10)
      ctx.stroke()
    }
    // End caps
    ctx.fillStyle = '#A0522D'
    ctx.beginPath(); ctx.ellipse(x + 4, y + h / 2, 3, (h - 16) / 2, 0, 0, Math.PI * 2); ctx.fill()
    ctx.beginPath(); ctx.ellipse(x + w - 4, y + h / 2, 3, (h - 16) / 2, 0, 0, Math.PI * 2); ctx.fill()
  } else if (e.type === 'turtle') {
    const alpha = e.submerged ? 0.35 : 1.0
    for (let i = 0; i < e.width; i++) {
      const tx = x + i * CELL + CELL / 2
      const ty = y + CELL / 2
      ctx.globalAlpha = alpha
      // Shell
      ctx.fillStyle = '#2d8a2d'
      ctx.beginPath(); ctx.ellipse(tx, ty, 14, 12, 0, 0, Math.PI * 2); ctx.fill()
      // Shell pattern
      ctx.strokeStyle = '#1a5c1a'
      ctx.lineWidth = 1.5
      ctx.beginPath(); ctx.ellipse(tx, ty, 8, 7, 0, 0, Math.PI * 2); ctx.stroke()
      // Head
      ctx.fillStyle = '#3aad3a'
      ctx.beginPath(); ctx.ellipse(tx, ty - 13, 4, 4, 0, 0, Math.PI * 2); ctx.fill()
      ctx.globalAlpha = 1.0
    }
  }
}

function drawFrog(ctx: CanvasRenderingContext2D, frog: Frog) {
  if (frog.dead) {
    // Flash effect during death
    const flash = Math.floor(frog.deadT / 80) % 2 === 0
    if (!flash) return
    const x = frog.col * CELL + CELL / 2
    const y = frog.row * CELL + CELL / 2
    ctx.fillStyle = '#ff4444'
    ctx.beginPath(); ctx.ellipse(x, y, 16, 12, 0, 0, Math.PI * 2); ctx.fill()
    return
  }

  let drawCol = frog.col
  let drawRow = frog.row

  if (frog.animating) {
    const t = Math.min(frog.animT / JUMP_DURATION, 1)
    drawCol = frog.fromCol + (frog.targetCol - frog.fromCol) * t
    drawRow = frog.fromRow + (frog.targetRow - frog.fromRow) * t
  }

  const x = drawCol * CELL + CELL / 2
  const y = drawRow * CELL + CELL / 2

  // Body
  ctx.fillStyle = '#00e64d'
  ctx.beginPath(); ctx.ellipse(x, y, 14, 12, 0, 0, Math.PI * 2); ctx.fill()

  // Eyes
  ctx.fillStyle = '#fff'
  ctx.beginPath(); ctx.arc(x - 7, y - 7, 4, 0, Math.PI * 2); ctx.fill()
  ctx.beginPath(); ctx.arc(x + 7, y - 7, 4, 0, Math.PI * 2); ctx.fill()
  ctx.fillStyle = '#000'
  ctx.beginPath(); ctx.arc(x - 6, y - 7, 2, 0, Math.PI * 2); ctx.fill()
  ctx.beginPath(); ctx.arc(x + 6, y - 7, 2, 0, Math.PI * 2); ctx.fill()

  // Legs during jump
  if (frog.animating) {
    ctx.strokeStyle = '#00cc44'
    ctx.lineWidth = 3
    ctx.beginPath(); ctx.moveTo(x - 10, y + 5); ctx.lineTo(x - 18, y + 12); ctx.stroke()
    ctx.beginPath(); ctx.moveTo(x + 10, y + 5); ctx.lineTo(x + 18, y + 12); ctx.stroke()
  }
}

function drawHUD(ctx: CanvasRenderingContext2D, s: {
  score: number
  level: number
  lives: number
  roundTime: number
}) {
  const maxTime = ROUND_TIME_BASE
  const timeRatio = Math.max(0, s.roundTime / maxTime)

  // Score - top left
  ctx.fillStyle = 'rgba(0,0,0,0.6)'
  ctx.fillRect(0, 0, 160, 22)
  ctx.fillStyle = '#fff'
  ctx.font = 'bold 13px monospace'
  ctx.textAlign = 'left'
  ctx.fillText(`SCORE: ${s.score}`, 6, 15)

  // Level - top center
  ctx.fillStyle = 'rgba(0,0,0,0.6)'
  ctx.fillRect(CANVAS_W / 2 - 50, 0, 100, 22)
  ctx.fillStyle = '#ffd700'
  ctx.textAlign = 'center'
  ctx.fillText(`NIVEL ${s.level}`, CANVAS_W / 2, 15)

  // Lives - top right (frog icons)
  ctx.fillStyle = 'rgba(0,0,0,0.6)'
  ctx.fillRect(CANVAS_W - 110, 0, 110, 22)
  for (let i = 0; i < s.lives; i++) {
    const lx = CANVAS_W - 20 - i * 22
    ctx.fillStyle = '#00e64d'
    ctx.beginPath(); ctx.ellipse(lx, 11, 7, 6, 0, 0, Math.PI * 2); ctx.fill()
  }

  // Time bar - bottom of HUD area (just above the play field visual)
  const barW = CANVAS_W - 4
  const barH = 6
  const barY = CANVAS_H - barH - 2
  ctx.fillStyle = 'rgba(0,0,0,0.5)'
  ctx.fillRect(2, barY, barW, barH)

  const barColor = timeRatio > 0.5 ? '#2ecc71' : timeRatio > 0.25 ? '#f39c12' : '#e74c3c'
  ctx.fillStyle = barColor
  ctx.fillRect(2, barY, barW * timeRatio, barH)
}
