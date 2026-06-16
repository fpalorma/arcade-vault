'use client'

import { forwardRef, useEffect, useImperativeHandle, useRef } from 'react'

export interface AsteroidsHandle {
  restart: () => void
}

interface Props {
  paused: boolean
  onScore: (score: number) => void
  onLives: (lives: number) => void
  onLevel: (level: number) => void
  onGameOver: () => void
}

const W = 800
const H = 600

/* ── helpers ──────────────────────────────────────────────────────────── */

function wrap(o: { x: number; y: number }) {
  if (o.x < 0) o.x += W; if (o.x > W) o.x -= W
  if (o.y < 0) o.y += H; if (o.y > H) o.y -= H
}

function d2(ax: number, ay: number, bx: number, by: number) {
  return (ax - bx) ** 2 + (ay - by) ** 2
}

/* ── Ship ─────────────────────────────────────────────────────────────── */

class Ship {
  x = W / 2; y = H / 2
  angle = -Math.PI / 2
  vx = 0; vy = 0
  inv = 120
  triple = 0
  thrust = false

  reset() {
    this.x = W / 2; this.y = H / 2
    this.angle = -Math.PI / 2
    this.vx = 0; this.vy = 0
    this.inv = 120; this.triple = 0
  }

  update(keys: Set<string>) {
    if (keys.has('ArrowLeft'))  this.angle -= 0.05
    if (keys.has('ArrowRight')) this.angle += 0.05
    this.thrust = keys.has('ArrowUp')
    if (this.thrust) {
      this.vx += Math.cos(this.angle) * 0.25
      this.vy += Math.sin(this.angle) * 0.25
    }
    const sp = Math.hypot(this.vx, this.vy)
    if (sp > 7) { this.vx = this.vx / sp * 7; this.vy = this.vy / sp * 7 }
    this.vx *= 0.98; this.vy *= 0.98
    this.x += this.vx; this.y += this.vy
    wrap(this)
    if (this.inv    > 0) this.inv--
    if (this.triple > 0) this.triple--
  }

  draw(ctx: CanvasRenderingContext2D) {
    if (this.inv > 0 && Math.floor(this.inv / 5) % 2 === 0) return
    ctx.save()
    ctx.translate(this.x, this.y); ctx.rotate(this.angle)
    ctx.strokeStyle = '#00eeff'; ctx.lineWidth = 1.5
    ctx.shadowColor = '#00eeff'; ctx.shadowBlur = 10
    ctx.beginPath()
    ctx.moveTo(16, 0); ctx.lineTo(-10, 9)
    ctx.lineTo(-5, 0); ctx.lineTo(-10, -9)
    ctx.closePath(); ctx.stroke()
    if (this.thrust) {
      ctx.strokeStyle = '#ff8800'; ctx.shadowColor = '#ff8800'; ctx.shadowBlur = 6
      ctx.beginPath()
      ctx.moveTo(-5, 0)
      ctx.lineTo(-14 - Math.random() * 8, (Math.random() - 0.5) * 7)
      ctx.stroke()
    }
    ctx.restore()
  }
}

/* ── Asteroid ─────────────────────────────────────────────────────────── */

class Asteroid {
  x: number; y: number
  vx: number; vy: number
  size: number; radius: number
  rot = Math.random() * Math.PI * 2
  spin: number
  verts: { x: number; y: number }[]

  constructor(x: number, y: number, size: number, vx?: number, vy?: number) {
    this.x = x; this.y = y; this.size = size
    this.radius = size === 3 ? 40 : size === 2 ? 22 : 11
    const sp = (4 - size) * 0.65 + 0.35
    if (vx !== undefined) { this.vx = vx; this.vy = vy! }
    else {
      const d = Math.random() * Math.PI * 2
      this.vx = Math.cos(d) * sp; this.vy = Math.sin(d) * sp
    }
    this.spin = (Math.random() - 0.5) * 0.04
    const n = 9 + Math.floor(Math.random() * 4)
    this.verts = Array.from({ length: n }, (_, i) => {
      const a = (i / n) * Math.PI * 2
      const r = this.radius * (0.7 + Math.random() * 0.45)
      return { x: Math.cos(a) * r, y: Math.sin(a) * r }
    })
  }

