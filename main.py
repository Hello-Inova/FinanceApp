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
# UTIL: GARANTE ARQUIVO JSON
# =========================
def garantir_arquivo(file):
    if not os.path.exists(file):
        with open(file, "w", encoding="utf-8") as f:
            json.dump([], f)


def ler_json(file):
    try:
        with open(file, "r", encoding="utf-8") as f:
            return json.load(f)
    except:
        return []


def salvar_json(file, data):
    with open(file, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=4, ensure_ascii=False)


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
@app.route("/usuarios", methods=["POST"])
def usuarios():
    data = request.get_json()

    usuarios = ler_json(USUARIOS_FILE)
    usuarios.append(data)
    salvar_json(USUARIOS_FILE, usuarios)

    return jsonify({"status": "ok"}), 201


@app.route("/login", methods=["POST"])
def login():
    dados = request.get_json()

    email = dados.get("email")
    senha = dados.get("password")

    usuarios = ler_json(USUARIOS_FILE)

    for u in usuarios:
        if u.get("email") == email and u.get("senha") == senha:
            return jsonify({"success": True})

    return jsonify({"success": False}), 401


# =========================
# LANÇAMENTOS
# =========================
@app.route("/lancamentos", methods=["GET"])
def get_lancamentos():
    return jsonify(ler_json(LANCA_FILE))


@app.route("/lancamentos", methods=["POST"])
def add_lancamento():
    novo = request.get_json()

    if not novo:
        return jsonify({"status": "erro"}), 400

    dados = ler_json(LANCA_FILE)

    novo["id"] = str(uuid.uuid4())
    dados.append(novo)

    salvar_json(LANCA_FILE, dados)

    return jsonify({"status": "ok"}), 201


@app.route("/lancamentos/<id>", methods=["DELETE"])
def deletar(id):
    dados = ler_json(LANCA_FILE)

    novos = [d for d in dados if d.get("id") != id]

    salvar_json(LANCA_FILE, novos)

    return jsonify({"status": "ok"})


@app.route("/lancamentos/<id>", methods=["PUT"])
def editar(id):
    dados = ler_json(LANCA_FILE)
    atualizado = request.get_json()

    for d in dados:
        if d.get("id") == id:
            d.update(atualizado)
            break

    salvar_json(LANCA_FILE, dados)

    return jsonify({"status": "ok"})


# =========================
# FINANÇAS API
# =========================
@app.route("/api/financas")
def api_financas():
    return jsonify(ler_json("banco.json"))


# =========================
# RUN
# =========================
if __name__ == "__main__":
    app.run(host="0.0.0.0", port=10000)