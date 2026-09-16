import { login, logout, onAuth, ladeFreigegebeneArtefakte } from "./auth.js";

const $status = document.getElementById("status");
const $loginBtn = document.getElementById("login-btn");
const $logoutBtn = document.getElementById("logout-btn");
const $menu = document.getElementById("menu");

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
    $menu.innerHTML = "";
    $status.textContent = "Bitte anmelden.";
    return;
  }

  $loginBtn.hidden = true;
  $logoutBtn.hidden = false;
  $status.textContent = `Angemeldet als ${user.email}`;

  try {
    const artefakte = await ladeFreigegebeneArtefakte(user.uid);
    renderMenu(artefakte);
  } catch (err) {
    $status.textContent = "Fehler beim Laden der Artefakte: " + err.message;
  }
});

function renderMenu(artefakte) {
  if (artefakte.length === 0) {
    $menu.innerHTML = "<p>Noch keine Artefakte für dich freigegeben.</p>";
    return;
  }

  const sortiert = [...artefakte].sort((a, b) =>
    (b.updatedAt ?? "").localeCompare(a.updatedAt ?? ""),
  );

  const list = document.createElement("ul");
  for (const a of sortiert) {
    const li = document.createElement("li");
    const link = document.createElement("a");
    link.href = `artefakte/${a.slug ?? a.id}/`;
    link.textContent = a.title ?? a.slug ?? a.id;
    li.appendChild(link);
    if (a.description) {
      const desc = document.createElement("span");
      desc.className = "desc";
      desc.textContent = " — " + a.description;
      li.appendChild(desc);
    }
    list.appendChild(li);
  }
  $menu.innerHTML = "";
  $menu.appendChild(list);
}
