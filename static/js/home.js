const API_URL = window.location.origin;
let toastTimer = null;
let ultimoFoco = null;
let lancamentos = [];
let paginaDesktop = 1;
const itensPorPaginaDesktop = 5;
const datasSelecionadasDesktop = new Set();

function formatarMoeda(valor) { return Number(valor || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" }); }
function dataIso(valor) { return String(valor || "").slice(0, 10); }
function formatarData(valor) { const [ano, mes, dia] = dataIso(valor).split("-"); return ano && mes && dia ? `${dia}/${mes}/${ano}` : "—"; }
async function respostaJson(resposta) { const dados = await resposta.json().catch(() => ({})); if (!resposta.ok) throw new Error(dados.mensagem || "Não foi possível concluir a operação."); return dados; }
function mostrarToast(mensagem, erro = false) { const toast = document.getElementById("toast"); clearTimeout(toastTimer); toast.textContent = `${erro ? "⚠" : "✓"} ${mensagem}`; toast.classList.toggle("error", erro); toast.classList.add("show"); toastTimer = setTimeout(() => toast.classList.remove("show"), 3500); }

function preencherMesesDesktop() {
  const select = document.getElementById("filtroMesDesktop");
  if (!select) return;
  const atual = select.value;
  const meses = [...new Set(lancamentos.map(i => dataIso(i.data).slice(0, 7)).filter(Boolean))].sort().reverse();
  select.innerHTML = '<option value="">Todos os meses</option>';
  meses.forEach(valor => {
    const [ano, mes] = valor.split("-");
    const option = document.createElement("option");
    option.value = valor;
    option.textContent = new Intl.DateTimeFormat("pt-BR", { month: "long", year: "numeric" }).format(new Date(Number(ano), Number(mes) - 1, 1));
    select.appendChild(option);
  });
  select.value = meses.includes(atual) ? atual : "";
}

function atualizarResumoDatasDesktop() {
  const resumo = document.getElementById("filtroDataResumoDesktop");
  if (!resumo) return;
  if (!datasSelecionadasDesktop.size) resumo.textContent = "Todas as datas";
  else if (datasSelecionadasDesktop.size === 1) resumo.textContent = formatarData([...datasSelecionadasDesktop][0]);
  else resumo.textContent = `${datasSelecionadasDesktop.size} datas selecionadas`;
}

function preencherDatasDesktop() {
  const opcoes = document.getElementById("filtroDataOpcoesDesktop");
  if (!opcoes) return;
  const mes = document.getElementById("filtroMesDesktop")?.value || "";
  const datas = [...new Set(lancamentos.map(i => dataIso(i.data)).filter(data => data && (!mes || data.startsWith(mes))))].sort().reverse();
  [...datasSelecionadasDesktop].forEach(data => { if (!datas.includes(data)) datasSelecionadasDesktop.delete(data); });
  opcoes.replaceChildren();
  if (!datas.length) {
    const vazio = document.createElement("span");
    vazio.className = "date-filter-empty";
    vazio.textContent = "Nenhuma data disponível";
    opcoes.appendChild(vazio);
  }
  datas.forEach(data => {
    const label = document.createElement("label");
    const input = document.createElement("input");
    const texto = document.createElement("span");
    input.type = "checkbox";
    input.value = data;
    input.checked = datasSelecionadasDesktop.has(data);
    input.setAttribute("aria-label", formatarData(data));
    texto.textContent = formatarData(data);
    input.addEventListener("change", () => {
      input.checked ? datasSelecionadasDesktop.add(data) : datasSelecionadasDesktop.delete(data);
      paginaDesktop = 1;
      atualizarResumoDatasDesktop();
      renderizarTabelaDesktop();
    });
    label.append(input, texto);
    opcoes.appendChild(label);
  });
  atualizarResumoDatasDesktop();
}

function filtrarLancamentosDesktop() {
  const pesquisa = (document.getElementById("iptPesquisaDesktop")?.value || "").trim().toLocaleLowerCase("pt-BR");
  const mes = document.getElementById("filtroMesDesktop")?.value || "";
  return lancamentos.filter(item => {
    const data = dataIso(item.data);
    const texto = [item.descricao, item.obs, item.tipo, formatarMoeda(item.valor), formatarData(item.data)].join(" ").toLocaleLowerCase("pt-BR");
    return (!pesquisa || texto.includes(pesquisa)) && (!mes || data.startsWith(mes)) && (!datasSelecionadasDesktop.size || datasSelecionadasDesktop.has(data));
  });
}

function celula(texto, classe = "") { const td = document.createElement("td"); td.textContent = texto; if (classe) td.className = classe; return td; }

function renderizarTabelaDesktop() {
  const tabela = document.getElementById("tabelaDesktop");
  if (!tabela) return;
  const filtrados = filtrarLancamentosDesktop();
  const totalPaginas = Math.ceil(filtrados.length / itensPorPaginaDesktop) || 1;
  paginaDesktop = Math.min(paginaDesktop, totalPaginas);
  const pagina = filtrados.slice((paginaDesktop - 1) * itensPorPaginaDesktop, paginaDesktop * itensPorPaginaDesktop);
  const saldo = filtrados.reduce((total, item) => total + (item.tipo === "Entrada" ? Number(item.valor || 0) : -Number(item.valor || 0)), 0);
  tabela.replaceChildren();
  if (!pagina.length) {
    const tr = tabela.insertRow(); const td = tr.insertCell(); td.colSpan = 6;
    td.innerHTML = '<div class="empty-table"><strong>Nenhum lançamento encontrado</strong><span>Ajuste os filtros ou crie um novo lançamento.</span></div>';
  }
  pagina.forEach(item => {
    const tr = document.createElement("tr");
    tr.appendChild(celula(formatarData(item.data)));
    const tipo = celula("", "type-column"); const badge = document.createElement("span");
    badge.className = `tipo-badge ${item.tipo === "Entrada" ? "tipo-entrada" : "tipo-saida"}`; badge.textContent = item.tipo; tipo.appendChild(badge); tr.appendChild(tipo);
    tr.appendChild(celula(item.descricao || "Sem descrição"));
    tr.appendChild(celula(formatarMoeda(item.valor), item.tipo === "Entrada" ? "valor-entrada" : "valor-saida"));
    tr.appendChild(celula(item.obs || "—", "home-note-cell"));
    const acoes = celula("", "home-actions-cell"); const link = document.createElement("a");
    link.className = "home-details-link"; link.href = item.tipo === "Entrada" ? "/financas/entradas" : "/financas/saidas"; link.textContent = "Abrir →";
    link.setAttribute("aria-label", `Abrir detalhes de ${item.descricao || "lançamento"}`); acoes.appendChild(link); tr.appendChild(acoes); tabela.appendChild(tr);
  });
  document.getElementById("contadorLancamentosDesktop").textContent = `${filtrados.length} ${filtrados.length === 1 ? "lançamento encontrado" : "lançamentos encontrados"}`;
  document.getElementById("totalFiltradoDesktop").textContent = formatarMoeda(saldo);
  document.getElementById("paginaInfoDesktop").textContent = `Página ${paginaDesktop} de ${totalPaginas}`;
  document.getElementById("paginaAnteriorDesktop").disabled = paginaDesktop === 1;
  document.getElementById("proximaPaginaDesktop").disabled = paginaDesktop === totalPaginas;
}

function limparFiltrosDesktop() {
  document.getElementById("iptPesquisaDesktop").value = ""; document.getElementById("filtroMesDesktop").value = "";
  datasSelecionadasDesktop.clear(); paginaDesktop = 1; preencherDatasDesktop(); renderizarTabelaDesktop();
}

async function carregarResumo() {
  try {
    lancamentos = await respostaJson(await fetch("/lancamentos", { loadingMessage: "Carregando suas finanças..." }));
    const entradas = lancamentos.filter(i => i.tipo === "Entrada").reduce((s, i) => s + Number(i.valor || 0), 0);
    const saidas = lancamentos.filter(i => i.tipo === "Saída").reduce((s, i) => s + Number(i.valor || 0), 0);
    document.getElementById("totalEntradas").textContent = formatarMoeda(entradas); document.getElementById("totalSaidas").textContent = formatarMoeda(saidas); document.getElementById("saldo").textContent = formatarMoeda(entradas - saidas);
    preencherMesesDesktop(); preencherDatasDesktop(); renderizarTabelaDesktop();
  } catch (erro) {
    const tabela = document.getElementById("tabelaDesktop");
    if (tabela) {
      tabela.replaceChildren();
      const tr = tabela.insertRow(); const td = tr.insertCell(); const vazio = document.createElement("div"); const titulo = document.createElement("strong"); const mensagem = document.createElement("span");
      td.colSpan = 6; vazio.className = "empty-table"; titulo.textContent = "Erro ao carregar"; mensagem.textContent = erro.message; vazio.append(titulo, mensagem); td.appendChild(vazio);
    }
    mostrarToast(erro.message, true);
  } finally { document.querySelectorAll(".loading-value").forEach(el => el.classList.remove("loading-value")); }
}

function abrirModalNovoRegistro() {
  ultimoFoco = document.activeElement; limparCamposNovoRegistro(); document.getElementById("novoData").value = new Date().toISOString().slice(0, 10);
  document.getElementById("modalNovoRegistro").style.display = "flex"; document.body.style.overflow = "hidden"; document.getElementById("novoData").focus();
}
function limparCamposNovoRegistro(preservar = false) {
  const data = document.getElementById("novoData").value; const tipo = document.getElementById("novoTipo").value;
  document.getElementById("novoData").value = preservar ? data : ""; document.getElementById("novoTipo").value = preservar ? tipo : "Entrada";
  ["novoDescricao", "novoValor", "novoObs"].forEach(id => { document.getElementById(id).value = ""; });
  document.querySelectorAll("#modalNovoRegistro .campo-erro").forEach(el => el.classList.remove("campo-erro")); document.getElementById("erroCamposNull").style.display = "none"; document.getElementById("msgNovoRegistro").style.display = "none";
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
  document.getElementById("iptPesquisaDesktop")?.addEventListener("input", () => { paginaDesktop = 1; renderizarTabelaDesktop(); });
  document.getElementById("filtroMesDesktop")?.addEventListener("change", () => { paginaDesktop = 1; datasSelecionadasDesktop.clear(); preencherDatasDesktop(); renderizarTabelaDesktop(); });
  document.getElementById("limparFiltrosDesktop")?.addEventListener("click", limparFiltrosDesktop);
  document.getElementById("paginaAnteriorDesktop")?.addEventListener("click", () => { if (paginaDesktop > 1) { paginaDesktop -= 1; renderizarTabelaDesktop(); } });
  document.getElementById("proximaPaginaDesktop")?.addEventListener("click", () => { const total = Math.ceil(filtrarLancamentosDesktop().length / itensPorPaginaDesktop) || 1; if (paginaDesktop < total) { paginaDesktop += 1; renderizarTabelaDesktop(); } });
  document.addEventListener("click", e => { const filtro = document.getElementById("filtroDataDesktop"); if (filtro?.open && !filtro.contains(e.target)) filtro.removeAttribute("open"); });
  carregarResumo();
});
