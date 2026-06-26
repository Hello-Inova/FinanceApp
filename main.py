from werkzeug.security import (
    generate_password_hash,
    check_password_hash
)
from flask_cors import CORS

from database import (
    criar_tabelas,
    criar_usuario,
    buscar_usuario,
    listar_lancamentos,
    criar_lancamento,
    atualizar_lancamento,
    excluir_lancamento
)
from flask import (
    Flask,
    request,
    jsonify,
    render_template,
    send_from_directory,
    session,
    redirect
)
import os


app = Flask(
    __name__,
    template_folder="pages",
    static_folder="static"
)

app.secret_key = os.getenv(
    "SECRET_KEY",
    "dev_secret"
)

CORS(app)

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

    if "usuario_id" not in session:
        return redirect("/")

    return render_template("home.html")


@app.route("/financas")
def financas():

    if "usuario_id" not in session:
        return redirect("/")

    return render_template("financas.html")

@app.route("/logout")
def logout():

    session.clear()

    return redirect("/")

@app.route("/session")
def verificar_sessao():

    print("SESSION:", session)

    if "usuario_id" in session:
        return jsonify({
            "logado": True,
            "nome": session["usuario_nome"]
        })

    return jsonify({
        "logado": False
    })


# =========================
# USUÁRIOS
# =========================

@app.route("/usuarios", methods=["POST"])
def usuarios():

    data = request.get_json()

    try:

        criar_usuario(
            data.get("nome"),
            data.get("email"),
            data.get("senha"),
            data.get("perfil")
        )

        return jsonify({
            "status": "ok"
        }), 201

    except Exception as e:

        print("ERRO CADASTRO:", e)

        return jsonify({
            "status": "erro",
            "mensagem": str(e)
        }), 400

@app.route("/login", methods=["POST"])
def login():

    dados = request.get_json()

    usuario = buscar_usuario(
        dados.get("email"),
        dados.get("password")
    )

    if usuario:

        session["usuario_id"] = usuario["id"]
        session["usuario_nome"] = usuario["nome"]

        print(session)

        return jsonify({
            "success": True
        })

    return jsonify({
        "success": False
    }), 401


# =========================
# LANÇAMENTOS
# =========================

@app.route("/lancamentos", methods=["GET"])
def get_lancamentos():

    if "usuario_id" not in session:
        return jsonify({"erro": "Não autenticado"}), 401

    return jsonify(
        listar_lancamentos(
            session["usuario_id"]
        )
    )


@app.route("/lancamentos", methods=["POST"])
def add_lancamento():

    if "usuario_id" not in session:
        return jsonify({"erro": "Não autenticado"}), 401

    novo = request.get_json()

    if not novo:
        return jsonify({
            "status": "erro"
        }), 400

    try:

        criar_lancamento(
            session["usuario_id"],
            novo.get("data"),
            novo.get("tipo"),
            novo.get("descricao"),
            novo.get("valor"),
            novo.get("obs")
        )

        return jsonify({
            "status": "ok"
        }), 201

    except Exception as e:

        return jsonify({
            "status": "erro",
            "mensagem": str(e)
        }), 400

@app.route("/lancamentos/<int:id>", methods=["PUT"])
def editar(id):

    if "usuario_id" not in session:
        return jsonify({"erro": "Não autenticado"}), 401

    atualizado = request.get_json()

    atualizar_lancamento(
        session["usuario_id"],
        id,
        atualizado.get("data"),
        atualizado.get("tipo"),
        atualizado.get("descricao"),
        atualizado.get("valor"),
        atualizado.get("obs")
    )

    return jsonify({"status": "ok"})

@app.route("/lancamentos/<int:id>", methods=["DELETE"])
def deletar(id):

    if "usuario_id" not in session:
        return jsonify({"erro": "Não autenticado"}), 401

    excluir_lancamento(
        session["usuario_id"],
        id
    )

    return jsonify({"status": "ok"})

# =========================
# FINANÇAS API
# =========================

@app.route("/api/financas")
def api_financas():

    if "usuario_id" not in session:
        return jsonify({"erro": "Não autenticado"}), 401

    return jsonify(
        listar_lancamentos(
            session["usuario_id"]
        )
    )


# =========================
# RUN
# =========================

if __name__ == "__main__":

    criar_tabelas()

    app.run(
        host="0.0.0.0",
        port=10000,
        debug=True
    )