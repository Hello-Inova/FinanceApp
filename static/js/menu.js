async function carregarMenu() {
  const container = document.getElementById("menu-container");

  if (!container) return;

  const res = await fetch("/components/menu.html");
  const html = await res.text();

  container.innerHTML = html;

  await verificarPerfilUsuario();

  marcarPaginaAtual();
}

async function verificarPerfilUsuario() {
  try {
    const res = await fetch("/session");
    const usuario = await res.json();

    const btnAdmin = document.getElementById("btnAdmin");

    if (!btnAdmin) return;

    btnAdmin.style.display =
      usuario.logado && usuario.perfil === "Administrativo"
        ? "block"
        : "none";

  } catch (error) {
    console.error("Erro ao verificar perfil:", error);
  }
}

function marcarPaginaAtual() {
  const caminho = window.location.pathname;

  document
    .querySelectorAll(".sidebar button")
    .forEach(btn => {
      const destino = btn.getAttribute("data-url");

      if (destino === caminho) {
        btn.classList.add("active");
      }
    });
}

function toggleMenu() {
  const sidebar = document.querySelector(".sidebar");
  const overlay = document.getElementById("menuOverlay");

  sidebar?.classList.toggle("active");
  overlay?.classList.toggle("active");
}

function fecharMenu() {
  document.querySelector(".sidebar")?.classList.remove("active");
  document.getElementById("menuOverlay")?.classList.remove("active");
}

function navegar(url) {
  fecharMenu();
  window.location.href = url;
}

window.toggleMenu = toggleMenu;
window.fecharMenu = fecharMenu;
window.navegar = navegar;

window.addEventListener("DOMContentLoaded", carregarMenu);