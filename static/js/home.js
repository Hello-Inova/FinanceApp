const API_URL = window.location.origin;
const itensPorPagina = 5;

let entradas = 0;
let saidas = 0;
let editId = null;
let dadosGlobais = [];
let paginaAtual = 1;
let filtroAtual = "Todos";
let filtroMesAtual = "";
let colunaOrdenacao = null;
let ordemOrdenacao = "asc";
let filtroPesquisa = "";
let ultimoFoco = null;
let toastTimer = null;

async function verificarLogin() {
  const res = await fetch("/session");
  const dados = await res.json();
  if (!dados.logado) window.location.href = "/";
}

function formatarMoeda(valor) {
  return Number(valor || 0).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL"
  });
}

function dataLocal(valor) {
  return new Intl.DateTimeFormat("pt-BR").format(new Date(`${valor}T00:00:00`));
}

async function respostaJson(resposta) {
  const dados = await resposta.json().catch(() => ({}));
  if (!resposta.ok) throw new Error(dados.mensagem || "Não foi possível concluir a operação.");
  return dados;
}

function mostrarToast(mensagem, erro = false) {
  const toast = document.getElementById("toast");
  window.clearTimeout(toastTimer);
  toast.textContent = `${erro ? "⚠" : "✓"} ${mensagem}`;
  toast.classList.toggle("error", erro);
  toast.classList.add("show");
  toastTimer = window.setTimeout(() => toast.classList.remove("show"), 3600);
}

function abrirModal(modal, foco) {
  ultimoFoco = document.activeElement;
  modal.style.display = "flex";
  document.body.style.overflow = "hidden";
  window.setTimeout(() => foco?.focus(), 0);
}

function fecharModal(modal) {
  modal.style.display = "none";
  if (![...document.querySelectorAll(".modal")].some(item => item.style.display === "flex")) {
    document.body.style.overflow = "";
  }
  ultimoFoco?.focus?.();
}

function obterDadosFiltrados() {
  let dadosFiltrados = [...dadosGlobais];
  if (filtroPesquisa) {
    dadosFiltrados = dadosFiltrados.filter(item => {
      const dataFormatada = dataLocal(item.data).toLocaleLowerCase("pt-BR");
      return [dataFormatada, item.tipo, item.descricao, formatarMoeda(item.valor), item.valor, item.obs]
        .some(valor => String(valor || "").toLocaleLowerCase("pt-BR").includes(filtroPesquisa));
    });
  }
  if (filtroMesAtual) {
    dadosFiltrados = dadosFiltrados.filter(item => String(item.data || "").slice(0, 7) === filtroMesAtual);
  }
  if (filtroAtual === "Entrada") dadosFiltrados = dadosFiltrados.filter(item => item.tipo === "Entrada");
  if (filtroAtual === "Saída") dadosFiltrados = dadosFiltrados.filter(item => item.tipo === "Saída");
  return aplicarOrdenacao(dadosFiltrados);
}

function carregarFiltroMes() {
  const select = document.getElementById("filtroMes");
  const selecionado = filtroMesAtual || select.value;
  select.innerHTML = '<option value="">Todos os meses</option>';
  const meses = [...new Set(dadosGlobais.map(item => String(item.data || "").slice(0, 7)).filter(Boolean))].sort().reverse();
  const nomes = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];
  meses.forEach(chave => {
    const [ano, mes] = chave.split("-");
    const option = document.createElement("option");
    option.value = chave;
    option.textContent = `${nomes[Number(mes) - 1]}/${ano}`;
    select.appendChild(option);
  });
  select.value = meses.includes(selecionado) ? selecionado : "";
}

function filtrarPorMes() {
  filtroMesAtual = document.getElementById("filtroMes").value;
  paginaAtual = 1;
  renderizarTabela();
}

function pesquisar() {
  filtroPesquisa = document.getElementById("iptPesquisa").value.trim().toLocaleLowerCase("pt-BR");
  paginaAtual = 1;
  renderizarTabela();
}

