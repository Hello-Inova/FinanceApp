const API_URL = window.location.origin;

let usuariosGlobais = [];

async function carregarUsuarios() {

  const res = await fetch(`${API_URL}/admin/usuarios`);

  if (res.status === 403) {
    alert("Acesso negado.");
    window.location.href = "/home";
    return;
  }

  usuariosGlobais = await res.json();

  renderizarUsuarios(usuariosGlobais);
}

function renderizarUsuarios(lista) {

  tabelaUsuarios.innerHTML = "";

  lista.forEach(usuario => {

    const row = tabelaUsuarios.insertRow();

    row.insertCell(0).innerText = usuario.nome;
    row.insertCell(1).innerText = usuario.email;

    row.insertCell(2).innerHTML = `
      <span class="badge ${usuario.perfil === "Administrativo" ? "badge-admin" : "badge-padrao"}">
        ${usuario.perfil}
      </span>
    `;

    row.insertCell(3).innerHTML = `
      <span class="badge ${usuario.ativo ? "badge-ativo" : "badge-inativo"}">
        ${usuario.ativo ? "Ativo" : "Inativo"}
      </span>
    `;

    row.insertCell(4).innerHTML = `
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

function abrirModalEditar(id) {

  const usuario = usuariosGlobais.find(u => u.id === id);

  if (!usuario) return;

  editUserId.value = usuario.id;
  editNome.value = usuario.nome;
  editEmail.value = usuario.email;
  editPerfil.value = usuario.perfil;
  editSenha.value = "";

  modalEditarUsuario.style.display = "flex";
}

function fecharModalEditar() {
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

window.onload = carregarUsuarios;