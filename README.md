# FinanceApp

Aplicativo financeiro em Flask, com PostgreSQL em produção e SQLite apenas para desenvolvimento/testes.

## Segurança implementada

- Sessões revalidadas no banco, cookies `HttpOnly`, `Secure` e `SameSite=Strict`.
- Troca obrigatória de senhas temporárias e política de senha forte.
- CSRF em operações de escrita, rate limit persistente no login/cadastro e cabeçalhos de segurança.
- Autorização administrativa consultada no banco; alterações de perfil, status e senha invalidam sessões antigas.
- Valores monetários armazenados como `NUMERIC`, validação de datas/CPF/e-mail e transações atômicas.
- Solicitações públicas usam tokens aleatórios. A antiga simulação de pagamento foi removida.
- Cadastro pago integrado à Asaas com cobrança PIX dinâmica e confirmação por webhook autenticado.

## Desenvolvimento

```bash
python -m venv .venv
python -m pip install -r requirements-dev.txt
python main.py
python -m pytest tests -q
```

Copie `.env.example` para `.env`, use `APP_ENV=development` e configure uma `SECRET_KEY` local. O schema é atualizado automaticamente por migrações idempotentes. O CI executa compilação e testes a cada push e pull request.

## Variáveis de produção

- `DATABASE_URL`: conexão PostgreSQL com SSL.
- `SECRET_KEY`: segredo aleatório longo; nunca versionar.
- `APP_ENV=production`.
- `ADMIN_NAME`, `ADMIN_EMAIL`, `ADMIN_PASSWORD`: somente para o primeiro acesso. Remova `ADMIN_PASSWORD` depois da troca da senha.
- `PAYMENTS_ENABLED=false`: mantenha assim até validar todo o fluxo no Sandbox da Asaas.
- `CADASTRO_VALOR_CENTAVOS`: preço inicial/fallback em centavos. Depois da primeira
  configuração, o administrador altera o valor em **Administração > Configurações**
  sem precisar publicar novamente o sistema.
- `ASAAS_ENVIRONMENT`: `sandbox` durante os testes ou `production` na operação real.
- `ASAAS_API_KEY`: chave secreta do mesmo ambiente configurado acima.
- `ASAAS_WEBHOOK_TOKEN`: token aleatório enviado pela Asaas no cabeçalho `asaas-access-token`.
- `APP_BASE_URL`: URL pública canônica, usada nos links de recuperação.
- `RESEND_API_KEY`: chave de envio criada no Resend.
- `RESEND_FROM_EMAIL`: remetente verificado, por exemplo `FinanceApp <nao-responda@seudominio.com>`.

## Recuperação de senha

O fluxo usa tokens aleatórios de uso único, armazena apenas o hash SHA-256 no banco, expira em 30 minutos e invalida sessões anteriores apó a troca. A solicitação sempre retorna a mesma mensagem para não revelar quais e-mails estão cadastrados. Para produção, verifique o domínio no Resend e configure as três variáveis acima na Vercel.

## Webhook de pagamento

Configure na Asaas um webhook `POST` apontando para
`https://seu-dominio/api/payments/webhook`, com os eventos
`PAYMENT_CONFIRMED` e `PAYMENT_RECEIVED`. O token configurado na Asaas deve ser
idêntico a `ASAAS_WEBHOOK_TOKEN`; ele será recebido no cabeçalho
`asaas-access-token`.

O backend aceita somente os eventos confirmados, confere ID, referência externa e
valor exato antes de liberar o cadastro. Eventos repetidos são tratados de forma
idempotente. Teste primeiro no Sandbox e só então troque a chave, o ambiente e
ative `PAYMENTS_ENABLED=true` em produção.

## Operação

- `GET /api/health` verifica aplicação e banco.
- Configure monitor externo para esse endpoint e alertas de erro/latência na Vercel.
- Habilite retenção/point-in-time restore no PostgreSQL e teste restaurações periodicamente.
- Nunca versionar bancos, arquivos `.sqbpro`, `.env` ou caches Python.
