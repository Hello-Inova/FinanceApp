const MENU_CACHE_KEY = "financeapp-menu-v5";
const SESSION_CACHE_KEY = "financeapp-session-v1";
const SESSION_CACHE_TTL_MS = 5 * 60 * 1000;

function renderizarMenu(html) {
  const container = document.getElementById("menu-container");
  if (!container || !html) return false;
  container.innerHTML = html;
  marcarPaginaAtual();
  return true;
}

async function obterSessaoCompartilhada() {
  const cache = sessionStorage.getItem(SESSION_CACHE_KEY);
  if (cache) {
    try {
      const registro = JSON.parse(cache);
      if (Date.now() - registro.salvoEm < SESSION_CACHE_TTL_MS && registro.usuario?.logado) {
        return registro.usuario;
      }
    } catch (_) {
      sessionStorage.removeItem(SESSION_CACHE_KEY);
    }
  }
  if (!window.financeAppSessionPromise) {
    window.financeAppSessionPromise = fetch("/session", { loading: false })
      .then(res => res.json())
      .then(usuario => {
        if (usuario.logado) {
          sessionStorage.setItem(SESSION_CACHE_KEY, JSON.stringify({ usuario, salvoEm: Date.now() }));
        }
        return usuario;
      })
      .catch(() => ({ logado: false }));
  }
  return window.financeAppSessionPromise;
}

async function carregarMenu() {
  const container = document.getElementById("menu-container");
  if (!container) return;
  const cache = sessionStorage.getItem(MENU_CACHE_KEY);
  if (cache) renderizarMenu(cache);
  try {
    const res = await fetch("/components/menu.html?v=5", { loading: false, cache: "force-cache" });
    if (!res.ok) throw new Error("Menu indisponível");
    const html = await res.text();
    sessionStorage.setItem(MENU_CACHE_KEY, html);
    if (html !== cache) renderizarMenu(html);
  } catch (erro) {
    if (!cache) console.error("Erro ao carregar menu:", erro);
  }
  const usuario = await obterSessaoCompartilhada();
  const btnAdmin = document.getElementById("btnAdmin");
  if (btnAdmin) btnAdmin.hidden = !(usuario.logado && usuario.perfil === "Administrativo");
}

function marcarPaginaAtual() {
  const caminho = window.location.pathname;
  document.querySelectorAll(".sidebar [data-url]").forEach(btn => {
    const destino = btn.dataset.url;
    const ativo = destino === caminho || (destino === "/home" && caminho.startsWith("/financas/"));
    btn.classList.toggle("active", ativo);
    if (ativo) btn.setAttribute("aria-current", "page");
    else btn.removeAttribute("aria-current");
  });
}

function toggleMenu() {
  if (window.matchMedia("(min-width: 1100px)").matches) return;
  const aberto = document.querySelector(".sidebar")?.classList.toggle("active") ?? false;
  document.getElementById("menuOverlay")?.classList.toggle("active", aberto);
  document.body.classList.toggle("menu-open", aberto);
  document.getElementById("btnMenu")?.setAttribute("aria-expanded", String(aberto));
}
function fecharMenu() {
  document.querySelector(".sidebar")?.classList.remove("active");
  document.getElementById("menuOverlay")?.classList.remove("active");
  document.body.classList.remove("menu-open");
  document.getElementById("btnMenu")?.setAttribute("aria-expanded", "false");
}
function navegar(url) {
  fecharMenu();
  window.appLoading?.page("Abrindo página...");
  window.location.assign(url);
}

window.obterSessaoCompartilhada = obterSessaoCompartilhada;
window.toggleMenu = toggleMenu;
window.fecharMenu = fecharMenu;
window.navegar = navegar;
window.addEventListener("DOMContentLoaded", carregarMenu);
window.addEventListener("resize", () => {
  if (window.matchMedia("(min-width: 1100px)").matches) fecharMenu();
});
document.addEventListener("keydown", event => {
  if (event.key === "Escape") fecharMenu();
});
