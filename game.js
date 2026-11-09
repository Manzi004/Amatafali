// ---------- Settings ----------
const COLS = 10;
const ROWS = 20;
const CELL = 30;
const LINE_POINTS = [0, 100, 300, 500, 800];

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
let piece = null;
let nextType = null;
let score = 0;
let lines = 0;
let level = 1;
let gameOver = false;
let dropTimer = 0;
let lastTime = performance.now();

function dropSpeed() {
  // Faster at higher levels, but never faster than 100 ms
  return Math.max(100, 800 - (level - 1) * 70);
}

function updateHud() {
  document.getElementById('score').textContent = score;
  document.getElementById('level').textContent = level;
  document.getElementById('lines').textContent = lines;
}

// ---------- Drawing ----------
function drawCell(x, y, color) {
  ctx.fillStyle = color;
  ctx.fillRect(x * CELL + 1, y * CELL + 1, CELL - 2, CELL - 2);
}

function drawBoard() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  board.forEach((row, y) => {
    row.forEach((type, x) => {
      if (type) drawCell(x, y, COLORS[type]);
    });
  });
}

function drawPiece(p) {
  p.shape.forEach((row, y) => {
    row.forEach((value, x) => {
      if (value) drawCell(p.x + x, p.y + y, COLORS[p.type]);
    });
  });
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

function drawGameOver() {
  ctx.fillStyle = 'rgba(10, 16, 18, 0.75)';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = '#ffffff';
  ctx.textAlign = 'center';
  ctx.font = 'bold 30px "Trebuchet MS", sans-serif';
  ctx.fillText('Game over', canvas.width / 2, canvas.height / 2 - 6);
  ctx.font = '15px "Trebuchet MS", sans-serif';
  ctx.fillText('Press Enter or tap Restart', canvas.width / 2, canvas.height / 2 + 22);
}

function render() {
  drawBoard();
  if (piece && !gameOver) drawPiece(piece);
  if (gameOver) drawGameOver();
}

// ---------- Pieces ----------
function randomType() {
  const types = Object.keys(SHAPES);
  return types[Math.floor(Math.random() * types.length)];
}

function spawnPiece() {
  const type = nextType || randomType();
  nextType = randomType();
  const shape = SHAPES[type].map(row => row.slice());
  piece = {
    type: type,
    shape: shape,
    x: Math.floor((COLS - shape[0].length) / 2),
    y: 0
  };
  drawNext();
  // If the new piece has no room, the game is over
  if (collides(piece.shape, piece.x, piece.y)) {
    gameOver = true;
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

function lockPiece() {
  piece.shape.forEach((row, y) => {
    row.forEach((value, x) => {
      if (value) board[piece.y + y][piece.x + x] = piece.type;
    });
  });
  clearLines();
}

// ---------- Clearing lines ----------
function clearLines() {
  let cleared = 0;
  for (let y = ROWS - 1; y >= 0; y--) {
    if (board[y].every(cell => cell !== null)) {
      board.splice(y, 1);                          // remove the full row
      board.unshift(Array(COLS).fill(null));       // add an empty row at the top
      cleared++;
      y++;                                         // check this row number again
    }
  }
  if (cleared > 0) {
    score += LINE_POINTS[cleared] * level;
    lines += cleared;
    level = 1 + Math.floor(lines / 10);
    updateHud();
  }
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
    spawnPiece();
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
  spawnPiece();
  dropTimer = 0;
}

function restart() {
  board = createBoard();
  score = 0;
  lines = 0;
  level = 1;
  gameOver = false;
  nextType = null;
  dropTimer = 0;
  spawnPiece();
  updateHud();
}

// ---------- Controls ----------
function act(action) {
  if (action === 'start') {
    restart();
    return;
  }
  if (gameOver) return;
  switch (action) {
    case 'left':   movePiece(-1);  break;
    case 'right':  movePiece(1);   break;
    case 'rotate': rotatePiece();  break;
    case 'down':   softDrop(true); break;
    case 'drop':   hardDrop();     break;
  }
}

document.addEventListener('keydown', (e) => {
  const keys = {
    ArrowLeft: 'left',
    ArrowRight: 'right',
    ArrowUp: 'rotate',
    ArrowDown: 'down',
    ' ': 'drop',
    Enter: 'start'
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

// ---------- Game loop ----------
function gameLoop(time) {
  dropTimer += time - lastTime;
  lastTime = time;

  if (!gameOver && dropTimer >= dropSpeed()) {
    softDrop(false);
  }

  render();
  requestAnimationFrame(gameLoop);
}

spawnPiece();
updateHud();
requestAnimationFrame(gameLoop);