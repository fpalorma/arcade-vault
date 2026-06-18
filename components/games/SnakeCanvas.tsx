'use client'

import { forwardRef, useEffect, useImperativeHandle, useRef } from 'react'

export interface SnakeHandle {
  restart: () => void
}

interface Props {
  paused: boolean
  onScore: (score: number) => void
  onLives: (frutas: number) => void
  onLevel: (level: number) => void
  onGameOver: () => void
}

const COLS = 20
const ROWS = 20
const CELL = 20
const W = COLS * CELL
const H = ROWS * CELL

type Dir = 'U' | 'D' | 'L' | 'R'
type Point = { x: number; y: number }

const OPPOSITE: Record<Dir, Dir> = { U: 'D', D: 'U', L: 'R', R: 'L' }

const KEY_MAP: Record<string, Dir> = {
  ArrowUp: 'U', w: 'U', W: 'U',
  ArrowDown: 'D', s: 'D', S: 'D',
  ArrowLeft: 'L', a: 'L', A: 'L',
  ArrowRight: 'R', d: 'R', D: 'R',
}

type FruitSprite = { x: number; y: number; w: number; h: number }

const FRUITS: FruitSprite[] = [
  { x: 34,   y: 136, w: 110, h: 160 }, // banana
  { x: 186,  y: 136, w: 150, h: 160 }, // orange
  { x: 378,  y: 136, w: 110, h: 160 }, // grape
  { x: 540,  y: 136, w: 130, h: 160 }, // garlic
  { x: 712,  y: 136, w: 130, h: 160 }, // eggplant
  { x: 894,  y: 136, w: 110, h: 160 }, // strawberry
  { x: 1066, y: 136, w: 110, h: 160 }, // cherry
  { x: 1228, y: 136, w: 130, h: 160 }, // carrot
  { x: 1400, y: 136, w: 130, h: 160 }, // mushroom
  { x: 1582, y: 136, w: 110, h: 160 }, // broccoli
  { x: 1734, y: 136, w: 150, h: 160 }, // watermelon
  { x: 1906, y: 136, w: 150, h: 160 }, // pepper
  { x: 2068, y: 136, w: 170, h: 160 }, // kiwi
  { x: 2250, y: 136, w: 140, h: 160 }, // lemon
  { x: 2432, y: 136, w: 130, h: 160 }, // peach
  { x: 2604, y: 136, w: 130, h: 160 }, // peanut
  { x: 2786, y: 136, w: 110, h: 160 }, // apple
  { x: 2948, y: 136, w: 130, h: 160 }, // tomato
  { x: 3110, y: 136, w: 150, h: 160 }, // berries
  { x: 3302, y: 136, w: 110, h: 160 }, // grapes2
  { x: 3454, y: 136, w: 150, h: 160 }, // pineapple
  { x: 3637, y: 136, w: 130, h: 160 }, // melon
]

function randomFruitIndex() {
  return Math.floor(Math.random() * FRUITS.length)
}

function randomFruit(snake: Point[]): Point & { sprite: number } {
  let p: Point
  do {
    p = { x: Math.floor(Math.random() * COLS), y: Math.floor(Math.random() * ROWS) }
  } while (snake.some(s => s.x === p.x && s.y === p.y))
  return { ...p, sprite: randomFruitIndex() }
}

function tickInterval(level: number) {
  return Math.max(80, 200 - (level - 1) * 12)
}

function initState() {
  const snake: Point[] = [
    { x: 10, y: 10 },
    { x: 9,  y: 10 },
    { x: 8,  y: 10 },
  ]
  return {
    snake,
    dir: 'R' as Dir,
    nextDir: 'R' as Dir,
    fruit: randomFruit(snake) as Point & { sprite: number },
    score: 0,
    fruitsEaten: 0,
    level: 1,
    state: 'playing' as 'playing' | 'gameover',
  }
}

