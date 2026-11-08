"""Módulo de acciones correctivas: RF-012 (registrar), RF-013 (consultar),
RF-018 (editar) y RF-017 (eliminar)."""
import logging
from datetime import date

from flask import (Blueprint, abort, flash, redirect, render_template, request, url_for)

from routes.helpers import catalogo, entero_o_none, servicio
from services.accion_service import (ESTADOS_AVANCE, FechaVencidaError)
from services.auth_service import AccesoNoAutorizadoError
from services.norma_service import ValidacionError
from utils.validators import validar_guardar

bp = Blueprint("acciones", __name__, url_prefix="/acciones")
log = logging.getLogger("normalab.acciones")


def _estados_filtro():
    return [(i, n) for i, n in catalogo().estados_accion_correctiva() if n in ESTADOS_AVANCE]


def _normas_para_select(solo_elegibles: bool):
    normas = servicio("normas").buscar()
    if solo_elegibles:
        normas = [n for n in normas if servicio("acciones").norma_admite_acciones(n.ultimo_estado_cumplimiento)]
    return normas


@bp.route("/")
def lista():
    estados = _estados_filtro()
    f = {"estado": entero_o_none(request.args.get("estado")),
         "responsable": (request.args.get("responsable") or "").strip(),
         "norma": entero_o_none(request.args.get("norma"))}
    normas = servicio("normas").buscar()
    error = None
    # RF-013: los filtros deben corresponder a valores existentes
    if f["estado"] and f["estado"] not in {i for i, _ in estados}:
        error, f["estado"] = "El estado seleccionado no existe.", None
    if f["norma"] and f["norma"] not in {n.id_norma for n in normas}:
        error, f["norma"] = "La norma seleccionada no existe.", None
    if f["responsable"]:
        errs = validar_guardar([(f["responsable"], "texto", "Responsable", False)], accion="filtrar")
        if errs:
            error, f["responsable"] = errs[0], ""

    acciones = []
    try:
        acciones = servicio("acciones").consultar(f["estado"], f["responsable"], f["norma"])
    except Exception:  # sin información parcial ante un fallo
        log.exception("Error consultando acciones correctivas")
        error, acciones = "No fue posible consultar las acciones correctivas. Intente nuevamente.", None
    return render_template("acciones/lista.html", activo="acciones", acciones=acciones,
                           estados=estados, normas=normas, filtros=f, error=error)


def _valores(origen, accion=None):
    if accion:
        return {"norma": str(accion["id_norma"]), "descripcion": accion["descripcion"] or "",
                "responsable": accion["nombre_responsable"] or "",
                "fecha": accion["fecha_compromiso"].isoformat(),
                "articulo": accion["articulo_relacionado_texto"] or "",
                "estado": str(accion["id_estado_accion"]), "confirmar": ""}
    return {k: (origen.get(k) or "").strip() for k in
            ("norma", "descripcion", "responsable", "fecha", "articulo", "estado", "confirmar")}


@bp.route("/nueva", methods=["GET", "POST"])
def nueva():
    elegibles = _normas_para_select(True)
    errores, pedir_confirmacion = [], False
    if request.method == "GET":
        v = _valores({"norma": request.args.get("norma", "")})
        v["fecha"] = ""
    else:
        v = _valores(request.form)
        try:
            creada = servicio("acciones").registrar(
                entero_o_none(v["norma"]), v["descripcion"], v["responsable"], v["fecha"],
                articulo=v["articulo"], confirmar_vencida=(v["confirmar"] == "1"))
            flash(f"Acción correctiva {creada['codigo']} registrada correctamente.", "ok")
            return redirect(url_for("acciones.lista"))
        except FechaVencidaError as exc:
            errores, pedir_confirmacion = [str(exc)], True
        except (ValidacionError, AccesoNoAutorizadoError) as exc:
            errores = str(exc).split("\n")
        except Exception:
            log.exception("Error registrando acción correctiva")
            errores = ["No fue posible guardar: la operación fue cancelada y no se almacenó ningún dato."]
    return render_template("acciones/form.html", activo="acciones", accion=None, normas=elegibles,
                           v=v, errores=errores, pedir_confirmacion=pedir_confirmacion,
                           estados=[], hoy=date.today())


@bp.route("/<int:id_accion>/editar", methods=["GET", "POST"])
def editar(id_accion: int):
    accion = servicio("acciones").obtener(id_accion)
    if not accion:
        abort(404)
    if accion["estado"] == "Cerrada":
        flash("No es posible editar una acción correctiva en estado 'Cerrada'.", "err")
        return redirect(url_for("acciones.lista"))
    errores = []
    if request.method == "GET":
        v = _valores(None, accion)
    else:
        v = _valores(request.form)
        v["norma"] = str(accion["id_norma"])
        try:
            servicio("acciones").editar(id_accion, v["descripcion"], v["responsable"], v["fecha"],
                                        entero_o_none(v["estado"]), articulo=v["articulo"])
            flash("Acción correctiva actualizada correctamente.", "ok")
            return redirect(url_for("acciones.lista"))
        except (ValidacionError, AccesoNoAutorizadoError) as exc:
            errores = str(exc).split("\n")
        except Exception:
            log.exception("Error actualizando acción correctiva")
            errores = ["No fue posible actualizar. La acción conserva sus valores originales."]
    return render_template("acciones/form.html", activo="acciones", accion=accion, normas=[],
                           v=v, errores=errores, pedir_confirmacion=False,
                           estados=_estados_filtro(), hoy=date.today())


@bp.route("/<int:id_accion>/eliminar", methods=["POST"])
def eliminar(id_accion: int):
    try:
        servicio("acciones").eliminar(id_accion)
        flash("Acción correctiva eliminada correctamente.", "ok")
    except (ValidacionError, AccesoNoAutorizadoError) as exc:
        flash(str(exc), "err")
    except Exception:
        log.exception("Error eliminando acción correctiva")
        flash("No fue posible eliminar la acción correctiva. Se conservó sin modificaciones.", "err")
    return redirect(url_for("acciones.lista"))
