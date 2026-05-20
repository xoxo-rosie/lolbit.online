lucide.createIcons();

const LS = {
  get: k => { try { return JSON.parse(localStorage.getItem(k)); } catch(e) { return null; } },
  set: (k,v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch(e) { console.warn("storage err"); } },
  del: k => localStorage.removeItem(k)
};

let titleClickCount = 0;
let titleClickTimeout;
let devGrid = false;
let devFps = false;
let lastFrameTime = 0;
let currentFps = 0;

function handleTitleClick() {
  titleClickCount++;
  clearTimeout(titleClickTimeout);
  titleClickTimeout = setTimeout(() => { titleClickCount = 0; }, 1000);
  if (titleClickCount === 10) {
    titleClickCount = 0;
    document.getElementById('devPassModal').classList.add('visible');
    document.getElementById('devPass').value = '';
    document.getElementById('devPassErr').textContent = '';
    setTimeout(() => document.getElementById('devPass').focus(), 100);
  }
}

function devCheckPass() {
  const pass = document.getElementById('devPass').value;
  if (pass === '83638378') {
    document.getElementById('devPassModal').classList.remove('visible');
    openDevMenu();
  } else {
    document.getElementById('devPassErr').textContent = 'wrong password';
  }
}

function closeDevPass() { document.getElementById('devPassModal').classList.remove('visible'); }
function openDevMenu() { 
  updateDevStatus(); 
  document.getElementById('devGridBtn').innerHTML = devGrid ? '<i data-lucide="grid"></i> grid on' : '<i data-lucide="grid"></i> grid off';
  document.getElementById('devFpsBtn').innerHTML = devFps ? '<i data-lucide="monitor"></i> fps on' : '<i data-lucide="monitor"></i> fps off';
  lucide.createIcons();
  document.getElementById('devMenuModal').classList.add('visible'); 
}
function closeDevMenu() { document.getElementById('devMenuModal').classList.remove('visible'); }

function updateDevStatus() {
  const users = Object.keys(getUsers()).length;
  const scores = getScores().length;
  let status = `users: ${users}\nscores: ${scores}`;
  document.getElementById('devStatus').textContent = status;
}

function devAddScore100() { score += 100; updateScore(); updateDevStatus(); }
function devLevelUp() { level += 1; updateScore(); updateDevStatus(); }
function devToggleGrid() { devGrid = !devGrid; openDevMenu(); }
function devToggleFps() { devFps = !devFps; openDevMenu(); }
function devClearAllScores() { saveScores([]); updateDevStatus(); }
function devClearAllUsers() { saveUsers({}); updateDevStatus(); }
function devResetAll() { LS.del('snakeSettings3'); LS.del('snakeHighScore3'); loadSettings(); updateDevStatus(); }
function devNukeStorage() { localStorage.clear(); location.reload(); }

function getUsers() { return LS.get('snakeUsers3') || {}; }
function saveUsers(u) { LS.set('snakeUsers3', u); }
function hashPass(p) { let h=0; for(let i=0;i<p.length;i++) h=Math.imul(31,h)+p.charCodeAt(i)|0; return h.toString(); }

function createAccount(username, password) {
  if (!username || username.length < 2) return 'username too short';
  if (!password || password.length < 4) return 'password too short';
  const users = getUsers();
  const lower = username.toLowerCase();
  if (users[lower]) return 'username taken';
  users[lower] = { username, passwordHash: hashPass(password), snakeColorHue: 330, settings: {}, highScore: 0 };
  saveUsers(users);
  return null;
}

function loginAccount(username, password) {
  const users = getUsers();
  const u = users[username.toLowerCase()];
  if (!u) return 'account not found';
  if (u.passwordHash !== hashPass(password)) return 'wrong password';
  return null;
}

function getUserData(username) { return getUsers()[username.toLowerCase()] || null; }
function saveUserData(username, data) {
  const users = getUsers();
  const lower = username.toLowerCase();
  if (users[lower]) {
    users[lower] = { ...users[lower], ...data };
    saveUsers(users);
  }
}

