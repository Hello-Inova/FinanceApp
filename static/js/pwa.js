(() => {
  if ("serviceWorker" in navigator) {
    window.addEventListener("load", () => navigator.serviceWorker.register("/service-worker.js").catch(() => {}));
  }

  if (window.matchMedia("(display-mode: standalone)").matches || window.navigator.standalone) return;
  let installPrompt = null;
  let installButton = null;

  function hideInstallButton() {
    installButton?.remove();
    installButton = null;
  }

  function showInstallButton() {
    if (installButton) return;
    installButton = document.createElement("button");
    installButton.type = "button";
    installButton.className = "pwa-install-button";
    installButton.innerHTML = '<span aria-hidden="true">⇩</span> Instalar aplicativo';
    installButton.addEventListener("click", async () => {
      if (!installPrompt) return;
      installButton.disabled = true;
      await installPrompt.prompt();
      await installPrompt.userChoice;
      installPrompt = null;
      hideInstallButton();
    });
    document.body.appendChild(installButton);
  }

  window.addEventListener("beforeinstallprompt", event => {
    event.preventDefault();
    installPrompt = event;
    showInstallButton();
  });
  window.addEventListener("appinstalled", hideInstallButton);
})();
