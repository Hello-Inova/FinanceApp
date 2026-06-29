const API_URL = window.location.origin;

let usuariosGlobais = [];

// =========================
// CARREGAR USUÁRIOS
// =========================

async function carregarUsuarios() {
  const res = await fetch(`${API_URL}/admin/usuarios`);

  if (res.status === 403) {
    alert("Acesso negado.");
    window.location.href = "/home";
    return;
  }

  if (!res.ok) {
    alert("Erro ao carregar usuários.");
    return;
  }

  usuariosGlobais = await res.json();

  renderizarUsuarios(usuariosGlobais);
}

// =========================
// RENDERIZAR TABELA
// =========================

function renderizarUsuarios(lista) {
  const tabelaUsuarios = document.getElementById("tabelaUsuarios");

  tabelaUsuarios.innerHTML = "";

  lista.forEach(usuario => {
    const row = tabelaUsuarios.insertRow();

    const cellNome = row.insertCell(0);
    cellNome.setAttribute("data-label", "Nome");
    cellNome.innerText = usuario.nome;

    const cellEmail = row.insertCell(1);
    cellEmail.setAttribute("data-label", "E-mail");
    cellEmail.innerText = usuario.email;

    const cellPerfil = row.insertCell(2);
    cellPerfil.setAttribute("data-label", "Perfil");
    cellPerfil.innerHTML = `
      <span class="badge ${usuario.perfil === "Administrativo" ? "badge-admin" : "badge-padrao"}">
        ${usuario.perfil}
      </span>
    `;

    const cellStatus = row.insertCell(3);
    cellStatus.setAttribute("data-label", "Status");
    cellStatus.innerHTML = `
      <span class="badge ${usuario.ativo ? "badge-ativo" : "badge-inativo"}">
        ${usuario.ativo ? "Ativo" : "Inativo"}
      </span>
    `;

    const cellAcoes = row.insertCell(4);
    cellAcoes.setAttribute("data-label", "Ações");
    cellAcoes.innerHTML = `
      <div class="acoes">
        <button class="btn-secondary" onclick="abrirModalEditar(${usuario.id})">
          Editar
        </button>

        <button class="btn-warning" onclick="alterarStatus(${usuario.id}, ${usuario.ativo})">
          ${usuario.ativo ? "Inativar" : "Ativar"}
        </button>

        <button class="btn-danger" onclick="deletarUsuario(${usuario.id})">
          Excluir
        </button>
      </div>
    `;
  });
}

// =========================
// BUSCA
// =========================

function buscarUsuario() {
  const termo = document
    .getElementById("iptPesquisaUsuario")
    .value
    .trim()
    .toLowerCase();

  const filtrados = usuariosGlobais.filter(usuario => {
    return (
      usuario.nome.toLowerCase().includes(termo) ||
      usuario.email.toLowerCase().includes(termo) ||
      usuario.perfil.toLowerCase().includes(termo)
    );
  });

  renderizarUsuarios(filtrados);
}

function limparBusca() {
  document.getElementById("iptPesquisaUsuario").value = "";
  renderizarUsuarios(usuariosGlobais);
}

// =========================
// MODAL NOVO USUÁRIO
// =========================

function abrirModalNovoUsuario() {
  limparModalNovoUsuario();

  document
    .getElementById("modalNovoUsuario")
    .style.display = "flex";
}

function fecharModalNovoUsuario() {
  limparModalNovoUsuario();

  document
    .getElementById("modalNovoUsuario")
    .style.display = "none";
}

function limparModalNovoUsuario() {
  const campos = [
    "novoNome",
    "novoEmail",
    "novoPerfil",
    "novoSenha",
    "novoConfirmarSenha"
  ];

  campos.forEach(id => {
    const campo = document.getElementById(id);

    if (!campo) return;

    campo.classList.remove("campo-erro");

    if (id === "novoPerfil") {
      campo.value = "Padrão";
    } else {
      campo.value = "";
    }

    if (id.includes("Senha")) {
      campo.type = "password";
    }
  });

  document.querySelectorAll(".btn-eye-admin").forEach(btn => {
    btn.innerText = "👁️";
  });

  const erro = document.getElementById("erroNovoUsuario");

  if (erro) {
    erro.style.display = "none";
    erro.textContent = "";
  }
}

