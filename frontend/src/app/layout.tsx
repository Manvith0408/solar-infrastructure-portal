import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';

const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-inter'
});

export const metadata: Metadata = {
  title: 'SolarPulse • Dual-Sided Solar Infrastructure & DPR Planning Platform',
  description:
    'MNRE and State Gov compliant dual-sided solar platform. Features citizen rooftop sizing radar with PM Surya Ghar subsidies and official B2G microgrid DPR planning engine.',
  keywords: [
    'Solar DPR',
    'PM Surya Ghar',
    'Solar Sizing',
    'Detailed Project Report',
    'Gov Planning',
    'Solar Microgrid',
    'Muft Bijli Yojana'
  ]
};

import { AuthProvider } from '@/context/AuthContext';

export default function RootLayout({
  children
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${inter.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col font-sans bg-slate-950 text-slate-100">
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
