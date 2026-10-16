const API_URL = window.location.origin;

let comprasGlobais = [];
let comprasResposta = null;
let filtroTimer = null;
let paginaAtual = 1;
let compraEditId = null;

const itensPorPagina = 6;

function formatarMoeda(valor) {
  return Number(valor || 0).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL"
  });
}

function filtrarComprados() {
  filtroStatus.value = "1";
  paginaAtual = 1;
  carregarCompras();
}

function filtrarPendentes() {
  filtroStatus.value = "0";
  paginaAtual = 1;
  carregarCompras();
}

function mostrarTodasCompras() {
  filtroStatus.value = "";
  paginaAtual = 1;
  carregarCompras();
}


async function carregarCompras() {
  const params = new URLSearchParams({ paginado: "1", pagina: paginaAtual, por_pagina: itensPorPagina });
  const pesquisa = document.getElementById("iptPesquisaCompra")?.value.trim();
  const categoria = document.getElementById("filtroCategoria")?.value;
  const status = document.getElementById("filtroStatus")?.value;
  if (pesquisa) params.set("busca", pesquisa);
  if (categoria) params.set("categoria", categoria);
  if (status !== "" && status != null) params.set("comprado", status);
  const res = await fetch(`${API_URL}/api/compras?${params}`, { loadingMessage: "Carregando suas compras..." });

  if (!res.ok) {
    console.error("Erro ao carregar compras");
    return;
  }

  comprasResposta = await res.json();
  comprasGlobais = comprasResposta.itens;
  paginaAtual = comprasResposta.paginacao.pagina;

  renderizarCompras();
}

function obterComprasFiltradas() {
  return comprasGlobais;
}

function criarCelula(row, label, conteudo, classe = "", permitirHtml = false) {
  const cell = row.insertCell();

  cell.setAttribute("data-label", label);

  if (classe) {
    cell.classList.add(classe);
  }

  if (permitirHtml) {
    cell.innerHTML = conteudo;
  } else {
    cell.textContent = conteudo;
  }

  return cell;
}

function renderizarCompras() {
  const tbody = document.getElementById("tabelaCompras");

  tbody.innerHTML = "";

  const lista = obterComprasFiltradas();

  const pagina = lista;

  if (!pagina.length) {
    const row = tbody.insertRow();
    const cell = row.insertCell();
    cell.colSpan = 8;
    cell.className = "loading-row";
    cell.textContent = comprasGlobais.length
      ? "Nenhum item corresponde aos filtros selecionados."
      : "Sua lista está vazia. Use “Novo item” para começar.";
  }

  pagina.forEach(compra => {
    const row = tbody.insertRow();

    criarCelula(
      row,
      "Data",
      new Date(compra.data).toLocaleDateString("pt-BR"),
      "desktop-only"
    );

    criarCelula(
      row,
      "Categoria",
      compra.categoria,
      "desktop-only"
    );

    criarCelula(
      row,
      "Item",
      compra.item
    );

    criarCelula(
      row,
      "Qtd",
      compra.quantidade
    );

    criarCelula(
      row,
      "Unitário",
      formatarMoeda(compra.valor_unitario)
    );

    criarCelula(
      row,
      "Total",
      formatarMoeda(compra.valor_total),
      "desktop-only"
    );

    criarCelula(
      row,
      "Status",
      `
        <span class="badge ${Number(compra.comprado) === 1 ? "badge-ok" : "badge-pendente"}">
          ${Number(compra.comprado) === 1 ? "Comprado" : "Pendente"}
        </span>
      `,
      "",
      true
    );

    criarCelula(
      row,
      "Ações",
      `
        <div class="acoes">
          <button
            class="btn-success"
            onclick="alternarStatus(${compra.id}, ${compra.comprado})">
            ${Number(compra.comprado) === 1 ? "Desmarcar" : "Comprar"}
          </button>

          <button
            class="btn-secondary"
            onclick="editarCompra(${compra.id})">
            Editar
          </button>

          <button
            class="btn-danger"
            onclick="excluirCompra(${compra.id})">
            Excluir
          </button>
        </div>
      `,
      "",
      true
    );
  });

  atualizarResumo();
  atualizarPaginacao();
}

function atualizarResumo() {
  const resumo = comprasResposta?.resumo || {};
  const total = Number(resumo.valor || 0);
  const comprados = Number(resumo.comprados || 0);
  const quantidade = Number(resumo.total || 0);
  const pendentes = quantidade - comprados;

  totalGeral.innerText = formatarMoeda(total);
  totalItens.innerText = quantidade;
  totalComprados.innerText = comprados;
  totalPendentes.innerText = pendentes;
}

function atualizarPaginacao() {
  const totalPaginas = comprasResposta?.paginacao?.paginas || 1;

  if (paginaAtual > totalPaginas) {
    paginaAtual = totalPaginas;
  }

  pageInfo.innerText =
    `Página ${paginaAtual} de ${totalPaginas}`;

  prevBtn.disabled =
    paginaAtual === 1;

  nextBtn.disabled =
    paginaAtual === totalPaginas;
}

function paginaAnterior() {
  if (paginaAtual > 1) {
    paginaAtual--;
    carregarCompras();
  }
}

function proximaPagina() {
  const totalPaginas = comprasResposta?.paginacao?.paginas || 1;

  if (paginaAtual < totalPaginas) {
    paginaAtual++;
    carregarCompras();
  }
}

function abrirModalCompra() {
  compraEditId = null;

  limparModalCompra();

  tituloModalCompra.innerText =
    "🛒 Novo item";

  modalCompra.style.display =
    "flex";
}

function fecharModalCompra() {
  limparModalCompra();

  modalCompra.style.display =
    "none";
}

