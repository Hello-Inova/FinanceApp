function validarEmail(email) { return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email); }
function limparCpf(cpf) { return cpf.replace(/\D/g, ""); }
function aplicarMascaraCpf(valor) {
  return valor.replace(/\D/g, "").slice(0, 11).replace(/(\d{3})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d)/, "$1.$2").replace(/(\d{3})(\d{1,2})$/, "$1-$2");
}
function validarCpf(valor) {
  const cpf = limparCpf(valor);
  if (cpf.length !== 11 || /^(\d)\1+$/.test(cpf)) return false;
  const digito = limite => {
    let soma = 0;
    for (let i = 0; i < limite; i += 1) soma += Number(cpf[i]) * (limite + 1 - i);
    const resto = (soma * 10) % 11;
    return resto === 10 ? 0 : resto;
  };
  return digito(9) === Number(cpf[9]) && digito(10) === Number(cpf[10]);
}
function mostrarMensagemCadastro(texto, tipo = "erro") {
  const msg = document.getElementById("msgCriarConta");
  msg.className = `msg-modal ${tipo}`;
  msg.textContent = texto;
}
function limparCadastro() {
  document.getElementById("cadastroForm").reset();
  document.querySelectorAll("#cadastroForm .campo-erro").forEach(campo => campo.classList.remove("campo-erro"));
  const msg = document.getElementById("msgCriarConta");
  msg.className = "msg-modal";
  msg.textContent = "";
}
async function carregarOfertaTeste() {
  try {
    const resposta = await fetch("/api/public/pix", { loading: false });
    const dados = await resposta.json();
    const dias = Number(dados.periodo_teste_dias || 0);
    document.getElementById("periodoTesteCadastro").textContent = dias > 0
      ? `${dias} dia${dias === 1 ? "" : "s"}` : "Acesso mediante assinatura";
  } catch (_) {
    document.getElementById("periodoTesteCadastro").textContent = "Teste gratuito";
  }
}
function abrirModalCadastro() {
  limparCadastro();
  document.getElementById("modalCadastroPix").style.display = "flex";
  carregarOfertaTeste();
  window.setTimeout(() => document.getElementById("cadastroNome")?.focus(), 50);
}
function fecharModalCadastro() {
  document.getElementById("modalCadastroPix").style.display = "none";
  limparCadastro();
}
function togglePassword() {
  const senha = document.getElementById("password");
  senha.type = senha.type === "password" ? "text" : "password";
}
function toggleSenhaCadastro(idInput, botao) {
  const input = document.getElementById(idInput);
  const mostrar = input.type === "password";
  input.type = mostrar ? "text" : "password";
  botao.textContent = mostrar ? "🙈" : "👁️";
}
document.getElementById("loginForm").addEventListener("submit", async event => {
  event.preventDefault();
  const errorMessage = document.getElementById("error-message");
  errorMessage.style.display = "none";
  try {
    const response = await fetch("/login", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: document.getElementById("email").value, password: document.getElementById("password").value }),
    });
    const resultado = await response.json();
    if (!resultado.success) throw new Error("Credenciais inválidas");
    sessionStorage.removeItem("financeapp-session-v1");
    sessionStorage.removeItem("financeapp-session-v2");
    window.location.href = resultado.must_change_password ? "/trocar-senha" : (resultado.redirect || "/home");
  } catch (_) { errorMessage.style.display = "block"; }
});
document.getElementById("cadastroForm").addEventListener("submit", async event => {
  event.preventDefault();
  const campos = {
    nome: document.getElementById("cadastroNome"), cpf: document.getElementById("cadastroCpf"),
    email: document.getElementById("cadastroEmail"), senha: document.getElementById("cadastroSenhaFinal"),
    confirmar: document.getElementById("cadastroConfirmarSenhaFinal"),
  };
  Object.values(campos).forEach(campo => campo.classList.remove("campo-erro"));
  if (Object.values(campos).some(campo => !campo.value.trim())) return mostrarMensagemCadastro("⚠️ Preencha todos os campos obrigatórios.");
  if (!validarCpf(campos.cpf.value)) { campos.cpf.classList.add("campo-erro"); return mostrarMensagemCadastro("⚠️ Informe um CPF válido."); }
  if (!validarEmail(campos.email.value.trim())) { campos.email.classList.add("campo-erro"); return mostrarMensagemCadastro("⚠️ Informe um e-mail válido."); }
  if (campos.senha.value.length < 8 || campos.senha.value !== campos.confirmar.value) {
    campos.senha.classList.add("campo-erro"); campos.confirmar.classList.add("campo-erro");
    return mostrarMensagemCadastro("⚠️ Use ao menos 8 caracteres e confirme a mesma senha.");
  }
  try {
    const resposta = await fetch("/api/public/cadastro", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ nome: campos.nome.value.trim(), cpf: limparCpf(campos.cpf.value), email: campos.email.value.trim(), senha: campos.senha.value, confirmar_senha: campos.confirmar.value }),
    });
    const dados = await resposta.json();
    if (!resposta.ok) throw new Error(dados.mensagem || "Não foi possível criar a conta.");
    sessionStorage.removeItem("financeapp-session-v2");
    mostrarMensagemCadastro("✅ Conta criada! Abrindo seu FinanceApp...", "sucesso");
    window.setTimeout(() => window.location.assign(dados.redirect || "/home"), 700);
  } catch (erro) { mostrarMensagemCadastro(erro.message || "Não foi possível criar a conta."); }
});
document.getElementById("cadastroCpf")?.addEventListener("input", event => { event.target.value = aplicarMascaraCpf(event.target.value); });
document.querySelectorAll("#cadastroForm input").forEach(campo => campo.addEventListener("input", () => campo.classList.remove("campo-erro")));
document.addEventListener("keydown", event => { if (event.key === "Escape") fecharModalCadastro(); });
window.abrirModalCadastro = abrirModalCadastro;
window.fecharModalCadastro = fecharModalCadastro;
window.togglePassword = togglePassword;
window.toggleSenhaCadastro = toggleSenhaCadastro;