  update() {
    this.x += this.vx; this.y += this.vy
    this.rot += this.spin
    wrap(this)
  }

  draw(ctx: CanvasRenderingContext2D) {
    ctx.save()
    ctx.translate(this.x, this.y); ctx.rotate(this.rot)
    ctx.strokeStyle = '#bbbb77'; ctx.lineWidth = 1.5
    ctx.shadowColor = '#999944'; ctx.shadowBlur = 4
    ctx.beginPath()
    ctx.moveTo(this.verts[0].x, this.verts[0].y)
    for (let i = 1; i < this.verts.length; i++) ctx.lineTo(this.verts[i].x, this.verts[i].y)
    ctx.closePath(); ctx.stroke()
    ctx.restore()
  }
}

/* ── Bullet ───────────────────────────────────────────────────────────── */

class Bullet {
  x: number; y: number
  vx: number; vy: number
  life = 55

  constructor(x: number, y: number, angle: number, spread = 0) {
    const a = angle + spread
    this.x = x + Math.cos(a) * 18
    this.y = y + Math.sin(a) * 18
    this.vx = Math.cos(a) * 10; this.vy = Math.sin(a) * 10
  }

  update() { this.x += this.vx; this.y += this.vy; this.life--; wrap(this) }

  draw(ctx: CanvasRenderingContext2D) {
    ctx.save()
    ctx.fillStyle = '#00ffff'; ctx.shadowColor = '#00ffff'; ctx.shadowBlur = 8
    ctx.beginPath(); ctx.arc(this.x, this.y, 2.5, 0, Math.PI * 2); ctx.fill()
    ctx.restore()
  }
}

/* ── Particle ─────────────────────────────────────────────────────────── */

class Particle {
  x: number; y: number; vx: number; vy: number
  life: number; max: number; color: string

  constructor(x: number, y: number, color: string) {
    this.x = x; this.y = y; this.color = color
    const sp = 0.5 + Math.random() * 3.5
    const d  = Math.random() * Math.PI * 2
    this.vx = Math.cos(d) * sp; this.vy = Math.sin(d) * sp
    this.max = this.life = 25 + Math.floor(Math.random() * 35)
  }

  update() {
    this.x += this.vx; this.y += this.vy
    this.vx *= 0.96; this.vy *= 0.96; this.life--
  }

  draw(ctx: CanvasRenderingContext2D) {
    ctx.save()
    ctx.globalAlpha = this.life / this.max
    ctx.fillStyle = this.color; ctx.shadowColor = this.color; ctx.shadowBlur = 3
    ctx.beginPath(); ctx.arc(this.x, this.y, 1.5, 0, Math.PI * 2); ctx.fill()
    ctx.restore()
  }
}

/* ── PowerUp ──────────────────────────────────────────────────────────── */

class PowerUp {
  x: number; y: number
  life = 280; pulse = 0

  constructor(x: number, y: number) { this.x = x; this.y = y }

  update() { this.life--; this.pulse += 0.12 }

  draw(ctx: CanvasRenderingContext2D) {
    ctx.save()
    ctx.globalAlpha = Math.min(1, this.life / 50)
    ctx.strokeStyle = '#ff00ff'; ctx.fillStyle = '#ff00ff'
    ctx.shadowColor = '#ff00ff'; ctx.shadowBlur = 6 + Math.sin(this.pulse) * 4
    ctx.lineWidth = 1.5
    ctx.beginPath(); ctx.arc(this.x, this.y, 11, 0, Math.PI * 2); ctx.stroke()
    ctx.font = 'bold 9px monospace'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
    ctx.fillText('×3', this.x, this.y)
    ctx.restore()
  }
}

