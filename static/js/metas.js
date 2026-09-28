const API_METAS = "/api/metas";

const CATEGORIAS = {
  Viagem: { icone: "✈️", cor: "#38bdf8" },
  Reserva: { icone: "🛟", cor: "#22c55e" },
  Casa: { icone: "🏠", cor: "#f59e0b" },
  Educação: { icone: "🎓", cor: "#a78bfa" },
  Veículo: { icone: "🚗", cor: "#fb7185" },
  Tecnologia: { icone: "💻", cor: "#60a5fa" },
  Saúde: { icone: "💚", cor: "#34d399" },
  Lazer: { icone: "🎉", cor: "#f472b6" },
  Outros: { icone: "✨", cor: "#818cf8" }
};

let metas = [];
let metaEmEdicao = null;
let metaEmMovimentacao = null;
let tipoMovimentacao = "Aporte";
let ultimoFoco = null;
let toastTimer = null;

function moeda(valor) {
  return Number(valor || 0).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL"
  });
}

function numero(valor) {
  return Number.parseFloat(valor || 0) || 0;
}

function dataLocal(data) {
  if (!data) return "Sem prazo";
  return new Intl.DateTimeFormat("pt-BR").format(new Date(`${data}T00:00:00`));
}

function diasAte(data) {
  if (!data) return null;
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);
  const limite = new Date(`${data}T00:00:00`);
  return Math.ceil((limite - hoje) / 86400000);
}

function prazoMeta(meta) {
  if (!meta.data_limite) return { texto: "Sem prazo", atrasada: false };
  const dias = diasAte(meta.data_limite);
  if (meta.status === "Concluída") return { texto: `Concluída • ${dataLocal(meta.data_limite)}`, atrasada: false };
  if (dias < 0) return { texto: `${Math.abs(dias)} dia${Math.abs(dias) === 1 ? "" : "s"} em atraso`, atrasada: true };
  if (dias === 0) return { texto: "Prazo termina hoje", atrasada: false };
  if (dias <= 30) return { texto: `${dias} dia${dias === 1 ? "" : "s"} restante${dias === 1 ? "" : "s"}`, atrasada: false };
  return { texto: `Até ${dataLocal(meta.data_limite)}`, atrasada: false };
}

async function respostaJson(resposta) {
  const dados = await resposta.json().catch(() => ({}));
  if (!resposta.ok) throw new Error(dados.mensagem || "Não foi possível concluir a operação.");
  return dados;
}

async function carregarMetas() {
  try {
    const resposta = await fetch(API_METAS);
    metas = await respostaJson(resposta);
    atualizarCategorias();
    renderizar();
  } catch (erro) {
    mostrarToast(erro.message, true);
  }
}

function atualizarCategorias() {
  const filtro = document.getElementById("filtroCategoria");
  const valorAtual = filtro.value;
  const categorias = [...new Set(metas.map(meta => meta.categoria))].sort((a, b) => a.localeCompare(b, "pt-BR"));
  filtro.innerHTML = '<option value="">Todas as categorias</option>';
  categorias.forEach(categoria => {
    const opcao = document.createElement("option");
    opcao.value = categoria;
    opcao.textContent = categoria;
    filtro.appendChild(opcao);
  });
  filtro.value = categorias.includes(valorAtual) ? valorAtual : "";
}

function metasFiltradas() {
  const termo = document.getElementById("buscaMeta").value.trim().toLocaleLowerCase("pt-BR");
  const status = document.getElementById("filtroStatus").value;
  const categoria = document.getElementById("filtroCategoria").value;
  const ordenacao = document.getElementById("ordenacaoMetas").value;
  const prioridade = { Alta: 0, Média: 1, Baixa: 2 };

  const lista = metas.filter(meta => {
    const correspondeTexto = !termo || [meta.titulo, meta.descricao, meta.categoria]
      .some(valor => String(valor || "").toLocaleLowerCase("pt-BR").includes(termo));
    return correspondeTexto && (!status || meta.status === status) && (!categoria || meta.categoria === categoria);
  });

  lista.sort((a, b) => {
    if (ordenacao === "prazo") return (a.data_limite || "9999-12-31").localeCompare(b.data_limite || "9999-12-31");
    if (ordenacao === "progresso") return progresso(b) - progresso(a);
    if (ordenacao === "recente") return Number(b.id) - Number(a.id);
    return (prioridade[a.prioridade] ?? 3) - (prioridade[b.prioridade] ?? 3) || Number(b.id) - Number(a.id);
  });
  return lista;
}

