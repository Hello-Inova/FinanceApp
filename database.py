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
            senha TEXT NOT NULL,
            perfil TEXT NOT NULL DEFAULT 'Padrão',
            ativo INTEGER NOT NULL DEFAULT 1
        )
    """)

    cursor.execute("""
        CREATE TABLE IF NOT EXISTS lancamentos (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            usuario_id INTEGER NOT NULL,
            data TEXT NOT NULL,
            tipo TEXT NOT NULL,
            descricao TEXT NOT NULL,
            valor REAL NOT NULL,
            obs TEXT,
            FOREIGN KEY(usuario_id)
            REFERENCES usuarios(id)
        )
    """)

    cursor.execute("""
        CREATE TABLE IF NOT EXISTS compras (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            usuario_id INTEGER NOT NULL,
            data TEXT NOT NULL,
            categoria TEXT NOT NULL,
            item TEXT NOT NULL,
            quantidade REAL NOT NULL,
            valor_unitario REAL NOT NULL,
            valor_total REAL NOT NULL,
            comprado INTEGER NOT NULL DEFAULT 0,
            obs TEXT,
            FOREIGN KEY(usuario_id)
            REFERENCES usuarios(id)
        )
    """)

    conn.commit()
    conn.close()


# =========================
# USUÁRIOS
# =========================

def criar_usuario(nome, email, senha, perfil):

    senha_hash = generate_password_hash(senha)

    conn = conectar()
    cursor = conn.cursor()

    cursor.execute("""
        INSERT INTO usuarios
        (nome, email, senha, perfil)
        VALUES (?, ?, ?, ?)
    """, (
        nome,
        email,
        senha_hash,
        perfil
    ))

    conn.commit()
    conn.close()


def buscar_usuario(email, senha):

    conn = conectar()
    cursor = conn.cursor()

    cursor.execute("""
        SELECT id, nome, email, senha, perfil, ativo
        FROM usuarios
        WHERE email = ?
    """, (email,))

    usuario = cursor.fetchone()

    conn.close()

    if not usuario:
        return None

    if usuario["ativo"] != 1:
        return None

    if check_password_hash(usuario["senha"], senha):

        return {
            "id": usuario["id"],
            "nome": usuario["nome"],
            "email": usuario["email"],
            "perfil": usuario["perfil"],
            "ativo": usuario["ativo"]
        }

    return None


def listar_usuarios():

    conn = conectar()
    cursor = conn.cursor()

    cursor.execute("""
        SELECT
            id,
            nome,
            email,
            perfil,
            ativo
        FROM usuarios
        ORDER BY nome ASC
    """)

    usuarios = [
        dict(row)
        for row in cursor.fetchall()
    ]

    conn.close()

    return usuarios


def atualizar_perfil_usuario(usuario_id, perfil):

    conn = conectar()
    cursor = conn.cursor()

    cursor.execute("""
        UPDATE usuarios
        SET perfil = ?
        WHERE id = ?
    """, (
        perfil,
        usuario_id
    ))

    conn.commit()
    conn.close()


def atualizar_status_usuario(usuario_id, ativo):

    conn = conectar()
    cursor = conn.cursor()

    cursor.execute("""
        UPDATE usuarios
        SET ativo = ?
        WHERE id = ?
    """, (
        ativo,
        usuario_id
    ))

    conn.commit()
    conn.close()


def alterar_senha_usuario(usuario_id, nova_senha):

    senha_hash = generate_password_hash(nova_senha)

    conn = conectar()
    cursor = conn.cursor()

    cursor.execute("""
        UPDATE usuarios
        SET senha = ?
        WHERE id = ?
    """, (
        senha_hash,
        usuario_id
    ))

    conn.commit()
    conn.close()


def atualizar_dados_usuario(usuario_id, nome, email, perfil):

    conn = conectar()
    cursor = conn.cursor()

    cursor.execute("""
        UPDATE usuarios
        SET
            nome = ?,
            email = ?,
            perfil = ?
        WHERE id = ?
    """, (
        nome,
        email,
        perfil,
        usuario_id
    ))

    conn.commit()
    conn.close()


def excluir_usuario(usuario_id):

    conn = conectar()
    cursor = conn.cursor()

    cursor.execute("""
        DELETE FROM lancamentos
        WHERE usuario_id = ?
    """, (usuario_id,))

    cursor.execute("""
        DELETE FROM compras
        WHERE usuario_id = ?
    """, (usuario_id,))

    cursor.execute("""
        DELETE FROM usuarios
        WHERE id = ?
    """, (usuario_id,))

    conn.commit()
    conn.close()


# =========================
# LANÇAMENTOS
# =========================

def listar_lancamentos(usuario_id):

    conn = conectar()
    cursor = conn.cursor()

    cursor.execute("""
        SELECT *
        FROM lancamentos
        WHERE usuario_id = ?
        ORDER BY id DESC
    """, (usuario_id,))

    registros = [
        dict(row)
        for row in cursor.fetchall()
    ]

    conn.close()

    return registros


def listar_lancamentos_usuario(usuario_id):

    return listar_lancamentos(usuario_id)


def criar_lancamento(
    usuario_id,
    data,
    tipo,
    descricao,
    valor,
    obs
):

    conn = conectar()
    cursor = conn.cursor()

    cursor.execute("""
        INSERT INTO lancamentos
        (
            usuario_id,
            data,
            tipo,
            descricao,
            valor,
            obs
        )
        VALUES (?, ?, ?, ?, ?, ?)
    """, (
        usuario_id,
        data,
        tipo,
        descricao,
        valor,
        obs
    ))

    conn.commit()
    conn.close()


def atualizar_lancamento(
    usuario_id,
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
        AND usuario_id = ?
    """, (
        data,
        tipo,
        descricao,
        valor,
        obs,
        id,
        usuario_id
    ))

    conn.commit()
    conn.close()


