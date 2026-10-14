import os
import re
from datetime import datetime

from flask import (Blueprint, abort, flash, redirect, render_template, request,
                   send_from_directory, url_for)
from werkzeug.utils import secure_filename

from config.settings import APP_CONFIG
from db.connection import get_cursor
from models.entities import Norma
from routes.helpers import catalogo, entero_o_none, servicio
from services.auth_service import AccesoNoAutorizadoError
from services.norma_service import ValidacionError
from utils.validators import validar_guardar

bp = Blueprint("normas", __name__, url_prefix="/normas")

_PATRON_ARCHIVO = re.compile(r"Archivo(?: adjunto)?: (\S+)")


def archivo_evidencia(texto: str | None) -> str | None:
    if not texto:
        return None
    m = _PATRON_ARCHIVO.search(texto)
    if m and os.path.isfile(os.path.join(APP_CONFIG.upload_dir, m.group(1))):
        return m.group(1)
    return None


@bp.route("/")
def lista():
    cat = catalogo()
    texto = (request.args.get("q") or "").strip()
    id_tipo = entero_o_none(request.args.get("tipo"))
    id_estado = entero_o_none(request.args.get("estado"))

    error = None
    if texto:
        errs = validar_guardar([(texto, "alfanum", "Búsqueda", False)], accion="buscar")
        if errs:
            error, texto = errs[0], ""

    normas_srv = servicio("normas")
    normas = normas_srv.buscar(texto=texto or None, id_tipo_norma=id_tipo,
                               id_estado_cumplimiento=id_estado)
    return render_template(
        "normas/lista.html", activo="normas", normas=normas,
        total=normas_srv.contar_total(), tipos=cat.tipos_norma(),
        estados=cat.estados_cumplimiento(),
        filtros={"q": texto, "tipo": id_tipo, "estado": id_estado}, error=error,
        asociados=_conteos_asociados([n.id_norma for n in normas]),
    )


def _conteos_asociados(ids: list[int]) -> dict:
    if not ids:
        return {}
    with get_cursor() as cur:
        cur.execute("""
            SELECT n.id_norma,
                   (SELECT COUNT(*) FROM seguimiento_cumplimiento s WHERE s.id_norma = n.id_norma) AS seg,
                   (SELECT COUNT(*) FROM accion_correctiva a WHERE a.id_norma = n.id_norma) AS acc
            FROM norma n WHERE n.id_norma = ANY(%s)
        """, (ids,))
        return {r["id_norma"]: {"seg": r["seg"], "acc": r["acc"]} for r in cur.fetchall()}


@bp.route("/matriz")
def matriz():
    cat = catalogo()
    filas_todas = servicio("normas").matriz_expandida()
    f = {
        "tipo": (request.args.get("tipo") or "").strip(),
        "anio": (request.args.get("anio") or "").strip(),
        "numero": (request.args.get("numero") or "").strip(),
        "entidad": (request.args.get("entidad") or "").strip(),
        "cumplimiento": (request.args.get("cumplimiento") or "").strip(),
    }
    error = None
    if f["anio"]:
        errs = validar_guardar([(f["anio"], "numero", "Año del filtro", False)], accion="filtrar")
        if errs:
            error = errs[0]

    filas = list(filas_todas)
    if not error:
        if f["tipo"]:
            filas = [r for r in filas if str(r.get("tipo", "")).lower() == f["tipo"].lower()]
        if f["anio"]:
            filas = [r for r in filas if r.get("anio") == int(f["anio"])]
        if f["numero"]:
            filas = [r for r in filas if f["numero"].lower() in str(r.get("numero", "")).lower()]
        if f["entidad"]:
            filas = [r for r in filas if f["entidad"].lower() in str(r.get("entidad_emisora", "")).lower()]
        if f["cumplimiento"]:
            filas = [r for r in filas if str(r.get("cumplimiento", "")).lower() == f["cumplimiento"].lower()]

    return render_template(
        "normas/matriz.html", activo="normas", filas=filas, total=len(filas_todas),
        tipos=cat.tipos_norma(), estados=cat.estados_cumplimiento(), filtros=f, error=error,
    )


@bp.route("/<int:id_norma>")
def detalle(id_norma: int):
    norma = servicio("normas").obtener_por_id(id_norma)
    if not norma:
        abort(404)
    seguimientos = servicio("cumplimiento").historial(id_norma)[:10]
    return render_template("normas/detalle.html", activo="normas", norma=norma,
                           seguimientos=seguimientos,
                           archivo=archivo_evidencia(norma.registros_evidencia_tipo))


@bp.route("/evidencia/<path:nombre>")
def evidencia(nombre: str):
    return send_from_directory(APP_CONFIG.upload_dir, secure_filename(nombre), as_attachment=False)


@bp.route("/nueva", methods=["GET", "POST"])
def nueva():
    return _formulario(None)


@bp.route("/<int:id_norma>/editar", methods=["GET", "POST"])
def editar(id_norma: int):
    norma = servicio("normas").obtener_por_id(id_norma)
    if not norma:
        abort(404)
    return _formulario(norma)


def _valores_desde_norma(n: Norma | None, tipos, frecs) -> dict:
    if not n:
        return {"tipo": str(tipos[0][0]) if tipos else "", "numero": "", "anio": "",
                "entidad": "", "descripcion": "", "frecuencia": str(frecs[0][0]) if frecs else "",
                "responsable": "", "exigencia": "", "evidencia": ""}
    evid = n.registros_evidencia_tipo or ""
    return {
        "tipo": str(n.id_tipo_norma), "numero": n.numero, "anio": str(n.anio),
        "entidad": "" if n.nombre_entidad_emisora == "Sin especificar" else (n.nombre_entidad_emisora or ""),
        "descripcion": n.descripcion or "",
        "frecuencia": str(n.id_frecuencia_seguimiento or ""),
        "responsable": n.responsable_cargo or "", "exigencia": n.exigencia_legal or "",
        "evidencia": evid,
    }


