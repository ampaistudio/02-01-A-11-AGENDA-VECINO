import os
import time
import requests
import logging
from datetime import datetime

logger = logging.getLogger(__name__)

BOT_TOKEN = os.environ.get("TELEGRAM_BOT_TOKEN", "")
CHAT_MARCELO = os.environ.get("TELEGRAM_CHAT_MARCELO", "")
CHAT_GUSTAVO = os.environ.get("TELEGRAM_CHAT_GUSTAVO", "")
CHAT_CHRISTIAN = os.environ.get("TELEGRAM_CHAT_CHRISTIAN", "")

def enviar_mensaje(chat_id: str, texto: str):
    """Envia un mensaje de texto plano por Telegram."""
    token = os.environ.get("TELEGRAM_BOT_TOKEN", "")
    api_url = f"https://api.telegram.org/bot{token}/sendMessage"
    payload = {
        "chat_id": chat_id,
        "text": texto[:4096],  # limite de Telegram
    }
    resp = requests.post(api_url, json=payload, timeout=15)
    resp.raise_for_status()


def enviar_notas(notas: list, fecha: str):
    """
    Envia las 10 notas a los destinatarios segun MODO_PRUEBA.
    MODO_PRUEBA=true  -> Marcelo + Gustavo + Christian
    MODO_PRUEBA=false -> solo Marcelo
    """
    modo_prueba = os.environ.get("MODO_PRUEBA", "1") not in ("0", "false", "False")

    destinatarios = [CHAT_MARCELO]
    if modo_prueba:
        destinatarios += [CHAT_GUSTAVO, CHAT_CHRISTIAN]

    # Envia cada nota como mensaje separado para facil copy-paste
    for nota in notas:
        mensaje = (
            f"NOTA {nota['numero']}/10 | {fecha}\n\n"
            f"{nota['titular']}\n\n"
            f"{nota['cuerpo']}"
        )
        for chat_id in destinatarios:
            try:
                enviar_mensaje(chat_id, mensaje)
                logger.info(f"Nota {nota['numero']} enviada a {chat_id}")
                time.sleep(0.3)
            except Exception as e:
                logger.error(f"Error enviando nota {nota['numero']} a {chat_id}: {e}")

    # Aviso de exito solo a Christian
    hora_fin = datetime.now().strftime("%H:%M")
    modo_txt = "PRUEBA (3 destinatarios)" if modo_prueba else "PRODUCCION (solo Marcelo)"

    # Calcula delay de GitHub Actions si el dato está disponible
    delay_txt = ""
    gha_start = os.environ.get("GITHUB_RUN_STARTED_AT", "")
    if gha_start:
        try:
            from datetime import timezone, timedelta
            ART = timezone(timedelta(hours=-3))
            dt_start_utc = datetime.fromisoformat(gha_start.replace("Z", "+00:00"))
            dt_fin_utc = datetime.now(timezone.utc)
            minutos_total = int((dt_fin_utc - dt_start_utc).total_seconds() / 60)
            hora_inicio_arg = dt_start_utc.astimezone(ART).strftime("%H:%M")
            delay_txt = f"\nInicio workflow: {hora_inicio_arg} ARG\nDuracion total: {minutos_total} min"
        except Exception:
            pass

    aviso = (
        f"OK TDF Noticias - {fecha} {hora_fin}\n"
        f"10 notas enviadas\n"
        f"Modo: {modo_txt}"
        f"{delay_txt}"
    )
    try:
        enviar_mensaje(CHAT_CHRISTIAN, aviso)
    except Exception as e:
        logger.error(f"Error enviando aviso a Christian: {e}")


def enviar_error(mensaje_error: str, fecha: str):
    """Notifica fallo solo a Christian."""
    texto = (
        f"ERROR TDF Noticias - {fecha}\n\n"
        f"Motivo: {mensaje_error}"
    )
    try:
        enviar_mensaje(CHAT_CHRISTIAN, texto)
    except Exception as e:
        logger.error(f"Error enviando notificacion de error: {e}")
