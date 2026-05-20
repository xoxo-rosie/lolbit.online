

lucide.createIcons();

/* ── in-memory storage (localStorage blocked in sandboxed iframes) ── */
const _store = {};
const LS = {
  get: k => { try { return JSON.parse(_store[k] ?? 'null'); } catch(e) { return null; } },
  set: (k, v) => { try { _store[k] = JSON.stringify(v); } catch(e) {} },
  del: k => { delete _store[k]; }
};

/* ── dev panel state ── */
let titleClickCount = 0;
let titleClickTimeout = null;
let devGrid = false;
let devFps = false;

/* ── game loop ── */
let gameLoopId = null;
let lastFrameTime = 0;
let currentFps = 0;

/* ── settings & game state ── */
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
let direction = { x: 1, y: 0 };
let nextDirection = { x: 1, y: 0 };
let activeFruits = [];

const DIFF = {
  easy:   { speed: 130, mult: 1 },
  medium: { speed: 90,  mult: 2 },
  hard:   { speed: 65,  mult: 3 }
};
let diffCfg = DIFF[difficulty];

const GRID = 20;
const COLS = 20;
const ROWS = 20;

const FRUITS = [
  { emoji: '🍎', pts: 1 },
  { emoji: '🍊', pts: 3 },
  { emoji: '🍇', pts: 5 },
  { emoji: '🍓', pts: 2 },
  { emoji: '🍋', pts: 4 },
  { emoji: '🫐', pts: 6 },
  { emoji: '⭐', pts: 10, levelUp: true }
];

/* ── audio ── */
let audioCtx = null;
function getAudioCtx() {
  if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  return audioCtx;
}
function playSFX(freq, duration, type = 'sine', vol = 0.18) {
  if (!soundEnabled) return;
  try {
    const ctx = getAudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(vol, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + duration);
  } catch(e) {}
}

/* ── storage helpers ── */
function getUsers()  { return LS.get('snakeUsers3') || {}; }
function saveUsers(u) { LS.set('snakeUsers3', u); }

function getScores()  { return LS.get('snakeScores3') || []; }
function saveScores(s) { LS.set('snakeScores3', s); }

function getModeString() { return `${difficulty} | ${fruitDensity}x`; }

function hashPass(p) {
  let h = 0;
  for (let i = 0; i < p.length; i++) h = Math.imul(31, h) + p.charCodeAt(i) | 0;
  return h.toString();
}

function getUserData(username) {
  const users = getUsers();
  return users[username.toLowerCase()] || null;
}

function createAccount(username, password) {
  if (!username || username.length < 2) return 'username must be 2+ chars';
  if (!password || password.length < 4)  return 'password must be 4+ chars';
  const users = getUsers();
  if (users[username.toLowerCase()]) return 'username already taken';
  users[username.toLowerCase()] = {
    username,
    passHash: hashPass(password),
    snakeColorHue: 330,
    scores: []
  };
  saveUsers(users);
  return null;
}

function loginAccount(username, password) {
  const u = getUserData(username);
  if (!u) return 'user not found';
  if (u.passHash !== hashPass(password)) return 'wrong password';
  return null;
}

/* ── score helpers ── */
function addScoreEntry(username, pts, mode) {
  const scores = getScores();
  scores.push({ username, pts, mode, date: Date.now() });
  scores.sort((a, b) => b.pts - a.pts);
  saveScores(scores.slice(0, 50));
}

function updateScore() {
  document.getElementById('scoreEl').textContent = score;
  document.getElementById('levelEl').textContent = level;
  document.getElementById('hiEl').textContent    = highScore;
  document.getElementById('modeEl').textContent  = getModeString();
}

/* ── title easter egg ── */
function handleTitleClick() {
  titleClickCount++;
  clearTimeout(titleClickTimeout);
  titleClickTimeout = setTimeout(() => { titleClickCount = 0; }, 1000);
  if (titleClickCount >= 10) {
    titleClickCount = 0;
    document.getElementById('devPassModal')?.classList.add('visible');
  }
}

