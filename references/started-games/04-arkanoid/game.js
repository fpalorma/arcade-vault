const CANVAS_W = 480;
const CANVAS_H = 640;

const BRICK_W = 32;
const BRICK_H = 16;
const BRICK_COLS = 13;
const BRICK_COLORS = ['red', 'cyan', 'green', 'magenta', 'yellow', 'hotpink', 'gray'];

function makeRow(color, start, end) {
  return Array.from({ length: BRICK_COLS }, (_, i) => (i >= start && i <= end) ? color : null);
}

// Nivel 1: triángulo invertido (ancho arriba, estrecho abajo)
// Nivel 2: diamante (estrecho en extremos, ancho en el centro)
// Nivel 3: tablero de ajedrez (6 filas, bloques alternos)
const LEVELS = [
  { layout: [
    makeRow('red',     0, 12),
    makeRow('cyan',    1, 11),
    makeRow('green',   2, 10),
    makeRow('magenta', 3,  9),
    makeRow('yellow',  4,  8),
  ]},
  { layout: [
    makeRow('cyan',    5,  7),
    makeRow('green',   3,  9),
    makeRow('magenta', 1, 11),
    makeRow('yellow',  3,  9),
    makeRow('hotpink', 5,  7),
  ]},
  { layout: Array.from({ length: 6 }, (_, row) =>
    Array.from({ length: BRICK_COLS }, (_, col) =>
      (row + col) % 2 === 0 ? BRICK_COLORS[row % BRICK_COLORS.length] : null
    )
  )},
];
const BRICK_OFFSET_X = (CANVAS_W - BRICK_COLS * BRICK_W) / 2;
const BRICK_OFFSET_Y = 60;


const bounceSnd = new Audio('assets/sounds/ball-bounce.mp3');
const breakSnd  = new Audio('assets/sounds/break-sound.mp3');

let lastBounceTime = 0;
function playSound(audio) {
  if (audio === bounceSnd) {
    const now = performance.now();
    if (now - lastBounceTime < 30) return;
    lastBounceTime = now;
  }
  audio.cloneNode(true).play().catch(() => {});
}

const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
canvas.width = CANVAS_W;
canvas.height = CANVAS_H;

const state = {
  screen: 'start',
  score: 0,
  lives: 3,
  level: 1,
  cycle: 1,
  baseSpeed: 4,
  ball: { x: 0, y: 0, vx: 0, vy: 0, w: 16, h: 16 },
  paddle: { x: 0, y: 0, w: 162, h: 14 },
  bricks: [],
  explosions: [],
};

function initGame() {
  state.score = 0;
  state.lives = 3;
  state.level = 1;
  state.cycle = 1;
  state.baseSpeed = 4;
  initLevel();
}

function initLevel() {
  state.screen = 'playing';

  state.paddle.x = (CANVAS_W - state.paddle.w) / 2;
  state.paddle.y = CANVAS_H - 40;

  state.ball.x = CANVAS_W / 2 - state.ball.w / 2;
  state.ball.y = state.paddle.y - state.ball.h - 4;
  state.ball.vx = state.baseSpeed * (Math.random() < 0.5 ? 1 : -1);
  state.ball.vy = -state.baseSpeed;

  const lvl = LEVELS[state.level - 1];
  state.bricks = [];
  lvl.layout.forEach((rowArr, rowIdx) => {
    rowArr.forEach((color, colIdx) => {
      if (!color) return;
      state.bricks.push({
        x: BRICK_OFFSET_X + colIdx * BRICK_W,
        y: BRICK_OFFSET_Y + rowIdx * BRICK_H,
        w: BRICK_W,
        h: BRICK_H,
        color,
        alive: true,
      });
    });
  });

  state.explosions = [];
}

const keys = {};

window.addEventListener('keydown', e => { keys[e.key] = true; });
window.addEventListener('keyup',  e => { keys[e.key] = false; });

canvas.addEventListener('mousemove', e => {
  const rect = canvas.getBoundingClientRect();
  const mouseX = e.clientX - rect.left;
  state.paddle.x = Math.max(0, Math.min(CANVAS_W - state.paddle.w, mouseX - state.paddle.w / 2));
});

