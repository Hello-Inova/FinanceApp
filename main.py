import hashlib
import hmac
import logging
import os
import re
import secrets
import urllib.error
import urllib.request
from html import escape
import json
from datetime import date, timedelta
from decimal import Decimal, InvalidOperation
from functools import wraps

from flask import Flask, g, jsonify, redirect, render_template, request, send_from_directory, session
from flask_wtf.csrf import CSRFError, CSRFProtect

from database import (
    alterar_senha_propria, alterar_senha_usuario, atualizar_compra,
    atualizar_dados_usuario, atualizar_lancamento, atualizar_status_compra,
    atualizar_status_usuario, buscar_configuracoes, buscar_status_solicitacao,
    buscar_usuario, buscar_usuario_por_id, confirmar_pagamento, cpf_usuario_existe,
    criar_admin_inicial, criar_compra, criar_lancamento, criar_ou_buscar_solicitacao,
    criar_tabelas, criar_token_recuperacao, criar_usuario, email_usuario_existe, excluir_compra,
    excluir_lancamento, excluir_usuario, finalizar_cadastro, healthcheck,
    listar_compras, listar_lancamentos, listar_usuarios, rate_limit_limpar,
    rate_limit_permitir, redefinir_senha_com_token, salvar_ou_atualizar_configuracoes,
    token_recuperacao_valido,
)

logging.basicConfig(level=os.getenv("LOG_LEVEL", "INFO"))
logger = logging.getLogger(__name__)

app = Flask(__name__, template_folder="pages", static_folder="static")
app.config.update(
    SECRET_KEY=os.getenv("SECRET_KEY"),
    SESSION_COOKIE_HTTPONLY=True,
    SESSION_COOKIE_SAMESITE="Strict",
    SESSION_COOKIE_SECURE=os.getenv("APP_ENV", "production") != "development",
    PERMANENT_SESSION_LIFETIME=timedelta(hours=8),
    WTF_CSRF_TIME_LIMIT=3600,
    MAX_CONTENT_LENGTH=64 * 1024,
)
if not app.config["SECRET_KEY"]:
    if os.getenv("APP_ENV", "production") == "development":
        app.config["SECRET_KEY"] = "development-only-secret"
    else:
        raise RuntimeError("SECRET_KEY deve ser configurada no ambiente.")

csrf = CSRFProtect(app)
criar_tabelas()
criar_admin_inicial()

PERFIS = {"Padrão", "Administrativo"}
TIPOS_LANCAMENTO = {"Entrada", "Saída"}
EMAIL_RE = re.compile(r"^[^\s@]+@[^\s@]+\.[^\s@]+$")
PAYMENTS_ENABLED = os.getenv("PAYMENTS_ENABLED", "false").lower() == "true"
CADASTRO_VALOR_CENTAVOS = int(os.getenv("CADASTRO_VALOR_CENTAVOS", "0"))
RESET_TOKEN_TTL = 30 * 60


def resposta_erro(mensagem, status=400):
    return jsonify({"status": "erro", "mensagem": mensagem}), status


def json_body():
    return request.get_json(silent=True) or {}


def texto(valor, campo, minimo=1, maximo=200):
    if not isinstance(valor, str):
        raise ValueError(f"{campo} inválido.")
    valor = valor.strip()
    if not minimo <= len(valor) <= maximo:
        raise ValueError(f"{campo} deve ter entre {minimo} e {maximo} caracteres.")
    return valor


def email_valido(valor):
    valor = texto(valor, "E-mail", 5, 254).lower()
    if not EMAIL_RE.fullmatch(valor):
        raise ValueError("E-mail inválido.")
    return valor


def cpf_valido(valor):
    cpf = re.sub(r"\D", "", str(valor or ""))
    if len(cpf) != 11 or cpf == cpf[0] * 11:
        raise ValueError("CPF inválido.")
    for tamanho in (9, 10):
        soma = sum(int(cpf[i]) * (tamanho + 1 - i) for i in range(tamanho))
        if (soma * 10 % 11) % 10 != int(cpf[tamanho]):
            raise ValueError("CPF inválido.")
    return cpf


