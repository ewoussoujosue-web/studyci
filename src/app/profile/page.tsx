'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { supabase } from '@/lib/supabase';
import { User, Edit2, Save, X, FileText, LogOut, CheckCircle, Clock, XCircle, Home, Search, Users, MessageSquare, Calendar, Sparkles, Award, Flame, Zap } from 'lucide-react';
import Loader from '@/components/Loader';
import Toast from '@/components/Toast';

export default function MyProfilePage() {
  const [profile, setProfile] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<'profil' | 'documents'>('profil');
  const [myDocs, setMyDocs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [followersCount, setFollowersCount] = useState(0);
  const [docCount, setDocCount] = useState(0);

  const [editing, setEditing] = useState(false);
  const [bio, setBio] = useState('');
  const [level, setLevel] = useState('');
  const [skills, setSkills] = useState('');
  const [avatar, setAvatar] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error'; show: boolean }>({ msg: '', type: 'success', show: false });
  const [isMobile, setIsMobile] = useState(false);

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

  useEffect(() => {
    const fetchData = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) { window.location.href = '/inscription'; return; }

        const { data: prof } = await supabase.from('profiles').select('*').eq('id', session.user.id).single();
        if (prof) { 
          setProfile(prof); 
          setBio(prof.bio || ''); 
          setLevel(prof.level || ''); 
          setSkills(prof.skills || '');
        }

        const { data: docs } = await supabase.from('documents').select('*').eq('uploader_id', session.user.id).order('created_at', { ascending: false });
        setMyDocs(docs || []);
        setDocCount(docs?.length || 0);

        const { count: followers } = await supabase.from('follows').select('*', { count: 'exact', head: true }).eq('following_id', session.user.id);
        setFollowersCount(followers || 0);

      } catch (error) {
        console.error(error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const save = async () => {
    setSaving(true);
    let avatarUrl = profile.avatar_url;
    if (avatar) {
      const ext = avatar.name.split('.').pop()?.toLowerCase() || 'jpg';
      const path = `${profile.id}-${Date.now()}.${ext}`;
      const { error: uploadError } = await supabase.storage.from('avatars').upload(path, avatar);
      if (!uploadError) {
        const { data } = supabase.storage.from('avatars').getPublicUrl(path);
        avatarUrl = data.publicUrl;
      }
    }
    const { error: updateError } = await supabase.from('profiles').update({ bio, level, skills, avatar_url: avatarUrl }).eq('id', profile.id);
    if (!updateError) {
      setProfile({ ...profile, bio, level, skills, avatar_url: avatarUrl });
      setEditing(false);
      showToast('Profil mis à jour !', 'success');
    } else {
      showToast("Erreur : " + updateError.message, 'error');
    }
    setSaving(false);
  };

  const logout = async () => {
    await supabase.auth.signOut();
    window.location.href = '/';
  };

  if (loading) return <Loader text="Chargement du profil..." />;
  
  if (!profile) {
    supabase.auth.signOut().then(() => {
      window.location.href = '/inscription';
    });
    return <Loader text="Session expirée, redirection..." />;
  }

  const imageUrl = profile.avatar_url && profile.avatar_url.startsWith('http') ? `${profile.avatar_url}?t=${Date.now()}` : null;
  const skillList = profile.skills ? profile.skills.split(',').map((s: string) => s.trim()).filter((s: string) => s !== '') : [];

  return (
    <div style={{ minHeight: '100vh', background: '#F8FAFC', display: 'flex', justifyContent: 'center' }}>
      <Toast message={toast.msg} type={toast.type} show={toast.show} />
      
      <div className="main-content-layout" style={{ display: 'flex', width: '100%', maxWidth: '1300px' }}>
        
        {/* SIDEBAR GAUCHE (Cachée sur mobile) */}
        <div className="sidebar-desktop" style={{ width: '260px', padding: '20px', borderRight: '1px solid #E2E8F0', display: 'flex', flexDirection: 'column', position: 'sticky', top: 0, height: '100vh', background: '#F8FAFC' }}>
          <h1 style={{ fontSize: '28px', fontWeight: 800, color: '#0F172A', marginBottom: '32px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{ width: '32px', height: '32px', background: '#F59E0B', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#FFF', fontSize: '18px' }}>S</div>
            StudyCI
          </h1>

          <nav style={{ display: 'flex', flexDirection: 'column', gap: '8px', flex: 1 }}>
            <a href="/" style={{ display: 'flex', alignItems: 'center', gap: '16px', padding: '12px 16px', borderRadius: '12px', color: '#334155', fontWeight: 600, textDecoration: 'none', fontSize: '16px' }}><Home size={24} /> Accueil</a>
            <a href="/search" style={{ display: 'flex', alignItems: 'center', gap: '16px', padding: '12px 16px', borderRadius: '12px', color: '#334155', fontWeight: 600, textDecoration: 'none', fontSize: '16px' }}><Search size={24} /> Annales</a>
            <a href="/reseau" style={{ display: 'flex', alignItems: 'center', gap: '16px', padding: '12px 16px', borderRadius: '12px', color: '#334155', fontWeight: 600, textDecoration: 'none', fontSize: '16px' }}><Users size={24} /> Réseau</a>
            <a href="/groupes" style={{ display: 'flex', alignItems: 'center', gap: '16px', padding: '12px 16px', borderRadius: '12px', color: '#334155', fontWeight: 600, textDecoration: 'none', fontSize: '16px' }}><MessageSquare size={24} /> Groupes</a>
            <a href="/planning" style={{ display: 'flex', alignItems: 'center', gap: '16px', padding: '12px 16px', borderRadius: '12px', color: '#334155', fontWeight: 600, textDecoration: 'none', fontSize: '16px' }}><Calendar size={24} /> Planning</a>
            <a href="/mon-ia" style={{ display: 'flex', alignItems: 'center', gap: '16px', padding: '12px 16px', borderRadius: '12px', color: '#334155', fontWeight: 600, textDecoration: 'none', fontSize: '16px' }}><Sparkles size={24} color="#8B5CF6" /> Mon IA</a>
          </nav>

          <div style={{ borderTop: '1px solid #E2E8F0', paddingTop: '16px', marginTop: 'auto' }}>
            <a href="/profile" style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px', borderRadius: '12px', background: '#EFF6FF', border: '1px solid #BFDBFE', textDecoration: 'none', marginBottom: '12px' }}>
              {profile?.avatar_url ? <img src={profile.avatar_url} style={{ width: '40px', height: '40px', borderRadius: '50%' }} /> : <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: '#F1F5F9', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><User size={20} color="#94A3B8" /></div>}
              <div style={{ flex: 1, overflow: 'hidden' }}>
                <p style={{ fontSize: '14px', fontWeight: 700, color: '#1E40AF', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{profile?.full_name || 'Mon Profil'}</p>
                <p style={{ fontSize: '12px', color: '#3B82F6' }}>{profile?.level || 'Étudiant'}</p>
              </div>
            </a>
            <button onClick={logout} style={{ width: '100%', display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 16px', borderRadius: '12px', background: 'transparent', color: '#EF4444', fontWeight: 600, fontSize: '16px' }}><LogOut size={24} /> Déconnexion</button>
          </div>
        </div>

        {/* CONTENU CENTRAL */}
        <div style={{ flex: 1, padding: isMobile ? '16px' : '32px', maxWidth: '800px', width: '100%' }}>
          
          <div style={{ display: 'flex', gap: '12px', marginBottom: '24px' }}>
            <button onClick={() => setActiveTab('profil')} style={{ padding: '10px 20px', borderRadius: '50px', fontWeight: 700, fontSize: '14px', background: activeTab === 'profil' ? '#0F172A' : '#FFF', color: activeTab === 'profil' ? '#FFF' : '#64748B', border: '1px solid #E2E8F0', cursor: 'pointer' }}>Mon Profil</button>
            <button onClick={() => setActiveTab('documents')} style={{ padding: '10px 20px', borderRadius: '50px', fontWeight: 700, fontSize: '14px', background: activeTab === 'documents' ? '#0F172A' : '#FFF', color: activeTab === 'documents' ? '#FFF' : '#64748B', border: '1px solid #E2E8F0', cursor: 'pointer' }}>Mes Documents ({myDocs.length})</button>
          </div>

          {activeTab === 'profil' ? (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} style={{ background: '#FFFFFF', borderRadius: '24px', padding: isMobile ? '20px' : '32px', boxShadow: '0 10px 30px rgba(0,0,0,0.05)', border: '1px solid #E2E8F0' }}>
              
              <div style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', alignItems: 'center', gap: '24px', marginBottom: '32px', textAlign: isMobile ? 'center' : 'left' }}>
                <div style={{ position: 'relative' }}>
                  {imageUrl ? (
                    <img src={imageUrl} alt="Avatar" style={{ width: '100px', height: '100px', borderRadius: '50%', objectFit: 'cover', border: '4px solid #FFF', boxShadow: '0 8px 20px rgba(0,0,0,0.1)' }} />
                  ) : (
                    <div style={{ width: '100px', height: '100px', borderRadius: '50%', background: '#F1F5F9', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '4px solid #FFF' }}><User size={50} color="#94A3B8" /></div>
                  )}
                  <div style={{ position: 'absolute', bottom: '5px', right: '5px', background: '#009E60', borderRadius: '50%', padding: '4px', border: '2px solid #FFF' }}><CheckCircle size={16} color="#FFF" /></div>
                </div>
                
                <div style={{ flex: 1 }}>
                  <h1 style={{ fontSize: '24px', fontWeight: 800, color: '#0F172A' }}>{profile.full_name || 'Étudiant'}</h1>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: isMobile ? 'center' : 'flex-start', gap: '12px', marginTop: '8px' }}>
                    <span style={{ fontSize: '13px', padding: '6px 14px', background: 'rgba(245,158,11,0.15)', color: '#B45309', borderRadius: '20px', fontWeight: 700 }}>{profile.level || 'Filière'}</span>
                    <p style={{ fontSize: '14px', color: '#64748B', fontWeight: 600 }}>{followersCount} abonné(s)</p>
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '24px', justifyContent: isMobile ? 'center' : 'flex-start' }}>
                {followersCount >= 3 && <span style={{ background: '#FEF2F2', color: '#EF4444', padding: '6px 12px', borderRadius: '20px', fontSize: '12px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '4px' }}><Flame size={14} /> Populaire</span>}
                {docCount >= 5 && <span style={{ background: '#EFF6FF', color: '#3B82F6', padding: '6px 12px', borderRadius: '20px', fontSize: '12px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '4px' }}><Award size={14} /> Top Contributeur</span>}
              </div>

              {/* BOUTONS ACTIONS (Modifier + Déconnexion) */}
              <div style={{ display: 'flex', gap: '12px', marginBottom: '24px', flexDirection: isMobile ? 'column' : 'row' }}>
                <button onClick={() => setEditing(!editing)} style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: '12px 20px', background: editing ? '#FEF2F2' : '#F8FAFC', color: editing ? '#EF4444' : '#1E40AF', border: `1px solid ${editing ? '#FECACA' : '#E2E8F0'}`, borderRadius: '12px', fontWeight: 700, cursor: 'pointer' }}>
                  {editing ? <><X size={18}/> Annuler</> : <><Edit2 size={18}/> Modifier</>}
                </button>
                <button onClick={logout} style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: '12px 20px', background: '#FEF2F2', color: '#EF4444', border: '1px solid #FECACA', borderRadius: '12px', fontWeight: 700, cursor: 'pointer' }}>
                  <LogOut size={18}/> Déconnexion
                </button>
              </div>

              {editing ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', background: '#F8FAFC', padding: '20px', borderRadius: '16px' }}>
                  <div><label style={{ fontSize: '13px', color: '#475569', fontWeight: 600 }}>Bio</label><textarea value={bio} onChange={(e) => setBio(e.target.value)} rows={3} placeholder="Parle de toi..." style={{ width: '100%', padding: '12px', borderRadius: '12px', border: '1px solid #E2E8F0', marginTop: '8px', outline: 'none' }} /></div>
                  <div><label style={{ fontSize: '13px', color: '#475569', fontWeight: 600 }}>Filière / Niveau</label><input value={level} onChange={(e) => setLevel(e.target.value)} placeholder="Ex: L2 Droit" style={{ width: '100%', padding: '12px', borderRadius: '12px', border: '1px solid #E2E8F0', marginTop: '8px', outline: 'none' }} /></div>
                  <div><label style={{ fontSize: '13px', color: '#475569', fontWeight: 600 }}>Compétences (séparées par des virgules)</label><input value={skills} onChange={(e) => setSkills(e.target.value)} placeholder="Ex: Droit, Anglais, Excel" style={{ width: '100%', padding: '12px', borderRadius: '12px', border: '1px solid #E2E8F0', marginTop: '8px', outline: 'none' }} /></div>
                  <div><label style={{ fontSize: '13px', color: '#475569', fontWeight: 600 }}>Photo</label><input type="file" accept="image/*" onChange={(e) => setAvatar(e.target.files?.[0] || null)} style={{ marginTop: '8px', display: 'block' }} /></div>
                  <button onClick={save} disabled={saving} style={{ padding: '14px', background: '#009E60', color: '#FFF', borderRadius: '12px', fontWeight: 700, cursor: 'pointer' }}>Enregistrer</button>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  <div style={{ background: '#F8FAFC', padding: '20px', borderRadius: '16px', border: '1px solid #E2E8F0' }}>
                    <h3 style={{ fontSize: '14px', fontWeight: 700, color: '#475569', marginBottom: '8px' }}>À propos</h3>
                    <p style={{ color: '#334155', fontSize: '15px', lineHeight: 1.6 }}>{profile.bio || 'Aucune bio pour le moment.'}</p>
                  </div>
                  
                  {skillList.length > 0 && (
                    <div style={{ background: '#F8FAFC', padding: '20px', borderRadius: '16px', border: '1px solid #E2E8F0' }}>
                      <h3 style={{ fontSize: '14px', fontWeight: 700, color: '#475569', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}><Zap size={16} color="#F59E0B" /> Compétences</h3>
                      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                        {skillList.map((skill: string, index: number) => (
                          <span key={index} style={{ background: '#FFF', border: '1px solid #E2E8F0', padding: '6px 12px', borderRadius: '8px', fontSize: '13px', fontWeight: 600, color: '#0F172A' }}>{skill}</span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </motion.div>
          ) : (
             <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} style={{ background: '#FFFFFF', borderRadius: '24px', padding: isMobile ? '20px' : '32px', boxShadow: '0 10px 30px rgba(0,0,0,0.05)', border: '1px solid #E2E8F0' }}>
             <h2 style={{ fontSize: '20px', fontWeight: 800, color: '#0F172A', marginBottom: '24px' }}>Mes partages</h2>
             {myDocs.length === 0 ? (
               <p style={{ textAlign: 'center', color: '#64748B', padding: '40px 0' }}>Tu n'as encore rien uploadé.</p>
             ) : (
               <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                 {myDocs.map(d => (
                   <div key={d.id} style={{ display: 'flex', alignItems: 'center', gap: '16px', padding: '16px', border: '1px solid #E2E8F0', borderRadius: '16px' }}>
                     <div style={{ background: '#F1F5F9', padding: '12px', borderRadius: '12px' }}><FileText size={24} color="#64748B" /></div>
                     <div style={{ flex: 1 }}>
                       <p style={{ fontWeight: 700, color: '#0F172A' }}>{d.title}</p>
                       <p style={{ fontSize: '13px', color: '#64748B' }}>{d.type} · {d.academic_year}</p>
                     </div>
                     {d.status === 'approved' && <span style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#059669', background: '#ECFDF5', padding: '6px 12px', borderRadius: '20px', fontSize: '12px', fontWeight: 700 }}><CheckCircle size={14} /> Approuvé</span>}
                     {d.status === 'pending' && <span style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#D97706', background: '#FFFBEB', padding: '6px 12px', borderRadius: '20px', fontSize: '12px', fontWeight: 700 }}><Clock size={14} /> En attente</span>}
                     {d.status === 'rejected' && <span style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#EF4444', background: '#FEF2F2', padding: '6px 12px', borderRadius: '20px', fontSize: '12px', fontWeight: 700 }}><XCircle size={14} /> Rejeté</span>}
                   </div>
                 ))}
               </div>
             )}
           </motion.div>
          )}
        </div>
      </div>

      {/* BARRE DE NAVIGATION MOBILE */}
      {isMobile && (
        <div className="mobile-nav-bar">
          <a href="/" className="mobile-nav-item">
            <Home size={22} />
          </a>
          <a href="/search" className="mobile-nav-item">
            <Search size={22} />
          </a>
          <a href="/reseau" className="mobile-nav-item">
            <Users size={22} />
          </a>
          <a href="/messages" className="mobile-nav-item">
            <MessageSquare size={22} />
          </a>
          <a href="/groupes" className="mobile-nav-item">
            <MessageSquare size={22} />
          </a>
          <a href="/profile" className="mobile-nav-item active">
            <User size={22} />
          </a>
        </div>
      )}
    </div>
  );
}