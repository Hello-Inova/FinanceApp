(() => {
  const token = document.querySelector('meta[name="csrf-token"]')?.content || "";
  const originalFetch = window.fetch.bind(window);

  const LOADING_STYLE_ID = "financeapp-loading-style";
  const LOADING_OVERLAY_ID = "financeapp-loading";
  const SHOW_DELAY_MS = 120;
  const MIN_VISIBLE_MS = 280;
  let pendingRequests = 0;
  let showTimer = null;
  let visibleSince = 0;

  function installLoadingStyle() {
    if (document.getElementById(LOADING_STYLE_ID)) return;
    const style = document.createElement("style");
    style.id = LOADING_STYLE_ID;
    style.textContent = `
      #${LOADING_OVERLAY_ID} {
        position: fixed;
        inset: 0;
        z-index: 2147483647;
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 24px;
        background: rgba(2, 6, 23, .72);
        backdrop-filter: blur(5px);
        opacity: 0;
        visibility: hidden;
        transition: opacity .18s ease, visibility .18s ease;
        cursor: progress;
      }
      #${LOADING_OVERLAY_ID}.is-visible {
        opacity: 1;
        visibility: visible;
      }
      #${LOADING_OVERLAY_ID} .financeapp-loading-card {
        min-width: min(300px, 90vw);
        display: flex;
        align-items: center;
        gap: 16px;
        padding: 20px 22px;
        border: 1px solid rgba(148, 163, 184, .24);
        border-radius: 16px;
        background: rgba(15, 23, 42, .96);
        color: #f8fafc;
        box-shadow: 0 24px 70px rgba(0, 0, 0, .45);
      }
      #${LOADING_OVERLAY_ID} .financeapp-loading-spinner {
        width: 34px;
        height: 34px;
        flex: 0 0 34px;
        border: 4px solid rgba(148, 163, 184, .25);
        border-top-color: #3b82f6;
        border-right-color: #6366f1;
        border-radius: 50%;
        animation: financeapp-spin .7s linear infinite;
      }
      #${LOADING_OVERLAY_ID} .financeapp-loading-title {
        display: block;
        margin-bottom: 3px;
        font-size: 16px;
        font-weight: 700;
      }
      #${LOADING_OVERLAY_ID} .financeapp-loading-hint {
        display: block;
        color: #94a3b8;
        font-size: 13px;
      }
      @keyframes financeapp-spin { to { transform: rotate(360deg); } }
      @media (prefers-reduced-motion: reduce) {
        #${LOADING_OVERLAY_ID} .financeapp-loading-spinner {
          animation-duration: 1.4s;
        }
      }
    `;
    document.head.appendChild(style);
  }

  function ensureLoadingOverlay() {
    installLoadingStyle();
    let overlay = document.getElementById(LOADING_OVERLAY_ID);
    if (overlay) return overlay;
    overlay = document.createElement("div");
    overlay.id = LOADING_OVERLAY_ID;
    overlay.setAttribute("role", "status");
    overlay.setAttribute("aria-live", "polite");
    overlay.setAttribute("aria-label", "Operação em andamento");
    overlay.innerHTML = `
      <div class="financeapp-loading-card">
        <span class="financeapp-loading-spinner" aria-hidden="true"></span>
        <span>
          <span class="financeapp-loading-title">Processando...</span>
          <span class="financeapp-loading-hint">Aguarde um instante.</span>
        </span>
      </div>
    `;
    (document.body || document.documentElement).appendChild(overlay);
    return overlay;
  }

  function setLoadingMessage(message = "Processando...") {
    const title = ensureLoadingOverlay().querySelector(".financeapp-loading-title");
    if (title) title.textContent = message;
  }

  function showLoading(message) {
    pendingRequests += 1;
    if (message) setLoadingMessage(message);
    if (showTimer || document.getElementById(LOADING_OVERLAY_ID)?.classList.contains("is-visible")) {
      return;
    }
    showTimer = window.setTimeout(() => {
      showTimer = null;
      if (pendingRequests === 0) return;
      const overlay = ensureLoadingOverlay();
      overlay.classList.add("is-visible");
      overlay.setAttribute("aria-busy", "true");
      document.documentElement.setAttribute("aria-busy", "true");
      visibleSince = Date.now();
    }, SHOW_DELAY_MS);
  }

  function hideLoading() {
    pendingRequests = Math.max(0, pendingRequests - 1);
    if (pendingRequests > 0) return;
    if (showTimer) {
      window.clearTimeout(showTimer);
      showTimer = null;
    }
    const overlay = document.getElementById(LOADING_OVERLAY_ID);
    if (!overlay?.classList.contains("is-visible")) return;
    const remaining = Math.max(0, MIN_VISIBLE_MS - (Date.now() - visibleSince));
    window.setTimeout(() => {
      if (pendingRequests > 0) return;
      overlay.classList.remove("is-visible");
      overlay.removeAttribute("aria-busy");
      document.documentElement.removeAttribute("aria-busy");
      setLoadingMessage("Processando...");
    }, remaining);
  }

  function isBackgroundRequest(url, method) {
    return (
      url.pathname === "/session" ||
      url.pathname.startsWith("/components/") ||
      (method === "GET" && /^\/api\/public\/cadastro\/[^/]+$/.test(url.pathname))
    );
  }

  function getRequestUrl(input) {
    if (typeof input === "string") return input;
    if (input instanceof URL) return input.href;
    return input.url;
  }

  window.fetch = async (input, init = {}) => {
    const url = new URL(getRequestUrl(input), window.location.origin);
    const method = (init.method || (input instanceof Request && input.method) || "GET").toUpperCase();
    const sameOrigin = url.origin === window.location.origin;
    const loadingEnabled = init.loading !== false && !isBackgroundRequest(url, method);
    const loadingMessage = init.loadingMessage || (method === "GET" ? "Carregando..." : "Processando...");
    const requestInit = { ...init };
    delete requestInit.loading;
    delete requestInit.loadingMessage;
    if (sameOrigin && !["GET", "HEAD", "OPTIONS"].includes(method)) {
      const headers = new Headers(requestInit.headers || (input instanceof Request ? input.headers : undefined));
      headers.set("X-CSRFToken", token);
      requestInit.headers = headers;
      requestInit.credentials = "same-origin";
    }
    if (loadingEnabled) showLoading(loadingMessage);
    try {
      return await originalFetch(input, requestInit);
    } finally {
      if (loadingEnabled) hideLoading();
    }
  };

  window.appLoading = {
    show: showLoading,
    hide: hideLoading,
    setMessage: setLoadingMessage,
    page: (message = "Abrindo página...") => showLoading(message)
  };

  // A navegação tradicional não passa por fetch. Mostra feedback enquanto o
  // próximo documento é baixado, inclusive nos cards que usam links comuns.
  document.addEventListener("click", event => {
    const link = event.target.closest("a[href]");
    if (!link || event.defaultPrevented || event.button !== 0) return;
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    if (link.target === "_blank" || link.hasAttribute("download")) return;
    const destino = new URL(link.href, window.location.href);
    if (destino.origin !== window.location.origin || destino.pathname === window.location.pathname && destino.hash) return;
    showLoading("Abrindo página...");
  });

  window.logout = async () => {
    await window.fetch("/logout", { method: "POST" });
    sessionStorage.removeItem("financeapp-session-v1");
    sessionStorage.removeItem("financeapp-session-v2");
    window.location.href = "/";
  };
})();
