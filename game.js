// ---------- Settings ----------
const GAME_TITLE = 'AMATAFALI';
const COLS = 10;
const ROWS = 20;
const CELL = 30;
const LINE_POINTS = [0, 100, 300, 500, 800];
const LINE_LABELS = ['', '', 'Double', 'Triple', 'Quad'];
const BEST_KEY = 'amatafali-best';
const CLEAR_MS = 420;                          // how long the line-clear effect lasts
const GRID_COLOR = 'rgba(130, 150, 155, 0.22)'; // faint grid lines

// ---------- The 7 pieces ----------
const SHAPES = {
  I: [[0,0,0,0],[1,1,1,1],[0,0,0,0],[0,0,0,0]],
  O: [[1,1],[1,1]],
  T: [[0,1,0],[1,1,1],[0,0,0]],
  S: [[0,1,1],[1,1,0],[0,0,0]],
  Z: [[1,1,0],[0,1,1],[0,0,0]],
  J: [[1,0,0],[1,1,1],[0,0,0]],
  L: [[0,0,1],[1,1,1],[0,0,0]]
};

const COLORS = {
  I: '#35c2d6',
  O: '#f2c230',
  T: '#a45bd6',
  S: '#4cb860',
  Z: '#e5534b',
  J: '#4a7de0',
  L: '#ee8b32'
};

// ---------- Canvases ----------
const canvas = document.getElementById('board');
const ctx = canvas.getContext('2d');
const nextCanvas = document.getElementById('next');
const nextCtx = nextCanvas.getContext('2d');

// ---------- The board ----------
function createBoard() {
  return Array.from({ length: ROWS }, () => Array(COLS).fill(null));
}

let board = createBoard();

// ---------- Game state ----------
// state is one of: 'ready', 'playing', 'paused', 'clearing', 'over'
let state = 'ready';
let piece = null;
let nextType = null;
let bag = [];
let score = 0;
let lines = 0;
let level = 1;
let best = 0;
let dropTimer = 0;
let lastTime = performance.now();

// Line-clear effect state
let clearingRows = [];
let clearTimer = 0;
let particles = [];
let popup = null;
let shake = 0;

try {
  best = Number(localStorage.getItem(BEST_KEY)) || 0;
} catch (err) {
  best = 0;
}

function dropSpeed() {
  return Math.max(100, 800 - (level - 1) * 70);
}

function updateHud() {
  if (score > best) {
    best = score;
    try {
      localStorage.setItem(BEST_KEY, String(best));
    } catch (err) {
      // Storage can be blocked; the game still works
    }
  }
  document.getElementById('score').textContent = score;
  document.getElementById('level').textContent = level;
  document.getElementById('lines').textContent = lines;
  document.getElementById('best').textContent = best;
}

// ---------- Drawing ----------
function drawCell(x, y, color) {
  ctx.fillStyle = color;
  ctx.fillRect(x * CELL + 1, y * CELL + 1, CELL - 2, CELL - 2);
}

function drawGrid() {
  ctx.strokeStyle = GRID_COLOR;
  ctx.lineWidth = 1;
  ctx.beginPath();
  for (let x = 1; x < COLS; x++) {
    ctx.moveTo(x * CELL + 0.5, 0);
    ctx.lineTo(x * CELL + 0.5, canvas.height);
  }
  for (let y = 1; y < ROWS; y++) {
    ctx.moveTo(0, y * CELL + 0.5);
    ctx.lineTo(canvas.width, y * CELL + 0.5);
  }
  ctx.stroke();
}

function drawBoard() {
  drawGrid();
  board.forEach((row, y) => {
    if (clearingRows.includes(y)) return; // these are drawn by drawClearing()
    row.forEach((type, x) => {
      if (type) drawCell(x, y, COLORS[type]);
    });
  });
}

function drawPiece(p, offsetY) {
  p.shape.forEach((row, y) => {
    row.forEach((value, x) => {
      if (value) drawCell(p.x + x, offsetY + y, COLORS[p.type]);
    });
  });
}

function ghostY() {
  let y = piece.y;
  while (!collides(piece.shape, piece.x, y + 1)) y++;
  return y;
}

