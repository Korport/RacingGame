// Main game script extracted from index.html
// ======= Setup =======
const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");

const scoreEl = document.getElementById("score");
const bestEl = document.getElementById("best");
const restartBtn = document.getElementById("restart");

const W = canvas.width, H = canvas.height;

// Road boundaries (simple "lane" feel)
const road = { x: 60, w: W - 120 };

// Player car
const player = { w: 34, h: 56, x: W / 2 - 17, y: H - 90, speed: 360, dx: 0 };

function makeDataURI(svg) { return 'data:image/svg+xml;utf8,' + encodeURIComponent(svg); }
const spritePlayer = new Image(); spritePlayer.src = 'assets/RaceCar.png';

const obstacleImageNames = ['assets/Blackcar.png','assets/PoliceCar.png','assets/Redpickuptruck.png','assets/SemiTruck.png','assets/YellowSUV.png'];
const obstacleImages = obstacleImageNames.map((n) => { const img = new Image(); img.src = n; return img; });

// Roadside sprites (match actual filenames in assets/)
const roadsideImageNames = ['assets/Tree1.png', 'assets/Tree2.png', 'assets/Tree3.png', 'assets/bush1.png'];
const roadsideImages = roadsideImageNames.map((n) => { const img = new Image(); img.src = n; return img; });

const roadside = [];
function initRoadside() {
  roadside.length = 0;
  const gap = 120;
  for (let y = -H; y < H * 2; y += gap) {
    const count = Math.random() < 0.45 ? 2 : 1;
    for (let i = 0; i < count; i++) {
      const isLeft = Math.random() < 0.5;
      const idx = Math.floor(Math.random() * roadsideImages.length);
      const name = roadsideImageNames[idx].toLowerCase();
      let w = name.includes('bush') ? rand(20, 48) : rand(32, 72);
      let h = name.includes('bush') ? rand(20, 48) : rand(56, 140);
      const sideX = isLeft ? road.x - 10 - w - rand(4, 18) : road.x + road.w + 10 + rand(4, 18);
      roadside.push({ x: sideX, y: y + rand(-40, 40), w, h, img: roadsideImages[idx] });
    }
  }
}
initRoadside();

// Obstacles
const obstacles = [];
let spawnTimer = 0, spawnEvery = 0.65, obstacleSpeed = 260, difficultyTimer = 0;

// Dashes
const dashes = []; const dashGap = 32; for (let y = -H; y < H * 2; y += dashGap) dashes.push({ y });
let dashSpeed = 240;

// Game state
let running = true, score = 0, best = Number(localStorage.getItem("topdown_racer_best") || "0");
bestEl.textContent = best;

// Input
const keys = { ArrowLeft: false, ArrowRight: false };
window.addEventListener("keydown", (e) => { if (e.code === "ArrowLeft" || e.code === "ArrowRight") e.preventDefault(); if (e.code in keys) keys[e.code] = true; if (e.code === "Space" && !running) resetGame(); }, { passive: false });
window.addEventListener("keyup", (e) => { if (e.code in keys) keys[e.code] = false; });
restartBtn.addEventListener("click", resetGame);

// On-screen controls
(function setupOnscreenControls() {
  function bindControlBtn(btn, key) {
    if (!btn) return;
    const setDown = (e) => { if (e && e.preventDefault) e.preventDefault(); keys[key] = true; };
    const setUp = (e) => { if (e && e.preventDefault) e.preventDefault(); keys[key] = false; };
    btn.addEventListener('pointerdown', setDown, { passive: false });
    btn.addEventListener('pointerup', setUp, { passive: false });
    btn.addEventListener('pointercancel', setUp); btn.addEventListener('mouseleave', setUp);
    btn.addEventListener('touchstart', setDown, { passive: false }); btn.addEventListener('touchend', setUp, { passive: false });
    btn.addEventListener('mousedown', setDown); btn.addEventListener('mouseup', setUp);
  }
  bindControlBtn(document.getElementById('btn-left'), 'ArrowLeft');
  bindControlBtn(document.getElementById('btn-right'), 'ArrowRight');
})();

// Helpers
function clamp(v, min, max) { return Math.max(min, Math.min(max, v)); }
function rectsOverlap(a, b) { return (a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y); }
function rand(min, max) { return Math.random() * (max - min) + min; }

// Leaderboard helper: save crash score into localStorage leaderboard array
function addScoreToLeaderboard(score) {
  try {
    const KEY = 'topdown_racer_leaderboard';
    const raw = localStorage.getItem(KEY);
    const arr = raw ? JSON.parse(raw) : [];
    const entry = { score: Number(score) || 0, ts: Date.now() };
    arr.push(entry); arr.sort((a, b) => b.score - a.score || a.ts - b.ts);
    const limited = arr.slice(0, 100); localStorage.setItem(KEY, JSON.stringify(limited));
    return entry;
  } catch (e) { return null; }
}

