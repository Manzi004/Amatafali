// ---------- Settings ----------
const COLS = 10;
const ROWS = 20;
const CELL = 30;
const DROP_SPEED = 800; // milliseconds between each step down

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

// ---------- Canvas ----------
const canvas = document.getElementById('board');
const ctx = canvas.getContext('2d');

// ---------- The board ----------
function createBoard() {
  return Array.from({ length: ROWS }, () => Array(COLS).fill(null));
}

let board = createBoard();

// ---------- Game state ----------
let piece = null;
let dropTimer = 0;
let lastTime = performance.now();

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

function render() {
  drawBoard();
  if (piece) drawPiece(piece);
}

// ---------- Pieces ----------
function randomType() {
  const types = Object.keys(SHAPES);
  return types[Math.floor(Math.random() * types.length)];
}

function spawnPiece() {
  const type = randomType();
  const shape = SHAPES[type].map(row => row.slice());
  piece = {
    type: type,
    shape: shape,
    x: Math.floor((COLS - shape[0].length) / 2),
    y: 0
  };
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
}

// ---------- Moving and rotating ----------
function rotateShape(shape) {
    // Turn the grid 90 degrees clockwise
    return shape[0].map((_, i) => shape.map(row => row[i]).reverse());
  }
  
  function movePiece(dx) {
    if (!collides(piece.shape, piece.x + dx, piece.y)) {
      piece.x += dx;
    }
  }
  
  function rotatePiece() {
    const rotated = rotateShape(piece.shape);
    // Try in place first, then nudge left or right if it hits a wall
    const kicks = [0, -1, 1, -2, 2];
    for (const kick of kicks) {
      if (!collides(rotated, piece.x + kick, piece.y)) {
        piece.shape = rotated;
        piece.x += kick;
        return;
      }
    }
  }
  
  function softDrop() {
    if (!collides(piece.shape, piece.x, piece.y + 1)) {
      piece.y++;
    } else {
      lockPiece();
      spawnPiece();
    }
    dropTimer = 0;
  }
  
  function hardDrop() {
    while (!collides(piece.shape, piece.x, piece.y + 1)) {
      piece.y++;
    }
    lockPiece();
    spawnPiece();
    dropTimer = 0;
  }
  
  function restart() {
    board = createBoard();
    spawnPiece();
    dropTimer = 0;
  }
  
  // ---------- Controls ----------
  function act(action) {
    switch (action) {
      case 'left':   movePiece(-1); break;
      case 'right':  movePiece(1);  break;
      case 'rotate': rotatePiece(); break;
      case 'down':   softDrop();    break;
      case 'drop':   hardDrop();    break;
      case 'start':  restart();     break;
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

  if (dropTimer >= DROP_SPEED) {
    softDrop();
  }

  render();
  requestAnimationFrame(gameLoop);
}

spawnPiece();
requestAnimationFrame(gameLoop);