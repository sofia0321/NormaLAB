"""
NormaLAB Web — punto de entrada.

Versión web de NormaLAB con tres módulos: Dashboard, Normas legales y
Cumplimiento. Reutiliza sin cambios de lógica las capas de servicios,
repositorios y modelos de la versión de escritorio; solo la capa de
presentación (antes Tkinter, ahora Flask + HTML) es nueva.

Ejecución en desarrollo:
    python app.py                      → http://127.0.0.1:5000

Ejecución en servidor (ver README):
    waitress-serve --port=8000 app:app
"""
import logging
import os
import secrets
import sys
from datetime import date, datetime

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from flask import Flask, abort, request, session  # noqa: E402

from config.settings import APP_CONFIG  # noqa: E402
from db.connection import init_pool  # noqa: E402
from services.auth_service import AuthService  # noqa: E402
from services.cumplimiento_service import CumplimientoService  # noqa: E402
from services.norma_service import NormaService  # noqa: E402


def _configurar_logging():
    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
        handlers=[logging.StreamHandler()],
    )


def create_app() -> Flask:
    _configurar_logging()
    app = Flask(__name__)
    app.config["SECRET_KEY"] = APP_CONFIG.secret_key
    app.config["MAX_CONTENT_LENGTH"] = APP_CONFIG.max_evidence_size_mb * 1024 * 1024
    os.makedirs(APP_CONFIG.upload_dir, exist_ok=True)

    auth = AuthService()
    app.extensions["normalab"] = {
        "auth": auth,
        "normas": NormaService(auth),
        "cumplimiento": CumplimientoService(auth),
    }

    def _csrf_token() -> str:
        if "_csrf" not in session:
            session["_csrf"] = secrets.token_urlsafe(32)
        return session["_csrf"]

    @app.before_request
    def _verificar_csrf():
        if request.method == "POST":
            enviado = request.form.get("_csrf", "")
            if not enviado or not secrets.compare_digest(enviado, session.get("_csrf", "")):
                abort(400, "La sesión del formulario expiró. Recargue la página e intente de nuevo.")

    @app.context_processor
    def _contexto_global():
        return {"csrf_token": _csrf_token, "APP": APP_CONFIG, "hoy": date.today()}

    @app.template_filter("fecha")
    def _fmt_fecha(valor):
        if not valor:
            return "—"
        if isinstance(valor, datetime):
            valor = valor.date()
        return valor.strftime("%d/%m/%Y") if isinstance(valor, date) else str(valor)

    @app.template_filter("badge")
    def _clase_badge(estado):
        return {
            "Cumple": "ok", "No Cumple": "err", "En Proceso": "warn",
        }.get(estado or "", "neutral")

    # ---- Rutas ------------------------------------------------------------
    from routes.dashboard import bp as bp_dashboard
    from routes.normas import bp as bp_normas
    from routes.cumplimiento import bp as bp_cumplimiento
    app.register_blueprint(bp_dashboard)
    app.register_blueprint(bp_normas)
    app.register_blueprint(bp_cumplimiento)

    from flask import render_template

    @app.errorhandler(400)
    @app.errorhandler(404)
    @app.errorhandler(413)
    @app.errorhandler(500)
    def _error(exc):
        codigo = getattr(exc, "code", 500)
        mensajes = {
            404: "La página solicitada no existe.",
            413: f"El archivo supera el tamaño máximo permitido ({APP_CONFIG.max_evidence_size_mb} MB).",
            500: "Ocurrió un error inesperado. Revise el log del servidor.",
        }
        detalle = getattr(exc, "description", None) if codigo == 400 else mensajes.get(codigo)
        return render_template("error.html", codigo=codigo, mensaje=detalle), codigo

    try:
        init_pool()
    except ConnectionError as exc:
        logging.getLogger("normalab.main").error(str(exc))
        raise

    return app


app = create_app()

if __name__ == "__main__":
    app.run(host=os.getenv("NORMALAB_HOST", "127.0.0.1"),
            port=int(os.getenv("NORMALAB_PORT", "5000")),
            debug=os.getenv("NORMALAB_DEBUG") == "1")