function progresso(meta) {
  const alvo = numero(meta.valor_alvo);
  return alvo > 0 ? (numero(meta.valor_atual) / alvo) * 100 : 0;
}

function atualizarResumo() {
  const totalAlvo = metas.reduce((soma, meta) => soma + numero(meta.valor_alvo), 0);
  const acumulado = metas.reduce((soma, meta) => soma + Math.min(numero(meta.valor_atual), numero(meta.valor_alvo)), 0);
  const percentual = totalAlvo ? Math.min(100, (acumulado / totalAlvo) * 100) : 0;
  document.getElementById("resumoPlanejado").textContent = moeda(totalAlvo);
  document.getElementById("resumoAcumulado").textContent = moeda(acumulado);
  document.getElementById("resumoProgresso").textContent = `${Math.round(percentual)}%`;
  document.getElementById("resumoConcluidas").textContent = metas.filter(meta => meta.status === "Concluída").length;
}

function criarTag(texto, classe = "") {
  const tag = document.createElement("span");
  tag.className = `tag ${classe}`.trim();
  tag.textContent = texto;
  return tag;
}

function criarBotaoMenu(texto, acao, classe = "") {
  const botao = document.createElement("button");
  botao.type = "button";
  botao.className = classe;
  botao.textContent = texto;
  botao.addEventListener("click", acao);
  return botao;
}

