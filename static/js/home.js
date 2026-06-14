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
  // 1. Captura dos elementos (ajuste os IDs se forem diferentes no seu HTML)
  const inputNome = document.getElementById('nome');
  const inputEmail = document.getElementById('email');
  const inputSenha = document.getElementById('senha');
  const inputConfirmarSenha = document.getElementById('confirmarSenha');
  const mensagemErro = document.getElementById('mensagemErro'); // Tag para a frase vermelha "Preencha todos..."

  const campos = [inputNome, inputEmail, inputSenha, inputConfirmarSenha];
  let temCampoVazio = false;

  // 2. Reset visual das validações anteriores
  campos.forEach(input => {
    if (input) input.style.border = "1px solid #444"; // Cor padrão da sua borda
  });
  if (mensagemErro) {
    mensagemErro.textContent = "";
    mensagemErro.style.display = "none";
  }
  erroSenha.style.display = "none";
  cadastroSucesso.style.display = "none";

  // 3. Validação: Verifica se existem campos vazios
  campos.forEach(input => {
    if (!input || input.value.trim() === "") {
      temCampoVazio = true;
      if (input) input.style.border = "2px solid #ff4d4d"; // Borda vermelha
    }
  });

  // Se houver algum campo vazio, exibe o aviso e INTERROMPE a execução aqui
  if (temCampoVazio) {
    if (mensagemErro) {
      mensagemErro.style.color = "#ff4d4d";
      mensagemErro.textContent = "Preencha todos os campos!";
      mensagemErro.style.display = "block";
    }
    return; // O 'return' impede o código de continuar para o fetch
  }

  // 4. Validação: Verifica se as senhas são iguais (sua lógica original)
  if (inputSenha.value !== inputConfirmarSenha.value) {
    erroSenha.style.display = "block";
    return; // Interrompe se as senhas não baterem
  }

  // 5. Se passou por todas as validações, envia os dados para a API
  try {
    await fetch(`${API_URL}/usuarios`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        nome: inputNome.value,
        email: inputEmail.value,
        senha: inputSenha.value
      })
    });

    // 6. Sucesso e Limpeza dos campos
    cadastroSucesso.style.display = "block";
    
    inputNome.value = "";
    inputEmail.value = "";
    inputSenha.value = "";
    inputConfirmarSenha.value = "";

  } catch (error) {
    console.error("Erro ao conectar com a API:", error);
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
window.onload = () => {

  carregar();

  configurarValidacaoCampos();
  configurarValidacaoCadastro();

};