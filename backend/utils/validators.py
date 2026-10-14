import re
from datetime import date as _date

COLOR_ERR = "#E53935"
COLOR_OK  = "#CDD5E0"

_LETRAS   = set("ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz"
                "ÁÉÍÓÚáéíóúÜüÑñ")
_PROHIBIDOS = set('<>"{|}')


def _val_numero(v, nombre, accion):
    pre = f"No es posible {accion}."
    if not v:
        return f"{pre} El campo '{nombre}' es obligatorio y solo permite números."
    if not v.isdigit():
        return (f"{pre} El campo '{nombre}' solo permite números.\n"
                f"El valor '{v[:20]}' contiene caracteres no permitidos.")
    return None


def _val_anio(v, nombre, accion):
    pre = f"No es posible {accion}."
    if not v:
        return f"{pre} El campo '{nombre}' es obligatorio."
    if not v.isdigit():
        return (f"{pre} El campo '{nombre}' solo permite números.\n"
                f"Ingrese el año en formato numérico (p. ej. 2025).")
    anio = int(v)
    hoy = _date.today().year
    if anio < 1900:
        return f"{pre} El campo '{nombre}' no puede ser menor a 1900."
    if anio > hoy:
        return f"{pre} El campo '{nombre}' no puede ser mayor a {hoy}."
    return None


def _val_alfanum(v, nombre, accion, obligatorio):
    pre = f"No es posible {accion}."
    if not v:
        if obligatorio:
            return f"{pre} El campo '{nombre}' es obligatorio."
        return None
    if re.search(r'[<>"\'{|}]', v):
        return f"{pre} El campo '{nombre}' contiene caracteres no permitidos."
    return None


def _val_texto(v, nombre, accion, obligatorio):
    pre = f"No es posible {accion}."
    if not v:
        if obligatorio:
            return f"{pre} El campo '{nombre}' es obligatorio."
        return None
    if any(c.isdigit() for c in v):
        return (f"{pre} El campo '{nombre}' solo permite letras y espacios.\n"
                f"Retire los números ingresados.")
    if not re.match(r'^[A-Za-záéíóúüÁÉÍÓÚÜñÑ\s\.\,\-\'\(\)]+$', v):
        chars_inv = set(c for c in v if not (c in _LETRAS or c in " .,-()'"))
        return (f"{pre} El campo '{nombre}' solo permite letras y espacios.\n"
                f"Caracteres no permitidos: {', '.join(repr(c) for c in list(chars_inv)[:5])}")
    return None


def _val_desc(v, nombre, accion, obligatorio):
    pre = f"No es posible {accion}."
    if not v:
        if obligatorio:
            return f"{pre} El campo '{nombre}' es obligatorio."
        return None
    inv = [c for c in v if c in _PROHIBIDOS]
    if inv:
        return (f"{pre} El campo '{nombre}' contiene caracteres no permitidos: "
                f"{', '.join(repr(c) for c in set(inv))}.")
    return None


def _val_libre(v, nombre, accion, obligatorio):
    pre = f"No es posible {accion}."
    if not v:
        if obligatorio:
            return f"{pre} El campo '{nombre}' es obligatorio."
        return None
    inv = [c for c in v if c in _PROHIBIDOS]
    if inv:
        return f"{pre} El campo '{nombre}' contiene caracteres no permitidos."
    return None


def _val_email(v, nombre, accion, obligatorio):
    pre = f"No es posible {accion}."
    if not v:
        if obligatorio:
            return f"{pre} El campo '{nombre}' es obligatorio."
        return None
    if not re.match(r'^[^@\s]+@[^@\s]+\.[^@\s]+$', v):
        return (f"{pre} El campo '{nombre}' no tiene formato de correo válido.\n"
                f"Ejemplo: nombre@dominio.com")
    return None


# ── API principal ─────────────────────────────────────────────────────────────
def validar_guardar(campos: list[tuple], accion: str = "guardar") -> list[str]:
    errores = []
    dispatch = {
        "numero":  _val_numero,
        "anio":    _val_anio,
        "alfanum": _val_alfanum,
        "texto":   _val_texto,
        "desc":    _val_desc,
        "libre":   _val_libre,
        "email":   _val_email,
    }
    for tupla in campos:
        valor, tipo, nombre, obligatorio = tupla
        v = valor.strip() if isinstance(valor, str) else ""
        fn = dispatch.get(tipo)
        if fn is None:
            continue
        if tipo in ("numero", "anio"):
            err = fn(v, nombre, accion)
        else:
            err = fn(v, nombre, accion, obligatorio)
        if err:
            errores.append(err)
    return errores


def validar_campo_al_guardar(valor: str, tipo: str,
                              nombre: str) -> tuple[bool, str]:
    errs = validar_guardar([(valor, tipo, nombre, False)])
    return (False, errs[0]) if errs else (True, "")


def validar_todos(campos: list[tuple], accion: str = "guardar") -> list[str]:
    return validar_guardar(campos, accion)


def validar_descripcion(v: str, nombre: str = "Descripción") -> tuple[bool, str]:
    errs = validar_guardar([(v, "desc", nombre, True)])
    return (False, errs[0]) if errs else (True, "")


def validar_numero_norma(v: str) -> tuple[bool, str]:
    v = v.strip()
    if not v:
        return False, "El número de la norma es obligatorio."
    if re.search(r'[<>"\'{|}]', v):
        return False, "El número contiene caracteres no permitidos."
    return True, ""


def validar_anio(v: str) -> tuple[bool, str]:
    v = v.strip()
    if not v:
        return False, "El año es obligatorio."
    if not v.isdigit():
        return False, "El año solo permite números enteros (p. ej. 2025)."
    anio = int(v)
    hoy = _date.today().year
    if anio < 1900:
        return False, "El año no puede ser menor a 1900."
    if anio > hoy:
        return False, f"El año no puede ser mayor a {hoy}."
    return True, ""
