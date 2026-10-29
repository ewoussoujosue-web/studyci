'use client';

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '@/lib/supabase';
import { Search, Download, FileText, ArrowLeft, Eye, Bookmark, BookmarkCheck, TrendingUp, Clock, Lock, CheckCircle, Share2, Upload, MessageSquare, Send, User as UserIcon, Filter, UserCircle, MessageCircle } from 'lucide-react';
import Toast from '@/components/Toast';
import Loader from '@/components/Loader';

// --- SOUS-COMPOSANT POUR LES COMMENTAIRES ---
function CommentSection({ docId, me }: { docId: string, me: any }) {
  const [comments, setComments] = useState<any[]>([]);
  const [newComment, setNewComment] = useState('');
  const [isOpen, setIsOpen] = useState(false);

  const loadComments = async () => {
    if (!isOpen) {
      const { data } = await supabase.from('comments').select('*, profiles(full_name, avatar_url)').eq('document_id', docId).order('created_at', { ascending: true });
      setComments(data || []);
    }
    setIsOpen(!isOpen);
  };

  const postComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim() || !me) return;
    const { data, error } = await supabase.from('comments').insert({ document_id: docId, user_id: me.id, content: newComment }).select('*, profiles(full_name, avatar_url)').single();
    if (!error && data) {
      setComments([...comments, data]);
      setNewComment('');
    }
  };

  return (
    <>
      <button onClick={loadComments} style={{ background: 'transparent', padding: '12px', color: isOpen ? '#3B82F6' : '#94A3B8', display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 600 }}>
        <MessageSquare size={22} /> Commentaires
      </button>

      {isOpen && (
        <div style={{ width: '100%', background: '#F8FAFC', borderRadius: '16px', padding: '16px', borderTop: '1px solid #E2E8F0', marginTop: '8px' }}>
          <div style={{ maxHeight: '250px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '16px' }}>
            {comments.length === 0 ? (
              <p style={{ fontSize: '13px', color: '#94A3B8', fontStyle: 'italic' }}>Aucun commentaire. Sois le premier à réagir !</p>
            ) : (
              comments.map(c => (
                <div key={c.id} style={{ display: 'flex', gap: '10px' }}>
                  {c.profiles?.avatar_url ? <img src={c.profiles.avatar_url} style={{ width: '32px', height: '32px', borderRadius: '50%', objectFit: 'cover' }} /> : <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: '#E2E8F0', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><UserIcon size={16} color="#64748B" /></div>}
                  <div style={{ background: '#FFF', padding: '10px 14px', borderRadius: '4px 16px 16px 16px', border: '1px solid #E2E8F0', flex: 1 }}>
                    <p style={{ fontSize: '12px', fontWeight: 700, color: '#475569', marginBottom: '2px' }}>{c.profiles?.full_name || 'Étudiant'}</p>
                    <p style={{ fontSize: '14px', color: '#0F172A' }}>{c.content}</p>
                  </div>
                </div>
              ))
            )}
          </div>
          <form onSubmit={postComment} style={{ display: 'flex', gap: '8px' }}>
            <input value={newComment} onChange={e => setNewComment(e.target.value)} placeholder="Ajouter un commentaire..." style={{ flex: 1, padding: '12px 16px', borderRadius: '24px', border: '1px solid #E2E8F0', fontSize: '14px', color: '#0F172A' }} />
            <button type="submit" style={{ background: '#3B82F6', color: '#FFF', padding: '12px 16px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Send size={18} /></button>
          </form>
        </div>
      )}
    </>
  );
}

// --- PAGE PRINCIPALE ---
export default function SearchPage() {
  const [docs, setDocs] = useState<any[]>([]);
  const [favorites, setFavorites] = useState<string[]>([]);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [sortBy, setSortBy] = useState<'recent' | 'popular'>('popular');
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error'; show: boolean }>({ msg: '', type: 'success', show: false });
  
  const [uploadCount, setUploadCount] = useState(0);
  const [isAdmin, setIsAdmin] = useState(false);
  const [me, setMe] = useState<any>(null);

  // ÉTATS POUR LES FILTRES
  const [showFilters, setShowFilters] = useState(false);
  const [filterLevel, setFilterLevel] = useState('');
  const [filterYear, setFilterYear] = useState('');
  const [filterType, setFilterType] = useState('');

  // ÉTATS POUR LA RECHERCHE GLOBALE
  const [globalStudents, setGlobalStudents] = useState<any[]>([]);
  const [globalPosts, setGlobalPosts] = useState<any[]>([]);

  useEffect(() => {
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { setTimeout(() => { window.location.href = '/inscription'; }, 1000); return; }

      setMe(session.user);
      const user = session.user;
      
      let orderCol = sortBy === 'popular' ? 'download_count' : 'created_at';
      
      const { data } = await supabase
        .from('documents')
        .select('*, profiles:uploader_id(full_name, avatar_url)')
        .eq('status', 'approved')
        .order(orderCol, { ascending: false });
        
      setDocs(data || []);

      const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single();
      if (profile?.role === 'admin') setIsAdmin(true);

      const { data: favData } = await supabase.from('favorites').select('document_id').eq('user_id', user.id);
      if (favData) setFavorites(favData.map(f => f.document_id));

      const { count } = await supabase.from('documents').select('*', { count: 'exact', head: true }).eq('uploader_id', user.id);
      setUploadCount(count || 0);

      setLoading(false);
    })();
  }, [sortBy]);

  // --- RECHERCHE GLOBALE EN TEMPS RÉEL ---
  useEffect(() => {
    // Dès qu'il y a 1 lettre, on cherche.
    if (query.length === 0) {
      setGlobalStudents([]);
      setGlobalPosts([]);
      return;
    }

    const timer = setTimeout(async () => {
      // 1. Recherche des étudiants
      const { data: students } = await supabase
        .from('profiles')
        .select('id, full_name, avatar_url, level, school')
        .ilike('full_name', `%${query}%`)
        .limit(4);
      setGlobalStudents(students || []);

      // 2. Recherche des posts
      const { data: posts } = await supabase
        .from('posts')
        .select('*, profiles(full_name)')
        .ilike('content', `%${query}%`)
        .limit(4);
      setGlobalPosts(posts || []);
      
    }, 300); // Un petit délai de 300ms pour laisser le temps de taper

    return () => clearTimeout(timer);
  }, [query]);

  const toggleFavorite = async (docId: string) => {
    if (!me) return;
    if (favorites.includes(docId)) {
      await supabase.from('favorites').delete().eq('user_id', me.id).eq('document_id', docId);
      setFavorites(favorites.filter(id => id !== docId));
      setToast({ msg: 'Retiré des favoris', type: 'success', show: true });
    } else {
      await supabase.from('favorites').insert({ user_id: me.id, document_id: docId });
      setFavorites([...favorites, docId]);
      setToast({ msg: 'Ajouté aux favoris !', type: 'success', show: true });
    }
    setTimeout(() => setToast(t => ({ ...t, show: false })), 2000);
  };

  const download = async (doc: any) => {
    if (!isAdmin && uploadCount < 5) {
      setToast({ msg: "Tu dois uploader 5 documents pour débloquer les téléchargements !", type: 'error', show: true });
      setTimeout(() => setToast(t => ({ ...t, show: false })), 4000);
      return;
    }
    const { data, error } = await supabase.storage.from('documents').createSignedUrl(doc.file_path, 60, { download: true });
    if (error || !data) { alert('Erreur de téléchargement'); return; }
    await supabase.from('documents').update({ download_count: (doc.download_count || 0) + 1 }).eq('id', doc.id);
    window.open(data.signedUrl, '_blank');
  };

  const shareDoc = async (doc: any) => {
    const shareUrl = `${window.location.origin}/view-pdf?path=${encodeURIComponent(doc.file_path)}&title=${encodeURIComponent(doc.title)}`;
    if (navigator.share) {
      try { await navigator.share({ title: doc.title, text: `Regarde cette annale sur StudyCI`, url: shareUrl }); } catch (err) {}
    } else {
      await navigator.clipboard.writeText(shareUrl);
      setToast({ msg: 'Lien copié dans le presse-papiers !', type: 'success', show: true });
      setTimeout(() => setToast(t => ({ ...t, show: false })), 3000);
    }
  };

  // FILTRAGE DES DOCUMENTS
  const filteredDocs = docs.filter(d => {
    const matchesQuery = d.title.toLowerCase().includes(query.toLowerCase());
    const docYear = d.academic_year ? d.academic_year.toString() : '';
    const matchesLevel = filterLevel ? docYear.includes(filterLevel) || d.level?.includes(filterLevel) : true;
    const matchesYear = filterYear ? docYear.includes(filterYear) : true;
    const matchesType = filterType ? d.type?.toLowerCase() === filterType.toLowerCase() : true;
    
    return matchesQuery && matchesLevel && matchesYear && matchesType;
  });

  const progressPercent = Math.min((uploadCount / 5) * 100, 100);
  const isLocked = !isAdmin && uploadCount < 5;
  
  // On passe en mode "Recherche Globale" dès la 1ère lettre tapée
  const isGlobalSearch = query.length > 0;

  if (loading) return <Loader text="Chargement de la bibliothèque..." />;

  return (
    <div style={{ minHeight: '100vh', position: 'relative', overflow: 'hidden' }}>
      <div className="bg-shape" style={{ width: '400px', height: '400px', background: '#3B82F6', top: '-10%', right: '-10%' }} />
      <div className="bg-shape" style={{ width: '300px', height: '300px', background: '#FBBF24', bottom: '10%', left: '-5%', animationDelay: '-7s' }} />

      <Toast message={toast.msg} type={toast.type} show={toast.show} />
      
      <div style={{ maxWidth: '900px', margin: '0 auto', padding: '40px 24px 60px', position: 'relative', zIndex: 1 }}>
        
        <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '24px' }}>
          <motion.a href="/" whileHover={{ x: -5 }} style={{ color: '#F59E0B', background: 'rgba(245,158,11,0.1)', padding: '10px', borderRadius: '50%' }}><ArrowLeft size={24} /></motion.a>
          <h1 style={{ fontSize: '36px', fontWeight: 800, color: '#0F172A', letterSpacing: '-1px' }}>BIBLIOTHEQUE</h1>
        </motion.div>

        <div style={{ display: 'flex', gap: '16px', marginBottom: '32px', flexWrap: 'wrap' }}>
          <div style={{ position: 'relative', flex: 1, minWidth: '300px' }}>
            <Search size={22} color="#F59E0B" style={{ position: 'absolute', left: '20px', top: '50%', transform: 'translateY(-50%)' }} />
            <input 
              value={query} 
              onChange={(e) => setQuery(e.target.value)} 
              placeholder="Rechercher un cours, un étudiant, une discussion..." 
              className="glass-card" 
              style={{ width: '100%', padding: '18px 20px 18px 56px', borderRadius: '16px', color: '#0F172A', fontSize: '16px' }} 
            />
          </div>
          
          {!isGlobalSearch && (
            <button onClick={() => setShowFilters(!showFilters)} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '0 20px', background: showFilters ? '#F59E0B' : '#FFFFFF', color: showFilters ? '#FFF' : '#64748B', border: '1px solid #E2E8F0', borderRadius: '16px', fontWeight: 700, fontSize: '15px', height: '58px' }}>
              <Filter size={20} /> Filtres
            </button>
          )}
        </div>

        {/* --- SI ON EST EN MODE RECHERCHE GLOBALE --- */}
        {isGlobalSearch ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
            
            {/* SECTION ÉTUDIANTS */}
            {globalStudents.length > 0 && (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
                <h2 style={{ fontSize: '20px', fontWeight: 800, color: '#0F172A', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <UserCircle size={24} color="#3B82F6" /> Étudiants
                </h2>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: '16px' }}>
                  {globalStudents.map(s => (
                    <a key={s.id} href={`/profile/${s.id}`} className="glass-card" style={{ padding: '16px', borderRadius: '16px', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '16px' }}>
                      {s.avatar_url ? <img src={s.avatar_url} style={{ width: '48px', height: '48px', borderRadius: '50%' }} /> : <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: '#E2E8F0', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><UserIcon size={24} color="#94A3B8" /></div>}
                      <div>
                        <p style={{ fontSize: '16px', fontWeight: 700, color: '#0F172A' }}>{s.full_name}</p>
                        <p style={{ fontSize: '13px', color: '#64748B' }}>{s.level} {s.school ? `· ${s.school}` : ''}</p>
                      </div>
                    </a>
                  ))}
                </div>
              </motion.div>
            )}

            {/* SECTION DOCUMENTS */}
            {filteredDocs.length > 0 && (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
                <h2 style={{ fontSize: '20px', fontWeight: 800, color: '#0F172A', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <FileText size={24} color="#F59E0B" /> Documents trouvés
                </h2>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  {filteredDocs.map((d) => (
                    <div key={d.id} className="glass-card" style={{ borderRadius: '20px', padding: '24px', display: 'flex', alignItems: 'center', gap: '20px', flexWrap: 'wrap' }}>
                       <div style={{ width: '60px', height: '60px', background: 'rgba(245,158,11,0.1)', borderRadius: '16px', border: '1px solid rgba(245,158,11,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
                        {d.file_path?.toLowerCase().match(/\.(jpg|jpeg|png|webp|gif)$/i) ? (
                          <img src={supabase.storage.from('documents').getPublicUrl(d.file_path).data.publicUrl} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        ) : <FileText size={32} color="#F59E0B" />}
                      </div>
                      <div style={{ flex: 1 }}>
                        <p style={{ fontWeight: 700, fontSize: '18px', color: '#0F172A' }}>{d.title}</p>
                        <p style={{ fontSize: '13px', color: '#64748B' }}>Par {d.profiles?.full_name || 'Un étudiant'} · {d.academic_year}</p>
                      </div>
                      <motion.a href={`/view-pdf?path=${encodeURIComponent(d.file_path)}&title=${encodeURIComponent(d.title)}`} whileHover={{ scale: 1.05 }} style={{ padding: '12px 20px', background: '#1E40AF', color: '#FFF', borderRadius: '12px', textDecoration: 'none', fontWeight: 700 }}>Lire</motion.a>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}

            {/* SECTION POSTS */}
            {globalPosts.length > 0 && (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
                <h2 style={{ fontSize: '20px', fontWeight: 800, color: '#0F172A', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <MessageCircle size={24} color="#8B5CF6" /> Discussions
                </h2>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  {globalPosts.map(p => (
                    <a key={p.id} href="/" className="glass-card" style={{ padding: '20px', borderRadius: '16px', textDecoration: 'none' }}>
                      <p style={{ fontSize: '15px', color: '#334155', fontStyle: 'italic' }}>"{p.content}"</p>
                      <p style={{ fontSize: '13px', color: '#64748B', marginTop: '8px', fontWeight: 600 }}>— {p.profiles?.full_name}</p>
                    </a>
                  ))}
                </div>
              </motion.div>
            )}

            {globalStudents.length === 0 && filteredDocs.length === 0 && globalPosts.length === 0 && (
              <div style={{ textAlign: 'center', padding: '60px 20px', color: '#64748B' }}>
                <Search size={48} style={{ margin: '0 auto 16px', opacity: 0.5 }} />
                <h3 style={{ fontSize: '20px', color: '#0F172A', marginBottom: '8px' }}>Aucun résultat pour "{query}"</h3>
                <p>Essaie avec d'autres mots-clés.</p>
              </div>
            )}

          </div>
        ) : (
          /* --- SI ON EST EN MODE BIBLIOTHÈQUE NORMALE (SANS RECHERCHE) --- */
          <>
            {isLocked && (
              <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} style={{ background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: '16px', padding: '20px', marginBottom: '24px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                  <Lock size={24} color="#EF4444" />
                  <div>
                    <h3 style={{ color: '#991B1B', fontWeight: 700, fontSize: '16px' }}>Téléchargements bloqués</h3>
                    <p style={{ color: '#B91C1C', fontSize: '14px' }}>Partage 5 documents pour débloquer les téléchargements.</p>
                  </div>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', color: '#B91C1C', marginBottom: '6px', fontWeight: 600 }}><span>Progression</span><span>{uploadCount} / 5</span></div>
                <div style={{ height: '8px', background: '#FECACA', borderRadius: '4px', overflow: 'hidden' }}><motion.div initial={{ width: 0 }} animate={{ width: `${progressPercent}%` }} style={{ height: '100%', background: '#EF4444' }} /></div>
              </motion.div>
            )}

            {!isLocked && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ background: '#ECFDF5', border: '1px solid #A7F3D0', borderRadius: '16px', padding: '16px 20px', marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '12px' }}>
                <CheckCircle size={24} color="#059669" />
                <p style={{ color: '#065F46', fontWeight: 600, fontSize: '15px' }}>Téléchargements débloqués !</p>
              </motion.div>
            )}

            <div style={{ display: 'flex', gap: '8px', marginBottom: '24px', justifyContent: 'flex-end' }}>
              <div style={{ display: 'flex', gap: '8px', background: '#FFFFFF', padding: '6px', borderRadius: '16px', border: '1px solid #E2E8F0', height: '50px', boxSizing: 'border-box' }}>
                <button onClick={() => setSortBy('popular')} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '0 20px', background: sortBy === 'popular' ? '#F59E0B' : 'transparent', color: sortBy === 'popular' ? '#FFFFFF' : '#64748B', borderRadius: '12px', fontWeight: 700, fontSize: '14px' }}><TrendingUp size={18} /> Populaires</button>
                <button onClick={() => setSortBy('recent')} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '0 20px', background: sortBy === 'recent' ? '#F59E0B' : 'transparent', color: sortBy === 'recent' ? '#FFFFFF' : '#64748B', borderRadius: '12px', fontWeight: 700, fontSize: '14px' }}><Clock size={18} /> Récents</button>
              </div>
            </div>

            <AnimatePresence>
              {showFilters && (
                <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} style={{ overflow: 'hidden' }}>
                  <div style={{ background: '#FFF', padding: '20px', borderRadius: '16px', border: '1px solid #E2E8F0', marginBottom: '24px', display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
                    <div style={{ flex: 1, minWidth: '150px' }}>
                      <label style={{ fontSize: '13px', fontWeight: 700, color: '#475569', marginBottom: '8px', display: 'block' }}>Niveau</label>
                      <select value={filterLevel} onChange={(e) => setFilterLevel(e.target.value)} style={{ width: '100%', padding: '12px', borderRadius: '12px', border: '1px solid #E2E8F0', background: '#F8FAFC', color: '#0F172A', fontWeight: 600 }}>
                        <option value="">Tous les niveaux</option>
                        <option value="L1">Licence 1</option>
                        <option value="L2">Licence 2</option>
                        <option value="L3">Licence 3</option>
                        <option value="M1">Master 1</option>
                        <option value="M2">Master 2</option>
                      </select>
                    </div>
                    <div style={{ flex: 1, minWidth: '150px' }}>
                      <label style={{ fontSize: '13px', fontWeight: 700, color: '#475569', marginBottom: '8px', display: 'block' }}>Année</label>
                      <select value={filterYear} onChange={(e) => setFilterYear(e.target.value)} style={{ width: '100%', padding: '12px', borderRadius: '12px', border: '1px solid #E2E8F0', background: '#F8FAFC', color: '#0F172A', fontWeight: 600 }}>
                        <option value="">Toutes les années</option>
                        <option value="2024">2024</option>
                        <option value="2023">2023</option>
                        <option value="2022">2022</option>
                        <option value="2021">2021</option>
                      </select>
                    </div>
                    <div style={{ flex: 1, minWidth: '150px' }}>
                      <label style={{ fontSize: '13px', fontWeight: 700, color: '#475569', marginBottom: '8px', display: 'block' }}>Type</label>
                      <select value={filterType} onChange={(e) => setFilterType(e.target.value)} style={{ width: '100%', padding: '12px', borderRadius: '12px', border: '1px solid #E2E8F0', background: '#F8FAFC', color: '#0F172A', fontWeight: 600 }}>
                        <option value="">Tous les types</option>
                        <option value="cours">Cours</option>
                        <option value="annale">Annale</option>
                        <option value="exercice">Exercice</option>
                      </select>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'flex-end', marginLeft: 'auto' }}>
                      <button onClick={() => { setFilterLevel(''); setFilterYear(''); setFilterType(''); }} style={{ padding: '12px 20px', background: '#FEF2F2', color: '#EF4444', borderRadius: '12px', fontWeight: 700, fontSize: '14px' }}>Réinitialiser</button>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {filteredDocs.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '80px 20px' }}><div style={{ fontSize: '64px', marginBottom: '16px' }}>📂</div><h3 style={{ fontSize: '20px', color: '#0F172A', marginBottom: '8px' }}>Aucun document trouvé</h3></div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <AnimatePresence>
                  {filteredDocs.map((d, i) => (
                    <motion.div key={d.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }} whileHover={{ scale: 1.01, borderColor: 'rgba(245,158,11,0.5)' }} className="glass-card" style={{ borderRadius: '20px', padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '20px', flexWrap: 'wrap' }}>
                        <div style={{ width: '60px', height: '60px', background: 'rgba(245,158,11,0.1)', borderRadius: '16px', border: '1px solid rgba(245,158,11,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
                          {d.file_path?.toLowerCase().match(/\.(jpg|jpeg|png|webp|gif)$/i) ? (
                            <img src={supabase.storage.from('documents').getPublicUrl(d.file_path).data.publicUrl} alt="Aperçu" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                          ) : <FileText size={32} color="#F59E0B" />}
                        </div>
                        <div style={{ flex: 1, minWidth: '250px' }}>
                          <p style={{ fontWeight: 700, fontSize: '18px', color: '#0F172A', marginBottom: '6px' }}>{d.title}</p>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                            {d.profiles?.avatar_url ? <img src={d.profiles.avatar_url} style={{ width: '20px', height: '20px', borderRadius: '50%' }} /> : <div style={{ width: '20px', height: '20px', borderRadius: '50%', background: '#E2E8F0' }} />}
                            <span style={{ fontSize: '13px', color: '#64748B', fontWeight: 500 }}>Partagé par <strong style={{ color: '#334155' }}>{d.profiles?.full_name || 'Un étudiant'}</strong></span>
                          </div>
                          <div style={{ display: 'flex', gap: '12px', alignItems: 'center', fontSize: '13px', color: '#64748B' }}>
                            <span style={{ background: '#F1F5F9', padding: '4px 10px', borderRadius: '8px', color: '#334155', fontWeight: 600 }}>{d.type?.toUpperCase()}</span>
                            <span>{d.academic_year || '—'}</span>
                            <span style={{ color: '#F59E0B', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '4px' }}><Download size={14} /> {d.download_count || 0}</span>
                          </div>
                        </div>
                        <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
                          <button onClick={() => toggleFavorite(d.id)} style={{ background: 'transparent', padding: '12px', color: favorites.includes(d.id) ? '#F59E0B' : '#94A3B8' }}>{favorites.includes(d.id) ? <BookmarkCheck size={26} /> : <Bookmark size={26} />}</button>
                          <CommentSection docId={d.id} me={me} />
                          <motion.a href={`/view-pdf?path=${encodeURIComponent(d.file_path)}&title=${encodeURIComponent(d.title)}`} whileHover={{ scale: 1.05 }} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '12px 20px', background: '#F8FAFC', color: '#0F172A', border: '1px solid #E2E8F0', borderRadius: '12px', fontSize: '15px', fontWeight: 700 }}><Eye size={18} /> Lire</motion.a>
                          <motion.button onClick={() => shareDoc(d)} whileHover={{ scale: 1.05 }} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '12px 20px', background: '#F8FAFC', color: '#0F172A', border: '1px solid #E2E8F0', borderRadius: '12px', fontSize: '15px', fontWeight: 700 }}><Share2 size={18} /> Partager</motion.button>
                          {isLocked ? (
                            <motion.a href="/upload" whileHover={{ scale: 1.05 }} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '12px 20px', background: '#F59E0B', color: '#FFFFFF', borderRadius: '12px', fontSize: '15px', fontWeight: 800, boxShadow: '0 4px 15px rgba(245,158,11,0.3)' }}><Upload size={18} /> Uploader pour débloquer</motion.a>
                          ) : (
                            <motion.button onClick={() => download(d)} whileHover={{ scale: 1.05 }} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '12px 20px', background: '#1E40AF', color: '#FFF', borderRadius: '12px', fontSize: '15px', fontWeight: 700, boxShadow: '0 4px 15px rgba(30,64,175,0.2)' }}><Download size={18} /> Télécharger</motion.button>
                          )}
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}