function limparFiltros() {
  filtroAtual = "Todos";
  filtroMesAtual = "";
  filtroPesquisa = "";
  paginaAtual = 1;
  document.getElementById("iptPesquisa").value = "";
  document.getElementById("filtroMes").value = "";
  atualizarCardsAtivos();
  renderizarTabela();
}

async function carregar() {
  try {
    dadosGlobais = await respostaJson(await fetch(`${API_URL}/lancamentos`));
    paginaAtual = 1;
    carregarFiltroMes();
    renderizarTabela();
  } catch (erro) {
    mostrarToast(erro.message, true);
  }
}

function limparErrosNovo() {
  ["novoData", "novoTipo", "novoDescricao", "novoValor"].forEach(id => document.getElementById(id)?.classList.remove("campo-erro"));
  document.getElementById("erroCamposNull").style.display = "none";
}

function abrirModalNovoRegistro() {
  limparCamposNovoRegistro();
  document.getElementById("novoData").value = new Date().toISOString().slice(0, 10);
  abrirModal(document.getElementById("modalNovoRegistro"), document.getElementById("novoData"));
}

function limparCamposNovoRegistro(preservarDataETipo = false) {
  const data = document.getElementById("novoData").value;
  const tipo = document.getElementById("novoTipo").value;
  document.getElementById("novoData").value = preservarDataETipo ? data : "";
  document.getElementById("novoTipo").value = preservarDataETipo ? tipo : "Entrada";
  document.getElementById("novoDescricao").value = "";
  document.getElementById("novoValor").value = "";
  document.getElementById("novoObs").value = "";
  limparErrosNovo();
  document.getElementById("msgNovoRegistro").style.display = "none";
}

function fecharModalNovoRegistro() {
  limparCamposNovoRegistro();
  fecharModal(document.getElementById("modalNovoRegistro"));
}

function validarNovoRegistro() {
  const campos = ["novoData", "novoTipo", "novoDescricao", "novoValor"].map(id => document.getElementById(id));
  limparErrosNovo();
  const invalidos = campos.filter(campo => !campo.value.trim() || (campo.id === "novoValor" && Number(campo.value) <= 0));
  invalidos.forEach(campo => campo.classList.add("campo-erro"));
  if (invalidos.length) {
    document.getElementById("erroCamposNull").style.display = "block";
    invalidos[0].focus();
    return null;
  }
  return {
    data: document.getElementById("novoData").value,
    tipo: document.getElementById("novoTipo").value,
    descricao: document.getElementById("novoDescricao").value.trim(),
    valor: Number(document.getElementById("novoValor").value),
    obs: document.getElementById("novoObs").value.trim()
  };
}

async function enviarNovoRegistro(preservarModal) {
  const dados = validarNovoRegistro();
  if (!dados) return;
  try {
    await respostaJson(await fetch(`${API_URL}/lancamentos`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(dados),
      loadingMessage: "Salvando lançamento..."
    }));
    if (preservarModal) {
      limparCamposNovoRegistro(true);
      document.getElementById("msgNovoRegistro").style.display = "block";
      document.getElementById("novoDescricao").focus();
    } else {
      fecharModalNovoRegistro();
    }
    await carregar();
    mostrarToast("Lançamento salvo com sucesso.");
  } catch (erro) {
    document.getElementById("erroCamposNull").textContent = erro.message;
    document.getElementById("erroCamposNull").style.display = "block";
  }
}

function salvarNovoRegistro() { return enviarNovoRegistro(false); }
function registrarOutro() { return enviarNovoRegistro(true); }

async function deletar(id) {
  const item = dadosGlobais.find(dado => Number(dado.id) === Number(id));
  if (!item || !window.confirm(`Excluir o lançamento “${item.descricao}”?`)) return;
  try {
    await respostaJson(await fetch(`${API_URL}/lancamentos/${id}`, { method: "DELETE", loadingMessage: "Excluindo lançamento..." }));
    await carregar();
    mostrarToast("Lançamento excluído.");
  } catch (erro) {
    mostrarToast(erro.message, true);
  }
}

