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