function drawNext() {
  nextCtx.clearRect(0, 0, nextCanvas.width, nextCanvas.height);
  if (!nextType) return;
  const shape = SHAPES[nextType];
  const size = 20;
  const offsetX = (nextCanvas.width - shape[0].length * size) / 2;
  const offsetY = (nextCanvas.height - shape.length * size) / 2;
  nextCtx.fillStyle = COLORS[nextType];
  shape.forEach((row, y) => {
    row.forEach((value, x) => {
      if (value) {
        nextCtx.fillRect(offsetX + x * size + 1, offsetY + y * size + 1, size - 2, size - 2);
      }
    });
  });
}

// The completed rows flash white, then each block shrinks away from the centre
function drawClearing() {
  const p = Math.min(1, clearTimer / CLEAR_MS); // 0 -> 1
  clearingRows.forEach((y) => {
    ctx.fillStyle = 'rgba(255, 255, 255, ' + (0.35 * (1 - p)) + ')';
    ctx.fillRect(0, y * CELL, canvas.width, CELL);

    for (let x = 0; x < COLS; x++) {
      const dist = Math.abs(x - (COLS - 1) / 2);
      const local = Math.min(1, Math.max(0, p * 1.4 - dist * 0.08));
      const size = (CELL - 2) * (1 - local);
      const cx = x * CELL + CELL / 2;
      const cy = y * CELL + CELL / 2;

      ctx.fillStyle = COLORS[board[y][x]];
      ctx.fillRect(cx - size / 2, cy - size / 2, size, size);
      ctx.fillStyle = 'rgba(255, 255, 255, ' + (0.9 * (1 - local)) + ')';
      ctx.fillRect(cx - size / 2, cy - size / 2, size, size);
    }
  });
}

function drawParticles() {
  particles.forEach((p) => {
    ctx.globalAlpha = Math.max(0, p.life / p.max);
    ctx.fillStyle = p.color;
    ctx.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size);
  });
  ctx.globalAlpha = 1;
}

function drawPopup() {
  if (!popup) return;
  const t = popup.age / 900;
  const y = Math.max(40, popup.y) - t * 40;
  ctx.globalAlpha = Math.max(0, 1 - t);
  ctx.textAlign = 'center';
  ctx.font = 'bold 26px "Trebuchet MS", sans-serif';
  ctx.lineWidth = 4;
  ctx.strokeStyle = 'rgba(0, 0, 0, 0.6)';
  ctx.strokeText(popup.text, canvas.width / 2, y);
  ctx.fillStyle = '#ffffff';
  ctx.fillText(popup.text, canvas.width / 2, y);
  ctx.globalAlpha = 1;
}

function drawBanner(title, subtitle) {
  ctx.fillStyle = 'rgba(10, 16, 18, 0.75)';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = '#ffffff';
  ctx.textAlign = 'center';
  ctx.font = 'bold 30px "Trebuchet MS", sans-serif';
  ctx.fillText(title, canvas.width / 2, canvas.height / 2 - 6);
  ctx.font = '15px "Trebuchet MS", sans-serif';
  ctx.fillText(subtitle, canvas.width / 2, canvas.height / 2 + 22);
}

function render() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.save();

  // A short screen shake for big clears
  if (shake > 0) {
    const amp = shake / 50;
    ctx.translate((Math.random() * 2 - 1) * amp, (Math.random() * 2 - 1) * amp);
  }

  drawBoard();
  if (state === 'clearing') drawClearing();

  if (piece && (state === 'playing' || state === 'paused')) {
    // Ghost piece: a faint copy where the piece will land
    ctx.globalAlpha = 0.25;
    drawPiece(piece, ghostY());
    ctx.globalAlpha = 1;
    drawPiece(piece, piece.y);
  }

  drawParticles();
  drawPopup();

  if (state === 'ready') drawBanner(GAME_TITLE, 'Press Enter or tap to start');
  if (state === 'paused') drawBanner('Paused', 'Press P or tap to resume');
  if (state === 'over') drawBanner('Game over', 'Press Enter or tap to restart');

  ctx.restore();
}

// ---------- Effects ----------
function updateEffects(dt) {
  const f = dt / 16;
  particles.forEach((p) => {
    p.x += p.vx * f;
    p.y += p.vy * f;
    p.vy += 0.18 * f;
    p.life -= dt;
  });
  particles = particles.filter((p) => p.life > 0);

  if (popup) {
    popup.age += dt;
    if (popup.age > 900) popup = null;
  }
  if (shake > 0) shake = Math.max(0, shake - dt);
}

