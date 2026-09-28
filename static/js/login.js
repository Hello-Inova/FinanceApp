let solicitacaoCadastroToken = null;
let emailSolicitacaoCadastro = "";
let nomeSolicitacaoCadastro = "";
let intervaloPagamento = null;
let valorCadastroCentavos = null;

function formatarValorCadastro(centavos) {
  return (Number(centavos) / 100).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL"
  });
}

function atualizarValorCadastro(centavos) {
  const valor = Number(centavos);
  if (!Number.isFinite(valor) || valor <= 0) return false;

  valorCadastroCentavos = Math.round(valor);
  const valorFormatado = formatarValorCadastro(valorCadastroCentavos);
  document.getElementById("valorCadastroPix").textContent = valorFormatado;
  document.getElementById("valorPagamentoPix").textContent = valorFormatado;
  return true;
}

async function carregarValorCadastro() {
  const campo = document.getElementById("valorCadastroPix");
  campo.textContent = "Consultando...";

  try {
    const resposta = await fetch("/api/public/pix", { loading: false });
    const dados = await resposta.json();
    if (!resposta.ok || !atualizarValorCadastro(dados.valor_centavos)) {
      throw new Error(dados.mensagem || "Valor indisponível");
    }
  } catch (erro) {
    console.error("Erro ao consultar valor do cadastro:", erro);
    campo.textContent = "Indisponível";
  }
}

document.getElementById("loginForm").addEventListener("submit", async function(e) {
  e.preventDefault();

  const email = document.getElementById("email").value;
  const senha = document.getElementById("password").value;
  const errorMessage = document.getElementById("error-message");

  errorMessage.style.display = "none";

  try {
    const response = await fetch("/login", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        email,
        password: senha
      })
    });

    const resultado = await response.json();

    if (resultado.success) {
      window.location.href = resultado.must_change_password ? "/trocar-senha" : "/home";
    } else {
      errorMessage.style.display = "block";
    }

  } catch (erro) {
    console.error("Erro:", erro);
    errorMessage.style.display = "block";
  }
});
function iniciarMonitorPagamento() {

    if (intervaloPagamento) {
        clearInterval(intervaloPagamento);
    }

    intervaloPagamento = setInterval(() => {

        verificarPagamentoAutomatico();

    }, 5000);

}
async function verificarPagamentoAutomatico() {

    if (!solicitacaoCadastroToken) return;

    const res =
        await fetch(
            `/api/public/cadastro/${encodeURIComponent(solicitacaoCadastroToken)}`
        );

    const dados =
        await res.json();

    if (!res.ok) return;

    if (dados.pagamento_status === "pago") {

      clearInterval(intervaloPagamento);

      document.getElementById(
          "cadastroEmailFinal"
      ).value = emailSolicitacaoCadastro;
      document.getElementById(
          "cadastroNomeFinal"
      ).value = nomeSolicitacaoCadastro;

      mostrarMensagemCadastro(
        "msgPagamentoPix",
        "✅ Pagamento confirmado! Liberando cadastro...",
        "sucesso"
      );

      setTimeout(() => {
        mostrarEtapaCadastro("etapaCriarConta");
      }, 1200);

    }
}
function togglePassword() {
  const senha = document.getElementById("password");

  const mostrar = senha.type === "password";

  senha.type = mostrar ? "text" : "password";
}

// =========================
// MODAL CADASTRO
// =========================

function abrirModalCadastro() {
  solicitacaoCadastroToken = null;
  emailSolicitacaoCadastro = "";
  nomeSolicitacaoCadastro = "";

  limparModalCadastro();

  document.getElementById("modalCadastroPix").style.display = "flex";
  carregarValorCadastro();
}

function fecharModalCadastro() {
  limparModalCadastro();

  document.getElementById("modalCadastroPix").style.display = "none";

  if (intervaloPagamento) {

    clearInterval(intervaloPagamento);

  }
}

