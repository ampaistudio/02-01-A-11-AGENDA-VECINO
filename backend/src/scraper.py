import requests
from bs4 import BeautifulSoup
import logging
from urllib.parse import urljoin
from concurrent.futures import ThreadPoolExecutor, as_completed

logger = logging.getLogger(__name__)

PORTALES = [
    {"nombre": "Sur54", "url": "https://www.sur54.com/"},
    {"nombre": "Infofueguina", "url": "https://www.infofueguina.com/"},
    {"nombre": "Tiempo Fueguino", "url": "https://www.tiempofueguino.com/"},
    {"nombre": "Cronicas Fueguinas", "url": "https://www.cronicasfueguinas.com/"},
    {"nombre": "La Contratapa TDF", "url": "https://lacontratapatdf.com/"},
    {"nombre": "Red23 Noticias", "url": "https://red23noticias.com.ar/"},
    {"nombre": "Minuto Fueguino", "url": "https://www.minutofueguino.com.ar/"},
    {"nombre": "Provincia23", "url": "https://www.provincia23.com.ar/"},
    {"nombre": "El Fueguino", "url": "https://www.elfueguino.com.ar/"},
    {"nombre": "Diario Prensa", "url": "https://www.diarioprensa.com.ar/"},
    {"nombre": "Actualidad TDF", "url": "https://www.actualidadtdf.com.ar/"},
    {"nombre": "El Diario del Fin del Mundo", "url": "https://www.eldiariodelfindelmundo.com/"},
    {"nombre": "InfoTDF", "url": "https://infotdf.com/"},
]

# REGLA OBLIGATORIA: nunca scrapear el portal propio
EXCLUIDOS = ["opinionpublica.com.ar"]

HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
        "AppleWebKit/537.36 (KHTML, like Gecko) "
        "Chrome/120.0.0.0 Safari/537.36"
    )
}


def scrape_articulo(url: str) -> str:
    """Scrapea el contenido completo de un articulo dado su URL."""
    if not url or not url.startswith("http"):
        return ""
    try:
        resp = requests.get(url, headers=HEADERS, timeout=10)
        resp.raise_for_status()
        soup = BeautifulSoup(resp.text, "lxml")

        # Elimina scripts, estilos, nav, footer, sidebar
        for tag in soup(["script", "style", "nav", "footer", "aside", "header"]):
            tag.decompose()

        # Busca el cuerpo del articulo en tags comunes
        contenido = ""
        for selector in ["article", ".entry-content", ".post-content",
                         ".article-body", ".nota-cuerpo", ".content", "main"]:
            elem = soup.select_one(selector)
            if elem:
                parrafos = elem.find_all("p")
                contenido = " ".join(p.get_text(strip=True) for p in parrafos if len(p.get_text(strip=True)) > 30)
                if len(contenido) > 100:
                    break

        # Fallback: todos los parrafos de la pagina
        if not contenido:
            parrafos = soup.find_all("p")
            contenido = " ".join(p.get_text(strip=True) for p in parrafos if len(p.get_text(strip=True)) > 30)

        return contenido[:2000]  # maximo 2000 chars por articulo
    except Exception as e:
        logger.debug(f"No se pudo scrapear articulo {url}: {e}")
        return ""


def scrape_portal(portal: dict) -> list:
    """Scraping de portada + contenido de articulos de un portal TDF."""
    articulos = []
    con_url = []
    try:
        resp = requests.get(portal["url"], headers=HEADERS, timeout=12)
        resp.raise_for_status()
        soup = BeautifulSoup(resp.text, "lxml")

        vistos = set()
        for tag in ["h1", "h2", "h3"]:
            for elem in soup.find_all(tag):
                texto = elem.get_text(strip=True)
                if len(texto) < 30 or texto in vistos:
                    continue
                vistos.add(texto)

                url = ""
                link = elem.find("a") or elem.find_parent("a")
                if link and link.get("href"):
                    url = urljoin(portal["url"], link["href"])

                articulos.append({
                    "titular": texto,
                    "fuente_url": url,
                    "portal": portal["nombre"],
                    "contenido": "",
                })

        # Scrapea el contenido de los primeros 8 articulos con URL valida — en paralelo
        con_url = [a for a in articulos if a["fuente_url"].startswith("http")][:8]
        with ThreadPoolExecutor(max_workers=8) as pool:
            futures_art = {pool.submit(scrape_articulo, art["fuente_url"]): art for art in con_url}
            for fut in as_completed(futures_art):
                futures_art[fut]["contenido"] = fut.result()

        logger.info(f"{portal['nombre']}: {len(con_url)} articulos con contenido")
    except Exception as e:
        logger.warning(f"Error scrapeando {portal['nombre']}: {e}")

    return con_url


def obtener_noticias() -> list:
    """Scraping completo de todos los portales TDF en paralelo."""
    portales_validos = [
        p for p in PORTALES
        if not any(exc in p["url"] for exc in EXCLUIDOS)
    ]

    todas = []
    with ThreadPoolExecutor(max_workers=13) as executor:
        futures = {executor.submit(scrape_portal, p): p for p in portales_validos}
        for future in as_completed(futures):
            portal = futures[future]
            try:
                articulos = future.result()
                todas.extend(articulos)
            except Exception as e:
                logger.warning(f"Error en portal {portal['nombre']}: {e}")

    logger.info(f"Total articulos recolectados con contenido: {len(todas)}")
    return todas


def scrape_publicadas() -> list:
    """
    Scraping de opinionpublica.com.ar para el reporte dominical.
    UNICO caso donde se accede al portal propio.
    """
    publicadas = []
    try:
        resp = requests.get(
            "https://www.opinionpublica.com.ar/index",
            headers=HEADERS,
            timeout=12,
        )
        resp.raise_for_status()
        soup = BeautifulSoup(resp.text, "lxml")
        for tag in ["h1", "h2", "h3"]:
            for elem in soup.find_all(tag):
                texto = elem.get_text(strip=True)
                if len(texto) > 20:
                    publicadas.append(texto)
        logger.info(f"Opinion Publica: {len(publicadas)} titulares encontrados")
    except Exception as e:
        logger.warning(f"Error scrapeando Opinion Publica: {e}")
    return publicadas