function getScores() { return LS.get('snakeScores3') || []; }
function saveScores(s) { LS.set('snakeScores3', s); }

function getModeString() {
  return `${difficulty} | ${fruitDensity}x fruit`;
}

function addScore(username, scoreVal, currentMode) {
  let scores = getScores();
  let foundIndex = scores.findIndex(s => s.username === username && s.mode === currentMode);
  if (foundIndex !== -1) {
    if (scores[foundIndex].score < scoreVal) {
      scores[foundIndex].score = scoreVal;
      scores[foundIndex].date = new Date().toLocaleDateString();
    }
  } else {
    scores.push({ username, score: scoreVal, mode: currentMode, date: new Date().toLocaleDateString() });
  }
  scores.sort((a,b) => b.score - a.score);
  if (scores.length > 100) scores.pop();
  saveScores(scores);
}

function renderLeaderboard(scores, listId) {
  const el = document.getElementById(listId);
  if (!el) return;
  el.innerHTML = '';
  if (!scores.length) { el.innerHTML = '<div style="padding:15px;color:rgba(255,255,255,0.4);text-align:center;">no scores yet</div>'; return; }
  scores.forEach((s, i) => {
    let rank = i===0?'1st':i===1?'2nd':i===2?'3rd':`#${i+1}`;
    el.innerHTML += `<div class="lb-item"><span>${rank} - ${s.username}</span><span style="color:#ff66b2;font-weight:bold;">${s.score}</span><span style="color:#aaa;font-size:.8em">${s.mode}</span></div>`;
  });
}

let currentUser = null;

document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('btnCreateAcc').addEventListener('click', () => {
    const un = document.getElementById('siUsername').value.trim();
    const pw = document.getElementById('siPassword').value;
    const err = createAccount(un, pw);
    if (err) { document.getElementById('siErr').textContent = err; return; }
    loginUser(un);
  });
  document.getElementById('btnLoginAcc').addEventListener('click', () => {
    const un = document.getElementById('siUsername').value.trim();
    const pw = document.getElementById('siPassword').value;
    const err = loginAccount(un, pw);
    if (err) { document.getElementById('siErr').textContent = err; return; }
    loginUser(un);
  });
  document.getElementById('playBtn').addEventListener('click', startGame);
  loadSettings();
});

function loginUser(username) {
  const udata = getUserData(username);
  if (!udata) return;
  currentUser = { username: udata.username };
  snakeColorHue = udata.snakeColorHue || 330;
  if (udata.settings) {
    if (udata.settings.sound !== undefined) soundEnabled = udata.settings.sound;
    if (udata.settings.dpad !== undefined) showDpad = udata.settings.dpad;
    if (udata.settings.difficulty) difficulty = udata.settings.difficulty;
    if (udata.settings.fruitDensity) fruitDensity = udata.settings.fruitDensity;
  }
  document.getElementById('userInfo').classList.add('visible');
  document.getElementById('userName').textContent = udata.username;
  document.getElementById('signInModal').classList.remove('visible');
  document.getElementById('colorSlider').value = snakeColorHue;
  syncSettingsUI();
}

function showSignInModal() { document.getElementById('siErr').textContent = ''; document.getElementById('signInModal').classList.add('visible'); }
function skipSignIn() { document.getElementById('signInModal').classList.remove('visible'); }
function signOut() { currentUser = null; document.getElementById('userInfo').classList.remove('visible'); }

let soundEnabled = true, showDpad = false, difficulty = 'easy', fruitDensity = 2, snakeColorHue = 330;

function loadSettings() {
  const s = LS.get('snakeSettings3');
  if (s) {
    if (s.sound !== undefined) soundEnabled = s.sound;
    if (s.dpad !== undefined) showDpad = s.dpad;
    if (s.difficulty) difficulty = s.difficulty;
    if (s.fruitDensity) fruitDensity = s.fruitDensity;
    if (s.snakeColorHue !== undefined) snakeColorHue = s.snakeColorHue;
  }
  syncSettingsUI();
}

