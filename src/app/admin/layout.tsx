'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import Loader from '@/components/Loader';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const [status, setStatus] = useState('Vérification de la session...');

  useEffect(() => {
    (async () => {
      // 1. Vérifier si l'utilisateur est connecté
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      
      if (userError || !user) {
        setStatus('Pas connecté. Redirection...');
        window.location.href = '/inscription';
        return;
      }

      setStatus(`Connecté en tant que : ${user.email}`);

      // 2. Chercher le rôle dans la table profiles
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single();

      if (profileError) {
        setStatus(`Erreur DB : ${profileError.message}`);
        return;
      }

      if (!profile || profile.role !== 'admin') {
        setStatus(`Accès refusé. Ton rôle est : ${profile?.role || 'inconnu'}. Redirection...`);
        setTimeout(() => { window.location.href = '/'; }, 3000);
        return;
      }

      // Si tout est bon, on affiche la page
      setStatus('Accès autorisé !');
    })();
  }, []);

  // Affiche le statut au lieu de rediriger immédiatement
  if (status !== 'Accès autorisé !') {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#0F172A', color: '#FBBF24', padding: '20px', textAlign: 'center' }}>
        <p>{status}</p>
      </div>
    );
  }

  return <>{children}</>;
}