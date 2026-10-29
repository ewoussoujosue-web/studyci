'use client';

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '@/lib/supabase';
import { Check, X, Eye, ArrowLeft, FileText, Users, Trash2, AlertTriangle, Clock, CheckCircle, XCircle, GraduationCap, Plus, UploadCloud, Loader2 } from 'lucide-react';
import Toast from '@/components/Toast';
import Loader from '@/components/Loader';

export default function AdminPage() {
  const [activeTab, setActiveTab] = useState<'documents' | 'students'>('documents');
  const [filter, setFilter] = useState('pending');
  
  const [docs, setDocs] = useState<any[]>([]);
  const [students, setStudents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  // STATISTIQUES
  const [stats, setStats] = useState({ pending: 0, approved: 0, rejected: 0, totalStudents: 0 });

  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error'; show: boolean }>({ msg: '', type: 'success', show: false });
  
  // ÉTATS POUR LES MODALES
  const [confirmDeleteUser, setConfirmDeleteUser] = useState<string | null>(null);
  const [confirmDeleteDoc, setConfirmDeleteDoc] = useState<any | null>(null); // Nouveau
  
  // ÉTATS POUR L'UPLOAD ADMIN
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [newDoc, setNewDoc] = useState({
    title: '',
    type: 'Cours',
    level: '',
    year: new Date().getFullYear().toString(),
    file: null as File | null
  });

  const showToast = (msg: string, type: 'success' | 'error') => {
    setToast({ msg, type, show: true });
    setTimeout(() => setToast(t => ({ ...t, show: false })), 3000);
  };

  const loadStats = async () => {
    const { count: pending } = await supabase.from('documents').select('*', { count: 'exact', head: true }).eq('status', 'pending');
    const { count: approved } = await supabase.from('documents').select('*', { count: 'exact', head: true }).eq('status', 'approved');
    const { count: rejected } = await supabase.from('documents').select('*', { count: 'exact', head: true }).eq('status', 'rejected');
    const { count: totalStudents } = await supabase.from('profiles').select('*', { count: 'exact', head: true }).neq('role', 'admin');
    
    setStats({
      pending: pending || 0,
      approved: approved || 0,
      rejected: rejected || 0,
      totalStudents: totalStudents || 0
    });
  };

  const loadDocs = async () => {
    const { data } = await supabase.from('documents').select('*').eq('status', filter).order('created_at', { ascending: false });
    setDocs(data || []);
    setLoading(false);
  };

  const loadStudents = async () => {
    const { data } = await supabase.from('profiles').select('*').neq('role', 'admin').order('created_at', { ascending: false });
    setStudents(data || []);
    setLoading(false);
  };

  useEffect(() => {
    setLoading(true);
    loadStats();
    if (activeTab === 'documents') loadDocs();
    else loadStudents();
  }, [activeTab, filter]);

  const viewPdf = async (path: string) => {
    const { data } = await supabase.storage.from('documents').createSignedUrl(path, 300);
    if (data) window.open(data.signedUrl, '_blank');
  };

  const approve = async (id: string) => { 
    await supabase.from('documents').update({ status: 'approved' }).eq('id', id); 
    loadDocs(); 
    loadStats();
    showToast('Document approuvé', 'success'); 
  };
  
  const reject = async (id: string) => { 
    await supabase.from('documents').update({ status: 'rejected' }).eq('id', id); 
    loadDocs(); 
    loadStats();
    showToast('Document rejeté', 'success'); 
  };

  // --- SUPPRESSION D'UN DOCUMENT (Nouveau) ---
  const deleteDocument = async () => {
    if (!confirmDeleteDoc) return;
    
    try {
      // 1. Supprimer le fichier physique dans le Storage
      const { error: storageError } = await supabase.storage.from('documents').remove([confirmDeleteDoc.file_path]);
      
      // On ignore l'erreur de storage si le fichier n'existe plus physiquement, mais on supprime quand même la ligne DB
      if (storageError) console.warn("Fichier introuvable dans le storage :", storageError.message);

      // 2. Supprimer la ligne dans la base de données
      const { error: dbError } = await supabase.from('documents').delete().eq('id', confirmDeleteDoc.id);
      
      if (dbError) throw dbError;

      showToast('Document supprimé avec succès', 'success');
      setConfirmDeleteDoc(null);
      loadDocs();
      loadStats();

    } catch (err: any) {
      showToast("Erreur : " + err.message, 'error');
    }
  };

  const deleteStudent = async (id: string) => {
    const { error } = await supabase.rpc('delete_user', { user_id_to_delete: id });
    if (error) {
      showToast("Erreur : " + error.message, 'error');
    } else {
      showToast("Étudiant supprimé avec succès", 'success');
      setConfirmDeleteUser(null);
      loadStudents();
      loadStats();
    }
  };

  const handleAdminUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDoc.file || !newDoc.title) return;
    setUploading(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Non connecté");

      const fileExt = newDoc.file.name.split('.').pop();
      const fileName = `${Date.now()}-admin.${fileExt}`;
      const filePath = `${session.user.id}/${fileName}`;

      const { error: uploadError } = await supabase.storage.from('documents').upload(filePath, newDoc.file);
      if (uploadError) throw uploadError;

      const { error: dbError } = await supabase.from('documents').insert({
        uploader_id: session.user.id,
        title: newDoc.title,
        type: newDoc.type,
        academic_year: newDoc.year,
        file_path: filePath,
        status: 'approved',
      });

      if (dbError) throw dbError;

      showToast('Document ajouté et approuvé avec succès !', 'success');
      setShowUploadModal(false);
      setNewDoc({ title: '', type: 'Cours', level: '', year: new Date().getFullYear().toString(), file: null });
      
      loadDocs();
      loadStats();

    } catch (error: any) {
      showToast("Erreur : " + error.message, 'error');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', background: '#F8FAFC', padding: '40px 24px', position: 'relative' }}>
      <Toast message={toast.msg} type={toast.type} show={toast.show} />

      {/* MODALE DE CONFIRMATION DE SUPPRESSION ÉTUDIANT */}
      <AnimatePresence>
        {confirmDeleteUser && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.6)', backdropFilter: 'blur(4px)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
            <motion.div initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 20 }} style={{ background: '#FFF', padding: '32px', borderRadius: '24px', maxWidth: '400px', width: '100%', textAlign: 'center', boxShadow: '0 20px 50px rgba(0,0,0,0.2)' }}>
              <div style={{ width: '64px', height: '64px', borderRadius: '50%', background: '#FEF2F2', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
                <AlertTriangle size={32} color="#EF4444" />
              </div>
              <h3 style={{ fontSize: '22px', fontWeight: 800, color: '#0F172A', marginBottom: '8px' }}>Supprimer cet étudiant ?</h3>
              <p style={{ color: '#64748B', fontSize: '15px', marginBottom: '24px', lineHeight: 1.5 }}>Cette action est irréversible. Tous ses documents et messages seront également supprimés.</p>
              <div style={{ display: 'flex', gap: '12px' }}>
                <button onClick={() => setConfirmDeleteUser(null)} style={{ flex: 1, padding: '14px', background: '#F1F5F9', color: '#0F172A', borderRadius: '12px', fontWeight: 600, fontSize: '15px' }}>Annuler</button>
                <button onClick={() => deleteStudent(confirmDeleteUser)} style={{ flex: 1, padding: '14px', background: '#EF4444', color: '#FFF', borderRadius: '12px', fontWeight: 600, fontSize: '15px' }}>Supprimer</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* MODALE DE CONFIRMATION DE SUPPRESSION DOCUMENT (Nouveau) */}
      <AnimatePresence>
        {confirmDeleteDoc && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.6)', backdropFilter: 'blur(4px)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
            <motion.div initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 20 }} style={{ background: '#FFF', padding: '32px', borderRadius: '24px', maxWidth: '400px', width: '100%', textAlign: 'center', boxShadow: '0 20px 50px rgba(0,0,0,0.2)' }}>
              <div style={{ width: '64px', height: '64px', borderRadius: '50%', background: '#FEF2F2', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
                <AlertTriangle size={32} color="#EF4444" />
              </div>
              <h3 style={{ fontSize: '22px', fontWeight: 800, color: '#0F172A', marginBottom: '8px' }}>Supprimer ce document ?</h3>
              <p style={{ color: '#64748B', fontSize: '15px', marginBottom: '24px', lineHeight: 1.5 }}>
                Le document <strong style={{color:'#0F172A'}}>"{confirmDeleteDoc.title}"</strong> sera supprimé définitivement de la bibliothèque.
              </p>
              <div style={{ display: 'flex', gap: '12px' }}>
                <button onClick={() => setConfirmDeleteDoc(null)} style={{ flex: 1, padding: '14px', background: '#F1F5F9', color: '#0F172A', borderRadius: '12px', fontWeight: 600, fontSize: '15px' }}>Annuler</button>
                <button onClick={deleteDocument} style={{ flex: 1, padding: '14px', background: '#EF4444', color: '#FFF', borderRadius: '12px', fontWeight: 600, fontSize: '15px' }}>Supprimer</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* MODALE D'AJOUT DE DOCUMENT */}
      <AnimatePresence>
        {showUploadModal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.6)', backdropFilter: 'blur(4px)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
            <motion.div initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 20 }} style={{ background: '#FFF', padding: '32px', borderRadius: '24px', maxWidth: '500px', width: '100%', boxShadow: '0 20px 50px rgba(0,0,0,0.2)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                <h3 style={{ fontSize: '22px', fontWeight: 800, color: '#0F172A' }}>Ajouter un document</h3>
                <button onClick={() => setShowUploadModal(false)} style={{ background: 'transparent', color: '#64748B' }}><X size={24} /></button>
              </div>

              <form onSubmit={handleAdminUpload} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div>
                  <label style={{ fontSize: '13px', fontWeight: 600, color: '#475569', marginBottom: '8px', display: 'block' }}>Titre du document</label>
                  <input type="text" required value={newDoc.title} onChange={(e) => setNewDoc({...newDoc, title: e.target.value})} placeholder="Ex: Cours de Droit Civil L2" style={{ width: '100%', padding: '12px', borderRadius: '12px', border: '1px solid #E2E8F0', background: '#F8FAFC', outline: 'none' }} />
                </div>

                <div style={{ display: 'flex', gap: '12px' }}>
                  <div style={{ flex: 1 }}>
                    <label style={{ fontSize: '13px', fontWeight: 600, color: '#475569', marginBottom: '8px', display: 'block' }}>Type</label>
                    <select value={newDoc.type} onChange={(e) => setNewDoc({...newDoc, type: e.target.value})} style={{ width: '100%', padding: '12px', borderRadius: '12px', border: '1px solid #E2E8F0', background: '#F8FAFC', outline: 'none' }}>
                      <option value="Cours">Cours</option>
                      <option value="Annale">Annale</option>
                      <option value="Exercice">Exercice</option>
                    </select>
                  </div>
                  <div style={{ flex: 1 }}>
                    <label style={{ fontSize: '13px', fontWeight: 600, color: '#475569', marginBottom: '8px', display: 'block' }}>Année</label>
                    <input type="text" required value={newDoc.year} onChange={(e) => setNewDoc({...newDoc, year: e.target.value})} placeholder="2024" style={{ width: '100%', padding: '12px', borderRadius: '12px', border: '1px solid #E2E8F0', background: '#F8FAFC', outline: 'none' }} />
                  </div>
                </div>

                <div>
                  <label style={{ fontSize: '13px', fontWeight: 600, color: '#475569', marginBottom: '8px', display: 'block' }}>Fichier (PDF, Image ou Vidéo)</label>
                  <div style={{ border: '2px dashed #CBD5E1', borderRadius: '12px', padding: '24px', textAlign: 'center', background: '#F8FAFC', cursor: 'pointer', position: 'relative' }}>
                    <input 
                      type="file" 
                      required 
                      accept="image/*,application/pdf,video/*" 
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          if (file.type.startsWith('image/') || file.type === 'application/pdf' || file.type.startsWith('video/')) {
                            setNewDoc({...newDoc, file});
                          } else {
                            alert("Format non supporté. Choisis une image, un PDF ou une vidéo.");
                          }
                        }
                      }} 
                      style={{ position: 'absolute', inset: 0, opacity: 0, cursor: 'pointer' }} 
                    />
                    <UploadCloud size={32} color="#94A3B8" style={{ margin: '0 auto 8px' }} />
                    <p style={{ fontSize: '14px', color: '#64748B', fontWeight: 600 }}>{newDoc.file ? newDoc.file.name : 'Clique pour choisir un fichier'}</p>
                  </div>
                </div>

                <button type="submit" disabled={uploading} style={{ padding: '16px', background: 'linear-gradient(135deg, #F59E0B, #F77F00)', color: '#FFF', borderRadius: '12px', fontWeight: 800, fontSize: '16px', marginTop: '8px', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px', opacity: uploading ? 0.7 : 1 }}>
                  {uploading ? <><Loader2 size={20} className="animate-spin" /> Upload en cours...</> : "Publier et approuver"}
                </button>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <div style={{ maxWidth: '1000px', margin: '0 auto', position: 'relative', zIndex: 1 }}>
        
        {/* HEADER */}
        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '32px', flexWrap: 'wrap', gap: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <motion.a href="/" whileHover={{ x: -5 }} style={{ color: '#F59E0B', background: 'rgba(245,158,11,0.1)', padding: '10px', borderRadius: '50%' }}><ArrowLeft size={24} /></motion.a>
            <h1 style={{ fontSize: '32px', fontWeight: 800, color: '#0F172A', letterSpacing: '-1px' }}>Espace Admin</h1>
          </div>
          
          <motion.button 
            whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
            onClick={() => setShowUploadModal(true)}
            style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '12px 20px', background: '#1E40AF', color: '#FFF', borderRadius: '12px', fontWeight: 700, fontSize: '15px', boxShadow: '0 4px 15px rgba(30,64,175,0.3)' }}
          >
            <Plus size={20} /> Ajouter un document
          </motion.button>
        </motion.div>

        {/* STATISTIQUES */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '32px' }}>
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} style={{ background: '#FFF', padding: '20px', borderRadius: '16px', border: '1px solid #E2E8F0', display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div style={{ width: '48px', height: '48px', background: '#FFFBEB', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Clock size={24} color="#D97706" /></div>
            <div>
              <p style={{ fontSize: '24px', fontWeight: 800, color: '#0F172A' }}>{stats.pending}</p>
              <p style={{ fontSize: '13px', color: '#64748B', fontWeight: 600 }}>En attente</p>
            </div>
          </motion.div>
          
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} style={{ background: '#FFF', padding: '20px', borderRadius: '16px', border: '1px solid #E2E8F0', display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div style={{ width: '48px', height: '48px', background: '#ECFDF5', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><CheckCircle size={24} color="#059669" /></div>
            <div>
              <p style={{ fontSize: '24px', fontWeight: 800, color: '#0F172A' }}>{stats.approved}</p>
              <p style={{ fontSize: '13px', color: '#64748B', fontWeight: 600 }}>Approuvés</p>
            </div>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} style={{ background: '#FFF', padding: '20px', borderRadius: '16px', border: '1px solid #E2E8F0', display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div style={{ width: '48px', height: '48px', background: '#EFF6FF', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Users size={24} color="#2563EB" /></div>
            <div>
              <p style={{ fontSize: '24px', fontWeight: 800, color: '#0F172A' }}>{stats.totalStudents}</p>
              <p style={{ fontSize: '13px', color: '#64748B', fontWeight: 600 }}>Étudiants</p>
            </div>
          </motion.div>
        </div>

        {/* ONGLETS */}
        <div style={{ display: 'flex', gap: '12px', marginBottom: '32px', borderBottom: '1px solid #E2E8F0', paddingBottom: '16px' }}>
          <button onClick={() => setActiveTab('documents')} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '12px 24px', background: activeTab === 'documents' ? '#0F172A' : 'transparent', color: activeTab === 'documents' ? '#FFF' : '#64748B', borderRadius: '12px', fontWeight: 600, fontSize: '15px', transition: 'all 0.2s' }}>
            <FileText size={18} /> Documents
          </button>
          <button onClick={() => setActiveTab('students')} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '12px 24px', background: activeTab === 'students' ? '#0F172A' : 'transparent', color: activeTab === 'students' ? '#FFF' : '#64748B', borderRadius: '12px', fontWeight: 600, fontSize: '15px', transition: 'all 0.2s' }}>
            <Users size={18} /> Étudiants
          </button>
        </div>

        {loading ? (
          <Loader text="Chargement..." />
        ) : activeTab === 'documents' ? (
          <>
            {/* FILTRES DOCUMENTS */}
            <div style={{ display: 'flex', gap: '10px', marginBottom: '24px' }}>
              {['pending', 'approved', 'rejected'].map((s) => (
                <button key={s} onClick={() => setFilter(s)} style={{ padding: '10px 18px', background: filter === s ? '#F59E0B' : '#FFF', color: filter === s ? '#FFF' : '#475569', border: '1px solid #E2E8F0', borderRadius: '10px', fontWeight: 600, fontSize: '14px', boxShadow: filter === s ? '0 4px 15px rgba(245,158,11,0.2)' : 'none' }}>
                  {s === 'pending' ? 'En attente' : s === 'approved' ? 'Approuvés' : 'Rejetés'}
                </button>
              ))}
            </div>

            {/* LISTE DES DOCUMENTS */}
            {docs.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '60px', color: '#64748B', background: '#FFF', borderRadius: '16px', border: '1px solid #E2E8F0' }}>Aucun document dans cette catégorie.</div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {docs.map((d) => (
                  <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} key={d.id} style={{ background: '#FFF', border: '1px solid #E2E8F0', borderRadius: '16px', padding: '20px', display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap', boxShadow: '0 2px 10px rgba(0,0,0,0.02)' }}>
                    <div style={{ width: '48px', height: '48px', background: 'rgba(245,158,11,0.1)', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><FileText size={24} color="#F59E0B" /></div>
                    <div style={{ flex: 1, minWidth: '200px' }}>
                      <p style={{ fontWeight: 700, color: '#0F172A', fontSize: '16px' }}>{d.title}</p>
                      <p style={{ fontSize: '13px', color: '#64748B', marginTop: '4px' }}>{d.type?.toUpperCase()} · {d.academic_year}</p>
                    </div>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button onClick={() => viewPdf(d.file_path)} style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '10px 14px', background: '#F1F5F9', color: '#0F172A', borderRadius: '8px', fontSize: '13px', fontWeight: 600 }}><Eye size={16} /> Voir</button>
                      
                      {filter === 'pending' && (
                        <>
                          <button onClick={() => approve(d.id)} style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '10px 14px', background: '#ECFDF5', color: '#059669', border: '1px solid #A7F3D0', borderRadius: '8px', fontSize: '13px', fontWeight: 600 }}><Check size={16} /> Approuver</button>
                          <button onClick={() => reject(d.id)} style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '10px 14px', background: '#FEF2F2', color: '#EF4444', border: '1px solid #FECACA', borderRadius: '8px', fontSize: '13px', fontWeight: 600 }}><X size={16} /> Rejeter</button>
                        </>
                      )}

                      {/* NOUVEAU BOUTON SUPPRIMER */}
                      <button onClick={() => setConfirmDeleteDoc(d)} style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '10px 14px', background: '#EF4444', color: '#FFF', border: 'none', borderRadius: '8px', fontSize: '13px', fontWeight: 600 }}>
                        <Trash2 size={16} /> Supprimer
                      </button>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </>
        ) : (
          /* LISTE DES ÉTUDIANTS */
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {students.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '60px', color: '#64748B', background: '#FFF', borderRadius: '16px', border: '1px solid #E2E8F0' }}>Aucun étudiant inscrit pour le moment.</div>
            ) : (
              students.map((s) => (
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} key={s.id} style={{ background: '#FFF', border: '1px solid #E2E8F0', borderRadius: '16px', padding: '20px', display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap', boxShadow: '0 2px 10px rgba(0,0,0,0.02)' }}>
                  {s.avatar_url ? (
                    <img src={s.avatar_url} alt="" style={{ width: '48px', height: '48px', borderRadius: '50%', objectFit: 'cover' }} />
                  ) : (
                    <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: '#F1F5F9', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Users size={24} color="#94A3B8" /></div>
                  )}
                  <div style={{ flex: 1, minWidth: '200px' }}>
                    <p style={{ fontWeight: 700, color: '#0F172A', fontSize: '16px' }}>{s.full_name || 'Étudiant sans nom'}</p>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '4px' }}>
                      <p style={{ fontSize: '13px', color: '#64748B', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <GraduationCap size={14} /> {s.level || 'Niveau inconnu'}
                      </p>
                      {s.school && (
                        <span style={{ fontSize: '12px', background: '#EFF6FF', color: '#1E40AF', padding: '2px 8px', borderRadius: '10px', fontWeight: 600 }}>
                          {s.school}
                        </span>
                      )}
                    </div>
                  </div>
                  <button onClick={() => setConfirmDeleteUser(s.id)} style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '10px 16px', background: '#FEF2F2', color: '#EF4444', border: '1px solid #FECACA', borderRadius: '8px', fontSize: '14px', fontWeight: 600, transition: 'all 0.2s' }}>
                    <Trash2 size={16} /> Supprimer
                  </button>
                </motion.div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
}