def senha_forte(senha):
    if not isinstance(senha, str) or len(senha) < 12:
        raise ValueError("A senha deve ter no mínimo 12 caracteres.")
    if not all(re.search(regra, senha) for regra in (r"[a-z]", r"[A-Z]", r"\d", r"[^A-Za-z0-9]")):
        raise ValueError("A senha deve conter maiúscula, minúscula, número e símbolo.")
    return senha


def url_base_aplicacao():
    configurada = os.getenv("APP_BASE_URL", "").strip().rstrip("/")
    if configurada:
        if not configurada.startswith("https://") and os.getenv("APP_ENV", "production") != "development":
            raise RuntimeError("APP_BASE_URL deve usar HTTPS em produção.")
        return configurada
    if os.getenv("APP_ENV", "production") == "development":
        return request.url_root.rstrip("/")
    raise RuntimeError("APP_BASE_URL deve ser configurada em produção.")


def enviar_email_recuperacao(destinatario, nome, link):
    api_key = os.getenv("RESEND_API_KEY", "").strip()
    remetente = os.getenv("RESEND_FROM_EMAIL", "").strip()
    if not api_key or not remetente:
        raise RuntimeError("RESEND_API_KEY e RESEND_FROM_EMAIL devem ser configuradas.")
    nome_seguro = escape(nome or "usuário")
    link_seguro = escape(link, quote=True)
    payload = json.dumps({
        "from": remetente,
        "to": [destinatario],
        "subject": "Redefinição de senha - FinanceApp",
        "html": (
            f"<p>Olá, {nome_seguro}.</p>"
            "<p>Recebemos uma solicitação para redefinir sua senha no FinanceApp.</p>"
            f'<p><a href="{link_seguro}">Redefinir minha senha</a></p>'
            "<p>O link expira em 30 minutos e pode ser usado apenas uma vez. "
            "Se você não fez esta solicitação, ignore este e-mail.</p>"
        ),
    }).encode("utf-8")
    requisicao = urllib.request.Request(
        "https://api.resend.com/emails",
        data=payload,
        method="POST",
        headers={
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json",
            "User-Agent": "FinanceApp/1.0",
        },
    )
    with urllib.request.urlopen(requisicao, timeout=10) as resposta:
        if resposta.status not in {200, 201}:
            raise RuntimeError(f"Resend retornou HTTP {resposta.status}.")


def recuperacao_senha_configurada():
    return all(os.getenv(nome, "").strip() for nome in ("APP_BASE_URL", "RESEND_API_KEY", "RESEND_FROM_EMAIL"))


def data_iso(valor):
    try:
        return date.fromisoformat(str(valor)).isoformat()
    except (TypeError, ValueError):
        raise ValueError("Data inválida.") from None


def decimal_positivo(valor, campo, permite_zero=False):
    try:
        numero = Decimal(str(valor))
    except (InvalidOperation, TypeError, ValueError):
        raise ValueError(f"{campo} inválido.") from None
    minimo = Decimal("0") if permite_zero else Decimal("0.01")
    if not numero.is_finite() or numero < minimo or numero > Decimal("999999999999.99"):
        raise ValueError(f"{campo} fora do intervalo permitido.")
    return numero.quantize(Decimal("0.01"))


def chave_rate_limit(escopo, identidade):
    digest = hmac.new(app.config["SECRET_KEY"].encode(), identidade.encode(), hashlib.sha256).hexdigest()
    return f"{escopo}:{digest}"


def ip_cliente():
    return request.headers.get("X-Forwarded-For", "").split(",")[0].strip() or request.remote_addr or "desconhecido"


def usuario_atual():
    if hasattr(g, "usuario_atual"):
        return g.usuario_atual
    usuario_id = session.get("usuario_id")
    usuario = buscar_usuario_por_id(usuario_id) if usuario_id else None
    if not usuario or usuario["ativo"] != 1 or int(usuario["session_version"]) != int(session.get("session_version", -1)):
        session.clear()
        usuario = None
    g.usuario_atual = usuario
    return usuario


def login_obrigatorio(funcao):
    @wraps(funcao)
    def wrapper(*args, **kwargs):
        if not usuario_atual():
            return resposta_erro("Não autenticado.", 401)
        return funcao(*args, **kwargs)
    return wrapper


def admin_obrigatorio(funcao):
    @wraps(funcao)
    def wrapper(*args, **kwargs):
        usuario = usuario_atual()
        if not usuario:
            return resposta_erro("Não autenticado.", 401)
        if usuario["perfil"] != "Administrativo":
            return resposta_erro("Acesso negado.", 403)
        return funcao(*args, **kwargs)
    return wrapper