def _formulario(norma: Norma | None):
    cat = catalogo()
    tipos = cat.tipos_norma()
    frecs = cat.frecuencias_seguimiento()
    accion = "actualizar" if norma else "guardar"
    errores: list[str] = []
    errores_campo: dict[str, str] = {}

    if request.method == "GET":
        valores = _valores_desde_norma(norma, tipos, frecs)
    else:
        form = request.form
        valores = {k: (form.get(k) or "").strip() for k in
                   ("tipo", "numero", "anio", "entidad", "descripcion", "frecuencia",
                    "responsable", "exigencia", "evidencia")}

        reglas = [
            ("numero", "numero", "Número de norma", True),
            ("anio", "anio", "Año", True),
            ("entidad", "texto", "Entidad emisora", False),
            ("responsable", "texto", "Responsable", False),
            ("descripcion", "desc", "Descripción", False),
            ("exigencia", "desc", "Exigencia legal", False),
            ("evidencia", "desc", "Registros de evidencia", False),
        ]
        for clave, tipo, nombre, oblig in reglas:
            errs = validar_guardar([(valores[clave], tipo, nombre, oblig)], accion=accion)
            if errs:
                errores_campo[clave] = errs[0]
        ids_tipo = {str(t[0]): t[1] for t in tipos}
        if valores["tipo"] not in ids_tipo:
            errores_campo["tipo"] = "Seleccione un tipo de norma válido."
        ids_frec = {str(f[0]) for f in frecs}
        if valores["frecuencia"] and valores["frecuencia"] not in ids_frec:
            errores_campo["frecuencia"] = "Seleccione una frecuencia válida."

        archivo = request.files.get("archivo")
        nombre_guardado = None
        if archivo and archivo.filename:
            ext = os.path.splitext(archivo.filename)[1].lower()
            if ext not in APP_CONFIG.allowed_evidence_extensions:
                errores_campo["archivo"] = ("Tipo de archivo no permitido. Use PDF, Word, Excel "
                                            "o imagen (JPG/PNG).")

        if errores_campo:
            errores = list(errores_campo.values())
        else:
            if archivo and archivo.filename:
                base = secure_filename(archivo.filename) or f"evidencia{ext}"
                nombre_guardado = f"{datetime.now():%Y%m%d%H%M%S}_{base}"
                archivo.save(os.path.join(APP_CONFIG.upload_dir, nombre_guardado))

            evid = valores["evidencia"] or None
            if nombre_guardado:
                evid_base = _PATRON_ARCHIVO.sub("", evid or "").strip(" |") or None
                evid = (f"{evid_base} | Archivo: {nombre_guardado}" if evid_base
                        else f"Archivo adjunto: {nombre_guardado}")

            try:
                id_tipo = int(valores["tipo"])
                anio = int(valores["anio"])
                id_ent = cat.crear_entidad_emisora_si_no_existe(valores["entidad"] or "Sin especificar")
                vigencias = cat.estados_vigencia()
                id_vigente = next((i for i, nom in vigencias if nom == "Vigente"), vigencias[0][0])
                id_est = norma.id_estado_vigencia if norma else id_vigente
                datos = dict(
                    id_tipo_norma=id_tipo, numero=valores["numero"], anio=anio,
                    id_entidad_emisora=id_ent,
                    titulo=f"{ids_tipo[valores['tipo']]} {valores['numero']} de {anio}",
                    id_estado_vigencia=id_est,
                    fecha_vigencia=(norma.fecha_vigencia if norma else None),
                    articulos_que_aplican=(norma.articulos_que_aplican if norma else None),
                    descripcion=valores["descripcion"] or None,
                    exigencia_legal=valores["exigencia"] or None,
                    registros_evidencia_tipo=evid,
                    id_frecuencia_seguimiento=entero_o_none(valores["frecuencia"]),
                    responsable_cargo=valores["responsable"] or None,
                    nombre_tipo_norma=ids_tipo[valores["tipo"]],
                )
                srv = servicio("normas")
                if norma:
                    srv.editar(Norma(id_norma=norma.id_norma, **datos))
                    flash("Norma actualizada correctamente.", "ok")
                else:
                    srv.registrar(Norma(id_norma=None, **datos))
                    flash("Norma registrada correctamente.", "ok")
                return redirect(url_for("normas.lista"))
            except (ValidacionError, AccesoNoAutorizadoError) as exc:
                errores = str(exc).split("\n")
            except Exception as exc:  # p. ej. norma duplicada (tipo+número+año)
                msg = str(exc)
                if "duplicate key" in msg or "unique" in msg.lower():
                    errores = ["Ya existe una norma registrada con el mismo tipo, número y año."]
                else:
                    errores = [f"Error inesperado: {msg}"]

    return render_template(
        "normas/form.html", activo="normas", norma=norma, tipos=tipos, frecs=frecs,
        v=valores, errores=errores, errores_campo=errores_campo,
        archivo_actual=archivo_evidencia(norma.registros_evidencia_tipo) if norma else None,
    )


@bp.route("/<int:id_norma>/eliminar", methods=["POST"])
def eliminar(id_norma: int):
    try:
        servicio("normas").eliminar(id_norma)
        flash("Norma eliminada correctamente.", "ok")
    except (AccesoNoAutorizadoError, ValidacionError) as exc:
        flash(str(exc), "err")
    return redirect(url_for("normas.lista"))
