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

async function verificarLogin() {

  const res = await fetch("/session");

  const dados = await res.json();

  if (!dados.logado){

      window.location.href="/";

      return;

  }

  if(dados.perfil === "Administrativo"){

      document.getElementById("btnAdmin").style.display="block";

      document.getElementById("btnCadUser").style.display="block";

  }else{

      document.getElementById("btnAdmin").style.display="none";

      document.getElementById("btnCadUser").style.display="none";

  }
}

function carregarFiltroMes() {

    const select =
        document.getElementById("filtroMes");

    if (!select) return;

    select.innerHTML =
        '<option value="">Todos os meses</option>';

    const meses = new Set();

    dadosGlobais.forEach(item => {

        if (!item.data) return;

        const data =
            new Date(item.data);

        const chave =
            `${data.getFullYear()}-${String(data.getMonth() + 1).padStart(2, "0")}`;

        meses.add(chave);
    });

    [...meses]
        .sort()
        .forEach(chave => {

            const [ano, mes] =
                chave.split("-");

            const nomesMeses = [
                "Janeiro",
                "Fevereiro",
                "Março",
                "Abril",
                "Maio",
                "Junho",
                "Julho",
                "Agosto",
                "Setembro",
                "Outubro",
                "Novembro",
                "Dezembro"
            ];

            const option =
                document.createElement("option");

            option.value = chave;

            option.textContent =
                `${nomesMeses[Number(mes) - 1]}/${ano}`;

            select.appendChild(option);
        });
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

function filtrarPorMes() {

    filtroMesAtual =
        document.getElementById("filtroMes").value;

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

  novoData.value = "";
  novoTipo.value = "Entrada";
  novoDescricao.value = "";
  novoValor.value = "";
  novoObs.value = "";

  [
    novoData,
    novoTipo,
    novoDescricao,
    novoValor
  ].forEach(campo => {
    campo.style.border = "1px solid #444";
  });

  erroCamposNull.style.display = "none";
  msgNovoRegistro.style.display = "none";
}

function fecharModalNovoRegistro() {

  limparCamposNovoRegistro();

  document.getElementById("msgNovoRegistro").style.display = "none";

  document.getElementById("modalNovoRegistro").style.display = "none";

  document.getElementById("erroCamposNull").style.display = "none";

}
function fecharModalEdit() {
  document.getElementById("modalEdit").style.display = "none";
}

async function salvarNovoRegistro() {

  const valData = document.getElementById("novoData");
  const valTipo = document.getElementById("novoTipo");
  const valDescricao = document.getElementById("novoDescricao");
  const valValor = document.getElementById("novoValor");

  const erroCamposNull =
    document.getElementById("erroCamposNull");

  // Reset visual
  [valData, valTipo, valDescricao, valValor].forEach(campo => {
    campo.style.border = "1px solid #444";
  });

  erroCamposNull.style.display = "none";

  let possuiErro = false;

  if (!valData.value.trim()) {
    valData.style.border = "2px solid #e74c3c";
    possuiErro = true;
  }

  if (!valTipo.value.trim()) {
    valTipo.style.border = "2px solid #e74c3c";
    possuiErro = true;
  }

  if (!valDescricao.value.trim()) {
    valDescricao.style.border = "2px solid #e74c3c";
    possuiErro = true;
  }

  if (!valValor.value.trim()) {
    valValor.style.border = "2px solid #e74c3c";
    possuiErro = true;
  }

  if (possuiErro) {
    erroCamposNull.style.display = "block";
    return;
  }

  const item = {
    data: valData.value,
    tipo: valTipo.value,
    descricao: valDescricao.value,
    valor: Number(valValor.value),
    obs: document.getElementById("novoObs").value
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

  const valData = document.getElementById("novoData");
  const valTipo = document.getElementById("novoTipo");
  const valDescricao = document.getElementById("novoDescricao");
  const valValor = document.getElementById("novoValor");

  const erroCamposNull =
    document.getElementById("erroCamposNull");

  const campos = [
    valData,
    valTipo,
    valDescricao,
    valValor
  ];

  let possuiErro = false;

  campos.forEach(campo => {

    if (!campo.value.trim()) {

      campo.style.border = "1px solid #e74c3c";
      possuiErro = true;

    } else {

      campo.style.border = "1px solid #444";
    }
  });

  if (possuiErro) {

    erroCamposNull.style.display = "block";
    return;
  }

  erroCamposNull.style.display = "none";

  const item = {
    data: valData.value,
    tipo: valTipo.value,
    descricao: valDescricao.value,
    valor: Number(valValor.value),
    obs: document.getElementById("novoObs").value
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

  fecharModalEdit();

  carregar();
}

function fecharModal() {
  modalEdit.style.display = "none";
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

// =========================
// TABELA
// =========================

function renderizarTabela() {

  tabela.innerHTML = "";

  let dadosFiltrados = [...dadosGlobais];

  if (filtroPesquisa) {

      dadosFiltrados = dadosFiltrados.filter(item => {

          const dataFormatada = new Date(item.data)
              .toLocaleDateString("pt-BR");

          return (

              dataFormatada.toLowerCase().includes(filtroPesquisa) ||

              item.tipo.toLowerCase().includes(filtroPesquisa) ||

              item.descricao.toLowerCase().includes(filtroPesquisa) ||

              formatarMoeda(item.valor).toLowerCase().includes(filtroPesquisa) ||

              String(item.valor).includes(filtroPesquisa) ||

              (item.obs || "").toLowerCase().includes(filtroPesquisa)

          );

      });

  }

  if (filtroMesAtual) {

    dadosFiltrados =
        dadosFiltrados.filter(item => {

            const data =
                new Date(item.data);

            const chave =
                `${data.getFullYear()}-${String(data.getMonth() + 1).padStart(2, "0")}`;

            return chave === filtroMesAtual;
        });
  }

  if (filtroAtual === "Entrada") {

    dadosFiltrados = dadosFiltrados.filter(
      item => item.tipo === "Entrada"
    );
  }

  if (filtroAtual === "Saída") {

    dadosFiltrados = dadosFiltrados.filter(
      item => item.tipo === "Saída"
    );
  }

  dadosFiltrados =
    aplicarOrdenacao(dadosFiltrados);

  const inicio =
    (paginaAtual - 1) * itensPorPagina;

  const pagina =
    dadosFiltrados.slice(
      inicio,
      inicio + itensPorPagina
    );

  pagina.forEach(item => {

    const row = tabela.insertRow();

    row.insertCell(0).innerText =
      new Date(item.data)
        .toLocaleDateString("pt-BR");

    row.insertCell(1).innerText =
      item.tipo;

    row.insertCell(2).innerText =
      item.descricao;

    row.insertCell(3).innerText =
      formatarMoeda(item.valor);

    row.insertCell(4).innerText =
      item.obs || "-";

    row.insertCell(5).innerHTML = `
      <div class="acoes-tabela">

        <button
          class="btn-acao btn-delete"
          onclick="deletar(${item.id})">
          🗑️
        </button>

        <button
          class="btn-acao btn-edit"
          onclick="editar(${item.id})">
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

  let dadosFiltrados = [...dadosGlobais];

  if (filtroAtual === "Entrada") {

    dadosFiltrados =
      dadosFiltrados.filter(
        item => item.tipo === "Entrada"
      );
  }

  if (filtroAtual === "Saída") {

    dadosFiltrados =
      dadosFiltrados.filter(
        item => item.tipo === "Saída"
      );
  }

  const totalPaginas =
    Math.ceil(
      dadosFiltrados.length /
      itensPorPagina
    );

  pageInfo.innerText =
    `Página ${paginaAtual} de ${totalPaginas || 1}`;

  prevBtn.disabled =
    paginaAtual === 1;

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

  let dadosFiltrados = [...dadosGlobais];

  if (filtroAtual === "Entrada") {
    dadosFiltrados =
      dadosFiltrados.filter(
        item => item.tipo === "Entrada"
      );
  }

  if (filtroAtual === "Saída") {
    dadosFiltrados =
      dadosFiltrados.filter(
        item => item.tipo === "Saída"
      );
  }

  const totalPaginas =
    Math.ceil(
      dadosFiltrados.length /
      itensPorPagina
    );

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

  const modalCadUser = document.getElementById("modalCadUser");

  const nome = document.getElementById("nome");
  const email = document.getElementById("email");
  const senha = document.getElementById("senha");
  const confirmarSenha = document.getElementById("confirmarSenha");

  [nome, email, senha, confirmarSenha].forEach(input => {
    if (!input) return;

    input.value = "";
    input.style.border = "1px solid #444";
  });

  modalCadUser.style.display = "none";

  document.getElementById("erroSenha")?.style.setProperty("display", "none");
  document.getElementById("cadastroSucesso")?.style.setProperty("display", "none");
  document.getElementById("mensagemErro")?.style.setProperty("display", "none");
}

function togglePassword() {

  const mostrar = senha.type === "password";

  senha.type =
    mostrar ? "text" : "password";

  confirmarSenha.type =
    mostrar ? "text" : "password";
}

async function cadastrarUsuario() {

  // Captura dos elementos
  const inputNome = document.getElementById("nome");
  const inputEmail = document.getElementById("email");
  const inputSenha = document.getElementById("senha");
  const inputConfirmarSenha = document.getElementById("confirmarSenha");
  const inputPerfil = document.getElementById("perfil");

  const mensagemErro = document.getElementById("mensagemErro");

  const campos = [
    inputNome,
    inputEmail,
    inputSenha,
    inputConfirmarSenha,
    inputPerfil
  ];

  let temCampoVazio = false;

  // Reset visual
  campos.forEach(input => {
    if (input)
      input.style.border = "1px solid #444";
  });

  if (mensagemErro) {
    mensagemErro.textContent = "";
    mensagemErro.style.display = "none";
  }

  erroSenha.style.display = "none";
  cadastroSucesso.style.display = "none";

  // Validação de campos obrigatórios
  campos.forEach(input => {

    if (!input || input.value.trim() === "") {

      temCampoVazio = true;

      if (input)
        input.style.border = "2px solid #ff4d4d";
    }

  });

  if (temCampoVazio) {

    if (mensagemErro) {

      mensagemErro.style.color = "#ff4d4d";
      mensagemErro.textContent = "Preencha todos os campos!";
      mensagemErro.style.display = "block";

    }

    return;
  }

  // Validação da senha
  if (inputSenha.value !== inputConfirmarSenha.value) {

    erroSenha.style.display = "block";

    return;
  }

  // Cadastro
  try {

    const resposta = await fetch(`${API_URL}/usuarios`, {

      method: "POST",

      headers: {
        "Content-Type": "application/json"
      },

      body: JSON.stringify({

        nome: inputNome.value.trim(),

        email: inputEmail.value.trim(),

        senha: inputSenha.value,

        perfil: inputPerfil.value

      })

    });

    const dados = await resposta.json();

    if (!resposta.ok) {

      if (mensagemErro) {

        mensagemErro.style.display = "block";
        mensagemErro.style.color = "#ff4d4d";
        mensagemErro.textContent =
          dados.mensagem || "Erro ao cadastrar usuário.";

      }

      return;
    }

    cadastroSucesso.style.display = "block";

    // Limpa os campos
    inputNome.value = "";
    inputEmail.value = "";
    inputSenha.value = "";
    inputConfirmarSenha.value = "";
    inputPerfil.value = "Padrão";

  } catch (error) {

    console.error(error);

    if (mensagemErro) {

      mensagemErro.style.display = "block";
      mensagemErro.style.color = "#ff4d4d";
      mensagemErro.textContent =
        "Erro ao conectar com o servidor.";

    }

  }

}

function configurarValidacaoCadastro() {

  const campos = [
    document.getElementById("nome"),
    document.getElementById("email"),
    document.getElementById("senha"),
    document.getElementById("confirmarSenha")
  ];

  campos.forEach(campo => {

    if (!campo) return;

    campo.addEventListener("input", () => {

      // volta a borda para o padrão
      campo.style.border = "1px solid #444";

      const mensagemErro =
        document.getElementById("mensagemErro");

      mensagemErro.style.display = "none";
      mensagemErro.textContent = "";
    });
  });
}

function configurarValidacaoCampos() {

  ["novoData", "novoTipo", "novoDescricao", "novoValor"]
  .forEach(id => {

    const campo = document.getElementById(id);

    if (!campo) return;

    campo.addEventListener("input", () => {

      campo.style.border = "1px solid #444";

      document.getElementById("erroCamposNull").style.display = "none";
    });

  });
}

function atualizarCardsAtivos() {

    document
        .querySelectorAll(".card")
        .forEach(card =>
            card.classList.remove("ativo")
        );

    if (filtroAtual === "Entrada") {

        document
            .getElementById("CardEntrada")
            .classList.add("ativo");
    }

    else if (filtroAtual === "Saída") {

        document
            .getElementById("CardSaida")
            .classList.add("ativo");
    }

    else {

        document
            .getElementById("CardSaldo")
            .classList.add("ativo");
    }
}

function ordenarTabela(coluna) {

    if (colunaOrdenacao === coluna) {

        ordemOrdenacao =
            ordemOrdenacao === "asc"
                ? "desc"
                : "asc";

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

        icon.classList.remove(
            "sort-asc",
            "sort-desc"
        );
    });

    if (!colunaOrdenacao) return;

    const icon = icones[colunaOrdenacao];

    if (!icon) return;

    if (ordemOrdenacao === "asc") {

        icon.innerHTML = "▲";

        icon.classList.add("sort-asc");

    } else {

        icon.innerHTML = "▼";

        icon.classList.add("sort-desc");
    }
}

function aplicarOrdenacao(dados) {

    if (!colunaOrdenacao)
        return dados;

    return [...dados].sort((a, b) => {

        let valorA;
        let valorB;

        switch (colunaOrdenacao) {

            case "data":

                valorA = new Date(a.data);
                valorB = new Date(b.data);

                break;

            case "descricao":

                valorA = (a.descricao || "").toLowerCase();
                valorB = (b.descricao || "").toLowerCase();

                break;

            case "valor":

                valorA = Number(a.valor);
                valorB = Number(b.valor);

                break;

            case "obs":

                valorA = (a.obs || "").toLowerCase();
                valorB = (b.obs || "").toLowerCase();

                break;

            default:

                return 0;
        }

        if (valorA < valorB)
            return ordemOrdenacao === "asc" ? -1 : 1;

        if (valorA > valorB)
            return ordemOrdenacao === "asc" ? 1 : -1;

        return 0;
    });
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

window.abrirModalCadUser = abrirModalCadUser;
window.fecharModalCadUser = fecharModalCadUser;

window.togglePassword = togglePassword;
window.cadastrarUsuario = cadastrarUsuario;

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

  document
    .getElementById("iptPesquisa")
    .addEventListener("keydown", function(e){

        if(e.key === "Enter"){

            pesquisar();

        }

    });

  await verificarLogin();

  await carregar();

  atualizarCardsAtivos();

  atualizarIconesOrdenacao();
};