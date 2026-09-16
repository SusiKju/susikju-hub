// Von jeder Seite unter artefakte/<slug>/index.html eingebunden, BEVOR sie
// eigene Daten aus Firestore lädt oder rendert. Ohne gültigen Login + Freigabe
// wird sofort zur Login-Seite umgeleitet – auch wer die URL direkt kennt,
// kommt so nicht an die Seite (die Bytes selbst sind auf GitHub Pages zwar
// öffentlich abrufbar, aber ohne Login+Freigabe liefert Firestore keine Daten
// und die Seite leitet weiter, siehe Drill-Entscheidung "kein Public-Modus").
//
// ACHTUNG: der import-Pfad hier löst relativ zu guard.js SELBST auf (liegt
// neben auth.js in js/), NICHT relativ zur einbindenden Seite – anders als
// die window.location-Redirects unten, die relativ zur aufrufenden Seite
// (artefakte/<slug>/) aufgelöst werden. Beides in einer Datei, leicht zu
// verwechseln (hier ursprünglich falsch als "../../js/auth.js" geschrieben,
// was den auth.js-Import von susikju.github.io/js/auth.js statt
// susikju-hub/js/auth.js versuchte und mit 503 fehlschlug).
import { onAuth, pruefeZugriff } from "./auth.js";

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
