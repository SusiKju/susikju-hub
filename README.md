# susikju-hub

Eigene, von Claude-Abo unabhängige Web-App für Claude-Artefakte (Dashboards/
Visualisierungen), 1:1 übernommen und dauerhaft gehostet. Löst Claude-
Artefakte als aktive Plattform ab; `artefakte.md` in der privaten
Wissensdatenbank bleibt die verbindliche Übersicht und wird mit dieser App
synchron gehalten.

- **Live:** https://susikju.github.io/susikju-hub/
- **Repo:** https://github.com/SusiKju/susikju-hub

## Prinzip

Reines statisches HTML/CSS/JS, kein Build-Schritt, kein npm für die Seite
selbst (Firebase kommt per ESM direkt von der gstatic-CDN). Jedes Artefakt
liegt unverändert unter `artefakte/<slug>/`, siehe `artefakte/README.md` für
die Konventionen.

Zugriff: kein öffentlicher Modus. Login per Google-Konto (Firebase Auth),
Freigabe pro Artefakt über eine freie Personenliste (`allowedUids`) im
zugehörigen Firestore-Dokument. Gleiches Firebase-Projekt wie
[tasks-extended](https://github.com/SusiKju/tasks-extended) — Firestore-Rules
für die Collection `artefakte` sind dort in `firestore.rules` mit-gepflegt
und werden von dort aus deployt (**hier keine eigene Kopie der Rules
anlegen** — zwei separat deployte `firestore.rules` würden sich gegenseitig
überschreiben, da beide Repos dasselbe Firebase-Projekt ansprechen).

## Deployment

Push nach `main` löst automatisch `.github/workflows/deploy.yml` aus:
Repo-Inhalt wird unverändert (kein Build) auf GitHub Pages veröffentlicht.

## scripts/ (Export & Sync, noch zu bauen)

- **Export**: ein Claude-Artefakt neu übernehmen (Ordner unter `artefakte/`
  anlegen/aktualisieren + zugehöriges Firestore-Dokument schreiben).
- **Sync**: Markdown-Dateien der Wissensdatenbank ↔ Firestore-Daten dieser
  Artefakte abgleichen.

Beide brauchen den Firebase-Service-Account aus `.env`
(`FIREBASE_SERVICE_ACCOUNT`, siehe `.env.example`) — nicht committen.

## Design-Historie

Vollständige Herleitung aller Entscheidungen (Zugriffsmodell, Tech-Stack,
Sync-Mechanik, Rollout-Reihenfolge) in
`tasks-extended/.drills/2026-09-16/artefakt-app.md`.