const SnakeCanvas = forwardRef<SnakeHandle, Props>(function SnakeCanvas(
  { paused, onScore, onLives, onLevel, onGameOver },
  ref
) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const gameRef = useRef(initState())
  const imgRef = useRef<HTMLImageElement | null>(null)
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const rafRef = useRef<number | null>(null)

  const pausedRef = useRef(paused)
  const emittedScore = useRef(-1)
  const emittedLives = useRef(-1)
  const emittedLevel = useRef(-1)
  const gOverFired = useRef(false)

  const onScoreRef = useRef(onScore)
  const onLivesRef = useRef(onLives)
  const onLevelRef = useRef(onLevel)
  const onGameOverRef = useRef(onGameOver)

  useEffect(() => { onScoreRef.current = onScore }, [onScore])
  useEffect(() => { onLivesRef.current = onLives }, [onLives])
  useEffect(() => { onLevelRef.current = onLevel }, [onLevel])
  useEffect(() => { onGameOverRef.current = onGameOver }, [onGameOver])
  useEffect(() => { pausedRef.current = paused }, [paused])

  function emit() {
    const g = gameRef.current
    if (g.score !== emittedScore.current) {
      emittedScore.current = g.score
      onScoreRef.current(g.score)
    }
    if (g.fruitsEaten !== emittedLives.current) {
      emittedLives.current = g.fruitsEaten
      onLivesRef.current(g.fruitsEaten)
    }
    if (g.level !== emittedLevel.current) {
      emittedLevel.current = g.level
      onLevelRef.current(g.level)
    }
    if (g.state === 'gameover' && !gOverFired.current) {
      gOverFired.current = true
      onGameOverRef.current()
    }
  }

  function stepGame() {
    if (pausedRef.current) return
    const g = gameRef.current
    if (g.state !== 'playing') return

    g.dir = g.nextDir
    const head = g.snake[0]
    const next: Point = { x: head.x, y: head.y }
    if (g.dir === 'U') next.y--
    if (g.dir === 'D') next.y++
    if (g.dir === 'L') next.x--
    if (g.dir === 'R') next.x++

    if (next.x < 0 || next.x >= COLS || next.y < 0 || next.y >= ROWS) {
      g.state = 'gameover'
      emit()
      return
    }
    if (g.snake.some(s => s.x === next.x && s.y === next.y)) {
      g.state = 'gameover'
      emit()
      return
    }

    const ate = next.x === g.fruit.x && next.y === g.fruit.y
    g.snake.unshift(next)
    if (!ate) {
      g.snake.pop()
    } else {
      g.score += 10
      g.fruitsEaten++
      g.level = Math.floor(g.fruitsEaten / 5) + 1
      g.fruit = randomFruit(g.snake)
    }

    emit()
  }

  function render() {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    const g = gameRef.current

    ctx.fillStyle = '#000'
    ctx.fillRect(0, 0, W, H)

    // Snake
    ctx.fillStyle = '#39ff14'
    for (let i = 0; i < g.snake.length; i++) {
      const s = g.snake[i]
      ctx.fillRect(s.x * CELL + 1, s.y * CELL + 1, CELL - 2, CELL - 2)
    }
    // Head slightly brighter
    if (g.snake.length > 0) {
      const h = g.snake[0]
      ctx.fillStyle = '#aaff66'
      ctx.fillRect(h.x * CELL + 1, h.y * CELL + 1, CELL - 2, CELL - 2)
    }

    // Fruit sprite
    const sp = FRUITS[g.fruit.sprite]
    const img = imgRef.current
    if (img && img.complete && img.naturalWidth > 0) {
      ctx.drawImage(img, sp.x, sp.y, sp.w, sp.h, g.fruit.x * CELL, g.fruit.y * CELL, CELL, CELL)
    } else {
      ctx.fillStyle = '#ff4444'
      ctx.fillRect(g.fruit.x * CELL + 2, g.fruit.y * CELL + 2, CELL - 4, CELL - 4)
    }
  }

  function startRaf() {
    function loop() {
      render()
      rafRef.current = requestAnimationFrame(loop)
    }
    rafRef.current = requestAnimationFrame(loop)
  }

  function startTick(level: number) {
    stopTick()
    tickRef.current = setInterval(() => {
      stepGame()
      const newLevel = gameRef.current.level
      if (newLevel !== level) {
        startTick(newLevel)
      }
    }, tickInterval(level))
  }

  function stopTick() {
    if (tickRef.current !== null) {
      clearInterval(tickRef.current)
      tickRef.current = null
    }
  }

  function stopRaf() {
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current)
      rafRef.current = null
    }
  }

  function resetGame() {
    stopTick()
    stopRaf()
    gameRef.current = initState()
    emittedScore.current = -1
    emittedLives.current = -1
    emittedLevel.current = -1
    gOverFired.current = false
    emit()
    startTick(1)
    startRaf()
  }

  useImperativeHandle(ref, () => ({ restart: resetGame }))

  useEffect(() => {
    const img = new Image()
    img.src = '/games/snake/fruits.png'
    imgRef.current = img

    const onKey = (e: KeyboardEvent) => {
      const dir = KEY_MAP[e.key]
      if (!dir) return
      if (['ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(e.key)) e.preventDefault()
      const g = gameRef.current
      if (g.state !== 'playing') return
      if (dir !== OPPOSITE[g.dir]) g.nextDir = dir
    }
    window.addEventListener('keydown', onKey)

    startTick(1)
    startRaf()

    return () => {
      window.removeEventListener('keydown', onKey)
      stopTick()
      stopRaf()
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <canvas
      ref={canvasRef}
      width={W}
      height={H}
      style={{ display: 'block', position: 'absolute', inset: 0, width: '100%', height: '100%', imageRendering: 'pixelated' }}
    />
  )
})

export default SnakeCanvas
