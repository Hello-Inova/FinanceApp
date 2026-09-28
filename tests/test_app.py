import pytest


def login_admin(client, csrf):
    token = csrf(client.get("/"))
    response = client.post(
        "/login",
        json={"email": "admin@example.com", "password": "Temporary@123"},
        headers={"X-CSRFToken": token},
    )
    assert response.status_code == 200
    assert response.json["must_change_password"] is True


def trocar_senha(client, csrf):
    token = csrf(client.get("/trocar-senha"))
    response = client.put(
        "/api/account/password",
        json={
            "senha_atual": "Temporary@123",
            "nova_senha": "NovaSenha@123",
            "confirmar_senha": "NovaSenha@123",
        },
        headers={"X-CSRFToken": token},
    )
    assert response.status_code == 200


def test_csrf_protege_login(client):
    response = client.post(
        "/login", json={"email": "admin@example.com", "password": "Temporary@123"}
    )
    assert response.status_code == 400


def test_politica_de_senha_aceita_oito_caracteres():
    import main

    assert main.senha_forte("Aa1@bbbb") == "Aa1@bbbb"
    with pytest.raises(ValueError, match="mínimo 8 caracteres"):
        main.senha_forte("Aa1@bbb")


def test_senha_temporaria_exige_troca(client, csrf):
    login_admin(client, csrf)
    assert client.get("/home").headers["Location"].endswith("/trocar-senha")
    trocar_senha(client, csrf)
    assert client.get("/home").status_code == 200


def test_rotas_privadas_exigem_login(client):
    assert client.get("/api/financas").status_code == 401
    assert client.get("/admin/usuarios").status_code == 401


def test_pagamento_simulado_foi_removido(client, csrf):
    token = csrf(client.get("/"))
    response = client.post(
        "/api/public/cadastro/1/simular-pagamento",
        headers={"X-CSRFToken": token},
    )
    assert response.status_code == 404


def test_cadastro_pago_fica_bloqueado_sem_gateway(client, csrf):
    token = csrf(client.get("/"))
    response = client.post(
        "/api/public/cadastro",
        json={"cpf": "52998224725", "email": "novo@example.com"},
        headers={"X-CSRFToken": token},
    )
    assert response.status_code == 503


def test_admin_configura_valor_do_cadastro(client, csrf, monkeypatch):
    import main

    login_admin(client, csrf)
    trocar_senha(client, csrf)
    token = csrf(client.get("/admin"))
    response = client.post(
        "/api/configuracoes",
        json={
            "tipo_pix": "",
            "chave_pix": "",
            "nome_recebedor": "",
            "banco": "",
            "valor_cadastro_centavos": 2590,
        },
        headers={"X-CSRFToken": token},
    )
    assert response.status_code == 200
    assert client.get("/api/configuracoes").json["valor_cadastro_centavos"] == 2590

    monkeypatch.setattr(main, "PAYMENTS_ENABLED", True)
    monkeypatch.setenv("ASAAS_ENVIRONMENT", "sandbox")
    monkeypatch.setenv("ASAAS_API_KEY", "$aact_hmlg_teste")
    monkeypatch.setenv("ASAAS_WEBHOOK_TOKEN", "webhook-secreto-teste")
    assert client.get("/api/public/pix").json["valor_centavos"] == 2590


