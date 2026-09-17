/**
 * sync-wachstumskurven-to-wissensdatenbank.mjs
 *
 * Gegenrichtung zu write-artefakt.mjs: liest heightData/weightData aus
 * artefakte/wachstumskurven (Firestore) und trägt neue Messpunkte in die
 * passende Rohdaten-Tabelle in familie/wachstumsstatistik.md ein (eine
 * Tabelle pro Kind unter "## Rohdaten (vollständig, chronologisch)").
 * Patcht/ergänzt nur Zeilen, generiert die Datei nicht neu.
 *
 * WICHTIG — nur Punkte mit explizitem Datum werden synchronisiert:
 * Die historischen Messpunkte (Import aus dem Original-Artefakt) haben nur
 * `{a: Alter-in-Jahren, v: Wert}`, kein Datum — aus einer auf 1 Nachkomma-
 * stelle gerundeten Jahreszahl lässt sich das Tage-genaue Datum NICHT
 * zuverlässig zurückrechnen (mehrere echte Messtage runden auf denselben
 * Wert, das hat ein erster Versuch mit ~94 falschen Zeilenänderungen
 * gezeigt). Deshalb: nur Punkte im Format `{d: "YYYY-MM-DD", a, v}` werden
 * abgeglichen — dieses Format legt das neue Eingabeformular auf der
 * Wachstumskurven-Seite an. Alte `{a,v}`-Punkte ohne `d` werden ignoriert,
 * sie sind über den ursprünglichen Export bereits korrekt in der Markdown-
 * Datei enthalten.
 *
 * Aufruf: GOOGLE_APPLICATION_CREDENTIALS=<pfad> \
 *   node scripts/sync-wachstumskurven-to-wissensdatenbank.mjs [--dry-run]
 */

import { readFileSync, writeFileSync } from "node:fs";
import { initializeApp, cert } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

const MD_PATH = "/Users/matthiasredmann/Meine Ablage/Wissensdatenbank/familie/wachstumsstatistik.md";
const ARTEFAKT_ID = "wachstumskurven";
const DRY_RUN = process.argv.includes("--dry-run");

// Aus den Alter=0-Zeilen der Rohdaten-Tabellen entnommen.
const GEBURTSDATUM = {
  Lenny: Date.UTC(2013, 8, 21),
  Emil: Date.UTC(2016, 9, 18),
  Hannes: Date.UTC(2019, 1, 21),
  Liddy: Date.UTC(2022, 1, 25),
};
const KIDS = ["Lenny", "Emil", "Hannes", "Liddy"];
const TAG_MS = 24 * 3600 * 1000;

function fmtNum(n) {
  return String(n).replace(".", ",");
}
function parseNum(s) {
  const t = s.trim();
  if (t === "–" || t === "") return null;
  return parseFloat(t.replace(",", "."));
}
function daysSinceBirth(kid, isoDate) {
  const [y, m, d] = isoDate.split("-").map(Number);
  return Math.round((Date.UTC(y, m - 1, d) - GEBURTSDATUM[kid]) / TAG_MS);
}
function fmtDateDE(isoDate) {
  const [y, m, d] = isoDate.split("-");
  return `${d}.${m}.${y}`;
}

const sa = JSON.parse(readFileSync(process.env.GOOGLE_APPLICATION_CREDENTIALS, "utf8"));
initializeApp({ credential: cert(sa) });
const snap = await getFirestore().collection("artefakte").doc(ARTEFAKT_ID).get();
const { heightData, weightData } = snap.data();

const original = readFileSync(MD_PATH, "utf8");
const lines = original.split("\n");

function findKidTable(kid) {
  const headerIdx = lines.findIndex((l) => l.trim() === `### ${kid}`);
  if (headerIdx === -1) return null;
  let tableStart = -1;
  for (let i = headerIdx + 1; i < lines.length; i++) {
    if (lines[i].startsWith("| Alter (Tage)")) { tableStart = i + 2; break; } // Header + Trennzeile überspringen
    if (lines[i].startsWith("### ") || lines[i].startsWith("## ")) break;
  }
  if (tableStart === -1) return null;
  let tableEnd = tableStart;
  while (tableEnd < lines.length && lines[tableEnd].startsWith("|")) tableEnd++;
  return { start: tableStart, end: tableEnd }; // [start, end)
}

const changes = [];

for (const kid of KIDS) {
  const table = findKidTable(kid);
  if (!table) {
    console.log(`WARNUNG: keine Rohdaten-Tabelle für ${kid} gefunden, übersprungen.`);
    continue;
  }

  function syncMetric(dataset, metricKey, colIdx, label) {
    for (const point of dataset[kid] ?? []) {
      if (!point.d) continue; // historischer Punkt ohne Datum, nicht synchronisieren
      const days = daysSinceBirth(kid, point.d);

      let rowLineIdx = -1;
      for (let i = table.start; i < table.end; i++) {
        const cells = lines[i].slice(1, -1).split("|").map((c) => c.trim());
        if (parseInt(cells[0], 10) === days) { rowLineIdx = i; break; }
      }

      if (rowLineIdx !== -1) {
        const cells = lines[rowLineIdx].slice(1, -1).split("|").map((c) => c.trim());
        const current = parseNum(cells[colIdx]);
        if (current !== point.v) {
          cells[colIdx] = fmtNum(point.v);
          lines[rowLineIdx] = "| " + cells.join(" | ") + " |";
          changes.push(`${kid} ${label} ${fmtDateDE(point.d)}: ${current ?? "–"} → ${point.v} (Zeile ${rowLineIdx + 1})`);
        }
      } else {
        const groesse = metricKey === "groesse" ? fmtNum(point.v) : "–";
        const gewicht = metricKey === "gewicht" ? fmtNum(point.v) : "–";
        const newLine = `| ${days} | ${fmtDateDE(point.d)} | ${groesse} | ${gewicht} |`;
        let insertAt = table.start;
        for (let i = table.start; i < table.end; i++) {
          const cells = lines[i].slice(1, -1).split("|").map((c) => c.trim());
          if (parseInt(cells[0], 10) < days) insertAt = i + 1;
        }
        lines.splice(insertAt, 0, newLine);
        table.end += 1;
        changes.push(`${kid} ${label} ${fmtDateDE(point.d)}: NEU eingefügt (Tag ${days}, ${point.v})`);
      }
    }
  }

  syncMetric(heightData, "groesse", 2, "Größe");
  syncMetric(weightData, "gewicht", 3, "Gewicht");
}

console.log(`${changes.length} Änderung(en):`);
for (const c of changes) console.log(`- ${c}`);

if (changes.length === 0) {
  console.log("\nKeine Änderungen nötig.");
  process.exit(0);
}

if (DRY_RUN) {
  console.log("\n--dry-run: nichts geschrieben.");
  process.exit(0);
}

writeFileSync(MD_PATH, lines.join("\n"), "utf8");
console.log(`\n${changes.length} Änderung(en) geschrieben nach ${MD_PATH}`);
console.log('Hinweis: "Aktuellster Messwert je Kind"-Tabelle oben in der Datei ggf. von Hand nachziehen.');
