(() => {
  const reduzirMovimento = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const economizarDados = navigator.connection?.saveData;
  if (reduzirMovimento || economizarDados || !window.WebGLRenderingContext) return;

  const iniciar = async () => {
    if (document.querySelector(".three-background")) return;

    let THREE;
    try {
      THREE = await import("https://cdn.jsdelivr.net/npm/three@0.186.0/build/three.module.min.js");
    } catch (erro) {
      console.warn("Animação 3D indisponível:", erro);
      return;
    }

    const modoLogin = !document.getElementById("menu-container");
    const suporteAntialias = window.innerWidth >= 760;
    const palco = document.createElement("div");
    palco.className = `three-background ${modoLogin ? "three-login" : "three-app"}`;
    palco.setAttribute("aria-hidden", "true");
    document.body.prepend(palco);

    const cena = new THREE.Scene();
    cena.fog = new THREE.FogExp2(0x020617, modoLogin ? 0.07 : 0.11);
    const camera = new THREE.PerspectiveCamera(48, 1, 0.1, 60);
    camera.position.set(0, 0, 9);

    const renderer = new THREE.WebGLRenderer({
      alpha: true,
      antialias: suporteAntialias,
      powerPreference: "low-power"
    });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.35));
    renderer.setClearColor(0x000000, 0);
    palco.appendChild(renderer.domElement);

    const grupo = new THREE.Group();
    cena.add(grupo);

    const luzAmbiente = new THREE.AmbientLight(0x93c5fd, 1.1);
    const luzPrincipal = new THREE.DirectionalLight(0x60a5fa, 3.2);
    luzPrincipal.position.set(4, 5, 7);
    const luzDourada = new THREE.PointLight(0xfacc15, 18, 18);
    luzDourada.position.set(-4, -1, 4);
    cena.add(luzAmbiente, luzPrincipal, luzDourada);

    const criarMoeda = (x, y, escala, cor) => {
      const moeda = new THREE.Group();
      const material = new THREE.MeshStandardMaterial({
        color: cor,
        metalness: 0.78,
        roughness: 0.24,
        transparent: true,
        opacity: modoLogin ? 0.72 : 0.32
      });
      const corpo = new THREE.Mesh(new THREE.CylinderGeometry(1, 1, 0.18, 48), material);
      corpo.rotation.x = Math.PI / 2;
      const aro = new THREE.Mesh(
        new THREE.TorusGeometry(0.72, 0.055, 10, 48),
        new THREE.MeshBasicMaterial({ color: cor, transparent: true, opacity: modoLogin ? 0.8 : 0.4 })
      );
      moeda.add(corpo, aro);
      moeda.position.set(x, y, -1.2);
      moeda.scale.setScalar(escala);
      moeda.userData.velocidade = 0.13 + Math.random() * 0.12;
      grupo.add(moeda);
      return moeda;
    };

    const moedas = modoLogin
      ? [criarMoeda(-4.2, 1.8, 1.12, 0xfbbf24), criarMoeda(4.25, -1.8, 0.86, 0x22c55e)]
      : [criarMoeda(4.8, 2.45, 0.9, 0x22c55e)];

    const quantidade = modoLogin ? 190 : 75;
    const posicoes = new Float32Array(quantidade * 3);
    for (let i = 0; i < quantidade; i += 1) {
      posicoes[i * 3] = (Math.random() - 0.5) * 18;
      posicoes[i * 3 + 1] = (Math.random() - 0.5) * 11;
      posicoes[i * 3 + 2] = (Math.random() - 0.5) * 6 - 2;
    }
    const geometriaPontos = new THREE.BufferGeometry();
    geometriaPontos.setAttribute("position", new THREE.BufferAttribute(posicoes, 3));
    const pontos = new THREE.Points(
      geometriaPontos,
      new THREE.PointsMaterial({
        color: modoLogin ? 0x60a5fa : 0x6366f1,
        size: modoLogin ? 0.045 : 0.032,
        transparent: true,
        opacity: modoLogin ? 0.58 : 0.28,
        sizeAttenuation: true
      })
    );
    cena.add(pontos);

    const ponteiro = { x: 0, y: 0 };
    const moverPonteiro = evento => {
      ponteiro.x = (evento.clientX / window.innerWidth - 0.5) * 0.5;
      ponteiro.y = (evento.clientY / window.innerHeight - 0.5) * 0.35;
    };

    const redimensionar = () => {
      const largura = window.innerWidth;
      const altura = window.innerHeight;
      camera.aspect = largura / Math.max(altura, 1);
      camera.updateProjectionMatrix();
      renderer.setSize(largura, altura, false);
    };

    let quadro = 0;
    let ultimoFrame = 0;
    const animar = tempo => {
      quadro = requestAnimationFrame(animar);
      if (tempo - ultimoFrame < 32) return;
      ultimoFrame = tempo;
      const segundos = tempo * 0.001;
      pontos.rotation.y = segundos * 0.018;
      grupo.rotation.y += (ponteiro.x - grupo.rotation.y) * 0.025;
      grupo.rotation.x += (-ponteiro.y - grupo.rotation.x) * 0.025;
      moedas.forEach((moeda, indice) => {
        moeda.rotation.z = segundos * moeda.userData.velocidade * (indice % 2 ? -1 : 1);
        moeda.position.y += Math.sin(segundos * 0.7 + indice) * 0.0015;
      });
      renderer.render(cena, camera);
    };

    document.addEventListener("pointermove", moverPonteiro, { passive: true });
    window.addEventListener("resize", redimensionar, { passive: true });
    document.addEventListener("visibilitychange", () => {
      if (document.hidden) {
        cancelAnimationFrame(quadro);
      } else {
        quadro = requestAnimationFrame(animar);
      }
    });
    redimensionar();
    quadro = requestAnimationFrame(animar);
    document.documentElement.classList.add("three-ready");
  };

  if ("requestIdleCallback" in window) {
    window.requestIdleCallback(iniciar, { timeout: 1200 });
  } else {
    window.setTimeout(iniciar, 350);
  }
})();