@app.before_request
def exigir_troca_de_senha():
    usuario = usuario_atual()
    if not usuario or not usuario["must_change_password"]:
        return None
    if request.endpoint in {"trocar_senha_pagina", "alterar_senha_conta", "logout", "verificar_sessao", "static"}:
        return None
    if request.path.startswith("/api/") or request.accept_mimetypes.best == "application/json":
        return resposta_erro("Troque a senha temporária antes de continuar.", 428)
    return redirect("/trocar-senha")


@app.after_request
def cabecalhos_seguranca(response):
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
    response.headers["Permissions-Policy"] = "camera=(), microphone=(), geolocation=()"
    response.headers["Content-Security-Policy"] = (
        "default-src 'self'; script-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net; "
        "style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'self'; "
        "object-src 'none'; base-uri 'self'; frame-ancestors 'none'"
    )
    if request.path.startswith("/api/") or request.path == "/session":
        response.headers["Cache-Control"] = "no-store"
    if request.path.startswith("/redefinir-senha/"):
        response.headers["Referrer-Policy"] = "no-referrer"
        response.headers["Cache-Control"] = "no-store"
    return response


@app.errorhandler(CSRFError)
def csrf_error(_error):
    return resposta_erro("Sessão expirada. Atualize a página e tente novamente.", 400)


@app.errorhandler(413)
def payload_grande(_error):
    return resposta_erro("Requisição muito grande.", 413)


@app.route("/components/<path:filename>")
def components(filename):
    return send_from_directory("components", filename)


@app.route("/")
def index():
    usuario = usuario_atual()
    if usuario:
        return redirect("/trocar-senha" if usuario["must_change_password"] else "/home")
    return render_template("login.html", password_reset_enabled=recuperacao_senha_configurada())


def pagina_autenticada(template, admin=False):
    usuario = usuario_atual()
    if not usuario:
        return redirect("/")
    if admin and usuario["perfil"] != "Administrativo":
        return redirect("/home")
    return render_template(template)


@app.route("/home")
def home():
    return pagina_autenticada("home.html")


@app.route("/financas")
def financas():
    return pagina_autenticada("financas.html")


@app.route("/compras")
def compras():
    return pagina_autenticada("compras.html")


@app.route("/admin")
def admin():
    return pagina_autenticada("admin.html", admin=True)


@app.route("/configuracoes")
def configuracoes():
    return redirect("/admin")


@app.route("/trocar-senha")
def trocar_senha_pagina():
    if not usuario_atual():
        return redirect("/")
    return render_template("trocar-senha.html")


@app.route("/recuperar-senha")
def recuperar_senha_pagina():
    if usuario_atual():
        return redirect("/home")
    if not recuperacao_senha_configurada():
        return redirect("/")
    return render_template("recuperar-senha.html")


@app.route("/redefinir-senha/<token>")
def redefinir_senha_pagina(token):
    valido = bool(re.fullmatch(r"[A-Za-z0-9_-]{40,100}", token)) and token_recuperacao_valido(token)
    return render_template("redefinir-senha.html", token=token if valido else "", token_valido=valido)


@app.route("/api/health")
def health():
    try:
        if healthcheck():
            return jsonify({"status": "ok", "database": "ok"})
    except Exception:
        logger.exception("Falha no healthcheck do banco")
    return jsonify({"status": "erro", "database": "indisponivel"}), 503


@app.route("/logout", methods=["POST"])
def logout():
    session.clear()
    return jsonify({"status": "ok"})


@app.route("/session")
def verificar_sessao():
    usuario = usuario_atual()
    if not usuario:
        return jsonify({"logado": False})
    return jsonify({"logado": True, "nome": usuario["nome"], "perfil": usuario["perfil"], "must_change_password": bool(usuario["must_change_password"])})


