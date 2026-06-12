let dados = [];
let chart;

document.addEventListener("DOMContentLoaded", () => {
    carregarDados();

    document.getElementById("btnFiltrar")
        .addEventListener("click", filtrar);
});

async function carregarDados() {
    const res = await fetch("/api/financas");
    const raw = await res.json();

    console.log("📦 RAW API:", raw);

    // 🔥 CORRETO: usa estrutura real da API
    dados = raw.map(d => ({
        data: d.data,
        descricao: d.descricao,
        tipo: d.tipo,
        valor: Number(d.valor)
    }));

    console.log("✅ NORMALIZADO:", dados);

    preencherSelect();
    atualizar(dados);
}

function obterMes(dataStr) {
    const d = new Date(dataStr);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function preencherSelect() {
    const select = document.getElementById("filtroMes");

    select.innerHTML = `<option value="all">Todos os meses</option>`;

    const meses = [...new Set(dados.map(d => obterMes(d.data)))];

    meses.forEach(m => {
        select.innerHTML += `<option value="${m}">${m}</option>`;
    });
}

function atualizar(data) {
    const entradas = data
        .filter(d => d.tipo === "Entrada")
        .reduce((a, b) => a + b.valor, 0);

    const saidas = data
        .filter(d => d.tipo === "Saída")
        .reduce((a, b) => a + b.valor, 0);

    document.getElementById("totalEntradas").innerText = `R$ ${entradas}`;
    document.getElementById("totalSaidas").innerText = `R$ ${saidas}`;
    document.getElementById("saldo").innerText = `R$ ${entradas - saidas}`;

    const ctx = document.getElementById("grafico").getContext("2d");

    if (chart) chart.destroy();

    chart = new Chart(ctx, {
        type: "bar",
        data: {
            labels: data.map(d => d.descricao),
            datasets: [
                {
                    label: "Entradas",
                    data: data.map(d => d.tipo === "Entrada" ? d.valor : 0),
                    backgroundColor: "green"
                },
                {
                    label: "Saídas",
                    data: data.map(d => d.tipo === "Saída" ? d.valor : 0),
                    backgroundColor: "red"
                }
            ]
        }
    });
}

function filtrar() {
    const mes = document.getElementById("filtroMes").value;

    if (mes === "all") {
        atualizar(dados);
    } else {
        atualizar(dados.filter(d => obterMes(d.data) === mes));
    }
}
function toggleMenu() {
  document.getElementById("sidebar").classList.toggle("active");
}
window.toggleMenu = toggleMenu;

function abrirModalCadUser() {
  document.getElementById("modalCadUser").style.display = "flex";
}
function fecharModalCadUser() {
  document.getElementById("modalCadUser").style.display = "none";
}

function cadastrarUsuario() {

  if (!validarSenhas()) {
    return;
  }

  const nome = document.getElementById("nome").value;
  const email = document.getElementById("email").value;
  const senha = document.getElementById("senha").value;

  const sucesso = document.getElementById("cadastroSucesso");

  fetch("http://localhost:5000/usuarios", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ nome, email, senha })
  })
  .then(response => {
    if (!response.ok) {
      throw new Error("Erro no cadastro");
    }
    return response.text(); // 👈 mais seguro que json()
  })
  .then(() => {

    console.log("cadastro ok");

    sucesso.style.display = "block";

    document.getElementById("nome").value = "";
    document.getElementById("email").value = "";
    document.getElementById("senha").value = "";
    document.getElementById("confirmarSenha").value = "";

  })
  .catch(error => {
    console.error(error);
  });
}

function validarSenhas() {
  console.log("validando senhas...");

  const senha = document.getElementById("senha");
  const confirmar = document.getElementById("confirmarSenha");
  const erroSenha = document.getElementById("erroSenha");
  const msgCampos = document.getElementById("msgCamposVazios");

  const campos = document.querySelectorAll("input, select, textarea");

  let valido = true;

  // 🔥 valida campos vazios
  campos.forEach(campo => {
    if (campo.value.trim() === "") {
      campo.style.border = "1px solid red";
      valido = false;
    } else {
      campo.style.border = "1px solid #333";
    }
  });

  // 🚨 mensagem de campos vazios
  if (!valido) {
    msgCampos.style.display = "block";
    return false;
  } else {
    msgCampos.style.display = "none";
  }

  // 🔐 valida senha
  if (senha.value !== confirmar.value) {
    erroSenha.style.display = "block";

    senha.style.border = "1px solid red";
    confirmar.style.border = "1px solid red";

    return false;
  }

  // sucesso
  erroSenha.style.display = "none";

  senha.style.border = "1px solid #333";
  confirmar.style.border = "1px solid #333";

  return true;
}

function togglePassword() {
  const senha = document.getElementById("senha");
  const confirmar = document.getElementById("confirmarSenha");
  const btn = document.getElementById("togglePassword");

  const isPassword = senha.type === "password";

  // alterna tipo dos dois inputs
  senha.type = isPassword ? "text" : "password";
  confirmar.type = isPassword ? "text" : "password";

  // opcional: muda ícone
  btn.textContent = isPassword ? "🙈" : "👁️";
}