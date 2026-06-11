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