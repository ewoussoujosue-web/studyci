'use client';

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '@/lib/supabase';
import { Users, Search, Plus, Lock, Unlock, MessageSquare, ArrowRight, X, Check, Camera, Home, User } from 'lucide-react';
import Loader from '@/components/Loader';
import Toast from '@/components/Toast';

export default function GroupesPage() {
  const [loading, setLoading] = useState(true);
  const [me, setMe] = useState<any>(null);
  const [groups, setGroups] = useState<any[]>([]);
  const [myGroups, setMyGroups] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isMobile, setIsMobile] = useState(false);
  
  const [showCreate, setShowCreate] = useState(false);
  const [joinModal, setJoinModal] = useState<any>(null);
  const [inviteCodeInput, setInviteCodeInput] = useState('');
  const [joining, setJoining] = useState(false);

  // Formulaire de création
  const [name, setName] = useState('');
  const [isPrivate, setIsPrivate] = useState(false);
  const [groupAvatar, setGroupAvatar] = useState<File | null>(null);
  const [creating, setCreating] = useState(false);

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

  const loadData = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (session) {
      const { data: prof } = await supabase.from('profiles').select('*').eq('id', session.user.id).single();
      setMe(prof);

      const { data: memberships } = await supabase.from('group_members').select('group_id').eq('user_id', session.user.id);
      if (memberships) setMyGroups(memberships.map(m => m.group_id));
    }

    const { data } = await supabase.from('groups').select('*, profiles!groups_creator_id_fkey(full_name, avatar_url)').order('created_at', { ascending: false });
    setGroups(data || []);
    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, []);

  const createGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !me) return;
    setCreating(true);

    try {
      let avatar_url = null;

      if (groupAvatar) {
        const ext = groupAvatar.name.split('.').pop();
        const path = `groups/${Date.now()}.${ext}`;
        const { error: upErr } = await supabase.storage.from('avatars').upload(path, groupAvatar);
        
        if (!upErr) {
          const { data } = supabase.storage.from('avatars').getPublicUrl(path);
          avatar_url = data.publicUrl;
        }
      }

      const inviteCode = isPrivate ? Math.random().toString(36).substring(2, 8).toUpperCase() : null;

      const { data: newGroup, error } = await supabase.from('groups').insert({
        name: name.trim(),
        creator_id: me.id,
        is_private: isPrivate,
        invite_code: inviteCode,
        avatar_url: avatar_url
      }).select().single();

      if (error) throw error;

      if (newGroup) {
        await supabase.from('group_members').insert({ group_id: newGroup.id, user_id: me.id });
      }

      showToast('Groupe créé avec succès !', 'success');
      setShowCreate(false);
      setName('');
      setIsPrivate(false);
      setGroupAvatar(null);
      
      setTimeout(() => { window.location.href = `/groupes/${newGroup.id}`; }, 1000);

    } catch (err: any) {
      showToast("Erreur : " + err.message, 'error');
      setCreating(false);
    }
  };

  const handleJoinClick = (group: any) => {
    if (myGroups.includes(group.id)) {
      window.location.href = `/groupes/${group.id}`;
      return;
    }
    if (group.is_private) {
      setJoinModal(group);
    } else {
      joinGroup(group.id, null);
    }
  };

  const joinGroup = async (groupId: string, code: string | null) => {
    if (!me) return;
    setJoining(true);

    try {
      const group = groups.find(g => g.id === groupId);
      if (group?.is_private && code !== group.invite_code) {
        throw new Error("Code d'invitation incorrect.");
      }

      const { error } = await supabase.from('group_members').insert({ group_id: groupId, user_id: me.id });

      if (error) {
        if (error.code === '23505') throw new Error("Tu as déjà rejoint ce groupe.");
        throw error;
      }

      showToast('Tu as rejoint le groupe !', 'success');
      setJoinModal(null);
      setInviteCodeInput('');
      setTimeout(() => { window.location.href = `/groupes/${groupId}`; }, 1000);

    } catch (err: any) {
      showToast(err.message, 'error');
      setJoining(false);
    }
  };

  const filteredGroups = groups.filter(g => g.name.toLowerCase().includes(searchQuery.toLowerCase()));

  if (loading) return <Loader text="Chargement des groupes..." />;

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
            <a href="/groupes" style={{ display: 'flex', alignItems: 'center', gap: '16px', padding: '12px 16px', borderRadius: '12px', background: '#EFF6FF', color: '#1E40AF', fontWeight: 700, textDecoration: 'none', fontSize: '16px' }}><MessageSquare size={24} /> Groupes</a>
          </nav>
        </div>

        {/* CONTENU CENTRAL */}
        <div style={{ flex: 1, background: '#FFF', width: '100%' }}>
          
          <div style={{ position: 'sticky', top: 0, zIndex: 50, background: 'rgba(255,255,255,0.95)', backdropFilter: 'blur(12px)', borderBottom: '1px solid #E2E8F0', padding: isMobile ? '16px' : '20px 32px', display: 'flex', flexDirection: isMobile ? 'column' : 'row', justifyContent: 'space-between', alignItems: isMobile ? 'flex-start' : 'center', gap: '16px' }}>
            <div style={{ width: '100%' }}>
              <h2 style={{ fontSize: '24px', fontWeight: 800, color: '#0F172A' }}>Les Groupes</h2>
              
              <div style={{ position: 'relative', marginTop: '16px', width: '100%' }}>
                <Search size={18} color="#94A3B8" style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)' }} />
                <input 
                  type="text" 
                  placeholder="Rechercher un groupe..." 
                  value={searchQuery} 
                  onChange={(e) => setSearchQuery(e.target.value)} 
                  style={{ width: '100%', padding: '12px 12px 12px 40px', borderRadius: '50px', border: '1px solid #E2E8F0', background: '#F8FAFC', fontSize: '14px', outline: 'none' }} 
                />
              </div>
            </div>
            
            <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={() => setShowCreate(true)}
              style={{ width: isMobile ? '100%' : 'auto', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: '12px 20px', background: '#F59E0B', color: '#FFF', borderRadius: '12px', fontWeight: 700, fontSize: '15px', boxShadow: '0 4px 15px rgba(245,158,11,0.3)' }}>
              <Plus size={20} /> Créer un groupe
            </motion.button>
          </div>

          <div style={{ padding: isMobile ? '16px' : '32px' }}>
            {filteredGroups.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '60px 20px', background: '#F8FAFC', borderRadius: '24px', border: '1px solid #E2E8F0' }}>
                <Users size={64} color="#CBD5E1" style={{ margin: '0 auto 16px' }} />
                <h3 style={{ fontSize: '20px', fontWeight: 800, color: '#0F172A', marginBottom: '8px' }}>Aucun groupe trouvé</h3>
                <p style={{ color: '#64748B' }}>Essaie un autre mot-clé ou crée ton propre groupe.</p>
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fill, minmax(300px, 1fr))', gap: isMobile ? '12px' : '20px' }}>
                {filteredGroups.map((g) => {
                  const isJoined = myGroups.includes(g.id);
                  return (
                    <motion.div key={g.id} whileHover={{ y: -4, boxShadow: '0 10px 25px rgba(0,0,0,0.05)' }} 
                      style={{ background: '#FFF', padding: '20px', borderRadius: '20px', border: '1px solid #E2E8F0', display: 'flex', flexDirection: 'column' }}>
                      
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
                        {g.avatar_url ? (
                          <img src={g.avatar_url} alt={g.name} style={{ width: '60px', height: '60px', borderRadius: '16px', objectFit: 'cover' }} />
                        ) : (
                          <div style={{ width: '60px', height: '60px', background: 'rgba(245,158,11,0.1)', borderRadius: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <Users size={28} color="#F59E0B" />
                          </div>
                        )}
                        {g.is_private ? <span style={{ background: '#FEF2F2', color: '#EF4444', padding: '4px 10px', borderRadius: '20px', fontSize: '12px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '4px' }}><Lock size={12} /> Privé</span> 
                        : <span style={{ background: '#ECFDF5', color: '#059669', padding: '4px 10px', borderRadius: '20px', fontSize: '12px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '4px' }}><Unlock size={12} /> Public</span>}
                      </div>

                      <h3 style={{ fontSize: '18px', fontWeight: 800, color: '#0F172A', marginBottom: '4px' }}>{g.name}</h3>
                      <p style={{ fontSize: '13px', color: '#64748B', marginBottom: '20px' }}>Créé par {g.profiles?.full_name || 'un étudiant'}</p>
                      
                      <button onClick={() => handleJoinClick(g)} style={{ marginTop: 'auto', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: '12px', background: isJoined ? '#ECFDF5' : '#1E40AF', color: isJoined ? '#059669' : '#FFF', borderRadius: '12px', fontWeight: 700, width: '100%', border: isJoined ? '1px solid #A7F3D0' : 'none', cursor: 'pointer' }}>
                        {isJoined ? <><Check size={16} /> Ouvrir le chat</> : <>Rejoindre <ArrowRight size={16} /></>}
                      </button>
                    </motion.div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* MODAL DE CRÉATION */}
      <AnimatePresence>
        {showCreate && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.6)', backdropFilter: 'blur(4px)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} style={{ background: '#FFF', padding: '24px', borderRadius: '24px', maxWidth: '400px', width: '100%', boxShadow: '0 20px 50px rgba(0,0,0,0.2)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                <h3 style={{ fontSize: '20px', fontWeight: 800, color: '#0F172A' }}>Créer un groupe</h3>
                <button onClick={() => setShowCreate(false)} style={{ background: 'transparent', color: '#64748B' }}><X size={24} /></button>
              </div>

              <form onSubmit={createGroup} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                
                <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '8px' }}>
                  <label style={{ cursor: 'pointer', position: 'relative' }}>
                    <div style={{ width: '80px', height: '80px', borderRadius: '50%', background: '#F8FAFC', border: '2px dashed #CBD5E1', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
                      {groupAvatar ? <img src={URL.createObjectURL(groupAvatar)} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <Camera size={32} color="#94A3B8" />}
                    </div>
                    <div style={{ position: 'absolute', bottom: 0, right: 0, background: '#F59E0B', borderRadius: '50%', padding: '6px', border: '2px solid #FFF' }}>
                      <Plus size={14} color="#FFF" />
                    </div>
                    <input type="file" accept="image/*" onChange={(e) => setGroupAvatar(e.target.files?.[0] || null)} style={{ display: 'none' }} />
                  </label>
                </div>

                <div>
                  <label style={{ fontSize: '13px', fontWeight: 600, color: '#475569', marginBottom: '8px', display: 'block' }}>Nom du groupe</label>
                  <input type="text" required value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex: L3 Droit - Révisions" style={{ width: '100%', padding: '14px', borderRadius: '12px', border: '1px solid #E2E8F0', background: '#F8FAFC', outline: 'none' }} />
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', background: '#F8FAFC', padding: '16px', borderRadius: '12px', border: '1px solid #E2E8F0', cursor: 'pointer' }} onClick={() => setIsPrivate(!isPrivate)}>
                  <input type="checkbox" checked={isPrivate} onChange={() => {}} style={{ width: '20px', height: '20px', accentColor: '#F59E0B' }} />
                  <div>
                    <p style={{ fontSize: '14px', fontWeight: 700, color: '#0F172A' }}>Groupe Privé</p>
                    <p style={{ fontSize: '12px', color: '#64748B' }}>Nécessite un code d'invitation</p>
                  </div>
                </div>

                <button type="submit" disabled={creating} style={{ padding: '16px', background: '#F59E0B', color: '#FFF', borderRadius: '12px', fontWeight: 800, fontSize: '16px', marginTop: '8px', opacity: creating ? 0.7 : 1 }}>
                  {creating ? 'Création...' : 'Créer le groupe'}
                </button>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* MODAL REJOINDRE */}
      <AnimatePresence>
        {joinModal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.6)', backdropFilter: 'blur(4px)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} style={{ background: '#FFF', padding: '24px', borderRadius: '24px', maxWidth: '400px', width: '100%', boxShadow: '0 20px 50px rgba(0,0,0,0.2)', textAlign: 'center' }}>
              <div style={{ width: '64px', height: '64px', background: '#FEF2F2', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
                <Lock size={32} color="#EF4444" />
              </div>
              <h3 style={{ fontSize: '20px', fontWeight: 800, color: '#0F172A', marginBottom: '8px' }}>Groupe Privé</h3>
              <p style={{ fontSize: '14px', color: '#64748B', marginBottom: '24px' }}>Entre le code pour rejoindre <strong>{joinModal.name}</strong>.</p>

              <input type="text" value={inviteCodeInput} onChange={(e) => setInviteCodeInput(e.target.value.toUpperCase())} placeholder="CODE" style={{ width: '100%', padding: '16px', borderRadius: '12px', border: '1px solid #E2E8F0', background: '#F8FAFC', textAlign: 'center', fontWeight: 800, fontSize: '18px', letterSpacing: '2px', marginBottom: '16px', outline: 'none' }} />

              <div style={{ display: 'flex', gap: '12px' }}>
                <button onClick={() => { setJoinModal(null); setInviteCodeInput(''); }} style={{ flex: 1, padding: '14px', background: '#F1F5F9', color: '#0F172A', borderRadius: '12px', fontWeight: 600 }}>Annuler</button>
                <button onClick={() => joinGroup(joinModal.id, inviteCodeInput)} disabled={joining} style={{ flex: 1, padding: '14px', background: '#1E40AF', color: '#FFF', borderRadius: '12px', fontWeight: 700 }}>{joining ? '...' : 'Rejoindre'}</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* BARRE DE NAVIGATION MOBILE */}
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
        <a href="/groupes" className="mobile-nav-item active">
          <MessageSquare size={22} />
        </a>
        <a href="/profile" className="mobile-nav-item">
          <User size={22} />
        </a>
      </div>
    </div>
  );
}