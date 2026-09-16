// Kein Build-Schritt, kein npm nötig: Firebase kommt direkt als ESM von der
// gstatic-CDN, genau wie die Seiten selbst reines HTML/CSS/JS sind (1:1-Ziel
// aus dem Drill). Absichtlich dieselbe SDK-Version wie hier unten überall im
// Repo, sonst laden Auth/Firestore mehrfach gegeneinander.
import {
  initializeApp,
} from "https://www.gstatic.com/firebasejs/11.0.0/firebase-app.js";
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signOut,
  onAuthStateChanged,
} from "https://www.gstatic.com/firebasejs/11.0.0/firebase-auth.js";
import {
  getFirestore,
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  where,
  updateDoc,
} from "https://www.gstatic.com/firebasejs/11.0.0/firebase-firestore.js";
import { firebaseConfig } from "./firebase-config.js";

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
const provider = new GoogleAuthProvider();

export function login() {
  return signInWithPopup(auth, provider);
}

export function logout() {
  return signOut(auth);
}

export function onAuth(callback) {
  return onAuthStateChanged(auth, callback);
}

// Menü: nur Artefakte, die für die eigene UID freigegeben sind. Die
// Firestore-Rule verlangt genau diese where-Klausel (array-contains) –
// eine ungefilterte Listen-Query würde von den Rules abgelehnt.
export async function ladeFreigegebeneArtefakte(uid) {
  const q = query(
    collection(db, "artefakte"),
    where("allowedUids", "array-contains", uid),
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

// Für den Zugriffsschutz einzelner Artefakt-Seiten (siehe guard.js): ein
// einzelnes Dokument lesen und selbst gegen allowedUids prüfen.
export async function pruefeZugriff(artefaktId, uid) {
  const snap = await getDoc(doc(db, "artefakte", artefaktId));
  if (!snap.exists()) return false;
  return (snap.data().allowedUids ?? []).includes(uid);
}

// Status-Badge ist Freitext, pro Artefakt-Dokument gespeichert (kein festes
// Enum) – die Rule erlaubt Freigegebenen das Schreiben, nur allowedUids/
// sourceUrl/slug bleiben gesperrt (siehe firestore.rules).
export async function setzeStatus(artefaktId, status) {
  await updateDoc(doc(db, "artefakte", artefaktId), { status });
}
