from flask import Flask, request, jsonify, render_template
from flask_cors import CORS
import json
import uuid
import os

# Procura os arquivos HTML dentro da pasta pages
app = Flask(__name__, template_folder="pages")
CORS(app)

USUARIOS_FILE = "usuarios.json"
LANCA_FILE = "banco.json"


# =========================
# PÁGINA INICIAL
# =========================
@app.route("/")
def index():
    return render_template("login.html")

# =========================
# HOME
# =========================
@app.route("/home")
def home():
    return render_template("home.html")

# =========================
# HELPERS USUÁRIOS
# =========================
def ler_usuarios():
    try:
        with open(USUARIOS_FILE, "r", encoding="utf-8") as f:
            return json.load(f)
    except Exception:
        return []


def salvar_usuarios(dados):
    with open(USUARIOS_FILE, "w", encoding="utf-8") as f:
        json.dump(dados, f, indent=4, ensure_ascii=False)


# =========================
# CADASTRAR USUÁRIO
# =========================
@app.route("/usuarios", methods=["POST"])
def usuarios():
    data = request.get_json()

    usuarios = ler_usuarios()
    usuarios.append(data)

    salvar_usuarios(usuarios)

    return jsonify({
        "success": True,
        "mensagem": "Usuário salvo!"
    })


# =========================
# LOGIN
# =========================
@app.route("/login", methods=["POST"])
def login():

    dados = request.get_json()

    email = dados.get("email")
    senha = dados.get("password")

    usuarios = ler_usuarios()

    for usuario in usuarios:

        if (
            usuario.get("email") == email and
            usuario.get("senha") == senha
        ):

            return jsonify({
                "success": True
            })

    return jsonify({
        "success": False
    })

# =========================
# HELPERS LANÇAMENTOS
# =========================
def ler_lancamentos():
    try:
        print("Lendo arquivo:", os.path.abspath(LANCA_FILE))

        with open(LANCA_FILE, "r", encoding="latin-1") as f:
            dados = json.load(f)

        print("Registros encontrados:", len(dados))

        return dados

    except Exception as e:
        print("ERRO:", e)
        return []

def salvar_lancamentos(dados):
    with open(LANCA_FILE, "w", encoding="utf-8") as f:
        json.dump(dados, f, indent=4, ensure_ascii=False)


# =========================
# LISTAR LANÇAMENTOS
# =========================
@app.route("/lancamentos", methods=["GET"])
def get_lancamentos():
    return jsonify(ler_lancamentos())


# =========================
# ADICIONAR LANÇAMENTO
# =========================
@app.route("/lancamentos", methods=["POST"])
def add_lancamento():

    dados = ler_lancamentos()
    novo = request.get_json()

    if not novo:
        return jsonify({
            "status": "erro",
            "mensagem": "Dados inválidos"
        }), 400

    novo["id"] = str(uuid.uuid4())

    dados.append(novo)

    salvar_lancamentos(dados)

    return jsonify({
        "status": "ok"
    })


# =========================
# EXCLUIR LANÇAMENTO
# =========================
@app.route("/lancamentos/<id>", methods=["DELETE"])
def deletar(id):

    dados = ler_lancamentos()

    novos = [d for d in dados if d.get("id") != id]

    salvar_lancamentos(novos)

    return jsonify({
        "status": "ok"
    })


# =========================
# EDITAR LANÇAMENTO
# =========================
@app.route("/lancamentos/<id>", methods=["PUT"])
def editar(id):

    dados = ler_lancamentos()
    atualizado = request.get_json()

    for d in dados:
        if d.get("id") == id:
            d.update(atualizado)
            break

    salvar_lancamentos(dados)

    return jsonify({
        "status": "ok"
    })


# =========================
# EXECUÇÃO
# =========================
if __name__ == "__main__":
    app.run(debug=True)