function editar(id) {
  const item = dadosGlobais.find(dado => Number(dado.id) === Number(id));
  if (!item) return;
  editId = id;
  document.getElementById("editData").value = item.data;
  document.getElementById("editTipo").value = item.tipo;
  document.getElementById("editDescricao").value = item.descricao;
  document.getElementById("editValor").value = item.valor;
  document.getElementById("editObs").value = item.obs || "";
  document.getElementById("erroEdicao").style.display = "none";
  abrirModal(document.getElementById("modalEdit"), document.getElementById("editData"));
}

function fecharModalEdit() {
  fecharModal(document.getElementById("modalEdit"));
  editId = null;
}

async function salvarEdicao() {
  const campos = ["editData", "editTipo", "editDescricao", "editValor"].map(id => document.getElementById(id));
  campos.forEach(campo => campo.classList.remove("campo-erro"));
  const invalidos = campos.filter(campo => !campo.value.trim() || (campo.id === "editValor" && Number(campo.value) <= 0));
  if (invalidos.length) {
    invalidos.forEach(campo => campo.classList.add("campo-erro"));
    document.getElementById("erroEdicao").style.display = "block";
    invalidos[0].focus();
    return;
  }
  try {
    await respostaJson(await fetch(`${API_URL}/lancamentos/${editId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        data: document.getElementById("editData").value,
        tipo: document.getElementById("editTipo").value,
        descricao: document.getElementById("editDescricao").value.trim(),
        valor: Number(document.getElementById("editValor").value),
        obs: document.getElementById("editObs").value.trim()
      }),
      loadingMessage: "Atualizando lançamento..."
    }));
    fecharModalEdit();
    await carregar();
    mostrarToast("Lançamento atualizado com sucesso.");
  } catch (erro) {
    document.getElementById("erroEdicao").textContent = erro.message;
    document.getElementById("erroEdicao").style.display = "block";
  }
}

function filtrarEntradas() {
  filtroAtual = "Entrada";
  paginaAtual = 1;
  atualizarCardsAtivos();
  renderizarTabela();
}

function filtrarSaidas() {
  filtroAtual = "Saída";
  paginaAtual = 1;
  atualizarCardsAtivos();
  renderizarTabela();
}

function mostrarTodos() {
  filtroAtual = "Todos";
  paginaAtual = 1;
  atualizarCardsAtivos();
  renderizarTabela();
}

function atualizarCardsAtivos() {
  document.querySelectorAll(".card").forEach(card => {
    card.classList.remove("ativo");
    card.setAttribute("aria-pressed", "false");
  });
  const card = filtroAtual === "Entrada" ? document.getElementById("CardEntrada") : filtroAtual === "Saída" ? document.getElementById("CardSaida") : document.getElementById("CardSaldo");
  card?.classList.add("ativo");
  card?.setAttribute("aria-pressed", "true");
}

function criarCelula(linha, conteudo, classe = "") {
  const celula = linha.insertCell();
  celula.textContent = conteudo;
  if (classe) celula.className = classe;
  return celula;
}

function renderizarTabela() {
  const tabela = document.getElementById("tabela");
  tabela.innerHTML = "";
  const dadosFiltrados = obterDadosFiltrados();
  const totalPaginas = Math.ceil(dadosFiltrados.length / itensPorPagina) || 1;
  if (paginaAtual > totalPaginas) paginaAtual = totalPaginas;
  const inicio = (paginaAtual - 1) * itensPorPagina;
  const pagina = dadosFiltrados.slice(inicio, inicio + itensPorPagina);

  if (!pagina.length) {
    const linha = tabela.insertRow();
    linha.className = "empty-row";
    const celula = linha.insertCell();
    celula.colSpan = 6;
    const titulo = document.createElement("strong");
    titulo.textContent = dadosGlobais.length ? "Nenhum lançamento encontrado" : "Nenhum lançamento cadastrado";
    const texto = document.createElement("span");
    texto.textContent = dadosGlobais.length ? "Tente ajustar os filtros da pesquisa." : "Use “Novo lançamento” para começar seu controle financeiro.";
    celula.append(titulo, texto);
  }

  pagina.forEach(item => {
    const linha = tabela.insertRow();
    criarCelula(linha, dataLocal(item.data));
    const tipo = linha.insertCell();
    const badge = document.createElement("span");
    badge.className = `tipo-badge ${item.tipo === "Entrada" ? "tipo-entrada" : "tipo-saida"}`;
    badge.textContent = `${item.tipo === "Entrada" ? "↗" : "↘"} ${item.tipo}`;
    tipo.appendChild(badge);
    criarCelula(linha, item.descricao);
    criarCelula(linha, formatarMoeda(item.valor), item.tipo === "Entrada" ? "valor-entrada" : "valor-saida");
    criarCelula(linha, item.obs || "—", "desktop-only");
    const acoes = linha.insertCell();
    const grupo = document.createElement("div");
    grupo.className = "acoes-tabela";
    const editarBotao = document.createElement("button");
    editarBotao.type = "button";
    editarBotao.className = "btn-acao btn-edit";
    editarBotao.setAttribute("aria-label", `Editar ${item.descricao}`);
    editarBotao.textContent = "✏️";
    editarBotao.addEventListener("click", () => editar(item.id));
    const excluirBotao = document.createElement("button");
    excluirBotao.type = "button";
    excluirBotao.className = "btn-acao btn-delete";
    excluirBotao.setAttribute("aria-label", `Excluir ${item.descricao}`);
    excluirBotao.textContent = "🗑️";
    excluirBotao.addEventListener("click", () => deletar(item.id));
    grupo.append(editarBotao, excluirBotao);
    acoes.appendChild(grupo);
  });

  calcularTotais();
  atualizarPaginacao(dadosFiltrados.length);
  document.getElementById("contadorLancamentos").textContent = `${dadosFiltrados.length} ${dadosFiltrados.length === 1 ? "lançamento" : "lançamentos"}`;
  document.getElementById("btnLimparFiltros").hidden = !(filtroPesquisa || filtroMesAtual || filtroAtual !== "Todos");
}

function calcularTotais() {
  entradas = dadosGlobais.filter(item => item.tipo === "Entrada").reduce((soma, item) => soma + Number(item.valor || 0), 0);
  saidas = dadosGlobais.filter(item => item.tipo === "Saída").reduce((soma, item) => soma + Number(item.valor || 0), 0);
  document.getElementById("totalEntradas").textContent = formatarMoeda(entradas);
  document.getElementById("totalSaidas").textContent = formatarMoeda(saidas);
  document.getElementById("saldo").textContent = formatarMoeda(entradas - saidas);
}

function atualizarPaginacao(totalRegistros) {
  const totalPaginas = Math.ceil(totalRegistros / itensPorPagina) || 1;
  document.getElementById("pageInfo").textContent = `Página ${paginaAtual} de ${totalPaginas}`;
  document.getElementById("prevBtn").disabled = paginaAtual === 1;
  document.getElementById("nextBtn").disabled = paginaAtual >= totalPaginas;
}

function ordenarTabela(coluna) {
  if (colunaOrdenacao === coluna) ordemOrdenacao = ordemOrdenacao === "asc" ? "desc" : "asc";
  else {
    colunaOrdenacao = coluna;
    ordemOrdenacao = "asc";
  }
  atualizarIconesOrdenacao();
  renderizarTabela();
}

function atualizarIconesOrdenacao() {
  const icones = {
    data: document.getElementById("icon-data"),
    descricao: document.getElementById("icon-descricao"),
    valor: document.getElementById("icon-valor"),
    obs: document.getElementById("icon-obs")
  };
  Object.values(icones).forEach(icone => {
    icone.textContent = "⇅";
    icone.classList.remove("sort-asc", "sort-desc");
  });
  if (!colunaOrdenacao) return;
  const icone = icones[colunaOrdenacao];
  icone.textContent = ordemOrdenacao === "asc" ? "▲" : "▼";
  icone.classList.add(ordemOrdenacao === "asc" ? "sort-asc" : "sort-desc");
}

function aplicarOrdenacao(dados) {
  if (!colunaOrdenacao) return dados;
  return [...dados].sort((a, b) => {
    let valorA;
    let valorB;
    if (colunaOrdenacao === "data") {
      valorA = String(a.data);
      valorB = String(b.data);
    } else if (colunaOrdenacao === "valor") {
      valorA = Number(a.valor);
      valorB = Number(b.valor);
    } else {
      valorA = String(a[colunaOrdenacao] || "").toLocaleLowerCase("pt-BR");
      valorB = String(b[colunaOrdenacao] || "").toLocaleLowerCase("pt-BR");
    }
    return (valorA < valorB ? -1 : valorA > valorB ? 1 : 0) * (ordemOrdenacao === "asc" ? 1 : -1);
  });
}

function configurarEventos() {
  document.getElementById("iptPesquisa").addEventListener("input", pesquisar);
  document.getElementById("filtroMes").addEventListener("change", filtrarPorMes);
  document.getElementById("prevBtn").addEventListener("click", () => {
    if (paginaAtual > 1) {
      paginaAtual--;
      renderizarTabela();
    }
  });
  document.getElementById("nextBtn").addEventListener("click", () => {
    const totalPaginas = Math.ceil(obterDadosFiltrados().length / itensPorPagina);
    if (paginaAtual < totalPaginas) {
      paginaAtual++;
      renderizarTabela();
    }
  });
  ["novoData", "novoTipo", "novoDescricao", "novoValor"].forEach(id => document.getElementById(id).addEventListener("input", evento => {
    evento.currentTarget.classList.remove("campo-erro");
    document.getElementById("erroCamposNull").style.display = "none";
  }));
  ["editData", "editTipo", "editDescricao", "editValor"].forEach(id => document.getElementById(id).addEventListener("input", evento => {
    evento.currentTarget.classList.remove("campo-erro");
    document.getElementById("erroEdicao").style.display = "none";
  }));
  document.querySelectorAll(".modal").forEach(modal => modal.addEventListener("mousedown", evento => {
    if (evento.target !== modal) return;
    if (modal.id === "modalNovoRegistro") fecharModalNovoRegistro();
    if (modal.id === "modalEdit") fecharModalEdit();
  }));
  document.addEventListener("keydown", evento => {
    const modalAberto = [...document.querySelectorAll(".modal")].find(modal => modal.style.display === "flex");
    if (evento.key === "Tab" && modalAberto) {
      const focaveis = [...modalAberto.querySelectorAll('button:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])')]
        .filter(elemento => elemento.offsetParent !== null);
      const primeiro = focaveis[0];
      const ultimo = focaveis[focaveis.length - 1];
      if (evento.shiftKey && document.activeElement === primeiro) {
        evento.preventDefault();
        ultimo.focus();
      } else if (!evento.shiftKey && document.activeElement === ultimo) {
        evento.preventDefault();
        primeiro.focus();
      }
      return;
    }
    if (evento.key === "Escape" && modalAberto) {
      if (modalAberto.id === "modalNovoRegistro") fecharModalNovoRegistro();
      if (modalAberto.id === "modalEdit") fecharModalEdit();
    }
  });
}

window.deletar = deletar;
window.editar = editar;
window.salvarEdicao = salvarEdicao;
window.abrirModalNovoRegistro = abrirModalNovoRegistro;
window.fecharModalNovoRegistro = fecharModalNovoRegistro;
window.fecharModalEdit = fecharModalEdit;
window.salvarNovoRegistro = salvarNovoRegistro;
window.registrarOutro = registrarOutro;
window.filtrarEntradas = filtrarEntradas;
window.filtrarSaidas = filtrarSaidas;
window.mostrarTodos = mostrarTodos;
window.ordenarTabela = ordenarTabela;
window.pesquisar = pesquisar;
window.filtrarPorMes = filtrarPorMes;
window.limparFiltros = limparFiltros;

window.addEventListener("DOMContentLoaded", async () => {
  configurarEventos();
  await verificarLogin();
  await carregar();
  atualizarCardsAtivos();
  atualizarIconesOrdenacao();
});
