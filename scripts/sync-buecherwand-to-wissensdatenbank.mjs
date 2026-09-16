/**
 * sync-buecherwand-to-wissensdatenbank.mjs
 *
 * Gegenrichtung zu write-artefakt.mjs: liest den aktuellen `books`-Stand aus
 * artefakte/buecherwand (Firestore) und patcht die Status-/★-Spalte der passenden
 * Tabellenzeilen in buecherbibliothek.md. Im Unterschied zu
 * tasks-extended/scripts/sync-bambini-to-wissensdatenbank.mjs wird die Datei NICHT
 * komplett neu generiert — sie enthält handkuratierte Reihen-Einleitungen und
 * recherchierte Zusammenfassungen, die nicht überschrieben werden dürfen. Nur die
 * beiden Spalten Status und ★ je erkannter Zeile werden angefasst.
 *
 * Läuft bewusst nicht über GitHub Actions — das Zielverzeichnis ist ein lokal
 * gemountetes Google-Drive-Verzeichnis, kein Repo. Manuell oder per lokalem
 * Cron/launchd ausführen:
 *
 *   GOOGLE_APPLICATION_CREDENTIALS=<pfad-zur-serviceAccount.json> \
 *     node scripts/sync-buecherwand-to-wissensdatenbank.mjs [--dry-run]
 *
 * ponytail: nur für Bücherwand/buecherbibliothek.md geschrieben, keine generische
 * Artefakt→Markdown-Abstraktion. Ein zukünftiges Artefakt mit anderer Markdown-
 * Struktur (z. B. Vermögensübersicht → finanzen-anlagen.md) braucht ein eigenes,
 * ähnlich gebautes Skript statt dieses hier zu verallgemeinern.
 */

import { readFileSync, writeFileSync } from "node:fs";
import { initializeApp, cert } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

const MD_PATH = "/Users/matthiasredmann/Meine Ablage/Wissensdatenbank/buecherbibliothek.md";
const ARTEFAKT_ID = "buecherwand";
const DRY_RUN = process.argv.includes("--dry-run");

const STATUS_FS_TO_MD = {
  read: "Gelesen",
  reading: "Wird gelesen",
  unread: "Ungelesen",
  tobuy: "Nicht gekauft",
};
const STATUS_MD_TO_FS = Object.fromEntries(
  Object.entries(STATUS_FS_TO_MD).map(([fs, md]) => [md, fs]),
);

// Titel-Matching robust gegen Bindestriche/Anführungszeichen/Apostroph-Varianten
// zwischen Firestore und Markdown, wie bei der manuellen ersten Sync-Runde erprobt.
function normTitle(s) {
  return s.toLowerCase().replace(/[^\p{L}\p{N}]/gu, "");
}

const sa = JSON.parse(readFileSync(process.env.GOOGLE_APPLICATION_CREDENTIALS, "utf8"));
initializeApp({ credential: cert(sa) });
const snap = await getFirestore().collection("artefakte").doc(ARTEFAKT_ID).get();
const books = snap.data().books;
const booksByNorm = new Map(books.map((b) => [normTitle(b.title), b]));

const original = readFileSync(MD_PATH, "utf8");
const lines = original.split("\n");
const matchedNormTitles = new Set();
const changes = [];

for (let i = 0; i < lines.length; i++) {
  const line = lines[i].trimEnd();
  if (!line.startsWith("|")) continue;
  const cells = line.slice(1, -1).split("|").map((c) => c.trim());
  if (cells.length < 4) continue;
  // Kopf-/Trennzeilen ("| Titel | ... |", "|---|---|") strukturell ausschließen, NICHT
  // per Substring-Suche nach "Titel"/"---" — die kommen auch in normaler Fließtext-
  // Zusammenfassung vor (z. B. "Der Titel spielt zugleich..." bei "Marlow") und haben
  // dort fälschlich ganze Buchzeilen aus dem Abgleich rausgefiltert.
  const titleMatch = cells[0].match(/^\*\*(.+?)\*\*/);
  if (!titleMatch) continue;
  const key = normTitle(titleMatch[1]);
  const book = booksByNorm.get(key);
  if (!book) continue;
  matchedNormTitles.add(key);

  // Status/★ sind laut Tabellenkonvention immer die vorletzten beiden Spalten vor
  // Kaufdatum/Inhaltliche-Zusammenfassung, unabhängig davon, wie viele Spalten davor
  // stehen (Handlungszeit, Autor:in, ...). Bricht, falls sich diese Konvention ändert.
  const statusIdx = cells.length - 4;
  const favIdx = cells.length - 3;
  const mdStatusFs = STATUS_MD_TO_FS[cells[statusIdx]] ?? cells[statusIdx];
  const mdFav = cells[favIdx] === "★";

  if (mdStatusFs !== book.status || mdFav !== !!book.favorite) {
    const before = { status: cells[statusIdx], favorite: mdFav };
    cells[statusIdx] = STATUS_FS_TO_MD[book.status] ?? book.status;
    cells[favIdx] = book.favorite ? "★" : "";
    // Leere Zellen bekommen genau ein Leerzeichen statt " | " + "" + " | " (würde zwei
    // Leerzeichen ergeben) — sonst weicht die Formatierung vom Rest der Datei ab.
    lines[i] = "|" + cells.map((c) => (c === "" ? " " : ` ${c} `)).join("|") + "|";
    changes.push({
      title: titleMatch[1],
      before: `${before.status}/${before.favorite ? "★" : "–"}`,
      after: `${cells[statusIdx]}/${cells[favIdx] || "–"}`,
    });
  }
}

const unmatched = books.filter((b) => !matchedNormTitles.has(normTitle(b.title)));

console.log(`${changes.length} Zeile(n) geändert:`);
for (const c of changes) console.log(`- ${c.title}: ${c.before} → ${c.after}`);

if (unmatched.length) {
  console.log(`\n${unmatched.length} Buch/Bücher aus Firestore ohne passende Zeile in buecherbibliothek.md (nicht automatisch angelegt, manuell prüfen):`);
  for (const b of unmatched) console.log(`- ${b.title}`);
}

if (changes.length === 0) {
  console.log("\nKeine Änderungen nötig.");
  process.exit(0);
}

if (DRY_RUN) {
  console.log("\n--dry-run: nichts geschrieben.");
  process.exit(0);
}

const today = new Date().toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit", year: "numeric" });
let updated = lines.join("\n");
const standMatch = updated.match(/^_Stand:.*_$/m);
if (standMatch) {
  const marker = /Status\/★ zuletzt mit susikju-hub \(Firestore\) synchronisiert am \d{2}\.\d{2}\.\d{4}\./;
  const replacement = `Status/★ zuletzt mit susikju-hub (Firestore) synchronisiert am ${today}.`;
  const newStandLine = marker.test(standMatch[0])
    ? standMatch[0].replace(marker, replacement)
    : standMatch[0].replace(/_$/, ` ${replacement}_`);
  updated = updated.replace(standMatch[0], newStandLine);
}

writeFileSync(MD_PATH, updated, "utf8");
console.log(`\n${changes.length} Zeile(n) geschrieben nach ${MD_PATH}`);
