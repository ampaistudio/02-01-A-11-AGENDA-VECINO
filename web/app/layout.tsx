import type { Metadata } from 'next';
import './globals.css';
import { AccessibilityControls } from '../components/accessibility-controls';

export const metadata: Metadata = {
  title: 'Agenda Reuniones Vecinos',
  description: 'Panel privado de gestion de reuniones vecinales de Nodo Ai Agency',
  manifest: '/manifest.json',
  themeColor: '#2563eb',
  viewport: 'width=device-width, initial-scale=1, maximum-scale=1, user-scalable=0',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'Agenda Vecinos'
  }
};


export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body suppressHydrationWarning>
        <div className="app-shell">
          <AccessibilityControls />
          <div className="app-content">{children}</div>
          <footer className="app-footer">
            Powered by <a href="https://www.nodoai.co" target="_blank" rel="noopener noreferrer">Nodo Ai Agency</a>
          </footer>
        </div>
      </body>
    </html>
  );
}
