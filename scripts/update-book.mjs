// Ändert Felder eines vorhandenen Buchs in artefakte/buecherwand (Firestore), z.B. wenn ein
// "Nicht gekauft"-Buch gekauft wurde und ein Cover bekommt. Gegenstück zu add-book.mjs.
// Nutzung: GOOGLE_APPLICATION_CREDENTIALS=/pfad/serviceAccount.json node scripts/update-book.mjs <titel> <felder.json> [--dry-run]
//   felder.json: nur die zu ändernden Felder, z.B. {"status":"unread","kaufdatum":"24.11.2026","cover":"covers/<hash>.jpg"}
import { readFileSync } from "node:fs";
import { initializeApp, cert } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

const DRY_RUN = process.argv.includes("--dry-run");
const [title, fieldsPath] = process.argv.slice(2).filter((a) => a !== "--dry-run");
if (!title || !fieldsPath) {
  console.error("Nutzung: node scripts/update-book.mjs <titel> <felder.json> [--dry-run]");
  process.exit(1);
}
const fields = JSON.parse(readFileSync(fieldsPath, "utf8"));

const sa = JSON.parse(readFileSync(process.env.GOOGLE_APPLICATION_CREDENTIALS, "utf8"));
initializeApp({ credential: cert(sa) });
const ref = getFirestore().collection("artefakte").doc("buecherwand");
const books = (await ref.get()).data().books;

const hits = books.filter((b) => b.title.toLowerCase() === title.toLowerCase());
if (hits.length !== 1) {
  console.error(`Erwartet genau 1 Buch mit Titel "${title}", gefunden: ${hits.length}.`);
  process.exit(1);
}
const before = { ...hits[0] };
Object.assign(hits[0], fields);
console.log("vorher:", JSON.stringify(before));
console.log("nachher:", JSON.stringify(hits[0]));

if (DRY_RUN) {
  console.log("--dry-run: nichts geschrieben.");
  process.exit(0);
}
await ref.update({ books });
console.log("Gespeichert. Danach: sync-buecherwand-to-wissensdatenbank.mjs ausführen.");