// ---------- Pieces ----------
// The "bag": all 7 pieces are dealt in random order before reshuffling,
// so you never wait too long for a piece.
function nextFromBag() {
  if (bag.length === 0) {
    bag = Object.keys(SHAPES);
    for (let i = bag.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [bag[i], bag[j]] = [bag[j], bag[i]];
    }
  }
  return bag.pop();
}

function spawnPiece() {
  const type = nextType || nextFromBag();
  nextType = nextFromBag();
  const shape = SHAPES[type].map(row => row.slice());
  piece = {
    type: type,
    shape: shape,
    x: Math.floor((COLS - shape[0].length) / 2),
    y: 0
  };
  drawNext();
  if (collides(piece.shape, piece.x, piece.y)) {
    state = 'over';
  }
}

// ---------- Collision ----------
function collides(shape, offsetX, offsetY) {
  for (let y = 0; y < shape.length; y++) {
    for (let x = 0; x < shape[y].length; x++) {
      if (!shape[y][x]) continue;
      const boardX = offsetX + x;
      const boardY = offsetY + y;
      if (boardX < 0 || boardX >= COLS || boardY >= ROWS) return true;
      if (boardY >= 0 && board[boardY][boardX]) return true;
    }
  }
  return false;
}

// Lock the piece into the board. If rows are complete, play the effect
// first; otherwise go straight to the next piece.
function lockPiece() {
  piece.shape.forEach((row, y) => {
    row.forEach((value, x) => {
      if (value) board[piece.y + y][piece.x + x] = piece.type;
    });
  });

  const fullRows = [];
  for (let y = 0; y < ROWS; y++) {
    if (board[y].every(cell => cell !== null)) fullRows.push(y);
  }

  if (fullRows.length > 0) {
    startClear(fullRows);
  } else {
    spawnPiece();
  }
}

// ---------- Clearing lines ----------
function startClear(rows) {
  clearingRows = rows;
  clearTimer = 0;
  state = 'clearing';
  piece = null;

  const n = rows.length;
  const points = LINE_POINTS[n] * level;
  popup = {
    text: LINE_LABELS[n] ? LINE_LABELS[n] + ' +' + points : '+' + points,
    y: rows[0] * CELL,
    age: 0
  };
  if (n >= 3) shake = 300;

  // A burst of little squares from every block in the cleared rows
  rows.forEach((y) => {
    for (let x = 0; x < COLS; x++) {
      const color = COLORS[board[y][x]];
      for (let i = 0; i < 2; i++) {
        const life = 500 + Math.random() * 300;
        particles.push({
          x: x * CELL + CELL / 2,
          y: y * CELL + CELL / 2,
          vx: (Math.random() - 0.5) * 6,
          vy: -Math.random() * 4 - 1,
          size: 3 + Math.random() * 3,
          life: life,
          max: life,
          color: color
        });
      }
    }
  });
}

function finishClear() {
  // Remove from the bottom-most row up so the row numbers stay correct
  const rows = clearingRows.slice().sort((a, b) => b - a);
  rows.forEach((y) => board.splice(y, 1));
  rows.forEach(() => board.unshift(Array(COLS).fill(null)));

  const cleared = rows.length;
  score += LINE_POINTS[cleared] * level;
  lines += cleared;
  level = 1 + Math.floor(lines / 10);
  updateHud();

  clearingRows = [];
  dropTimer = 0;
  state = 'playing';
  spawnPiece(); // sets state to 'over' if there is no room
}

// ---------- Moving and rotating ----------
function rotateShape(shape) {
  return shape[0].map((_, i) => shape.map(row => row[i]).reverse());
}

function movePiece(dx) {
  if (!collides(piece.shape, piece.x + dx, piece.y)) {
    piece.x += dx;
  }
}

function rotatePiece() {
  const rotated = rotateShape(piece.shape);
  const kicks = [0, -1, 1, -2, 2];
  for (const kick of kicks) {
    if (!collides(rotated, piece.x + kick, piece.y)) {
      piece.shape = rotated;
      piece.x += kick;
      return;
    }
  }
}

function softDrop(byPlayer) {
  if (!collides(piece.shape, piece.x, piece.y + 1)) {
    piece.y++;
    if (byPlayer) {
      score += 1;
      updateHud();
    }
  } else {
    lockPiece();
  }
  dropTimer = 0;
}

function hardDrop() {
  let distance = 0;
  while (!collides(piece.shape, piece.x, piece.y + 1)) {
    piece.y++;
    distance++;
  }
  score += distance * 2;
  updateHud();
  lockPiece();
  dropTimer = 0;
}