function readLeaderboard() { try { return JSON.parse(localStorage.getItem('topdown_racer_leaderboard') || '[]'); } catch (e) { return []; } }

function escapeHtml(s) { return String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }

function showLeaderboardOverlay(newEntry) {
  const overlay = document.getElementById('leaderboardOverlay');
  const content = document.getElementById('leaderboardContent');
  const banner = document.getElementById('congratsBanner');
  const nameEntry = document.getElementById('nameEntry');
  const nameInput = document.getElementById('playerNameInput');
  const saveBtn = document.getElementById('saveNameBtn');
  if (!overlay || !content) return;
  const list = readLeaderboard();
  if (!list.length) { content.innerHTML = '<div class="leaderboard-row">No scores yet</div>'; }
  else {
    const top = list.slice(0, 10);
    content.innerHTML = top.map((it, i) => {
      const d = new Date(it.ts);
      const name = it.name ? ` — ${escapeHtml(it.name)}` : '';
      return `<div class="leaderboard-row"><div>#${i+1} ${it.score}${name}</div><div class="meta">${d.toLocaleString()}</div></div>`;
    }).join('');
  }
  if (banner) banner.style.display = 'none';
  if (nameEntry) nameEntry.style.display = 'none';
  if (newEntry && newEntry.ts) {
    const idx = list.findIndex(it => it.ts === newEntry.ts);
    if (idx >= 0 && idx < 10) {
      if (banner) { banner.textContent = `Congratulations! You placed #${idx + 1} on the leaderboard.`; banner.style.display = 'block'; }
      if (nameEntry && nameInput && saveBtn) {
        nameEntry.style.display = 'block'; nameInput.value = '';
        saveBtn.onclick = () => {
          const raw = String(nameInput.value || '').trim().slice(0, 20); const safe = raw || 'Player';
          try { const KEY = 'topdown_racer_leaderboard'; const arr = JSON.parse(localStorage.getItem(KEY) || '[]'); for (let it of arr) if (it.ts === newEntry.ts) { it.name = safe; break; } localStorage.setItem(KEY, JSON.stringify(arr)); showLeaderboardOverlay(null); } catch (e) {}
        };
      }
    }
  }
  overlay.style.display = 'flex'; overlay.setAttribute('aria-hidden', 'false');
  const ob = document.getElementById('overlayRestart'); if (ob) ob.onclick = () => { hideLeaderboardOverlay(); resetGame(); };
}

function hideLeaderboardOverlay() { const overlay = document.getElementById('leaderboardOverlay'); if (!overlay) return; overlay.style.display = 'none'; overlay.setAttribute('aria-hidden', 'true'); }

function spawnObstacle() {
  const maxAttempts = 12; let placed = false; let lastTried = null;
  for (let attempt = 0; attempt < maxAttempts && !placed; attempt++) {
    const idx = Math.floor(Math.random() * obstacleImages.length);
    const chosenImg = obstacleImages[idx]; const name = obstacleImageNames[idx] || '';
    let w, h; const lname = name.toLowerCase();
    if (lname.includes('truck') || lname.includes('semi') || lname.includes('pickup')) { w = rand(44, 64); h = rand(80, 120); }
    else { w = rand(26, 48); h = rand(44, 78); }
    const x = rand(road.x + 6, road.x + road.w - w - 6); const y = -h - 10 - rand(0, 60); const candidate = { x, y, w, h, img: chosenImg };
    const pad = 6; let ok = true; for (const o of obstacles) { if (rectsOverlap({ x: candidate.x - pad, y: candidate.y - pad, w: candidate.w + pad * 2, h: candidate.h + pad * 2 }, o)) { ok = false; break; } }
    if (ok) { obstacles.push(candidate); placed = true; break; } lastTried = candidate;
  }
  if (!placed && lastTried) obstacles.push(lastTried);
}

function resetGame() {
  running = true; score = 0; obstacles.length = 0; player.x = W / 2 - player.w / 2; player.dx = 0;
  spawnTimer = 0; spawnEvery = 0.65; obstacleSpeed = 260; dashSpeed = 240; difficultyTimer = 0; scoreEl.textContent = "0"; try { hideLeaderboardOverlay(); } catch (e) {}
}

