'use client';

import { useEffect, useState } from 'react';

type ThemeMode = 'light' | 'dark';

const FONT_STEP = 0.1;
const FONT_MIN = 0.9;
const FONT_MAX = 1.4;

export function AccessibilityControls() {
  const [theme, setTheme] = useState<ThemeMode>('light');
  const [fontScale, setFontScale] = useState(1);

  useEffect(() => {
    const savedTheme = (localStorage.getItem('theme_mode') as ThemeMode | null) ?? 'light';
    const savedScaleRaw = Number(localStorage.getItem('font_scale') ?? '1');
    const safeScale = Number.isFinite(savedScaleRaw)
      ? Math.max(FONT_MIN, Math.min(FONT_MAX, savedScaleRaw))
      : 1;

    setTheme(savedTheme);
    setFontScale(safeScale);
    document.documentElement.dataset.theme = savedTheme;
    document.documentElement.style.setProperty('--font-scale', String(safeScale));
  }, []);

  function toggleTheme() {
    const next = theme === 'light' ? 'dark' : 'light';
    setTheme(next);
    localStorage.setItem('theme_mode', next);
    document.documentElement.dataset.theme = next;
  }

  function updateScale(next: number) {
    const safe = Math.max(FONT_MIN, Math.min(FONT_MAX, Number(next.toFixed(2))));
    setFontScale(safe);
    localStorage.setItem('font_scale', String(safe));
    document.documentElement.style.setProperty('--font-scale', String(safe));
  }

  return (
    <div className="a11y-controls" aria-label="Preferencias de visualización">
      <button className="a11y-btn secondary" type="button" onClick={() => updateScale(fontScale - FONT_STEP)}>
        A-
      </button>
      <button className="a11y-btn secondary" type="button" onClick={() => updateScale(1)}>
        A
      </button>
      <button className="a11y-btn secondary" type="button" onClick={() => updateScale(fontScale + FONT_STEP)}>
        A+
      </button>
      <button className="a11y-btn secondary" type="button" onClick={toggleTheme}>
        {theme === 'light' ? 'Oscuro' : 'Claro'}
      </button>
    </div>
  );
}
