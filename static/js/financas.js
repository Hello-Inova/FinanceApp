const API_URL = window.location.origin;

let dados = [];
let chart;

// =========================
// UTIL
// =========================
function formatarMoeda(valor) {
    return Number(valor || 0).toLocaleString("pt-BR", {
        style: "currency",
        currency: "BRL"
    });
}

function obterMes(dataStr) {
    const d = new Date(dataStr);

    return `${d.getFullYear()}-${String(
        d.getMonth() + 1
    ).padStart(2, "0")}`;
}

// =========================
// CARREGAR DADOS
// =========================
async function carregarDados() {

    try {

        const res = await fetch(`${API_URL}/api/financas`);
        dados = await res.json();

        dados = dados.map(item => ({
            ...item,
            valor: Number(item.valor || 0)
        }));

        preencherSelect();
        atualizar(dados);

    } catch (err) {
        console.error("Erro ao carregar finanças:", err);
    }

}

// =========================
// FILTRO
// =========================
function preencherSelect() {

    const select =
        document.getElementById("filtroMes");

    select.innerHTML =
        `<option value="all">Todos os meses</option>`;

    const meses = [
        ...new Set(
            dados.map(d => obterMes(d.data))
        )
    ];

    meses.sort().reverse();

    meses.forEach(mes => {

        select.innerHTML += `
            <option value="${mes}">
                ${mes}
            </option>
        `;

    });

}

function filtrar() {

    const mes =
        document.getElementById("filtroMes").value;

    if (mes === "all") {
        atualizar(dados);
        return;
    }

    const filtrados = dados.filter(
        d => obterMes(d.data) === mes
    );

    atualizar(filtrados);

}

// =========================
// DASHBOARD
// =========================
function atualizar(lista) {

    const entradas = lista
        .filter(d =>
            String(d.tipo).toLowerCase() === "entrada"
        )
        .reduce(
            (acc, item) => acc + Number(item.valor),
            0
        );

    const saidas = lista
        .filter(d => {
            const tipo =
                String(d.tipo).toLowerCase();

            return tipo === "saída" ||
                   tipo === "saida";
        })
        .reduce(
            (acc, item) => acc + Number(item.valor),
            0
        );

    totalEntradas.innerText =
        formatarMoeda(entradas);

    totalSaidas.innerText =
        formatarMoeda(saidas);

    saldo.innerText =
        formatarMoeda(entradas - saidas);

    const ctx =
        document
            .getElementById("grafico")
            .getContext("2d");

    if (chart) {
        chart.destroy();
    }

    chart = new Chart(ctx, {
        type: "bar",
        data: {
            labels: lista.map(
                item => item.descricao
            ),
            datasets: [
                {
                    label: "Entradas",
                    data: lista.map(item => {

                        const tipo =
                            String(item.tipo)
                            .toLowerCase();

                        return tipo === "entrada"
                            ? item.valor
                            : 0;

                    }),
                    backgroundColor: "green"
                },
                {
                    label: "Saídas",
                    data: lista.map(item => {

                        const tipo =
                            String(item.tipo)
                            .toLowerCase();

                        return (
                            tipo === "saída" ||
                            tipo === "saida"
                        )
                            ? item.valor
                            : 0;

                    }),
                    backgroundColor: "red"
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false
        }
    });

}

// =========================
// MENU
// =========================
function toggleMenu() {

    document
        .getElementById("sidebar")
        ?.classList.toggle("active");

}

// =========================
// CADASTRO USUÁRIO
// =========================
function abrirModalCadUser() {
    modalCadUser.style.display = "flex";
}

function fecharModalCadUser() {
    modalCadUser.style.display = "none";
}

function togglePassword() {

    const show =
        senha.type === "password";

    senha.type =
        show ? "text" : "password";

    confirmarSenha.type =
        show ? "text" : "password";

}

function validarSenhas() {

    if (
        senha.value.trim() === "" ||
        confirmarSenha.value.trim() === ""
    ) {
        return false;
    }

    if (
        senha.value !==
        confirmarSenha.value
    ) {

        erroSenha.style.display = "block";
        return false;

    }

    erroSenha.style.display = "none";

    return true;

}

async function cadastrarUsuario() {

    if (!validarSenhas()) {
        return;
    }

    try {

        await fetch(`${API_URL}/usuarios`, {
            method: "POST",
            headers: {
                "Content-Type":
                    "application/json"
            },
            body: JSON.stringify({
                nome: nome.value,
                email: email.value,
                senha: senha.value
            })
        });

        cadastroSucesso.style.display =
            "block";

        nome.value = "";
        email.value = "";
        senha.value = "";
        confirmarSenha.value = "";

    } catch (err) {

        console.error(err);

    }

}

// =========================
// EXPORT GLOBAL
// =========================
window.toggleMenu = toggleMenu;
window.abrirModalCadUser = abrirModalCadUser;
window.fecharModalCadUser = fecharModalCadUser;
window.togglePassword = togglePassword;
window.cadastrarUsuario = cadastrarUsuario;

// =========================
// INIT
// =========================
document.addEventListener(
    "DOMContentLoaded",
    () => {

        carregarDados();

        document
            .getElementById("btnFiltrar")
            ?.addEventListener(
                "click",
                filtrar
            );

    }
);