// ---------- Game flow ----------
function startGame() {
  board = createBoard();
  bag = [];
  nextType = null;
  score = 0;
  lines = 0;
  level = 1;
  dropTimer = 0;
  clearingRows = [];
  clearTimer = 0;
  particles = [];
  popup = null;
  shake = 0;
  state = 'playing';
  spawnPiece();
  updateHud();
}

function togglePause() {
  if (state === 'playing') state = 'paused';
  else if (state === 'paused') state = 'playing';
}

// ---------- Controls ----------
function act(action) {
  if (action === 'start') { startGame(); return; }
  if (action === 'pause') { togglePause(); return; }
  if (state !== 'playing') return;
  switch (action) {
    case 'left':   movePiece(-1);  break;
    case 'right':  movePiece(1);   break;
    case 'rotate': rotatePiece();  break;
    case 'down':   softDrop(true); break;
    case 'drop':   hardDrop();     break;
  }
}

document.addEventListener('keydown', (e) => {
  // Enter only starts a game from the start screen or game over,
  // so a stray key press can't wipe a game in progress
  if (e.key === 'Enter') {
    e.preventDefault();
    if (state === 'ready' || state === 'over') startGame();
    return;
  }
  if (e.key === 'p' || e.key === 'P') {
    togglePause();
    return;
  }
  const keys = {
    ArrowLeft: 'left',
    ArrowRight: 'right',
    ArrowUp: 'rotate',
    ArrowDown: 'down',
    ' ': 'drop'
  };
  const action = keys[e.key];
  if (action) {
    e.preventDefault();
    act(action);
  }
});

document.querySelectorAll('button[data-a]').forEach((btn) => {
  btn.addEventListener('pointerdown', (e) => {
    e.preventDefault();
    act(btn.dataset.a);
  });
});

// Pause automatically if the player switches tabs or apps
document.addEventListener('visibilitychange', () => {
  if (document.hidden && state === 'playing') state = 'paused';
});

// ---------- Touch controls ----------
(function setupTouch() {
  let anchorX = 0;
  let anchorY = 0;
  let startY = 0;
  let startTime = 0;
  let moved = false;
  let active = false;

  function cellPx() {
    // How many screen pixels one board square takes up right now
    return canvas.getBoundingClientRect().width / COLS;
  }

  canvas.addEventListener('pointerdown', (e) => {
    e.preventDefault();
    if (state === 'ready' || state === 'over') { startGame(); return; }
    if (state === 'paused') { togglePause(); return; }
    canvas.setPointerCapture(e.pointerId);
    active = true;
    moved = false;
    anchorX = e.clientX;
    anchorY = e.clientY;
    startY = e.clientY;
    startTime = performance.now();
  });

  canvas.addEventListener('pointermove', (e) => {
    if (!active || state !== 'playing') return;
    const size = cellPx();

    // Horizontal: move one column for every square-width of finger travel
    while (e.clientX - anchorX >= size) {
      movePiece(1);
      anchorX += size;
      moved = true;
    }
    while (anchorX - e.clientX >= size) {
      movePiece(-1);
      anchorX -= size;
      moved = true;
    }

    // Vertical: soft drop one row for every square-height of finger travel
    while (e.clientY - anchorY >= size && state === 'playing') {
      softDrop(true);
      anchorY += size;
      moved = true;
    }
  });

  canvas.addEventListener('pointerup', (e) => {
    if (!active) return;
    active = false;
    if (state !== 'playing') return;

    const elapsed = performance.now() - startTime;
    const dy = e.clientY - startY;
    const size = cellPx();

    if (!moved && elapsed < 250) {
      rotatePiece();                       // a quick tap rotates
    } else if (dy > size * 2 && dy / elapsed > 0.8) {
      hardDrop();                          // a fast downward flick drops
    }
  });

  canvas.addEventListener('pointercancel', () => { active = false; });
})();

// ---------- Game loop ----------
function gameLoop(time) {
  const dt = Math.min(time - lastTime, 50);
  lastTime = time;

  if (state === 'playing') {
    dropTimer += dt;
    if (dropTimer >= dropSpeed()) {
      softDrop(false);
    }
  } else if (state === 'clearing') {
    clearTimer += dt;
    if (clearTimer >= CLEAR_MS) finishClear();
  }

  updateEffects(dt);
  render();
  requestAnimationFrame(gameLoop);
}

updateHud();
requestAnimationFrame(gameLoop);