/* ── Game state ───────────────────────────────────────────────────────── */

interface GS {
  ship: Ship
  asteroids: Asteroid[]
  bullets: Bullet[]
  particles: Particle[]
  powerUps: PowerUp[]
  score: number
  lives: number
  level: number
  state: 'playing' | 'gameover'
  cooldown: number
  keys: Set<string>
}

function spawnRocks(ship: Ship, level: number): Asteroid[] {
  const out: Asteroid[] = []
  for (let i = 0; i < 3 + level; i++) {
    let x: number, y: number
    do { x = Math.random() * W; y = Math.random() * H }
    while (d2(x, y, ship.x, ship.y) < 130 ** 2)
    out.push(new Asteroid(x, y, 3))
  }
  return out
}

function buildGS(): GS {
  const ship = new Ship()
  return {
    ship, bullets: [], particles: [], powerUps: [],
    asteroids: spawnRocks(ship, 1),
    score: 0, lives: 3, level: 1,
    state: 'playing', cooldown: 0, keys: new Set(),
  }
}

function stepGame(g: GS) {
  if (g.cooldown > 0) g.cooldown--
  if (g.keys.has('Space') && g.cooldown === 0) {
    if (g.ship.triple > 0) {
      g.bullets.push(
        new Bullet(g.ship.x, g.ship.y, g.ship.angle, -0.18),
        new Bullet(g.ship.x, g.ship.y, g.ship.angle),
        new Bullet(g.ship.x, g.ship.y, g.ship.angle,  0.18),
      )
    } else {
      g.bullets.push(new Bullet(g.ship.x, g.ship.y, g.ship.angle))
    }
    g.cooldown = 10
  }

  g.ship.update(g.keys)
  for (const a of g.asteroids) a.update()
  for (const b of g.bullets)   b.update()
  for (const p of g.particles) p.update()
  for (const pu of g.powerUps) pu.update()

  g.bullets   = g.bullets.filter(b => b.life > 0)
  g.particles = g.particles.filter(p => p.life > 0)
  g.powerUps  = g.powerUps.filter(pu => pu.life > 0)

  // bullet ↔ asteroid
  const deadB = new Set<number>()
  const deadA = new Set<number>()
  outer: for (let bi = 0; bi < g.bullets.length; bi++) {
    const b = g.bullets[bi]
    for (let ai = 0; ai < g.asteroids.length; ai++) {
      if (deadA.has(ai)) continue
      const a = g.asteroids[ai]
      const r = a.radius + 4
      if (d2(b.x, b.y, a.x, a.y) < r * r) {
        deadB.add(bi); deadA.add(ai)
        g.score += a.size === 3 ? 20 : a.size === 2 ? 50 : 100
        for (let i = 0; i < 6 + a.size * 4; i++) g.particles.push(new Particle(a.x, a.y, '#cccc44'))
        if (a.size > 1) {
          const sp   = Math.hypot(a.vx, a.vy) * 1.2 + 0.6
          const base = Math.atan2(a.vy, a.vx)
          g.asteroids.push(
            new Asteroid(a.x, a.y, a.size - 1, Math.cos(base + 0.6) * sp, Math.sin(base + 0.6) * sp),
            new Asteroid(a.x, a.y, a.size - 1, Math.cos(base - 0.6) * sp, Math.sin(base - 0.6) * sp),
          )
        }
        if (Math.random() < 0.1) g.powerUps.push(new PowerUp(a.x, a.y))
        continue outer
      }
    }
  }
  g.bullets   = g.bullets.filter((_, i) => !deadB.has(i))
  g.asteroids = g.asteroids.filter((_, i) => !deadA.has(i))

  // ship ↔ asteroid
  if (g.ship.inv === 0) {
    for (const a of g.asteroids) {
      if (d2(g.ship.x, g.ship.y, a.x, a.y) < (a.radius + 8) ** 2) {
        g.lives--
        for (let i = 0; i < 18; i++) g.particles.push(new Particle(g.ship.x, g.ship.y, '#00ddff'))
        if (g.lives <= 0) { g.state = 'gameover'; return }
        g.ship.reset(); break
      }
    }
  }

  // ship ↔ power-up
  for (let i = g.powerUps.length - 1; i >= 0; i--) {
    const pu = g.powerUps[i]
    if (d2(g.ship.x, g.ship.y, pu.x, pu.y) < 22 ** 2) {
      g.ship.triple = 300; g.powerUps.splice(i, 1)
    }
  }

  // next level
  if (g.asteroids.length === 0) {
    g.level++; g.bullets = []; g.powerUps = []
    g.ship.reset(); g.asteroids = spawnRocks(g.ship, g.level)
  }
}

