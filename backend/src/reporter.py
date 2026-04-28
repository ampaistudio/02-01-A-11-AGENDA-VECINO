import os
import difflib
import logging
from datetime import datetime
from database import notas_de_la_semana
from scraper import scrape_publicadas
from notifier import enviar_mensaje

logger = logging.getLogger(__name__)

CHAT_CHRISTIAN = os.environ.get("TELEGRAM_CHAT_CHRISTIAN", "")


def generar_reporte():
    """Genera y envia el reporte dominical a Christian."""
    logger.info("Generando reporte dominical...")

    enviadas = notas_de_la_semana()
    publicadas_web = scrape_publicadas()

    if not enviadas:
        enviar_mensaje(CHAT_CHRISTIAN, "REPORTE SEMANAL\n\nNo se enviaron notas esta semana.")
        return

    total_enviadas = len(enviadas)
    total_publicadas = 0
    total_no_publicadas = 0
    detalle_por_dia = {}

    for fecha, titular, portal, enviada_at in enviadas:
        # Compara los primeros 40 caracteres del titular con lo publicado en la web
        fue_publicada = any(
            difflib.SequenceMatcher(None, titular[:60].lower(), p[:60].lower()).ratio() >= 0.7
            for p in publicadas_web
        )

        if fue_publicada:
            total_publicadas += 1
            estado = "SI"
        else:
            total_no_publicadas += 1
            estado = "NO"

        if fecha not in detalle_por_dia:
            detalle_por_dia[fecha] = []
        detalle_por_dia[fecha].append(f"[{estado}] {titular[:70]}")

    fechas_ordenadas = sorted(detalle_por_dia.keys())
    semana_desde = fechas_ordenadas[0] if fechas_ordenadas else "---"
    semana_hasta = fechas_ordenadas[-1] if fechas_ordenadas else "---"

    lineas = [
        "REPORTE SEMANAL - Opinion Publica TDF",
        f"Semana: {semana_desde} al {semana_hasta}",
        f"Generado: {datetime.now().strftime('%d/%m/%Y %H:%M')}",
        "",
        f"ENVIADAS: {total_enviadas}",
        f"PUBLICADAS: {total_publicadas}",
        f"NO PUBLICADAS: {total_no_publicadas}",
        "",
        "DETALLE POR DIA:",
    ]

    for fecha in fechas_ordenadas:
        lineas.append(f"\n{fecha}:")
        for item in detalle_por_dia[fecha]:
            lineas.append(f"  {item}")

    reporte = "\n".join(lineas)

    # Telegram tiene limite de 4096 caracteres por mensaje
    if len(reporte) <= 4096:
        enviar_mensaje(CHAT_CHRISTIAN, reporte)
    else:
        partes = [reporte[i:i+4000] for i in range(0, len(reporte), 4000)]
        for i, parte in enumerate(partes, 1):
            enviar_mensaje(CHAT_CHRISTIAN, f"REPORTE ({i}/{len(partes)})\n\n{parte}")

    logger.info("Reporte dominical enviado a Christian")
