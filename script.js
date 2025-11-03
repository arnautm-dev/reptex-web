/* script.js
   Llibreria client per al projecte RepteX (HTML + CSS + JS pur).
   Conté:
   - includeHeaderFooter(): injecta els fragments header/footer
   - Funcions per llegir Realtime DB: loadLatestChallenges, loadAllChallenges, loadRanking
   - adminInit(): gestiona login (Google) i accions d'add/update/delete
   - Helpers (escapeHtml, slugify)
*/

/* ---------------------- includeHeaderFooter ---------------------- */
async function includeHeaderFooter() {
  async function fetchAndInsert(path, selector) {
    try {
      const res = await fetch(path);
      if (!res.ok) throw new Error('No s\'ha pogut carregar ' + path);
      const html = await res.text();
      document.querySelector(selector).innerHTML = html;
    } catch (err) {
      console.error('Error incloent fragment:', err);
    }
  }

  await fetchAndInsert('includes/header.html', '#site-header');
  await fetchAndInsert('includes/footer.html', '#site-footer');
}

/* ---------------------- LLEGIR ÚLTIMS REPTES ---------------------- */
function loadLatestChallenges(limit = 5) {
  const container = document.getElementById('latest-challenges');
  if (!container) return;
  container.innerHTML = '<div class="muted">Carregant...</div>';

  const Reptex = window.ReptexFirebase;
  if (!Reptex?.db) {
    container.innerHTML = '<div class="muted">Firebase no inicialitzat.</div>';
    return;
  }

  Reptex.get(Reptex.ref(Reptex.db, 'reptes')).then(snapshot => {
    const data = snapshot.val();
    if (!data) {
      container.innerHTML = '<div class="muted">No s\'han trobat reptes.</div>';
      return;
    }

    const items = Object.entries(data).map(([key, val]) => {
      const parsed = Reptex.parseHistoryEntry(val);
      const date = parsed.date || key;
      const title = parsed.title || ('Repte: ' + key);
      return { key, date, title };
    });

    items.sort((a, b) => (b.date || '').localeCompare(a.date || ''));

    container.innerHTML = '';
    items.slice(0, limit).forEach(it => {
      const el = document.createElement('div');
      el.className = 'card';
      el.innerHTML = `<div><strong>${escapeHtml(it.title)}</strong><div class="muted">Data: ${escapeHtml(it.date || '—')}</div></div>`;
      container.appendChild(el);
    });
  }).catch(err => {
    container.innerHTML = '<div class="muted">Error llegint Realtime DB.</div>';
    console.error(err);
  });
}

/* ---------------------- LLEGIR TOT L'HISTORIAL ---------------------- */
function loadAllChallenges() {
  const container = document.getElementById('challenges-list');
  if (!container) return;
  container.innerHTML = '<div class="muted">Carregant...</div>';

  const Reptex = window.ReptexFirebase;
  if (!Reptex || !Reptex.db) {
    container.innerHTML = '<div class="muted">Firebase no inicialitzat.</div>';
    console.error('ReptexFirebase o ReptexFirebase.db no disponible', Reptex);
    return;
  }

  // Ruta preferida: 'history' (la que hem utilitzat abans). Si no hi ha dades, intentem 'reptes'.
  const tryPaths = ['reptes'];

  // Funció que intenta llegir una ruta i retorna una Promise amb les dades o null
  function readPath(path) {
    console.log('Intentant llegir Realtime DB a /' + path);
    return Reptex.db.ref(path).once('value').then(snapshot => {
      const val = snapshot.val();
      console.log('Snapshot per /' + path + ':', val);
      return val || null;
    }).catch(err => {
      console.error('Error llegint /' + path, err);
      return null;
    });
  }

  // Prova seqüencialment les rutes
  (async () => {
    let data = null;
    let usedPath = null;
    for (const p of tryPaths) {
      // eslint-disable-next-line no-await-in-loop
      const v = await readPath(p);
      if (v) { data = v; usedPath = p; break; }
    }

    if (!data) {
      container.innerHTML = '<div class="muted">No hi ha reptes guardats (prova /history o /reptes).</div>';
      return;
    }

    // Convertim l'objecte a array d'items
    const items = Object.entries(data).map(([key, val]) => {
      // Usa la funció parseHistoryEntry exposada a ReptexFirebase
      const parsed = (typeof Reptex.parseHistoryEntry === 'function') ? Reptex.parseHistoryEntry(val) : { date: null, title: String(val) };
      const date = parsed.date || key;
      const title = parsed.title || ('Repte: ' + key);
      return { key, date, title };
    });

    // Ordena descendent per data (format yyyy-mm-dd -> comparació de strings funciona)
    items.sort((a, b) => (b.date || '').localeCompare(a.date || ''));

    // Renderitza
    container.innerHTML = '';
    items.forEach(it => {
      const el = document.createElement('div');
      el.className = 'card';
      el.innerHTML = `<h3>${escapeHtml(it.title)}</h3><div class="muted">Data: ${escapeHtml(it.date || '—')}</div>`;
      container.appendChild(el);
    });

    console.log(`Mostrant ${items.length} reptes llegits de /${usedPath}`);
  })();
}


