const API_URL = window.location.origin;

let entradas = 0;
let saidas = 0;
let editId = null;
let dadosGlobais = [];
let paginaAtual = 1;
const itensPorPagina = 4;

// =========================
// UTIL
// =========================
function formatarMoeda(valor) {
  return Number(valor || 0).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL"
  });
}

// =========================
// CARREGAR
// =========================
async function carregar() {
  try {
    const res = await fetch(`${API_URL}/lancamentos`);
    dadosGlobais = await res.json();

    paginaAtual = 1;

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

  novoData.value = "";
  novoTipo.value = "Entrada";
  novoDescricao.value = "";
  novoValor.value = "";
  novoObs.value = "";
}

function fecharModalNovoRegistro() {

  limparCamposNovoRegistro();

  document.getElementById("msgNovoRegistro").style.display = "none";

  document.getElementById("modalNovoRegistro").style.display = "none";
}
function fecharModalEdit() {
  document.getElementById("modalEdit").style.display = "none";
}

async function salvarNovoRegistro() {

  const item = {
    data: novoData.value,
    tipo: novoTipo.value,
    descricao: novoDescricao.value,
    valor: Number(novoValor.value),
    obs: novoObs.value
  };

  await fetch(`${API_URL}/lancamentos`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(item)
  });

  fecharModalNovoRegistro();

  await carregar();
}

async function registrarOutro() {

  const item = {
    data: novoData.value,
    tipo: novoTipo.value,
    descricao: novoDescricao.value,
    valor: Number(novoValor.value),
    obs: novoObs.value
  };

  await fetch(`${API_URL}/lancamentos`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(item)
  });

  document.getElementById("msgNovoRegistro").style.display = "block";

  limparCamposNovoRegistro();

  await carregar();
}

// =========================
// DELETE
// =========================
async function deletar(id) {

  await fetch(`${API_URL}/lancamentos/${id}`, {
    method: "DELETE"
  });

  carregar();
}

// =========================
// EDIT
// =========================
function editar(id) {

  const item = dadosGlobais.find(d => d.id === id);

  if (!item) return;

  editId = id;

  editData.value = item.data;
  editTipo.value = item.tipo;
  editDescricao.value = item.descricao;
  editValor.value = item.valor;
  editObs.value = item.obs;

  modalEdit.style.display = "flex";
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


  carregar();
}

function fecharModal() {
  modalEdit.style.display = "none";
}

// =========================
// TABELA
// =========================
function renderizarTabela() {

  tabela.innerHTML = "";

  const inicio = (paginaAtual - 1) * itensPorPagina;

  const pagina = dadosGlobais.slice(
    inicio,
    inicio + itensPorPagina
  );

  pagina.forEach(item => {

    const row = tabela.insertRow();

    row.insertCell(0).innerText = item.data;
    row.insertCell(1).innerText = item.tipo;
    row.insertCell(2).innerText = item.descricao;
    row.insertCell(3).innerText = formatarMoeda(item.valor);
    row.insertCell(4).innerText = item.obs;

    row.insertCell(5).innerHTML = `
      <div class="acoes-tabela">

        <button
          class="btn-acao btn-delete"
          onclick="deletar('${item.id}')">
          🗑️
        </button>

        <button
          class="btn-acao btn-edit"
          onclick="editar('${item.id}')">
          ✏️
        </button>

      </div>
    `;
  });

  calcularTotais();

  atualizarPaginacao();
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

  saldo.innerText = formatarMoeda(
    entradas - saidas
  );
}

// =========================
// PAGINAÇÃO
// =========================
function atualizarPaginacao() {

  const totalPaginas =
    Math.ceil(dadosGlobais.length / itensPorPagina);

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
    Math.ceil(dadosGlobais.length / itensPorPagina);

  if (paginaAtual < totalPaginas) {

    paginaAtual++;

    renderizarTabela();
  }
};

// =========================
// MENU
// =========================
function toggleMenu() {

  sidebar.classList.toggle("active");
}

// =========================
// CADASTRO USUÁRIO
// =========================
function abrirModalCadUser() {

  modalCadUser.style.display = "flex";
}

function fecharModalCadUser() {

  modalCadUser.style.display = "none";
}

function togglePassword() {

  const mostrar = senha.type === "password";

  senha.type =
    mostrar ? "text" : "password";

  confirmarSenha.type =
    mostrar ? "text" : "password";
}

async function cadastrarUsuario() {

  if (senha.value !== confirmarSenha.value) {

    erroSenha.style.display = "block";

    return;
  }

  erroSenha.style.display = "none";

  await fetch(`${API_URL}/usuarios`, {

    method: "POST",

    headers: {
      "Content-Type": "application/json"
    },

    body: JSON.stringify({
      nome: nome.value,
      email: email.value,
      senha: senha.value
    })
  });

  cadastroSucesso.style.display = "block";

  nome.value = "";
  email.value = "";
  senha.value = "";
  confirmarSenha.value = "";
}

// =========================
// EXPORT GLOBAL
// =========================
window.deletar = deletar;
window.editar = editar;

window.toggleMenu = toggleMenu;

window.salvarEdicao = salvarEdicao;

window.abrirModalCadUser = abrirModalCadUser;
window.fecharModalCadUser = fecharModalCadUser;

window.togglePassword = togglePassword;
window.cadastrarUsuario = cadastrarUsuario;

window.abrirModalNovoRegistro = abrirModalNovoRegistro;
window.fecharModalNovoRegistro = fecharModalNovoRegistro;
window.fecharModalEdit = fecharModalEdit;

window.salvarNovoRegistro = salvarNovoRegistro;
window.registrarOutro = registrarOutro;

// =========================
// INIT
// =========================
window.onload = carregar;