function mostrarEtapaCadastro(etapa) {
  document.getElementById("etapaSolicitacao").style.display = "none";
  document.getElementById("etapaPagamento").style.display = "none";
  document.getElementById("etapaCriarConta").style.display = "none";

  document.getElementById(etapa).style.display = "block";

  if (etapa === "etapaPagamento") {
    mostrarMensagemCadastro(
      "msgPagamentoPix",
      "⏳ Aguardando confirmação automática do pagamento...",
      "sucesso"
    );
  }
  atualizarStepsCadastro(etapa);
}

function validarEmail(email) {
  const regex =
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  return regex.test(email);
}


function limparCpf(cpf) {
  return cpf.replace(/\D/g, "");
}


function aplicarMascaraCpf(valor) {
  valor = valor.replace(/\D/g, "");

  valor = valor.replace(/(\d{3})(\d)/, "$1.$2");
  valor = valor.replace(/(\d{3})(\d)/, "$1.$2");
  valor = valor.replace(/(\d{3})(\d{1,2})$/, "$1-$2");

  return valor;
}


function validarCpf(cpf) {
  cpf = limparCpf(cpf);

  if (cpf.length !== 11) return false;

  if (/^(\d)\1+$/.test(cpf)) return false;

  let soma = 0;
  let resto;

  for (let i = 1; i <= 9; i++) {
    soma += parseInt(cpf.substring(i - 1, i)) * (11 - i);
  }

  resto = (soma * 10) % 11;

  if (resto === 10 || resto === 11) {
    resto = 0;
  }

  if (resto !== parseInt(cpf.substring(9, 10))) {
    return false;
  }

  soma = 0;

  for (let i = 1; i <= 10; i++) {
    soma += parseInt(cpf.substring(i - 1, i)) * (12 - i);
  }

  resto = (soma * 10) % 11;

  if (resto === 10 || resto === 11) {
    resto = 0;
  }

  return resto === parseInt(cpf.substring(10, 11));
}

function atualizarStepsCadastro(etapa) {
  stepDados.classList.remove("active");
  stepPagamento.classList.remove("active");
  stepConta.classList.remove("active");

  if (etapa === "etapaSolicitacao") {
    stepDados.classList.add("active");
  }

  if (etapa === "etapaPagamento") {
    stepPagamento.classList.add("active");
  }

  if (etapa === "etapaCriarConta") {
    stepConta.classList.add("active");
  }
}

function limparModalCadastro() {
  mostrarEtapaCadastro("etapaSolicitacao");

  [
    "cadastroCpf",
    "cadastroEmail",
    "cadastroNome",
    "cadastroNomeFinal",
    "cadastroEmailFinal",
    "cadastroSenhaFinal",
    "cadastroConfirmarSenhaFinal"
  ].forEach(id => {
    const campo = document.getElementById(id);

    if (!campo) return;

    campo.value = "";
    campo.classList.remove("campo-erro");
  });

  document.getElementById("pixCadastroCopiaCola").value = "";
  valorCadastroCentavos = null;
  document.getElementById("valorCadastroPix").textContent = "Consultando...";
  document.getElementById("valorPagamentoPix").textContent = "—";

  limparMensagensCadastro();

  limparQrCodeCadastro();
}

function limparMensagensCadastro() {
  [
    "msgCadastroPix",
    "msgPagamentoPix",
    "msgCriarConta"
  ].forEach(id => {
    const msg = document.getElementById(id);

    if (!msg) return;

    msg.className = "msg-modal";
    msg.innerText = "";
  });
}

function mostrarMensagemCadastro(id, texto, tipo) {
  const msg = document.getElementById(id);

  if (!msg) {
    console.error("Elemento de mensagem não encontrado:", id);
    return;
  }

  msg.className = `msg-modal ${tipo}`;
  msg.innerText = texto;
}

function validarCamposObrigatorios(campos, msgId) {
  let possuiErro = false;

  campos.forEach(campo => {
    campo.classList.remove("campo-erro");

    if (!campo.value.trim()) {
      campo.classList.add("campo-erro");
      possuiErro = true;
    }
  });

  if (possuiErro) {
    mostrarMensagemCadastro(
      msgId,
      "⚠️ Preencha todos os campos obrigatórios.",
      "erro"
    );
  }

  return !possuiErro;
}

// =========================
// ETAPA 1: GERAR PIX
// =========================

