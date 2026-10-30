'use client';

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '@/lib/supabase';
import { MessageSquare, Heart, User, Sparkles, Users, Search, Calendar, FileText, Home, LogOut, Trash2, Send } from 'lucide-react';
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
      if (!session) return;

      setUser(session.user);
      const { data: prof } = await supabase.from('profiles').select('*').eq('id', session.user.id).single();
      setProfile(prof);

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

  useEffect(() => {
    loadFeed();
  }, []);

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

      // CRÉER UNE NOTIFICATION POUR L'AUTEUR DU POST (si ce n'est pas moi)
      if (post.user_id !== user.id) {
        await supabase.from('notifications').insert({
          user_id: post.user_id,
          title: "Nouveau like ❤️",
          message: `${profile.full_name} a aimé votre publication.`
        });
      }
    }
  };

  const logout = async () => {
    await supabase.auth.signOut();
    window.location.href = '/';
  };

  if (loading) return <Loader text="Chargement de StudyCI..." />;

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

          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 1.2, type: "spring", stiffness: 200 }}>
            <motion.a href="/inscription" animate={{ boxShadow: ["0 0 0 0 rgba(245, 158, 11, 0.7)", "0 0 0 20px rgba(245, 158, 11, 0)"] }} transition={{ duration: 2, repeat: Infinity, ease: "easeOut" }} whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
              style={{ display: 'inline-block', padding: '16px 40px', background: 'linear-gradient(135deg, #F77F00, #FBBF24)', color: '#FFFFFF', fontSize: '18px', fontWeight: 800, borderRadius: '50px', textDecoration: 'none' }}>
              Commencer l'aventure
            </motion.a>
          </motion.div>
        </div>
      </div>
    );
  }

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
            <a href="/" style={{ display: 'flex', alignItems: 'center', gap: '16px', padding: '12px 16px', borderRadius: '12px', background: '#EFF6FF', color: '#1E40AF', fontWeight: 700, textDecoration: 'none', fontSize: '16px' }}><Home size={24} /> Accueil</a>
            <a href="/search" style={{ display: 'flex', alignItems: 'center', gap: '16px', padding: '12px 16px', borderRadius: '12px', color: '#334155', fontWeight: 600, textDecoration: 'none', fontSize: '16px' }}><Search size={24} /> Annales</a>
            <a href="/reseau" style={{ display: 'flex', alignItems: 'center', gap: '16px', padding: '12px 16px', borderRadius: '12px', color: '#334155', fontWeight: 600, textDecoration: 'none', fontSize: '16px' }}><Users size={24} /> Réseau</a>
            <a href="/messages" style={{ display: 'flex', alignItems: 'center', gap: '16px', padding: '12px 16px', borderRadius: '12px', color: '#334155', fontWeight: 600, textDecoration: 'none', fontSize: '16px' }}><MessageSquare size={24} /> Messages</a>
            <a href="/groupes" style={{ display: 'flex', alignItems: 'center', gap: '16px', padding: '12px 16px', borderRadius: '12px', color: '#334155', fontWeight: 600, textDecoration: 'none', fontSize: '16px' }}><Users size={24} /> Groupes</a>
            <a href="/planning" style={{ display: 'flex', alignItems: 'center', gap: '16px', padding: '12px 16px', borderRadius: '12px', color: '#334155', fontWeight: 600, textDecoration: 'none', fontSize: '16px' }}><Calendar size={24} /> Planning</a>
            <a href="/mon-ia" style={{ display: 'flex', alignItems: 'center', gap: '16px', padding: '12px 16px', borderRadius: '12px', color: '#334155', fontWeight: 600, textDecoration: 'none', fontSize: '16px' }}><Sparkles size={24} color="#8B5CF6" /> Mon IA</a>
          </nav>

          <div style={{ borderTop: '1px solid #E2E8F0', paddingTop: '16px', marginTop: 'auto' }}>
            <a href="/profile" style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px', borderRadius: '12px', background: '#FFF', border: '1px solid #E2E8F0', textDecoration: 'none', marginBottom: '12px' }}>
              {profile?.avatar_url ? <img src={profile.avatar_url} style={{ width: '40px', height: '40px', borderRadius: '50%' }} /> : <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: '#F1F5F9' }}><User size={20} color="#94A3B8" /></div>}
              <div style={{ flex: 1, overflow: 'hidden' }}>
                <p style={{ fontSize: '14px', fontWeight: 700, color: '#0F172A', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{profile?.full_name || 'Mon Profil'}</p>
                <p style={{ fontSize: '12px', color: '#64748B' }}>{profile?.level || 'Étudiant'}</p>
              </div>
            </a>
            <button onClick={logout} style={{ width: '100%', display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 16px', borderRadius: '12px', background: 'transparent', color: '#EF4444', fontWeight: 600, fontSize: '16px' }}><LogOut size={24} /> Déconnexion</button>
          </div>
        </div>

        {/* COLONNE CENTRALE */}
        <div style={{ flex: 1, background: '#FFF', width: '100%' }}>
          
          <div style={{ position: 'sticky', top: 0, zIndex: 50, background: 'rgba(255,255,255,0.95)', backdropFilter: 'blur(12px)', borderBottom: '1px solid #E2E8F0', padding: '16px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h2 style={{ fontSize: '20px', fontWeight: 800, color: '#0F172A' }}>Accueil</h2>
            <NotificationBell />
          </div>

          <StoriesBar profile={profile} />
          <TextEditor profile={profile} onSubmit={createPost} uploading={uploading} />

          <div style={{ background: '#F8FAFC', padding: '16px 0' }}>
            <AnimatePresence>
              {posts.map((p) => (
                <PostCard key={p.id} post={p} isLiked={likes.includes(p.id)} onLike={() => toggleLike(p)} onDelete={() => deletePost(p.id)} isMine={p.user_id === user.id} currentUser={profile} onCommentAdded={loadFeed} />
              ))}
            </AnimatePresence>
          </div>
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
  const date = new Date(dateString);
  const now = new Date();
  const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (seconds < 60) return "À l'instant";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} h`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days} j`;
  return date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
}

// --- COMPOSANT POUR LE POST ET SES COMMENTAIRES ---
function PostCard({ post, isLiked, onLike, onDelete, isMine, currentUser, onCommentAdded }: any) {
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

      // CRÉER UNE NOTIFICATION POUR L'AUTEUR DU POST
      if (post.user_id !== currentUser.id) {
        await supabase.from('notifications').insert({
          user_id: post.user_id,
          title: "Nouveau commentaire 💬",
          message: `${currentUser.full_name} a commenté votre publication.`
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
              <button onClick={onDelete} style={{ background: 'transparent', color: '#CBD5E1' }}><Trash2 size={18} /></button>
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
            <button onClick={onLike} style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'transparent', color: isLiked ? '#EF4444' : '#64748B', fontWeight: 600, fontSize: '14px' }}>
              <Heart size={20} fill={isLiked ? '#EF4444' : 'none'} /> {post.post_likes?.length || 0}
            </button>
            <button onClick={() => setShowComments(!showComments)} style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'transparent', color: showComments ? '#1E40AF' : '#64748B', fontWeight: 600, fontSize: '14px' }}>
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
                          <button onClick={() => deleteComment(comment.id)} style={{ background: 'transparent', color: '#CBD5E1', padding: '4px', display: 'flex' }} aria-label="Supprimer le commentaire">
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
                  <button type="submit" disabled={isSubmitting || !commentText.trim()} style={{ background: '#1E40AF', color: '#FFF', padding: '10px 14px', borderRadius: '50%', opacity: (isSubmitting || !commentText.trim()) ? 0.5 : 1 }}><Send size={16} /></button>
                </form>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </motion.div>
  );
}