/* ---------------------- LLEGIR RÀNQUING ---------------------- */
function loadRanking() {
  const container = document.getElementById('ranking-table');
  if (!container) return;
  container.innerHTML = '<div class="muted">Carregant...</div>';

  const Reptex = window.ReptexFirebase;
  if (!Reptex?.db) {
    container.innerHTML = '<div class="muted">Firebase no inicialitzat.</div>';
    return;
  }

  Reptex.get(Reptex.ref(Reptex.db, 'ranking')).then(snapshot => {
    const data = snapshot.val();
    if (!data) {
      const demo = [
        { id: 'u1', name: 'Anna', points: 150, challengesCompleted: 12 },
        { id: 'u2', name: 'Pol', points: 120, challengesCompleted: 10 },
        { id: 'u3', name: 'Mar', points: 95, challengesCompleted: 8 }
      ];
      container.innerHTML = renderRankingTable(demo);
      return;
    }

    const rows = Object.entries(data).map(([id, v]) => ({
      id,
      name: v.name || ('Usuari ' + id),
      points: Number(v.points || 0),
      challengesCompleted: Number(v.challengesCompleted || 0)
    }));

    rows.sort((a, b) => b.points - a.points);
    container.innerHTML = renderRankingTable(rows);
  }).catch(err => {
    container.innerHTML = '<div class="muted">Error en llegir rànquing.</div>';
    console.error(err);
  });
}

/* Render de taula HTML per a rànquing */
function renderRankingTable(rows) {
  let html = `<table><thead><tr><th>Pos.</th><th>Participant</th><th>Punts</th><th>Reptes</th></tr></thead><tbody>`;
  rows.forEach((r, i) => {
    html += `<tr><td><strong>${i + 1}</strong></td><td>${escapeHtml(r.name)}</td><td>${r.points}</td><td>${r.challengesCompleted}</td></tr>`;
  });
  html += `</tbody></table>`;
  return html;
}

/* ---------------------- ADMIN: login i operacions ---------------------- */
function adminInit() {
  const Reptex = window.ReptexFirebase;
  const btnLogin = document.getElementById('btn-login');
  const btnLogout = document.getElementById('btn-logout');
  const adminPanel = document.getElementById('admin-panel');
  const feedback = document.getElementById('admin-feedback');
  const listOutput = document.getElementById('admin-list-output');

  if (!btnLogin || !btnLogout || !adminPanel) return;
  if (!Reptex?.auth || !Reptex?.db) {
    if (feedback) feedback.innerText = 'Firebase no està configurat. Revisa firebase.js';
    return;
  }

  // Observador d'estat d'autenticació
  Reptex.onAuthStateChanged(Reptex.auth, user => {
    if (user) {
      btnLogin.style.display = 'none';
      btnLogout.style.display = 'inline-block';
      adminPanel.style.display = 'block';
      if (feedback) feedback.innerText = 'Autenticat com ' + (user.displayName || user.email);
    } else {
      btnLogin.style.display = 'inline-block';
      btnLogout.style.display = 'none';
      adminPanel.style.display = 'none';
      if (feedback) feedback.innerText = 'No autenticat';
    }
  });

  // Login amb Google (popup)
  btnLogin.addEventListener('click', () => {
    const provider = new Reptex.GoogleAuthProvider();
    Reptex.signInWithPopup(Reptex.auth, provider).catch(err => {
      if (feedback) feedback.innerText = 'Error en login: ' + err.message;
      console.error(err);
    });
  });

  btnLogout.addEventListener('click', () => {
    Reptex.signOut(Reptex.auth).then(() => {
      if (feedback) feedback.innerText = 'Sessió tancada';
    });
  });
}

/* ---------------------- HELPERS ---------------------- */
function slugify(text) {
  return text.toString().toLowerCase().trim()
    .replace(/\s+/g, '-').replace(/[^\w-]+/g, '');
}

function escapeHtml(unsafe) {
  return String(unsafe)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}


//ERROR QUE DONA QUAN EXECUTES

//Firebase charged correctly.
//script.js:86 Intentant llegir Realtime DB a /reptes
//script.js:87 Uncaught (in promise) TypeError: Reptex.db.ref is not a function
//    at readPath (script.js:87:22)
//    at script.js:103:23
//    at loadAllChallenges (script.js:134:5)
//    at HTMLDocument.<anonymous> (reptes.html:33:7)