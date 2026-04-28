import logging
import sys
import os
import time
from datetime import datetime
from zoneinfo import ZoneInfo
from dotenv import load_dotenv

load_dotenv()
TZ_ARG = ZoneInfo("America/Argentina/Buenos_Aires")

os.makedirs(os.path.join(os.path.dirname(__file__), "logs"), exist_ok=True)

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s %(levelname)s %(message)s",
    handlers=[
        logging.FileHandler(
            os.path.join(
                os.path.dirname(__file__),
                "logs",
                f"{datetime.now(TZ_ARG).strftime('%Y-%m-%d')}.log",
            )
        ),
        logging.StreamHandler(),
    ],
)
logger = logging.getLogger(__name__)


def con_retry(fn, descripcion, intentos=3, espera=5):
    """Ejecuta una funcion con reintentos automaticos."""
    for i in range(1, intentos + 1):
        try:
            return fn()
        except Exception as e:
            logger.warning(f"{descripcion} — intento {i}/{intentos} fallido: {e}")
            if i < intentos:
                time.sleep(espera)
            else:
                raise Exception(f"{descripcion} fallo tras {intentos} intentos: {e}")


def main():
    ahora_arg = datetime.now(TZ_ARG)
    fecha = ahora_arg.strftime("%d/%m/%Y")
    dia_semana = ahora_arg.weekday()

    logger.info(f"=== TDF News iniciado | {fecha} ===")

    if dia_semana == 6:
        from reporter import generar_reporte
        from notifier import enviar_error
        try:
            generar_reporte()
            logger.info("Reporte dominical enviado correctamente")
        except Exception as e:
            logger.error(f"Error en reporte dominical: {e}")
            enviar_error(f"Fallo el reporte dominical: {e}", fecha)
            sys.exit(1)
        return

    from scraper import obtener_noticias
    from database import init_db, ya_enviada, guardar_notas
    from redactor import generar_notas
    from notifier import enviar_notas, enviar_error

    try:
        # 1. Base de datos
        logger.info("PASO 1: Inicializando base de datos...")
        init_db()
        logger.info("PASO 1: OK")

        # 2. Scraping con retry
        logger.info("PASO 2: Scraping portales TDF...")
        articulos = con_retry(obtener_noticias, "Scraping", intentos=3, espera=10)
        logger.info(f"PASO 2: OK — {len(articulos)} articulos")

        if not articulos:
            raise Exception("PASO 2 FALLO: ningun portal devolvio articulos")

        # 3. Filtrar repetidos
        logger.info("PASO 3: Filtrando repetidos...")
        articulos_nuevos = [a for a in articulos if not ya_enviada(a["titular"])]
        logger.info(f"PASO 3: OK — {len(articulos_nuevos)} articulos nuevos")

        if len(articulos_nuevos) < 10:
            raise Exception(
                f"PASO 3 FALLO: solo {len(articulos_nuevos)} articulos nuevos, se necesitan 10"
            )

        # 4. Generar notas con retry
        logger.info("PASO 4: Generando notas con Groq...")
        notas = con_retry(
            lambda: generar_notas(articulos_nuevos, fecha),
            "Groq generacion",
            intentos=3,
            espera=15,
        )
        logger.info(f"PASO 4: OK — {len(notas)} notas generadas")

        if len(notas) < 10:
            raise Exception(f"PASO 4 FALLO: Groq solo genero {len(notas)} notas")

        # 5. Guardar en SQLite
        logger.info("PASO 5: Guardando en base de datos...")
        notas_para_db = []
        for i, nota in enumerate(notas):
            fuente = articulos_nuevos[i] if i < len(articulos_nuevos) else {}
            notas_para_db.append({
                "titular": nota["titular"],
                "cuerpo": nota["cuerpo"],
                "fuente_url": fuente.get("fuente_url", ""),
                "portal": fuente.get("portal", ""),
            })
        guardar_notas(notas_para_db, ahora_arg.strftime("%Y-%m-%d"))
        logger.info("PASO 5: OK")

        # 6. Enviar por Telegram con retry
        logger.info("PASO 6: Enviando por Telegram...")
        con_retry(
            lambda: enviar_notas(notas, fecha),
            "Telegram envio",
            intentos=3,
            espera=10,
        )
        logger.info("PASO 6: OK")

        logger.info("=== Proceso completado exitosamente ===")

    except Exception as e:
        logger.error(f"ERROR FATAL: {e}")
        enviar_error(str(e), fecha)
        sys.exit(1)


if __name__ == "__main__":
    main()
