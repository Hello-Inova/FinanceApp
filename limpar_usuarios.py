from database import conectar

conn = conectar()

conn.execute("DELETE FROM usuarios")

conn.commit()

conn.close()

print("Usuários removidos.")