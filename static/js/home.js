const API_URL = window.location.origin;

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

const itensPorPagina = 5;

// =========================
// LOGIN / PERFIL
// =========================
async function verificarLogin() {
  const res = await fetch("/session");
  const dados = await res.json();

  if (!dados.logado) {
    window.location.href = "/";
    return;
  }

  const btnAdmin = document.getElementById("btnAdmin");

  if (btnAdmin) {
    btnAdmin.style.display =
      dados.perfil === "Administrativo" ? "block" : "none";
  }
}

// =========================
// UTIL
// =========================
function formatarMoeda(valor) {
  return Number(valor || 0).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL"
  });
}

function obterDadosFiltrados() {
  let dadosFiltrados = [...dadosGlobais];

  if (filtroPesquisa) {
    dadosFiltrados = dadosFiltrados.filter(item => {
      const dataFormatada = new Date(item.data).toLocaleDateString("pt-BR");

      return (
        dataFormatada.toLowerCase().includes(filtroPesquisa) ||
        String(item.tipo || "").toLowerCase().includes(filtroPesquisa) ||
        String(item.descricao || "").toLowerCase().includes(filtroPesquisa) ||
        formatarMoeda(item.valor).toLowerCase().includes(filtroPesquisa) ||
        String(item.valor || "").includes(filtroPesquisa) ||
        String(item.obs || "").toLowerCase().includes(filtroPesquisa)
      );
    });
  }

  if (filtroMesAtual) {
    dadosFiltrados = dadosFiltrados.filter(item => {
      const data = new Date(item.data);
      const chave = `${data.getFullYear()}-${String(data.getMonth() + 1).padStart(2, "0")}`;
      return chave === filtroMesAtual;
    });
  }

  if (filtroAtual === "Entrada") {
    dadosFiltrados = dadosFiltrados.filter(item => item.tipo === "Entrada");
  }

  if (filtroAtual === "Saída") {
    dadosFiltrados = dadosFiltrados.filter(item => item.tipo === "Saída");
  }

  return aplicarOrdenacao(dadosFiltrados);
}

// =========================
// FILTRO MÊS / PESQUISA
// =========================
function carregarFiltroMes() {
  const select = document.getElementById("filtroMes");
  if (!select) return;

  select.innerHTML = '<option value="">Todos os meses</option>';

  const meses = new Set();

  dadosGlobais.forEach(item => {
    if (!item.data) return;

    const data = new Date(item.data);
    const chave = `${data.getFullYear()}-${String(data.getMonth() + 1).padStart(2, "0")}`;

    meses.add(chave);
  });

  const nomesMeses = [
    "Janeiro", "Fevereiro", "Março", "Abril",
    "Maio", "Junho", "Julho", "Agosto",
    "Setembro", "Outubro", "Novembro", "Dezembro"
  ];

  [...meses].sort().forEach(chave => {
    const [ano, mes] = chave.split("-");

    const option = document.createElement("option");
    option.value = chave;
    option.textContent = `${nomesMeses[Number(mes) - 1]}/${ano}`;

    select.appendChild(option);
  });
}

function filtrarPorMes() {
  filtroMesAtual = document.getElementById("filtroMes").value;
  paginaAtual = 1;
  renderizarTabela();
}

function pesquisar() {
  filtroPesquisa = document
    .getElementById("iptPesquisa")
    .value
    .trim()
    .toLowerCase();

  paginaAtual = 1;
  renderizarTabela();
}

// =========================
// CARREGAR
// =========================
async function carregar() {
  try {
    const res = await fetch(`${API_URL}/lancamentos`);

    if (!res.ok) {
      console.error("Erro ao carregar lançamentos");
      return;
    }

    dadosGlobais = await res.json();

    paginaAtual = 1;

    carregarFiltroMes();
    renderizarTabela();
  } catch (err) {
    console.error(err);
  }
}

// =========================
// MODAL NOVO REGISTRO
// =========================
function abrirModalNovoRegistro() {
  document.getElementById("modalNovoRegistro").style.display = "flex";
  document.getElementById("msgNovoRegistro").style.display = "none";
}

function limparCamposNovoRegistro() {
  const campos = [
    document.getElementById("novoData"),
    document.getElementById("novoTipo"),
    document.getElementById("novoDescricao"),
    document.getElementById("novoValor")
  ];

  document.getElementById("novoData").value = "";
  document.getElementById("novoTipo").value = "Entrada";
  document.getElementById("novoDescricao").value = "";
  document.getElementById("novoValor").value = "";
  document.getElementById("novoObs").value = "";

  campos.forEach(campo => {
    if (campo) campo.style.border = "1px solid #444";
  });

  document.getElementById("erroCamposNull").style.display = "none";
  document.getElementById("msgNovoRegistro").style.display = "none";
}

