from datetime import date

from flask import Blueprint, flash, redirect, render_template, request, url_for

from models.entities import SeguimientoCumplimiento
from routes.helpers import catalogo, entero_o_none, servicio
from services.auth_service import AccesoNoAutorizadoError
from services.norma_service import ValidacionError
from utils.validators import validar_campo_al_guardar

bp = Blueprint("cumplimiento", __name__, url_prefix="/cumplimiento")


def _contexto(args, valores=None, errores_campo=None):
    cat = catalogo()
    normas_srv = servicio("normas")
    tipos = cat.tipos_norma()
    estados = cat.estados_cumplimiento()
    anios = sorted({str(n.anio) for n in normas_srv.buscar()}, reverse=True)

    id_tipo = entero_o_none(args.get("tipo"))
    anio = (args.get("anio") or "").strip()
    buscado = args.get("buscar") == "1" or bool(args.get("norma"))

    encontradas, norma_actual, ultimo, historial = [], None, None, []
    if buscado:
        encontradas = normas_srv.buscar(id_tipo_norma=id_tipo)
        if anio:
            encontradas = [n for n in encontradas if str(n.anio) == anio]
        id_sel = entero_o_none(args.get("norma"))
        if encontradas:
            norma_actual = next((n for n in encontradas if n.id_norma == id_sel), encontradas[0])
            cump = servicio("cumplimiento")
            ultimo = cump.obtener_ultimo(norma_actual.id_norma)
            historial = cump.historial(norma_actual.id_norma)

    if valores is None:
        valores = {"estado": str(estados[0][0]) if estados else "", "responsable": "",
                   "fecha": date.today().isoformat(), "acciones": ""}
    return dict(
        activo="cumplimiento", tipos=tipos, estados=estados, anios=anios,
        filtros={"tipo": id_tipo, "anio": anio}, buscado=buscado,
        encontradas=encontradas, norma=norma_actual, ultimo=ultimo, historial=historial,
        v=valores, errores_campo=errores_campo or {},
        ver_historial=args.get("historial") == "1",
    )


def _params(origen) -> dict:
    p = {k: origen.get(k) for k in ("tipo", "anio", "norma", "historial") if origen.get(k)}
    p["buscar"] = "1"
    return p


@bp.route("/")
def index():
    return render_template("cumplimiento.html", **_contexto(request.args))


@bp.route("/guardar", methods=["POST"])
def guardar():
    form = request.form
    valores = {k: (form.get(k) or "").strip() for k in ("estado", "responsable", "fecha", "acciones")}
    id_norma = entero_o_none(form.get("norma"))
    errores = {}

    if not id_norma:
        flash("Seleccione una norma usando los filtros y pulse Buscar norma.", "err")
        return redirect(url_for("cumplimiento.index"))


    if not valores["responsable"]:
        errores["responsable"] = "No es posible guardar. El campo 'Responsable evaluador' es obligatorio."
    else:
        ok, msg = validar_campo_al_guardar(valores["responsable"], "texto", "Responsable evaluador")
        if not ok:
            errores["responsable"] = msg


    if not valores["acciones"]:
        errores["acciones"] = "No es posible guardar. El campo 'Acciones realizadas' es obligatorio."
    else:
        ok, msg = validar_campo_al_guardar(valores["acciones"], "desc", "Acciones realizadas")
        if not ok:
            errores["acciones"] = msg


    estados_validos = {str(e[0]) for e in catalogo().estados_cumplimiento()}
    if valores["estado"] not in estados_validos:
        errores["estado"] = "Seleccione un estado de cumplimiento válido."
    try:
        fecha = date.fromisoformat(valores["fecha"]) if valores["fecha"] else date.today()
    except ValueError:
        errores["fecha"] = "La fecha de evaluación no es válida."
        fecha = None

    if errores:
        for msg in errores.values():
            flash(msg, "err")
        return render_template("cumplimiento.html",
                               **_contexto(form, valores=valores, errores_campo=errores)), 422

    seg = SeguimientoCumplimiento(
        id_seguimiento=None, id_norma=id_norma,
        id_estado_cumplimiento=int(valores["estado"]), fecha_evaluacion=fecha,
        id_usuario_registro=None, nombre_responsable=valores["responsable"] or None,
        acciones_realizadas=valores["acciones"] or None,
    )
    try:
        servicio("cumplimiento").registrar_seguimiento(seg)
        flash("Seguimiento registrado correctamente.", "ok")
    except (ValidacionError, AccesoNoAutorizadoError) as exc:
        flash(str(exc), "err")
    return redirect(url_for("cumplimiento.index", **_params(form)))


@bp.route("/seguimiento/<int:id_seguimiento>/eliminar", methods=["POST"])
def eliminar(id_seguimiento: int):
    try:
        servicio("cumplimiento").eliminar_seguimiento(id_seguimiento)
        flash("Registro de seguimiento eliminado.", "ok")
    except (ValidacionError, AccesoNoAutorizadoError) as exc:
        flash(str(exc), "err")
    return redirect(url_for("cumplimiento.index", **_params(request.form)))