/* ── dev panel ── */
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
  document.getElementById('devPass').value = '';
  document.getElementById('devPassErr').textContent = '';
}

function openDevMenu() {
  updateDevStatus();
  const g = document.getElementById('devGridBtn');
  const f = document.getElementById('devFpsBtn');
  if (g) g.textContent = devGrid ? 'grid on' : 'grid off';
  if (f) f.textContent = devFps  ? 'fps on'  : 'fps off';
  lucide.createIcons();
  document.getElementById('devMenuModal')?.classList.add('visible');
}

function closeDevMenu() {
  document.getElementById('devMenuModal')?.classList.remove('visible');
}

function updateDevStatus() {
  const users  = Object.keys(getUsers()).length;
  const scores = getScores().length;
  const el = document.getElementById('devStatus');
  if (el) el.textContent = `users: ${users}\nscores: ${scores}`;
}

function devAddScore100()   { score  += 100; updateScore(); }
function devLevelUp()       { level  += 1;   updateScore(); }
function devToggleGrid()    { devGrid = !devGrid; openDevMenu(); }
function devToggleFps()     { devFps  = !devFps;  openDevMenu(); }
function devClearAllScores(){ saveScores([]); updateDevStatus(); }
function devClearAllUsers() { saveUsers({});  updateDevStatus(); }

function devResetAll() {
  LS.del('snakeSettings3');
  LS.del('snakeHighScore3');
  highScore = 0;
  loadSettings();
  closeDevMenu();
}

function devNukeStorage() {
  Object.keys(_store).forEach(k => delete _store[k]);
  highScore = 0;
  currentUser = null;
  document.getElementById('userInfo')?.classList.remove('visible');
  loadSettings();
  closeDevMenu();
}

/* ── modal helpers ── */
function openSignIn()  { document.getElementById('signInModal')?.classList.add('visible'); }
function closeSignIn() { document.getElementById('signInModal')?.classList.remove('visible'); }

function openLb() {
  const list = document.getElementById('lbList');
  const scores = getScores();
  if (!scores.length) {
    list.innerHTML = '<div class="lb-item" style="justify-content:center;color:rgba(255,230,242,.5)">no scores yet</div>';
  } else {
    list.innerHTML = scores.map((s, i) => `
      <div class="lb-item">
        <span>#${i + 1} ${s.username}</span>
        <span>${s.pts} pts</span>
        <span style="font-size:.8em;color:rgba(255,230,242,.5)">${s.mode}</span>
      </div>
    `).join('');
  }
  document.getElementById('lbModal')?.classList.add('visible');
}
function closeLb() { document.getElementById('lbModal')?.classList.remove('visible'); }

function openSettings()  { syncSettingsUI(); document.getElementById('settingsModal')?.classList.add('visible'); }
function closeSettings() { document.getElementById('settingsModal')?.classList.remove('visible'); }

/* ── settings sync ── */
function syncSettingsUI() {
  const sd = document.getElementById('soundToggle');
  const dp = document.getElementById('dpadToggle');
  const df = document.getElementById('diffSelect');
  const fr = document.getElementById('fruitSelect');
  const cs = document.getElementById('colorSlider');
  if (sd) { sd.textContent = soundEnabled ? 'on' : 'off'; sd.classList.toggle('active', soundEnabled); }
  if (dp) { dp.textContent = showDpad ? 'on' : 'off'; dp.classList.toggle('active', showDpad); }
  if (df) df.value = difficulty;
  if (fr) fr.value = String(fruitDensity);
  if (cs) { cs.value = snakeColorHue; updateColorPreview(snakeColorHue); }
}

function toggleSound() {
  soundEnabled = !soundEnabled;
  saveSettings();
  syncSettingsUI();
}

function toggleDpad() {
  showDpad = !showDpad;
  document.getElementById('dpad')?.classList.toggle('visible', showDpad);
  saveSettings();
  syncSettingsUI();
}

function changeDiff(val) {
  difficulty = val;
  diffCfg = DIFF[difficulty];
  saveSettings();
}

function changeFruit(val) {
  fruitDensity = parseInt(val);
  saveSettings();
}