async function salvarNovoUsuario() {
  const nome = document.getElementById("novoNome");
  const email = document.getElementById("novoEmail");
  const perfil = document.getElementById("novoPerfil");
  const senha = document.getElementById("novoSenha");
  const confirmar = document.getElementById("novoConfirmarSenha");
  const erro = document.getElementById("erroNovoUsuario");

  const regexEmail =
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  erro.style.display = "none";
  erro.innerHTML = "";

  [
    nome,
    email,
    perfil,
    senha,
    confirmar
  ].forEach(campo => {
    campo.classList.remove("campo-erro");
  });

  let possuiErro = false;

  [
    nome,
    email,
    perfil,
    senha,
    confirmar
  ].forEach(campo => {
    if (!campo.value.trim()) {
      campo.classList.add("campo-erro");
      possuiErro = true;
    }
  });

  if (possuiErro) {
    erro.innerHTML =
      "⚠️ Preencha todos os campos obrigatórios.";

    erro.style.display = "block";

    return;
  }

  if (!regexEmail.test(email.value.trim())) {
    email.classList.add("campo-erro");

    erro.innerHTML =
      "⚠️ Informe um endereço de e-mail válido.";

    erro.style.display = "block";

    return;
  }

  if (senha.value !== confirmar.value) {
    senha.classList.add("campo-erro");
    confirmar.classList.add("campo-erro");

    erro.innerHTML =
      "⚠️ As senhas informadas são diferentes.";

    erro.style.display = "block";

    return;
  }

  const resposta = await fetch("/usuarios", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      nome: nome.value.trim(),
      email: email.value.trim(),
      senha: senha.value,
      perfil: perfil.value
    })
  });

  const dados = await resposta.json();

  if (!resposta.ok) {
    erro.innerHTML =
      "⚠️ " +
      (dados.mensagem || "Erro ao cadastrar usuário.");

    erro.style.display = "block";

    return;
  }

  limparModalNovoUsuario();
  fecharModalNovoUsuario();

  await carregarUsuarios();
}

// =========================
// VALIDAÇÕES NOVO USUÁRIO
// =========================

function configurarValidacaoNovoUsuario() {
  const regexEmail =
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  [
    "novoNome",
    "novoEmail",
    "novoPerfil",
    "novoSenha",
    "novoConfirmarSenha"
  ].forEach(id => {
    const campo = document.getElementById(id);

    if (!campo) return;

    campo.addEventListener("input", () => {
      campo.classList.remove("campo-erro");

      const erro = document.getElementById("erroNovoUsuario");

      erro.style.display = "none";
      erro.innerHTML = "";
    });

    campo.addEventListener("change", () => {
      campo.classList.remove("campo-erro");
    });
  });

  const email = document.getElementById("novoEmail");

  if (email) {
    email.addEventListener("blur", () => {
      const erro = document.getElementById("erroNovoUsuario");

      if (
        email.value.trim() !== "" &&
        !regexEmail.test(email.value.trim())
      ) {
        email.classList.add("campo-erro");

        erro.innerHTML =
          "⚠️ E-mail inválido.";

        erro.style.display = "block";
      }
    });
  }
}

// =========================
// MODAL EDITAR USUÁRIO
// =========================

function abrirModalEditar(id) {
  const usuario = usuariosGlobais.find(u => u.id === id);

  if (!usuario) return;

  editUserId.value = usuario.id;
  editNome.value = usuario.nome;
  editEmail.value = usuario.email;
  editPerfil.value = usuario.perfil;
  editSenha.value = "";

  editSenha.type = "password";

  modalEditarUsuario.style.display = "flex";
}

function fecharModalEditar() {
  editSenha.value = "";
  editSenha.type = "password";

  modalEditarUsuario.style.display = "none";
}

async function salvarUsuario() {
  const id = editUserId.value;

  await fetch(`${API_URL}/admin/usuarios/${id}/dados`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      nome: editNome.value,
      email: editEmail.value,
      perfil: editPerfil.value
    })
  });

  if (editSenha.value.trim()) {
    await fetch(`${API_URL}/admin/usuarios/${id}/senha`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        senha: editSenha.value
      })
    });
  }

  fecharModalEditar();

  await carregarUsuarios();
}

// =========================
// AÇÕES
// =========================

async function alterarStatus(id, ativoAtual) {
  const novoStatus = ativoAtual ? 0 : 1;

  await fetch(`${API_URL}/admin/usuarios/${id}/status`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      ativo: novoStatus
    })
  });

  await carregarUsuarios();
}

async function deletarUsuario(id) {
  const confirmar = confirm(
    "Tem certeza que deseja excluir este usuário? Essa ação não poderá ser desfeita."
  );

  if (!confirmar) return;

  await fetch(`${API_URL}/admin/usuarios/${id}`, {
    method: "DELETE"
  });

  await carregarUsuarios();
}

// =========================
// SENHA
// =========================

function toggleSenhaAdmin(idInput, botao) {
  const input = document.getElementById(idInput);

  if (!input) return;

  if (input.type === "password") {
    input.type = "text";
    botao.innerHTML = "🙈";
  } else {
    input.type = "password";
    botao.innerHTML = "👁️";
  }
}

// =========================
// EXPORT GLOBAL
// =========================

window.abrirModalNovoUsuario = abrirModalNovoUsuario;
window.fecharModalNovoUsuario = fecharModalNovoUsuario;
window.salvarNovoUsuario = salvarNovoUsuario;

window.abrirModalEditar = abrirModalEditar;
window.fecharModalEditar = fecharModalEditar;
window.salvarUsuario = salvarUsuario;

window.alterarStatus = alterarStatus;
window.deletarUsuario = deletarUsuario;

window.buscarUsuario = buscarUsuario;
window.limparBusca = limparBusca;

window.toggleSenhaAdmin = toggleSenhaAdmin;

// =========================
// INIT
// =========================

window.onload = async () => {
  await carregarUsuarios();

  configurarValidacaoNovoUsuario();
};