import type { Metadata, Viewport } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Naclos Operations & Audit Portal',
  description: 'Daily financial audit & operations portal for Naclos fast-food stores.',
  manifest: '/manifest.json',
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  themeColor: '#1a1a1a',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr">
      <body className="min-h-screen bg-neutral-50 text-neutral-900 antialiased">
        <div className="mx-auto max-w-3xl px-4 pb-24 pt-4 sm:px-6">{children}</div>
      </body>
    </html>
  );
}