function updateColorPreview(hue) {
  hue = parseInt(hue);
  const slider = document.getElementById('colorSlider');
  const preview = document.getElementById('snakePreview');
  const val = document.getElementById('colorValue');
  if (slider) slider.style.setProperty('--thumb-color', `hsl(${hue}, 80%, 60%)`);
  if (val) val.textContent = `hue: ${hue}°`;
  if (preview) {
    preview.innerHTML = '';
    for (let i = 0; i < 5; i++) {
      const seg = document.createElement('div');
      seg.className = 'snake-preview-seg';
      const l = 55 - i * 5;
      seg.style.background = `hsl(${hue}, 80%, ${l}%)`;
      preview.appendChild(seg);
    }
  }
}

function saveColorHue(hue) {
  snakeColorHue = parseInt(hue);
  if (currentUser) {
    const users = getUsers();
    const key = currentUser.username.toLowerCase();
    if (users[key]) {
      users[key].snakeColorHue = snakeColorHue;
      saveUsers(users);
    }
  }
  saveSettings();
}

function saveSettings() {
  LS.set('snakeSettings3', { soundEnabled, showDpad, difficulty, fruitDensity, snakeColorHue });
}

function loadSettings() {
  const s = LS.get('snakeSettings3');
  if (s) {
    soundEnabled  = s.soundEnabled  ?? true;
    showDpad      = s.showDpad      ?? false;
    difficulty    = s.difficulty    ?? 'easy';
    fruitDensity  = s.fruitDensity  ?? 2;
    snakeColorHue = s.snakeColorHue ?? 330;
  }
  diffCfg = DIFF[difficulty];
  document.getElementById('dpad')?.classList.toggle('visible', showDpad);
  syncSettingsUI();
  updateScore();
}

/* ── user login/logout ── */
function loginUser(username) {
  const u = getUserData(username);
  if (!u) return;
  currentUser = { username: u.username };
  snakeColorHue = u.snakeColorHue || 330;
  closeSignIn();
  document.getElementById('userInfo')?.classList.add('visible');
  document.getElementById('userName').textContent = u.username;
  syncSettingsUI();
}

/* ── fruit spawning ── */
function randomCell() {
  return {
    x: Math.floor(Math.random() * COLS),
    y: Math.floor(Math.random() * ROWS)
  };
}

function cellOccupied(x, y) {
  return snake.some(s => s.x === x && s.y === y) ||
         activeFruits.some(f => f.x === x && f.y === y);
}

function spawnFruitObj() {
  let pos, tries = 0;
  do {
    pos = randomCell();
    tries++;
  } while (cellOccupied(pos.x, pos.y) && tries < 100);

  const starChance = score > 30 ? 0.08 : 0;
  const rand = Math.random();
  let fruit;
  if (rand < starChance) {
    fruit = FRUITS[6]; // star
  } else {
    fruit = FRUITS[Math.floor(Math.random() * 6)];
  }
  activeFruits.push({ x: pos.x, y: pos.y, ...fruit });
}

/* ── game loop ── */
function startGame() {
  if (gameLoopId) { clearTimeout(gameLoopId); gameLoopId = null; }

  gameRunning = true;
  gamePaused  = false;
  score  = 0;
  level  = 1;
  lastFrameTime = 0;

  snake = [
    { x: 10, y: 10 },
    { x:  9, y: 10 },
    { x:  8, y: 10 }
  ];

  direction     = { x: 1, y: 0 };
  nextDirection = { x: 1, y: 0 };

  diffCfg = DIFF[difficulty];
  activeFruits = [];
  for (let i = 0; i < fruitDensity; i++) spawnFruitObj();

  // show canvas, hide menu buttons
  const canvas = document.getElementById('gameCanvas');
  canvas?.classList.add('visible');
  document.getElementById('infoBar')?.classList.add('visible');
  document.getElementById('menuBtns')?.classList.add('hidden');
  document.getElementById('fruitLegend')?.classList.add('visible');

  updateScore();
  loop();
}

