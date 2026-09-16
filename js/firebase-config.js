// Gleiches Firebase-Projekt wie tasks-extended (siehe Drill
// .drills/2026-09-16/artefakt-app.md in tasks-extended) – bewusst dasselbe
// Projekt, damit Diana & Co. dort schon bestehende Google-Konten/UIDs
// weiterverwenden. Diese Werte sind Firebase-Client-Config, keine Secrets
// (Schutz kommt über firestore.rules, nicht über Geheimhaltung dieser IDs) –
// deshalb hier committet, genau wie in tasks-extended/src/services/firebase.ts.
export const firebaseConfig = {
  apiKey: "AIzaSyCj035wtqQmy602C9iQAGbg_LzxXXjx4kU",
  authDomain: "tasks-extended-34507.firebaseapp.com",
  projectId: "tasks-extended-34507",
  storageBucket: "tasks-extended-34507.firebasestorage.app",
  messagingSenderId: "425277313752",
  appId: "1:425277313752:web:d43d2f3791591896e47dad",
};
