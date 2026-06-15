'use strict';

const COLS = 10;
const ROWS = 20;
const BLOCK = 30;

const SKINS = {
  retro: {
    name: 'Retro',
    bg: null,
    colors: [null, '#4dd0e1', '#ffd54f', '#ba68c8', '#81c784', '#e57373', '#7986cb', '#ffb74d', '#cddc39'],
    renderBlock(ctx, x, y, color, size, alpha) {
      ctx.globalAlpha = alpha ?? 1;
      ctx.fillStyle = color;
      ctx.fillRect(x * size + 1, y * size + 1, size - 2, size - 2);
      ctx.fillStyle = 'rgba(255,255,255,0.12)';
      ctx.fillRect(x * size + 1, y * size + 1, size - 2, 4);
      ctx.globalAlpha = 1;
    }
  },
  neon: {
    name: 'Neon',
    bg: '#000010',
    colors: [null, '#00ffff', '#ffff00', '#ff00ff', '#00ff88', '#ff3366', '#3399ff', '#ff8800', '#aaff00'],
    renderBlock(ctx, x, y, color, size, alpha) {
      ctx.globalAlpha = alpha ?? 1;
      ctx.shadowColor = color;
      ctx.shadowBlur = 15;
      ctx.fillStyle = color;
      ctx.fillRect(x * size + 2, y * size + 2, size - 4, size - 4);
      ctx.shadowBlur = 0;
      ctx.fillStyle = 'rgba(255,255,255,0.35)';
      const cx = x * size + Math.floor(size / 2) - 3;
      const cy = y * size + Math.floor(size / 2) - 3;
      ctx.fillRect(cx, cy, 6, 6);
      ctx.globalAlpha = 1;
    }
  },
  pastel: {
    name: 'Pastel',
    bg: null,
    colors: [null, '#a8e6cf', '#ffd3b6', '#d4a5f5', '#b8e8ff', '#ffb3ba', '#c5cae9', '#ffe0b2', '#dcedc8'],
    renderBlock(ctx, x, y, color, size, alpha) {
      ctx.globalAlpha = alpha ?? 1;
      const ins = 3;
      ctx.fillStyle = color;
      ctx.fillRect(x * size + ins, y * size + ins, size - ins * 2, size - ins * 2);
      ctx.fillStyle = 'rgba(255,255,255,0.55)';
      ctx.fillRect(x * size + ins, y * size + ins, size - ins * 2, 5);
      ctx.fillRect(x * size + ins, y * size + ins, 5, size - ins * 2);
      ctx.fillStyle = 'rgba(0,0,0,0.1)';
      ctx.fillRect(x * size + ins, y * size + size - ins - 4, size - ins * 2, 4);
      ctx.fillRect(x * size + size - ins - 4, y * size + ins, 4, size - ins * 2);
      ctx.globalAlpha = 1;
    }
  },
  pixel: {
    name: 'Pixel Art',
    bg: null,
    colors: [null, '#4dd0e1', '#ffd54f', '#ba68c8', '#81c784', '#e57373', '#7986cb', '#ffb74d', '#cddc39'],
    renderBlock(ctx, x, y, color, size, alpha) {
      ctx.globalAlpha = alpha ?? 1;
      ctx.fillStyle = color;
      ctx.fillRect(x * size + 1, y * size + 1, size - 2, size - 2);
      const gap = Math.floor(size / 3);
      ctx.fillStyle = 'rgba(0,0,0,0.28)';
      for (let dr = 0; dr < 3; dr++)
        for (let dc = 0; dc < 3; dc++)
          ctx.fillRect(x * size + 1 + dc * gap + 2, y * size + 1 + dr * gap + 2, 3, 3);
      ctx.fillStyle = 'rgba(255,255,255,0.2)';
      ctx.fillRect(x * size + 1, y * size + 1, size - 2, 4);
      ctx.globalAlpha = 1;
    }
  }
};

const PIECES = [
  null,
  [[0,0,0,0],[1,1,1,1],[0,0,0,0],[0,0,0,0]], // I
  [[2,2],[2,2]],                               // O
  [[0,3,0],[3,3,3],[0,0,0]],                  // T
  [[0,4,4],[4,4,0],[0,0,0]],                  // S
  [[5,5,0],[0,5,5],[0,0,0]],                  // Z
  [[6,0,0],[6,6,6],[0,0,0]],                  // J
  [[0,0,7],[7,7,7],[0,0,0]],                  // L
  [[8,8,8],[8,0,8],[8,8,8]],                  // P - hueco central
];

const LINE_SCORES = [0, 100, 300, 500, 800];