const PADDLE_SPEED = 6;

function updatePaddle() {
  if (keys['ArrowLeft'] || keys['a'] || keys['A']) {
    state.paddle.x = Math.max(0, state.paddle.x - PADDLE_SPEED);
  }
  if (keys['ArrowRight'] || keys['d'] || keys['D']) {
    state.paddle.x = Math.min(CANVAS_W - state.paddle.w, state.paddle.x + PADDLE_SPEED);
  }
}

function resetBall() {
  state.ball.x = CANVAS_W / 2 - state.ball.w / 2;
  state.ball.y = state.paddle.y - state.ball.h - 4;
  state.ball.vx = state.baseSpeed * (Math.random() < 0.5 ? 1 : -1);
  state.ball.vy = -state.baseSpeed;
}

function update() {
  if (state.screen !== 'playing') return;

  updatePaddle();

  state.ball.x += state.ball.vx;
  state.ball.y += state.ball.vy;

  // rebote pared izquierda / derecha
  if (state.ball.x <= 0) {
    state.ball.x = 0;
    state.ball.vx = Math.abs(state.ball.vx);
    playSound(bounceSnd);
  } else if (state.ball.x + state.ball.w >= CANVAS_W) {
    state.ball.x = CANVAS_W - state.ball.w;
    state.ball.vx = -Math.abs(state.ball.vx);
    playSound(bounceSnd);
  }

  // rebote techo
  if (state.ball.y <= 0) {
    state.ball.y = 0;
    state.ball.vy = Math.abs(state.ball.vy);
    playSound(bounceSnd);
  }

  const p = state.paddle;
  const b = state.ball;

  // colisión pelota–bloques
  for (const brick of state.bricks) {
    if (!brick.alive) continue;

    if (
      b.x + b.w > brick.x &&
      b.x < brick.x + brick.w &&
      b.y + b.h > brick.y &&
      b.y < brick.y + brick.h
    ) {
      brick.alive = false;
      state.score += 10;
      state.explosions.push({ x: brick.x, y: brick.y, color: brick.color, startTime: performance.now() });
      playSound(breakSnd);

      const overlapLeft   = (b.x + b.w) - brick.x;
      const overlapRight  = (brick.x + brick.w) - b.x;
      const overlapTop    = (b.y + b.h) - brick.y;
      const overlapBottom = (brick.y + brick.h) - b.y;
      const minH = Math.min(overlapLeft, overlapRight);
      const minV = Math.min(overlapTop, overlapBottom);

      if (minH < minV) {
        b.vx = -b.vx;
      } else {
        b.vy = -b.vy;
      }
      break;
    }
  }

  // colisión pelota–paleta
  if (
    b.x + b.w > p.x &&
    b.x < p.x + p.w &&
    b.y + b.h > p.y &&
    b.y + b.h < p.y + p.h + Math.abs(b.vy)
  ) {
    b.y = p.y - b.h;
    b.vy = -Math.abs(b.vy);
    playSound(bounceSnd);
  }

  // pelota sale por abajo
  if (state.ball.y + state.ball.h >= CANVAS_H) {
    state.lives -= 1;
    if (state.lives <= 0) {
      state.lives = 0;
      state.screen = 'gameover';
      return;
    } else {
      resetBall();
    }
  }

  // nivel completado: todos los bloques destruidos
  if (state.bricks.every(br => !br.alive)) {
    state.screen = 'level-complete';
  }
}

function drawHUD() {
  ctx.fillStyle = '#fff';
  ctx.font = 'bold 16px monospace';
  ctx.textAlign = 'left';
  ctx.fillText(`Score: ${state.score}`, 10, 20);
  ctx.textAlign = 'center';
  ctx.fillText(`Nivel: ${state.level}`, CANVAS_W / 2, 20);
  ctx.textAlign = 'right';
  ctx.fillText(`Lives: ${state.lives}`, CANVAS_W - 10, 20);
}