function criarCard(meta) {
  const categoria = CATEGORIAS[meta.categoria] || CATEGORIAS.Outros;
  const percentualReal = progresso(meta);
  const percentualVisual = Math.min(100, Math.max(0, percentualReal));
  const falta = Math.max(0, numero(meta.valor_alvo) - numero(meta.valor_atual));
  const prazo = prazoMeta(meta);
  const card = document.createElement("article");
  card.className = "goal-card";
  card.style.setProperty("--goal-accent", categoria.cor);

  const main = document.createElement("div");
  main.className = "goal-main";
  const topo = document.createElement("div");
  topo.className = "goal-top";
  const identidade = document.createElement("div");
  identidade.className = "goal-identity";
  const icone = document.createElement("span");
  icone.className = "goal-icon";
  icone.setAttribute("aria-hidden", "true");
  icone.textContent = categoria.icone;
  const tituloArea = document.createElement("div");
  const titulo = document.createElement("h3");
  titulo.className = "goal-title";
  titulo.textContent = meta.titulo;
  const categoriaTexto = document.createElement("span");
  categoriaTexto.className = "goal-category";
  categoriaTexto.textContent = meta.categoria;
  tituloArea.append(titulo, categoriaTexto);
  identidade.append(icone, tituloArea);

  const menu = document.createElement("div");
  menu.className = "goal-menu";
  const menuBotao = document.createElement("button");
  menuBotao.type = "button";
  menuBotao.className = "goal-menu-button";
  menuBotao.setAttribute("aria-label", `Mais ações para ${meta.titulo}`);
  menuBotao.setAttribute("aria-expanded", "false");
  menuBotao.textContent = "⋮";
  const popover = document.createElement("div");
  popover.className = "goal-menu-popover";
  popover.hidden = true;
  popover.append(
    criarBotaoMenu("✏️ Editar", () => abrirModalMeta(meta.id)),
    criarBotaoMenu(meta.status === "Pausada" ? "▶ Retomar" : "⏸ Pausar", () => alternarPausa(meta.id)),
    criarBotaoMenu("🗑 Excluir", () => excluirMeta(meta.id), "delete-action")
  );
  menuBotao.addEventListener("click", evento => {
    evento.stopPropagation();
    const abrir = popover.hidden;
    fecharMenus();
    popover.hidden = !abrir;
    menuBotao.setAttribute("aria-expanded", String(!popover.hidden));
  });
  menu.append(menuBotao, popover);
  topo.append(identidade, menu);

  const descricao = document.createElement("p");
  descricao.className = "goal-description";
  descricao.textContent = meta.descricao || "Uma meta importante para o seu planejamento.";

  const valores = document.createElement("div");
  valores.className = "goal-values";
  const atual = document.createElement("strong");
  atual.textContent = moeda(meta.valor_atual);
  const alvo = document.createElement("span");
  alvo.textContent = `de ${moeda(meta.valor_alvo)}`;
  valores.append(atual, alvo);

  const trilha = document.createElement("div");
  trilha.className = "progress-track";
  trilha.setAttribute("role", "progressbar");
  trilha.setAttribute("aria-label", `Progresso de ${meta.titulo}`);
  trilha.setAttribute("aria-valuemin", "0");
  trilha.setAttribute("aria-valuemax", "100");
  trilha.setAttribute("aria-valuenow", String(Math.round(percentualVisual)));
  const preenchimento = document.createElement("div");
  preenchimento.className = "progress-fill";
  preenchimento.style.transform = `scaleX(${percentualVisual / 100})`;
  trilha.appendChild(preenchimento);

  const progressoInfo = document.createElement("div");
  progressoInfo.className = "goal-progress-meta";
  const percentual = document.createElement("span");
  percentual.textContent = `${Math.round(percentualReal)}% alcançado`;
  const restante = document.createElement("span");
  restante.textContent = falta > 0 ? `Faltam ${moeda(falta)}` : "Objetivo alcançado";
  progressoInfo.append(percentual, restante);

  const tags = document.createElement("div");
  tags.className = "goal-tags";
  tags.appendChild(criarTag(`◷ ${prazo.texto}`, prazo.atrasada ? "tag-overdue" : ""));
  if (meta.status === "Concluída") tags.appendChild(criarTag("✓ Concluída", "tag-complete"));
  else if (meta.status === "Pausada") tags.appendChild(criarTag("⏸ Pausada", "tag-paused"));
  else tags.appendChild(criarTag(`Prioridade ${meta.prioridade}`, meta.prioridade === "Alta" ? "tag-high" : ""));

  main.append(topo, descricao, valores, trilha, progressoInfo, tags);

  const acoes = document.createElement("div");
  acoes.className = "goal-actions";
  const atualizar = document.createElement("button");
  atualizar.type = "button";
  atualizar.className = "btn btn-primary";
  atualizar.textContent = meta.status === "Concluída" ? "Ver histórico" : "＋ Atualizar progresso";
  atualizar.addEventListener("click", () => abrirModalMovimentacao(meta.id));
  const editar = document.createElement("button");
  editar.type = "button";
  editar.className = "btn btn-ghost icon-button";
  editar.setAttribute("aria-label", `Editar ${meta.titulo}`);
  editar.textContent = "✏️";
  editar.addEventListener("click", () => abrirModalMeta(meta.id));
  acoes.append(atualizar, editar);
  card.append(main, acoes);
  return card;
}

function fecharMenus() {
  document.querySelectorAll(".goal-menu-popover").forEach(popover => {
    popover.hidden = true;
    popover.previousElementSibling?.setAttribute("aria-expanded", "false");
  });
}

function renderizar() {
  atualizarResumo();
  const lista = metasFiltradas();
  const grid = document.getElementById("gridMetas");
  const vazio = document.getElementById("estadoVazio");
  grid.innerHTML = "";
  lista.forEach(meta => {
    const card = criarCard(meta);
    card.dataset.metaId = meta.id;
    grid.appendChild(card);
  });

  document.getElementById("contadorMetas").textContent = `${lista.length} ${lista.length === 1 ? "meta" : "metas"}`;
  const possuiFiltros = Boolean(document.getElementById("buscaMeta").value || document.getElementById("filtroStatus").value || document.getElementById("filtroCategoria").value);
  vazio.hidden = lista.length > 0;
  grid.hidden = lista.length === 0;
  document.getElementById("tituloVazio").textContent = possuiFiltros ? "Nenhuma meta encontrada" : "Sua próxima conquista começa aqui";
  document.getElementById("textoVazio").textContent = possuiFiltros ? "Ajuste os filtros para encontrar outros objetivos." : "Crie uma meta, defina o valor e acompanhe cada avanço.";
  document.getElementById("acaoVazio").hidden = possuiFiltros;
}

