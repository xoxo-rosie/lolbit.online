lucide.createIcons();

const LS = {
  get: k => { try { return JSON.parse(localStorage.getItem(k)); } catch(e) { return null; } },
  set: (k,v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch(e) {} },
  del: k => localStorage.removeItem(k)
};

let titleClickCount = 0;
let titleClickTimeout;

let devGrid = false;
let devFps = false;

let lastFrameTime = 0;
let currentFps = 0;

let gameLoopId = null;

function handleTitleClick() {
  titleClickCount++;
  clearTimeout(titleClickTimeout);

  titleClickTimeout = setTimeout(() => titleClickCount = 0, 1000);

  if (titleClickCount >= 10) {
    titleClickCount = 0;
    document.getElementById('devPassModal')?.classList.add('visible');
  }
}

function devCheckPass() {
  const pass = document.getElementById('devPass').value;
  if (pass === '83638378') {
    closeDevPass();
    openDevMenu();
  } else {
    document.getElementById('devPassErr').textContent = 'wrong password';
  }
}

function closeDevPass() {
  document.getElementById('devPassModal')?.classList.remove('visible');
}

function openDevMenu() {
  updateDevStatus();

  const g = document.getElementById('devGridBtn');
  const f = document.getElementById('devFpsBtn');

  if (g) g.innerHTML = devGrid ? 'grid on' : 'grid off';
  if (f) f.innerHTML = devFps ? 'fps on' : 'fps off';

  lucide.createIcons();
  document.getElementById('devMenuModal')?.classList.add('visible');
}

function closeDevMenu() {
  document.getElementById('devMenuModal')?.classList.remove('visible');
}

function updateDevStatus() {
  const users = Object.keys(getUsers()).length;
  const scores = getScores().length;

  const el = document.getElementById('devStatus');
  if (el) el.textContent = `users: ${users}\nscores: ${scores}`;
}

/* DEV ACTIONS */
function devAddScore100() { score += 100; updateScore(); }
function devLevelUp() { level += 1; updateScore(); }
function devToggleGrid() { devGrid = !devGrid; openDevMenu(); }
function devToggleFps() { devFps = !devFps; openDevMenu(); }

function devClearAllScores() { saveScores([]); updateDevStatus(); }
function devClearAllUsers() { saveUsers({}); updateDevStatus(); }

function devResetAll() {
  LS.del('snakeSettings3');
  LS.del('snakeHighScore3');
  loadSettings();
}

function devNukeStorage() {
  localStorage.clear();
  location.reload();
}

/* USERS */
function getUsers() { return LS.get('snakeUsers3') || {}; }
function saveUsers(u) { LS.set('snakeUsers3', u); }

function hashPass(p) {
  let h = 0;
  for (let i = 0; i < p.length; i++) h = Math.imul(31, h) + p.charCodeAt(i) | 0;
  return h.toString();
}

/* SCORE */
function getScores() { return LS.get('snakeScores3') || []; }
function saveScores(s) { LS.set('snakeScores3', s); }

function getModeString() {
  return `${difficulty} | ${fruitDensity}x`;
}

/* SETTINGS / GAME STATE */
let soundEnabled = true;
let showDpad = false;
let difficulty = 'easy';
let fruitDensity = 2;
let snakeColorHue = 330;

let currentUser = null;

let gameRunning = false;
let gamePaused = false;

let score = 0;
let level = 1;
let highScore = LS.get('snakeHighScore3') || 0;

let snake = [];
let direction = {x:1,y:0};
let nextDirection = {x:1,y:0};

let activeFruits = [];

const DIFF = {
  easy: { speed: 130, mult: 1 },
  medium: { speed: 90, mult: 2 },
  hard: { speed: 65, mult: 3 }
};

let diffCfg = DIFF[difficulty];

/* INIT */
document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('btnCreateAcc')?.addEventListener('click', () => {
    const u = siUsername.value.trim();
    const p = siPassword.value;

    const err = createAccount(u,p);
    if (err) return siErr.textContent = err;

    loginUser(u);
  });

  document.getElementById('btnLoginAcc')?.addEventListener('click', () => {
    const u = siUsername.value.trim();
    const p = siPassword.value;

    const err = loginAccount(u,p);
    if (err) return siErr.textContent = err;

    loginUser(u);
  });

  document.getElementById('playBtn')?.addEventListener('click', startGame);

  loadSettings();
});

/* LOGIN */
function loginUser(username) {
  const u = getUserData(username);
  if (!u) return;

  currentUser = { username: u.username };

  snakeColorHue = u.snakeColorHue || 330;

  document.getElementById('signInModal')?.classList.remove('visible');
  document.getElementById('userInfo')?.classList.add('visible');
  document.getElementById('userName').textContent = u.username;

  syncSettingsUI();
}

/* GAME LOOP (fixed single loop) */
function startGame() {
  if (gameLoopId) cancelAnimationFrame(gameLoopId);

  gameRunning = true;
  gamePaused = false;

  score = 0;
  level = 1;

  snake = [
    {x:10,y:10},
    {x:9,y:10},
    {x:8,y:10}
  ];

  direction = {x:1,y:0};
  nextDirection = {x:1,y:0};

  diffCfg = DIFF[difficulty];
  activeFruits = [];

  for (let i = 0; i < fruitDensity; i++) spawnFruitObj();

  updateScore();
  loop();
}

function loop(now = performance.now()) {
  if (!lastFrameTime) lastFrameTime = now;

  const delta = now - lastFrameTime;
  currentFps = Math.round(1000 / delta);
  lastFrameTime = now;

  if (gameRunning && !gamePaused) tick();
  renderGame();

  gameLoopId = setTimeout(() => loop(performance.now()), diffCfg.speed);
}

/* SAFE DIR */
function setDir(x,y){
  if (direction.x === -x && direction.y === -y) return;
  nextDirection = {x,y};
}

/* FIXED TOUCH */
const cvs = document.getElementById('gameCanvas');
let tsX=0, tsY=0;

cvs?.addEventListener('touchstart', e=>{
  tsX=e.touches[0].clientX;
  tsY=e.touches[0].clientY;
},{passive:false});

cvs?.addEventListener('touchend', e=>{
  const dx = e.changedTouches[0].clientX - tsX;
  const dy = e.changedTouches[0].clientY - tsY;

  if (Math.abs(dx) > Math.abs(dy)) setDir(dx>0?1:-1,0);
  else setDir(0,dy>0?1:-1);
});