async function gerarPixCadastro() {
  limparMensagensCadastro();

  const cpf = document.getElementById("cadastroCpf");
  const email = document.getElementById("cadastroEmail");
  const nome = document.getElementById("cadastroNome");

  const valido = validarCamposObrigatorios(
    [nome, cpf, email],
    "msgCadastroPix"
  );

  if (!validarCpf(cpf.value)) {
    cpf.classList.add("campo-erro");

    mostrarMensagemCadastro(
      "msgCadastroPix",
      "⚠️ CPF inválido.",
      "erro"
    );

    return;
  }


  if (!validarEmail(email.value.trim())) {
    email.classList.add("campo-erro");

    mostrarMensagemCadastro(
      "msgCadastroPix",
      "⚠️ Informe um e-mail válido.",
      "erro"
    );

    return;
  }

  if (!valido) return;

  try {
    const res = await fetch("/api/public/cadastro", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        nome: nome.value.trim(),
        cpf: limparCpf(cpf.value),
        email: email.value.trim()
      })
    });

    const dados = await res.json();

    if (!res.ok) {
      mostrarMensagemCadastro(
        "msgCadastroPix",
        dados.mensagem || "Erro ao gerar solicitação.",
        "erro"
      );
      return;
    }

    solicitacaoCadastroToken = dados.solicitacao_token;
    emailSolicitacaoCadastro = email.value.trim();
    nomeSolicitacaoCadastro = dados.nome || nome.value.trim();

    if (
      dados.pagamento_status === "pago"
    ) {
      document.getElementById("cadastroEmailFinal").value =
        emailSolicitacaoCadastro;
      document.getElementById("cadastroNomeFinal").value =
        nomeSolicitacaoCadastro;

      mostrarEtapaCadastro("etapaCriarConta");

      return;
    }

    const pix = dados.pix || {};

    const payloadPix = pix.payload || "";

    atualizarValorCadastro(pix.valor_centavos);

    if (!payloadPix) {
      mostrarMensagemCadastro(
        "msgCadastroPix",
        "O provedor não retornou um PIX válido.",
        "erro"
      );
      return;
    }

    document.getElementById("pixCadastroCopiaCola").value = payloadPix;

    gerarQrCodeCadastro(payloadPix);

    mostrarEtapaCadastro("etapaPagamento");
    iniciarMonitorPagamento();

  } catch (error) {
    console.error(error);

    mostrarMensagemCadastro(
      "msgCadastroPix",
      "Erro ao conectar com o servidor.",
      "erro"
    );
  }
}

// =========================
// ETAPA 2: PAGAMENTO
// =========================

async function verificarPagamentoCadastro() {
  if (!solicitacaoCadastroToken) {
    mostrarMensagemCadastro(
      "msgPagamentoPix",
      "Solicitação não encontrada.",
      "erro"
    );
    return;
  }

  const res = await fetch(`/api/public/cadastro/${encodeURIComponent(solicitacaoCadastroToken)}`);
  const dados = await res.json();

  if (!res.ok) {
    mostrarMensagemCadastro(
      "msgPagamentoPix",
      dados.mensagem || "Erro ao consultar pagamento.",
      "erro"
    );
    return;
  }

  if (dados.pagamento_status !== "pago") {
    mostrarMensagemCadastro(
      "msgPagamentoPix",
      "Pagamento ainda não confirmado.",
      "erro"
    );
    return;
  }

  document.getElementById("cadastroEmailFinal").value =
    emailSolicitacaoCadastro;
  document.getElementById("cadastroNomeFinal").value =
    nomeSolicitacaoCadastro;

  mostrarEtapaCadastro("etapaCriarConta");
}

function copiarPixCadastro() {
  const campo = document.getElementById("pixCadastroCopiaCola");

  if (!campo.value.trim()) {
    mostrarMensagemCadastro(
      "msgPagamentoPix",
      "Nenhum PIX gerado.",
      "erro"
    );
    return;
  }

  navigator.clipboard.writeText(campo.value);

  mostrarMensagemCadastro(
    "msgPagamentoPix",
    "✅ PIX copiado com sucesso.",
    "sucesso"
  );
}

