import logging
from contextlib import contextmanager

import psycopg2
import psycopg2.extras
from psycopg2 import pool

from config.settings import DB_CONFIG

logger = logging.getLogger("normalab.db")

_connection_pool: pool.ThreadedConnectionPool | None = None


def init_pool(minconn: int = 1, maxconn: int = 10) -> None:
    global _connection_pool
    if _connection_pool is not None:
        return
    try:
        _connection_pool = psycopg2.pool.ThreadedConnectionPool(
            minconn,
            maxconn,
            host=DB_CONFIG.host,
            port=DB_CONFIG.port,
            dbname=DB_CONFIG.database,
            user=DB_CONFIG.user,
            password=DB_CONFIG.password,
        )
        logger.info("Pool de conexiones a PostgreSQL inicializado.")
    except psycopg2.OperationalError as exc:
        logger.error("No se pudo conectar a la base de datos: %s", exc)
        raise ConnectionError(
            "No fue posible establecer conexión con la base de datos. "
            "Verifique que PostgreSQL esté disponible y revise la configuración."
        ) from exc


@contextmanager
def get_connection():
    if _connection_pool is None:
        init_pool()
    conn = _connection_pool.getconn()
    try:
        yield conn
    finally:
        _connection_pool.putconn(conn)


@contextmanager
def get_cursor(commit: bool = False):
    with get_connection() as conn:
        cursor = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
        try:
            yield cursor
            if commit:
                conn.commit()
        except Exception:
            conn.rollback()
            logger.exception("Transacción revertida por error en operación de base de datos.")
            raise
        finally:
            cursor.close()


def close_pool() -> None:
    global _connection_pool
    if _connection_pool is not None:
        _connection_pool.closeall()
        _connection_pool = None
        logger.info("Pool de conexiones cerrado.")