def excluir_lancamento(usuario_id, id):

    conn = conectar()
    cursor = conn.cursor()

    cursor.execute("""
        DELETE FROM lancamentos
        WHERE id = ?
        AND usuario_id = ?
    """, (
        id,
        usuario_id
    ))

    conn.commit()
    conn.close()


# =========================
# COMPRAS
# =========================

def listar_compras(usuario_id):

    conn = conectar()
    cursor = conn.cursor()

    cursor.execute("""
        SELECT *
        FROM compras
        WHERE usuario_id = ?
        ORDER BY id DESC
    """, (usuario_id,))

    registros = [
        dict(row)
        for row in cursor.fetchall()
    ]

    conn.close()

    return registros


def criar_compra(
    usuario_id,
    data,
    categoria,
    item,
    quantidade,
    valor_unitario,
    obs
):

    quantidade = float(quantidade)
    valor_unitario = float(valor_unitario)
    valor_total = quantidade * valor_unitario

    conn = conectar()
    cursor = conn.cursor()

    cursor.execute("""
        INSERT INTO compras
        (
            usuario_id,
            data,
            categoria,
            item,
            quantidade,
            valor_unitario,
            valor_total,
            comprado,
            obs
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, (
        usuario_id,
        data,
        categoria,
        item,
        quantidade,
        valor_unitario,
        valor_total,
        0,
        obs
    ))

    conn.commit()
    conn.close()


def atualizar_compra(
    usuario_id,
    id,
    data,
    categoria,
    item,
    quantidade,
    valor_unitario,
    obs
):

    quantidade = float(quantidade)
    valor_unitario = float(valor_unitario)
    valor_total = quantidade * valor_unitario

    conn = conectar()
    cursor = conn.cursor()

    cursor.execute("""
        UPDATE compras
        SET
            data = ?,
            categoria = ?,
            item = ?,
            quantidade = ?,
            valor_unitario = ?,
            valor_total = ?,
            obs = ?
        WHERE id = ?
        AND usuario_id = ?
    """, (
        data,
        categoria,
        item,
        quantidade,
        valor_unitario,
        valor_total,
        obs,
        id,
        usuario_id
    ))

    conn.commit()
    conn.close()


def atualizar_status_compra(usuario_id, id, comprado):

    conn = conectar()
    cursor = conn.cursor()

    cursor.execute("""
        UPDATE compras
        SET comprado = ?
        WHERE id = ?
        AND usuario_id = ?
    """, (
        comprado,
        id,
        usuario_id
    ))

    conn.commit()
    conn.close()


def excluir_compra(usuario_id, id):

    conn = conectar()
    cursor = conn.cursor()

    cursor.execute("""
        DELETE FROM compras
        WHERE id = ?
        AND usuario_id = ?
    """, (
        id,
        usuario_id
    ))

    conn.commit()
    conn.close()