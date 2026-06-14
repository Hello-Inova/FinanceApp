import sqlite3

DB_NAME = "financeiro.db"

from werkzeug.security import (
    generate_password_hash,
    check_password_hash
)

# =========================
# CONEXÃO
# =========================

def conectar():
    conn = sqlite3.connect(DB_NAME)
    conn.row_factory = sqlite3.Row
    return conn


# =========================
# CRIAR TABELAS
# =========================

def criar_tabelas():
    conn = conectar()
    cursor = conn.cursor()

    cursor.execute("""
        CREATE TABLE IF NOT EXISTS usuarios (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            nome TEXT NOT NULL,
            email TEXT NOT NULL UNIQUE,
            senha TEXT NOT NULL
        )
    """)

    cursor.execute("""
        CREATE TABLE IF NOT EXISTS lancamentos (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            data TEXT NOT NULL,
            tipo TEXT NOT NULL,
            descricao TEXT NOT NULL,
            valor REAL NOT NULL,
            obs TEXT
        )
    """)

    conn.commit()
    conn.close()


# =========================
# USUÁRIOS
# =========================

def criar_usuario(nome, email, senha):

    senha_hash = generate_password_hash(senha)

    conn = conectar()
    cursor = conn.cursor()

    cursor.execute("""
        INSERT INTO usuarios
        (nome, email, senha)
        VALUES (?, ?, ?)
    """, (
        nome,
        email,
        senha_hash
    ))

    conn.commit()
    conn.close()


def buscar_usuario(email, senha):

    conn = conectar()
    cursor = conn.cursor()

    cursor.execute("""
        SELECT *
        FROM usuarios
        WHERE email = ?
    """, (email,))

    usuario = cursor.fetchone()

    conn.close()

    if not usuario:
        return None

    if check_password_hash(
        usuario["senha"],
        senha
    ):
        return usuario

    return None


# =========================
# LANÇAMENTOS
# =========================

def listar_lancamentos():
    conn = conectar()
    cursor = conn.cursor()

    cursor.execute("""
        SELECT *
        FROM lancamentos
        ORDER BY id DESC
    """)

    registros = [
        dict(row)
        for row in cursor.fetchall()
    ]

    conn.close()

    return registros


def criar_lancamento(data, tipo, descricao, valor, obs):
    conn = conectar()
    cursor = conn.cursor()

    cursor.execute("""
        INSERT INTO lancamentos
        (data, tipo, descricao, valor, obs)
        VALUES (?, ?, ?, ?, ?)
    """, (
        data,
        tipo,
        descricao,
        valor,
        obs
    ))

    conn.commit()
    conn.close()


def atualizar_lancamento(
    id,
    data,
    tipo,
    descricao,
    valor,
    obs
):
    conn = conectar()
    cursor = conn.cursor()

    cursor.execute("""
        UPDATE lancamentos
        SET
            data = ?,
            tipo = ?,
            descricao = ?,
            valor = ?,
            obs = ?
        WHERE id = ?
    """, (
        data,
        tipo,
        descricao,
        valor,
        obs,
        id
    ))

    conn.commit()
    conn.close()


def excluir_lancamento(id):
    conn = conectar()
    cursor = conn.cursor()

    cursor.execute("""
        DELETE FROM lancamentos
        WHERE id = ?
    """, (id,))

    conn.commit()
    conn.close()

