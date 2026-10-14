from dataclasses import dataclass, field
from datetime import date, datetime
from typing import Optional


@dataclass
class Usuario:
    id_usuario: Optional[int]
    nombre_usuario: str
    nombre_completo: str
    id_rol: int
    nombre_rol: Optional[str] = None
    activo: bool = True
    contrasena_hash: Optional[str] = None
    ultimo_acceso: Optional[datetime] = None


@dataclass
class Norma:
    id_norma: Optional[int]
    id_tipo_norma: int
    numero: str
    anio: int
    id_entidad_emisora: int
    titulo: str
    id_estado_vigencia: int
    descripcion: Optional[str] = None
    articulos_que_aplican: Optional[str] = None
    exigencia_legal: Optional[str] = None
    registros_evidencia_tipo: Optional[str] = None
    fecha_vigencia: Optional[date] = None
    id_frecuencia_seguimiento: Optional[int] = None
    responsable_cargo: Optional[str] = None
    id_usuario_responsable: Optional[int] = None
    fecha_registro: Optional[datetime] = None
    fecha_ultima_evaluacion: Optional[date] = None
    # Campos de presentación (joins):
    nombre_tipo_norma: Optional[str] = None
    nombre_entidad_emisora: Optional[str] = None
    nombre_estado_vigencia: Optional[str] = None
    nombre_frecuencia_seguimiento: Optional[str] = None
    ultimo_estado_cumplimiento: Optional[str] = None


@dataclass
class SeguimientoCumplimiento:
    id_seguimiento: Optional[int]
    id_norma: int
    id_estado_cumplimiento: int
    fecha_evaluacion: date
    id_usuario_registro: int
    nombre_responsable: Optional[str] = None
    acciones_realizadas: Optional[str] = None   # antes: observaciones
    fecha_registro: Optional[datetime] = None
    nombre_estado_cumplimiento: Optional[str] = None


@dataclass
class ArticuloAplicable:
    id_articulo: Optional[int]
    id_norma: int
    numero_articulo: str
    descripcion: str
    id_estado_cumplimiento: int
    obligacion_impuesta: Optional[str] = None
    fecha_evaluacion: Optional[date] = None
    id_usuario_responsable: Optional[int] = None
    nombre_estado_cumplimiento: Optional[str] = None
    cantidad_evidencias: int = 0
    norma_titulo: Optional[str] = None


@dataclass
class Evidencia:
    id_evidencia: Optional[int]
    id_articulo: int
    nombre_archivo: str
    ruta_archivo: str
    tipo_archivo: str
    tamano_bytes: int
    id_usuario_carga: int
    fecha_carga: Optional[datetime] = None


@dataclass
class AccionCorrectiva:
    id_accion: Optional[int]
    codigo: str
    id_norma: int
    descripcion: str
    id_estado_accion: int
    fecha_compromiso: date
    id_articulo: Optional[int] = None
    articulo_relacionado_texto: Optional[str] = None
    nombre_responsable: Optional[str] = None
    fecha_apertura: Optional[date] = None
    fecha_cierre: Optional[date] = None
    id_usuario_responsable: Optional[int] = None
    id_usuario_registro: Optional[int] = None
    nombre_estado_accion: Optional[str] = None
    norma_titulo: Optional[str] = None


@dataclass
class LogAuditoria:
    id_log: Optional[int]
    id_usuario: int
    tipo_operacion: str
    entidad_afectada: str
    id_entidad_afectada: Optional[int] = None
    descripcion_registro: Optional[str] = None
    detalle: Optional[dict] = field(default_factory=dict)
    fecha_hora: Optional[datetime] = None