// Powerups
const POWERUPS = ['bomb', 'ray', 'gravity'];
const POWER_COLORS = { bomb: '#e53935', ray: '#fdd835', gravity: '#42a5f5' };
const POWER_LABELS  = { bomb: '💣', ray: '⚡', gravity: '🌍' };
const POWERUP_INTERVAL = 5; // líneas entre powerups

const LB_KEY = 'tetris-leaderboard';

const canvas = document.getElementById('board');
const ctx = canvas.getContext('2d');
const nextCanvas = document.getElementById('next-canvas');
const nextCtx = nextCanvas.getContext('2d');
const scoreEl = document.getElementById('score');
const linesEl = document.getElementById('lines');
const levelEl = document.getElementById('level');
const overlay = document.getElementById('overlay');
const overlayTitle = document.getElementById('overlay-title');
const overlayScore = document.getElementById('overlay-score');
const restartBtn = document.getElementById('restart-btn');
const themeBtn = document.getElementById('theme-btn');
const skinSelect = document.getElementById('skin-select');
const saveSection = document.getElementById('save-section');
const leaderboardSection = document.getElementById('leaderboard-section');
const nameInput = document.getElementById('name-input');
const saveScoreBtn = document.getElementById('save-score-btn');
const resetRecordsBtn = document.getElementById('reset-records-btn');
const pauseOverlay = document.getElementById('pause-overlay');
const pauseMain = document.getElementById('pause-main');
const pauseControlsView = document.getElementById('pause-controls-view');
const pauseResumeBtn = document.getElementById('pause-resume-btn');
const pauseRestartBtn = document.getElementById('pause-restart-btn');
const pauseControlsBtn = document.getElementById('pause-controls-btn');
const pauseBackBtn = document.getElementById('pause-back-btn');
const startLevelSelect = document.getElementById('start-level-select');

let startLevel = parseInt(localStorage.getItem('startLevel') || '1', 10);

let board, current, next, score, lines, level, paused, gameOver, lastTime, dropAccum, dropInterval, animId;
let powerupPending, powerupCounter;
let combo, maxCombo;
let activeSkin;

// ---- Leaderboard ----

function loadLeaderboard() {
  try { return JSON.parse(localStorage.getItem(LB_KEY)) || []; } catch { return []; }
}

function saveLeaderboard(lb) {
  localStorage.setItem(LB_KEY, JSON.stringify(lb));
}

function isTopScore(s) {
  const lb = loadLeaderboard();
  return lb.length < 5 || s > lb[lb.length - 1].score;
}

function addLeaderboardEntry(name, s, cmb, lns) {
  const lb = loadLeaderboard();
  const entry = { name: name || 'AAA', score: s, combo: cmb, lines: lns };
  lb.push(entry);
  lb.sort((a, b) => b.score - a.score);
  lb.splice(5);
  const idx = lb.indexOf(entry);
  saveLeaderboard(lb);
  return idx;
}

function renderLeaderboard(highlightIdx = -1) {
  const lb = loadLeaderboard();
  const tbody = document.getElementById('leaderboard-body');
  if (!lb.length) {
    tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;opacity:0.5">Sin records aún</td></tr>';
    return;
  }
  tbody.innerHTML = lb.map((e, i) =>
    `<tr class="${i === highlightIdx ? 'lb-highlight' : ''}">
      <td>${i + 1}</td><td>${e.name}</td><td>${e.score.toLocaleString()}</td><td>${e.combo}x</td><td>${e.lines}</td>
    </tr>`
  ).join('');
}

function resetLeaderboard() {
  localStorage.removeItem(LB_KEY);
  renderLeaderboard();
}

// ---- Game logic ----

function createBoard() {
  return Array.from({ length: ROWS }, () => new Array(COLS).fill(0));
}

function randomPiece() {
  const type = Math.floor(Math.random() * 8) + 1;
  const shape = PIECES[type].map(row => [...row]);
  return { type, shape, x: Math.floor(COLS / 2) - Math.floor(shape[0].length / 2), y: 0 };
}

function randomPowerup() {
  const type = Math.floor(Math.random() * 8) + 1;
  const shape = PIECES[type].map(row => [...row]);
  const power = POWERUPS[Math.floor(Math.random() * POWERUPS.length)];
  return { type, shape, x: Math.floor(COLS / 2) - Math.floor(shape[0].length / 2), y: 0, power };
}

function generatePiece() {
  if (powerupPending) {
    powerupPending = false;
    return randomPowerup();
  }
  return randomPiece();
}

