'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { supabase } from '@/lib/supabase';
import { Upload, ArrowLeft, FileText, CheckCircle } from 'lucide-react';
import Toast from '@/components/Toast';
import Loader from '@/components/Loader';

export default function UploadPage() {
  const [me, setMe] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [title, setTitle] = useState('');
  const [type, setType] = useState('annale');
  const [year, setYear] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error'; show: boolean }>({ msg: '', type: 'success', show: false });

  useEffect(() => {
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { 
        setTimeout(() => { window.location.href = '/inscription'; }, 1000);
        return; 
      }
      setMe(session.user);
      setLoading(false);
    })();
  }, []);

  const showToast = (msg: string, type: 'success' | 'error') => {
    setToast({ msg, type, show: true });
    setTimeout(() => setToast(t => ({ ...t, show: false })), 3000);
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file || !me) return;
    setUploading(true);

    // On récupère l'extension du fichier (pdf, jpg, png, etc.)
    const ext = file.name.split('.').pop()?.toLowerCase() || 'pdf';
    const path = `${me.id}/${Date.now()}.${ext}`;
    
    const { error: upErr } = await supabase.storage.from('documents').upload(path, file);
    if (upErr) { showToast('Erreur upload : ' + upErr.message, 'error'); setUploading(false); return; }

    const { error: dbErr } = await supabase.from('documents').insert({
      uploader_id: me.id, title, type, academic_year: year, file_path: path, status: 'pending',
    });
    if (dbErr) { showToast('Erreur : ' + dbErr.message, 'error'); setUploading(false); return; }

    showToast('Document envoyé avec succès !', 'success');
    setTitle(''); setYear(''); setFile(null);
    setUploading(false);
  };

  if (loading) return <Loader />;

  return (
    <div style={{ minHeight: '100vh', position: 'relative', padding: '40px 24px', overflow: 'hidden' }}>
      <div className="bg-shape" style={{ width: '400px', height: '400px', background: '#009E60', top: '10%', left: '-10%', opacity: 0.3 }} />
      <div className="bg-shape" style={{ width: '300px', height: '300px', background: '#1E40AF', bottom: '-10%', right: '0%', opacity: 0.4, animationDelay: '-5s' }} />

      <Toast message={toast.msg} type={toast.type} show={toast.show} />

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} style={{ maxWidth: '600px', margin: '0 auto', position: 'relative', zIndex: 10 }}>
        
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '32px' }}>
          <motion.a href="/" whileHover={{ x: -5 }} style={{ color: '#FBBF24', background: 'rgba(251,191,36,0.1)', padding: '10px', borderRadius: '50%' }}><ArrowLeft size={24} /></motion.a>
          <h1 style={{ fontSize: '32px', fontWeight: 800, color: '#FFF', letterSpacing: '-1px' }}>Partager un document</h1>
        </div>

        <form onSubmit={submit} className="glass-card" style={{ borderRadius: '24px', padding: '32px', display: 'flex', flexDirection: 'column', gap: '20px', boxShadow: '0 20px 50px rgba(0,0,0,0.3)' }}>
          
          <div>
            <label style={{ fontSize: '14px', color: '#CBD5E1', marginBottom: '8px', display: 'block', fontWeight: 600 }}>Titre du document</label>
            <input required value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Ex: Annale Droit Civil L2 2023"
              style={{ width: '100%', padding: '16px', background: 'rgba(15,23,42,0.6)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', color: '#F1F5F9', fontSize: '15px', transition: 'all 0.3s' }} 
              onFocus={(e) => e.target.style.borderColor = '#FBBF24'} onBlur={(e) => e.target.style.borderColor = 'rgba(255,255,255,0.1)'}
            />
          </div>

          <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
            <div style={{ flex: 1, minWidth: '200px' }}>
              <label style={{ fontSize: '14px', color: '#CBD5E1', marginBottom: '8px', display: 'block', fontWeight: 600 }}>Type</label>
              <select value={type} onChange={(e) => setType(e.target.value)}
                style={{ width: '100%', padding: '16px', background: 'rgba(15,23,42,0.6)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', color: '#F1F5F9', fontSize: '15px' }}>
                <option value="annale">Annale</option>
                <option value="cours">Cours</option>
                <option value="td">TD</option>
              </select>
            </div>
            <div style={{ flex: 1, minWidth: '200px' }}>
              <label style={{ fontSize: '14px', color: '#CBD5E1', marginBottom: '8px', display: 'block', fontWeight: 600 }}>Année</label>
              <input value={year} onChange={(e) => setYear(e.target.value)} placeholder="2023-2024"
                style={{ width: '100%', padding: '16px', background: 'rgba(15,23,42,0.6)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', color: '#F1F5F9', fontSize: '15px', transition: 'all 0.3s' }} 
                onFocus={(e) => e.target.style.borderColor = '#FBBF24'} onBlur={(e) => e.target.style.borderColor = 'rgba(255,255,255,0.1)'}
              />
            </div>
          </div>

          <div>
            <label style={{ fontSize: '14px', color: '#CBD5E1', marginBottom: '8px', display: 'block', fontWeight: 600 }}>Fichier (PDF ou Image)</label>
            <motion.label whileHover={{ scale: 1.01, borderColor: '#FBBF24', background: 'rgba(251,191,36,0.05)' }}
              style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '12px', padding: '40px 20px', background: 'rgba(15,23,42,0.4)', border: '2px dashed rgba(255,255,255,0.15)', borderRadius: '16px', cursor: 'pointer', transition: 'all 0.3s' }}>
              {file ? (
                <>
                  <CheckCircle size={40} color="#009E60" />
                  <span style={{ color: '#009E60', fontWeight: 700, fontSize: '16px', textAlign: 'center' }}>{file.name}</span>
                </>
              ) : (
                <>
                  <div style={{ width: '60px', height: '60px', borderRadius: '50%', background: 'rgba(251,191,36,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Upload size={30} color="#FBBF24" />
                  </div>
                  <span style={{ color: '#CBD5E1', fontWeight: 600, fontSize: '16px' }}>Clique pour choisir un fichier</span>
                  <span style={{ color: '#64748B', fontSize: '13px' }}>Formats acceptés : .pdf, .jpg, .jpeg, .png</span>
                </>
              )}
              {/* L'attribut accept accepte maintenant les images ET les pdf */}
              <input type="file" accept=".pdf, image/*" onChange={(e) => setFile(e.target.files?.[0] || null)} style={{ display: 'none' }} />
            </motion.label>
          </div>

          <motion.button type="submit" disabled={uploading || !file}
            whileHover={{ scale: (uploading || !file) ? 1 : 1.02, boxShadow: '0 10px 25px rgba(0,158,96,0.4)' }}
            whileTap={{ scale: (uploading || !file) ? 1 : 0.98 }}
            style={{ padding: '18px', background: 'linear-gradient(135deg, #009E60, #10B981)', color: '#FFF', borderRadius: '12px', fontSize: '16px', fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', opacity: (uploading || !file) ? 0.5 : 1, marginTop: '10px' }}>
            {uploading ? 'Envoi en cours...' : <><Upload size={20} /> Publier le document</>}
          </motion.button>
        </form>
      </motion.div>
    </div>
  );
}