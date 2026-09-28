# FinanceApp

Aplicativo financeiro em Flask, com PostgreSQL em produção e SQLite apenas para desenvolvimento/testes.

## Segurança implementada

- Sessões revalidadas no banco, cookies `HttpOnly`, `Secure` e `SameSite=Strict`.
- Troca obrigatória de senhas temporárias e política de senha forte.
- CSRF em operações de escrita, rate limit persistente no login/cadastro e cabeçalhos de segurança.
- Autorização administrativa consultada no banco; alterações de perfil, status e senha invalidam sessões antigas.
- Valores monetários armazenados como `NUMERIC`, validação de datas/CPF/e-mail e transações atômicas.
- Solicitações públicas usam tokens aleatórios. A antiga simulação de pagamento foi removida.
- O cadastro pago permanece desativado até a integração de um gateway real.

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
- `PAYMENTS_ENABLED=false`: mantenha assim até configurar o gateway.
- `CADASTRO_VALOR_CENTAVOS`: preço exato em centavos.
- `PAYMENT_WEBHOOK_SECRET`: segredo compartilhado pelo gateway.
- `APP_BASE_URL`: URL pública canônica, usada nos links de recuperação.
- `RESEND_API_KEY`: chave de envio criada no Resend.
- `RESEND_FROM_EMAIL`: remetente verificado, por exemplo `FinanceApp <nao-responda@seudominio.com>`.

## Recuperação de senha

O fluxo usa tokens aleatórios de uso único, armazena apenas o hash SHA-256 no banco, expira em 30 minutos e invalida sessões anteriores apó a troca. A solicitação sempre retorna a mesma mensagem para não revelar quais e-mails estão cadastrados. Para produção, verifique o domínio no Resend e configure as três variáveis acima na Vercel.

## Webhook de pagamento

`POST /api/payments/webhook`, com o HMAC SHA-256 do corpo bruto no cabeçalho `X-Webhook-Signature`:

```json
{
  "status": "approved",
  "solicitacao_token": "token-publico",
  "external_id": "id-unico-do-gateway",
  "valor_centavos": 1000
}
```

Adapte e valide esse contrato com a documentação oficial do provedor antes de ativar pagamentos.

## Operação

- `GET /api/health` verifica aplicação e banco.
- Configure monitor externo para esse endpoint e alertas de erro/latência na Vercel.
- Habilite retenção/point-in-time restore no PostgreSQL e teste restaurações periodicamente.
- Nunca versionar bancos, arquivos `.sqbpro`, `.env` ou caches Python.