function syncSettingsUI() {
  document.getElementById('difficultySelect').value = difficulty;
  document.getElementById('densitySelect').value = fruitDensity;
  document.getElementById('colorSlider').value = snakeColorHue;
  updateColorSlider();
  document.getElementById('soundToggleBtn').textContent = soundEnabled ? 'on' : 'off';
  document.getElementById('soundToggleBtn').className = soundEnabled ? 'toggle-btn active' : 'toggle-btn';
  document.getElementById('dpadToggleBtn').textContent = showDpad ? 'on' : 'off';
  document.getElementById('dpadToggleBtn').className = showDpad ? 'toggle-btn active' : 'toggle-btn';
  if (showDpad) document.getElementById('dpad').classList.add('visible');
  else document.getElementById('dpad').classList.remove('visible');
}

function hexFromHUE(hue) {
  const h = ((hue % 360) + 360) % 360;
  const s = 0.85, l = 0.65;
  const c = (1 - Math.abs(2*l-1)) * s;
  const x = c * (1 - Math.abs((h/60)%2 - 1));
  const m = l - c/2;
  let r,g,b;
  if(h<60){r=c;g=x;b=0;}else if(h<120){r=x;g=c;b=0;}else if(h<180){r=0;g=c;b=x;}
  else if(h<240){r=0;g=x;b=c;}else if(h<300){r=x;g=0;b=c;}else{r=c;g=0;b=x;}
  const R=Math.round((r+m)*255), G=Math.round((g+m)*255), B=Math.round((b+m)*255);
  return `#${R.toString(16).padStart(2,'0')}${G.toString(16).padStart(2,'0')}${B.toString(16).padStart(2,'0')}`;
}

function updateColorSlider() {
  const hue = snakeColorHue;
  const hex = hexFromHUE(hue);
  const names = [[0,'red'],[30,'orange'],[60,'yellow'],[90,'lime'],[120,'green'],[150,'mint'],[180,'cyan'],[210,'sky'],[240,'blue'],[270,'purple'],[300,'magenta'],[330,'pink'],[360,'red']];
  let name = 'color';
  for(let i=0; i<names.length-1; i++){ if(hue>=names[i][0] && hue<names[i+1][0]){ name = names[i][1]; break; } }
  document.getElementById('colorValue').textContent = `${name} — hue ${hue}`;
  document.getElementById('colorSlider').style.setProperty('--thumb-color', hex);
  for(let i=0; i<5; i++){
    const el = document.getElementById(`sp${i}`);
    if(el) el.style.background = hexFromHUE(hue - i*12);
  }
}

document.getElementById('colorSlider').addEventListener('input', e => { snakeColorHue = parseInt(e.target.value); updateColorSlider(); });

function openSettings() { document.getElementById('settingsModal').classList.add('visible'); }
function closeSettings() { document.getElementById('settingsModal').classList.remove('visible'); }
function toggleSoundSetting() { soundEnabled = !soundEnabled; syncSettingsUI(); }
function toggleDpadSetting() { showDpad = !showDpad; syncSettingsUI(); }
function changeDifficultySetting() { difficulty = document.getElementById('difficultySelect').value; }
function changeDensitySetting() { fruitDensity = parseInt(document.getElementById('densitySelect').value); }

function saveSettings() {
  snakeColorHue = parseInt(document.getElementById('colorSlider').value);
  const s = { sound: soundEnabled, dpad: showDpad, difficulty, fruitDensity, snakeColorHue };
  LS.set('snakeSettings3', s);
  if (currentUser) saveUserData(currentUser.username, { snakeColorHue, settings: s });
  closeSettings();
}

function openLeaderboard() { renderLeaderboard(getScores().slice(0, 15), 'lbList'); document.getElementById('leaderboardModal').classList.add('visible'); }
function closeLeaderboard() { document.getElementById('leaderboardModal').classList.remove('visible'); }
function openInfo() { document.getElementById('infoModal').classList.add('visible'); }
function closeInfo() { document.getElementById('infoModal').classList.remove('visible'); }
function openSettingsFromGameOver() { document.getElementById('gameOverModal').classList.remove('visible'); openSettings(); }

