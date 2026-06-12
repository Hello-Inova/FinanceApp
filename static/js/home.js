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
// SALVAR
// =========================
document.getElementById("form")?.addEventListener("submit", async (e) => {
  e.preventDefault();

  const item = {
    data: data.value,
    tipo: tipo.value,
    descricao: descricao.value,
    valor: Number(valor.value),
    obs: obs.value
  };

  await fetch(`${API_URL}/lancamentos`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(item)
  });

  e.target.reset();
  carregar();
});

// =========================
// DELETE
// =========================
async function deletar(id) {
  await fetch(`${API_URL}/lancamentos/${id}`, { method: "DELETE" });
  carregar();
}

// =========================
// EDIT
// =========================
function editar(id) {
  const item = dadosGlobais.find(d => d.id === id);
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
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      data: editData.value,
      tipo: editTipo.value,
      descricao: editDescricao.value,
      valor: Number(editValor.value),
      obs: editObs.value
    })
  });

  fecharModal();
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
  const pagina = dadosGlobais.slice(inicio, inicio + itensPorPagina);

  pagina.forEach(item => {
    const row = tabela.insertRow();

    row.insertCell(0).innerText = item.data;
    row.insertCell(1).innerText = item.tipo;
    row.insertCell(2).innerText = item.descricao;
    row.insertCell(3).innerText = formatarMoeda(item.valor);
    row.insertCell(4).innerText = item.obs;

    row.insertCell(5).innerHTML = `
      <button onclick="deletar('${item.id}')">🗑️</button>
      <button onclick="editar('${item.id}')">✏️</button>
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
    const v = Number(i.valor || 0);
    i.tipo === "Entrada" ? entradas += v : saidas += v;
  });

  totalEntradas.innerText = formatarMoeda(entradas);
  totalSaidas.innerText = formatarMoeda(saidas);
  saldo.innerText = formatarMoeda(entradas - saidas);
}

// =========================
// PAGINAÇÃO
// =========================
function atualizarPaginacao() {
  const total = Math.ceil(dadosGlobais.length / itensPorPagina);

  pageInfo.innerText = `Página ${paginaAtual} de ${total}`;

  prevBtn.disabled = paginaAtual === 1;
  nextBtn.disabled = paginaAtual === total;
}

prevBtn.onclick = () => {
  if (paginaAtual > 1) {
    paginaAtual--;
    renderizarTabela();
  }
};

nextBtn.onclick = () => {
  const total = Math.ceil(dadosGlobais.length / itensPorPagina);
  if (paginaAtual < total) {
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
  const show = senha.type === "password";

  senha.type = show ? "text" : "password";
  confirmarSenha.type = show ? "text" : "password";
}

// cadastro funcionando
async function cadastrarUsuario() {
  if (senha.value !== confirmarSenha.value) {
    erroSenha.style.display = "block";
    return;
  }

  await fetch(`${API_URL}/usuarios`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      nome: nome.value,
      email: email.value,
      senha: senha.value
    })
  });

  cadastroSucesso.style.display = "block";
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

// =========================
// INIT
// =========================
window.onload = carregar;