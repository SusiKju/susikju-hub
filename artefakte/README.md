# artefakte/

Jedes übernommene Claude-Artefakt bekommt hier einen eigenen Ordner:

```
artefakte/<slug>/index.html
artefakte/<slug>/... (Assets, weitere JS/CSS-Dateien des Artefakts)
```

Regeln für jeden Ordner:

- `index.html` importiert als Erstes `../../js/guard.js` und ruft
  `schuetzeSeite('<slug>')` auf, bevor irgendetwas gerendert wird (siehe
  `js/guard.js` für den genauen Mechanismus). Ohne das lädt die Seite zwar
  als Datei, zeigt aber keine echten Daten.
- Enthält das Original-Artefakt eingebettete Daten (Kontostände, Termine
  etc.), werden die beim Import entfernt und stattdessen zur Laufzeit aus
  dem zugehörigen Firestore-Dokument `artefakte/<slug>` geladen. Rein
  visuelle Artefakte ohne solche Daten können unverändert (1:1) übernommen
  werden.
- Jeder Ordner braucht ein passendes Firestore-Dokument
  `artefakte/<slug>` mit mindestens: `slug`, `title`, `description`,
  `allowedUids` (Liste von Google-UIDs), `sourceUrl` (Original-Claude-
  Artefakt-URL), `updatedAt`.

Das Anlegen von Ordner + Firestore-Dokument übernimmt der Export-Skill
(noch zu bauen) – siehe `.drills/2026-09-16/artefakt-app.md` in
`tasks-extended` für die volle Design-Historie. Erster Testlauf: Bücherwand.
