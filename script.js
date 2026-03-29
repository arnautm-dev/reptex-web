/* =======================================================================
   script.js
   Llibreria client per al projecte RepteX (HTML + CSS + JS pur).

   Conté:
   - includeHeaderFooter(): injecta els fragments header/footer
   - Funcions per llegir Realtime DB: loadLatestChallenges, loadAllChallenges, loadRanking
   - adminInit(): gestiona login (Google) i accions d'add/update/delete
   - Helpers (escapeHtml, slugify, parseHistoryEntry)
   ======================================================================= */


/* ---------------------- includeHeaderFooter ---------------------- */
// Aquesta funció carrega dinàmicament el contingut dels fitxers
// includes/header.html i includes/footer.html i els insereix al DOM.
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


/* ---------------------- HELPERS ---------------------- */

// 🧩 Funció per convertir un text en un slug apte per URL o ID
function slugify(text) {
    return text.toString().toLowerCase().trim()
        .replace(/\s+/g, '-')
        .replace(/[^\w-]+/g, '');
}

// 🧩 Evita vulnerabilitats XSS escapant HTML en text dinàmic
function escapeHtml(unsafe) {
    return String(unsafe)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

// 🧩 Analitza una entrada d’historial tipus "2025-11-03: Fer 20 flexions"
function parseHistoryEntry(entry) {
    if (!entry || typeof entry !== 'string') return { date: '', title: '' };

    // Divideix pel primer “:”
    const [datePart, ...rest] = entry.split(':');
    const titlePart = rest.join(':').trim();

    return {
        date: datePart.trim(),
        title: titlePart || '(Repte sense títol)'
    };
}


/* ---------------------- LLEGIR ÚLTIMS REPTES ---------------------- */
// Mostra els últims reptes a la pàgina d'inici
function loadLatestChallenges(limit = 5) {
    const container = document.getElementById('latest-challenges');
    if (!container) return;
    container.innerHTML = '<div class="muted">Carregant...</div>';

    const Reptex = window.ReptexFirebase;
    if (!Reptex?.db) {
        container.innerHTML = '<div class="muted">Firebase no inicialitzat.</div>';
        return;
    }

    console.log("Intentant llegir Realtime DB a /reptes");

    Reptex.get(Reptex.ref(Reptex.db, 'reptes')).then(snapshot => {
        const data = snapshot.val();
        if (!data) {
            container.innerHTML = '<div class="muted">Base de dades desconnectada.</div>';
            return;
        }

        // Converteix l’objecte rebut en una llista ordenable
        const items = Object.entries(data).map(([key, val]) => {
            const parsed = parseHistoryEntry(val);
            const date = parsed.date || key;
            const title = parsed.title || ('Repte: ' + key);
            return { key, date, title };
        });

        // Ordena de més recent a més antic
        items.sort((a, b) => (b.date || '').localeCompare(a.date || ''));

        // Renderitza només els n primers reptes
        container.innerHTML = '';
        items.slice(0, limit).forEach(it => {
            const el = document.createElement('div');
            el.className = 'card';
            el.innerHTML = `
                <div>
                    <strong>${escapeHtml(it.title)}</strong>
                    <div class="muted">Data: ${escapeHtml(it.date || '—')}</div>
                </div>`;
            container.appendChild(el);
        });
    }).catch(err => {
        container.innerHTML = '<div class="muted">Error llegint Realtime DB.</div>';
        console.error(err);
    });
}


/* ---------------------- LLEGIR TOT L'HISTORIAL ---------------------- */
// Mostra tots els reptes disponibles
function loadAllChallenges() {
    const container = document.getElementById('challenges-list');
    if (!container) return;
    container.innerHTML = '<div class="muted">Carregant...</div>';

    const Reptex = window.ReptexFirebase;
    if (!Reptex?.db) {
        container.innerHTML = '<div class="muted">Firebase no inicialitzat.</div>';
        return;
    }

    console.log("Intentant llegir Realtime DB a /reptes");

    // Llegeix tots els reptes
    Reptex.get(Reptex.ref(Reptex.db, 'reptes')).then(snapshot => {
        const data = snapshot.val();
        if (!data) {
            container.innerHTML = '<div class="muted">Base de dades desconnectada.</div>';
            return;
        }

        // Converteix objecte a llista d’objectes [{key, date, title}]
        const items = Object.entries(data).map(([key, val]) => {
            const parsed = parseHistoryEntry(val);
            const date = parsed.date || key;
            const title = parsed.title || ('Repte: ' + key);
            return { key, date, title };
        });

        // Ordena per data
        items.sort((a, b) => (b.date || '').localeCompare(a.date || ''));

        // Mostra la llista
        container.innerHTML = '';
        items.forEach(it => {
            const el = document.createElement('div');
            el.className = 'card';
            el.innerHTML = `
                <h3>${escapeHtml(it.title)}</h3>
                <div class="muted">Data: ${escapeHtml(it.date || '—')}</div>`;
            container.appendChild(el);
        });
    }).catch(err => {
        container.innerHTML = '<div class="muted">Error llegint Realtime DB.</div>';
        console.error(err);
    });
}


/* ---------------------- LLEGIR RÀNQUING ---------------------- */
// Llegeix el rànquing actual o mostra un demo si no hi ha dades
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
            //const demo = [
            //    { id: 'u1', name: 'Anna', points: 150, challengesCompleted: 12 },
            //    { id: 'u2', name: 'Pol', points: 120, challengesCompleted: 10 },
            //    { id: 'u3', name: 'Mar', points: 95, challengesCompleted: 8 }
            //];
            container.innerHTML = renderRankingTable(demo);
            return;
        }

        const rows = Object.entries(data).map(([id, v]) => ({
            id,
            name: v.name || ('Usuari ' + id),
            points: Number(v.points || 0),
            challengesCompleted: Number(v.challengesCompleted || 0)
        }));

        // Ordena per punts
        rows.sort((a, b) => b.points - a.points);
        container.innerHTML = renderRankingTable(rows);
    }).catch(err => {
        container.innerHTML = '<div class="muted">Error en llegir rànquing.</div>';
        console.error(err);
    });
}


