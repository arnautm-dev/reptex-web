/* firebase.js
   Configuració per Firebase Realtime Database i Auth (compat).
   --> Substitueix les propietats de firebaseConfig amb les del teu projecte.
   --> Aquest fitxer exposa objectes globals que utilitza script.js.
*/

/* ========== 1) SUBSTITUEIX AQUEST OBJECTE AMB LES TEVES CREDENCIALS ========== */
const firebaseConfig = {
  apiKey: "SUBSTITUEIX_APIKEY",
  authDomain: "SUBSTITUEIX_authDomain",
  databaseURL: "https://SUBSTITUEIX_YOUR_DB.firebaseio.com",
  projectId: "SUBSTITUEIX_PROJECT_ID",
  storageBucket: "SUBSTITUEIX.appspot.com",
  messagingSenderId: "SUBSTITUEIX",
  appId: "SUBSTITUEIX_APPID"
};
/* ========================================================================== */

/* Inicialitza Firebase (si no està ja inicialitzat) */
if (!window.firebase.apps?.length) {
  window.firebaseApp = window.firebase.initializeApp(firebaseConfig);
  window.firebaseAuth = window.firebase.auth();
  window.firebaseDB = window.firebase.database();
} else {
  window.firebaseApp = window.firebase.app();
  window.firebaseAuth = window.firebase.auth();
  window.firebaseDB = window.firebase.database();
}

/**
 * parseHistoryEntry(value)
 * - Acepta diferents formats que puguis tenir a Realtime DB per a 'history'
 * - Si el valor és string amb format 'yyyy-mm-dd: text' el separa
 * - Si el valor és objecte intenta llegir els camps més usuals
 * - Retorna {date, title}
 */
function parseHistoryEntry(value) {
  if (!value) return { date: null, title: null };

  if (typeof value === 'object') {
    // objecte normal: busca camps comuns
    const date = value.date || value.data || value.d || null;
    const title = value.title || value.text || value.body || null;
    if (date && title) return { date, title };
    // fallback: intenta convertir l'objecte a string
    try {
      return { date: null, title: JSON.stringify(value) };
    } catch (e) {
      return { date: null, title: String(value) };
    }
  }

  if (typeof value === 'string') {
    const m = value.match(/^(\d{4}-\d{2}-\d{2})\s*:\s*(.*)$/);
    if (m) return { date: m[1], title: m[2] };
    // si no té format, retorna la cadena com a títol
    return { date: null, title: value };
  }

  // qualsevol altre tipus
  return { date: null, title: String(value) };
}

/* Exposem a l'objecte global per ser utilitzat per script.js */
window.ReptexFirebase = {
  app: window.firebaseApp,
  auth: window.firebaseAuth,
  db: window.firebaseDB,
  parseHistoryEntry
};
