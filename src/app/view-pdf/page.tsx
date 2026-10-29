'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { ArrowLeft, AlertCircle, Download, ExternalLink } from 'lucide-react';
import Loader from '@/components/Loader';

function Viewer() {
  const searchParams = useSearchParams();
  const path = searchParams.get('path');
  const title = searchParams.get('title') || 'Document';
  const [url, setUrl] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [isMobile, setIsMobile] = useState(false);
  
  const isImage = path?.toLowerCase().match(/\.(jpg|jpeg|png|webp|gif)$/i);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  useEffect(() => {
    if (!path) {
      setError("Aucun fichier spécifié.");
      return;
    }

    (async () => {
      try {
        const { data, error: supabaseError } = await supabase
          .storage
          .from('documents')
          .createSignedUrl(path, 3600);

        if (supabaseError) throw supabaseError;
        if (!data || !data.signedUrl) throw new Error("Lien introuvable.");

        setUrl(data.signedUrl);
      } catch (err: any) {
        console.error(err);
        setError(err.message || "Erreur lors de la récupération du document.");
      }
    })();
  }, [path]);

  const forceDownload = async () => {
    if (!url) return;
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', title);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (error) {
    return (
      <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: '#0F172A', color: '#F1F5F9', padding: '24px', textAlign: 'center' }}>
        <AlertCircle size={48} color="#EF4444" style={{ marginBottom: '16px' }} />
        <h2 style={{ fontSize: '20px', fontWeight: 700, marginBottom: '8px' }}>Impossible d'ouvrir le document</h2>
        <p style={{ color: '#94A3B8', maxWidth: '500px', lineHeight: 1.6, marginBottom: '24px' }}>{error}</p>
        <button onClick={() => window.history.back()} style={{ padding: '12px 24px', background: '#1E40AF', color: '#FFF', borderRadius: '8px', fontWeight: 600 }}>Retour</button>
      </div>
    );
  }

  if (!url) return <Loader text="Chargement sécurisé du document..." />;

  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', background: '#0F172A' }}>
      
      {/* Barre du haut */}
      <div style={{ padding: '16px 24px', display: 'flex', alignItems: 'center', gap: '16px', background: '#1E293B', borderBottom: '1px solid #334155', zIndex: 10 }}>
        <button onClick={() => window.history.back()} style={{ color: '#FBBF24', display: 'flex', alignItems: 'center', cursor: 'pointer', background: 'transparent' }}>
          <ArrowLeft size={22} />
        </button>
        <h1 style={{ fontSize: '16px', fontWeight: 600, color: '#F1F5F9', flex: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {title}
        </h1>
        
        {/* Bouton de secours pour télécharger sur mobile */}
        <button onClick={forceDownload} style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 12px', background: 'rgba(245,158,11,0.2)', color: '#F59E0B', borderRadius: '8px', fontWeight: 600, fontSize: '13px' }}>
          <Download size={16} /> <span style={{ display: isMobile ? 'none' : 'inline' }}>Télécharger</span>
        </button>
      </div>
      
      {/* Zone d'affichage (Image ou PDF) */}
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', background: '#0F172A', position: 'relative' }}>
        {isImage ? (
          // Si c'est une image
          <img 
            src={url} 
            alt={title} 
            style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain', padding: '20px' }} 
          />
        ) : (
          // Si c'est un PDF
          <>
            {/* Sur mobile, on affiche un bouton pour ouvrir dans le lecteur natif, car l'iframe est capricieux */}
            {isMobile ? (
              <div style={{ padding: '24px', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '20px' }}>
                <div style={{ width: '80px', height: '80px', background: 'rgba(245,158,11,0.1)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <ExternalLink size={40} color="#F59E0B" />
                </div>
                <p style={{ color: '#F1F5F9', fontSize: '16px' }}>Ce PDF est prêt à être lu.</p>
                <a href={url} target="_blank" rel="noopener noreferrer" style={{ padding: '16px 32px', background: '#1E40AF', color: '#FFF', borderRadius: '12px', fontWeight: 700, textDecoration: 'none', width: '100%', maxWidth: '300px' }}>
                  Ouvrir le PDF
                </a>
              </div>
            ) : (
              // Sur ordinateur, l'iframe fonctionne bien
              <iframe 
                src={url} 
                style={{ width: '100%', height: '100%', border: 'none' }} 
                title="Lecteur PDF"
              />
            )}
          </>
        )}
      </div>
    </div>
  );
}

export default function ViewPdfPage() {
  return (
    <Suspense fallback={<Loader />}>
      <Viewer />
    </Suspense>
  );
}