@app.route("/login", methods=["POST"])
def login():
    dados = json_body()
    try:
        email = email_valido(dados.get("email"))
        senha = texto(dados.get("password"), "Senha", 1, 256)
    except ValueError:
        return resposta_erro("Credenciais inválidas.", 401)
    chave = chave_rate_limit("login", f"{ip_cliente()}:{email}")
    if not rate_limit_permitir(chave, 8, 15 * 60):
        return resposta_erro("Muitas tentativas. Tente novamente mais tarde.", 429)
    usuario = buscar_usuario(email, senha)
    if not usuario:
        return resposta_erro("Credenciais inválidas.", 401)
    rate_limit_limpar(chave)
    session.clear()
    session.permanent = True
    session["usuario_id"] = usuario["id"]
    session["session_version"] = usuario["session_version"]
    return jsonify({"success": True, "must_change_password": bool(usuario["must_change_password"])})


@app.route("/api/public/password-reset/request", methods=["POST"])
def solicitar_recuperacao_senha():
    mensagem = "Se existir uma conta ativa para este e-mail, enviaremos as instruções em instantes."
    if not recuperacao_senha_configurada():
        return resposta_erro("Recuperação de senha temporariamente indisponível.", 503)
    try:
        email = email_valido(json_body().get("email"))
    except ValueError:
        return jsonify({"status": "ok", "mensagem": mensagem})
    chave_ip = chave_rate_limit("password-reset-ip", ip_cliente())
    chave_email = chave_rate_limit("password-reset-email", email)
    if not rate_limit_permitir(chave_ip, 10, 60 * 60) or not rate_limit_permitir(chave_email, 3, 60 * 60):
        return jsonify({"status": "ok", "mensagem": mensagem})
    token = secrets.token_urlsafe(32)
    try:
        usuario = criar_token_recuperacao(email, token, RESET_TOKEN_TTL)
        if usuario:
            link = f"{url_base_aplicacao()}/redefinir-senha/{token}"
            enviar_email_recuperacao(usuario["email"], usuario["nome"], link)
    except Exception:
        logger.exception("Falha ao processar recuperação de senha")
    return jsonify({"status": "ok", "mensagem": mensagem})


@app.route("/api/public/password-reset/confirm", methods=["POST"])
def confirmar_recuperacao_senha():
    dados = json_body()
    try:
        token = texto(dados.get("token"), "Token", 40, 100)
        if not re.fullmatch(r"[A-Za-z0-9_-]+", token):
            raise ValueError("Link inválido ou expirado.")
        nova_senha = senha_forte(dados.get("nova_senha"))
        if nova_senha != dados.get("confirmar_senha"):
            raise ValueError("As senhas não coincidem.")
    except ValueError as erro:
        return resposta_erro(str(erro))
    chave = chave_rate_limit("password-reset-confirm", f"{ip_cliente()}:{token}")
    if not rate_limit_permitir(chave, 8, 15 * 60):
        return resposta_erro("Muitas tentativas. Solicite um novo link.", 429)
    if not redefinir_senha_com_token(token, nova_senha):
        return resposta_erro("Link inválido ou expirado.", 400)
    rate_limit_limpar(chave)
    session.clear()
    return jsonify({"status": "ok", "mensagem": "Senha redefinida com sucesso."})


@app.route("/api/account/password", methods=["PUT"])
@login_obrigatorio
def alterar_senha_conta():
    dados = json_body()
    try:
        senha_atual = texto(dados.get("senha_atual"), "Senha atual", 1, 256)
        nova_senha = senha_forte(dados.get("nova_senha"))
        if nova_senha != dados.get("confirmar_senha"):
            raise ValueError("As novas senhas não coincidem.")
        if senha_atual == nova_senha:
            raise ValueError("A nova senha deve ser diferente da atual.")
    except ValueError as erro:
        return resposta_erro(str(erro))
    nova_versao = alterar_senha_propria(usuario_atual()["id"], senha_atual, nova_senha)
    if nova_versao is None:
        return resposta_erro("Senha atual incorreta.", 401)
    session["session_version"] = nova_versao
    return jsonify({"status": "ok"})


@app.route("/usuarios", methods=["POST"])
@admin_obrigatorio
def usuarios():
    dados = json_body()
    try:
        nome = texto(dados.get("nome"), "Nome", 2, 120)
        cpf = cpf_valido(dados.get("cpf"))
        email = email_valido(dados.get("email"))
        senha = senha_forte(dados.get("senha"))
        perfil = dados.get("perfil")
        if perfil not in PERFIS:
            raise ValueError("Perfil inválido.")
        criar_usuario(nome, cpf, email, senha, perfil, must_change_password=1)
        return jsonify({"status": "ok"}), 201
    except ValueError as erro:
        return resposta_erro(str(erro))
    except Exception:
        logger.exception("Falha ao criar usuário")
        return resposta_erro("Não foi possível criar o usuário. Verifique CPF e e-mail.")


