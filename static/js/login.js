let solicitacaoCadastroId = null;
let emailSolicitacaoCadastro = "";
let intervaloPagamento = null;

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
      window.location.href = "/home";
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

    if (!solicitacaoCadastroId) return;

    const res =
        await fetch(
            `/api/public/cadastro/${solicitacaoCadastroId}`
        );

    const dados =
        await res.json();

    if (!res.ok) return;

    if (dados.solicitacao.status === "pago") {

      clearInterval(intervaloPagamento);

      document.getElementById(
          "cadastroEmailFinal"
      ).value = emailSolicitacaoCadastro;

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
  solicitacaoCadastroId = null;
  emailSolicitacaoCadastro = "";

  limparModalCadastro();

  document.getElementById("modalCadastroPix").style.display = "flex";
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

  const valido = validarCamposObrigatorios(
    [cpf, email],
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

    solicitacaoCadastroId = dados.solicitacao_id;
    emailSolicitacaoCadastro = email.value.trim();

    if (
      dados.solicitacao &&
      dados.solicitacao.status === "pago"
    ) {
      document.getElementById("cadastroEmailFinal").value =
        emailSolicitacaoCadastro;

      mostrarEtapaCadastro("etapaCriarConta");

      return;
    }

    const pix = dados.pix || {};

    const payloadPix = gerarPayloadPix({
      chave: pix.chave_pix || "",
      nome: pix.nome_recebedor || "RECEBEDOR",
      cidade: "SAO PAULO"
    });

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
  if (!solicitacaoCadastroId) {
    mostrarMensagemCadastro(
      "msgPagamentoPix",
      "Solicitação não encontrada.",
      "erro"
    );
    return;
  }

  const res = await fetch(`/api/public/cadastro/${solicitacaoCadastroId}`);
  const dados = await res.json();

  if (!res.ok) {
    mostrarMensagemCadastro(
      "msgPagamentoPix",
      dados.mensagem || "Erro ao consultar pagamento.",
      "erro"
    );
    return;
  }

  const solicitacao = dados.solicitacao;

  if (solicitacao.status !== "pago") {
    mostrarMensagemCadastro(
      "msgPagamentoPix",
      "Pagamento ainda não confirmado.",
      "erro"
    );
    return;
  }

  document.getElementById("cadastroEmailFinal").value =
    emailSolicitacaoCadastro;

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
      solicitacao_id: solicitacaoCadastroId,
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
