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
    assert client.get("/api/agenda").status_code == 401
    assert client.get("/admin/usuarios").status_code == 401


def test_arquivos_estaticos_nao_consultam_banco_de_sessao(client, monkeypatch):
    import main

    chamadas = []
    monkeypatch.setattr(main, "buscar_usuario_por_id", lambda usuario_id: chamadas.append(usuario_id))
    with client.session_transaction() as sessao:
        sessao["usuario_id"] = 123
        sessao["session_version"] = 1

    resposta = client.get("/static/js/menu.js")
    assert resposta.status_code == 200
    assert chamadas == []
    assert "max-age=300" in resposta.headers["Cache-Control"]


def test_loading_cobre_requisicoes_e_navegacao(client):
    script = client.get("/static/js/security.js").get_data(as_text=True)
    assert 'method === "GET" ||' not in script
    assert 'showLoading("Abrindo página...")' in script


def test_identidade_visual_e_threejs_presentes(client):
    login = client.get("/").get_data(as_text=True)
    cena = client.get("/static/js/three-scene.js").get_data(as_text=True)
    menu = client.get("/components/menu.html").get_data(as_text=True)

    assert 'class="auth-brand"' in login
    assert 'type="module" src="/static/js/three-scene.js?v=1"' in login
    assert "three@0.186.0" in cena
    assert 'src="/static/img/favicon.png"' in menu


def test_pagamento_simulado_foi_removido(client, csrf):
    token = csrf(client.get("/"))
    response = client.post(
        "/api/public/cadastro/1/simular-pagamento",
        headers={"X-CSRFToken": token},
    )
    assert response.status_code == 404


def test_cadastro_exibe_valor_da_cobranca(client):
    pagina = client.get("/")
    conteudo = pagina.get_data(as_text=True)
    assert pagina.status_code == 200
    assert 'id="valorCadastroPix"' in conteudo
    assert 'id="valorPagamentoPix"' in conteudo
    assert "Valor do cadastro" in conteudo
    assert "Valor a pagar" in conteudo


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
            "periodo_teste_dias": 14,
        },
        headers={"X-CSRFToken": token},
    )
    assert response.status_code == 200
    assert client.get("/api/configuracoes").json["valor_cadastro_centavos"] == 2590
    assert client.get("/api/configuracoes").json["periodo_teste_dias"] == 14

    monkeypatch.setattr(main, "PAYMENTS_ENABLED", True)
    monkeypatch.setenv("ASAAS_ENVIRONMENT", "sandbox")
    monkeypatch.setenv("ASAAS_API_KEY", "$aact_hmlg_teste")
    monkeypatch.setenv("ASAAS_WEBHOOK_TOKEN", "webhook-secreto-teste")
    assert client.get("/api/public/pix").json["valor_centavos"] == 2590


def test_periodo_teste_configuravel_e_exibido_na_sessao(client, csrf):
    login_admin(client, csrf)
    trocar_senha(client, csrf)
    pagina_admin = client.get("/admin")
    assert 'id="periodoTesteDias"' in pagina_admin.get_data(as_text=True)

    token = csrf(pagina_admin)
    configuracao = client.post(
        "/api/configuracoes",
        json={
            "tipo_pix": "",
            "chave_pix": "",
            "nome_recebedor": "",
            "banco": "",
            "valor_cadastro_centavos": 1990,
            "periodo_teste_dias": 10,
        },
        headers={"X-CSRFToken": token},
    )
    assert configuracao.status_code == 200

    criado = client.post(
        "/usuarios",
        json={
            "nome": "Usuário em Teste",
            "cpf": "11144477735",
            "email": "trial@example.com",
            "senha": "Teste@123",
            "perfil": "Padrão",
        },
        headers={"X-CSRFToken": token},
    )
    assert criado.status_code == 201

    client.post("/logout", headers={"X-CSRFToken": token})
    token_login = csrf(client.get("/"))
    login = client.post(
        "/login",
        json={"email": "trial@example.com", "password": "Teste@123"},
        headers={"X-CSRFToken": token_login},
    )
    assert login.status_code == 200
    teste = client.get("/session").json["teste"]
    assert teste["ativo"] is True
    assert teste["expirado"] is False
    assert teste["dias_restantes"] == 10

    menu_script = client.get("/static/js/menu.js").get_data(as_text=True)
    security_script = client.get("/static/js/security.js").get_data(as_text=True)
    assert "Teste gratuito" in menu_script
    assert "trialBanner" in menu_script
    assert 'removeItem("financeapp-session-v2")' in security_script


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
    for rota in ("/financas/entradas", "/financas/saidas", "/financas/saldo"):
        pagina = client.get(rota)
        assert pagina.status_code == 200
        conteudo = pagina.get_data(as_text=True)
        assert "Novo lançamento" in conteudo
        assert 'id="modalNovoLancamento"' in conteudo


