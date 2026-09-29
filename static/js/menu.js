const MENU_CACHE_KEY = "financeapp-menu-v7";
const SESSION_CACHE_KEY = "financeapp-session-v2";
const SESSION_CACHE_TTL_MS = 5 * 60 * 1000;

function renderizarMenu(html) {
  const container = document.getElementById("menu-container");
  if (!container || !html) return false;
  container.innerHTML = html;
  marcarPaginaAtual();
  return true;
}

function renderizarFaixaTeste(usuario) {
  document.getElementById("trialBanner")?.remove();
  const teste = usuario?.teste;
  if (!teste || usuario.perfil === "Administrativo" || ["ativo", "legado"].includes(usuario.assinatura_status)) return;

  const faixa = document.createElement("section");
  faixa.id = "trialBanner";
  faixa.className = `trial-banner${teste.expirado ? " trial-banner-expired" : ""}`;
  faixa.setAttribute("role", "status");
  faixa.setAttribute("aria-live", "polite");

  const icone = document.createElement("span");
  icone.className = "trial-banner-icon";
  icone.setAttribute("aria-hidden", "true");
  icone.textContent = teste.expirado ? "⌛" : "🎁";

  const conteudo = document.createElement("div");
  const titulo = document.createElement("strong");
  const detalhe = document.createElement("span");
  if (teste.expirado) {
    titulo.textContent = "Seu período de teste terminou";
    detalhe.textContent = "Entre em contato com o administrador para regularizar seu acesso.";
  } else {
    const dias = Number(teste.dias_restantes || 0);
    titulo.textContent = `Teste gratuito · ${dias} dia${dias === 1 ? "" : "s"} restante${dias === 1 ? "" : "s"}`;
    const data = new Date(`${teste.termina_em}T12:00:00`);
    const dataFormatada = Number.isNaN(data.getTime())
      ? teste.termina_em
      : new Intl.DateTimeFormat("pt-BR").format(data);
    detalhe.textContent = `Seu período termina em ${dataFormatada}.`;
  }

  conteudo.append(titulo, detalhe);
  faixa.append(icone, conteudo);
  document.querySelector("main")?.prepend(faixa);
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
    const res = await fetch("/components/menu.html?v=8", { loading: false, cache: "force-cache" });
    if (!res.ok) throw new Error("Menu indisponível");
    const html = await res.text();
    sessionStorage.setItem(MENU_CACHE_KEY, html);
    if (html !== cache) renderizarMenu(html);
  } catch (erro) {
    if (!cache) console.error("Erro ao carregar menu:", erro);
  }
  const usuario = await obterSessaoCompartilhada();
  renderizarFaixaTeste(usuario);
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
window.addEventListener("load", () => {
  const carregarCena = () => import("/static/js/three-scene.js?v=1").catch(() => {});
  if ("requestIdleCallback" in window) window.requestIdleCallback(carregarCena, { timeout: 1500 });
  else window.setTimeout(carregarCena, 400);
});
window.addEventListener("resize", () => {
  if (window.matchMedia("(min-width: 1100px)").matches) fecharMenu();
});
document.addEventListener("keydown", event => {
  if (event.key === "Escape") fecharMenu();
});