def test_fluxo_cadastro_pix_asaas(client, csrf, monkeypatch):
    import main
    import database

    monkeypatch.setattr(main, "PAYMENTS_ENABLED", True)
    monkeypatch.setattr(main, "CADASTRO_VALOR_CENTAVOS", 1990)
    monkeypatch.setenv("ASAAS_ENVIRONMENT", "sandbox")
    monkeypatch.setenv("ASAAS_API_KEY", "$aact_hmlg_teste")
    monkeypatch.setenv("ASAAS_WEBHOOK_TOKEN", "webhook-secreto-teste")

    chamadas = []

    def asaas_falso(method, path, payload=None, query=None):
        chamadas.append((method, path, payload, query))
        if method == "GET" and path == "/payments":
            return {"data": []}
        if method == "GET" and path == "/customers":
            return {"data": []}
        if method == "POST" and path == "/customers":
            assert payload["cpfCnpj"] == "52998224725"
            assert payload["notificationDisabled"] is True
            return {"id": "cus_teste"}
        if method == "POST" and path == "/payments":
            assert payload["customer"] == "cus_teste"
            assert payload["billingType"] == "PIX"
            assert payload["value"] == 19.9
            return {"id": "pay_teste"}
        if method == "GET" and path == "/payments/pay_teste/pixQrCode":
            return {
                "payload": "000201010212PIX-DINAMICO-ASAAS",
                "expirationDate": "2026-09-29 23:59:59",
            }
        raise AssertionError(f"Chamada inesperada: {method} {path}")

    monkeypatch.setattr(main, "asaas_request", asaas_falso)
    token_csrf = csrf(client.get("/"))
    response = client.post(
        "/api/public/cadastro",
        json={
            "nome": "Pessoa de Teste",
            "cpf": "52998224725",
            "email": "novo@example.com",
        },
        headers={"X-CSRFToken": token_csrf},
    )
    assert response.status_code == 201
    assert response.json["pix"]["payload"] == "000201010212PIX-DINAMICO-ASAAS"
    solicitacao = response.json["solicitacao_token"]

    repetida = client.post(
        "/api/public/cadastro",
        json={
            "nome": "Pessoa de Teste",
            "cpf": "52998224725",
            "email": "novo@example.com",
        },
        headers={"X-CSRFToken": token_csrf},
    )
    assert repetida.status_code == 201, repetida.json
    assert repetida.json["pix"]["payload"] == "000201010212PIX-DINAMICO-ASAAS"
    assert len(chamadas) == 5

    # Uma mudança de preço não pode invalidar a cobrança já emitida.
    database.salvar_ou_atualizar_configuracoes("", "", "", "", 2990)

    invalido = client.post(
        "/api/payments/webhook",
        json={"event": "PAYMENT_RECEIVED", "payment": {}},
        headers={"asaas-access-token": "incorreto"},
    )
    assert invalido.status_code == 401

    webhook = client.post(
        "/api/payments/webhook",
        json={
            "event": "PAYMENT_RECEIVED",
            "payment": {
                "id": "pay_teste",
                "externalReference": solicitacao,
                "value": 19.90,
                "status": "RECEIVED",
            },
        },
        headers={"asaas-access-token": "webhook-secreto-teste"},
    )
    assert webhook.status_code == 200
    assert webhook.json["status"] == "ok"

    repetido = client.post(
        "/api/payments/webhook",
        json={
            "event": "PAYMENT_RECEIVED",
            "payment": {
                "id": "pay_teste",
                "externalReference": solicitacao,
                "value": 19.90,
                "status": "RECEIVED",
            },
        },
        headers={"asaas-access-token": "webhook-secreto-teste"},
    )
    assert repetido.status_code == 200
    assert repetido.json["status"] == "ok"

    status = client.get(f"/api/public/cadastro/{solicitacao}")
    assert status.json["pagamento_status"] == "pago"

    finalizado = client.post(
        "/api/public/finalizar-cadastro",
        json={
            "solicitacao_token": solicitacao,
            "nome": "Pessoa de Teste",
            "email": "novo@example.com",
            "senha": "SenhaForte@123",
            "confirmar_senha": "SenhaForte@123",
        },
        headers={"X-CSRFToken": token_csrf},
    )
    assert finalizado.status_code == 201


def test_crud_financeiro_autenticado(client, csrf):
    login_admin(client, csrf)
    trocar_senha(client, csrf)
    token = csrf(client.get("/home"))
    response = client.post(
        "/lancamentos",
        json={
            "data": "2026-09-26",
            "tipo": "Entrada",
            "descricao": "Receita teste",
            "valor": "125.50",
            "obs": "",
        },
        headers={"X-CSRFToken": token},
    )
    assert response.status_code == 201
    lancamentos = client.get("/api/financas").json
    assert len(lancamentos) == 1
    assert lancamentos[0]["valor"] == 125.5 or lancamentos[0]["valor"] == "125.5"


def test_recuperacao_senha_com_token_unico(client, csrf, monkeypatch):
    import main

    enviado = {}
    monkeypatch.setattr(main, "recuperacao_senha_configurada", lambda: True)

    def email_falso(destinatario, nome, link):
        enviado.update(destinatario=destinatario, nome=nome, link=link)

    monkeypatch.setattr(main, "enviar_email_recuperacao", email_falso)
    token_csrf = csrf(client.get("/recuperar-senha"))
    response = client.post(
        "/api/public/password-reset/request",
        json={"email": "admin@example.com"},
        headers={"X-CSRFToken": token_csrf},
    )
    assert response.status_code == 200
    assert "existir uma conta" in response.json["mensagem"]
    assert enviado["destinatario"] == "admin@example.com"

    path = enviado["link"].replace("http://localhost", "")
    page = client.get(path)
    assert page.status_code == 200
    assert b'data-token="' in page.data
    token = path.rsplit("/", 1)[-1]
    token_csrf = csrf(page)
    response = client.post(
        "/api/public/password-reset/confirm",
        json={
            "token": token,
            "nova_senha": "SenhaRecuperada@123",
            "confirmar_senha": "SenhaRecuperada@123",
        },
        headers={"X-CSRFToken": token_csrf},
    )
    assert response.status_code == 200

    reused = client.post(
        "/api/public/password-reset/confirm",
        json={
            "token": token,
            "nova_senha": "OutraSenhaForte@123",
            "confirmar_senha": "OutraSenhaForte@123",
        },
        headers={"X-CSRFToken": token_csrf},
    )
    assert reused.status_code == 400

    login_token = csrf(client.get("/"))
    login = client.post(
        "/login",
        json={"email": "admin@example.com", "password": "SenhaRecuperada@123"},
        headers={"X-CSRFToken": login_token},
    )
    assert login.status_code == 200
    assert login.json["must_change_password"] is False


def test_recuperacao_nao_revela_email_inexistente(client, csrf, monkeypatch):
    import main

    monkeypatch.setattr(main, "recuperacao_senha_configurada", lambda: True)
    monkeypatch.setattr(
        main,
        "enviar_email_recuperacao",
        lambda *_args, **_kwargs: (_ for _ in ()).throw(AssertionError("não deve enviar")),
    )
    token = csrf(client.get("/recuperar-senha"))
    response = client.post(
        "/api/public/password-reset/request",
        json={"email": "inexistente@example.com"},
        headers={"X-CSRFToken": token},
    )
    assert response.status_code == 200
    assert "existir uma conta" in response.json["mensagem"]
