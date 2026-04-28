import sqlite3
import os
from datetime import datetime, timedelta

DB_PATH = os.path.join(os.path.dirname(__file__), "noticias.db")


def init_db():
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()
    c.execute("PRAGMA journal_mode=WAL")
    c.execute("""
        CREATE TABLE IF NOT EXISTS tdf_noticias (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            fecha DATE NOT NULL,
            titular TEXT NOT NULL,
            cuerpo TEXT NOT NULL,
            fuente_url TEXT,
            portal TEXT,
            enviada_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    """)
    c.execute("CREATE INDEX IF NOT EXISTS idx_fecha ON tdf_noticias(fecha)")
    fecha_limite_limpieza = (datetime.now() - timedelta(days=30)).strftime("%Y-%m-%d")
    c.execute("DELETE FROM tdf_noticias WHERE fecha < ?", (fecha_limite_limpieza,))
    conn.commit()
    conn.close()


def ya_enviada(titular: str) -> bool:
    """Verifica si un titular similar ya fue enviado en los últimos 7 días."""
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()
    fecha_limite = (datetime.now() - timedelta(days=7)).strftime("%Y-%m-%d")
    # Compara los primeros 50 caracteres del titular
    c.execute(
        """
        SELECT COUNT(*) FROM tdf_noticias
        WHERE fecha >= ? AND LOWER(titular) LIKE LOWER(?)
        """,
        (fecha_limite, f"%{titular[:50].strip()}%"),
    )
    count = c.fetchone()[0]
    conn.close()
    return count > 0


def guardar_notas(notas: list, fecha: str):
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()
    for nota in notas:
        c.execute(
            """
            INSERT INTO tdf_noticias (fecha, titular, cuerpo, fuente_url, portal)
            VALUES (?, ?, ?, ?, ?)
            """,
            (
                fecha,
                nota.get("titular", ""),
                nota.get("cuerpo", ""),
                nota.get("fuente_url", ""),
                nota.get("portal", ""),
            ),
        )
    conn.commit()
    conn.close()


def notas_de_la_semana() -> list:
    """Devuelve todas las notas enviadas en los últimos 7 días."""
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()
    fecha_inicio = (datetime.now() - timedelta(days=7)).strftime("%Y-%m-%d")
    c.execute(
        """
        SELECT fecha, titular, portal, enviada_at
        FROM tdf_noticias
        WHERE fecha >= ?
        ORDER BY fecha DESC
        """,
        (fecha_inicio,),
    )
    rows = c.fetchall()
    conn.close()
    return rows
