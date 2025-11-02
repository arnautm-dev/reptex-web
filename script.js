/* script.js
   Llibreria client per al projecte RepteX (HTML + CSS + JS pur).
   Conté:
   - includeHeaderFooter(): injecta els fragments header/footer
   - Funcions per llegir Realtime DB: loadLatestChallenges, loadAllChallenges, loadRanking
   - adminInit(): gestiona login (Google) i accions d'add/update/delete
   - Helpers (escapeHtml, slugify)
*/

/* ---------------------- includeHeaderFooter ---------------------- */
/* Carrega els fitxers INCLUDE (header.html, footer.html) i els insereix en la pàgina.
   Això evita duplicar el mateix HTML en cada pàgina.
*/
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
/* loadLatestChallenges(limit): llegeix /history de Realtime DB, parseja i mostra els n primers.
   IMPORTANT: Aquesta funció fa una lectura puntual (once). Segons la teva preferència, la UI no s'actualitza en
   temps real automàticament; cal refrescar la pàgina per veure canvis.
*/
function loadLatestChallenges(limit = 5) {
  const container = document.getElementById('latest-challenges');
  if (!container) return;

  container.innerHTML = '<div class="muted">Carregant...</div>';

  try {
    const db = window.ReptexFirebase?.db;
    if (!db) throw new Error('Firebase no està inicialitzat. Revisa firebase.js');

    db.ref('history').once('value').then(snapshot => {
      const data = snapshot.val();
      if (!data) {
        container.innerHTML = '<div class="muted">No s\'han trobat reptes.</div>';
        return;
      }

      const items = Object.entries(data).map(([key, val]) => {
        const parsed = window.ReptexFirebase.parseHistoryEntry(val);
        const date = parsed.date || key;
        const title = parsed.title || ('Repte: ' + key);
        return { key, date, title };
      });

      // Ordena descendent per data (funciona amb format yyyy-mm-dd com a string)
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

  } catch (err) {
    container.innerHTML = '<div class="muted">Error: revisa la configuració de Firebase.</div>';
    console.error(err);
  }
}

/* ---------------------- LLEGIR TOT L'HISTORIAL ---------------------- */
function loadAllChallenges() {
  const container = document.getElementById('challenges-list');
  if (!container) return;
  container.innerHTML = '<div class="muted">Carregant...</div>';

  const db = window.ReptexFirebase?.db;
  if (!db) {
    container.innerHTML = '<div class="muted">Firebase no inicialitzat.</div>';
    return;
  }

  db.ref('history').once('value').then(snapshot => {
    const data = snapshot.val();
    if (!data) {
      container.innerHTML = '<div class="muted">No hi ha reptes guardats.</div>';
      return;
    }

    const items = Object.entries(data).map(([key, val]) => {
      const parsed = window.ReptexFirebase.parseHistoryEntry(val);
      const date = parsed.date || key;
      const title = parsed.title || ('Repte: ' + key);
      return { key, date, title };
    });

    items.sort((a,b) => (b.date || '').localeCompare(a.date || ''));

    container.innerHTML = '';
    items.forEach(it => {
      const el = document.createElement('div');
      el.className = 'card';
      el.innerHTML = `<h3>${escapeHtml(it.title)}</h3><div class="muted">Data: ${escapeHtml(it.date || '—')}</div>`;
      container.appendChild(el);
    });
  }).catch(err => {
    container.innerHTML = '<div class="muted">Error llegint Realtime DB.</div>';
    console.error(err);
  });
}

/* ---------------------- LLEGIR RÀNQUING ---------------------- */
function loadRanking() {
  const container = document.getElementById('ranking-table');
  if (!container) return;
  container.innerHTML = '<div class="muted">Carregant...</div>';

  const db = window.ReptexFirebase?.db;
  if (!db) {
    container.innerHTML = '<div class="muted">Firebase no inicialitzat.</div>';
    return;
  }

  // Llegim una sola vegada
  db.ref('ranking').once('value').then(snapshot => {
    const data = snapshot.val();
    if (!data) {
      // Mostrem demo si no hi ha dades
      const demo = [
        { id:'u1', name:'Anna', points:150, challengesCompleted:12 },
        { id:'u2', name:'Pol', points:120, challengesCompleted:10 },
        { id:'u3', name:'Mar', points:95, challengesCompleted:8 }
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

    rows.sort((a,b) => b.points - a.points);
    container.innerHTML = renderRankingTable(rows);
  }).catch(err => {
    container.innerHTML = '<div class="muted">Error en llegir rànquing.</div>';
    console.error(err);
  });
}

/* Render de taula HTML per a rànquing */
function renderRankingTable(rows) {
  let html = `<table><thead><tr><th>Pos.</th><th>Participant</th><th>Punts</th><th>Reptes</th></tr></thead><tbody>`;
  rows.forEach((r,i) => {
    html += `<tr><td><strong>${i+1}</strong></td><td>${escapeHtml(r.name)}</td><td>${r.points}</td><td>${r.challengesCompleted}</td></tr>`;
  });
  html += `</tbody></table>`;
  return html;
}

/* ---------------------- ADMIN: login i operacions ---------------------- */
/* adminInit: configura l'observador d'autenticació, els botons i les funcionalitats
   d'afegir/editar/eliminar tant per /history com per /ranking.
   IMPORTANT: aquesta implementació escriu directament a Realtime DB. Assegura't
   d'haver configurat regles a Firebase (p.ex. escriure només si auth != null).
*/
function adminInit() {
  const btnLogin = document.getElementById('btn-login');
  const btnLogout = document.getElementById('btn-logout');
  const adminPanel = document.getElementById('admin-panel');
  const feedback = document.getElementById('admin-feedback');
  const listOutput = document.getElementById('admin-list-output');

  if (!btnLogin || !btnLogout || !adminPanel) return;

  const auth = window.ReptexFirebase?.auth;
  const db = window.ReptexFirebase?.db;
  if (!auth || !db) {
    if (feedback) feedback.innerText = 'Firebase no està configurat. Revisa firebase.js';
    return;
  }

  // Observador d'estat d'autenticació
  auth.onAuthStateChanged(user => {
    if (user) {
      btnLogin.style.display = 'none';
      btnLogout.style.display = 'inline-block';
      adminPanel.style.display = 'block';
      if (feedback) feedback.innerText = 'Autenticat com ' + (user.displayName || user.email) + '. Recorda: fes refresh a les pàgines per veure canvis.';
    } else {
      btnLogin.style.display = 'inline-block';
      btnLogout.style.display = 'none';
      adminPanel.style.display = 'none';
      if (feedback) feedback.innerText = 'No autenticat';
    }
  });

  // Login amb Google (popup)
  btnLogin.addEventListener('click', () => {
    const provider = new window.firebase.auth.GoogleAuthProvider();
    auth.signInWithPopup(provider).then(result => {
      if (feedback) feedback.innerText = 'Entrat: ' + (result.user.displayName || result.user.email);
    }).catch(err => {
      if (feedback) feedback.innerText = 'Error en login: ' + err.message;
      console.error(err);
    });
  });

  btnLogout.addEventListener('click', () => {
    auth.signOut().then(() => {
      if (feedback) feedback.innerText = 'Sessió tancada';
    });
  });

  /* ---- Reptes: Afegir / Editar (sobreescriure) / Eliminar ---- */
  document.getElementById('add-ch')?.addEventListener('click', () => {
    const date = document.getElementById('new-ch-date').value.trim();
    const title = document.getElementById('new-ch-title').value.trim();
    if (!date || !title) { if (feedback) feedback.innerText = 'Omple data i títol'; return; }
    // Guardem com a string "yyyy-mm-dd: títol" a la clau /history/{date}
    db.ref('history/' + date).set(`${date}: ${title}`).then(() => {
      if (feedback) feedback.innerText = 'Repte afegit. Fes refresh a "Historial" per veure el canvi.';
    }).catch(err => {
      if (feedback) feedback.innerText = 'Error afegint repte: ' + err.message;
      console.error(err);
    });
  });

  document.getElementById('update-ch')?.addEventListener('click', () => {
    const date = document.getElementById('new-ch-date').value.trim();
    const title = document.getElementById('new-ch-title').value.trim();
    if (!date || !title) { if (feedback) feedback.innerText = 'Omple data i títol'; return; }
    db.ref('history/' + date).set(`${date}: ${title}`).then(() => {
      if (feedback) feedback.innerText = 'Repte actualitzat (sobreescrit). Fes refresh per veure el canvi.';
    }).catch(err => {
      if (feedback) feedback.innerText = 'Error actualitzant repte: ' + err.message;
      console.error(err);
    });
  });

  document.getElementById('delete-ch')?.addEventListener('click', () => {
    const date = document.getElementById('new-ch-date').value.trim();
    if (!date) { if (feedback) feedback.innerText = 'Introdueix la data del repte a eliminar'; return; }
    if (!confirm('Eliminaràs el repte amb clau ' + date + '. Estàs segur?')) return;
    db.ref('history/' + date).remove().then(() => {
      if (feedback) feedback.innerText = 'Repte eliminat. Fes refresh per veure el canvi.';
    }).catch(err => {
      if (feedback) feedback.innerText = 'Error eliminant repte: ' + err.message;
      console.error(err);
    });
  });

  /* ---- Rànquing: Afegir/Actualitzar participant / Eliminar participant ---- */
  document.getElementById('save-rank')?.addEventListener('click', () => {
    const name = document.getElementById('rank-name').value.trim();
    const points = Number(document.getElementById('rank-points').value || 0);
    const ch = Number(document.getElementById('rank-ch').value || 0);
    if (!name) { if (feedback) feedback.innerText = 'Introdueix el nom'; return; }
    const slug = slugify(name);
    db.ref('ranking/' + slug).set({ name, points, challengesCompleted: ch }).then(() => {
      if (feedback) feedback.innerText = 'Participant desat/actualitzat a rànquing. Fes refresh per veure el canvi.';
    }).catch(err => {
      if (feedback) feedback.innerText = 'Error desant participant: ' + err.message;
      console.error(err);
    });
  });

  document.getElementById('delete-rank')?.addEventListener('click', () => {
    const name = document.getElementById('rank-name').value.trim();
    if (!name) { if (feedback) feedback.innerText = 'Introdueix el nom del participant a eliminar'; return; }
    const slug = slugify(name);
    if (!confirm('Eliminaràs el participant amb clau ' + slug + '. Estàs segur?')) return;
    db.ref('ranking/' + slug).remove().then(() => {
      if (feedback) feedback.innerText = 'Participant eliminat. Fes refresh per veure el canvi.';
    }).catch(err => {
      if (feedback) feedback.innerText = 'Error eliminant participant: ' + err.message;
      console.error(err);
    });
  });

  /* ---- Llistar claus existents (útil per editar/eliminar) ---- */
  document.getElementById('list-history')?.addEventListener('click', () => {
    db.ref('history').once('value').then(snapshot => {
      const data = snapshot.val();
      if (!data) {
        listOutput.textContent = 'No hi ha entrades a /history.';
        return;
      }
      listOutput.textContent = Object.keys(data).join('\n');
    }).catch(err => {
      listOutput.textContent = 'Error llegint /history: ' + err.message;
      console.error(err);
    });
  });

  document.getElementById('list-ranking')?.addEventListener('click', () => {
    db.ref('ranking').once('value').then(snapshot => {
      const data = snapshot.val();
      if (!data) {
        listOutput.textContent = 'No hi ha entrades a /ranking.';
        return;
      }
      // Mostra "clau -> nom (punts)"
      const lines = Object.entries(data).map(([k,v]) => `${k} -> ${v.name || '-'} (${v.points || 0} pts)`);
      listOutput.textContent = lines.join('\n');
    }).catch(err => {
      listOutput.textContent = 'Error llegint /ranking: ' + err.message;
      console.error(err);
    });
  });
}

/* ---------------------- HELPERS ---------------------- */
function slugify(text){
  return text.toString().toLowerCase().trim().replace(/\s+/g,'-').replace(/[^\w-]+/g,'');
}
function escapeHtml(unsafe) {
  return String(unsafe)
       .replace(/&/g, "&amp;")
       .replace(/</g, "&lt;")
       .replace(/>/g, "&gt;")
       .replace(/"/g, "&quot;")
       .replace(/'/g, "&#039;");
}
