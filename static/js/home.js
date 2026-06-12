let entradas = 0;
let saidas = 0;
let editId = null;
let dadosGlobais = [];
let paginaAtual = 1;
const itensPorPagina = 4;

function editar(id) {
const item = dadosGlobais.find(d => d.id === id);
if (!item) return;

editId = id;

document.getElementById("editData").value = item.data;
document.getElementById("editTipo").value = item.tipo;
document.getElementById("editDescricao").value = item.descricao;
document.getElementById("editValor").value = item.valor;
document.getElementById("editObs").value = item.obs;

document.getElementById("modalEdit").style.display = "flex";
}

async function salvarEdicao() {
const atualizado = {
data: document.getElementById("editData").value,
tipo: document.getElementById("editTipo").value,
descricao: document.getElementById("editDescricao").value,
valor: Number(document.getElementById("editValor").value),
obs: document.getElementById("editObs").value
};

await fetch(`http://127.0.0.1:5000/lancamentos/${editId}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(atualizado)
});

fecharModal();
carregar();
}

function fecharModal() {
document.getElementById("modalEdit").style.display = "none";
editId = null;
}

function formatarMoeda(valor) {
return Number(valor || 0).toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL'
});
}

/* =========================
CARREGAR DADOS
========================= */
async function carregar() {
try {
    const res = await fetch("http://127.0.0.1:5000/lancamentos");

    if (!res.ok) throw new Error("Erro ao buscar dados");

    dadosGlobais = await res.json() || [];

    paginaAtual = 1;
    renderizarTabela();

} catch (error) {
    console.error(error);
}
}

/* =========================
RENDERIZAR TABELA
========================= */
function renderizarTabela() {
  const tabela = document.getElementById("tabela");
  tabela.innerHTML = "";

  const inicio = (paginaAtual - 1) * itensPorPagina;
  const fim = inicio + itensPorPagina;

  const paginaDados = dadosGlobais.slice(inicio, fim);

  paginaDados.forEach(item => {
    const row = tabela.insertRow();

    row.insertCell(0).innerText = item.data || "-";
    row.insertCell(1).innerText = item.tipo || "-";
    row.insertCell(2).innerText = item.descricao || "-";
    row.insertCell(3).innerText = formatarMoeda(item.valor);
    row.insertCell(4).innerText = item.obs || "-";

    const actions = row.insertCell(5);
    actions.innerHTML = `
      <button onclick="deletar('${item.id}')">🗑️</button>
      <button onclick="editar('${item.id}')">✏️</button>
    `;
  });

  calcularTotais(); // 👈 AQUI ESTÁ A CORREÇÃO

  atualizarPaginacao();
}

/* =========================
DASHBOARD
========================= */
function atualizarDashboard() {
document.getElementById("totalEntradas").innerText = formatarMoeda(entradas);
document.getElementById("totalSaidas").innerText = formatarMoeda(saidas);
document.getElementById("saldo").innerText = formatarMoeda(entradas - saidas);
}

/* =========================
PAGINAÇÃO
========================= */
function atualizarPaginacao() {
const totalPaginas = Math.max(1, Math.ceil(dadosGlobais.length / itensPorPagina));

document.getElementById("pageInfo").innerText =
    `Página ${paginaAtual} de ${totalPaginas}`;

document.getElementById("prevBtn").disabled = paginaAtual === 1;
document.getElementById("nextBtn").disabled = paginaAtual === totalPaginas;
}

/* =========================
BOTÕES PAGINAÇÃO
========================= */
document.getElementById("prevBtn").addEventListener("click", () => {
if (paginaAtual > 1) {
    paginaAtual--;
    renderizarTabela();
}
});

document.getElementById("nextBtn").addEventListener("click", () => {
const totalPaginas = Math.ceil(dadosGlobais.length / itensPorPagina);

if (paginaAtual < totalPaginas) {
    paginaAtual++;
    renderizarTabela();
}
});

/* =========================
SALVAR
========================= */
document.getElementById("form").addEventListener("submit", async (e) => {
e.preventDefault();

const item = {
    data: document.getElementById("data").value,
    tipo: document.getElementById("tipo").value,
    descricao: document.getElementById("descricao").value,
    valor: Number(document.getElementById("valor").value),
    obs: document.getElementById("obs").value
};

const res = await fetch("http://127.0.0.1:5000/lancamentos", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(item)
});

const result = await res.json();

if (res.ok && result.status === "ok") {
    document.getElementById("form").reset();
    carregar();
}
});

/* =========================
DELETE
========================= */
async function deletar(id) {
    console.log("delete clicado", id);

    await fetch(`http://127.0.0.1:5000/lancamentos/${id}`, {
    method: "DELETE"
    });

    carregar();
}