function abrirModal(elemento) {
  ultimoFoco = document.activeElement;
  elemento.hidden = false;
  document.body.style.overflow = "hidden";
  window.setTimeout(() => elemento.querySelector("input:not([disabled]), select:not([disabled]), textarea:not([disabled])")?.focus(), 0);
}

function fecharModal(elemento) {
  elemento.hidden = true;
  if (!document.querySelector(".modal:not([hidden])")) document.body.style.overflow = "";
  ultimoFoco?.focus?.();
}

function limparErro(elemento) {
  elemento.hidden = true;
  elemento.textContent = "";
}

function exibirErro(elemento, mensagem) {
  elemento.textContent = mensagem;
  elemento.hidden = false;
}

function abrirModalMeta(id = null) {
  metaEmEdicao = id ? metas.find(meta => Number(meta.id) === Number(id)) : null;
  document.getElementById("formMeta").reset();
  document.getElementById("metaPrioridade").value = "Média";
  document.getElementById("metaStatus").value = "Ativa";
  document.getElementById("tituloModalMeta").textContent = metaEmEdicao ? "Editar meta" : "Nova meta";
  document.getElementById("campoValorInicial").hidden = Boolean(metaEmEdicao);
  document.getElementById("metaValorAtual").disabled = Boolean(metaEmEdicao);
  limparErro(document.getElementById("erroMeta"));

  if (metaEmEdicao) {
    document.getElementById("metaTitulo").value = metaEmEdicao.titulo;
    document.getElementById("metaCategoria").value = metaEmEdicao.categoria;
    document.getElementById("metaPrioridade").value = metaEmEdicao.prioridade;
    document.getElementById("metaValorAlvo").value = numero(metaEmEdicao.valor_alvo).toFixed(2);
    document.getElementById("metaDataLimite").value = metaEmEdicao.data_limite || "";
    document.getElementById("metaStatus").value = metaEmEdicao.status;
    document.getElementById("metaDescricao").value = metaEmEdicao.descricao || "";
  }
  abrirModal(document.getElementById("modalMeta"));
}

function fecharModalMeta() {
  fecharModal(document.getElementById("modalMeta"));
  metaEmEdicao = null;
}

async function salvarMeta(evento) {
  evento.preventDefault();
  const erro = document.getElementById("erroMeta");
  limparErro(erro);
  const titulo = document.getElementById("metaTitulo").value.trim();
  const alvo = numero(document.getElementById("metaValorAlvo").value);
  if (titulo.length < 2) return exibirErro(erro, "Informe um nome para a meta.");
  if (alvo <= 0) return exibirErro(erro, "O valor da meta deve ser maior que zero.");

  const corpo = {
    titulo,
    categoria: document.getElementById("metaCategoria").value,
    prioridade: document.getElementById("metaPrioridade").value,
    valor_alvo: alvo,
    data_limite: document.getElementById("metaDataLimite").value || null,
    status: document.getElementById("metaStatus").value,
    descricao: document.getElementById("metaDescricao").value.trim()
  };
  if (!metaEmEdicao) corpo.valor_atual = numero(document.getElementById("metaValorAtual").value);

  try {
    const resposta = await fetch(metaEmEdicao ? `${API_METAS}/${metaEmEdicao.id}` : API_METAS, {
      method: metaEmEdicao ? "PUT" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(corpo),
      loadingMessage: metaEmEdicao ? "Atualizando meta..." : "Criando meta..."
    });
    await respostaJson(resposta);
    const mensagem = metaEmEdicao ? "Meta atualizada com sucesso." : "Meta criada. Vamos conquistar esse objetivo!";
    fecharModalMeta();
    await carregarMetas();
    mostrarToast(mensagem);
  } catch (erroApi) {
    exibirErro(erro, erroApi.message);
  }
}

