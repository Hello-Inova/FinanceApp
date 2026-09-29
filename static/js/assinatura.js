let metodoSelecionado = "CREDIT_CARD";
const form = document.getElementById("subscriptionForm");
const cardFields = document.getElementById("cardFields");
const message = document.getElementById("subscriptionMessage");
const submitButton = document.getElementById("subscribeButton");

function moeda(centavos) { return (Number(centavos) / 100).toLocaleString("pt-BR", { style:"currency", currency:"BRL" }); }
function selecionarMetodo(metodo) {
  metodoSelecionado = metodo;
  document.querySelectorAll(".method-card").forEach(botao => botao.classList.toggle("active", botao.dataset.method === metodo));
  cardFields.hidden = metodo !== "CREDIT_CARD";
  submitButton.textContent = metodo === "CREDIT_CARD" ? "Assinar com cartão" : metodo === "PIX" ? "Gerar PIX mensal" : "Gerar boleto mensal";
  message.textContent = "";
}
async function carregarAssinatura() {
  const resposta = await fetch("/api/assinatura", { loading:false });
  const dados = await resposta.json();
  document.getElementById("planPrice").textContent = moeda(dados.valor_centavos);
  if (dados.status === "ativo" || dados.status === "legado") {
    form.hidden = true; document.getElementById("subscriptionSuccess").hidden = false;
  } else if (!dados.gateway_disponivel) {
    message.textContent = "Pagamentos temporariamente indisponíveis. Tente novamente em instantes.";
    submitButton.disabled = true;
  }
}
function mostrarResultado(dados) {
  const result = document.getElementById("paymentResult");
  result.hidden = false;
  document.getElementById("pixResult").hidden = true;
  document.getElementById("boletoResult").hidden = true;
  if (dados.metodo === "PIX" && dados.pix?.payload) {
    document.getElementById("pixResult").hidden = false;
    document.getElementById("pixPayload").value = dados.pix.payload;
    QRCode.toCanvas(document.getElementById("pixQrCode"), dados.pix.payload, { width:200, margin:1 });
  }
  if (dados.metodo === "BOLETO") {
    document.getElementById("boletoResult").hidden = false;
    const link = document.getElementById("boletoLink");
    link.href = dados.bank_slip_url || dados.invoice_url || "#";
  }
  if (dados.status === "ativo") window.location.assign("/home");
}
form.addEventListener("submit", async event => {
  event.preventDefault(); message.textContent = "";
  const validade = document.getElementById("cardExpiry").value.split("/").map(parte => parte.trim());
  const payload = { metodo: metodoSelecionado };
  if (metodoSelecionado === "CREDIT_CARD") Object.assign(payload, {
    titular: document.getElementById("cardHolder").value, numero_cartao: document.getElementById("cardNumber").value,
    validade_mes: validade[0] || "", validade_ano: validade[1] || "", ccv: document.getElementById("cardCcv").value,
    cep: document.getElementById("holderCep").value, numero_endereco: document.getElementById("holderNumber").value,
    telefone: document.getElementById("holderPhone").value,
  });
  submitButton.disabled = true;
  try {
    const resposta = await fetch("/api/assinatura", { method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify(payload) });
    const dados = await resposta.json();
    if (!resposta.ok) throw new Error(dados.mensagem || "Não foi possível criar a assinatura.");
    mostrarResultado(dados);
    message.style.color = "#86efac"; message.textContent = dados.status === "ativo" ? "Pagamento confirmado." : "Cobrança criada. Aguardando confirmação.";
  } catch (erro) { message.style.color = "#f87171"; message.textContent = erro.message; }
  finally { submitButton.disabled = false; }
});
document.querySelectorAll(".method-card").forEach(botao => botao.addEventListener("click", () => selecionarMetodo(botao.dataset.method)));
document.getElementById("copyPix").addEventListener("click", async () => { await navigator.clipboard.writeText(document.getElementById("pixPayload").value); message.textContent = "PIX copiado."; });
document.getElementById("cardNumber").addEventListener("input", e => { e.target.value = e.target.value.replace(/\D/g, "").slice(0,19).replace(/(.{4})/g,"$1 ").trim(); });
document.getElementById("cardExpiry").addEventListener("input", e => { const v=e.target.value.replace(/\D/g,"").slice(0,6); e.target.value=v.length>2?`${v.slice(0,2)}/${v.slice(2)}`:v; });
selecionarMetodo("CREDIT_CARD");
carregarAssinatura().catch(() => { message.textContent = "Não foi possível carregar os dados do plano."; });
