const GAME_DURATION = 30;
const WATER_CAN_POINTS = 10;
const MUDDY_CAN_POINTS = -5;
const WIN_SCORE = 100;
const MUDDY_SPAWN_RATE = 0.25;

const scoreElement = document.getElementById('score');
const timerElement = document.getElementById('timer');
const statusElement = document.getElementById('achievements');
const gridElement = document.querySelector('.game-grid');
const startButton = document.getElementById('start-game');
const resetButton = document.getElementById('reset-game');
const confettiLayer = document.querySelector('.confetti-layer');

let score = 0;
let timeLeft = GAME_DURATION;
let gameActive = false;
let spawnIntervalId;
let timerIntervalId;
let activeCanId = 0;
let celebrationUnlocked = false;

function createGrid() {
  gridElement.innerHTML = '';

  for (let index = 0; index < 9; index += 1) {
    const cell = document.createElement('div');
    cell.className = 'grid-cell';
    gridElement.appendChild(cell);
  }
}

function updateStats() {
  scoreElement.textContent = score;
  timerElement.textContent = timeLeft;
}

function setStatus(message) {
  statusElement.textContent = message;
}

function clearCurrentCan() {
  document.querySelectorAll('.grid-cell').forEach((cell) => {
    cell.classList.remove('active-cell');
    cell.innerHTML = '';
  });
}

function celebrate() {
  for (let pieceIndex = 0; pieceIndex < 80; pieceIndex += 1) {
    const piece = document.createElement('span');
    piece.className = 'confetti-piece';
    piece.style.left = `${Math.random() * 100}%`;
    piece.style.backgroundColor = Math.random() > 0.5 ? '#FFC907' : '#003366';
    piece.style.setProperty('--drift', `${(Math.random() - 0.5) * 220}px`);
    piece.style.animationDelay = `${Math.random() * 0.25}s`;
    piece.style.transform = `translateY(-12vh) rotate(${Math.random() * 180}deg)`;
    confettiLayer.appendChild(piece);

    piece.addEventListener('animationend', () => {
      piece.remove();
    });
  }
}

function maybeCelebrateScore() {
  if (celebrationUnlocked || score < WIN_SCORE) {
    return;
  }

  celebrationUnlocked = true;
  setStatus('Amazing work! You reached 100 points.');
  celebrate();
}

function spawnCan() {
  if (!gameActive) {
    return;
  }

  clearCurrentCan();
  activeCanId += 1;

  const cells = document.querySelectorAll('.grid-cell');
  const targetCell = cells[Math.floor(Math.random() * cells.length)];
  const isMuddyCan = Math.random() < MUDDY_SPAWN_RATE;
  const canButton = document.createElement('button');

  canButton.type = 'button';
  canButton.className = `can-button ${isMuddyCan ? 'can-button--muddy' : 'can-button--water'}`;
  canButton.dataset.canId = String(activeCanId);
  canButton.dataset.points = String(isMuddyCan ? MUDDY_CAN_POINTS : WATER_CAN_POINTS);
  canButton.setAttribute('aria-label', isMuddyCan ? 'Muddy can, minus five points' : 'Water can, plus ten points');
  canButton.innerHTML = '<span class="can-icon" aria-hidden="true"></span>';

  targetCell.classList.add('active-cell');
  targetCell.appendChild(canButton);
}

function handleCanClick(event) {
  const canButton = event.target.closest('.can-button');

  if (!gameActive || !canButton) {
    return;
  }

  score += Number(canButton.dataset.points);
  updateStats();
  maybeCelebrateScore();
  setStatus(Number(canButton.dataset.points) > 0 ? 'Clean water collected.' : 'Muddy can hit. Watch your score.');
  canButton.remove();
}

function tickTimer() {
  timeLeft -= 1;
  updateStats();

  if (timeLeft > 0) {
    return;
  }

  endGame(true);
}

function stopIntervals() {
  clearInterval(spawnIntervalId);
  clearInterval(timerIntervalId);
}

function startGame() {
  stopIntervals();
  clearCurrentCan();

  gameActive = true;
  score = 0;
  timeLeft = GAME_DURATION;
  celebrationUnlocked = false;

  updateStats();
  setStatus('30 seconds on the clock. Go.');
  spawnCan();

  spawnIntervalId = setInterval(spawnCan, 1000);
  timerIntervalId = setInterval(tickTimer, 1000);
}

function endGame(shouldCelebrate = false) {
  gameActive = false;
  stopIntervals();
  clearCurrentCan();
  timeLeft = 0;
  updateStats();
  setStatus(`Time is up. Final score: ${score}.`);

  if (shouldCelebrate) {
    celebrate();
  }
}

function resetGame() {
  gameActive = false;
  stopIntervals();
  clearCurrentCan();
  score = 0;
  timeLeft = GAME_DURATION;
  celebrationUnlocked = false;
  updateStats();
  setStatus('Game reset. Press Start to play again.');
}

createGrid();
updateStats();

gridElement.addEventListener('click', handleCanClick);
startButton.addEventListener('click', startGame);
resetButton.addEventListener('click', resetGame);