let gameRunning = false, gamePaused = false, score = 0, level = 1, highScore = LS.get('snakeHighScore3') || 0;
const DIFF = { easy: { speed: 130, mult: 1 }, medium: { speed: 90, mult: 2 }, hard: { speed: 65, mult: 3 } };
let diffCfg = DIFF[difficulty];
let snake = [], direction = {x:1, y:0}, nextDirection = {x:1, y:0};

const FRUITS = [
  { name:'apple', pts:10, prob:35 },
  { name:'orange', pts:15, prob:25 },
  { name:'berry', pts:25, prob:15 },
  { name:'banana', pts:35, prob:10 },
  { name:'watermelon', pts:50, prob:6 },
  { name:'grapes', pts:60, prob:4 },
  { name:'pineapple', pts:75, prob:2.5 },
  { name:'mango', pts:90, prob:1.5 },
  { name:'star', pts:100, prob:0.8 },
  { name:'diamond', pts:150, prob:0.2 }
];

let activeFruits = [];

function spawnFruitObj() {
  let rand = Math.random() * 100, sum = 0, chosen = FRUITS[0];
  for(let f of FRUITS) { sum += f.prob; if(rand <= sum) { chosen = f; break; } }
  
  let posFound = false, fx, fy;
  while(!posFound) {
    fx = Math.floor(Math.random() * 20);
    fy = Math.floor(Math.random() * 20);
    posFound = !snake.some(s => s.x === fx && s.y === fy) && !activeFruits.some(f => f.x === fx && f.y === fy);
  }
  
  const newFruit = { x: fx, y: fy, type: chosen };
  activeFruits.push(newFruit);
  
  if (chosen.pts >= 50) {
    let ind = document.getElementById('powerUpIndicator');
    ind.innerHTML = `<i data-lucide="sparkles"></i> spawned ${chosen.name} +${chosen.pts * diffCfg.mult}`;
    lucide.createIcons();
    ind.classList.add('visible');
    setTimeout(() => ind.classList.remove('visible'), 2500);
  }
}

function startGame() {
  gameRunning = true; gamePaused = false; score = 0; level = 1;
  snake = [{x:10, y:10}, {x:9, y:10}, {x:8, y:10}];
  direction = {x:1, y:0}; nextDirection = {x:1, y:0};
  diffCfg = DIFF[difficulty];
  activeFruits = [];
  
  for(let i=0; i<fruitDensity; i++) spawnFruitObj();
  
  document.getElementById('startMenuArea').style.display = 'none';
  document.getElementById('gameButtons').style.display = 'flex';
  document.getElementById('infoBar').classList.add('visible');
  document.getElementById('fruitLegend').classList.add('visible');
  document.getElementById('gameCanvas').classList.add('visible');
  
  updateScore();
  gameLoop();
}

function resetGame() { document.getElementById('gameOverModal').classList.remove('visible'); startGame(); }
function showStartScreen() {
  gameRunning = false; gamePaused = false;
  document.getElementById('gameOverModal').classList.remove('visible');
  document.getElementById('startMenuArea').style.display = 'block';
  document.getElementById('gameButtons').style.display = 'none';
  document.getElementById('infoBar').classList.remove('visible');
  document.getElementById('fruitLegend').classList.remove('visible');
  document.getElementById('gameCanvas').classList.remove('visible');
}

function togglePause() {
  if(!gameRunning) return;
  gamePaused = !gamePaused;
  document.getElementById('pauseBtn').innerHTML = gamePaused ? '<i data-lucide="play"></i> resume' : '<i data-lucide="pause"></i> pause';
  lucide.createIcons();
}

function updateScore() {
  document.getElementById('score').textContent = score;
  document.getElementById('level').textContent = level;
  document.getElementById('highScore').textContent = Math.max(highScore, score);
}

