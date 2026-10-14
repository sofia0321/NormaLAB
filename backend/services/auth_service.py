from typing import Optional
from models.entities import Usuario


class AccesoNoAutorizadoError(Exception):
    pass

class CredencialesInvalidasError(Exception):
    pass

class SesionExpiradaError(Exception):
    pass


_USUARIO_SISTEMA = Usuario(
    id_usuario=1,
    nombre_usuario="sistema",
    nombre_completo="Administrador del Sistema",
    id_rol=1,
    nombre_rol="Administrador",
    activo=True,
)


class AuthService:

    def __init__(self):
        self._usuario_actual: Usuario = _USUARIO_SISTEMA

    def _leer_contrasena(self) -> Optional[str]:
        """
        Lee la contraseña de la BD.
        Retorna:
          - La contraseña en texto plano si fue configurada por el usuario.
          - None si no hay contraseña, o si el valor es un hash residual de bcrypt.
        """
        try:
            from db.connection import get_cursor
            with get_cursor() as cur:
                cur.execute(
                    "SELECT contrasena_hash FROM usuario WHERE id_usuario = 1")
                row = cur.fetchone()
                if not row:
                    return None
                val = row["contrasena_hash"]
                if not val:
                    return None
                val = val.strip()
                if not val:
                    return None
                if val.startswith(("$2b$", "$2a$", "$2y$", "$argon2", "$pbkdf2")):
                    return None
                return val
        except Exception:
            return None

    def requiere_contrasena(self) -> bool:
        """True SOLO si hay una contraseña válida en texto plano configurada."""
        return bool(self._leer_contrasena())

    def iniciar_sesion(self, contrasena: str) -> Usuario:
        """
        Valida la contraseña ingresada contra la almacenada en texto plano.
        Lanza CredencialesInvalidasError si no coincide.
        """
        pwd_bd = self._leer_contrasena()
        if not pwd_bd:
            return self._usuario_actual
        if contrasena != pwd_bd:
            raise CredencialesInvalidasError("Contraseña incorrecta.")
        return self._usuario_actual

    def iniciar_sesion_automatica(self) -> Usuario:
        """Acceso sin contraseña (cuando no hay contraseña configurada)."""
        if self.requiere_contrasena():
            raise CredencialesInvalidasError(
                "El sistema tiene contraseña configurada. Ingrese la contraseña.")
        return self._usuario_actual

    def obtener_usuario_actual(self) -> Usuario:
        return self._usuario_actual

    def verificar_permiso_escritura(self) -> None:
        pass   

    def cerrar_sesion(self) -> None:
        pass

    def _validar_sesion_activa(self) -> None:
        pass
