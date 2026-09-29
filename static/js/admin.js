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

  if (senha.value.length < 8) {
    senha.classList.add("campo-erro");
    erro.innerHTML =
      "⚠️ A senha deve ter no mínimo 8 caracteres.";
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

function mostrarUsuarios() {
  document.getElementById("secUsuarios").style.display = "block";
  document.getElementById("secConfiguracoes").style.display = "none";

  btnMenuUsuarios.classList.add("active");
  btnMenuConfiguracoes.classList.remove("active");
}

function mostrarConfiguracoes() {
  document.getElementById("secUsuarios").style.display = "none";
  document.getElementById("secConfiguracoes").style.display = "block";

  btnMenuConfiguracoes.classList.add("active");
  btnMenuUsuarios.classList.remove("active");

  carregarConfiguracoes();
}

// =========================
// CONFIGURAÇÕES PIX
// =========================

async function carregarConfiguracoes() {
  try {
    const res = await fetch(`${API_URL}/api/configuracoes`);

    if (!res.ok) {
      console.error("Erro ao carregar configurações");
      return;
    }

    const dados = await res.json();

    if (!dados || Object.keys(dados).length === 0) {
      gerarQrCodePix();
      return;
    }

    tipoPix.value = dados.tipo_pix || "";
    chavePix.value = dados.chave_pix || "";
    nomeRecebedor.value = dados.nome_recebedor || "";
    banco.value = dados.banco || "";
    valorCadastro.value = dados.valor_cadastro_centavos
      ? (Number(dados.valor_cadastro_centavos) / 100).toFixed(2)
      : "";
    periodoTesteDias.value = Number.isInteger(Number(dados.periodo_teste_dias))
      ? String(Number(dados.periodo_teste_dias))
      : "7";

    gerarQrCodePix();

  } catch (error) {
    console.error(error);
  }
}

function limparValidacoesConfiguracoes() {
  [tipoPix, chavePix, nomeRecebedor, banco, valorCadastro, periodoTesteDias].forEach(campo => {
    campo.classList.remove("campo-erro");
  });

  msgConfiguracoes.className = "erro-msg";
  msgConfiguracoes.innerText = "";
  msgConfiguracoes.style.display = "none";
}

function mostrarMensagemConfiguracoes(texto, tipo) {
  msgConfiguracoes.innerText = texto;
  msgConfiguracoes.style.display = "block";

  if (tipo === "sucesso") {
    msgConfiguracoes.style.color = "#22c55e";
    msgConfiguracoes.style.background = "rgba(34,197,94,.12)";
    msgConfiguracoes.style.border = "1px solid rgba(34,197,94,.35)";
  } else {
    msgConfiguracoes.style.color = "#ef4444";
    msgConfiguracoes.style.background = "rgba(239,68,68,.12)";
    msgConfiguracoes.style.border = "1px solid rgba(239,68,68,.35)";
  }
}

async function salvarConfiguracoes() {
  limparValidacoesConfiguracoes();

  const valorNumerico = Number(valorCadastro.value);
  const valorCadastroCentavos = Math.round(valorNumerico * 100);
  const diasTeste = Number(periodoTesteDias.value);

  if (!Number.isInteger(diasTeste) || diasTeste < 0 || diasTeste > 365) {
    periodoTesteDias.classList.add("campo-erro");
    mostrarMensagemConfiguracoes(
      "⚠️ Informe um período de teste entre 0 e 365 dias.",
      "erro"
    );
    periodoTesteDias.focus();
    return;
  }

  if (
    !Number.isFinite(valorNumerico) ||
    valorNumerico <= 0 ||
    valorCadastroCentavos > 100000000
  ) {
    valorCadastro.classList.add("campo-erro");
    mostrarMensagemConfiguracoes(
      "⚠️ Informe um valor de cadastro entre R$ 0,01 e R$ 1.000.000,00.",
      "erro"
    );
    return;
  }

  const body = {
    tipo_pix: tipoPix.value.trim(),
    chave_pix: chavePix.value.trim(),
    nome_recebedor: nomeRecebedor.value.trim(),
    banco: banco.value.trim(),
    valor_cadastro_centavos: valorCadastroCentavos,
    periodo_teste_dias: diasTeste
  };

  const res = await fetch(`${API_URL}/api/configuracoes`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(body)
  });

  const dados = await res.json();

  if (!res.ok) {
    mostrarMensagemConfiguracoes(
      dados.mensagem || "Erro ao salvar configurações.",
      "erro"
    );
    return;
  }

  await carregarConfiguracoes();
  gerarQrCodePix();

  mostrarMensagemConfiguracoes(
    "✅ Configurações salvas com sucesso.",
    "sucesso"
  );
}

