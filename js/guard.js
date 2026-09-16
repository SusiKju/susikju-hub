// Von jeder Seite unter artefakte/<slug>/index.html eingebunden, BEVOR sie
// eigene Daten aus Firestore lädt oder rendert. Ohne gültigen Login + Freigabe
// wird sofort zur Login-Seite umgeleitet – auch wer die URL direkt kennt,
// kommt so nicht an die Seite (die Bytes selbst sind auf GitHub Pages zwar
// öffentlich abrufbar, aber ohne Login+Freigabe liefert Firestore keine Daten
// und die Seite leitet weiter, siehe Drill-Entscheidung "kein Public-Modus").
//
// Pfad zu ../../js/auth.js ist relativ zur Tiefe artefakte/<slug>/ – bei
// tieferen Unterordnern in einem Artefakt entsprechend anpassen.
import { onAuth, pruefeZugriff } from "../../js/auth.js";

export function schuetzeSeite(artefaktId) {
  return new Promise((resolve) => {
    onAuth(async (user) => {
      if (!user) {
        window.location.href = "../../index.html";
        return;
      }
      const erlaubt = await pruefeZugriff(artefaktId, user.uid);
      if (!erlaubt) {
        window.location.href = "../../index.html";
        return;
      }
      resolve(user);
    });
  });
}
