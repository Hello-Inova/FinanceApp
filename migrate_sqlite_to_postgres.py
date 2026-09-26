"""One-time, idempotent migration from the bundled SQLite database to Postgres."""

import os
import sqlite3

import psycopg
from dotenv import load_dotenv


TABLES = (
    "usuarios",
    "lancamentos",
    "compras",
    "configuracoes",
    "solicitacoes_cadastro",
)


def main():
    load_dotenv(".env.local")
    database_url = os.getenv("DATABASE_URL")
    if not database_url:
        raise RuntimeError("DATABASE_URL is not configured")

    source = sqlite3.connect("financeiro.db")
    source.row_factory = sqlite3.Row

    with psycopg.connect(database_url) as destination:
        with destination.cursor() as cursor:
            for table in TABLES:
                rows = source.execute(f"SELECT * FROM {table}").fetchall()
                if not rows:
                    continue

                columns = rows[0].keys()
                column_list = ", ".join(columns)
                placeholders = ", ".join(["%s"] * len(columns))
                updates = ", ".join(
                    f"{column} = EXCLUDED.{column}"
                    for column in columns
                    if column != "id"
                )
                query = (
                    f"INSERT INTO {table} ({column_list}) VALUES ({placeholders}) "
                    f"ON CONFLICT (id) DO UPDATE SET {updates}"
                )
                cursor.executemany(query, [tuple(row) for row in rows])

                cursor.execute(
                    "SELECT setval(pg_get_serial_sequence(%s, 'id'), "
                    f"COALESCE((SELECT MAX(id) FROM {table}), 1), true)",
                    (table,),
                )

    source.close()
    print("Migration completed successfully.")


if __name__ == "__main__":
    main()