function drawCustomFruit(ctx, x, y, gs, typeName) {
  let cx = x * gs + gs/2;
  let cy = y * gs + gs/2;
  let r = gs/2 - 2;
  
  ctx.save();
  ctx.translate(cx, cy);
  
  if (typeName === 'apple') {
    ctx.fillStyle = '#ff4d4d'; ctx.beginPath(); ctx.arc(0,1,r,0,Math.PI*2); ctx.fill();
    ctx.fillStyle = '#4caf50'; ctx.fillRect(-1, -r, 2, 4);
  } else if (typeName === 'orange') {
    ctx.fillStyle = '#ff9800'; ctx.beginPath(); ctx.arc(0,0,r,0,Math.PI*2); ctx.fill();
    ctx.fillStyle = '#e65100'; ctx.beginPath(); ctx.arc(0,-r+3,1.5,0,Math.PI*2); ctx.fill();
  } else if (typeName === 'berry') {
    ctx.fillStyle = '#e91e63';
    ctx.beginPath(); ctx.arc(-3,-2,r/1.5,0,Math.PI*2); ctx.fill();
    ctx.beginPath(); ctx.arc(3,-2,r/1.5,0,Math.PI*2); ctx.fill();
    ctx.beginPath(); ctx.arc(0,3,r/1.5,0,Math.PI*2); ctx.fill();
  } else if (typeName === 'banana') {
    ctx.strokeStyle = '#ffeeb5'; ctx.lineWidth = 4; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.arc(0, -r+3, r, 0.2, Math.PI - 0.2); ctx.stroke();
  } else if (typeName === 'watermelon') {
    ctx.fillStyle = '#4caf50'; ctx.beginPath(); ctx.arc(0,2,r,0,Math.PI,true); ctx.fill();
    ctx.fillStyle = '#ff5252'; ctx.beginPath(); ctx.arc(0,2,r-1.5,0,Math.PI,true); ctx.fill();
  } else if (typeName === 'grapes') {
    ctx.fillStyle = '#9c27b0';
    ctx.beginPath(); ctx.arc(-3,-3,3.5,0,Math.PI*2); ctx.fill();
    ctx.beginPath(); ctx.arc(3,-3,3.5,0,Math.PI*2); ctx.fill();
    ctx.beginPath(); ctx.arc(0,1,3.5,0,Math.PI*2); ctx.fill();
    ctx.beginPath(); ctx.arc(-1,4,3.5,0,Math.PI*2); ctx.fill();
  } else if (typeName === 'pineapple') {
    ctx.fillStyle = '#ffeb3b'; ctx.fillRect(-r+2,-r+5,r*2-4,r*2-5);
    ctx.fillStyle = '#4caf50'; ctx.beginPath(); ctx.moveTo(0,-r+1); ctx.lineTo(-4,-r-3); ctx.lineTo(4,-r-3); ctx.fill();
  } else if (typeName === 'mango') {
    ctx.fillStyle = '#ffc107'; ctx.beginPath(); ctx.ellipse(0,0,r,r-3,Math.PI/4,0,Math.PI*2); ctx.fill();
  } else if (typeName === 'star') {
    ctx.fillStyle = '#ffeb3b'; ctx.beginPath();
    for(let i=0; i<5; i++) {
      ctx.lineTo(Math.cos((18+i*72)*Math.PI/180)*r, -Math.sin((18+i*72)*Math.PI/180)*r);
      ctx.lineTo(Math.cos((54+i*72)*Math.PI/180)*(r/2), -Math.sin((54+i*72)*Math.PI/180)*(r/2));
    }
    ctx.closePath(); ctx.fill();
  } else if (typeName === 'diamond') {
    ctx.fillStyle = '#00bcd4';
    ctx.beginPath(); ctx.moveTo(0,-r); ctx.lineTo(r,0); ctx.lineTo(0,r); ctx.lineTo(-r,0); ctx.fill();
  }
  ctx.restore();
}