function collide(shape, ox, oy) {
  for (let r = 0; r < shape.length; r++) {
    for (let c = 0; c < shape[r].length; c++) {
      if (!shape[r][c]) continue;
      const nx = ox + c;
      const ny = oy + r;
      if (nx < 0 || nx >= COLS || ny >= ROWS) return true;
      if (ny >= 0 && board[ny][nx]) return true;
    }
  }
  return false;
}

function rotateCW(shape) {
  const rows = shape.length, cols = shape[0].length;
  const result = Array.from({ length: cols }, () => new Array(rows).fill(0));
  for (let r = 0; r < rows; r++)
    for (let c = 0; c < cols; c++)
      result[c][rows - 1 - r] = shape[r][c];
  return result;
}

function tryRotate() {
  const rotated = rotateCW(current.shape);
  const kicks = [0, -1, 1, -2, 2];
  for (const kick of kicks) {
    if (!collide(rotated, current.x + kick, current.y)) {
      current.shape = rotated;
      current.x += kick;
      return;
    }
  }
}

function merge() {
  for (let r = 0; r < current.shape.length; r++)
    for (let c = 0; c < current.shape[r].length; c++)
      if (current.shape[r][c])
        board[current.y + r][current.x + c] = current.shape[r][c];
}

function clearLines() {
  let cleared = 0;
  for (let r = ROWS - 1; r >= 0; r--) {
    if (board[r].every(v => v !== 0)) {
      board.splice(r, 1);
      board.unshift(new Array(COLS).fill(0));
      cleared++;
      r++;
    }
  }
  if (cleared) {
    combo++;
    if (combo > maxCombo) maxCombo = combo;
    lines += cleared;
    score += (LINE_SCORES[cleared] || 0) * level;
    level = Math.floor(lines / 10) + 1;
    dropInterval = Math.max(100, 1000 - (level - 1) * 90);
    powerupCounter += cleared;
    while (powerupCounter >= POWERUP_INTERVAL) {
      powerupCounter -= POWERUP_INTERVAL;
      powerupPending = true;
    }
    updateHUD();
  } else {
    combo = 0;
  }
}

function ghostY() {
  let gy = current.y;
  while (!collide(current.shape, current.x, gy + 1)) gy++;
  return gy;
}

function hardDrop() {
  const gy = ghostY();
  score += (gy - current.y) * 2;
  current.y = gy;
  lockPiece();
}

function softDrop() {
  if (!collide(current.shape, current.x, current.y + 1)) {
    current.y++;
    score += 1;
    updateHUD();
  } else {
    lockPiece();
  }
}

// ---- Powerup effects ----

function pieceAnchor(p) {
  let sumX = 0, sumY = 0, count = 0;
  for (let r = 0; r < p.shape.length; r++)
    for (let c = 0; c < p.shape[r].length; c++)
      if (p.shape[r][c]) { sumX += p.x + c; sumY += p.y + r; count++; }
  return { ax: Math.round(sumX / count), ay: Math.round(sumY / count) };
}

function applyBomb(ax, ay) {
  let destroyed = 0;
  for (let r = ay - 1; r <= ay + 1; r++)
    for (let c = ax - 1; c <= ax + 1; c++)
      if (r >= 0 && r < ROWS && c >= 0 && c < COLS && board[r][c]) {
        board[r][c] = 0;
        destroyed++;
      }
  score += destroyed * 10;
}

function applyRay(ax, ay) {
  let destroyed = 0;
  for (let c = 0; c < COLS; c++) if (board[ay][c]) { board[ay][c] = 0; destroyed++; }
  for (let r = 0; r < ROWS; r++) if (board[r][ax]) { board[r][ax] = 0; destroyed++; }
  score += destroyed * 10;
}

function applyGravity() {
  for (let c = 0; c < COLS; c++) {
    const cells = [];
    for (let r = 0; r < ROWS; r++) if (board[r][c]) cells.push(board[r][c]);
    for (let r = 0; r < ROWS; r++)
      board[r][c] = r < ROWS - cells.length ? 0 : cells[r - (ROWS - cells.length)];
  }
}

function applyPowerup(p) {
  const { ax, ay } = pieceAnchor(p);
  switch (p.power) {
    case 'bomb':    applyBomb(ax, ay);  break;
    case 'ray':     applyRay(ax, ay);   break;
    case 'gravity': applyGravity();     break;
  }
}

function lockPiece() {
  if (current.power) {
    applyPowerup(current);
  } else {
    merge();
  }
  clearLines();
  spawn();
}

function spawn() {
  current = next;
  next = generatePiece();
  if (collide(current.shape, current.x, current.y)) {
    endGame();
  }
  drawNext();
}

