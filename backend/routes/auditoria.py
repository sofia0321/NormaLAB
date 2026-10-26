"""RF-014 / RF-015 — Pantalla del log de auditoría. SOLO LECTURA: no hay rutas POST/PUT/DELETE."""
import logging

from flask import Blueprint, render_template, request

from routes.helpers import servicio
from services.auditoria_service import TIPOS_OPERACION

bp = Blueprint("auditoria", __name__, url_prefix="/auditoria")
log = logging.getLogger("normalab.auditoria")


@bp.route("/")
def index():
    tipo = (request.args.get("tipo") or "").strip()
    registros, error = [], None
    if tipo and tipo not in TIPOS_OPERACION:
        error, tipo = "El tipo de operación seleccionado no es válido.", ""
    try:
        registros = servicio("auditoria").consultar(tipo_operacion=tipo or None)
    except Exception:  # RF-014: ante un error técnico, mensaje descriptivo y sin datos parciales
        log.exception("Error al consultar el log de auditoría")
        registros, error = [], "No fue posible consultar el log de auditoría. Intente nuevamente."
    return render_template("auditoria.html", activo="auditoria", registros=registros,
                           tipos=TIPOS_OPERACION, filtro_tipo=tipo, error=error)