/* ---------------------- RENDER DE TAULA RÀNQUING ---------------------- */
function renderRankingTable(rows) {
    let html = `
        <table>
            <thead>
                <tr><th>Pos.</th><th>Participant</th><th>Punts</th><th>Reptes</th></tr>
            </thead><tbody>`;

    rows.forEach((r, i) => {
        html += `
            <tr>
                <td><strong>${i + 1}</strong></td>
                <td>${escapeHtml(r.name)}</td>
                <td>${r.points}</td>
                <td>${r.challengesCompleted}</td>
            </tr>`;
    });

    html += `</tbody></table>`;
    return html;
}


/* ---------------------- ADMIN: login i operacions ---------------------- */
// Gestiona login amb Google i mostra/oculta el panell admin
function adminInit() {
    const Reptex = window.ReptexFirebase;
    const btnLogin = document.getElementById('btn-login');
    const btnLogout = document.getElementById('btn-logout');
    const adminPanel = document.getElementById('admin-panel');
    const feedback = document.getElementById('admin-feedback');

    if (!btnLogin || !btnLogout || !adminPanel) return;
    if (!Reptex?.auth || !Reptex?.db) {
        if (feedback) feedback.innerText = 'Firebase no està configurat. Revisa firebase.js';
        return;
    }

    // Observador d’estat d’autenticació
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

    // Login amb Google
    btnLogin.addEventListener('click', () => {
        const provider = new Reptex.GoogleAuthProvider();
        Reptex.signInWithPopup(Reptex.auth, provider).catch(err => {
            if (feedback) feedback.innerText = 'Error en login: ' + err.message;
            console.error(err);
        });
    });

    // Logout
    btnLogout.addEventListener('click', () => {
        Reptex.signOut(Reptex.auth).then(() => {
            if (feedback) feedback.innerText = 'Sessió tancada';
        });
    });
}