function loop(now) {
  now = now ?? performance.now();
  if (!lastFrameTime) lastFrameTime = now;
  const delta = now - lastFrameTime;
  currentFps = delta > 0 ? Math.round(1000 / delta) : 60;
  lastFrameTime = now;

  if (gameRunning && !gamePaused) tick();
  renderGame();

  gameLoopId = setTimeout(() => loop(performance.now()), diffCfg.speed);
}

function tick() {
  direction = { ...nextDirection };

  const head = snake[0];
  let nx = (head.x + direction.x + COLS) % COLS;
  let ny = (head.y + direction.y + ROWS) % ROWS;

  // wall collision (wrapping is allowed; self-collision ends game)
  const hitSelf = snake.some((s, i) => i > 0 && s.x === nx && s.y === ny);
  if (hitSelf) { endGame(); return; }

  const newHead = { x: nx, y: ny };
  snake.unshift(newHead);

  // fruit collision
  const fruitIdx = activeFruits.findIndex(f => f.x === nx && f.y === ny);
  if (fruitIdx !== -1) {
    const fruit = activeFruits[fruitIdx];
    activeFruits.splice(fruitIdx, 1);

    const earned = fruit.pts * diffCfg.mult;
    score += earned;
    if (fruit.levelUp) { level++; playSFX(880, 0.4, 'triangle', 0.22); }
    else { playSFX(440 + fruit.pts * 50, 0.1, 'sine'); }

    if (score > highScore) {
      highScore = score;
      LS.set('snakeHighScore3', highScore);
    }
    updateScore();
    spawnFruitObj(); // keep density
  } else {
    snake.pop(); // no growth if no fruit
  }
}

function endGame() {
  gameRunning = false;
  clearTimeout(gameLoopId);
  gameLoopId = null;

  playSFX(180, 0.5, 'sawtooth', 0.3);

  if (currentUser && score > 0) {
    addScoreEntry(currentUser.username, score, getModeString());
  }

  // draw game over overlay
  renderGame(true);

  // re-show menu after delay
  setTimeout(() => {
    document.getElementById('gameCanvas')?.classList.remove('visible');
    document.getElementById('infoBar')?.classList.remove('visible');
    document.getElementById('menuBtns')?.classList.remove('hidden');
    document.getElementById('fruitLegend')?.classList.remove('visible');
  }, 2000);
}

/* ── rendering ── */
function renderGame(gameOver = false) {
  const canvas = document.getElementById('gameCanvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const W = canvas.width;
  const H = canvas.height;
  const cw = W / COLS;
  const ch = H / ROWS;

  // background
  ctx.fillStyle = '#160918';
  ctx.fillRect(0, 0, W, H);

  // grid (dev)
  if (devGrid) {
    ctx.strokeStyle = 'rgba(255,102,178,0.07)';
    ctx.lineWidth = 0.5;
    for (let x = 0; x <= COLS; x++) { ctx.beginPath(); ctx.moveTo(x * cw, 0); ctx.lineTo(x * cw, H); ctx.stroke(); }
    for (let y = 0; y <= ROWS; y++) { ctx.beginPath(); ctx.moveTo(0, y * ch); ctx.lineTo(W, y * ch); ctx.stroke(); }
  }

  // fruits
  ctx.font = `${cw * 0.78}px serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  for (const f of activeFruits) {
    ctx.fillText(f.emoji, f.x * cw + cw / 2, f.y * ch + ch / 2);
  }

  // snake
  for (let i = 0; i < snake.length; i++) {
    const seg = snake[i];
    const isHead = i === 0;
    const t = i / snake.length;
    const lightness = isHead ? 65 : 50 - t * 18;
    const sat = isHead ? 90 : 70;
    ctx.fillStyle = `hsl(${snakeColorHue}, ${sat}%, ${lightness}%)`;

    const pad = isHead ? 1 : 2;
    const r = isHead ? cw / 2 - 1 : cw / 2 - 2;

    roundRect(ctx, seg.x * cw + pad, seg.y * ch + pad, cw - pad * 2, ch - pad * 2, r);
    ctx.fill();

    // eyes on head
    if (isHead) {
      ctx.fillStyle = '#fff';
      const ex = seg.x * cw + cw / 2;
      const ey = seg.y * ch + ch / 2;
      const eyeR = cw * 0.1;
      const eyeOff = cw * 0.2;
      const angle = Math.atan2(direction.y, direction.x);
      ctx.beginPath();
      ctx.arc(ex + Math.cos(angle + 0.7) * eyeOff, ey + Math.sin(angle + 0.7) * eyeOff, eyeR, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(ex + Math.cos(angle - 0.7) * eyeOff, ey + Math.sin(angle - 0.7) * eyeOff, eyeR, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // fps overlay (dev)
  if (devFps) {
    ctx.fillStyle = 'rgba(0,0,0,0.7)';
    ctx.fillRect(0, 0, 90, 20);
    ctx.font = '11px monospace';
    ctx.fillStyle = currentFps < 30 ? '#f44' : '#0f0';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.fillText(`FPS: ${currentFps}`, 6, 4);
  }

  // game over overlay
  if (gameOver) {
    ctx.fillStyle = 'rgba(20,5,20,0.75)';
    ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = '#ffe6f2';
    ctx.font = `bold ${cw * 1.6}px Quicksand, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('game over', W / 2, H / 2 - 20);
    ctx.font = `${cw * 0.9}px Quicksand, sans-serif`;
    ctx.fillStyle = '#ff66b2';
    ctx.fillText(`score: ${score}`, W / 2, H / 2 + 20);
  }
}

