'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import Sidebar from './Sidebar';
import { usePathname } from 'next/navigation';
import Loader from './Loader';

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const pathname = usePathname();

  useEffect(() => {
    // On vérifie l'utilisateur
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUser(user);
      setLoading(false);
    });
  }, [pathname]); // On revérifie à chaque changement de page

  // Les pages qui n'ont pas de Sidebar
  const isPublicPage = pathname === '/inscription';
  const isSplashScreen = pathname === '/' && !user;

  if (loading) return <Loader />; // On attend d'être sûr avant d'afficher

  if (isPublicPage || isSplashScreen) {
    return <>{children}</>;
  }

  // Si on est connecté et sur une page interne, on affiche la Sidebar
  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#0B1120' }}>
      <Sidebar />
      <div style={{ marginLeft: '260px', flex: 1, minHeight: '100vh' }}>
        {children}
      </div>
    </div>
  );
}