let itens = [];

function formatarMoeda(valor) {
  return Number(valor || 0).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL"
  });
}

function adicionarItem() {
  const nome = document.getElementById("itemNome");
  const categoria = document.getElementById("itemCategoria");
  const qtd = document.getElementById("itemQtd");
  const valor = document.getElementById("itemValor");
  const erro = document.getElementById("mensagemErro");

  [nome, categoria, qtd, valor].forEach(campo => {
    campo.classList.remove("campo-erro");
  });

  erro.style.display = "none";

  let possuiErro = false;

  [nome, categoria, qtd, valor].forEach(campo => {
    if (!campo.value.trim()) {
      campo.classList.add("campo-erro");
      possuiErro = true;
    }
  });

  if (possuiErro) {
    erro.innerText = "⚠️ Preencha todos os campos.";
    erro.style.display = "block";
    return;
  }

  itens.push({
    id: Date.now(),
    nome: nome.value.trim(),
    categoria: categoria.value,
    qtd: Number(qtd.value),
    valor: Number(valor.value),
    comprado: false
  });

  nome.value = "";
  qtd.value = 1;
  valor.value = "";

  renderizar();
}

function alternarComprado(id) {
  const item = itens.find(i => i.id === id);

  if (item) {
    item.comprado = !item.comprado;
  }

  renderizar();
}

function removerItem(id) {
  itens = itens.filter(i => i.id !== id);
  renderizar();
}

function renderizar() {
  const container = document.getElementById("listaCategorias");

  container.innerHTML = "";

  const categorias = {};

  itens.forEach(item => {
    if (!categorias[item.categoria]) {
      categorias[item.categoria] = [];
    }

    categorias[item.categoria].push(item);
  });

  Object.keys(categorias).forEach(categoria => {
    const lista = categorias[categoria];

    const totalCategoria = lista.reduce((soma, item) => {
      return soma + item.qtd * item.valor;
    }, 0);

    const card = document.createElement("div");
    card.className = "categoria-card";

    card.innerHTML = `
      <div class="categoria-header">
        <h2>${categoria}</h2>
        <strong>${formatarMoeda(totalCategoria)}</strong>
      </div>
    `;

    lista.forEach(item => {
      const totalItem = item.qtd * item.valor;

      card.innerHTML += `
        <div class="item ${item.comprado ? "comprado" : ""}">
          <input
            type="checkbox"
            ${item.comprado ? "checked" : ""}
            onchange="alternarComprado(${item.id})">

          <strong>${item.nome}</strong>

          <span>Qtd: ${item.qtd}</span>

          <span>Un: ${formatarMoeda(item.valor)}</span>

          <span>Total: ${formatarMoeda(totalItem)}</span>

          <button
            class="btn-danger"
            onclick="removerItem(${item.id})">
            Excluir
          </button>
        </div>
      `;
    });

    container.appendChild(card);
  });

  atualizarResumo();
}

function atualizarResumo() {
  const total = itens.reduce((soma, item) => {
    return soma + item.qtd * item.valor;
  }, 0);

  const comprados = itens.filter(i => i.comprado).length;

  document.getElementById("totalGeral").innerText = formatarMoeda(total);
  document.getElementById("totalItens").innerText = itens.length;
  document.getElementById("totalComprados").innerText = comprados;
}