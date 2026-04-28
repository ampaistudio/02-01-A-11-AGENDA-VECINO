'use client';

import * as Sentry from '@sentry/nextjs';
import { useEffect } from 'react';

export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <html lang="es">
      <body>
        <main style={{ padding: 24, fontFamily: 'IBM Plex Sans, Segoe UI, sans-serif' }}>
          <h2>Ocurrió un error inesperado</h2>
          <p>Registramos el incidente para revisión técnica.</p>
          <button onClick={() => reset()} style={{ padding: '10px 14px', borderRadius: 8 }}>
            Reintentar
          </button>
        </main>
      </body>
    </html>
  );
}