function draw() {
  ctx.clearRect(0, 0, CANVAS_W, CANVAS_H);
  ctx.fillStyle = '#1a1a2e';
  ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

  if (state.screen === 'start') { drawStartScreen(); return; }

  for (const brick of state.bricks) {
    if (brick.alive) {
      drawSprite(ctx, `block_${brick.color}`, brick.x, brick.y, brick.w, brick.h);
    }
  }

  drawSprite(ctx, 'paddle', state.paddle.x, state.paddle.y, state.paddle.w, state.paddle.h);
  drawSprite(ctx, 'ball', state.ball.x, state.ball.y, state.ball.w, state.ball.h);

  // explosiones
  const now = performance.now();
  state.explosions = state.explosions.filter(ex => now - ex.startTime < EXPLOSION_DURATION);
  for (const ex of state.explosions) {
    const progress = (now - ex.startTime) / EXPLOSION_DURATION;
    const frameIndex = Math.min(Math.floor(progress * 4), 3);
    const frame = EXPLOSION_FRAMES[ex.color][frameIndex];
    drawFrame(ctx, frame, ex.x, ex.y, ex.w ?? 32, ex.h ?? 16);
  }

  drawHUD();

  if (state.screen === 'gameover')       drawOverlay('GAME OVER');
  if (state.screen === 'level-complete') drawLevelComplete();
}

function drawOverlay(title) {
  ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
  ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

  ctx.textAlign = 'center';

  ctx.fillStyle = '#fff';
  ctx.font = 'bold 48px monospace';
  ctx.fillText(title, CANVAS_W / 2, CANVAS_H / 2 - 40);

  ctx.font = 'bold 24px monospace';
  ctx.fillText(`Score: ${state.score}`, CANVAS_W / 2, CANVAS_H / 2 + 10);

  ctx.font = '18px monospace';
  ctx.fillStyle = '#aaa';
  ctx.fillText('Pulsa R o haz clic para reiniciar', CANVAS_W / 2, CANVAS_H / 2 + 50);
}


function drawStartScreen() {
  ctx.fillStyle = 'rgba(0, 0, 0, 0.75)';
  ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

  ctx.textAlign = 'center';

  ctx.fillStyle = '#fff';
  ctx.font = 'bold 48px monospace';
  ctx.fillText('ARKANOID', CANVAS_W / 2, CANVAS_H / 2 - 40);

  ctx.font = '18px monospace';
  ctx.fillStyle = '#aaa';
  ctx.fillText('Clic o cualquier tecla para empezar', CANVAS_W / 2, CANVAS_H / 2 + 20);
}

function drawLevelComplete() {
  ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
  ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

  ctx.textAlign = 'center';

  ctx.fillStyle = '#fff';
  ctx.font = 'bold 40px monospace';
  ctx.fillText(`Nivel ${state.level} completado`, CANVAS_W / 2, CANVAS_H / 2 - 40);

  ctx.font = 'bold 24px monospace';
  ctx.fillText(`Score: ${state.score}`, CANVAS_W / 2, CANVAS_H / 2 + 10);

  ctx.font = '18px monospace';
  ctx.fillStyle = '#aaa';
  ctx.fillText('Pulsa R o haz clic para continuar', CANVAS_W / 2, CANVAS_H / 2 + 50);
}

function advanceLevel() {
  if (state.level === 3) {
    state.level = 1;
    state.cycle += 1;
    state.baseSpeed += 0.5;
  } else {
    state.level += 1;
  }
  initLevel();
}

window.addEventListener('keydown', e => {
  if (state.screen === 'start')          { initGame(); return; }
  if (e.key === 'r' || e.key === 'R') {
    if (state.screen === 'gameover')       initGame();
    if (state.screen === 'level-complete') advanceLevel();
  }
});

canvas.addEventListener('click', () => {
  if (state.screen === 'start')          { initGame(); return; }
  if (state.screen === 'gameover')       initGame();
  if (state.screen === 'level-complete') advanceLevel();
});

function loop() {
  update();
  draw();
  requestAnimationFrame(loop);
}

loadSpritesheet(() => {
  requestAnimationFrame(loop);
});
