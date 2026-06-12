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

    if (!res.ok) throw new Error("Erro ao buscar dados");

    dadosGlobais = await res.json() || [];

    paginaAtual = 1;
    renderizarTabela();

  } catch (error) {
    console.error(error);
  }
}


// =========================
// SALVAR
// =========================
document.getElementById("form")?.addEventListener("submit", async (e) => {
  e.preventDefault();

  const item = {
    data: document.getElementById("data").value,
    tipo: document.getElementById("tipo").value,
    descricao: document.getElementById("descricao").value,
    valor: Number(document.getElementById("valor").value),
    obs: document.getElementById("obs").value
  };

  const res = await fetch(`${API_URL}/lancamentos`, {
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
// EDITAR
// =========================
function editar(id) {
  const item = dadosGlobais.find(d => d.id === id);
  if (!item) return;

  editId = id;

  document.getElementById("editData").value = item.data || "";
  document.getElementById("editTipo").value = item.tipo || "";
  document.getElementById("editDescricao").value = item.descricao || "";
  document.getElementById("editValor").value = item.valor || 0;
  document.getElementById("editObs").value = item.obs || "";

  document.getElementById("modalEdit").style.display = "flex";
}


// =========================
// SALVAR EDIÇÃO
// =========================
async function salvarEdicao() {
  const atualizado = {
    data: document.getElementById("editData").value,
    tipo: document.getElementById("editTipo").value,
    descricao: document.getElementById("editDescricao").value,
    valor: Number(document.getElementById("editValor").value),
    obs: document.getElementById("editObs").value
  };

  await fetch(`${API_URL}/lancamentos/${editId}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(atualizado)
  });

  fecharModal();
  carregar();
}


// =========================
// MODAL
// =========================
function fecharModal() {
  document.getElementById("modalEdit").style.display = "none";
  editId = null;
}


// =========================
// TABELA
// =========================
function renderizarTabela() {
  const tabela = document.getElementById("tabela");
  if (!tabela) return;

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

  dadosGlobais.forEach(item => {
    const valor = Number(item.valor || 0);

    if (item.tipo === "Entrada") entradas += valor;
    else saidas += valor;
  });

  const elEntradas = document.getElementById("totalEntradas");
  const elSaidas = document.getElementById("totalSaidas");
  const elSaldo = document.getElementById("saldo");

  if (elEntradas) elEntradas.innerText = formatarMoeda(entradas);
  if (elSaidas) elSaidas.innerText = formatarMoeda(saidas);
  if (elSaldo) elSaldo.innerText = formatarMoeda(entradas - saidas);
}


// =========================
// PAGINAÇÃO
// =========================
function atualizarPaginacao() {
  const totalPaginas = Math.max(1, Math.ceil(dadosGlobais.length / itensPorPagina));

  const pageInfo = document.getElementById("pageInfo");
  const prevBtn = document.getElementById("prevBtn");
  const nextBtn = document.getElementById("nextBtn");

  if (pageInfo) pageInfo.innerText = `Página ${paginaAtual} de ${totalPaginas}`;
  if (prevBtn) prevBtn.disabled = paginaAtual === 1;
  if (nextBtn) nextBtn.disabled = paginaAtual === totalPaginas;
}


// =========================
// MENU
// =========================
function toggleMenu() {
  document.getElementById("sidebar")?.classList.toggle("active");
}


// =========================
// CADASTRO USUÁRIO (CORREÇÃO)
// =========================
function abrirModalCadUser() {
  const modal = document.getElementById("modalCadUser");
  if (modal) modal.style.display = "flex";
}

function fecharModalCadUser() {
  const modal = document.getElementById("modalCadUser");
  if (modal) modal.style.display = "none";
}


// =========================
// GLOBAL EXPORT
// =========================
window.deletar = deletar;
window.editar = editar;
window.toggleMenu = toggleMenu;
window.salvarEdicao = salvarEdicao;
window.abrirModalCadUser = abrirModalCadUser;
window.fecharModalCadUser = fecharModalCadUser;


// =========================
// INIT
// =========================
window.addEventListener("DOMContentLoaded", () => {
  carregar();
});