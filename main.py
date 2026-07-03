from flask_cors import CORS

from database import (
    criar_tabelas,
    criar_usuario,
    buscar_usuario,

    listar_lancamentos,
    criar_lancamento,
    atualizar_lancamento,
    excluir_lancamento,

    listar_usuarios,
    atualizar_status_usuario,
    alterar_senha_usuario,
    atualizar_dados_usuario,
    excluir_usuario,

    listar_compras,
    criar_compra,
    atualizar_compra,
    atualizar_status_compra,
    excluir_compra,

    buscar_configuracoes,
    salvar_configuracoes,
    atualizar_configuracoes,
    existe_configuracao,

    criar_solicitacao_cadastro,
    buscar_solicitacao_cadastro,
    marcar_solicitacao_como_paga,
    marcar_usuario_criado_solicitacao
    
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


@app.route("/compras")
def compras():

    if "usuario_id" not in session:
        return redirect("/")

    return render_template("compras.html")


@app.route("/admin")
def admin():

    if "usuario_id" not in session:
        return redirect("/")

    if not usuario_admin():
        return redirect("/home")

    return render_template("admin.html")


@app.route("/logout")
def logout():

    session.clear()

    return redirect("/")


@app.route("/session")
def verificar_sessao():

    if "usuario_id" in session:
        return jsonify({
            "logado": True,
            "nome": session["usuario_nome"],
            "perfil": session["usuario_perfil"]
        })

    return jsonify({
        "logado": False
    })


# =========================
# HELPERS
# =========================

def usuario_admin():

    return (
        session.get("usuario_perfil")
        == "Administrativo"
    )


def usuario_logado():

    return "usuario_id" in session


# =========================
# LOGIN / USUÁRIOS
# =========================

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
        session["usuario_perfil"] = usuario["perfil"]

        return jsonify({
            "success": True
        })

    return jsonify({
        "success": False
    }), 401


@app.route("/usuarios", methods=["POST"])
def usuarios():

    if not usuario_logado():
        return jsonify({
            "status": "erro",
            "mensagem": "Não autenticado"
        }), 401

    if not usuario_admin():
        return jsonify({
            "status": "erro",
            "mensagem": "Acesso negado"
        }), 403

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


# =========================
# ADMIN API
# =========================

@app.route("/admin/usuarios", methods=["GET"])
def admin_listar_usuarios():

    if not usuario_logado():
        return jsonify({"erro": "Não autenticado"}), 401

    if not usuario_admin():
        return jsonify({"erro": "Acesso negado"}), 403

    return jsonify(listar_usuarios())


@app.route("/admin/usuarios/<int:id>/dados", methods=["PUT"])
def admin_atualizar_dados_usuario(id):

    if not usuario_logado():
        return jsonify({"erro": "Não autenticado"}), 401

    if not usuario_admin():
        return jsonify({"erro": "Acesso negado"}), 403

    dados = request.get_json()

    atualizar_dados_usuario(
        id,
        dados.get("nome"),
        dados.get("email"),
        dados.get("perfil")
    )

    return jsonify({"status": "ok"})


@app.route("/admin/usuarios/<int:id>/status", methods=["PUT"])
def admin_status_usuario(id):

    if not usuario_logado():
        return jsonify({"erro": "Não autenticado"}), 401

    if not usuario_admin():
        return jsonify({"erro": "Acesso negado"}), 403

    dados = request.get_json()

    atualizar_status_usuario(
        id,
        dados.get("ativo")
    )

    return jsonify({"status": "ok"})


@app.route("/admin/usuarios/<int:id>/senha", methods=["PUT"])
def admin_alterar_senha(id):

    if not usuario_logado():
        return jsonify({"erro": "Não autenticado"}), 401

    if not usuario_admin():
        return jsonify({"erro": "Acesso negado"}), 403

    dados = request.get_json()

    alterar_senha_usuario(
        id,
        dados.get("senha")
    )

    return jsonify({"status": "ok"})


@app.route("/admin/usuarios/<int:id>", methods=["DELETE"])
def admin_excluir_usuario(id):

    if not usuario_logado():
        return jsonify({"erro": "Não autenticado"}), 401

    if not usuario_admin():
        return jsonify({"erro": "Acesso negado"}), 403

    if session.get("usuario_id") == id:
        return jsonify({
            "erro": "Você não pode excluir seu próprio usuário logado."
        }), 400

    excluir_usuario(id)

    return jsonify({"status": "ok"})


# =========================
# LANÇAMENTOS API
# =========================

@app.route("/lancamentos", methods=["GET"])
def get_lancamentos():

    if not usuario_logado():
        return jsonify({"erro": "Não autenticado"}), 401

    return jsonify(
        listar_lancamentos(
            session["usuario_id"]
        )
    )


@app.route("/lancamentos", methods=["POST"])
def add_lancamento():

    if not usuario_logado():
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
def editar_lancamento(id):

    if not usuario_logado():
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
def deletar_lancamento(id):

    if not usuario_logado():
        return jsonify({"erro": "Não autenticado"}), 401

    excluir_lancamento(
        session["usuario_id"],
        id
    )

    return jsonify({"status": "ok"})


@app.route("/api/financas")
def api_financas():

    if not usuario_logado():
        return jsonify({"erro": "Não autenticado"}), 401

    return jsonify(
        listar_lancamentos(
            session["usuario_id"]
        )
    )


# =========================
# COMPRAS API
# =========================

@app.route("/api/compras", methods=["GET"])
def api_listar_compras():

    if not usuario_logado():
        return jsonify({"erro": "Não autenticado"}), 401

    return jsonify(
        listar_compras(
            session["usuario_id"]
        )
    )


@app.route("/api/compras", methods=["POST"])
def api_criar_compra():

    if not usuario_logado():
        return jsonify({"erro": "Não autenticado"}), 401

    dados = request.get_json()

    try:

        criar_compra(
            session["usuario_id"],
            dados.get("data"),
            dados.get("categoria"),
            dados.get("item"),
            dados.get("quantidade"),
            dados.get("valor_unitario"),
            dados.get("obs")
        )

        return jsonify({"status": "ok"}), 201

    except Exception as e:

        return jsonify({
            "status": "erro",
            "mensagem": str(e)
        }), 400


@app.route("/api/compras/<int:id>", methods=["PUT"])
def api_atualizar_compra(id):

    if not usuario_logado():
        return jsonify({"erro": "Não autenticado"}), 401

    dados = request.get_json()

    try:

        atualizar_compra(
            session["usuario_id"],
            id,
            dados.get("data"),
            dados.get("categoria"),
            dados.get("item"),
            dados.get("quantidade"),
            dados.get("valor_unitario"),
            dados.get("obs")
        )

        return jsonify({"status": "ok"})

    except Exception as e:

        return jsonify({
            "status": "erro",
            "mensagem": str(e)
        }), 400


@app.route("/api/compras/<int:id>/status", methods=["PUT"])
def api_status_compra(id):

    if not usuario_logado():
        return jsonify({"erro": "Não autenticado"}), 401

    dados = request.get_json()

    atualizar_status_compra(
        session["usuario_id"],
        id,
        dados.get("comprado")
    )

    return jsonify({"status": "ok"})


@app.route("/api/compras/<int:id>", methods=["DELETE"])
def api_excluir_compra(id):

    if not usuario_logado():
        return jsonify({"erro": "Não autenticado"}), 401

    excluir_compra(
        session["usuario_id"],
        id
    )

    return jsonify({"status": "ok"})

@app.route("/configuracoes")
def configuracoes():

    if "usuario_id" not in session:
        return redirect("/")

    if not usuario_admin():
        return redirect("/home")

    return render_template("configuracoes.html")

# =========================
# CONFIGURAÇÕES API
# =========================

@app.route("/api/configuracoes", methods=["GET"])
def api_buscar_configuracoes():

    if not usuario_logado():
        return jsonify({"erro": "Não autenticado"}), 401

    if not usuario_admin():
        return jsonify({"erro": "Acesso negado"}), 403

    configuracoes = buscar_configuracoes()

    if not configuracoes:
        return jsonify({})

    return jsonify(configuracoes)


@app.route("/api/configuracoes", methods=["POST"])
def api_salvar_configuracoes():

    if not usuario_logado():
        return jsonify({"erro": "Não autenticado"}), 401

    if not usuario_admin():
        return jsonify({"erro": "Acesso negado"}), 403

    dados = request.get_json()

    tipo_pix = dados.get("tipo_pix")
    chave_pix = dados.get("chave_pix")
    nome_recebedor = dados.get("nome_recebedor")
    banco = dados.get("banco")

    if not tipo_pix or not chave_pix or not nome_recebedor or not banco:
        return jsonify({
            "status": "erro",
            "mensagem": "Preencha todos os campos obrigatórios."
        }), 400

    try:

        if existe_configuracao():

            atualizar_configuracoes(
                tipo_pix,
                chave_pix,
                nome_recebedor,
                banco
            )

        else:

            salvar_configuracoes(
                tipo_pix,
                chave_pix,
                nome_recebedor,
                banco
            )

        return jsonify({
            "status": "ok",
            "mensagem": "Configurações salvas com sucesso."
        })

    except Exception as e:

        return jsonify({
            "status": "erro",
            "mensagem": str(e)
        }), 400

# =========================
# CADASTRO PÚBLICO / PIX
# =========================

@app.route("/api/public/pix", methods=["GET"])
def api_public_pix():

    configuracoes = buscar_configuracoes()

    if not configuracoes:
        return jsonify({
            "status": "erro",
            "mensagem": "PIX não configurado."
        }), 404

    return jsonify({
        "tipo_pix": configuracoes.get("tipo_pix"),
        "chave_pix": configuracoes.get("chave_pix"),
        "nome_recebedor": configuracoes.get("nome_recebedor"),
        "banco": configuracoes.get("banco")
    })


@app.route("/api/public/cadastro", methods=["POST"])
def api_criar_solicitacao_cadastro():

    dados = request.get_json()

    cpf = dados.get("cpf")
    email = dados.get("email")

    if not cpf or not email:
        return jsonify({
            "status": "erro",
            "mensagem": "Informe CPF e e-mail."
        }), 400

    try:

        solicitacao_id = criar_solicitacao_cadastro(
            cpf,
            email
        )

        configuracoes = buscar_configuracoes()

        return jsonify({
            "status": "ok",
            "solicitacao_id": solicitacao_id,
            "pix": configuracoes or {}
        }), 201

    except Exception as e:

        return jsonify({
            "status": "erro",
            "mensagem": str(e)
        }), 400


@app.route("/api/public/cadastro/<int:id>", methods=["GET"])
def api_status_solicitacao_cadastro(id):

    solicitacao = buscar_solicitacao_cadastro(id)

    if not solicitacao:
        return jsonify({
            "status": "erro",
            "mensagem": "Solicitação não encontrada."
        }), 404

    return jsonify({
        "status": "ok",
        "solicitacao": solicitacao
    })


@app.route("/api/public/finalizar-cadastro", methods=["POST"])
def api_finalizar_cadastro():

    dados = request.get_json()

    solicitacao_id = dados.get("solicitacao_id")
    nome = dados.get("nome")
    email = dados.get("email")
    senha = dados.get("senha")
    confirmar_senha = dados.get("confirmar_senha")

    if not solicitacao_id or not nome or not email or not senha or not confirmar_senha:
        return jsonify({
            "status": "erro",
            "mensagem": "Preencha todos os campos."
        }), 400

    if senha != confirmar_senha:
        return jsonify({
            "status": "erro",
            "mensagem": "As senhas são diferentes."
        }), 400

    solicitacao = buscar_solicitacao_cadastro(solicitacao_id)

    if not solicitacao:
        return jsonify({
            "status": "erro",
            "mensagem": "Solicitação não encontrada."
        }), 404

    if solicitacao["status"] != "pago":
        return jsonify({
            "status": "erro",
            "mensagem": "Pagamento ainda não confirmado."
        }), 403

    if solicitacao["usuario_criado"] == 1:
        return jsonify({
            "status": "erro",
            "mensagem": "Usuário já foi criado para esta solicitação."
        }), 400

    if solicitacao["email"] != email:
        return jsonify({
            "status": "erro",
            "mensagem": "O e-mail informado é diferente do e-mail da solicitação."
        }), 400

    try:

        criar_usuario(
            nome,
            email,
            senha,
            "Padrão"
        )

        marcar_usuario_criado_solicitacao(
            solicitacao_id
        )

        return jsonify({
            "status": "ok",
            "mensagem": "Cadastro realizado com sucesso."
        }), 201

    except Exception as e:

        return jsonify({
            "status": "erro",
            "mensagem": str(e)
        }), 400


# ROTA TEMPORÁRIA PARA TESTE
# Depois será substituída pelo webhook do gateway de pagamento.

@app.route("/api/public/cadastro/<int:id>/simular-pagamento", methods=["POST"])
def api_simular_pagamento_cadastro(id):

    solicitacao = buscar_solicitacao_cadastro(id)

    if not solicitacao:
        return jsonify({
            "status": "erro",
            "mensagem": "Solicitação não encontrada."
        }), 404

    marcar_solicitacao_como_paga(id)

    return jsonify({
        "status": "ok",
        "mensagem": "Pagamento simulado com sucesso."
    })
        
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