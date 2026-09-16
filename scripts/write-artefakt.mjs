// Export-Skill: schreibt/aktualisiert ein Artefakt-Dokument in Firestore.
// Läuft serverseitig mit dem Service-Account, umgeht damit bewusst die
// Client-Rules (die gelten nur für die ausgelieferte Web-App selbst).
// Nutzung: GOOGLE_APPLICATION_CREDENTIALS=/pfad/serviceAccount.json node scripts/write-artefakt.mjs <slug> <payload.json>
import { readFileSync } from "node:fs";
import { initializeApp, cert } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

const [slug, payloadPath] = process.argv.slice(2);
if (!slug || !payloadPath) {
  console.error("Nutzung: node scripts/write-artefakt.mjs <slug> <payload.json>");
  process.exit(1);
}

const serviceAccount = JSON.parse(readFileSync(process.env.GOOGLE_APPLICATION_CREDENTIALS, "utf8"));
initializeApp({ credential: cert(serviceAccount) });
const db = getFirestore();

const payload = JSON.parse(readFileSync(payloadPath, "utf8"));
await db.collection("artefakte").doc(slug).set(payload, { merge: true });
console.log(`artefakte/${slug} geschrieben (${JSON.stringify(payload).length} Bytes).`);
