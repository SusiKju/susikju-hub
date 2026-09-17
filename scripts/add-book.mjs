// Fügt ein neues Buch zu artefakte/buecherwand (Firestore) hinzu, statt es in
// buecherbibliothek.md von Hand einzutragen — Firestore ist die einzige Quelle
// für Neuanlagen, die Markdown-Datei wird per sync-buecherwand-to-wissensdatenbank.mjs
// nur noch gepatcht (siehe Hinweis dort).
// Nutzung: GOOGLE_APPLICATION_CREDENTIALS=/pfad/serviceAccount.json node scripts/add-book.mjs <buch.json>
//   buch.json: {id, title, author, shelf, year, era, summary, status, favorite, cover}
//   cover (Pfad wie "covers/<hash>.jpg") muss vorher manuell nach artefakte/buecherwand/covers/ gelegt werden.
import { readFileSync } from "node:fs";
import { initializeApp, cert } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

const DRY_RUN = process.argv.includes("--dry-run");
const [bookPath] = process.argv.slice(2).filter((a) => a !== "--dry-run");
if (!bookPath) {
  console.error("Nutzung: node scripts/add-book.mjs <buch.json> [--dry-run]");
  process.exit(1);
}

const book = JSON.parse(readFileSync(bookPath, "utf8"));
const required = ["id", "title", "author", "shelf"];
const missing = required.filter((f) => !book[f]);
if (missing.length) {
  console.error(`Pflichtfelder fehlen: ${missing.join(", ")}`);
  process.exit(1);
}

const sa = JSON.parse(readFileSync(process.env.GOOGLE_APPLICATION_CREDENTIALS, "utf8"));
initializeApp({ credential: cert(sa) });
const ref = getFirestore().collection("artefakte").doc("buecherwand");

const snap = await ref.get();
const books = snap.data().books;

if (books.some((b) => b.id === book.id)) {
  console.error(`Buch mit id "${book.id}" existiert bereits, add-book.mjs überschreibt nicht.`);
  process.exit(1);
}

books.push({ status: "unread", favorite: false, ...book });

if (DRY_RUN) {
  console.log(`--dry-run: würde "${book.title}" hinzufügen (dann ${books.length} Bücher). Nichts geschrieben.`);
  process.exit(0);
}

await ref.update({ books });
console.log(`"${book.title}" hinzugefügt (jetzt ${books.length} Bücher). Danach: sync-buecherwand-to-wissensdatenbank.mjs ausführen.`);