// Draw functions
function drawRoad() {
  ctx.fillStyle = "#0f1722"; ctx.fillRect(road.x, 0, road.w, H);
  ctx.fillStyle = "#2a3646"; ctx.fillRect(road.x - 6, 0, 6, H); ctx.fillRect(road.x + road.w, 0, 6, H);
  ctx.strokeStyle = "#3a4d66"; ctx.lineWidth = 2; ctx.setLineDash([]); ctx.beginPath(); ctx.moveTo(road.x + 10, 0); ctx.lineTo(road.x + 10, H); ctx.moveTo(road.x + road.w - 10, 0); ctx.lineTo(road.x + road.w - 10, H); ctx.stroke();
  ctx.setLineDash([18, 18]); ctx.lineWidth = 3; ctx.strokeStyle = "#cfe3ff33"; ctx.beginPath(); const cx = road.x + road.w / 2; for (const d of dashes) { ctx.moveTo(cx, d.y); ctx.lineTo(cx, d.y + 12); } ctx.stroke(); ctx.setLineDash([]);
}
function drawRoadside() { for (const r of roadside) { if (r.img && r.img.complete && r.img.naturalWidth) ctx.drawImage(r.img, r.x, r.y, r.w, r.h); else { ctx.fillStyle = '#0b6b3d'; ctx.fillRect(r.x, r.y, r.w, r.h); } } }
function drawPlayer() { if (spritePlayer && spritePlayer.complete && spritePlayer.naturalWidth) ctx.drawImage(spritePlayer, player.x, player.y, player.w, player.h); else { ctx.fillStyle = "#2dd4bf"; ctx.fillRect(player.x, player.y, player.w, player.h); ctx.fillStyle = "#0b0f14aa"; ctx.fillRect(player.x + 6, player.y + 8, player.w - 12, 16); } }
function drawObstacles() { for (const o of obstacles) { const img = o.img; if (img && img.complete && img.naturalWidth) ctx.drawImage(img, o.x, o.y, o.w, o.h); else { const fallback = (o.h > 78) ? '#f59e0b' : '#fb7185'; ctx.fillStyle = fallback; ctx.fillRect(o.x, o.y, o.w, o.h); ctx.fillStyle = '#ffffff33'; ctx.fillRect(o.x + 4, o.y + 4, Math.max(4, o.w - 8), 6); } } }
function drawOverlay() { if (running) return; ctx.fillStyle = "rgba(0,0,0,0.55)"; ctx.fillRect(0, 0, W, H); ctx.fillStyle = "#cfe3ff"; ctx.textAlign = "center"; ctx.font = "700 32px system-ui, -apple-system, Segoe UI, Roboto, Arial"; ctx.fillText("CRASH!", W / 2, H / 2 - 20); ctx.font = "500 16px system-ui, -apple-system, Segoe UI, Roboto, Arial"; ctx.fillStyle = "#cfe3ffcc"; ctx.fillText("Press Space or click Restart", W / 2, H / 2 + 18); }

// Update / loop
let last = performance.now(); function loop(now) { const dt = Math.min(0.033, (now - last) / 1000); last = now; update(dt); render(); requestAnimationFrame(loop); }
function update(dt) {
  if (!running) return; player.dx = 0; if (keys.ArrowLeft) player.dx -= player.speed; if (keys.ArrowRight) player.dx += player.speed; player.x += player.dx * dt; const minX = road.x + 6; const maxX = road.x + road.w - player.w - 6; player.x = clamp(player.x, minX, maxX);
  spawnTimer += dt; if (spawnTimer >= spawnEvery) { spawnTimer = 0; spawnObstacle(); if (Math.random() < 0.18) spawnObstacle(); }
  for (let i = obstacles.length - 1; i >= 0; i--) { obstacles[i].y += obstacleSpeed * dt; if (obstacles[i].y > H + 80) obstacles.splice(i, 1); }
  for (const d of dashes) { d.y += dashSpeed * dt; if (d.y > H + 40) d.y = -H - 40; }
  for (const r of roadside) { r.y += dashSpeed * dt; if (r.y > H + 120) { const idx = Math.floor(Math.random() * roadsideImages.length); const name = roadsideImageNames[idx].toLowerCase(); r.img = roadsideImages[idx]; r.w = name.includes('bush') ? rand(20, 48) : rand(32, 72); r.h = name.includes('bush') ? rand(20, 48) : rand(56, 140); const isLeft = Math.random() < 0.5; r.x = isLeft ? road.x - 10 - r.w - rand(4, 18) : road.x + road.w + 10 + rand(4, 18); r.y = -rand(80, 220); } }
  const pRect = { x: player.x, y: player.y, w: player.w, h: player.h };
  for (const o of obstacles) { if (rectsOverlap(pRect, o)) { let newEntry = null; try { newEntry = addScoreToLeaderboard(score); } catch (e) { newEntry = null; } running = false; try { if (score > best) { best = score; localStorage.setItem("topdown_racer_best", String(best)); bestEl.textContent = best; } } catch (e) {} try { showLeaderboardOverlay(newEntry); } catch (e) {} break; } }
  score += Math.floor(120 * dt); scoreEl.textContent = score; difficultyTimer += dt; if (difficultyTimer >= 2.5) { difficultyTimer = 0; obstacleSpeed += 10; dashSpeed += 8; spawnEvery = Math.max(0.38, spawnEvery - 0.02); }
}
function render() { ctx.clearRect(0, 0, W, H); ctx.fillStyle = "#0b0f14"; ctx.fillRect(0, 0, W, H); drawRoad(); drawRoadside(); drawObstacles(); drawPlayer(); drawOverlay(); }

requestAnimationFrame(loop);
