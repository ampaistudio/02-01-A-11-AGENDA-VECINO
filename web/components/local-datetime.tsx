'use client';

import { useEffect, useState } from 'react';

function formatDateTime(date: Date): string {
  return new Intl.DateTimeFormat('es-AR', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  }).format(date);
}

export function LocalDateTime() {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="local-time-banner" aria-live="polite" suppressHydrationWarning>
      <strong>Hora local:</strong> {formatDateTime(now)}
    </div>
  );
}
