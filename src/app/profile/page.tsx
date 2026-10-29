'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { supabase } from '@/lib/supabase';
import { User, Edit2, Save, X, FileText, LogOut, CheckCircle, Clock, XCircle, Home, Search, Users, MessageSquare, Calendar, Sparkles, Award, Flame, Zap, School, Sun, Moon, Monitor } from 'lucide-react';
import Loader from '@/components/Loader';
import Toast from '@/components/Toast';

export default function MyProfilePage() {
  // GESTION DU THÈME SANS IMPORT EXTERNE
  const [theme, setThemeState] = useState<'light' | 'dark' | 'system'>('system');

  useEffect(() => {
    const saved = localStorage.getItem('studyci-theme') as any || 'system';
    setThemeState(saved);
    applyTheme(saved);
  }, []);

  const applyTheme = (t: string) => {
    let dark = t === 'dark' || (t === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
    document.documentElement.setAttribute('data-theme', dark ? 'dark' : 'light');
  };

  const setTheme = (t: 'light' | 'dark' | 'system') => {
    setThemeState(t);
    localStorage.setItem('studyci-theme', t);
    applyTheme(t);
  };
  // ----------------------------------------

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

  const showToast = (msg: string, type: 'success' | 'error') => {
    setToast({ msg, type, show: true });
    setTimeout(() => setToast(t => ({ ...t, show: false })), 3000);
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        await new Promise(resolve => setTimeout(resolve, 500));

        const { data: { session } } = await supabase.auth.getSession();
        
        if (!session) { 
          window.location.href = '/inscription'; 
          return; 
        }

        const { data: prof, error: profError } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', session.user.id)
          .single();
          
        if (profError) {
          console.error("Erreur de récupération du profil :", profError);
        }

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
    return (
      <div style={{ padding: '50px', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '20px', background: 'var(--bg-primary)', minHeight: '100vh' }}>
        <p style={{ color: '#EF4444', fontSize: '18px', fontWeight: 600 }}>Impossible de charger les données du profil.</p>
        <button onClick={logout} style={{ padding: '12px 24px', background: '#F59E0B', color: '#FFF', borderRadius: '12px', fontWeight: 700 }}>
          Se déconnecter et réessayer
        </button>
      </div>
    );
  }

  const imageUrl = profile.avatar_url && profile.avatar_url.startsWith('http') ? `${profile.avatar_url}?t=${Date.now()}` : null;
  
  const skillList = profile.skills ? profile.skills.split(',').map((s: string) => s.trim()).filter((s: string) => s !== '') : [];

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-primary)', display: 'flex', justifyContent: 'center' }}>
      <Toast message={toast.msg} type={toast.type} show={toast.show} />
      
      <div style={{ display: 'flex', width: '100%', maxWidth: '1300px' }}>
        
        {/* SIDEBAR GAUCHE */}
        <div style={{ width: '260px', padding: '20px', borderRight: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column', position: 'sticky', top: 0, height: '100vh', background: 'var(--bg-primary)' }}>
          <h1 style={{ fontSize: '28px', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '32px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{ width: '32px', height: '32px', background: '#F59E0B', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#FFF', fontSize: '18px' }}>S</div>
            StudyCI
          </h1>

          <nav style={{ display: 'flex', flexDirection: 'column', gap: '8px', flex: 1 }}>
            <a href="/" style={{ display: 'flex', alignItems: 'center', gap: '16px', padding: '12px 16px', borderRadius: '12px', color: 'var(--text-secondary)', fontWeight: 600, textDecoration: 'none', fontSize: '16px' }}><Home size={24} /> Accueil</a>
            <a href="/search" style={{ display: 'flex', alignItems: 'center', gap: '16px', padding: '12px 16px', borderRadius: '12px', color: 'var(--text-secondary)', fontWeight: 600, textDecoration: 'none', fontSize: '16px' }}><Search size={24} /> Annales</a>
            <a href="/reseau" style={{ display: 'flex', alignItems: 'center', gap: '16px', padding: '12px 16px', borderRadius: '12px', color: 'var(--text-secondary)', fontWeight: 600, textDecoration: 'none', fontSize: '16px' }}><Users size={24} /> Réseau</a>
            <a href="/groupes" style={{ display: 'flex', alignItems: 'center', gap: '16px', padding: '12px 16px', borderRadius: '12px', color: 'var(--text-secondary)', fontWeight: 600, textDecoration: 'none', fontSize: '16px' }}><MessageSquare size={24} /> Groupes</a>
            <a href="/planning" style={{ display: 'flex', alignItems: 'center', gap: '16px', padding: '12px 16px', borderRadius: '12px', color: 'var(--text-secondary)', fontWeight: 600, textDecoration: 'none', fontSize: '16px' }}><Calendar size={24} /> Planning</a>
            <a href="/mon-ia" style={{ display: 'flex', alignItems: 'center', gap: '16px', padding: '12px 16px', borderRadius: '12px', color: 'var(--text-secondary)', fontWeight: 600, textDecoration: 'none', fontSize: '16px' }}><Sparkles size={24} color="#8B5CF6" /> Mon IA</a>
          </nav>

          <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '16px', marginTop: 'auto' }}>
            <a href="/profile" style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px', borderRadius: '12px', background: 'var(--bg-card)', border: '1px solid var(--border-color)', textDecoration: 'none', marginBottom: '12px' }}>
              {profile?.avatar_url ? <img src={profile.avatar_url} style={{ width: '40px', height: '40px', borderRadius: '50%' }} /> : <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: 'var(--bg-input)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><User size={20} color="var(--text-muted)" /></div>}
              <div style={{ flex: 1, overflow: 'hidden' }}>
                <p style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{profile?.full_name || 'Mon Profil'}</p>
                <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{profile?.level || 'Étudiant'}</p>
              </div>
            </a>
            <button onClick={logout} style={{ width: '100%', display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 16px', borderRadius: '12px', background: 'transparent', color: '#EF4444', fontWeight: 600, fontSize: '16px' }}><LogOut size={24} /> Déconnexion</button>
          </div>
        </div>

        {/* CONTENU CENTRAL */}
        <div style={{ flex: 1, padding: '32px', maxWidth: '800px' }}>
          
          <div style={{ display: 'flex', gap: '12px', marginBottom: '24px' }}>
            <button onClick={() => setActiveTab('profil')} style={{ padding: '12px 24px', borderRadius: '50px', fontWeight: 700, fontSize: '15px', background: activeTab === 'profil' ? 'var(--text-primary)' : 'var(--bg-card)', color: activeTab === 'profil' ? 'var(--bg-primary)' : 'var(--text-muted)', border: '1px solid var(--border-color)', boxShadow: '0 4px 15px rgba(0,0,0,0.05)', cursor: 'pointer' }}>Mon Profil</button>
            <button onClick={() => setActiveTab('documents')} style={{ padding: '12px 24px', borderRadius: '50px', fontWeight: 700, fontSize: '15px', background: activeTab === 'documents' ? 'var(--text-primary)' : 'var(--bg-card)', color: activeTab === 'documents' ? 'var(--bg-primary)' : 'var(--text-muted)', border: '1px solid var(--border-color)', boxShadow: '0 4px 15px rgba(0,0,0,0.05)', cursor: 'pointer' }}>Mes Documents ({myDocs.length})</button>
          </div>

          {activeTab === 'profil' ? (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} style={{ background: 'var(--bg-card)', borderRadius: '24px', padding: '32px', boxShadow: 'var(--shadow-sm)', border: '1px solid var(--border-color)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '24px', marginBottom: '32px', flexWrap: 'wrap' }}>
                <div style={{ position: 'relative' }}>
                  {imageUrl ? (
                    <img src={imageUrl} alt="Avatar" style={{ width: '110px', height: '110px', borderRadius: '50%', objectFit: 'cover', border: `4px solid var(--bg-card)`, boxShadow: '0 8px 20px rgba(0,0,0,0.1)' }} />
                  ) : (
                    <div style={{ width: '110px', height: '110px', borderRadius: '50%', background: 'var(--bg-input)', display: 'flex', alignItems: 'center', justifyContent: 'center', border: `4px solid var(--bg-card)` }}><User size={50} color="var(--text-muted)" /></div>
                  )}
                  <div style={{ position: 'absolute', bottom: '5px', right: '5px', background: '#009E60', borderRadius: '50%', padding: '4px', border: `2px solid var(--bg-card)` }}><CheckCircle size={16} color="#FFF" /></div>
                </div>
                <div style={{ flex: 1 }}>
                  <h1 style={{ fontSize: '28px', fontWeight: 800, color: 'var(--text-primary)' }}>{profile.full_name || 'Étudiant'}</h1>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginTop: '8px', flexWrap: 'wrap' }}>
                    <span style={{ fontSize: '13px', padding: '6px 14px', background: 'rgba(245,158,11,0.15)', color: '#B45309', borderRadius: '20px', fontWeight: 700 }}>{profile.level || 'Filière'}</span>
                    
                    {profile.school && (
                      <span style={{ fontSize: '13px', padding: '6px 14px', background: 'rgba(59,130,246,0.15)', color: '#3B82F6', borderRadius: '20px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <School size={14} /> {profile.school}
                      </span>
                    )}
                    
                    <p style={{ fontSize: '14px', color: 'var(--text-muted)', fontWeight: 600 }}>{followersCount} abonné(s)</p>
                  </div>
                </div>
                <button onClick={() => setEditing(!editing)} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '12px 20px', background: editing ? '#FEF2F2' : 'var(--bg-input)', color: editing ? '#EF4444' : '#1E40AF', border: `1px solid ${editing ? '#FECACA' : 'var(--border-color)'}`, borderRadius: '12px', fontWeight: 700, cursor: 'pointer' }}>
                  {editing ? <><X size={18}/> Annuler</> : <><Edit2 size={18}/> Modifier</>}
                </button>
              </div>

              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '24px' }}>
                {followersCount >= 3 && <span style={{ background: '#FEF2F2', color: '#EF4444', padding: '6px 12px', borderRadius: '20px', fontSize: '12px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '4px' }}><Flame size={14} /> Populaire</span>}
                {docCount >= 5 && <span style={{ background: '#EFF6FF', color: '#3B82F6', padding: '6px 12px', borderRadius: '20px', fontSize: '12px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '4px' }}><Award size={14} /> Top Contributeur</span>}
                {docCount > 0 && docCount < 5 && <span style={{ background: 'var(--bg-input)', color: 'var(--text-muted)', padding: '6px 12px', borderRadius: '20px', fontSize: '12px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '4px' }}>📚 Membre actif</span>}
              </div>

              {editing ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', background: 'var(--bg-input)', padding: '24px', borderRadius: '16px' }}>
                  <div><label style={{ fontSize: '13px', color: 'var(--text-secondary)', fontWeight: 600 }}>Bio</label><textarea value={bio} onChange={(e) => setBio(e.target.value)} rows={3} placeholder="Parle de toi..." style={{ width: '100%', padding: '12px', borderRadius: '12px', border: '1px solid var(--border-color)', background: 'var(--bg-card)', color: 'var(--text-primary)', marginTop: '8px', outline: 'none' }} /></div>
                  <div><label style={{ fontSize: '13px', color: 'var(--text-secondary)', fontWeight: 600 }}>Filière / Niveau</label><input value={level} onChange={(e) => setLevel(e.target.value)} placeholder="Ex: L2 Droit" style={{ width: '100%', padding: '12px', borderRadius: '12px', border: '1px solid var(--border-color)', background: 'var(--bg-card)', color: 'var(--text-primary)', marginTop: '8px', outline: 'none' }} /></div>
                  <div><label style={{ fontSize: '13px', color: 'var(--text-secondary)', fontWeight: 600 }}>Compétences (séparées par des virgules)</label><input value={skills} onChange={(e) => setSkills(e.target.value)} placeholder="Ex: Droit, Anglais, Excel, Rédaction" style={{ width: '100%', padding: '12px', borderRadius: '12px', border: '1px solid var(--border-color)', background: 'var(--bg-card)', color: 'var(--text-primary)', marginTop: '8px', outline: 'none' }} /></div>
                  <div><label style={{ fontSize: '13px', color: 'var(--text-secondary)', fontWeight: 600 }}>Photo</label><input type="file" accept="image/*" onChange={(e) => setAvatar(e.target.files?.[0] || null)} style={{ marginTop: '8px', display: 'block', color: 'var(--text-primary)' }} /></div>
                  <button onClick={save} disabled={saving} style={{ padding: '14px', background: '#009E60', color: '#FFF', borderRadius: '12px', fontWeight: 700, cursor: 'pointer' }}>Enregistrer</button>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  <div style={{ background: 'var(--bg-input)', padding: '24px', borderRadius: '16px', border: '1px solid var(--border-color)' }}>
                    <h3 style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '8px' }}>À propos</h3>
                    <p style={{ color: 'var(--text-primary)', fontSize: '15px', lineHeight: 1.6 }}>{profile.bio || 'Aucune bio pour le moment.'}</p>
                  </div>
                  
                  {skillList.length > 0 && (
                    <div style={{ background: 'var(--bg-input)', padding: '24px', borderRadius: '16px', border: '1px solid var(--border-color)' }}>
                      <h3 style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}><Zap size={16} color="#F59E0B" /> Compétences</h3>
                      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                        {skillList.map((skill: string, index: number) => (
                          <span key={index} style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', padding: '6px 12px', borderRadius: '8px', fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)' }}>
                            {skill}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* SECTION APPARENCE (Mode Sombre) */}
                  <div style={{ background: 'var(--bg-input)', padding: '24px', borderRadius: '16px', border: '1px solid var(--border-color)' }}>
                    <h3 style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '16px' }}>Apparence de l'application</h3>
                    <div style={{ display: 'flex', gap: '12px' }}>
                      <button onClick={() => setTheme('light')} style={{ flex: 1, padding: '12px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', background: theme === 'light' ? 'var(--bg-card)' : 'transparent', border: `1px solid ${theme === 'light' ? '#F59E0B' : 'var(--border-color)'}`, borderRadius: '12px', color: 'var(--text-primary)' }}>
                        <Sun size={20} color={theme === 'light' ? '#F59E0B' : 'var(--text-muted)'} />
                        <span style={{ fontSize: '13px', fontWeight: 600 }}>Clair</span>
                      </button>
                      <button onClick={() => setTheme('dark')} style={{ flex: 1, padding: '12px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', background: theme === 'dark' ? 'var(--bg-card)' : 'transparent', border: `1px solid ${theme === 'dark' ? '#F59E0B' : 'var(--border-color)'}`, borderRadius: '12px', color: 'var(--text-primary)' }}>
                        <Moon size={20} color={theme === 'dark' ? '#F59E0B' : 'var(--text-muted)'} />
                        <span style={{ fontSize: '13px', fontWeight: 600 }}>Sombre</span>
                      </button>
                      <button onClick={() => setTheme('system')} style={{ flex: 1, padding: '12px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', background: theme === 'system' ? 'var(--bg-card)' : 'transparent', border: `1px solid ${theme === 'system' ? '#F59E0B' : 'var(--border-color)'}`, borderRadius: '12px', color: 'var(--text-primary)' }}>
                        <Monitor size={20} color={theme === 'system' ? '#F59E0B' : 'var(--text-muted)'} />
                        <span style={{ fontSize: '13px', fontWeight: 600 }}>Système</span>
                      </button>
                    </div>
                  </div>

                </div>
              )}
            </motion.div>
          ) : (
             <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} style={{ background: 'var(--bg-card)', borderRadius: '24px', padding: '32px', boxShadow: 'var(--shadow-sm)', border: '1px solid var(--border-color)' }}>
             <h2 style={{ fontSize: '20px', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '24px' }}>Mes partages</h2>
             {myDocs.length === 0 ? (
               <p style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '40px 0' }}>Tu n'as encore rien uploadé.</p>
             ) : (
               <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                 {myDocs.map(d => (
                   <div key={d.id} style={{ display: 'flex', alignItems: 'center', gap: '16px', padding: '16px', border: '1px solid var(--border-color)', borderRadius: '16px' }}>
                     <div style={{ background: 'var(--bg-input)', padding: '12px', borderRadius: '12px' }}><FileText size={24} color="var(--text-muted)" /></div>
                     <div style={{ flex: 1 }}>
                       <p style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{d.title}</p>
                       <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>{d.type} · {d.academic_year}</p>
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
    </div>
  );
}