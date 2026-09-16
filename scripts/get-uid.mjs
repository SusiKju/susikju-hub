// Einmalig nötig, um die Firebase-UID zu einer Google-Mail-Adresse
// nachzuschlagen (für allowedUids in einem Artefakt-Dokument).
// Nutzung: GOOGLE_APPLICATION_CREDENTIALS=/pfad/serviceAccount.json node scripts/get-uid.mjs susikju@gmail.com
import { readFileSync } from "node:fs";
import { initializeApp, cert } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";

const email = process.argv[2];
if (!email) {
  console.error("Nutzung: node scripts/get-uid.mjs <email>");
  process.exit(1);
}

const serviceAccount = JSON.parse(readFileSync(process.env.GOOGLE_APPLICATION_CREDENTIALS, "utf8"));
initializeApp({ credential: cert(serviceAccount) });

const user = await getAuth().getUserByEmail(email);
console.log(user.uid);
