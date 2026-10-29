import type { Metadata } from 'next';
import { Poppins, Inter } from 'next/font/google';
import './globals.css';
import SplashScreen from '@/components/SplashScreen';

const poppins = Poppins({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700', '800'],
  variable: '--font-poppins',
  display: 'swap',
});

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'StudyCI — Ouvre, révise et réussis !',
  description: 'La plateforme des étudiants ivoiriens',
  manifest: '/manifest.json',
  themeColor: '#F59E0B',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="fr" suppressHydrationWarning>
      <body className={`${poppins.variable} ${inter.variable}`}>
        <SplashScreen />
        {children}
      </body>
    </html>
  );
}