def test_menu_compartilhado_em_todas_as_telas_autenticadas(client, csrf):
    login_admin(client, csrf)
    trocar_senha(client, csrf)
    rotas = (
        "/home", "/metas", "/financas", "/agenda", "/compras", "/admin",
        "/financas/entradas", "/financas/saidas", "/financas/saldo",
    )
    for rota in rotas:
        pagina = client.get(rota)
        conteudo = pagina.get_data(as_text=True)
        assert pagina.status_code == 200
        assert "app-shell.css" in conteudo
        assert 'id="menu-container"' in conteudo


def test_crud_agenda_autenticada(client, csrf):
    login_admin(client, csrf)
    trocar_senha(client, csrf)
    pagina = client.get("/agenda")
    assert pagina.status_code == 200
    assert "Minha agenda" in pagina.get_data(as_text=True)
    token = csrf(pagina)

    criada = client.post(
        "/api/agenda",
        json={
            "titulo": "Pagar internet",
            "data": "2026-10-05",
            "horario": "09:30",
            "categoria": "Financeiro",
            "status": "Pendente",
            "descricao": "Vencimento mensal",
        },
        headers={"X-CSRFToken": token},
    )
    assert criada.status_code == 201
    itens = client.get("/api/agenda").json
    assert len(itens) == 1
    agenda_id = itens[0]["id"]

    atualizada = client.put(
        f"/api/agenda/{agenda_id}",
        json={**itens[0], "status": "Concluído"},
        headers={"X-CSRFToken": token},
    )
    assert atualizada.status_code == 200
    assert client.get("/api/agenda").json[0]["status"] == "Concluído"
    excluida = client.delete(f"/api/agenda/{agenda_id}", headers={"X-CSRFToken": token})
    assert excluida.status_code == 200
    assert client.get("/api/agenda").json == []


def test_crud_metas_com_aportes_e_retiradas(client, csrf):
    login_admin(client, csrf)
    trocar_senha(client, csrf)
    pagina = client.get("/metas")
    assert pagina.status_code == 200
    assert b"Minhas metas" in pagina.data
    token = csrf(pagina)

    criada = client.post(
        "/api/metas",
        json={
            "titulo": "Viagem de férias",
            "categoria": "Viagem",
            "valor_alvo": "5000.00",
            "valor_atual": "500.00",
            "data_limite": "2027-01-15",
            "prioridade": "Alta",
            "status": "Ativa",
            "descricao": "Planejamento das férias",
        },
        headers={"X-CSRFToken": token},
    )
    assert criada.status_code == 201, criada.json
    meta_id = criada.json["id"]

    lista = client.get("/api/metas")
    assert lista.status_code == 200
    assert len(lista.json) == 1
    assert lista.json[0]["titulo"] == "Viagem de férias"
    assert float(lista.json[0]["valor_atual"]) == 500

    aporte = client.post(
        f"/api/metas/{meta_id}/movimentacoes",
        json={"tipo": "Aporte", "valor": "4500.00", "descricao": "Bônus"},
        headers={"X-CSRFToken": token},
    )
    assert aporte.status_code == 201, aporte.json
    assert float(aporte.json["valor_atual"]) == 5000
    assert client.get("/api/metas").json[0]["status"] == "Concluída"

    pausa_concluida = client.put(
        f"/api/metas/{meta_id}/status",
        json={"status": "Pausada"},
        headers={"X-CSRFToken": token},
    )
    assert pausa_concluida.status_code == 200
    assert client.get("/api/metas").json[0]["status"] == "Concluída"

    retirada = client.post(
        f"/api/metas/{meta_id}/movimentacoes",
        json={"tipo": "Retirada", "valor": "250.00", "descricao": "Ajuste"},
        headers={"X-CSRFToken": token},
    )
    assert retirada.status_code == 201
    meta = client.get("/api/metas").json[0]
    assert float(meta["valor_atual"]) == 4750
    assert meta["status"] == "Ativa"

    invalida = client.post(
        f"/api/metas/{meta_id}/movimentacoes",
        json={"tipo": "Retirada", "valor": "99999.00"},
        headers={"X-CSRFToken": token},
    )
    assert invalida.status_code == 400
    assert "maior que o valor acumulado" in invalida.json["mensagem"]

    historico = client.get(f"/api/metas/{meta_id}/movimentacoes")
    assert historico.status_code == 200
    assert len(historico.json) == 3

    excluida = client.delete(
        f"/api/metas/{meta_id}", headers={"X-CSRFToken": token}
    )
    assert excluida.status_code == 200
    assert client.get("/api/metas").json == []


def test_recuperacao_senha_com_token_unico(app, client, csrf, monkeypatch):
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
    # O link de e-mail pode ser aberto em outro navegador/dispositivo, sem a
    # sessão e o cookie CSRF usados para solicitar a recuperação.
    cliente_do_link = app.test_client()
    response = cliente_do_link.post(
        "/api/public/password-reset/confirm",
        json={
            "token": token,
            "nova_senha": "SenhaRecuperada@123",
            "confirmar_senha": "SenhaRecuperada@123",
        },
    )
    assert response.status_code == 200

    reused = cliente_do_link.post(
        "/api/public/password-reset/confirm",
        json={
            "token": token,
            "nova_senha": "OutraSenhaForte@123",
            "confirmar_senha": "OutraSenhaForte@123",
        },
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
