const KEY = 'topdown_racer_leaderboard';

function readBoard() {
  try { const raw = localStorage.getItem(KEY); return raw ? JSON.parse(raw) : []; } catch (e) { return []; }
}

function escapeHtml(s) { return String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }

function renderLeaderboard() {
  const list = readBoard();
  const wrap = document.getElementById('listWrapper');
  if (!list || !wrap) return;
  if (!list.length) { wrap.innerHTML = '<p class="meta">No scores yet — play the game to record your score.</p>'; return; }
  const top = list.slice(0,10);
  const ol = document.createElement('ol');
  top.forEach((it) => {
    const li = document.createElement('li');
    const d = new Date(it.ts);
    const name = it.name ? `${escapeHtml(it.name)} — ` : '';
    li.innerHTML = `<strong>${it.score}</strong> <span class="meta">— ${name}${d.toLocaleString()}</span>`;
    ol.appendChild(li);
  });
  wrap.innerHTML = '';
  wrap.appendChild(ol);
}

document.addEventListener('DOMContentLoaded', () => {
  const clearBtn = document.getElementById('clearBtn');
  if (clearBtn) clearBtn.addEventListener('click', () => { if (!confirm('Clear leaderboard? This cannot be undone.')) return; localStorage.removeItem(KEY); renderLeaderboard(); });
  renderLeaderboard();
});