async function abrirModalMovimentacao(id) {
  metaEmMovimentacao = metas.find(meta => Number(meta.id) === Number(id));
  if (!metaEmMovimentacao) return;
  document.getElementById("formMovimentacao").reset();
  document.getElementById("tituloModalMovimentacao").textContent = metaEmMovimentacao.titulo;
  document.getElementById("subtituloMovimentacao").textContent = `${moeda(metaEmMovimentacao.valor_atual)} de ${moeda(metaEmMovimentacao.valor_alvo)}`;
  selecionarTipoMovimentacao("Aporte");
  limparErro(document.getElementById("erroMovimentacao"));
  abrirModal(document.getElementById("modalMovimentacao"));
  await carregarHistorico(id);
}

function fecharModalMovimentacao() {
  fecharModal(document.getElementById("modalMovimentacao"));
  metaEmMovimentacao = null;
}

function selecionarTipoMovimentacao(tipo) {
  tipoMovimentacao = tipo;
  document.querySelectorAll(".type-option").forEach(botao => {
    botao.classList.toggle("active", botao.dataset.tipo === tipo);
    botao.setAttribute("aria-pressed", String(botao.dataset.tipo === tipo));
  });
}

async function carregarHistorico(id) {
  const lista = document.getElementById("listaMovimentacoes");
  lista.innerHTML = '<div class="history-empty">Carregando histórico...</div>';
  try {
    const resposta = await fetch(`${API_METAS}/${id}/movimentacoes`, { loading: false });
    const movimentos = await respostaJson(resposta);
    document.getElementById("totalMovimentacoes").textContent = `${movimentos.length} registro${movimentos.length === 1 ? "" : "s"}`;
    lista.innerHTML = "";
    if (!movimentos.length) {
      lista.innerHTML = '<div class="history-empty">Nenhuma movimentação registrada.</div>';
      return;
    }
    movimentos.forEach(movimento => {
      const item = document.createElement("div");
      item.className = "history-item";
      const informacao = document.createElement("div");
      const descricao = document.createElement("strong");
      descricao.textContent = movimento.descricao || movimento.tipo;
      const data = document.createElement("time");
      const instante = new Date(String(movimento.criado_em).replace(" ", "T"));
      data.textContent = new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short" }).format(instante);
      informacao.append(descricao, data);
      const valor = document.createElement("span");
      valor.className = `history-value ${movimento.tipo.toLocaleLowerCase("pt-BR")}`;
      valor.textContent = `${movimento.tipo === "Aporte" ? "+" : "−"} ${moeda(movimento.valor)}`;
      item.append(informacao, valor);
      lista.appendChild(item);
    });
  } catch (erro) {
    lista.innerHTML = "";
    const falha = document.createElement("div");
    falha.className = "history-empty";
    falha.textContent = erro.message;
    lista.appendChild(falha);
  }
}

async function salvarMovimentacao(evento) {
  evento.preventDefault();
  const erro = document.getElementById("erroMovimentacao");
  limparErro(erro);
  const valor = numero(document.getElementById("movimentacaoValor").value);
  if (valor <= 0) return exibirErro(erro, "Informe um valor maior que zero.");
  if (tipoMovimentacao === "Retirada" && valor > numero(metaEmMovimentacao.valor_atual)) {
    return exibirErro(erro, "A retirada não pode ser maior que o valor acumulado.");
  }
  try {
    const resposta = await fetch(`${API_METAS}/${metaEmMovimentacao.id}/movimentacoes`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        tipo: tipoMovimentacao,
        valor,
        descricao: document.getElementById("movimentacaoDescricao").value.trim()
      }),
      loadingMessage: tipoMovimentacao === "Aporte" ? "Registrando aporte..." : "Registrando retirada..."
    });
    await respostaJson(resposta);
    fecharModalMovimentacao();
    await carregarMetas();
    mostrarToast(tipoMovimentacao === "Aporte" ? "Progresso atualizado com sucesso!" : "Retirada registrada com sucesso.");
  } catch (erroApi) {
    exibirErro(erro, erroApi.message);
  }
}