@app.route("/admin/usuarios", methods=["GET"])
@admin_obrigatorio
def admin_listar_usuarios():
    return jsonify(listar_usuarios())


@app.route("/admin/usuarios/<int:usuario_id>/dados", methods=["PUT"])
@admin_obrigatorio
def admin_atualizar_dados_usuario(usuario_id):
    dados = json_body()
    try:
        nome = texto(dados.get("nome"), "Nome", 2, 120)
        email = email_valido(dados.get("email"))
        perfil = dados.get("perfil")
        if perfil not in PERFIS:
            raise ValueError("Perfil inválido.")
        if usuario_id == usuario_atual()["id"] and perfil != "Administrativo":
            raise ValueError("Você não pode remover seu próprio acesso administrativo.")
        atualizar_dados_usuario(usuario_id, nome, email, perfil)
        if usuario_id == usuario_atual()["id"]:
            session.clear()
        return jsonify({"status": "ok"})
    except ValueError as erro:
        return resposta_erro(str(erro))
    except Exception:
        logger.exception("Falha ao atualizar usuário")
        return resposta_erro("Não foi possível atualizar o usuário.")


@app.route("/admin/usuarios/<int:usuario_id>/status", methods=["PUT"])
@admin_obrigatorio
def admin_status_usuario(usuario_id):
    if usuario_id == usuario_atual()["id"]:
        return resposta_erro("Você não pode desativar seu próprio usuário.")
    ativo = json_body().get("ativo")
    if not isinstance(ativo, bool):
        return resposta_erro("Status inválido.")
    atualizar_status_usuario(usuario_id, ativo)
    return jsonify({"status": "ok"})


@app.route("/admin/usuarios/<int:usuario_id>/senha", methods=["PUT"])
@admin_obrigatorio
def admin_alterar_senha(usuario_id):
    try:
        senha = senha_forte(json_body().get("senha"))
    except ValueError as erro:
        return resposta_erro(str(erro))
    alterar_senha_usuario(usuario_id, senha, force_change=1)
    if usuario_id == usuario_atual()["id"]:
        session.clear()
    return jsonify({"status": "ok"})


@app.route("/admin/usuarios/<int:usuario_id>", methods=["DELETE"])
@admin_obrigatorio
def admin_excluir_usuario(usuario_id):
    if usuario_id == usuario_atual()["id"]:
        return resposta_erro("Você não pode excluir seu próprio usuário.")
    excluir_usuario(usuario_id)
    return jsonify({"status": "ok"})


def validar_lancamento(dados):
    tipo = dados.get("tipo")
    if tipo not in TIPOS_LANCAMENTO:
        raise ValueError("Tipo de lançamento inválido.")
    return (
        data_iso(dados.get("data")), tipo,
        texto(dados.get("descricao"), "Descrição", 1, 200),
        decimal_positivo(dados.get("valor"), "Valor"),
        texto(dados.get("obs", ""), "Observação", 0, 1000),
    )


@app.route("/lancamentos", methods=["GET"])
@login_obrigatorio
def get_lancamentos():
    return jsonify(listar_lancamentos(usuario_atual()["id"]))


@app.route("/lancamentos", methods=["POST"])
@login_obrigatorio
def add_lancamento():
    try:
        criar_lancamento(usuario_atual()["id"], *validar_lancamento(json_body()))
        return jsonify({"status": "ok"}), 201
    except ValueError as erro:
        return resposta_erro(str(erro))


@app.route("/lancamentos/<int:lancamento_id>", methods=["PUT"])
@login_obrigatorio
def editar_lancamento(lancamento_id):
    try:
        atualizar_lancamento(usuario_atual()["id"], lancamento_id, *validar_lancamento(json_body()))
        return jsonify({"status": "ok"})
    except ValueError as erro:
        return resposta_erro(str(erro))


@app.route("/lancamentos/<int:lancamento_id>", methods=["DELETE"])
@login_obrigatorio
def deletar_lancamento(lancamento_id):
    excluir_lancamento(usuario_atual()["id"], lancamento_id)
    return jsonify({"status": "ok"})