function updateHUD() {
  scoreEl.textContent = score.toLocaleString();
  linesEl.textContent = lines;
  levelEl.textContent = level;
}

function drawPowerCell(context, x, y, power, size, alpha) {
  context.globalAlpha = alpha ?? 1;
  context.fillStyle = POWER_COLORS[power];
  context.fillRect(x * size + 1, y * size + 1, size - 2, size - 2);
  context.fillStyle = 'rgba(255,255,255,0.18)';
  context.fillRect(x * size + 1, y * size + 1, size - 2, 4);
  context.globalAlpha = (alpha ?? 1) * 0.9;
  context.font = `bold ${Math.floor(size * 0.55)}px sans-serif`;
  context.textAlign = 'center';
  context.textBaseline = 'middle';
  context.fillStyle = '#fff';
  context.fillText(POWER_LABELS[power], x * size + size / 2, y * size + size / 2);
  context.globalAlpha = 1;
}

function drawBlock(context, x, y, colorIndex, size, alpha) {
  if (!colorIndex) return;
  const color = activeSkin.colors[colorIndex];
  activeSkin.renderBlock(context, x, y, color, size, alpha);
}

function drawGrid() {
  ctx.strokeStyle = document.body.classList.contains('light') ? '#d0d0e0' : '#22222e';
  ctx.lineWidth = 0.5;
  for (let c = 1; c < COLS; c++) {
    ctx.beginPath();
    ctx.moveTo(c * BLOCK, 0);
    ctx.lineTo(c * BLOCK, ROWS * BLOCK);
    ctx.stroke();
  }
  for (let r = 1; r < ROWS; r++) {
    ctx.beginPath();
    ctx.moveTo(0, r * BLOCK);
    ctx.lineTo(COLS * BLOCK, r * BLOCK);
    ctx.stroke();
  }
}

function draw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  drawGrid();

  for (let r = 0; r < ROWS; r++)
    for (let c = 0; c < COLS; c++)
      drawBlock(ctx, c, r, board[r][c], BLOCK);

  const gy = ghostY();
  for (let r = 0; r < current.shape.length; r++)
    for (let c = 0; c < current.shape[r].length; c++)
      if (current.shape[r][c]) {
        if (current.power)
          drawPowerCell(ctx, current.x + c, gy + r, current.power, BLOCK, 0.2);
        else
          drawBlock(ctx, current.x + c, gy + r, current.shape[r][c], BLOCK, 0.2);
      }

  for (let r = 0; r < current.shape.length; r++)
    for (let c = 0; c < current.shape[r].length; c++)
      if (current.shape[r][c]) {
        if (current.power)
          drawPowerCell(ctx, current.x + c, current.y + r, current.power, BLOCK);
        else
          drawBlock(ctx, current.x + c, current.y + r, current.shape[r][c], BLOCK);
      }
}

function drawNext() {
  const NB = 30;
  nextCtx.clearRect(0, 0, nextCanvas.width, nextCanvas.height);
  const shape = next.shape;
  const offX = Math.floor((4 - shape[0].length) / 2);
  const offY = Math.floor((4 - shape.length) / 2);
  for (let r = 0; r < shape.length; r++)
    for (let c = 0; c < shape[r].length; c++)
      if (shape[r][c]) {
        if (next.power)
          drawPowerCell(nextCtx, offX + c, offY + r, next.power, NB);
        else
          drawBlock(nextCtx, offX + c, offY + r, shape[r][c], NB);
      }
}

function endGame() {
  gameOver = true;
  cancelAnimationFrame(animId);
  overlayTitle.textContent = 'GAME OVER';
  overlayScore.textContent = `Puntos: ${score.toLocaleString()} | Combo: ${maxCombo}x | Líneas: ${lines}`;
  leaderboardSection.classList.remove('hidden');
  if (isTopScore(score)) {
    saveSection.classList.remove('hidden');
    nameInput.value = '';
    setTimeout(() => nameInput.focus(), 50);
  } else {
    saveSection.classList.add('hidden');
  }
  renderLeaderboard();
  overlay.classList.remove('hidden');
}

// ---- Pause menu ----

function showPauseMenu() {
  paused = true;
  cancelAnimationFrame(animId);
  pauseMain.classList.remove('hidden');
  pauseControlsView.classList.add('hidden');
  pauseOverlay.classList.remove('hidden');
  startLevelSelect.value = String(startLevel);
}

function hidePauseMenu() {
  paused = false;
  pauseOverlay.classList.add('hidden');
  lastTime = performance.now();
  loop(lastTime);
}