function drawGooglyEyes(ctx, headX, headY, gs, dir) {
  let cx = headX * gs + gs/2;
  let cy = headY * gs + gs/2;
  
  let jiggleX = (Math.random() - 0.5) * 1.5;
  let jiggleY = (Math.random() - 0.5) * 1.5;
  
  let ex1, ey1, ex2, ey2;
  let px1, py1, px2, py2;
  
  let dx = dir.x;
  let dy = dir.y;
  
  if (dx === 1) { 
    ex1 = cx + 2; ey1 = cy - 4; ex2 = cx + 2; ey2 = cy + 4;
    px1 = ex1 + 1.5 + jiggleX; py1 = ey1 + jiggleY;
    px2 = ex2 + 1.5 + jiggleX; py2 = ey2 + jiggleY;
  } else if (dx === -1) {
    ex1 = cx - 2; ey1 = cy - 4; ex2 = cx - 2; ey2 = cy + 4;
    px1 = ex1 - 1.5 + jiggleX; py1 = ey1 + jiggleY;
    px2 = ex2 - 1.5 + jiggleX; py2 = ey2 + jiggleY;
  } else if (dy === 1) {
    ex1 = cx - 4; ey1 = cy + 2; ex2 = cx + 4; ey2 = cy + 2;
    px1 = ex1 + jiggleX; py1 = ey1 + 1.5 + jiggleY;
    px2 = ex2 + jiggleX; py2 = ey2 + 1.5 + jiggleY;
  } else {
    ex1 = cx - 4; ey1 = cy - 2; ex2 = cx + 4; ey2 = cy - 2;
    px1 = ex1 + jiggleX; py1 = ey1 - 1.5 + jiggleY;
    px2 = ex2 + jiggleX; py2 = ey2 - 1.5 + jiggleY;
  }

  ctx.fillStyle = 'white';
  ctx.beginPath(); ctx.arc(ex1, ey1, 3.5, 0, Math.PI*2); ctx.fill();
  ctx.beginPath(); ctx.arc(ex2, ey2, 3.5, 0, Math.PI*2); ctx.fill();
  
  ctx.fillStyle = '#1c0e1f';
  ctx.beginPath(); ctx.arc(px1, py1, 1.5, 0, Math.PI*2); ctx.fill();
  ctx.beginPath(); ctx.arc(px2, py2, 1.5, 0, Math.PI*2); ctx.fill();
}

function renderGame() {
  const canvas = document.getElementById('gameCanvas');
  const ctx = canvas.getContext('2d');
  const gs = canvas.width / 20;
  
  ctx.fillStyle = '#160918';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  
  if (devGrid) {
    ctx.strokeStyle = 'rgba(255,102,178,0.08)';
    ctx.lineWidth = 1;
    for(let i=0; i<=20; i++){
      ctx.beginPath(); ctx.moveTo(i*gs,0); ctx.lineTo(i*gs,canvas.height); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(0,i*gs); ctx.lineTo(canvas.width,i*gs); ctx.stroke();
    }
  }
  
  const baseHue = snakeColorHue;
  
  for(let i=0; i<snake.length-1; i++) {
    let curr = snake[i], nxt = snake[i+1];
    ctx.fillStyle = hexFromHUE(baseHue - (i * 2));
    ctx.beginPath();
    let minX = Math.min(curr.x, nxt.x), maxX = Math.max(curr.x, nxt.x);
    let minY = Math.min(curr.y, nxt.y), maxY = Math.max(curr.y, nxt.y);
    if(curr.x === nxt.x) { ctx.fillRect(curr.x*gs + 2, minY*gs + gs/2, gs-4, gs); } 
    else { ctx.fillRect(minX*gs + gs/2, curr.y*gs + 2, gs, gs-4); }
  }

  snake.forEach((seg, i) => {
    ctx.fillStyle = hexFromHUE(baseHue - (i * 2));
    ctx.beginPath();
    ctx.arc(seg.x*gs + gs/2, seg.y*gs + gs/2, gs/2 - 2, 0, Math.PI*2);
    ctx.fill();
  });
  
  drawGooglyEyes(ctx, snake[0].x, snake[0].y, gs, direction);
  
  activeFruits.forEach(f => {
    drawCustomFruit(ctx, f.x, f.y, gs, f.type.name);
  });
  
  if (devFps) {
    ctx.fillStyle = '#ffb3d9';
    ctx.font = '12px monospace';
    ctx.textAlign = 'left'; ctx.textBaseline = 'top';
    ctx.fillText(`fps: ${currentFps}`, 5, 5);
  }
}

