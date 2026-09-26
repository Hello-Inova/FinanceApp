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
