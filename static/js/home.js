const API_URL = window.location.origin;
let toastTimer = null;
let ultimoFoco = null;

function formatarMoeda(valor) { return Number(valor || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" }); }
async function respostaJson(resposta) { const dados = await resposta.json().catch(() => ({})); if (!resposta.ok) throw new Error(dados.mensagem || "Não foi possível concluir a operação."); return dados; }
function mostrarToast(mensagem, erro = false) { const toast = document.getElementById("toast"); clearTimeout(toastTimer); toast.textContent = `${erro ? "⚠" : "✓"} ${mensagem}`; toast.classList.toggle("error", erro); toast.classList.add("show"); toastTimer = setTimeout(() => toast.classList.remove("show"), 3500); }

async function carregarResumo() {
  try {
    const dados = await respostaJson(await fetch("/lancamentos", { loading: false }));
    const entradas = dados.filter(i => i.tipo === "Entrada").reduce((s, i) => s + Number(i.valor || 0), 0);
    const saidas = dados.filter(i => i.tipo === "Saída").reduce((s, i) => s + Number(i.valor || 0), 0);
    document.getElementById("totalEntradas").textContent = formatarMoeda(entradas);
    document.getElementById("totalSaidas").textContent = formatarMoeda(saidas);
    document.getElementById("saldo").textContent = formatarMoeda(entradas - saidas);
  } catch (erro) { mostrarToast(erro.message, true); }
  finally { document.querySelectorAll(".loading-value").forEach(el => el.classList.remove("loading-value")); }
}

function abrirModalNovoRegistro() {
  ultimoFoco = document.activeElement;
  limparCamposNovoRegistro();
  document.getElementById("novoData").value = new Date().toISOString().slice(0, 10);
  document.getElementById("modalNovoRegistro").style.display = "flex";
  document.body.style.overflow = "hidden";
  document.getElementById("novoData").focus();
}
function limparCamposNovoRegistro(preservar = false) {
  const data = document.getElementById("novoData").value;
  const tipo = document.getElementById("novoTipo").value;
  document.getElementById("novoData").value = preservar ? data : "";
  document.getElementById("novoTipo").value = preservar ? tipo : "Entrada";
  ["novoDescricao", "novoValor", "novoObs"].forEach(id => { document.getElementById(id).value = ""; });
  document.querySelectorAll("#modalNovoRegistro .campo-erro").forEach(el => el.classList.remove("campo-erro"));
  document.getElementById("erroCamposNull").style.display = "none";
  document.getElementById("msgNovoRegistro").style.display = "none";
}
function fecharModalNovoRegistro() { document.getElementById("modalNovoRegistro").style.display = "none"; document.body.style.overflow = ""; ultimoFoco?.focus?.(); }
function validarNovoRegistro() {
  const ids = ["novoData", "novoTipo", "novoDescricao", "novoValor"];
  const invalidos = ids.map(id => document.getElementById(id)).filter(c => !c.value.trim() || (c.id === "novoValor" && Number(c.value) <= 0));
  invalidos.forEach(c => c.classList.add("campo-erro"));
  if (invalidos.length) { document.getElementById("erroCamposNull").style.display = "block"; invalidos[0].focus(); return null; }
  return { data: novoData.value, tipo: novoTipo.value, descricao: novoDescricao.value.trim(), valor: Number(novoValor.value), obs: novoObs.value.trim() };
}
async function enviarNovoRegistro(preservar) {
  const dados = validarNovoRegistro(); if (!dados) return;
  try {
    await respostaJson(await fetch(`${API_URL}/lancamentos`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(dados), loadingMessage: "Salvando lançamento..." }));
    if (preservar) { limparCamposNovoRegistro(true); msgNovoRegistro.style.display = "block"; novoDescricao.focus(); } else fecharModalNovoRegistro();
    await carregarResumo(); mostrarToast("Lançamento salvo com sucesso.");
  } catch (erro) { erroCamposNull.textContent = erro.message; erroCamposNull.style.display = "block"; }
}
function salvarNovoRegistro() { return enviarNovoRegistro(false); }
function registrarOutro() { return enviarNovoRegistro(true); }

window.abrirModalNovoRegistro = abrirModalNovoRegistro; window.fecharModalNovoRegistro = fecharModalNovoRegistro; window.salvarNovoRegistro = salvarNovoRegistro; window.registrarOutro = registrarOutro;
window.addEventListener("DOMContentLoaded", () => {
  ["novoData", "novoTipo", "novoDescricao", "novoValor"].forEach(id => document.getElementById(id).addEventListener("input", e => { e.currentTarget.classList.remove("campo-erro"); erroCamposNull.style.display = "none"; }));
  document.getElementById("modalNovoRegistro").addEventListener("mousedown", e => { if (e.target.id === "modalNovoRegistro") fecharModalNovoRegistro(); });
  carregarResumo();
});
