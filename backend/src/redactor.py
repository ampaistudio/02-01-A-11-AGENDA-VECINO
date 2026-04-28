import os
import logging
import requests

logger = logging.getLogger(__name__)

GROQ_URL = "https://api.groq.com/openai/v1/chat/completions"
MODELS = ["llama-3.3-70b-versatile", "llama-3.1-8b-instant"]
MAX_ARTICULOS_INICIALES = 10
MAX_CHARS_INICIALES = 450

PROMPT_SISTEMA = """Sos el jefe de redaccion de Opinion Publica, portal de noticias de Tierra del Fuego.
Lema del portal: "Noticias de Tierra del Fuego a toda hora".
Linea editorial: opositora al gobierno provincial y a las intendencias de Ushuaia y Rio Grande.
Tu mision: mostrar que la situacion no es la mejor, cuestionar la gestion oficial con datos y hechos."""
FRASES_INVALIDAS = (
    "lo siento",
    "no puedo",
    "no tengo acceso",
    "como modelo",
    "a continuacion",
    "aquí tienes",
    "aqui tienes",
)


def _armar_contexto(articulos: list, max_articulos: int, max_chars: int) -> str:
    return "\n\n".join([
        (
            f"PORTAL: {a['portal']}\n"
            f"TITULAR: {a['titular']}\n"
            f"CONTENIDO: {(a.get('contenido', '') or 'Sin contenido disponible')[:max_chars]}\n"
            f"FUENTE: {a['fuente_url']}"
        )
        for a in articulos[:max_articulos]
    ])


def _parsear_notas(texto: str, max_notas: int = 10) -> list:
    bloques = [b.strip() for b in texto.split("---") if b.strip()]
    notas = []
    for i, bloque in enumerate(bloques[:max_notas]):
        lineas = bloque.strip().split("\n")
        titular = lineas[0].strip()
        cuerpo = "\n".join(lineas[1:]).strip() if len(lineas) > 1 else ""
        if titular and cuerpo:
            notas.append({"titular": titular, "cuerpo": cuerpo, "numero": i + 1})
    return notas


def _es_nota_valida(titular: str, cuerpo: str) -> bool:
    if not titular or not cuerpo:
        return False
    if len(titular) < 12 or len(cuerpo) < 140:
        return False
    texto = f"{titular} {cuerpo}".lower()
    if any(frase in texto for frase in FRASES_INVALIDAS):
        return False
    if cuerpo.count("---") > 0:
        return False
    return True


def _filtrar_notas_calidad(notas: list) -> list:
    notas_ok = []
    vistos = set()
    for nota in notas:
        titular = " ".join((nota.get("titular", "") or "").split()).strip()
        cuerpo = " ".join((nota.get("cuerpo", "") or "").split()).strip()
        clave = titular.lower()
        if not _es_nota_valida(titular, cuerpo):
            continue
        if clave in vistos:
            continue
        vistos.add(clave)
        notas_ok.append({"titular": titular.upper(), "cuerpo": cuerpo})

    for i, n in enumerate(notas_ok, start=1):
        n["numero"] = i
    return notas_ok


def generar_notas(articulos: list, fecha: str) -> list:
    """Genera 10 notas editoriales opositoras llamando a Groq via requests."""
    api_key = os.environ["GROQ_API_KEY"]
    max_articulos = MAX_ARTICULOS_INICIALES
    max_chars = MAX_CHARS_INICIALES

    prompt_template = """Fecha de hoy: {fecha}

Con las siguientes noticias recolectadas de portales fueguinos (cada una con su titular y contenido original), \
selecciona las 10 mas importantes y reescribelas siguiendo estas reglas ESTRICTAS:

REGLAS OBLIGATORIAS:
1. Maximo 250 palabras por nota
2. Texto plano, sin asteriscos, sin markdown, sin simbolos de formato
3. Tono opositor: cuestionas la gestion oficial, mostras que la situacion no es buena
4. Enfasis en economia y politica de Tierra del Fuego
5. Cada nota empieza con el TITULAR en mayusculas en la primera linea
6. Luego el cuerpo de la nota
7. Separar cada nota con exactamente esta linea: ---
8. No escribas numeracion como "Nota 1:" ni encabezados extra
9. No repitas noticias similares
10. PROHIBIDO inventar datos, nombres, cifras o hechos; solo usa lo que dice el contenido original
11. Si el contenido original es escaso, reescribi con lo que hay sin agregar informacion falsa

Noticias disponibles:
{contexto}

Genera las 10 notas ahora:"""

    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json",
    }

    # Hasta 3 niveles de compresion del payload para evitar 413 en cron.
    for compresion in range(3):
        contexto = _armar_contexto(articulos, max_articulos=max_articulos, max_chars=max_chars)
        prompt = prompt_template.format(fecha=fecha, contexto=contexto)

        payload = {
            "model": MODELS[0],
            "messages": [
                {"role": "system", "content": PROMPT_SISTEMA},
                {"role": "user", "content": prompt},
            ],
            "temperature": 0.7,
            "max_tokens": 2200,
        }

        ultimo_error = None
        for model in MODELS:
            try:
                payload["model"] = model
                resp = requests.post(GROQ_URL, json=payload, headers=headers, timeout=60)
                resp.raise_for_status()

                notas = _parsear_notas(resp.json()["choices"][0]["message"]["content"].strip(), max_notas=10)
                notas = _filtrar_notas_calidad(notas)
                logger.info(
                    f"Groq genero {len(notas)} notas con modelo {model} "
                    f"(articulos={max_articulos}, chars={max_chars})"
                )
                if len(notas) >= 10:
                    return notas[:10]
                ultimo_error = Exception(
                    f"Calidad insuficiente en respuesta Groq: {len(notas)} notas validas"
                )
                logger.warning(str(ultimo_error))
            except requests.HTTPError as e:
                ultimo_error = e
                status = e.response.status_code if e.response is not None else None
                logger.warning(f"Modelo {model} fallo con status {status}: {e}")
                if status == 413:
                    # No tiene sentido probar otro modelo con el mismo payload.
                    break
            except Exception as e:
                ultimo_error = e
                logger.warning(f"Modelo {model} fallo: {e}")

        if isinstance(ultimo_error, requests.HTTPError):
            status = ultimo_error.response.status_code if ultimo_error.response is not None else None
            if status == 413 and compresion < 2:
                max_articulos = max(6, max_articulos - 2)
                max_chars = max(220, int(max_chars * 0.65))
                logger.warning(
                    f"Groq devolvio 413, reduciendo payload a articulos={max_articulos}, chars={max_chars}"
                )
                continue

        logger.error("Todos los modelos Groq fallaron")
        raise ultimo_error if ultimo_error else Exception("Fallo desconocido en Groq")

    raise Exception("No se pudo generar notas: payload excedido tras compresion")
