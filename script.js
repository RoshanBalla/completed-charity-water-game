const GAME_DURATION = 30;
const WATER_CAN_POINTS = 10;
const WATER_DROP_POINTS = 5;
const MUDDY_CAN_POINTS = -5;
const WIN_SCORE = 100;
const MUDDY_SPAWN_RATE = 0.25;
const WATER_DROP_SPAWN_RATE = 0.25;
const SPAWN_INTERVAL_MS = 1000;

const DIFFICULTY_TIMINGS = {
  easy: 1500,
  normal: 1000,
  hard: 600
};

const milestoneMessages = [
  { points: 10, message: "Great start! You're making a splash." },
  { points: 30, message: 'Water is life! Keep collecting.' },
  { points: 60, message: 'Amazing! You\'re a clean water champion.' },
  { points: 100, message: 'Incredible! You\'ve reached the summit of impact.' }
];

const scoreElement = document.getElementById('score');
const timerElement = document.getElementById('timer');
const statusElement = document.getElementById('achievements');
const gridElement = document.querySelector('.game-grid');
const startButton = document.getElementById('start-game');
const resetButton = document.getElementById('reset-game');
const confettiLayer = document.querySelector('.confetti-layer');
const difficultyButtons = document.querySelectorAll('.difficulty-btn');

const clickAudio = new Audio('click.mp3');
const gameOverAudio = new Audio('gameover.mp3');

let score = 0;
let timeLeft = GAME_DURATION;
let gameActive = false;
let spawnIntervalId;
let timerIntervalId;
let activeItemTimeoutId;
let activeCanId = 0;
let celebrationUnlocked = false;
let selectedDifficulty = 'normal';
let reachedMilestones = new Set();
let didPromptForClickAudio = false;
let didPromptForGameOverAudio = false;

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

function getActiveItemLifetime() {
  return DIFFICULTY_TIMINGS[selectedDifficulty];
}

function setDifficulty(difficulty) {
  if (!DIFFICULTY_TIMINGS[difficulty] || gameActive) {
    return;
  }

  selectedDifficulty = difficulty;
  difficultyButtons.forEach((button) => {
    button.classList.toggle('is-selected', button.dataset.difficulty === difficulty);
  });

  setStatus(`Difficulty set to ${difficulty}. Press Start to begin.`);
}

function clearCurrentCan() {
  document.querySelectorAll('.grid-cell').forEach((cell) => {
    cell.classList.remove('active-cell');
    cell.innerHTML = '';
  });
}

