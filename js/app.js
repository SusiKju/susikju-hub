import {
  login,
  logout,
  onAuth,
  ladeFreigegebeneArtefakte,
  setzeStatus,
} from "./auth.js";

const $status = document.getElementById("status");
const $loginBtn = document.getElementById("login-btn");
const $logoutBtn = document.getElementById("logout-btn");
const $dashboard = document.getElementById("dashboard");

$loginBtn.addEventListener("click", () => {
  login().catch((err) => {
    $status.textContent = "Anmeldung fehlgeschlagen: " + err.message;
  });
});

$logoutBtn.addEventListener("click", () => logout());

onAuth(async (user) => {
  if (!user) {
    $loginBtn.hidden = false;
    $logoutBtn.hidden = true;
    $dashboard.innerHTML = "";
    $status.textContent = "Bitte anmelden.";
    return;
  }

  $loginBtn.hidden = true;
  $logoutBtn.hidden = false;
  $status.textContent = `Angemeldet als ${user.email}`;

  try {
    const artefakte = await ladeFreigegebeneArtefakte(user.uid);
    renderDashboard(artefakte);
  } catch (err) {
    $status.textContent = "Fehler beim Laden der Artefakte: " + err.message;
  }
});

function renderDashboard(artefakte) {
  if (artefakte.length === 0) {
    $dashboard.innerHTML = '<p class="empty-note">Noch keine Artefakte für dich freigegeben.</p>';
    return;
  }

  // Bereits verwendete Status-Werte einsammeln, damit die Auswahl beim
  // Bearbeiten bestehende Begriffe vorschlägt statt Tippfehler-Varianten
  // wie "Aktiv"/"aktiv" zu erzeugen.
  const bekannteStatuswerte = [...new Set(artefakte.map((a) => a.status).filter(Boolean))].sort();

  const sortiert = [...artefakte].sort((a, b) =>
    (b.updatedAt ?? "").localeCompare(a.updatedAt ?? ""),
  );

  $dashboard.innerHTML = "";
  for (const a of sortiert) {
    $dashboard.appendChild(buildCard(a, bekannteStatuswerte));
  }
}

function buildCard(a, bekannteStatuswerte) {
  const slug = a.slug ?? a.id;
  const card = document.createElement("div");
  card.className = "card";

  const thumbLink = document.createElement("a");
  thumbLink.href = `artefakte/${slug}/`;
  if (a.previewImage) {
    thumbLink.className = "card-thumb";
    const img = document.createElement("img");
    img.src = `artefakte/${a.previewImage}`;
    img.alt = a.title ?? slug;
    img.loading = "lazy";
    thumbLink.appendChild(img);
  } else {
    thumbLink.className = "card-thumb no-image";
    thumbLink.textContent = a.title ?? slug;
  }
  card.appendChild(thumbLink);

  const body = document.createElement("div");
  body.className = "card-body";

  const title = document.createElement("div");
  title.className = "card-title";
  title.textContent = a.title ?? slug;
  body.appendChild(title);

  if (a.description) {
    const desc = document.createElement("div");
    desc.className = "card-desc";
    desc.textContent = a.description;
    body.appendChild(desc);
  }

  body.appendChild(buildStatusControl(a.id, a.status, bekannteStatuswerte));
  card.appendChild(body);
  return card;
}

function buildStatusControl(artefaktId, currentStatus, bekannteStatuswerte) {
  const wrap = document.createElement("div");

  function renderBadge() {
    wrap.innerHTML = "";
    const badge = document.createElement("button");
    badge.type = "button";
    badge.className = "status-badge";
    badge.textContent = currentStatus || "Status setzen";
    badge.addEventListener("click", renderEdit);
    wrap.appendChild(badge);
  }

  function renderEdit() {
    wrap.innerHTML = "";
    wrap.classList.add("status-edit");

    const select = document.createElement("select");
    const emptyOpt = document.createElement("option");
    emptyOpt.value = "";
    emptyOpt.textContent = "– neuer Status –";
    select.appendChild(emptyOpt);
    for (const wert of bekannteStatuswerte) {
      const opt = document.createElement("option");
      opt.value = wert;
      opt.textContent = wert;
      if (wert === currentStatus) opt.selected = true;
      select.appendChild(opt);
    }

    const input = document.createElement("input");
    input.type = "text";
    input.placeholder = "eigener Status…";
    input.value = bekannteStatuswerte.includes(currentStatus) ? "" : (currentStatus || "");

    select.addEventListener("change", () => {
      if (select.value) input.value = "";
    });

    const save = document.createElement("button");
    save.type = "button";
    save.textContent = "Speichern";
    save.addEventListener("click", async () => {
      const neuerStatus = (input.value.trim() || select.value).trim();
      save.disabled = true;
      try {
        await setzeStatus(artefaktId, neuerStatus);
        currentStatus = neuerStatus;
        if (neuerStatus && !bekannteStatuswerte.includes(neuerStatus)) {
          bekannteStatuswerte.push(neuerStatus);
          bekannteStatuswerte.sort();
        }
        wrap.classList.remove("status-edit");
        renderBadge();
      } catch (err) {
        save.disabled = false;
        alert("Status konnte nicht gespeichert werden: " + err.message);
      }
    });

    const cancel = document.createElement("button");
    cancel.type = "button";
    cancel.className = "cancel";
    cancel.textContent = "Abbrechen";
    cancel.addEventListener("click", () => {
      wrap.classList.remove("status-edit");
      renderBadge();
    });

    wrap.append(select, input, save, cancel);
  }

  renderBadge();
  return wrap;
}
