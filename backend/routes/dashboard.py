import math
from datetime import date, datetime

from flask import Blueprint, render_template, request

from routes.helpers import entero_o_none, servicio

bp = Blueprint("dashboard", __name__)

MESES = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio",
         "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"]

COLORES = {"Cumple": "#0E7C4A", "En Proceso": "#E39A12",
           "No Cumple": "#C0392B", "No Aplica": "#8A94A8"}


def _segmentos_dona(datos: list[tuple[str, int]]) -> list[dict]:
    total = sum(v for _, v in datos)
    if not total:
        return []
    circunferencia = 2 * math.pi * 70
    acumulado, segmentos = 0.0, []
    for etiqueta, valor in datos:
        largo = circunferencia * valor / total
        segmentos.append({
            "etiqueta": etiqueta, "valor": valor, "color": COLORES.get(etiqueta, "#9CA3AF"),
            "dash": f"{largo:.2f} {circunferencia - largo:.2f}",
            "offset": f"{-acumulado:.2f}",
            "pct": round(valor * 100 / total),
        })
        acumulado += largo
    return segmentos


def _a_fecha(valor):
    if valor is None:
        return None
    return valor.date() if isinstance(valor, datetime) else valor


def _periodo(mes_txt, anio_txt):
    mes = entero_o_none(mes_txt)
    anio = entero_o_none(anio_txt)
    if not mes or not (1 <= mes <= 12) or not anio or not (1900 <= anio <= 2100):
        return None
    return anio, mes


@bp.route("/")
def index():
    normas = servicio("normas")
    total = normas.contar_total()
    resumen = normas.resumen_cumplimiento()
    cumple = resumen.get("Cumple", 0)
    en_proceso = resumen.get("En Proceso", 0)
    no_cumple = resumen.get("No Cumple", 0)
    no_aplica = resumen.get("No Aplica", 0)
    evaluadas = cumple + en_proceso + no_cumple + no_aplica
    porcentaje = round((cumple / evaluadas) * 100) if evaluadas else 0

    datos = [(e, v) for e, v in [("Cumple", cumple), ("En Proceso", en_proceso),
                                  ("No Cumple", no_cumple), ("No Aplica", no_aplica)] if v > 0]

    hoy = date.today()
    filtrado = request.args.get("filtrar") == "1"
    mes_hasta_def = ((hoy.month + 2) % 12) + 1
    anio_hasta_def = hoy.year + (1 if hoy.month >= 10 else 0)
    filtros = {
        "mes_desde": request.args.get("mes_desde", str(hoy.month)) if filtrado else str(hoy.month),
        "anio_desde": request.args.get("anio_desde", str(hoy.year)) if filtrado else str(hoy.year),
        "mes_hasta": request.args.get("mes_hasta", str(mes_hasta_def)) if filtrado else str(mes_hasta_def),
        "anio_hasta": request.args.get("anio_hasta", str(anio_hasta_def)) if filtrado else str(anio_hasta_def),
    }
    error_filtro = None
    revisiones = []

    if filtrado:
        p_desde = _periodo(filtros["mes_desde"], filtros["anio_desde"])
        p_hasta = _periodo(filtros["mes_hasta"], filtros["anio_hasta"])
        if p_desde and p_hasta and p_desde > p_hasta:
            error_filtro = (f"El período inicial ({MESES[p_desde[1]-1]} {p_desde[0]}) no puede ser "
                            f"posterior al período final ({MESES[p_hasta[1]-1]} {p_hasta[0]}).")
        else:
            for item in normas.proximas_revisiones(dias=3650):
                prox = _a_fecha(item.get("proxima_revision"))
                if prox is None:
                    continue
                p = (prox.year, prox.month)
                if p_desde and p < p_desde:
                    continue
                if p_hasta and p > p_hasta:
                    continue
                revisiones.append({**item, "_prox": prox})
    else:
        for item in normas.proximas_revisiones(dias=90):
            prox = _a_fecha(item.get("proxima_revision"))
            if prox is not None:
                revisiones.append({**item, "_prox": prox})

    for item in revisiones:
        prox = item["_prox"]
        sin_evaluar = item.get("fecha_ultima_evaluacion") is None
        vencida = (not sin_evaluar) and prox < hoy
        dias = (prox - hoy).days
        if item.get("nombre_frecuencia") == "Permanente":
            item["_etiqueta"], item["_clase"] = "Permanente", "normal"
        elif sin_evaluar:
            item["_etiqueta"], item["_clase"] = "Sin evaluar", "pendiente"
        elif vencida:
            item["_etiqueta"], item["_clase"] = f"Vencida ({abs(dias)} d)", "vencida"
        else:
            item["_etiqueta"], item["_clase"] = f"{prox.strftime('%d/%m/%Y')} ({dias} d)", "normal"

    return render_template(
        "dashboard.html", activo="dashboard",
        total=total, porcentaje=porcentaje, en_proceso=en_proceso, no_cumple=no_cumple,
        cumple=cumple, evaluadas=evaluadas, segmentos=_segmentos_dona(datos),
        revisiones=revisiones[:10], filtros=filtros, filtrado=filtrado,
        error_filtro=error_filtro, meses=MESES,
    )