@app.route("/api/financas")
@login_obrigatorio
def api_financas():
    return jsonify(listar_lancamentos(usuario_atual()["id"]))


def validar_compra(dados):
    return (
        data_iso(dados.get("data")),
        texto(dados.get("categoria"), "Categoria", 1, 80),
        texto(dados.get("item"), "Item", 1, 200),
        decimal_positivo(dados.get("quantidade"), "Quantidade"),
        decimal_positivo(dados.get("valor_unitario"), "Valor unitário", permite_zero=True),
        texto(dados.get("obs", ""), "Observação", 0, 1000),
    )


@app.route("/api/compras", methods=["GET"])
@login_obrigatorio
def api_listar_compras():
    return jsonify(listar_compras(usuario_atual()["id"]))


@app.route("/api/compras", methods=["POST"])
@login_obrigatorio
def api_criar_compra():
    try:
        criar_compra(usuario_atual()["id"], *validar_compra(json_body()))
        return jsonify({"status": "ok"}), 201
    except ValueError as erro:
        return resposta_erro(str(erro))


@app.route("/api/compras/<int:compra_id>", methods=["PUT"])
@login_obrigatorio
def api_atualizar_compra(compra_id):
    try:
        atualizar_compra(usuario_atual()["id"], compra_id, *validar_compra(json_body()))
        return jsonify({"status": "ok"})
    except ValueError as erro:
        return resposta_erro(str(erro))


@app.route("/api/compras/<int:compra_id>/status", methods=["PUT"])
@login_obrigatorio
def api_status_compra(compra_id):
    comprado = json_body().get("comprado")
    if not isinstance(comprado, bool):
        return resposta_erro("Status inválido.")
    atualizar_status_compra(usuario_atual()["id"], compra_id, comprado)
    return jsonify({"status": "ok"})


@app.route("/api/compras/<int:compra_id>", methods=["DELETE"])
@login_obrigatorio
def api_excluir_compra(compra_id):
    excluir_compra(usuario_atual()["id"], compra_id)
    return jsonify({"status": "ok"})


@app.route("/api/configuracoes", methods=["GET"])
@admin_obrigatorio
def api_buscar_configuracoes():
    return jsonify(buscar_configuracoes() or {})


@app.route("/api/configuracoes", methods=["POST"])
@admin_obrigatorio
def api_salvar_configuracoes():
    dados = json_body()
    try:
        salvar_ou_atualizar_configuracoes(
            texto(dados.get("tipo_pix"), "Tipo PIX", 2, 30),
            texto(dados.get("chave_pix"), "Chave PIX", 2, 140),
            texto(dados.get("nome_recebedor"), "Recebedor", 2, 140),
            texto(dados.get("banco"), "Banco", 2, 140),
        )
        return jsonify({"status": "ok", "mensagem": "Configurações salvas."})
    except ValueError as erro:
        return resposta_erro(str(erro))


@app.route("/api/public/pix", methods=["GET"])
def api_public_pix():
    if not PAYMENTS_ENABLED:
        return resposta_erro("Cadastro por pagamento temporariamente indisponível.", 503)
    configuracao = buscar_configuracoes()
    if not configuracao:
        return resposta_erro("PIX não configurado.", 404)
    return jsonify({
        "tipo_pix": configuracao["tipo_pix"], "chave_pix": configuracao["chave_pix"],
        "nome_recebedor": configuracao["nome_recebedor"], "banco": configuracao["banco"],
        "valor_centavos": CADASTRO_VALOR_CENTAVOS,
    })


