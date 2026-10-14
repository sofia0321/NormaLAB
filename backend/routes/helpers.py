from flask import current_app

from repositories.catalogo_repository import CatalogoRepository


def servicio(nombre: str):
    return current_app.extensions["normalab"][nombre]


def catalogo() -> CatalogoRepository:
    return CatalogoRepository()


def entero_o_none(valor):
    try:
        return int(valor) if valor not in (None, "") else None
    except (TypeError, ValueError):
        return None