function roundRect(ctx, x, y, w, h, r) {
  r = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

/* ── direction control ── */
function setDir(x, y) {
  if (direction.x === -x && direction.y === -y) return; // no 180
  nextDirection = { x, y };
}

/* ── keyboard ── */
document.addEventListener('keydown', e => {
  switch (e.key) {
    case 'ArrowUp':    case 'w': case 'W': e.preventDefault(); setDir(0, -1);  break;
    case 'ArrowDown':  case 's': case 'S': e.preventDefault(); setDir(0,  1);  break;
    case 'ArrowLeft':  case 'a': case 'A': e.preventDefault(); setDir(-1, 0);  break;
    case 'ArrowRight': case 'd': case 'D': e.preventDefault(); setDir( 1, 0);  break;
    case ' ':
    case 'Escape':
      if (gameRunning) { gamePaused = !gamePaused; }
      break;
  }
});

/* ── touch swipe on canvas ── */
let tsX = 0, tsY = 0;
const cvs = document.getElementById('gameCanvas');
cvs?.addEventListener('touchstart', e => {
  tsX = e.touches[0].clientX;
  tsY = e.touches[0].clientY;
}, { passive: false });

cvs?.addEventListener('touchend', e => {
  const dx = e.changedTouches[0].clientX - tsX;
  const dy = e.changedTouches[0].clientY - tsY;
  if (Math.abs(dx) > Math.abs(dy)) setDir(dx > 0 ? 1 : -1, 0);
  else setDir(0, dy > 0 ? 1 : -1);
});

/* ── DOMContentLoaded init ── */
document.addEventListener('DOMContentLoaded', () => {
  const siUsername = document.getElementById('siUsername');
  const siPassword = document.getElementById('siPassword');
  const siErr      = document.getElementById('siErr');

  document.getElementById('btnCreateAcc')?.addEventListener('click', () => {
    const u = siUsername.value.trim();
    const p = siPassword.value;
    const err = createAccount(u, p);
    if (err) { siErr.textContent = err; return; }
    loginUser(u);
    siErr.textContent = '';
  });

  document.getElementById('btnLoginAcc')?.addEventListener('click', () => {
    const u = siUsername.value.trim();
    const p = siPassword.value;
    const err = loginAccount(u, p);
    if (err) { siErr.textContent = err; return; }
    loginUser(u);
    siErr.textContent = '';
  });

  document.getElementById('playBtn')?.addEventListener('click', startGame);

  loadSettings();
  updateColorPreview(snakeColorHue);

  // open sign-in by default
  openSignIn();
});