function fecharModalNovoRegistro() {
  limparCamposNovoRegistro();
  document.getElementById("modalNovoRegistro").style.display = "none";
}

async function salvarNovoRegistro() {
  const valData = document.getElementById("novoData");
  const valTipo = document.getElementById("novoTipo");
  const valDescricao = document.getElementById("novoDescricao");
  const valValor = document.getElementById("novoValor");
  const erroCamposNull = document.getElementById("erroCamposNull");

  const campos = [valData, valTipo, valDescricao, valValor];

  let possuiErro = false;

  campos.forEach(campo => {
    campo.style.border = "1px solid #444";

    if (!campo.value.trim()) {
      campo.style.border = "2px solid #e74c3c";
      possuiErro = true;
    }
  });

  if (possuiErro) {
    erroCamposNull.style.display = "block";
    return;
  }

  await fetch(`${API_URL}/lancamentos`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      data: valData.value,
      tipo: valTipo.value,
      descricao: valDescricao.value,
      valor: Number(valValor.value),
      obs: document.getElementById("novoObs").value
    })
  });

  fecharModalNovoRegistro();

  await carregar();
}

async function registrarOutro() {
  const valData = document.getElementById("novoData");
  const valTipo = document.getElementById("novoTipo");
  const valDescricao = document.getElementById("novoDescricao");
  const valValor = document.getElementById("novoValor");
  const erroCamposNull = document.getElementById("erroCamposNull");

  const campos = [valData, valTipo, valDescricao, valValor];

  let possuiErro = false;

  campos.forEach(campo => {
    campo.style.border = "1px solid #444";

    if (!campo.value.trim()) {
      campo.style.border = "2px solid #e74c3c";
      possuiErro = true;
    }
  });

  if (possuiErro) {
    erroCamposNull.style.display = "block";
    return;
  }

  await fetch(`${API_URL}/lancamentos`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      data: valData.value,
      tipo: valTipo.value,
      descricao: valDescricao.value,
      valor: Number(valValor.value),
      obs: document.getElementById("novoObs").value
    })
  });

  document.getElementById("msgNovoRegistro").style.display = "block";

  limparCamposNovoRegistro();

  await carregar();
}

// =========================
// DELETE / EDIT
// =========================
async function deletar(id) {
  await fetch(`${API_URL}/lancamentos/${id}`, {
    method: "DELETE"
  });

  await carregar();
}

function editar(id) {
  const item = dadosGlobais.find(d => d.id === id);

  if (!item) return;

  editId = id;

  editData.value = item.data;
  editTipo.value = item.tipo;
  editDescricao.value = item.descricao;
  editValor.value = item.valor;
  editObs.value = item.obs || "";

  modalEdit.style.display = "flex";
}

function fecharModalEdit() {
  document.getElementById("modalEdit").style.display = "none";
}