function playSound(audioElement, soundType) {
  audioElement.currentTime = 0;

  audioElement.play().catch(() => {
    if (soundType === 'click' && !didPromptForClickAudio) {
      didPromptForClickAudio = true;
      setStatus('Click sound missing. Please attach click.mp3 and reload the page.');
    }

    if (soundType === 'gameover' && !didPromptForGameOverAudio) {
      didPromptForGameOverAudio = true;
      setStatus('Game over sound missing. Please attach gameover.mp3 and reload the page.');
    }
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
  celebrate();
}

function showMilestoneMessage() {
  const nextMilestone = milestoneMessages.find((milestone) => {
    return score >= milestone.points && !reachedMilestones.has(milestone.points);
  });

  if (!nextMilestone) {
    return false;
  }

  reachedMilestones.add(nextMilestone.points);
  setStatus(nextMilestone.message);
  return true;
}

function scheduleItemRemoval(expectedCanId) {
  clearTimeout(activeItemTimeoutId);

  activeItemTimeoutId = setTimeout(() => {
    if (!gameActive) {
      return;
    }

    const activeButton = document.querySelector(`.can-button[data-can-id="${expectedCanId}"]`);
    if (!activeButton) {
      return;
    }

    const parentCell = activeButton.closest('.grid-cell');
    activeButton.remove();
    if (parentCell) {
      parentCell.classList.remove('active-cell');
    }
  }, getActiveItemLifetime());
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
  const isWaterDrop = !isMuddyCan && Math.random() < WATER_DROP_SPAWN_RATE;
  const canButton = document.createElement('button');
  const points = isMuddyCan ? MUDDY_CAN_POINTS : (isWaterDrop ? WATER_DROP_POINTS : WATER_CAN_POINTS);
  const itemKind = isMuddyCan ? 'muddy' : (isWaterDrop ? 'drop' : 'jerry');

  canButton.type = 'button';
  canButton.className = `can-button ${isMuddyCan ? 'can-button--muddy' : (isWaterDrop ? 'can-button--drop' : 'can-button--water')}`;
  canButton.dataset.canId = String(activeCanId);
  canButton.dataset.points = String(points);
  canButton.dataset.kind = itemKind;
  canButton.setAttribute('aria-label', isMuddyCan ? 'Muddy can, minus five points' : (isWaterDrop ? 'Water drop, plus ten points' : 'Jerry can, plus ten points'));
  canButton.innerHTML = '<span class="can-icon" aria-hidden="true"></span>';

  targetCell.classList.add('active-cell');
  targetCell.appendChild(canButton);
  scheduleItemRemoval(activeCanId);
}

function handleCanClick(event) {
  const canButton = event.target.closest('.can-button');

  if (!gameActive || !canButton) {
    return;
  }

  const parentCell = canButton.closest('.grid-cell');
  const points = Number(canButton.dataset.points);
  const itemKind = canButton.dataset.kind;

  // Remove the clicked element immediately for responsive feedback.
  canButton.remove();
  if (parentCell) {
    parentCell.classList.remove('active-cell');
  }

  score += points;
  updateStats();
  const milestoneShown = showMilestoneMessage();
  maybeCelebrateScore();

  if (!milestoneShown) {
    if (points < 0) {
      setStatus('Muddy can hit. Watch your score.');
    } else if (itemKind === 'drop') {
      setStatus('Nice catch. You grabbed a water drop.');
    } else {
      setStatus('Clean water collected.');
    }
  }

  if ((itemKind === 'jerry' || itemKind === 'drop') && points > 0) {
    playSound(clickAudio, 'click');
  }
}

function tickTimer() {
  timeLeft -= 1;
  updateStats();

  if (timeLeft > 0) {
    return;
  }

  endGame('timer');
}

function stopIntervals() {
  clearInterval(spawnIntervalId);
  clearInterval(timerIntervalId);
  clearTimeout(activeItemTimeoutId);
}

function startGame() {
  stopIntervals();
  clearCurrentCan();

  gameActive = true;
  score = 0;
  timeLeft = GAME_DURATION;
  celebrationUnlocked = false;
  reachedMilestones = new Set();

  updateStats();
  setStatus(`30 seconds on the clock. ${selectedDifficulty[0].toUpperCase()}${selectedDifficulty.slice(1)} mode is live.`);
  spawnCan();

  spawnIntervalId = setInterval(spawnCan, SPAWN_INTERVAL_MS);
  timerIntervalId = setInterval(tickTimer, 1000);
}

function endGame(reason = 'reset') {
  gameActive = false;
  stopIntervals();
  clearCurrentCan();
  timeLeft = 0;
  updateStats();
  setStatus(`Time is up. Final score: ${score}.`);

  if (reason === 'timer') {
    playSound(gameOverAudio, 'gameover');
  }
}

function resetGame() {
  gameActive = false;
  stopIntervals();
  clearCurrentCan();
  score = 0;
  timeLeft = GAME_DURATION;
  celebrationUnlocked = false;
  reachedMilestones = new Set();
  updateStats();
  setStatus('Game reset. Press Start to play again.');
}

createGrid();
updateStats();

gridElement.addEventListener('click', handleCanClick);
startButton.addEventListener('click', startGame);
resetButton.addEventListener('click', resetGame);
difficultyButtons.forEach((button) => {
  button.addEventListener('click', () => {
    setDifficulty(button.dataset.difficulty);
  });
});