function togglePause() {
  if (gameOver) return;
  if (paused) {
    hidePauseMenu();
  } else {
    showPauseMenu();
  }
}

function loop(ts) {
  if (gameOver || paused) return;
  const dt = ts - lastTime;
  lastTime = ts;
  dropAccum += dt;
  if (dropAccum >= dropInterval) {
    dropAccum = 0;
    if (!collide(current.shape, current.x, current.y + 1)) {
      current.y++;
    } else {
      lockPiece();
    }
  }
  draw();
  animId = requestAnimationFrame(loop);
}

function init() {
  board = createBoard();
  score = 0;
  lines = 0;
  level = startLevel;
  paused = false;
  gameOver = false;
  dropInterval = Math.max(100, 1000 - (startLevel - 1) * 90);
  dropAccum = 0;
  lastTime = performance.now();
  powerupPending = false;
  powerupCounter = 0;
  combo = 0;
  maxCombo = 0;
  next = generatePiece();
  spawn();
  updateHUD();
  saveSection.classList.add('hidden');
  leaderboardSection.classList.add('hidden');
  restartBtn.textContent = 'Reiniciar';
  overlay.classList.add('hidden');
  pauseOverlay.classList.add('hidden');
  cancelAnimationFrame(animId);
  animId = requestAnimationFrame(loop);
}

document.addEventListener('keydown', e => {
  if (e.code === 'KeyP' || e.code === 'Escape') { togglePause(); return; }
  if (paused || gameOver) return;
  switch (e.code) {
    case 'ArrowLeft':
      if (!collide(current.shape, current.x - 1, current.y)) current.x--;
      break;
    case 'ArrowRight':
      if (!collide(current.shape, current.x + 1, current.y)) current.x++;
      break;
    case 'ArrowDown':
      softDrop();
      break;
    case 'ArrowUp':
    case 'KeyX':
      tryRotate();
      break;
    case 'Space':
      e.preventDefault();
      hardDrop();
      break;
  }
  updateHUD();
});

restartBtn.addEventListener('click', init);

saveScoreBtn.addEventListener('click', () => {
  const name = nameInput.value.trim() || 'AAA';
  const idx = addLeaderboardEntry(name, score, maxCombo, lines);
  renderLeaderboard(idx);
  saveSection.classList.add('hidden');
});

nameInput.addEventListener('keydown', e => {
  if (e.key === 'Enter') saveScoreBtn.click();
});

resetRecordsBtn.addEventListener('click', resetLeaderboard);

pauseResumeBtn.addEventListener('click', hidePauseMenu);
pauseRestartBtn.addEventListener('click', () => { hidePauseMenu(); init(); });
pauseControlsBtn.addEventListener('click', () => {
  pauseMain.classList.add('hidden');
  pauseControlsView.classList.remove('hidden');
});
pauseBackBtn.addEventListener('click', () => {
  pauseControlsView.classList.add('hidden');
  pauseMain.classList.remove('hidden');
});
startLevelSelect.addEventListener('change', e => {
  startLevel = parseInt(e.target.value, 10);
  localStorage.setItem('startLevel', e.target.value);
});

function applyTheme(theme) {
  if (theme === 'light') {
    document.body.classList.add('light');
    themeBtn.textContent = '☽ Modo oscuro';
  } else {
    document.body.classList.remove('light');
    themeBtn.textContent = '☀ Modo claro';
  }
}

function setSkin(key) {
  activeSkin = SKINS[key] || SKINS.retro;
  canvas.style.background = activeSkin.bg || '';
  nextCanvas.style.background = activeSkin.bg || '';
  skinSelect.value = key;
  localStorage.setItem('tetris-skin', key);
  if (current) {
    drawNext();
    if (!gameOver && !paused) draw();
  }
}

themeBtn.addEventListener('click', () => {
  const isLight = document.body.classList.contains('light');
  const nextTheme = isLight ? 'dark' : 'light';
  localStorage.setItem('tetris-theme', nextTheme);
  applyTheme(nextTheme);
});

skinSelect.addEventListener('change', () => {
  setSkin(skinSelect.value);
});

applyTheme(localStorage.getItem('tetris-theme') || 'dark');
setSkin(localStorage.getItem('tetris-skin') || 'retro');

// Show start screen with leaderboard before first game
init();
paused = true;
cancelAnimationFrame(animId);
overlayTitle.textContent = 'TETRIS';
overlayScore.textContent = '';
saveSection.classList.add('hidden');
leaderboardSection.classList.remove('hidden');
renderLeaderboard();
restartBtn.textContent = 'Jugar';
overlay.classList.remove('hidden');