function gameLoop() {
  let now = performance.now();
  currentFps = Math.round(1000 / (now - lastFrameTime));
  lastFrameTime = now;

  if (gameRunning && !gamePaused) {
    direction = {...nextDirection};
    const head = {...snake[0]};
    head.x += direction.x; head.y += direction.y;
    
    if(head.x < 0 || head.x >= 20 || head.y < 0 || head.y >= 20 || snake.some(s => s.x === head.x && s.y === head.y)) {
      endGame(); return;
    }
    
    snake.unshift(head);
    
    let ateIndex = activeFruits.findIndex(f => f.x === head.x && f.y === head.y);
    if(ateIndex !== -1) {
      score += activeFruits[ateIndex].type.pts * diffCfg.mult;
      level = Math.floor(score / 150) + 1;
      activeFruits.splice(ateIndex, 1);
    } else {
      snake.pop();
    }
    
    while(activeFruits.length < fruitDensity) {
      spawnFruitObj();
    }
    
    updateScore(); renderGame();
  } else if (gameRunning && gamePaused) {
    renderGame();
  }
  if (gameRunning) setTimeout(gameLoop, diffCfg.speed);
}

function setDir(x, y) {
  if ((direction.x === -x && direction.y === -y) || (direction.x === x && direction.y === y)) return;
  nextDirection = {x, y};
}

function handleDpad(e, x, y) {
  e.preventDefault();
  setDir(x, y);
}

function endGame() {
  gameRunning = false;
  highScore = Math.max(highScore, score);
  LS.set('snakeHighScore3', highScore);
  
  let modeStr = getModeString();
  
  if(currentUser) {
    addScore(currentUser.username, score, modeStr);
    renderLeaderboard(getScores().slice(0, 5), 'lbListGameOver');
    document.getElementById('gameOverPlayer').textContent = currentUser.username;
  } else {
    document.getElementById('gameOverPlayer').textContent = '';
    document.getElementById('lbListGameOver').innerHTML = '';
  }
  
  document.getElementById('finalScore').textContent = score;
  document.getElementById('finalDifficulty').textContent = modeStr;
  document.getElementById('gameOverModal').classList.add('visible');
}

document.addEventListener('keydown', e => {
  if(!gameRunning || gamePaused) return;
  if(e.key === ' ') { e.preventDefault(); togglePause(); }
  if(e.key === 'ArrowUp' || e.key.toLowerCase() === 'w') { e.preventDefault(); setDir(0, -1); }
  if(e.key === 'ArrowDown' || e.key.toLowerCase() === 's') { e.preventDefault(); setDir(0, 1); }
  if(e.key === 'ArrowLeft' || e.key.toLowerCase() === 'a') { e.preventDefault(); setDir(-1, 0); }
  if(e.key === 'ArrowRight' || e.key.toLowerCase() === 'd') { e.preventDefault(); setDir(1, 0); }
});

const cvs = document.getElementById('gameCanvas');
let tsX = 0, tsY = 0;
cvs.addEventListener('touchstart', e => {
  tsX = e.changedTouches[0].screenX; tsY = e.changedTouches[0].screenY;
}, {passive: false});
cvs.addEventListener('touchmove', e => e.preventDefault(), {passive: false});
cvs.addEventListener('touchend', e => {
  if(!gameRunning || gamePaused) return;
  let dx = e.changedTouches[0].screenX - tsX;
  let dy = e.changedTouches[0].screenY - tsY;
  if(Math.abs(dx) > Math.abs(dy)) {
    if(dx > 30) setDir(1, 0); else if(dx < -30) setDir(-1, 0);
  } else {
    if(dy > 30) setDir(0, 1); else if(dy < -30) setDir(0, -1);
  }
});