async function salvarEdicao() {
  await fetch(`${API_URL}/lancamentos/${editId}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      data: editData.value,
      tipo: editTipo.value,
      descricao: editDescricao.value,
      valor: Number(editValor.value),
      obs: editObs.value
    })
  });

  fecharModalEdit();

  await carregar();
}

// =========================
// FILTROS DOS CARDS
// =========================
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
  document
    .querySelectorAll(".card")
    .forEach(card => card.classList.remove("ativo"));

  if (filtroAtual === "Entrada") {
    document.getElementById("CardEntrada")?.classList.add("ativo");
  } else if (filtroAtual === "Saída") {
    document.getElementById("CardSaida")?.classList.add("ativo");
  } else {
    document.getElementById("CardSaldo")?.classList.add("ativo");
  }
}

// =========================
// TABELA
// =========================
function renderizarTabela() {
  tabela.innerHTML = "";

  const dadosFiltrados = obterDadosFiltrados();

  const inicio = (paginaAtual - 1) * itensPorPagina;

  const pagina = dadosFiltrados.slice(
    inicio,
    inicio + itensPorPagina
  );

  pagina.forEach(item => {
    const row = tabela.insertRow();

    row.insertCell(0).innerText =
      new Date(item.data).toLocaleDateString("pt-BR");

    row.insertCell(1).innerText = item.tipo;
    row.insertCell(2).innerText = item.descricao;
    row.insertCell(3).innerText = formatarMoeda(item.valor);
    row.insertCell(4).innerText = item.obs || "-";

    row.insertCell(5).innerHTML = `
      <div class="acoes-tabela">
        <button class="btn-acao btn-delete" onclick="deletar(${item.id})">
          🗑️
        </button>

        <button class="btn-acao btn-edit" onclick="editar(${item.id})">
          ✏️
        </button>
      </div>
    `;
  });

  calcularTotais();
  atualizarPaginacao(dadosFiltrados.length);
}

// =========================
// TOTAIS
// =========================
function calcularTotais() {
  entradas = 0;
  saidas = 0;

  dadosGlobais.forEach(i => {
    const valor = Number(i.valor || 0);

    if (i.tipo === "Entrada") {
      entradas += valor;
    } else {
      saidas += valor;
    }
  });

  totalEntradas.innerText = formatarMoeda(entradas);
  totalSaidas.innerText = formatarMoeda(saidas);
  saldo.innerText = formatarMoeda(entradas - saidas);
}

// =========================
// PAGINAÇÃO
// =========================
function atualizarPaginacao(totalRegistros) {
  const totalPaginas = Math.ceil(totalRegistros / itensPorPagina);

  pageInfo.innerText =
    `Página ${paginaAtual} de ${totalPaginas || 1}`;

  prevBtn.disabled = paginaAtual === 1;

  nextBtn.disabled =
    paginaAtual === totalPaginas ||
    totalPaginas === 0;
}

prevBtn.onclick = () => {
  if (paginaAtual > 1) {
    paginaAtual--;
    renderizarTabela();
  }
};

nextBtn.onclick = () => {
  const totalPaginas =
    Math.ceil(obterDadosFiltrados().length / itensPorPagina);

  if (paginaAtual < totalPaginas) {
    paginaAtual++;
    renderizarTabela();
  }
};

// =========================
// ORDENAÇÃO
// =========================
function ordenarTabela(coluna) {
  if (colunaOrdenacao === coluna) {
    ordemOrdenacao =
      ordemOrdenacao === "asc" ? "desc" : "asc";
  } else {
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

  Object.values(icones).forEach(icon => {
    if (!icon) return;

    icon.innerHTML = "⇅";
    icon.classList.remove("sort-asc", "sort-desc");
  });

  if (!colunaOrdenacao) return;

  const icon = icones[colunaOrdenacao];

  if (!icon) return;

  icon.innerHTML = ordemOrdenacao === "asc" ? "▲" : "▼";
  icon.classList.add(
    ordemOrdenacao === "asc" ? "sort-asc" : "sort-desc"
  );
}

function aplicarOrdenacao(dados) {
  if (!colunaOrdenacao) return dados;

  return [...dados].sort((a, b) => {
    let valorA;
    let valorB;

    switch (colunaOrdenacao) {
      case "data":
        valorA = new Date(a.data);
        valorB = new Date(b.data);
        break;

      case "descricao":
        valorA = String(a.descricao || "").toLowerCase();
        valorB = String(b.descricao || "").toLowerCase();
        break;

      case "valor":
        valorA = Number(a.valor);
        valorB = Number(b.valor);
        break;

      case "obs":
        valorA = String(a.obs || "").toLowerCase();
        valorB = String(b.obs || "").toLowerCase();
        break;

      default:
        return 0;
    }

    if (valorA < valorB) return ordemOrdenacao === "asc" ? -1 : 1;
    if (valorA > valorB) return ordemOrdenacao === "asc" ? 1 : -1;

    return 0;
  });
}

// =========================
// VALIDAÇÕES
// =========================
function configurarValidacaoCampos() {
  ["novoData", "novoTipo", "novoDescricao", "novoValor"].forEach(id => {
    const campo = document.getElementById(id);

    if (!campo) return;

    campo.addEventListener("input", () => {
      campo.style.border = "1px solid #444";
      document.getElementById("erroCamposNull").style.display = "none";
    });
  });
}

// =========================
// MENU / LOGOUT
// =========================
function toggleMenu() {
  sidebar.classList.toggle("active");
}

async function logout() {
  await fetch("/logout");
  window.location.href = "/";
}

// =========================
// EXPORT GLOBAL
// =========================
window.deletar = deletar;
window.editar = editar;
window.toggleMenu = toggleMenu;
window.salvarEdicao = salvarEdicao;
window.abrirModalNovoRegistro = abrirModalNovoRegistro;
window.fecharModalNovoRegistro = fecharModalNovoRegistro;
window.fecharModalEdit = fecharModalEdit;
window.salvarNovoRegistro = salvarNovoRegistro;
window.registrarOutro = registrarOutro;
window.logout = logout;
window.filtrarEntradas = filtrarEntradas;
window.filtrarSaidas = filtrarSaidas;
window.mostrarTodos = mostrarTodos;
window.ordenarTabela = ordenarTabela;
window.pesquisar = pesquisar;
window.filtrarPorMes = filtrarPorMes;

// =========================
// INIT
// =========================
window.onload = async () => {
  const iptPesquisa = document.getElementById("iptPesquisa");

  if (iptPesquisa) {
    iptPesquisa.addEventListener("keydown", function (e) {
      if (e.key === "Enter") {
        pesquisar();
      }
    });
  }

  await verificarLogin();
  await carregar();

  configurarValidacaoCampos();
  atualizarCardsAtivos();
  atualizarIconesOrdenacao();
};