// ---------- Settings ----------
const COLS = 10;
const ROWS = 20;
const CELL = 30;

// ---------- The 7 pieces ----------
// 1 = a filled square, 0 = empty
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

function drawPiece(type, offsetX, offsetY) {
  SHAPES[type].forEach((row, y) => {
    row.forEach((value, x) => {
      if (value) drawCell(offsetX + x, offsetY + y, COLORS[type]);
    });
  });
}

// ---------- Temporary test: show all 7 pieces ----------
drawBoard();
drawPiece('I', 0, 0);
drawPiece('O', 5, 0);
drawPiece('T', 0, 4);
drawPiece('S', 5, 4);
drawPiece('Z', 0, 8);
drawPiece('J', 5, 8);
drawPiece('L', 0, 12);