'use client';

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '@/lib/supabase';
import { Users, Search, Plus, Lock, Unlock, MessageSquare, ArrowRight, X, Check } from 'lucide-react';
import Loader from '@/components/Loader';
import Toast from '@/components/Toast';

export default function GroupesPage() {
  const [loading, setLoading] = useState(true);
  const [me, setMe] = useState<any>(null);
  const [groups, setGroups] = useState<any[]>([]);
  const [myGroups, setMyGroups] = useState<string[]>([]); // ID des groupes déjà rejoints
  
  const [showCreate, setShowCreate] = useState(false);
  const [joinModal, setJoinModal] = useState<any>(null); // Groupe à rejoindre
  const [inviteCodeInput, setInviteCodeInput] = useState('');
  const [joining, setJoining] = useState(false);

  // Formulaire de création
  const [name, setName] = useState('');
  const [isPrivate, setIsPrivate] = useState(false);
  const [creating, setCreating] = useState(false);

  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error'; show: boolean }>({ msg: '', type: 'success', show: false });

  const showToast = (msg: string, type: 'success' | 'error') => {
    setToast({ msg, type, show: true });
    setTimeout(() => setToast(t => ({ ...t, show: false })), 3000);
  };

  const loadData = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (session) {
      const { data: prof } = await supabase.from('profiles').select('*').eq('id', session.user.id).single();
      setMe(prof);

      // Charger mes groupes
      const { data: memberships } = await supabase.from('group_members').select('group_id').eq('user_id', session.user.id);
      if (memberships) setMyGroups(memberships.map(m => m.group_id));
    }

    // Charger tous les groupes
    const { data } = await supabase.from('groups').select('*').order('created_at', { ascending: false });
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
      const inviteCode = isPrivate ? Math.random().toString(36).substring(2, 8).toUpperCase() : null;

      const { data: newGroup, error } = await supabase.from('groups').insert({
        name: name.trim(),
        creator_id: me.id,
        is_private: isPrivate,
        invite_code: inviteCode
      }).select().single();

      if (error) throw error;

      // Le créateur rejoint automatiquement le groupe
      if (newGroup) {
        await supabase.from('group_members').insert({ group_id: newGroup.id, user_id: me.id });
      }

      showToast('Groupe créé avec succès !', 'success');
      setShowCreate(false);
      setName('');
      setIsPrivate(false);
      loadData();

    } catch (err: any) {
      showToast("Erreur : " + err.message, 'error');
    } finally {
      setCreating(false);
    }
  };

  const handleJoinClick = (group: any) => {
    if (myGroups.includes(group.id)) {
      // Déjà membre, on ouvre le chat du groupe (à implémenter plus tard)
      showToast("Tu es déjà membre de ce groupe !", 'success');
      return;
    }

    if (group.is_private) {
      setJoinModal(group); // Demander le code
    } else {
      joinGroup(group.id, null); // Rejoindre direct
    }
  };

  const joinGroup = async (groupId: string, code: string | null) => {
    if (!me) return;
    setJoining(true);

    try {
      const group = groups.find(g => g.id === groupId);

      // Vérifier le code si privé
      if (group?.is_private && code !== group.invite_code) {
        throw new Error("Code d'invitation incorrect.");
      }

      const { error } = await supabase.from('group_members').insert({
        group_id: groupId,
        user_id: me.id
      });

      if (error) {
        if (error.code === '23505') throw new Error("Tu as déjà rejoint ce groupe.");
        throw error;
      }

      showToast('Tu as rejoint le groupe !', 'success');
      setJoinModal(null);
      setInviteCodeInput('');
      loadData();

    } catch (err: any) {
      showToast(err.message, 'error');
    } finally {
      setJoining(false);
    }
  };

  if (loading) return <Loader text="Chargement des groupes..." />;

  return (
    <div style={{ minHeight: '100vh', background: '#F8FAFC', display: 'flex', justifyContent: 'center' }}>
      <Toast message={toast.msg} type={toast.type} show={toast.show} />

      <div style={{ display: 'flex', width: '100%', maxWidth: '1300px' }}>
        
        {/* SIDEBAR GAUCHE */}
        <div style={{ width: '260px', padding: '20px', borderRight: '1px solid #E2E8F0', display: 'flex', flexDirection: 'column', position: 'sticky', top: 0, height: '100vh', background: '#F8FAFC' }}>
          <h1 style={{ fontSize: '28px', fontWeight: 800, color: '#0F172A', marginBottom: '32px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{ width: '32px', height: '32px', background: '#F59E0B', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#FFF', fontSize: '18px' }}>S</div>
            StudyCI
          </h1>

          <nav style={{ display: 'flex', flexDirection: 'column', gap: '8px', flex: 1 }}>
            <a href="/" style={{ display: 'flex', alignItems: 'center', gap: '16px', padding: '12px 16px', borderRadius: '12px', color: '#334155', fontWeight: 600, textDecoration: 'none', fontSize: '16px' }}><Users size={24} /> Accueil</a>
            <a href="/search" style={{ display: 'flex', alignItems: 'center', gap: '16px', padding: '12px 16px', borderRadius: '12px', color: '#334155', fontWeight: 600, textDecoration: 'none', fontSize: '16px' }}><Search size={24} /> Annales</a>
            <a href="/reseau" style={{ display: 'flex', alignItems: 'center', gap: '16px', padding: '12px 16px', borderRadius: '12px', color: '#334155', fontWeight: 600, textDecoration: 'none', fontSize: '16px' }}><Users size={24} /> Réseau</a>
            <a href="/groupes" style={{ display: 'flex', alignItems: 'center', gap: '16px', padding: '12px 16px', borderRadius: '12px', background: '#EFF6FF', color: '#1E40AF', fontWeight: 700, textDecoration: 'none', fontSize: '16px' }}><MessageSquare size={24} /> Groupes</a>
          </nav>
        </div>

        {/* CONTENU CENTRAL */}
        <div style={{ flex: 1, background: '#FFF' }}>
          
          <div style={{ position: 'sticky', top: 0, zIndex: 50, background: 'rgba(255,255,255,0.95)', backdropFilter: 'blur(12px)', borderBottom: '1px solid #E2E8F0', padding: '20px 32px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <h2 style={{ fontSize: '24px', fontWeight: 800, color: '#0F172A' }}>Les Groupes</h2>
              <p style={{ fontSize: '14px', color: '#64748B', marginTop: '4px' }}>Rejoins ou crée des groupes d'étude par filière.</p>
            </div>
            <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={() => setShowCreate(true)}
              style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '12px 20px', background: '#F59E0B', color: '#FFF', borderRadius: '12px', fontWeight: 700, fontSize: '15px', boxShadow: '0 4px 15px rgba(245,158,11,0.3)' }}>
              <Plus size={20} /> Créer un groupe
            </motion.button>
          </div>

          <div style={{ padding: '32px' }}>
            {groups.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '60px 20px', background: '#F8FAFC', borderRadius: '24px', border: '1px solid #E2E8F0' }}>
                <Users size={64} color="#CBD5E1" style={{ margin: '0 auto 16px' }} />
                <h3 style={{ fontSize: '20px', fontWeight: 800, color: '#0F172A', marginBottom: '8px' }}>Aucun groupe pour l'instant</h3>
                <p style={{ color: '#64748B' }}>Sois le premier à créer un groupe d'étude !</p>
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '20px' }}>
                {groups.map((g) => {
                  const isJoined = myGroups.includes(g.id);
                  return (
                    <motion.div key={g.id} whileHover={{ y: -4, boxShadow: '0 10px 25px rgba(0,0,0,0.05)' }} 
                      style={{ background: '#FFF', padding: '24px', borderRadius: '20px', border: '1px solid #E2E8F0', display: 'flex', flexDirection: 'column' }}>
                      
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
                        <div style={{ width: '50px', height: '50px', background: 'rgba(245,158,11,0.1)', borderRadius: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <Users size={24} color="#F59E0B" />
                        </div>
                        {g.is_private ? <span style={{ background: '#FEF2F2', color: '#EF4444', padding: '4px 10px', borderRadius: '20px', fontSize: '12px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '4px' }}><Lock size={12} /> Privé</span> 
                        : <span style={{ background: '#ECFDF5', color: '#059669', padding: '4px 10px', borderRadius: '20px', fontSize: '12px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '4px' }}><Unlock size={12} /> Public</span>}
                      </div>

                      <h3 style={{ fontSize: '18px', fontWeight: 800, color: '#0F172A', marginBottom: '8px' }}>{g.name}</h3>
                      <p style={{ fontSize: '13px', color: '#64748B', marginBottom: '20px' }}>Crée par un étudiant</p>
                      
                      <button onClick={() => handleJoinClick(g)} disabled={isJoined} style={{ marginTop: 'auto', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: '12px', background: isJoined ? '#ECFDF5' : '#1E40AF', color: isJoined ? '#059669' : '#FFF', borderRadius: '12px', fontWeight: 700, width: '100%', border: isJoined ? '1px solid #A7F3D0' : 'none' }}>
                        {isJoined ? <><Check size={16} /> Déjà membre</> : <>Rejoindre <ArrowRight size={16} /></>}
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
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} style={{ background: '#FFF', padding: '32px', borderRadius: '24px', maxWidth: '400px', width: '100%', boxShadow: '0 20px 50px rgba(0,0,0,0.2)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                <h3 style={{ fontSize: '20px', fontWeight: 800, color: '#0F172A' }}>Créer un groupe</h3>
                <button onClick={() => setShowCreate(false)} style={{ background: 'transparent', color: '#64748B' }}><X size={24} /></button>
              </div>

              <form onSubmit={createGroup} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
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

      {/* MODAL REJOINDRE (CODE D'INVITATION) */}
      <AnimatePresence>
        {joinModal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.6)', backdropFilter: 'blur(4px)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} style={{ background: '#FFF', padding: '32px', borderRadius: '24px', maxWidth: '400px', width: '100%', boxShadow: '0 20px 50px rgba(0,0,0,0.2)', textAlign: 'center' }}>
              <div style={{ width: '64px', height: '64px', background: '#FEF2F2', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
                <Lock size={32} color="#EF4444" />
              </div>
              <h3 style={{ fontSize: '20px', fontWeight: 800, color: '#0F172A', marginBottom: '8px' }}>Groupe Privé</h3>
              <p style={{ fontSize: '14px', color: '#64748B', marginBottom: '24px' }}>Entre le code d'invitation pour rejoindre <strong>{joinModal.name}</strong>.</p>

              <input type="text" value={inviteCodeInput} onChange={(e) => setInviteCodeInput(e.target.value.toUpperCase())} placeholder="CODE D'INVITATION" style={{ width: '100%', padding: '16px', borderRadius: '12px', border: '1px solid #E2E8F0', background: '#F8FAFC', textAlign: 'center', fontWeight: 800, fontSize: '18px', letterSpacing: '2px', marginBottom: '16px', outline: 'none' }} />

              <div style={{ display: 'flex', gap: '12px' }}>
                <button onClick={() => { setJoinModal(null); setInviteCodeInput(''); }} style={{ flex: 1, padding: '14px', background: '#F1F5F9', color: '#0F172A', borderRadius: '12px', fontWeight: 600 }}>Annuler</button>
                <button onClick={() => joinGroup(joinModal.id, inviteCodeInput)} disabled={joining} style={{ flex: 1, padding: '14px', background: '#1E40AF', color: '#FFF', borderRadius: '12px', fontWeight: 700 }}>{joining ? '...' : 'Rejoindre'}</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}