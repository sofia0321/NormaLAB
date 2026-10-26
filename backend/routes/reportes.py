"""RF-009 / RF-010 (+ exportar de RF-003) — Exportación de reportes."""
import logging

from flask import (Blueprint, abort, flash, redirect, render_template, request,
                   send_file, url_for)

from routes.helpers import catalogo, servicio
from services.auth_service import AccesoNoAutorizadoError
from services.norma_service import ValidacionError
from services.reporte_service import FORMATOS, TIPOS_REPORTE

bp = Blueprint("reportes", __name__, url_prefix="/reportes")
log = logging.getLogger("normalab.reportes")

_MIME = {"xlsx": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
         "pdf": "application/pdf"}
_CLAVES_FILTRO = ("tipo", "anio", "numero", "entidad", "cumplimiento")


@bp.route("/")
def index():
    cat = catalogo()
    filtros = {k: (request.args.get(k) or "").strip() for k in _CLAVES_FILTRO}
    generados = []
    try:
        generados = servicio("reportes").listar_generados()
    except Exception:
        log.exception("No se pudo listar el historial de reportes")
        flash("No fue posible cargar el historial de reportes generados.", "err")
    return render_template("reportes.html", activo="reportes", tipos=cat.tipos_norma(),
                           estados=cat.estados_cumplimiento(), filtros=filtros,
                           generados=generados, tipos_reporte=TIPOS_REPORTE, formatos=FORMATOS)


@bp.route("/exportar")
def exportar():
    formato = (request.args.get("formato") or "").strip().lower()
    tipo_reporte = (request.args.get("tipo_reporte") or "matriz").strip()
    filtros = {k: (request.args.get(k) or "").strip() for k in _CLAVES_FILTRO}
    try:
        ruta, nombre = servicio("reportes").exportar(formato, tipo_reporte, filtros)
    except (ValidacionError, AccesoNoAutorizadoError) as exc:
        flash(str(exc), "err")
        return redirect(url_for("reportes.index", **{k: v for k, v in filtros.items() if v}))
    except Exception:
        log.exception("Error generando el reporte")
        flash("No fue posible generar el reporte. Intente nuevamente.", "err")
        return redirect(url_for("reportes.index"))
    return send_file(ruta, mimetype=_MIME[formato], as_attachment=True, download_name=nombre)


@bp.route("/descargar/<int:id_reporte>")
def descargar(id_reporte: int):
    encontrado = servicio("reportes").ruta_de(id_reporte)
    if not encontrado:
        abort(404)
    ruta, nombre = encontrado
    return send_file(ruta, mimetype=_MIME.get(nombre.rsplit(".", 1)[-1], "application/octet-stream"),
                     as_attachment=True, download_name=nombre)
