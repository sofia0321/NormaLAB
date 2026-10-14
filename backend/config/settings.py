import os
from dataclasses import dataclass

_BASE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))


@dataclass(frozen=True)
class DBConfig:
    host: str = os.getenv("NORMALAB_DB_HOST", "localhost")
    port: int = int(os.getenv("NORMALAB_DB_PORT", "5432"))
    database: str = os.getenv("NORMALAB_DB_NAME", "normalab")
    user: str = os.getenv("NORMALAB_DB_USER", "normalab_app")
    password: str = os.getenv("NORMALAB_DB_PASSWORD", "")


@dataclass(frozen=True)
class AppConfig:
    app_name: str = "NormaLAB"
    version: str = "3.0.0-web"
    institucion: str = "Institución Universitaria Colegio Mayor del Cauca"
    secret_key: str = os.getenv("NORMALAB_SECRET_KEY", "cambie-esta-clave-en-produccion")
    max_evidence_size_mb: int = 25          
    allowed_evidence_extensions: tuple = (".pdf", ".doc", ".docx", ".xls", ".xlsx",
                                          ".jpg", ".jpeg", ".png")
    log_dir: str = os.path.join(_BASE, "logs")
    upload_dir: str = os.getenv("NORMALAB_UPLOAD_DIR", os.path.join(_BASE, "uploads"))
    usuario_sistema: str = "sistema"


DB_CONFIG = DBConfig()
APP_CONFIG = AppConfig()