function renderGame(ctx: CanvasRenderingContext2D, g: GS) {
  ctx.fillStyle = '#010108'; ctx.fillRect(0, 0, W, H)
  for (const a of g.asteroids) a.draw(ctx)
  for (const b of g.bullets)   b.draw(ctx)
  for (const pu of g.powerUps) pu.draw(ctx)
  for (const p of g.particles) p.draw(ctx)
  g.ship.draw(ctx)
}

/* ── Component ────────────────────────────────────────────────────────── */

const AsteroidsCanvas = forwardRef<AsteroidsHandle, Props>(function AsteroidsCanvas(
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

  // Main game loop — runs once on mount
  useEffect(() => {
    const ctx = canvasRef.current!.getContext('2d')!
    gsRef.current = buildGS()

    function tick() {
      const g = gsRef.current!
      if (!pausedRef.current && g.state !== 'gameover') stepGame(g)
      renderGame(ctx, g)

      const e  = emitted.current
      const cb = cbRef.current
      if (g.score !== e.score) { cb.onScore(g.score); e.score = g.score }
      if (g.lives !== e.lives) { cb.onLives(g.lives); e.lives = g.lives }
      if (g.level !== e.level) { cb.onLevel(g.level); e.level = g.level }
      if (g.state === 'gameover' && !gOverFired.current) {
        gOverFired.current = true
        cb.onGameOver()
      }

      if (!pausedRef.current && g.state !== 'gameover') {
        rafRef.current = requestAnimationFrame(tick)
      }
    }

    tickRef.current = tick
    rafRef.current  = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(rafRef.current)
  }, [])

  // Pause / resume — declared second so it runs second on mount
  useEffect(() => {
    pausedRef.current = paused
    if (firstPause.current) { firstPause.current = false; return }
    if (paused) {
      cancelAnimationFrame(rafRef.current)
    } else if (gsRef.current?.state === 'playing') {
      rafRef.current = requestAnimationFrame(tickRef.current)
    }
  }, [paused])

  // Keyboard
  useEffect(() => {
    const ctrl = new Set(['ArrowLeft', 'ArrowRight', 'ArrowUp', 'Space'])
    const down = (e: KeyboardEvent) => {
      if (ctrl.has(e.code)) e.preventDefault()
      gsRef.current?.keys.add(e.code)
    }
    const up = (e: KeyboardEvent) => gsRef.current?.keys.delete(e.code)
    window.addEventListener('keydown', down)
    window.addEventListener('keyup', up)
    return () => {
      window.removeEventListener('keydown', down)
      window.removeEventListener('keyup', up)
    }
  }, [])

  useImperativeHandle(ref, () => ({
    restart() {
      cancelAnimationFrame(rafRef.current)
      gsRef.current     = buildGS()
      emitted.current   = { score: -1, lives: -1, level: -1 }
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

AsteroidsCanvas.displayName = 'AsteroidsCanvas'
export default AsteroidsCanvas
