'use client';

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '@/lib/supabase';
import { MessageSquare, Heart, User, Sparkles, Users, Search, Calendar, FileText, Home, LogOut, Trash2, Send, CheckCircle, XCircle, ShieldCheck, Lock, Mail, Download, TrendingUp } from 'lucide-react';
import Loader from '@/components/Loader';
import NotificationBell from '@/components/NotificationBell';
import Toast from '@/components/Toast';
import TextEditor from '@/components/TextEditor';
import StoriesBar from '@/components/StoriesBar';

export default function FeedPage() {
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [posts, setPosts] = useState<any[]>([]);
  const [likes, setLikes] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  
  // ⚡ TIMER UNIQUE POUR LES POSTS
  const [timeTick, setTimeTick] = useState(0);
  
  // ⚡ ÉTATS POUR L'ADMIN
  const [isAdmin, setIsAdmin] = useState(false);
  const [showAdminLogin, setShowAdminLogin] = useState(false);
  const [showAdminPanel, setShowAdminPanel] = useState(false);
  
  const [adminEmail, setAdminEmail] = useState('');
  const [adminPassword, setAdminPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  const [pendingDocs, setPendingDocs] = useState<any[]>([]);
  const [adminUsers, setAdminUsers] = useState<any[]>([]);
  const [adminTab, setAdminTab] = useState<'docs' | 'users'>('docs');
  const [searchQuery, setSearchQuery] = useState('');
  
  // ⚡ STATS ADMIN
  const [totalDocs, setTotalDocs] = useState(0);
  const [totalDownloads, setTotalDownloads] = useState(0);
  
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error'; show: boolean }>({ msg: '', type: 'success', show: false });

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const showToast = (msg: string, type: 'success' | 'error') => {
    setToast({ msg, type, show: true });
    setTimeout(() => setToast(t => ({ ...t, show: false })), 3000);
  };

  const loadFeed = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setLoading(false);
        return;
      }

      setUser(session.user);
      const { data: prof } = await supabase.from('profiles').select('*').eq('id', session.user.id).single();
      setProfile(prof);

      if (prof?.role === 'admin') {
        setIsAdmin(true);
        fetchAdminData();
      } else {
        setIsAdmin(false);
      }

      const { data: postsData } = await supabase
        .from('posts')
        .select('*, profiles(full_name, avatar_url, level), post_likes(user_id), post_comments(*, profiles(full_name, avatar_url))')
        .order('created_at', { ascending: false });
      setPosts(postsData || []);

      const { data: myLikes } = await supabase.from('post_likes').select('post_id').eq('user_id', session.user.id);
      if (myLikes) setLikes(myLikes.map(l => l.post_id));
      
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchAdminData = async () => {
    const { data: docs } = await supabase.from('documents').select('*, profiles:uploader_id(full_name, email)').eq('status', 'pending').order('created_at', { ascending: true });
    if (docs) setPendingDocs(docs);

    const { data: usersData } = await supabase.from('profiles').select('*').order('created_at', { ascending: false });
    if (usersData) setAdminUsers(usersData);

    const { count: docsCount } = await supabase.from('documents').select('*', { count: 'exact', head: true }).eq('status', 'approved');
    setTotalDocs(docsCount || 0);

    const { data: downloadsData } = await supabase.from('documents').select('download_count');
    if (downloadsData) {
      const total = downloadsData.reduce((acc, curr) => acc + (curr.download_count || 0), 0);
      setTotalDownloads(total);
    }
  };

  useEffect(() => {
    loadFeed();
  }, []);

  // ⚡ TIMER : Mise à jour statut en ligne
  useEffect(() => {
    if (!user) return;
    
    supabase.from('profiles').update({ last_seen: new Date().toISOString() }).eq('id', user.id);

    const interval = setInterval(async () => {
      await supabase.from('profiles').update({ last_seen: new Date().toISOString() }).eq('id', user.id);
    }, 30000);

    return () => clearInterval(interval);
  }, [user]);

  // ⚡ LE MINUTEUR UNIQUE POUR LE TEMPS DES POSTS
  useEffect(() => {
    const interval = setInterval(() => {
      setTimeTick(t => t + 1);
    }, 60000); // Toutes les 60 secondes
    return () => clearInterval(interval);
  }, []);

  // ⚡ LOGIQUE DE CONNEXION ADMIN
  const handleAdminLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError('');
    setIsLoggingIn(true);

    const { error } = await supabase.auth.signInWithPassword({ email: adminEmail, password: adminPassword });

    if (error) {
      setLoginError("Email ou mot de passe incorrect.");
      setIsLoggingIn(false);
      return;
    }

    const { data: { session } } = await supabase.auth.getSession();
    const { data: profile } = await supabase.from('profiles').select('role').eq('id', session?.user.id).single();

    if (profile?.role !== 'admin') {
      setLoginError("Ce compte n'a pas les droits d'administrateur.");
      await supabase.auth.signOut();
      setIsLoggingIn(false);
      return;
    }

    setUser(session?.user);
    setProfile(profile);
    setIsAdmin(true);
    setShowAdminLogin(false);
    setShowAdminPanel(true);
    fetchAdminData();
    loadFeed();
    setIsLoggingIn(false);
  };

  // ⚡ FONCTIONS ADMIN
  const handleApproveDoc = async (docId: string, uploaderId: string) => {
    await supabase.from('documents').update({ status: 'approved' }).eq('id', docId);
    await supabase.from('notifications').insert({ user_id: uploaderId, title: 'Document approuvé ✅', message: "Ton document a été validé.", type: 'doc_approved' });
    fetchAdminData();
    showToast('Document approuvé', 'success');
  };

  const handleRejectDoc = async (docId: string, uploaderId: string) => {
    if (!confirm("Rejeter ce document ?")) return;
    await supabase.from('documents').update({ status: 'rejected' }).eq('id', docId);
    await supabase.from('notifications').insert({ user_id: uploaderId, title: 'Document rejeté ❌', message: "Ton document a été rejeté.", type: 'doc_rejected' });
    fetchAdminData();
    showToast('Document rejeté', 'error');
  };

  const handleDeleteUser = async (userId: string) => {
    if (!confirm("Supprimer cet utilisateur ? Toutes ses données seront perdues.")) return;
    await supabase.from('profiles').delete().eq('id', userId);
    fetchAdminData();
    showToast('Utilisateur supprimé', 'success');
  };

  // ⚡ FONCTIONS POSTS
  const createPost = async (content: string, file: File | null, theme: any) => {
    if ((!content.trim() && !file) || !user) return;
    setUploading(true);
    let fileUrl = null;
    let fileType = null;

    try {
      if (file) {
        fileType = file.type;
        const fileExt = file.name.split('.').pop();
        const path = `${user.id}/posts/${Date.now()}.${fileExt}`;
        const bucketName = fileType.startsWith('image/') ? 'avatars' : 'documents';
        
        const { error: uploadError } = await supabase.storage.from(bucketName).upload(path, file);
        if (uploadError) throw uploadError;

        const { data: publicUrlData } = supabase.storage.from(bucketName).getPublicUrl(path);
        fileUrl = publicUrlData.publicUrl;
      }

      const { error } = await supabase.from('posts').insert({ 
        user_id: user.id, 
        content: content.trim(),
        file_url: fileUrl,
        file_type: fileType,
        theme: theme.id
      });

      if (!error) {
        showToast('Publication réussie !', 'success');
        loadFeed();
      }
    } catch (err: any) {
      showToast("Erreur : " + err.message, 'error');
    } finally {
      setUploading(false);
    }
  };

  const deletePost = async (postId: string) => {
    if (!confirm("Veux-tu vraiment supprimer cette publication ?")) return;
    try {
      const { error, count } = await supabase.from('posts').delete({ count: 'exact' }).eq('id', postId);
      if (error) throw error;
      if (count === 0) {
        showToast("Erreur : Tu n'as pas la permission.", 'error');
        return;
      }
      setPosts(posts.filter(p => p.id !== postId));
      showToast('Publication supprimée', 'success');
    } catch (err: any) {
      showToast("Erreur : " + err.message, 'error');
    }
  };

  const toggleLike = async (post: any) => {
    if (!user) return;
    const isLiked = likes.includes(post.id);

    if (isLiked) {
      await supabase.from('post_likes').delete().eq('user_id', user.id).eq('post_id', post.id);
      setLikes(likes.filter(id => id !== post.id));
    } else {
      await supabase.from('post_likes').insert({ user_id: user.id, post_id: post.id });
      setLikes([...likes, post.id]);

      if (post.user_id !== user.id) {
        await supabase.from('notifications').insert({
          user_id: post.user_id,
          title: "Nouveau like ❤️",
          message: `${profile.full_name} a aimé votre publication.`,
          type: 'like'
        });
      }
    }
  };

  const logout = async () => {
    if (user) {
      await supabase.from('profiles').update({ last_seen: new Date().toISOString() }).eq('id', user.id);
    }
    await supabase.auth.signOut();
    window.location.href = '/';
  };

  if (loading) return <Loader text="Chargement de StudyCI..." />;

  // --- ÉCRAN DE CONNEXION ADMIN ---
  if (showAdminLogin) {
    return (
      <div style={{ minHeight: '100vh', background: '#0F172A', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
        <div style={{ background: '#FFF', borderRadius: '24px', padding: '40px', width: '100%', maxWidth: '400px', boxShadow: '0 20px 40px rgba(0,0,0,0.2)' }}>
          
          <div style={{ textAlign: 'center', marginBottom: '32px' }}>
            <div style={{ width: '64px', height: '64px', background: '#FEF2F2', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
              <ShieldCheck size={32} color="#EF4444" />
            </div>
            <h1 style={{ fontSize: '24px', fontWeight: 900, color: '#0F172A' }}>Accès Restreint</h1>
            <p style={{ color: '#64748B', fontSize: '14px' }}>Espace réservé à l'administration.</p>
          </div>

          {loginError && (
            <div style={{ background: '#FEF2F2', color: '#EF4444', padding: '12px', borderRadius: '8px', fontSize: '13px', fontWeight: 600, marginBottom: '16px', textAlign: 'center' }}>
              {loginError}
            </div>
          )}

          <form onSubmit={handleAdminLogin} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div>
              <label style={{ fontSize: '13px', fontWeight: 700, color: '#334155', marginBottom: '6px', display: 'block' }}>Email Admin</label>
              <div style={{ position: 'relative' }}>
                <Mail size={18} color="#94A3B8" style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)' }} />
                <input type="email" value={adminEmail} onChange={(e) => setAdminEmail(e.target.value)} required placeholder="admin@study.ci" style={{ width: '100%', padding: '14px 14px 14px 42px', borderRadius: '12px', border: '1px solid #E2E8F0', background: '#F8FAFC', outline: 'none' }} />
              </div>
            </div>

            <div>
              <label style={{ fontSize: '13px', fontWeight: 700, color: '#334155', marginBottom: '6px', display: 'block' }}>Mot de passe</label>
              <div style={{ position: 'relative' }}>
                <Lock size={18} color="#94A3B8" style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)' }} />
                <input type="password" value={adminPassword} onChange={(e) => setAdminPassword(e.target.value)} required placeholder="••••••••" style={{ width: '100%', padding: '14px 14px 14px 42px', borderRadius: '12px', border: '1px solid #E2E8F0', background: '#F8FAFC', outline: 'none' }} />
              </div>
            </div>

            <button type="submit" disabled={isLoggingIn} style={{ marginTop: '8px', width: '100%', padding: '16px', background: '#EF4444', color: '#FFF', fontWeight: 800, fontSize: '16px', borderRadius: '12px', border: 'none', cursor: 'pointer', opacity: isLoggingIn ? 0.7 : 1 }}>
              {isLoggingIn ? 'Connexion...' : 'Se connecter'}
            </button>
          </form>

          <button onClick={() => { setShowAdminLogin(false); setLoginError(''); }} style={{ width: '100%', marginTop: '24px', background: 'transparent', border: 'none', color: '#64748B', fontSize: '14px', fontWeight: 600, cursor: 'pointer' }}>
            Retour à l'accueil
          </button>
        </div>
      </div>
    );
  }

  // --- LANDING PAGE (Non connecté) ---
  if (!user) {
    return (
      <div style={{ 
        minHeight: '100vh', position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'flex-start', padding: '24px', overflow: 'hidden' 
      }}>
        <motion.div initial={{ scale: 1.05 }} animate={{ scale: 1 }} transition={{ duration: 15, ease: "easeOut" }}
          style={{ position: 'absolute', inset: 0, backgroundImage: 'url(/background.jpg)', backgroundSize: 'cover', backgroundPosition: 'center right', zIndex: 0 }} />
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to right, rgba(15,23,42,0.9) 0%, rgba(15,23,42,0.6) 45%, rgba(15,23,42,0) 100%)', zIndex: 1 }} />
        
        <div style={{ position: 'relative', zIndex: 3, maxWidth: '650px', textAlign: 'left' }}>
          <motion.h1 initial={{ opacity: 0, x: -30 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.8, delay: 0.2, ease: "easeOut" }}
            style={{ fontSize: '60px', fontWeight: 900, color: '#FFFFFF', marginBottom: '16px', letterSpacing: '-3px', textShadow: '0 10px 30px rgba(0,0,0,0.5)' }}>
            Study<span style={{ color: '#FBBF24' }}>CI</span>
          </motion.h1>

          <motion.div initial="hidden" animate="visible" variants={{ hidden: { opacity: 0 }, visible: { opacity: 1, transition: { staggerChildren: 0.1, delayChildren: 0.6 } } }}
            style={{ marginBottom: '32px', display: 'flex', flexWrap: 'wrap', gap: '12px' }}>
            {["Ouvre,", "révise", "et", "réussis", "avec", "la", "communauté."].map((word, index) => (
              <motion.span key={index} variants={{ hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0 } }}
                style={{ fontSize: '24px', color: '#F8FAFC', fontWeight: 500, textShadow: '0 2px 10px rgba(0,0,0,0.8)' }}>
                {word}
              </motion.span>
            ))}
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 1.2, type: "spring", stiffness: 200 }} style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
            <motion.a href="/inscription" animate={{ boxShadow: ["0 0 0 0 rgba(245, 158, 11, 0.7)", "0 0 0 20px rgba(245, 158, 11, 0)"] }} transition={{ duration: 2, repeat: Infinity, ease: "easeOut" }} whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
              style={{ display: 'inline-block', padding: '16px 40px', background: 'linear-gradient(135deg, #F77F00, #FBBF24)', color: '#FFFFFF', fontSize: '18px', fontWeight: 800, borderRadius: '50px', textDecoration: 'none' }}>
              Commencer l'aventure
            </motion.a>

            <button onClick={() => setShowAdminLogin(true)} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '16px 24px', background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.3)', color: '#FFF', fontSize: '16px', fontWeight: 600, borderRadius: '50px', cursor: 'pointer', backdropFilter: 'blur(10px)' }}>
              <ShieldCheck size={20} /> Espace Admin
            </button>
          </motion.div>
        </div>
      </div>
    );
  }

  // --- INTERFACE ADMIN CONNECTÉE OU UTILISATEUR NORMAL ---
  const filteredUsers = adminUsers.filter(u => u.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) || u.email?.toLowerCase().includes(searchQuery.toLowerCase()));

  return (
    <div style={{ minHeight: '100vh', background: '#F8FAFC', display: 'flex', justifyContent: 'center' }}>
      <Toast message={toast.msg} type={toast.type} show={toast.show} />
      
      <div className="main-content-layout" style={{ display: 'flex', width: '100%', maxWidth: '1300px' }}>
        
        {/* SIDEBAR GAUCHE */}
        <div className="sidebar-desktop" style={{ width: '260px', padding: '20px', borderRight: '1px solid #E2E8F0', display: 'flex', flexDirection: 'column', position: 'sticky', top: 0, height: '100vh', background: '#F8FAFC' }}>
          <h1 style={{ fontSize: '28px', fontWeight: 800, color: '#0F172A', marginBottom: '32px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{ width: '32px', height: '32px', background: '#F59E0B', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#FFF', fontSize: '18px' }}>S</div>
            StudyCI
          </h1>

          <nav style={{ display: 'flex', flexDirection: 'column', gap: '8px', flex: 1 }}>
            <a href="/" onClick={() => setShowAdminPanel(false)} style={{ display: 'flex', alignItems: 'center', gap: '16px', padding: '12px 16px', borderRadius: '12px', background: !showAdminPanel ? '#EFF6FF' : 'transparent', color: !showAdminPanel ? '#1E40AF' : '#334155', fontWeight: !showAdminPanel ? 700 : 600, textDecoration: 'none', fontSize: '16px' }}><Home size={24} /> Accueil</a>
            <a href="/search" style={{ display: 'flex', alignItems: 'center', gap: '16px', padding: '12px 16px', borderRadius: '12px', color: '#334155', fontWeight: 600, textDecoration: 'none', fontSize: '16px' }}><Search size={24} /> Annales</a>
            <a href="/reseau" style={{ display: 'flex', alignItems: 'center', gap: '16px', padding: '12px 16px', borderRadius: '12px', color: '#334155', fontWeight: 600, textDecoration: 'none', fontSize: '16px' }}><Users size={24} /> Réseau</a>
            <a href="/messages" style={{ display: 'flex', alignItems: 'center', gap: '16px', padding: '12px 16px', borderRadius: '12px', color: '#334155', fontWeight: 600, textDecoration: 'none', fontSize: '16px' }}><MessageSquare size={24} /> Messages</a>
            <a href="/groupes" style={{ display: 'flex', alignItems: 'center', gap: '16px', padding: '12px 16px', borderRadius: '12px', color: '#334155', fontWeight: 600, textDecoration: 'none', fontSize: '16px' }}><Users size={24} /> Groupes</a>
            <a href="/planning" style={{ display: 'flex', alignItems: 'center', gap: '16px', padding: '12px 16px', borderRadius: '12px', color: '#334155', fontWeight: 600, textDecoration: 'none', fontSize: '16px' }}><Calendar size={24} /> Planning</a>
            <a href="/mon-ia" style={{ display: 'flex', alignItems: 'center', gap: '16px', padding: '12px 16px', borderRadius: '12px', color: '#334155', fontWeight: 600, textDecoration: 'none', fontSize: '16px' }}><Sparkles size={24} color="#8B5CF6" /> Mon IA</a>
            
            {/* ⚡ BOUTON ADMIN */}
            {isAdmin && (
              <button 
                onClick={() => setShowAdminPanel(!showAdminPanel)} 
                style={{ display: 'flex', alignItems: 'center', gap: '16px', padding: '12px 16px', borderRadius: '12px', background: showAdminPanel ? '#FEF2F2' : 'transparent', color: showAdminPanel ? '#EF4444' : '#334155', fontWeight: 700, fontSize: '16px', border: 'none', cursor: 'pointer', marginTop: '10px' }}
              >
                <ShieldCheck size={24} color={showAdminPanel ? '#EF4444' : '#F59E0B'} /> 
                Panel Admin
                {pendingDocs.length > 0 && (
                  <span style={{ background: '#EF4444', color: '#FFF', fontSize: '11px', borderRadius: '10px', padding: '2px 6px', marginLeft: 'auto' }}>
                    {pendingDocs.length}
                  </span>
                )}
              </button>
            )}
          </nav>

          <div style={{ borderTop: '1px solid #E2E8F0', paddingTop: '16px', marginTop: 'auto' }}>
            <a href="/profile" style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px', borderRadius: '12px', background: '#FFF', border: '1px solid #E2E8F0', textDecoration: 'none', marginBottom: '12px' }}>
              {profile?.avatar_url ? <img src={profile.avatar_url} style={{ width: '40px', height: '40px', borderRadius: '50%' }} /> : <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: '#F1F5F9' }}><User size={20} color="#94A3B8" /></div>}
              <div style={{ flex: 1, overflow: 'hidden' }}>
                <p style={{ fontSize: '14px', fontWeight: 700, color: '#0F172A', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{profile?.full_name || 'Mon Profil'}</p>
                <p style={{ fontSize: '12px', color: '#64748B' }}>{profile?.level || 'Étudiant'}</p>
              </div>
            </a>
            <button onClick={logout} style={{ width: '100%', display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 16px', borderRadius: '12px', background: 'transparent', color: '#EF4444', fontWeight: 600, fontSize: '16px', border: 'none' }}><LogOut size={24} /> Déconnexion</button>
          </div>
        </div>

        {/* COLONNE CENTRALE */}
        <div style={{ flex: 1, background: '#FFF', width: '100%' }}>
          
          <div style={{ position: 'sticky', top: 0, zIndex: 50, background: 'rgba(255,255,255,0.95)', backdropFilter: 'blur(12px)', borderBottom: '1px solid #E2E8F0', padding: '16px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h2 style={{ fontSize: '20px', fontWeight: 800, color: '#0F172A' }}>
              {showAdminPanel ? 'Administration' : 'Accueil'}
            </h2>
            <NotificationBell />
          </div>

          {/* ⚡ AFFICHAGE CONDITIONNEL : PANEL ADMIN OU FEED */}
          {showAdminPanel ? (
            <div style={{ padding: '24px' }}>
              
              {/* ⚡ STATISTIQUES ADMIN */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '16px', marginBottom: '32px' }}>
                <div style={{ background: '#FFF', border: '1px solid #E2E8F0', padding: '20px', borderRadius: '16px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#64748B', fontSize: '13px', fontWeight: 600, marginBottom: '8px' }}><Users size={16} /> Total Utilisateurs</div>
                  <p style={{ fontSize: '28px', fontWeight: 900, color: '#0F172A' }}>{adminUsers.length}</p>
                </div>
                <div style={{ background: '#FFF', border: '1px solid #E2E8F0', padding: '20px', borderRadius: '16px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#64748B', fontSize: '13px', fontWeight: 600, marginBottom: '8px' }}><FileText size={16} /> Docs Approuvés</div>
                  <p style={{ fontSize: '28px', fontWeight: 900, color: '#0F172A' }}>{totalDocs}</p>
                </div>
                <div style={{ background: '#FFF', border: '1px solid #E2E8F0', padding: '20px', borderRadius: '16px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#64748B', fontSize: '13px', fontWeight: 600, marginBottom: '8px' }}><Download size={16} /> Téléchargements</div>
                  <p style={{ fontSize: '28px', fontWeight: 900, color: '#0F172A' }}>{totalDownloads}</p>
                </div>
                <div style={{ background: '#FFF', border: '1px solid #E2E8F0', padding: '20px', borderRadius: '16px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#64748B', fontSize: '13px', fontWeight: 600, marginBottom: '8px' }}><TrendingUp size={16} /> En attente</div>
                  <p style={{ fontSize: '28px', fontWeight: 900, color: '#EF4444' }}>{pendingDocs.length}</p>
                </div>
              </div>

              {/* Onglets Admin */}
              <div style={{ display: 'flex', gap: '12px', marginBottom: '24px', borderBottom: '1px solid #E2E8F0', paddingBottom: '16px' }}>
                <button onClick={() => setAdminTab('docs')} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 20px', background: adminTab === 'docs' ? '#0F172A' : '#F1F5F9', color: adminTab === 'docs' ? '#FFF' : '#64748B', borderRadius: '30px', fontWeight: 700, border: 'none', cursor: 'pointer' }}>
                  <FileText size={18} /> Documents en attente
                  {pendingDocs.length > 0 && <span style={{ background: '#EF4444', color: '#FFF', fontSize: '11px', padding: '2px 8px', borderRadius: '10px' }}>{pendingDocs.length}</span>}
                </button>
                <button onClick={() => setAdminTab('users')} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 20px', background: adminTab === 'users' ? '#0F172A' : '#F1F5F9', color: adminTab === 'users' ? '#FFF' : '#64748B', borderRadius: '30px', fontWeight: 700, border: 'none', cursor: 'pointer' }}>
                  <Users size={18} /> Utilisateurs
                  <span style={{ background: adminTab === 'users' ? 'rgba(255,255,255,0.2)' : '#E2E8F0', color: adminTab === 'users' ? '#FFF' : '#475569', padding: '2px 8px', borderRadius: '12px', fontSize: '12px', marginLeft: '4px' }}>
                    {adminUsers.length}
                  </span>
                </button>
              </div>

              {/* Onglet Documents */}
              {adminTab === 'docs' && (
                <div>
                  {pendingDocs.length === 0 ? (
                    <div style={{ background: '#F8FAFC', padding: '40px', borderRadius: '16px', textAlign: 'center', border: '1px solid #E2E8F0' }}>
                      <CheckCircle size={40} color="#10B981" style={{ margin: '0 auto 16px' }} />
                      <p style={{ color: '#0F172A', fontWeight: 700 }}>Aucun document en attente</p>
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                      {pendingDocs.map((doc: any) => (
                        <div key={doc.id} style={{ background: '#FFF', border: '1px solid #E2E8F0', borderRadius: '16px', padding: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                            <div style={{ width: '48px', height: '48px', background: '#FEF3C7', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                              <FileText size={24} color="#F59E0B" />
                            </div>
                            <div>
                              <p style={{ fontWeight: 800, color: '#0F172A', fontSize: '16px', marginBottom: '4px' }}>{doc.title}</p>
                              <span style={{ fontSize: '13px', color: '#64748B' }}>Par {doc.profiles?.full_name || 'Inconnu'}</span>
                            </div>
                          </div>
                          <div style={{ display: 'flex', gap: '8px' }}>
                            <a href={`/view-pdf?path=${encodeURIComponent(doc.file_path)}&title=${encodeURIComponent(doc.title)}`} target="_blank" rel="noopener noreferrer" style={{ padding: '8px 16px', background: '#F1F5F9', color: '#0F172A', borderRadius: '8px', textDecoration: 'none', fontWeight: 600, fontSize: '14px' }}>Lire</a>
                            <button onClick={() => handleApproveDoc(doc.id, doc.uploader_id)} style={{ padding: '8px 16px', background: '#10B981', color: '#FFF', border: 'none', borderRadius: '8px', fontWeight: 600, fontSize: '14px', cursor: 'pointer' }}>Approuver</button>
                            <button onClick={() => handleRejectDoc(doc.id, doc.uploader_id)} style={{ padding: '8px 16px', background: '#FEF2F2', color: '#EF4444', border: 'none', borderRadius: '8px', fontWeight: 600, fontSize: '14px', cursor: 'pointer' }}>Rejeter</button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Onglet Utilisateurs */}
              {adminTab === 'users' && (
                <div>
                  <div style={{ position: 'relative', marginBottom: '24px', maxWidth: '400px' }}>
                    <Search size={18} color="#94A3B8" style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)' }} />
                    <input type="text" placeholder="Rechercher un utilisateur..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} style={{ width: '100%', padding: '14px 14px 14px 42px', borderRadius: '12px', border: '1px solid #E2E8F0', outline: 'none' }} />
                  </div>
                  <div style={{ background: '#FFF', borderRadius: '16px', border: '1px solid #E2E8F0', overflow: 'hidden' }}>
                    {filteredUsers.map((user: any, idx: number) => (
                      <div key={user.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 24px', borderBottom: idx === filteredUsers.length - 1 ? 'none' : '1px solid #F1F5F9' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                          {user.avatar_url ? <img src={user.avatar_url} style={{ width: '40px', height: '40px', borderRadius: '50%' }} /> : <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: '#F1F5F9' }} />}
                          <div>
                            <p style={{ fontWeight: 700, color: '#0F172A' }}>{user.full_name}</p>
                            <p style={{ fontSize: '12px', color: '#64748B' }}>{user.email || 'Pas d\'email'} · {user.role}</p>
                          </div>
                        </div>
                        {user.role !== 'admin' && (
                          <button onClick={() => handleDeleteUser(user.id)} style={{ background: '#FEF2F2', border: 'none', color: '#EF4444', padding: '8px', borderRadius: '8px', cursor: 'pointer' }}><Trash2 size={18} /></button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <>
              <StoriesBar profile={profile} />
              <TextEditor profile={profile} onSubmit={createPost} uploading={uploading} />

              <div style={{ background: '#F8FAFC', padding: '16px 0' }}>
                <AnimatePresence>
                  {posts.map((p) => (
                    <PostCard 
                      key={p.id} 
                      post={p} 
                      isLiked={likes.includes(p.id)} 
                      onLike={() => toggleLike(p)} 
                      onDelete={() => deletePost(p.id)} 
                      isMine={p.user_id === user.id} 
                      currentUser={profile} 
                      onCommentAdded={loadFeed} 
                      timeTick={timeTick} 
                    />
                  ))}
                </AnimatePresence>
              </div>
            </>
          )}
        </div>

        {/* COLONNE DROITE */}
        <div className="right-column-desktop" style={{ width: '350px', padding: '20px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div style={{ position: 'relative' }}>
            <Search size={20} color="#94A3B8" style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)' }} />
            <input type="text" placeholder="Rechercher sur StudyCI" style={{ width: '100%', padding: '14px 14px 14px 48px', background: '#F1F5F9', border: 'none', borderRadius: '30px', fontSize: '15px', outline: 'none' }} />
          </div>

          <div style={{ background: '#F8FAFC', borderRadius: '16px', padding: '20px', border: '1px solid #E2E8F0' }}>
            <h3 style={{ fontSize: '18px', fontWeight: 800, color: '#0F172A', marginBottom: '16px' }}>Tendances</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div><p style={{ fontSize: '12px', color: '#64748B' }}>Annales · Tendance</p><p style={{ fontSize: '15px', fontWeight: 700, color: '#0F172A' }}>#DroitCivil2024</p><p style={{ fontSize: '12px', color: '#64748B' }}>1 245 téléchargements</p></div>
              <div><p style={{ fontSize: '12px', color: '#64748B' }}>Examens · Tendance</p><p style={{ fontSize: '15px', fontWeight: 700, color: '#0F172A' }}>#PartielsL2</p><p style={{ fontSize: '12px', color: '#64748B' }}>850 étudiants en parlent</p></div>
            </div>
          </div>
        </div>
      </div>

      {/* BARRE DE NAVIGATION MOBILE */}
      {isMobile && (
        <div className="mobile-nav-bar">
          <a href="/" className="mobile-nav-item active"><Home size={22} /></a>
          <a href="/search" className="mobile-nav-item"><Search size={22} /></a>
          <a href="/reseau" className="mobile-nav-item"><Users size={22} /></a>
          <a href="/messages" className="mobile-nav-item"><MessageSquare size={22} /></a>
          <a href="/groupes" className="mobile-nav-item"><MessageSquare size={22} /></a>
          <a href="/profile" className="mobile-nav-item"><User size={22} /></a>
        </div>
      )}
    </div>
  );
}

// --- FONCTION POUR LE TEMPS RELATIF ---
function timeAgo(dateString: string) {
  const dateMs = new Date(dateString).getTime();
  const nowMs = Date.now();
  const diffMs = Math.max(0, nowMs - dateMs);
  const seconds = Math.floor(diffMs / 1000);

  if (seconds < 60) return "À l'instant";
  
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes} min`;
  
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} h`;
  
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days} j`;
  
  const date = new Date(dateString);
  return date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
}

// --- COMPOSANT POUR LE POST ET SES COMMENTAIRES ---
function PostCard({ post, isLiked, onLike, onDelete, isMine, currentUser, onCommentAdded, timeTick }: any) {
  const [showComments, setShowComments] = useState(false);
  const [commentText, setCommentText] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const themeData = post.theme === 'gradient-1' ? { bg: 'linear-gradient(135deg, #1E3A8A, #3B82F6)', color: '#FFF' } 
    : post.theme === 'gradient-2' ? { bg: 'linear-gradient(135deg, #F59E0B, #EF4444)', color: '#FFF' }
    : post.theme === 'gradient-3' ? { bg: 'linear-gradient(135deg, #8B5CF6, #D946EF)', color: '#FFF' }
    : post.theme === 'solid-1' ? { bg: '#FDE68A', color: '#78350F' }
    : post.theme === 'solid-2' ? { bg: '#A7F3D0', color: '#064E3B' }
    : { bg: '#FFF', color: '#0F172A' };

  const submitComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!commentText.trim() || !currentUser) return;
    setIsSubmitting(true);
    
    const { error } = await supabase.from('post_comments').insert({
      post_id: post.id, user_id: currentUser.id, content: commentText.trim()
    });

    if (!error) {
      setCommentText('');
      onCommentAdded();

      if (post.user_id !== currentUser.id) {
        await supabase.from('notifications').insert({
          user_id: post.user_id,
          title: "Nouveau commentaire 💬",
          message: `${currentUser.full_name} a commenté votre publication.`,
          type: 'comment'
        });
      }
    }
    setIsSubmitting(false);
  };

  const deleteComment = async (commentId: string) => {
    if (!confirm("Supprimer ce commentaire ?")) return;
    const { error } = await supabase.from('post_comments').delete().eq('id', commentId);
    if (!error) {
      onCommentAdded();
    }
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0, height: 0 }} style={{ padding: '16px 20px', borderBottom: '1px solid #E2E8F0', background: '#FFF', marginBottom: '8px' }}>
      <div style={{ display: 'flex', gap: '12px' }}>
        
        <a href={`/profile/${post.user_id}`} style={{ flexShrink: 0 }}>
          {post.profiles?.avatar_url ? <img src={post.profiles.avatar_url} style={{ width: '40px', height: '40px', borderRadius: '50%', objectFit: 'cover' }} /> : <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: '#F1F5F9' }}><User size={20} style={{ margin: '10px' }} /></div>}
        </a>

        <div style={{ flex: 1 }}>
          
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
              <a href={`/profile/${post.user_id}`} style={{ fontWeight: 800, color: '#0F172A', fontSize: '15px', textDecoration: 'none' }}>
                {post.profiles?.full_name}
              </a>
              <p style={{ fontSize: '13px', color: '#64748B' }}>· {timeAgo(post.created_at)}</p>
            </div>
            {isMine && (
              <button onClick={onDelete} style={{ background: 'transparent', color: '#CBD5E1', border: 'none' }}><Trash2 size={18} /></button>
            )}
          </div>
          
          {post.content && post.content.trim() !== '' && (
            <div style={{ background: post.theme !== 'default' ? themeData.bg : 'transparent', color: themeData.color, padding: post.theme !== 'default' ? '24px' : '0', borderRadius: post.theme !== 'default' ? '16px' : '0', fontSize: post.theme !== 'default' ? '20px' : '15px', fontWeight: post.theme !== 'default' ? 700 : 400, textAlign: post.theme !== 'default' ? 'center' : 'left', marginBottom: '16px', whiteSpace: 'pre-wrap', boxShadow: post.theme !== 'default' ? '0 10px 25px rgba(0,0,0,0.1)' : 'none' }}>
              {post.content}
            </div>
          )}

          {post.file_url && (
            <div style={{ marginBottom: '16px', borderRadius: '16px', overflow: 'hidden', border: '1px solid #E2E8F0' }}>
              {post.file_type?.startsWith('image/') ? (
                <img src={post.file_url} style={{ width: '100%', maxHeight: '400px', objectFit: 'cover' }} />
              ) : (
                <a href={post.file_url} target="_blank" rel="noopener noreferrer" style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '16px', background: '#F8FAFC', textDecoration: 'none' }}>
                  <FileText size={32} color="#F59E0B" />
                  <div><p style={{ fontWeight: 700, color: '#0F172A' }}>Fichier joint</p><p style={{ fontSize: '12px', color: '#64748B' }}>Clique pour ouvrir</p></div>
                </a>
              )}
            </div>
          )}

          <div style={{ display: 'flex', gap: '32px', marginTop: '12px' }}>
            <button onClick={onLike} style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'transparent', border: 'none', color: isLiked ? '#EF4444' : '#64748B', fontWeight: 600, fontSize: '14px' }}>
              <Heart size={20} fill={isLiked ? '#EF4444' : 'none'} /> {post.post_likes?.length || 0}
            </button>
            <button onClick={() => setShowComments(!showComments)} style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'transparent', border: 'none', color: showComments ? '#1E40AF' : '#64748B', fontWeight: 600, fontSize: '14px' }}>
              <MessageSquare size={20} /> {post.post_comments?.length || 0} Répondre
            </button>
          </div>

          <AnimatePresence>
            {showComments && (
              <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} style={{ overflow: 'hidden', marginTop: '16px' }}>
                {post.post_comments?.map((comment: any) => (
                  <div key={comment.id} style={{ display: 'flex', gap: '10px', marginBottom: '12px', paddingLeft: '12px', borderLeft: '2px solid #E2E8F0' }}>
                    <a href={`/profile/${comment.user_id}`} style={{ flexShrink: 0 }}>
                      {comment.profiles?.avatar_url ? <img src={comment.profiles.avatar_url} style={{ width: '32px', height: '32px', borderRadius: '50%', objectFit: 'cover' }} /> : <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: '#F1F5F9' }}><User size={16} style={{ margin: '8px' }} /></div>}
                    </a>
                    <div style={{ background: '#F8FAFC', padding: '10px 14px', borderRadius: '12px', flex: 1 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <a href={`/profile/${comment.user_id}`} style={{ fontSize: '13px', fontWeight: 700, color: '#0F172A', marginBottom: '2px', textDecoration: 'none' }}>
                            {comment.profiles?.full_name}
                          </a>
                          <span style={{ fontSize: '11px', color: '#94A3B8' }}>· {timeAgo(comment.created_at)}</span>
                        </div>
                        {currentUser?.id === comment.user_id && (
                          <button onClick={() => deleteComment(comment.id)} style={{ background: 'transparent', color: '#CBD5E1', padding: '4px', display: 'flex', border: 'none' }}>
                            <Trash2 size={14} />
                          </button>
                        )}
                      </div>
                      <p style={{ fontSize: '14px', color: '#334155' }}>{comment.content}</p>
                    </div>
                  </div>
                ))}
                <form onSubmit={submitComment} style={{ display: 'flex', gap: '8px', marginTop: '12px' }}>
                  <input value={commentText} onChange={(e) => setCommentText(e.target.value)} placeholder="Écrire une réponse..." style={{ flex: 1, padding: '10px 16px', borderRadius: '20px', border: '1px solid #E2E8F0', fontSize: '14px', outline: 'none' }} />
                  <button type="submit" disabled={isSubmitting || !commentText.trim()} style={{ background: '#1E40AF', color: '#FFF', padding: '10px 14px', borderRadius: '50%', border: 'none', opacity: (isSubmitting || !commentText.trim()) ? 0.5 : 1 }}><Send size={16} /></button>
                </form>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </motion.div>
  );
}