function limparModalCompra() {
  compraEditId = null;

  const hoje =
    new Date().toISOString().split("T")[0];

  compraId.value = "";
  compraData.value = hoje;
  compraCategoria.value = "Mercado";
  compraItem.value = "";
  compraQuantidade.value = 1;
  compraValorUnitario.value = "";
  compraValorTotal.value = "R$ 0,00";
  compraObs.value = "";

  document
    .querySelectorAll("#modalCompra input, #modalCompra select")
    .forEach(campo =>
      campo.classList.remove("campo-erro")
    );

  erroCompra.style.display = "none";
  erroCompra.innerText = "";
}

function calcularTotalModal() {
  const qtd =
    Number(compraQuantidade.value || 0);

  const valor =
    Number(compraValorUnitario.value || 0);

  compraValorTotal.value =
    formatarMoeda(qtd * valor);
}

async function salvarCompra(salvarENovo = false) {
  const campos = [
    compraData,
    compraCategoria,
    compraItem,
    compraQuantidade,
    compraValorUnitario
  ];

  campos.forEach(campo =>
    campo.classList.remove("campo-erro")
  );

  erroCompra.style.display = "none";
  erroCompra.innerText = "";

  let possuiErro = false;

  campos.forEach(campo => {
    if (!campo.value.trim()) {
      campo.classList.add("campo-erro");
      possuiErro = true;
    }
  });

  if (possuiErro) {
    erroCompra.innerText =
      "⚠️ Preencha todos os campos obrigatórios.";

    erroCompra.style.display =
      "block";

    return;
  }

  const body = {
    data: compraData.value,
    categoria: compraCategoria.value,
    item: compraItem.value.trim(),
    quantidade: Number(compraQuantidade.value),
    valor_unitario: Number(compraValorUnitario.value),
    obs: compraObs.value.trim()
  };

  const url = compraEditId
    ? `${API_URL}/api/compras/${compraEditId}`
    : `${API_URL}/api/compras`;

  const method =
    compraEditId ? "PUT" : "POST";

  const res = await fetch(url, {
    method,
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(body)
  });

  const dados = await res.json();

  if (!res.ok) {
    erroCompra.innerText =
      dados.mensagem || "Erro ao salvar compra.";

    erroCompra.style.display =
      "block";

    return;
  }

  await carregarCompras();

  if (salvarENovo) {
    const dataAtual = compraData.value;
    const categoriaAtual = compraCategoria.value;

    compraEditId = null;
    compraId.value = "";
    tituloModalCompra.innerText = "🛒 Novo item";

    compraData.value = dataAtual;
    compraCategoria.value = categoriaAtual;
    compraItem.value = "";
    compraQuantidade.value = 1;
    compraValorUnitario.value = "";
    compraValorTotal.value = "R$ 0,00";
    compraObs.value = "";

    compraItem.focus();

    return;
  }

  fecharModalCompra();
}

function editarCompra(id) {
  const compra =
    comprasGlobais.find(c => c.id === id);

  if (!compra) return;

  compraEditId = id;

  tituloModalCompra.innerText =
    "✏️ Editar item";

  compraId.value = compra.id;
  compraData.value = compra.data;
  compraCategoria.value = compra.categoria;
  compraItem.value = compra.item;
  compraQuantidade.value = compra.quantidade;
  compraValorUnitario.value = compra.valor_unitario;
  compraObs.value = compra.obs || "";

  calcularTotalModal();

  modalCompra.style.display =
    "flex";
}

async function alternarStatus(id, statusAtual) {
  const novoStatus =
    Number(statusAtual) !== 1;

  await fetch(`${API_URL}/api/compras/${id}/status`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      comprado: novoStatus
    })
  });

  await carregarCompras();
}

async function excluirCompra(id) {
  const confirmar =
    confirm("Tem certeza que deseja excluir este item?");

  if (!confirmar) return;

  await fetch(`${API_URL}/api/compras/${id}`, {
    method: "DELETE"
  });

  await carregarCompras();
}

function configurarEventos() {
  [
    "iptPesquisaCompra",
    "filtroCategoria",
    "filtroStatus"
  ].forEach(id => {
    const campo =
      document.getElementById(id);

    if (!campo) return;

    campo.addEventListener("input", () => {
      paginaAtual = 1;
      clearTimeout(filtroTimer);
      filtroTimer = setTimeout(carregarCompras, 250);
    });

    campo.addEventListener("change", () => {
      paginaAtual = 1;
      carregarCompras();
    });
  });

  [
    "compraQuantidade",
    "compraValorUnitario"
  ].forEach(id => {
    const campo =
      document.getElementById(id);

    if (!campo) return;

    campo.addEventListener("input", () => {
      campo.classList.remove("campo-erro");
      erroCompra.style.display = "none";
      calcularTotalModal();
    });
  });

  [
    "compraData",
    "compraCategoria",
    "compraItem"
  ].forEach(id => {
    const campo =
      document.getElementById(id);

    if (!campo) return;

    campo.addEventListener("input", () => {
      campo.classList.remove("campo-erro");
      erroCompra.style.display = "none";
    });
  });
}

window.abrirModalCompra = abrirModalCompra;
window.fecharModalCompra = fecharModalCompra;
window.salvarCompra = salvarCompra;
window.editarCompra = editarCompra;
window.excluirCompra = excluirCompra;
window.alternarStatus = alternarStatus;
window.paginaAnterior = paginaAnterior;
window.proximaPagina = proximaPagina;
window.filtrarComprados = filtrarComprados;
window.filtrarPendentes = filtrarPendentes;
window.mostrarTodasCompras = mostrarTodasCompras;

window.onload = async () => {
  configurarEventos();

  await carregarCompras();
};
