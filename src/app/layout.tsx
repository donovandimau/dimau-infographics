import type { Metadata, Viewport } from 'next';
import Link from 'next/link';
import './globals.css';

export const metadata: Metadata = {
  title: { default: 'Infographics Fiji', template: '%s · Infographics Fiji' },
  description: 'Infographic templates for the Pacific, rendered for any app.',
  icons: { icon: '/icons/icon.svg', apple: '/icons/apple-touch-icon.png' },
  openGraph: { title: 'Infographics Fiji', images: ['/icons/icon-512.png'] },
  manifest: '/manifest.webmanifest',
};

export const viewport: Viewport = { themeColor: '#07090E', width: 'device-width', initialScale: 1 };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-dvh flex flex-col antialiased">
        <header className="flex items-center gap-3 px-4 sm:px-6 h-14 border-b border-edge/70 bg-obsidian/80 backdrop-blur sticky top-0 z-30">
          <Link href="/vault" className="flex items-center gap-2.5" aria-label="Infographics Fiji">
            <img src="/icons/icon.svg" alt="" width={28} height={28} className="rounded-lg" />
            <span className="font-semibold tracking-tight">Infographics Fiji</span>
          </Link>
          <nav className="ml-auto flex items-center gap-1 text-sm">
            <Link href="/vault" className="px-3 py-1.5 rounded-full hover:bg-edge/60">Vault</Link>
            <Link href="/studio/new" className="px-3 py-1.5 rounded-full bg-lagoon text-obsidian font-semibold hover:brightness-110">New</Link>
          </nav>
        </header>
        <main className="flex-1 flex flex-col">{children}</main>
        <footer className="px-4 py-3 text-center text-[10px] text-crisp/35">Infographics Fiji · Dimau Ventures Ltd</footer>
      </body>
    </html>
  );
}