function gerarQrCodePix() {
  const canvas = document.getElementById("pixQrCode");
  const placeholder = document.getElementById("qrCodePlaceholder");
  const campoPix = document.getElementById("pixCopiaCola");

  if (!canvas || !placeholder) return;

  const chave = chavePix.value.trim();
  const nome = nomeRecebedor.value.trim() || "RECEBEDOR";
  const cidade = "SAO PAULO";

  if (!chave) {
    const ctx = canvas.getContext("2d");
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    placeholder.style.display = "block";

    if (campoPix) {
      campoPix.value = "";
    }

    return;
  }

  const payloadPix = gerarPayloadPix({
    chave,
    nome,
    cidade
  });

  if (campoPix) {
    campoPix.value = payloadPix;
  }

  placeholder.style.display = "none";

  QRCode.toCanvas(canvas, payloadPix, {
    width: 230,
    margin: 1
  });
}

function montarCampoPix(id, valor) {
  const tamanho = String(valor.length).padStart(2, "0");
  return id + tamanho + valor;
}

function gerarPayloadPix({ chave, nome, cidade }) {
  nome = removerAcentos(nome)
    .substring(0, 25)
    .toUpperCase();

  cidade = removerAcentos(cidade)
    .substring(0, 15)
    .toUpperCase();

  const merchantAccountInfo =
    montarCampoPix("00", "BR.GOV.BCB.PIX") +
    montarCampoPix("01", chave);

  const payloadSemCRC =
    montarCampoPix("00", "01") +
    montarCampoPix("26", merchantAccountInfo) +
    montarCampoPix("52", "0000") +
    montarCampoPix("53", "986") +
    montarCampoPix("58", "BR") +
    montarCampoPix("59", nome) +
    montarCampoPix("60", cidade) +
    montarCampoPix("62", montarCampoPix("05", "***")) +
    "6304";

  const crc = calcularCRC16(payloadSemCRC);

  return payloadSemCRC + crc;
}

function calcularCRC16(payload) {
  let polinomio = 0x1021;
  let resultado = 0xffff;

  for (let i = 0; i < payload.length; i++) {
    resultado ^= payload.charCodeAt(i) << 8;

    for (let bit = 0; bit < 8; bit++) {
      if ((resultado & 0x8000) !== 0) {
        resultado = (resultado << 1) ^ polinomio;
      } else {
        resultado <<= 1;
      }

      resultado &= 0xffff;
    }
  }

  return resultado.toString(16).toUpperCase().padStart(4, "0");
}

function removerAcentos(texto) {
  return texto
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function copiarPixCopiaCola() {
  const campoPix = document.getElementById("pixCopiaCola");

  if (!campoPix || !campoPix.value.trim()) {
    alert("Nenhum código PIX gerado.");
    return;
  }

  navigator.clipboard.writeText(campoPix.value);

  alert("PIX Copia e Cola copiado!");
}

function configurarEventosConfiguracoes() {
  [tipoPix, chavePix, nomeRecebedor, banco, valorCadastro, periodoTesteDias].forEach(campo => {
    if (!campo) return;

    campo.addEventListener("input", () => {
      campo.classList.remove("campo-erro");
      msgConfiguracoes.style.display = "none";
      msgConfiguracoes.innerText = "";
      gerarQrCodePix();
    });

    campo.addEventListener("change", () => {
      campo.classList.remove("campo-erro");
      gerarQrCodePix();
    });
  });
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
window.salvarConfiguracoes = salvarConfiguracoes;
window.mostrarUsuarios = mostrarUsuarios;
window.mostrarConfiguracoes = mostrarConfiguracoes;
window.copiarPixCopiaCola = copiarPixCopiaCola;

// =========================
// INIT
// =========================

window.onload = async () => {
  await carregarUsuarios();

  configurarValidacaoNovoUsuario();
  configurarEventosConfiguracoes();

};
