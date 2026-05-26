#!/usr/bin/env python3
"""
audit_scanner_agenda_vecinos.py
Escanea el proyecto APP AGENDA VECINOS buscando problemas técnicos.
Ejecutar desde la raíz del proyecto.
"""
import re, json
from pathlib import Path
ROOT = Path("/Users/christia/Documents/CEREBRO DIGITAL /02_PROYECTOS/01-NODO AI AGENCY/A-APP WORLD/11-APP-AGENDA REUNIONES VECINOS")
SCAN_DIRS = [
    ROOT / "web/app",
    ROOT / "web/components",
    ROOT / "web/lib",
    ROOT / "backend/src",
    ROOT / "web/middleware.ts",
]
EXCLUDE_DIRS = {"node_modules", ".next", "dist", "build", ".git", "venv", "__pycache__", "playwright-report", "test-results", "scratch"}
EXTENSIONS = {".ts", ".tsx", ".js", ".jsx", ".py"}
findings = {
    "large_files": [],
    "hardcoded_colors": [],
    "any_usage": [],
    "console_logs": [],
    "todos_fixmes": [],
    "hardcoded_strings": [],
    "missing_error_handling": [],
    "direct_supabase_anon": [],
}
HEX_COLOR = re.compile(r'#[0-9a-fA-F]{3,8}')
ANY_TYPE = re.compile(r':\s*any[\s,;\)\>]')
CONSOLE = re.compile(r'console\.(log|warn|error|debug)\(')
TODO = re.compile(r'(TODO|FIXME|HACK|XXX)', re.IGNORECASE)
ANON_KEY = re.compile(r'anon.*key|eyJ', re.IGNORECASE)
HARDCODED_VERTICAL = re.compile(r'"instituto"|"default_vertical"', re.IGNORECASE)

def scan_file(path: Path):
    try:
        text = path.read_text(encoding="utf-8", errors="ignore")
        lines = text.splitlines()
    except Exception:
        return
    rel = str(path.relative_to(ROOT))
    if len(lines) > 400:
        findings["large_files"].append({"file": rel, "lines": len(lines)})
    for i, line in enumerate(lines, 1):
        if HEX_COLOR.search(line):
            findings["hardcoded_colors"].append({"file": rel, "line": i, "content": line.strip()[:100]})
        if ANY_TYPE.search(line):
            findings["any_usage"].append({"file": rel, "line": i, "content": line.strip()[:100]})
        if CONSOLE.search(line):
            findings["console_logs"].append({"file": rel, "line": i, "content": line.strip()[:100]})
        if TODO.search(line):
            findings["todos_fixmes"].append({"file": rel, "line": i, "content": line.strip()[:100]})
        if ANON_KEY.search(line) and "process.env" not in line and ".env" not in line:
            findings["direct_supabase_anon"].append({"file": rel, "line": i, "content": "⚠️ POSIBLE KEY EXPUESTA"})
        if HARDCODED_VERTICAL.search(line):
            findings["hardcoded_strings"].append({"file": rel, "line": i, "content": line.strip()[:100]})

def walk(target: Path):
    if not target.exists():
        return
    if target.is_file() and target.suffix in EXTENSIONS:
        scan_file(target)
        return
    for item in target.rglob("*"):
        if any(ex in item.parts for ex in EXCLUDE_DIRS):
            continue
        if item.is_file() and item.suffix in EXTENSIONS:
            scan_file(item)

for target in SCAN_DIRS:
    walk(target)

out = ROOT / "scratch" / "audit_scan_results.json"
out.parent.mkdir(exist_ok=True)
out.write_text(json.dumps(findings, indent=2, ensure_ascii=False))

print("=== RESULTADO DEL SCAN AGENDA VECINOS ===")
for key, items in findings.items():
    print(f"{key}: {len(items)} hallazgos")
print(f"\nResultados guardados en: {out}")
