// firebase.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-app.js";
import { getDatabase, ref, get, set, update, remove, push } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-database.js";

// Configuració
const firebaseConfig = {
  apiKey: "AIzaSyAbFIhTsw-3LML151jVWaKutq7grM-fGLM",
  authDomain: "reptex-arnautmdev.firebaseapp.com",
  databaseURL: "https://reptex-arnautmdev-default-rtdb.firebaseio.com",
  projectId: "reptex-arnautmdev",
  storageBucket: "reptex-arnautmdev.firebasestorage.app",
  messagingSenderId: "121810888963",
  appId: "1:121810888963:web:5d9f64c1999a601d542136",
  measurementId: "G-1H3LSGBD3N"
};

// Inicialitza l’app
const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

// Exportem per accedir des d’altres fitxers
window.ReptexFirebase = {
  db,
  ref,
  get,
  set,
  update,
  remove,
  push,
  parseHistoryEntry: (val) => {
    if (!val) return {};
    const parts = val.split(':');
    return { date: parts[0], title: parts.slice(1).join(':').trim() };
  }
};

console.log("Firebase charged correctly.");
