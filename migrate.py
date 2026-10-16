"""Run FinanceApp schema migrations as an explicit deployment step."""

from database import criar_admin_inicial, criar_tabelas


if __name__ == "__main__":
    criar_tabelas()
    criar_admin_inicial()
    print("Migrações concluídas.")