// =========================
// ETAPA 3: FINALIZAR CADASTRO
// =========================

async function finalizarCadastro() {
  limparMensagensCadastro();

  const nome = document.getElementById("cadastroNomeFinal");
  const email = document.getElementById("cadastroEmailFinal");
  const senha = document.getElementById("cadastroSenhaFinal");
  const confirmar = document.getElementById("cadastroConfirmarSenhaFinal");

  const valido = validarCamposObrigatorios(
    [nome, email, senha, confirmar],
    "msgCriarConta"
  );

  if (!valido) return;

  if (senha.value.length < 8) {
    senha.classList.add("campo-erro");
    mostrarMensagemCadastro(
      "msgCriarConta",
      "⚠️ A senha deve ter no mínimo 8 caracteres.",
      "erro"
    );
    return;
  }

  if (senha.value !== confirmar.value) {
    senha.classList.add("campo-erro");
    confirmar.classList.add("campo-erro");

    mostrarMensagemCadastro(
      "msgCriarConta",
      "⚠️ As senhas informadas são diferentes.",
      "erro"
    );
    return;
  }

  const res = await fetch("/api/public/finalizar-cadastro", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      solicitacao_token: solicitacaoCadastroToken,
      nome: nome.value.trim(),
      email: email.value.trim(),
      senha: senha.value,
      confirmar_senha: confirmar.value
    })
  });

  const dados = await res.json();

  if (!res.ok) {
    mostrarMensagemCadastro(
      "msgCriarConta",
      dados.mensagem || "Erro ao criar conta.",
      "erro"
    );
    return;
  }

  mostrarMensagemCadastro(
    "msgCriarConta",
    "✅ Conta criada com sucesso. Você já pode fazer login.",
    "sucesso"
  );

  setTimeout(() => {
    fecharModalCadastro();
  }, 1800);
}

// =========================
// QR CODE / PIX
// =========================

function gerarQrCodeCadastro(payloadPix) {
  const canvas = document.getElementById("pixCadastroQrCode");
  const placeholder = document.getElementById("pixCadastroPlaceholder");

  if (!payloadPix) {
    limparQrCodeCadastro();
    return;
  }

  placeholder.style.display = "none";

  QRCode.toCanvas(canvas, payloadPix, {
    width: 220,
    margin: 1
  });
}

function limparQrCodeCadastro() {
  const canvas = document.getElementById("pixCadastroQrCode");
  const placeholder = document.getElementById("pixCadastroPlaceholder");

  if (!canvas || !placeholder) return;

  const ctx = canvas.getContext("2d");
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  placeholder.style.display = "block";
}

const campoCpfCadastro =
  document.getElementById("cadastroCpf");

  if (campoCpfCadastro) {
    campoCpfCadastro.addEventListener("input", () => {
      campoCpfCadastro.value =
        aplicarMascaraCpf(campoCpfCadastro.value);

      campoCpfCadastro.classList.remove("campo-erro");

      limparMensagensCadastro();
    });
}

function toggleSenhaCadastro(idInput, botao) {
  const input = document.getElementById(idInput);

  if (input.type === "password") {
    input.type = "text";
    botao.innerHTML = "🙈";
  } else {
    input.type = "password";
    botao.innerHTML = "👁️";
  }
}


// =========================
// EVENTOS
// =========================

[
  "cadastroCpf",
  "cadastroEmail",
  "cadastroNome",
  "cadastroNomeFinal",
  "cadastroSenhaFinal",
  "cadastroConfirmarSenhaFinal"
].forEach(id => {
  const campo = document.getElementById(id);

  if (!campo) return;

  campo.addEventListener("input", () => {
    campo.classList.remove("campo-erro");
    limparMensagensCadastro();
  });
});

window.abrirModalCadastro = abrirModalCadastro;
window.fecharModalCadastro = fecharModalCadastro;
window.gerarPixCadastro = gerarPixCadastro;
window.copiarPixCadastro = copiarPixCadastro;
window.verificarPagamentoCadastro = verificarPagamentoCadastro;
window.finalizarCadastro = finalizarCadastro;
window.toggleSenhaCadastro = toggleSenhaCadastro;
