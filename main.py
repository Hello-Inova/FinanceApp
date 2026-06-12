from flask import Flask, request, jsonify, render_template, send_from_directory
from flask_cors import CORS
import json
import uuid
import os

app = Flask(
    __name__,
    template_folder="pages",
    static_folder="static"
)

CORS(app)

USUARIOS_FILE = "usuarios.json"
LANCA_FILE = "banco.json"


# =========================
# GARANTE ARQUIVOS
# =========================
def garantir_arquivo(file):
    if not os.path.exists(file):
        with open(file, "w", encoding="utf-8") as f:
            json.dump([], f)


garantir_arquivo(USUARIOS_FILE)
garantir_arquivo(LANCA_FILE)


# =========================
# COMPONENTES
# =========================
@app.route("/components/<path:filename>")
def components(filename):
    return send_from_directory("components", filename)


# =========================
# PÁGINAS
# =========================
@app.route("/")
def index():
    return render_template("login.html")


@app.route("/home")
def home():
    return render_template("home.html")


@app.route("/financas")
def financas():
    return render_template("financas.html")


# =========================
# USUÁRIOS
# =========================
def ler_usuarios():
    try:
        with open(USUARIOS_FILE, "r", encoding="utf-8") as f:
            return json.load(f)
    except:
        return []


def salvar_usuarios(dados):
    with open(USUARIOS_FILE, "w", encoding="utf-8") as f:
        json.dump(dados, f, indent=4, ensure_ascii=False)


@app.route("/usuarios", methods=["POST"])
def usuarios():
    data = request.get_json()
    usuarios = ler_usuarios()
    usuarios.append(data)
    salvar_usuarios(usuarios)
    return jsonify({"success": True})


@app.route("/login", methods=["POST"])
def login():
    dados = request.get_json()

    email = dados.get("email")
    senha = dados.get("password")

    usuarios = ler_usuarios()

    for u in usuarios:
        if u.get("email") == email and u.get("senha") == senha:
            return jsonify({"success": True})

    return jsonify({"success": False})


# =========================
# LANÇAMENTOS
# =========================
def ler_lancamentos():
    try:
        with open(LANCA_FILE, "r", encoding="utf-8") as f:
            return json.load(f)
    except:
        return []


def salvar_lancamentos(dados):
    with open(LANCA_FILE, "w", encoding="utf-8") as f:
        json.dump(dados, f, indent=4, ensure_ascii=False)


@app.route("/lancamentos", methods=["GET"])
def get_lancamentos():
    return jsonify(ler_lancamentos())


@app.route("/lancamentos", methods=["POST"])
def add_lancamento():
    novo = request.get_json()

    if not novo:
        return jsonify({"status": "erro"}), 400

    dados = ler_lancamentos()
    novo["id"] = str(uuid.uuid4())

    dados.append(novo)
    salvar_lancamentos(dados)

    return jsonify({"status": "ok"})


@app.route("/lancamentos/<id>", methods=["DELETE"])
def deletar(id):
    dados = ler_lancamentos()
    novos = [d for d in dados if d.get("id") != id]
    salvar_lancamentos(novos)
    return jsonify({"status": "ok"})


@app.route("/lancamentos/<id>", methods=["PUT"])
def editar(id):
    dados = ler_lancamentos()
    atualizado = request.get_json()

    for d in dados:
        if d.get("id") == id:
            d.update(atualizado)
            break

    salvar_lancamentos(dados)
    return jsonify({"status": "ok"})


# =========================
# FINANÇAS API
# =========================
@app.route("/api/financas")
def api_financas():
    path = os.path.join(os.path.dirname(__file__), "banco.json")

    with open(path, "r", encoding="utf-8") as f:
        return jsonify(json.load(f))


# =========================
# RUN
# =========================
if __name__ == "__main__":
    app.run(host="0.0.0.0", port=10000)