async function alternarPausa(id) {
  const meta = metas.find(item => Number(item.id) === Number(id));
  if (!meta || meta.status === "Concluída") {
    mostrarToast("Metas concluídas não precisam ser pausadas.", true);
    return;
  }
  const status = meta.status === "Pausada" ? "Ativa" : "Pausada";
  try {
    await respostaJson(await fetch(`${API_METAS}/${id}/status`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status })
    }));
    await carregarMetas();
    mostrarToast(status === "Pausada" ? "Meta pausada." : "Meta retomada.");
  } catch (erro) {
    mostrarToast(erro.message, true);
  }
}

async function excluirMeta(id) {
  const meta = metas.find(item => Number(item.id) === Number(id));
  if (!meta || !window.confirm(`Excluir a meta “${meta.titulo}” e todo o histórico dela?`)) return;
  try {
    await respostaJson(await fetch(`${API_METAS}/${id}`, { method: "DELETE", loadingMessage: "Excluindo meta..." }));
    await carregarMetas();
    mostrarToast("Meta excluída.");
  } catch (erro) {
    mostrarToast(erro.message, true);
  }
}

function mostrarToast(mensagem, erro = false) {
  const toast = document.getElementById("toast");
  window.clearTimeout(toastTimer);
  toast.textContent = `${erro ? "⚠" : "✓"} ${mensagem}`;
  toast.classList.toggle("error", erro);
  toast.classList.add("show");
  toastTimer = window.setTimeout(() => toast.classList.remove("show"), 3600);
}

function configurarEventos() {
  ["buscaMeta", "filtroStatus", "filtroCategoria", "ordenacaoMetas"].forEach(id => {
    const elemento = document.getElementById(id);
    elemento.addEventListener(id === "buscaMeta" ? "input" : "change", renderizar);
  });
  document.getElementById("formMeta").addEventListener("submit", salvarMeta);
  document.getElementById("formMovimentacao").addEventListener("submit", salvarMovimentacao);
  document.querySelectorAll(".type-option").forEach(botao => botao.addEventListener("click", () => selecionarTipoMovimentacao(botao.dataset.tipo)));
  document.querySelectorAll(".modal").forEach(modal => modal.addEventListener("mousedown", evento => {
    if (evento.target !== modal) return;
    if (modal.id === "modalMeta") fecharModalMeta();
    if (modal.id === "modalMovimentacao") fecharModalMovimentacao();
  }));
  document.addEventListener("click", evento => {
    if (!evento.target.closest(".goal-menu")) fecharMenus();
  });
  document.addEventListener("keydown", evento => {
    const modalAberto = document.querySelector(".modal:not([hidden])");
    if (evento.key === "Tab" && modalAberto) {
      const focaveis = [...modalAberto.querySelectorAll(
        'button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
      )].filter(elemento => elemento.offsetParent !== null);
      if (focaveis.length) {
        const primeiro = focaveis[0];
        const ultimo = focaveis[focaveis.length - 1];
        if (evento.shiftKey && document.activeElement === primeiro) {
          evento.preventDefault();
          ultimo.focus();
        } else if (!evento.shiftKey && document.activeElement === ultimo) {
          evento.preventDefault();
          primeiro.focus();
        }
      }
      return;
    }
    if (evento.key !== "Escape") return;
    fecharMenus();
    if (!document.getElementById("modalMovimentacao").hidden) fecharModalMovimentacao();
    else if (!document.getElementById("modalMeta").hidden) fecharModalMeta();
  });
}

window.abrirModalMeta = abrirModalMeta;
window.fecharModalMeta = fecharModalMeta;
window.fecharModalMovimentacao = fecharModalMovimentacao;
window.alternarPausa = alternarPausa;
window.excluirMeta = excluirMeta;

document.addEventListener("DOMContentLoaded", async () => {
  configurarEventos();
  await carregarMetas();
});
