import type { Metadata, Viewport } from 'next';
import { Figtree } from 'next/font/google';
import './globals.css';
import InstallPrompt from '@/components/install-prompt';
import PwaRegister from '@/components/pwa-register';

const figtree = Figtree({ subsets: ['latin'], variable: '--font-figtree', display: 'swap' });

export const metadata: Metadata = {
  title: { default: 'Terraviva Procurement System', template: '%s | Terraviva' },
  description: 'Procurement management for Terraviva: protecting nature, empowering communities.',
  applicationName: 'Terraviva',
  appleWebApp: { capable: true, title: 'Terraviva', statusBarStyle: 'default' },
  icons: { apple: '/pwa-icon/180' },
};

export const viewport: Viewport = {
  themeColor: '#063f43',
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={figtree.variable}>
      <body className="min-h-screen antialiased">
        {children}
        <PwaRegister />
        <InstallPrompt />
      </body>
    </html>
  );
}
