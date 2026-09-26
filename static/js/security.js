(() => {
  const token = document.querySelector('meta[name="csrf-token"]')?.content || "";
  const originalFetch = window.fetch.bind(window);

  window.fetch = (input, init = {}) => {
    const url = new URL(typeof input === "string" ? input : input.url, window.location.origin);
    const method = (init.method || (typeof input !== "string" && input.method) || "GET").toUpperCase();
    const sameOrigin = url.origin === window.location.origin;
    if (sameOrigin && !["GET", "HEAD", "OPTIONS"].includes(method)) {
      const headers = new Headers(init.headers || (typeof input !== "string" ? input.headers : undefined));
      headers.set("X-CSRFToken", token);
      init = { ...init, headers, credentials: "same-origin" };
    }
    return originalFetch(input, init);
  };

  window.logout = async () => {
    await window.fetch("/logout", { method: "POST" });
    window.location.href = "/";
  };
})();
