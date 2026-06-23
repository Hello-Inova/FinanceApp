from database import conectar

conn = conectar()

conn.execute("DELETE FROM lancamentos")

conn.commit()

conn.close()

print("Lançamentos removidos.")