/* =========================
    EDITAR (SEGURO)
========================= */
function editar(id) {
const item = dadosGlobais.find(d => d.id === id);

if (!item) {
    console.error("Item não encontrado:", id);
    return;
}

editId = id;

document.getElementById("editData").value = item.data || "";
document.getElementById("editTipo").value = item.tipo || "Entrada";
document.getElementById("editDescricao").value = item.descricao || "";
document.getElementById("editValor").value = item.valor || 0;
document.getElementById("editObs").value = item.obs || "";

const modal = document.getElementById("modalEdit");

modal.style.display = "flex";

console.log("Modal aberto");
}

function fecharModal() {
const modal = document.getElementById("modalEdit");
modal.style.display = "none";
editId = null;

console.log(document.getElementById("modalEdit"));
}

function calcularTotais() {
  entradas = 0;
  saidas = 0;

  dadosGlobais.forEach(item => {
    const valor = Number(item.valor || 0);

    if (item.tipo === "Entrada") entradas += valor;
    else saidas += valor;
  });

  atualizarDashboard();
}

function toggleMenu() {
  document.getElementById("sidebar").classList.toggle("active");
}
window.toggleMenu = toggleMenu;

function abrirModalCadUser() {
  document.getElementById("modalCadUser").style.display = "flex";
}
function fecharModalCadUser() {
  document.getElementById("modalCadUser").style.display = "none";
}

function cadastrarUsuario() {

  if (!validarSenhas()) {
    return;
  }

  const nome = document.getElementById("nome").value;
  const email = document.getElementById("email").value;
  const senha = document.getElementById("senha").value;

  const sucesso = document.getElementById("cadastroSucesso");

  fetch("http://localhost:5000/usuarios", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ nome, email, senha })
  })
  .then(response => {
    if (!response.ok) {
      throw new Error("Erro no cadastro");
    }
    return response.text(); // 👈 mais seguro que json()
  })
  .then(() => {

    console.log("cadastro ok");

    sucesso.style.display = "block";

    document.getElementById("nome").value = "";
    document.getElementById("email").value = "";
    document.getElementById("senha").value = "";
    document.getElementById("confirmarSenha").value = "";

  })
  .catch(error => {
    console.error(error);
  });
}

function validarSenhas() {
  console.log("validando senhas...");

  const nome = document.getElementById("nome");
  const email = document.getElementById("email");
  const senha = document.getElementById("senha");
  const confirmar = document.getElementById("confirmarSenha");

  const erroSenha = document.getElementById("erroSenha");
  const msgCampos = document.getElementById("msgCamposVazios");

  // 🔥 apenas campos obrigatórios
  const campos = [nome, email, senha, confirmar];

  let valido = true;

  // valida campos vazios
  campos.forEach(campo => {
    if (campo.value.trim() === "") {
      campo.style.border = "1px solid red";
      valido = false;
    } else {
      campo.style.border = "1px solid #333";
    }
  });

  // 🚨 mensagem de campos vazios
  if (!valido) {
    msgCampos.style.display = "block";
    return false;
  } else {
    msgCampos.style.display = "none";
  }

  // 🔐 valida senha
  if (senha.value !== confirmar.value) {
    erroSenha.style.display = "block";

    senha.style.border = "1px solid red";
    confirmar.style.border = "1px solid red";

    return false;
  }

  // sucesso
  erroSenha.style.display = "none";

  senha.style.border = "1px solid #333";
  confirmar.style.border = "1px solid #333";

  return true;
}

function togglePassword() {
  const senha = document.getElementById("senha");
  const confirmar = document.getElementById("confirmarSenha");
  const btn = document.getElementById("togglePassword");

  const isPassword = senha.type === "password";

  // alterna tipo dos dois inputs
  senha.type = isPassword ? "text" : "password";
  confirmar.type = isPassword ? "text" : "password";

  // opcional: muda ícone
  btn.textContent = isPassword ? "🙈" : "👁️";
}

window.deletar = deletar;
window.editar = editar;

/* =========================
INIT
========================= */
window.addEventListener("DOMContentLoaded", () => {
    carregar();
});