@app.route("/api/public/cadastro", methods=["POST"])
def api_criar_solicitacao_cadastro():
    if not PAYMENTS_ENABLED or CADASTRO_VALOR_CENTAVOS <= 0:
        return resposta_erro("Cadastro por pagamento temporariamente indisponível.", 503)
    chave = chave_rate_limit("cadastro", ip_cliente())
    if not rate_limit_permitir(chave, 5, 60 * 60):
        return resposta_erro("Muitas tentativas. Tente novamente mais tarde.", 429)
    try:
        dados = json_body()
        cpf = cpf_valido(dados.get("cpf"))
        email = email_valido(dados.get("email"))
        if cpf_usuario_existe(cpf) or email_usuario_existe(email):
            return resposta_erro("Não foi possível iniciar o cadastro com esses dados.")
        solicitacao = criar_ou_buscar_solicitacao(cpf, email, CADASTRO_VALOR_CENTAVOS)
        configuracao = buscar_configuracoes() or {}
        return jsonify({
            "status": "ok", "solicitacao_token": solicitacao["public_token"],
            "pagamento_status": solicitacao["status"],
            "pix": {
                "tipo_pix": configuracao.get("tipo_pix"),
                "chave_pix": configuracao.get("chave_pix"),
                "nome_recebedor": configuracao.get("nome_recebedor"),
                "banco": configuracao.get("banco"),
                "valor_centavos": CADASTRO_VALOR_CENTAVOS,
            },
        }), 201
    except ValueError as erro:
        return resposta_erro(str(erro))


@app.route("/api/public/cadastro/<token>", methods=["GET"])
def api_status_solicitacao_cadastro(token):
    if not PAYMENTS_ENABLED:
        return resposta_erro("Cadastro por pagamento temporariamente indisponível.", 503)
    solicitacao = buscar_status_solicitacao(token)
    if not solicitacao:
        return resposta_erro("Solicitação não encontrada.", 404)
    return jsonify({
        "status": "ok", "pagamento_status": solicitacao["status"],
        "usuario_criado": bool(solicitacao["usuario_criado"]),
    })


@app.route("/api/public/finalizar-cadastro", methods=["POST"])
def api_finalizar_cadastro():
    if not PAYMENTS_ENABLED:
        return resposta_erro("Cadastro por pagamento temporariamente indisponível.", 503)
    dados = json_body()
    try:
        token = texto(dados.get("solicitacao_token"), "Solicitação", 20, 200)
        nome = texto(dados.get("nome"), "Nome", 2, 120)
        email = email_valido(dados.get("email"))
        senha = senha_forte(dados.get("senha"))
        if senha != dados.get("confirmar_senha"):
            raise ValueError("As senhas não coincidem.")
        resultado = finalizar_cadastro(token, nome, email, senha)
        mensagens = {
            "nao_encontrada": ("Solicitação não encontrada.", 404),
            "nao_pago": ("Pagamento ainda não confirmado.", 403),
            "ja_criado": ("Cadastro já finalizado.", 409),
            "email_invalido": ("Dados não correspondem à solicitação.", 400),
        }
        if resultado != "ok":
            mensagem, status = mensagens.get(resultado, ("Não foi possível finalizar.", 400))
            return resposta_erro(mensagem, status)
        return jsonify({"status": "ok", "mensagem": "Cadastro realizado."}), 201
    except ValueError as erro:
        return resposta_erro(str(erro))
    except Exception:
        logger.exception("Falha ao finalizar cadastro")
        return resposta_erro("Não foi possível finalizar o cadastro.")


@app.route("/api/payments/webhook", methods=["POST"])
@csrf.exempt
def webhook_pagamento():
    segredo = os.getenv("PAYMENT_WEBHOOK_SECRET", "")
    assinatura = request.headers.get("X-Webhook-Signature", "")
    corpo = request.get_data(cache=True)
    esperada = hmac.new(segredo.encode(), corpo, hashlib.sha256).hexdigest() if segredo else ""
    if not PAYMENTS_ENABLED or not segredo or not hmac.compare_digest(assinatura, esperada):
        return resposta_erro("Assinatura inválida.", 401)
    dados = json_body()
    try:
        if dados.get("status") != "approved":
            return jsonify({"status": "ignored"})
        token = texto(dados.get("solicitacao_token"), "Solicitação", 20, 200)
        external_id = texto(dados.get("external_id"), "Identificador", 1, 200)
        valor_centavos = int(dados.get("valor_centavos"))
        if valor_centavos != CADASTRO_VALOR_CENTAVOS:
            return resposta_erro("Valor divergente.", 400)
        confirmado = confirmar_pagamento(token, external_id, valor_centavos)
        return jsonify({"status": "ok" if confirmado else "ignored"})
    except (TypeError, ValueError):
        return resposta_erro("Evento inválido.")


if __name__ == "__main__":
    app.run(
        host="0.0.0.0", port=int(os.getenv("PORT", "10000")),
        debug=os.getenv("FLASK_DEBUG", "false").lower() == "true",
    )
