const API_URL = window.location.origin;

let comprasGlobais = [];
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
  renderizarCompras();
}

function filtrarPendentes() {
  filtroStatus.value = "0";
  paginaAtual = 1;
  renderizarCompras();
}

function mostrarTodasCompras() {
  filtroStatus.value = "";
  paginaAtual = 1;
  renderizarCompras();
}


async function carregarCompras() {
  const res = await fetch(`${API_URL}/api/compras`);

  if (!res.ok) {
    console.error("Erro ao carregar compras");
    return;
  }

  comprasGlobais = await res.json();

  renderizarCompras();
}

function obterComprasFiltradas() {
  const pesquisa = document
    .getElementById("iptPesquisaCompra")
    .value
    .trim()
    .toLowerCase();

  const categoria =
    document.getElementById("filtroCategoria").value;

  const status =
    document.getElementById("filtroStatus").value;

  return comprasGlobais.filter(compra => {
    const buscaOk =
      !pesquisa ||
      String(compra.item || "").toLowerCase().includes(pesquisa) ||
      String(compra.categoria || "").toLowerCase().includes(pesquisa) ||
      String(compra.obs || "").toLowerCase().includes(pesquisa);

    const categoriaOk =
      !categoria || compra.categoria === categoria;

    const statusOk =
      status === "" || String(compra.comprado) === status;

    return buscaOk && categoriaOk && statusOk;
  });
}

function criarCelula(row, label, conteudo, classe = "") {
  const cell = row.insertCell();

  cell.setAttribute("data-label", label);

  if (classe) {
    cell.classList.add(classe);
  }

  cell.innerHTML = conteudo;

  return cell;
}

function renderizarCompras() {
  const tbody = document.getElementById("tabelaCompras");

  tbody.innerHTML = "";

  const lista = obterComprasFiltradas();

  const inicio =
    (paginaAtual - 1) * itensPorPagina;

  const pagina =
    lista.slice(inicio, inicio + itensPorPagina);

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
      `
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
      `
    );
  });

  atualizarResumo();
  atualizarPaginacao(lista.length);
}

function atualizarResumo() {
  const total = comprasGlobais.reduce((soma, item) => {
    return soma + Number(item.valor_total || 0);
  }, 0);

  const comprados =
    comprasGlobais.filter(i => Number(i.comprado) === 1).length;

  const pendentes =
    comprasGlobais.length - comprados;

  totalGeral.innerText = formatarMoeda(total);
  totalItens.innerText = comprasGlobais.length;
  totalComprados.innerText = comprados;
  totalPendentes.innerText = pendentes;
}

function atualizarPaginacao(totalRegistros) {
  const totalPaginas =
    Math.ceil(totalRegistros / itensPorPagina) || 1;

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
    renderizarCompras();
  }
}

function proximaPagina() {
  const totalPaginas =
    Math.ceil(obterComprasFiltradas().length / itensPorPagina) || 1;

  if (paginaAtual < totalPaginas) {
    paginaAtual++;
    renderizarCompras();
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
    Number(statusAtual) === 1 ? 0 : 1;

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
      renderizarCompras();
    });

    campo.addEventListener("change", () => {
      paginaAtual = 1;
      renderizarCompras();
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