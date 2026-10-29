'use client';

import { useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '@/lib/supabase';
import { Users, Plus, Lock, Unlock, Send, ArrowLeft, X, User as UserIcon, MessageSquare } from 'lucide-react';
import Loader from '@/components/Loader';
import Toast from '@/components/Toast';

export default function GroupesPage() {
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<any>(null);
  const [groups, setGroups] = useState<any[]>([]);
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error'; show: boolean }>({ msg: '', type: 'success', show: false });

  // ÉTATS POUR LA CRÉATION
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');
  const [newGroupDesc, setNewGroupDesc] = useState('');
  const [newGroupPrivate, setNewGroupPrivate] = useState(false);
  const [creating, setCreating] = useState(false);

  // ÉTATS POUR LE CHAT DE GROUPE
  const [activeGroup, setActiveGroup] = useState<any>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const showToast = (msg: string, type: 'success' | 'error') => {
    setToast({ msg, type, show: true });
    setTimeout(() => setToast(t => ({ ...t, show: false })), 3000);
  };

  useEffect(() => {
    const fetchData = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { window.location.href = '/inscription'; return; }

      const { data: prof } = await supabase.from('profiles').select('*').eq('id', session.user.id).single();
      setProfile(prof);

      const { data: allGroups } = await supabase.from('groups').select('*').order('created_at', { ascending: false });
      setGroups(allGroups || []);
      
      setLoading(false);
    };
    fetchData();
  }, []);

  // --- CHARGER LES MESSAGES D'UN GROUPE ---
  useEffect(() => {
    if (!activeGroup) return;

    const loadMessages = async () => {
      const { data } = await supabase
        .from('group_messages')
        .select('*, profiles(full_name, avatar_url)')
        .eq('group_id', activeGroup.id)
        .order('created_at', { ascending: true });
      setMessages(data || []);
      setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
    };

    loadMessages();

    // TEMPS RÉEL
    const channel = supabase.channel(`group_${activeGroup.id}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'group_messages', filter: `group_id=eq.${activeGroup.id}` }, () => {
        loadMessages();
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [activeGroup]);

  const createGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newGroupName.trim() || !profile) return;
    setCreating(true);

    try {
      const code = newGroupPrivate ? Math.random().toString(36).substring(2, 8).toUpperCase() : null;
      
      const { data, error } = await supabase.from('groups').insert({
        name: newGroupName.trim(),
        description: newGroupDesc.trim(),
        creator_id: profile.id,
        is_private: newGroupPrivate,
        invite_code: code
      }).select().single();

      if (error) throw error;

      setGroups([data, ...groups]);
      setShowCreateModal(false);
      setNewGroupName('');
      setNewGroupDesc('');
      setNewGroupPrivate(false);
      
      if (code) {
        showToast(`Groupe créé ! Code : ${code}`, 'success');
      } else {
        showToast('Groupe public créé !', 'success');
      }

    } catch (err: any) {
      showToast("Erreur : " + err.message, 'error');
    } finally {
      setCreating(false);
    }
  };

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !profile || !activeGroup) return;

    const msgText = newMessage.trim();
    setNewMessage('');

    await supabase.from('group_messages').insert({
      group_id: activeGroup.id,
      sender_id: profile.id,
      content: msgText
    });
  };

  if (loading) return <Loader text="Chargement des groupes..." />;

  return (
    <div style={{ minHeight: '100vh', background: '#F8FAFC' }}>
      <Toast message={toast.msg} type={toast.type} show={toast.show} />

      {activeGroup ? (
        /* --- VUE CHAT DU GROUPE --- */
        <div style={{ maxWidth: '800px', margin: '0 auto', height: '100vh', display: 'flex', flexDirection: 'column', background: '#FFF', borderLeft: '1px solid #E2E8F0', borderRight: '1px solid #E2E8F0' }}>
          
          {/* Header Chat */}
          <div style={{ padding: '16px 24px', borderBottom: '1px solid #E2E8F0', display: 'flex', alignItems: 'center', gap: '16px', background: '#FFF' }}>
            <button onClick={() => setActiveGroup(null)} style={{ background: 'transparent', color: '#F59E0B', display: 'flex' }}><ArrowLeft size={24} /></button>
            <div style={{ flex: 1 }}>
              <h2 style={{ fontSize: '20px', fontWeight: 800, color: '#0F172A' }}>{activeGroup.name}</h2>
              <p style={{ fontSize: '13px', color: '#64748B' }}>{activeGroup.description || 'Discussion de groupe'}</p>
            </div>
            {activeGroup.is_private ? <Lock size={20} color="#EF4444" /> : <Unlock size={20} color="#10B981" />}
          </div>

          {/* Messages */}
          <div style={{ flex: 1, padding: '24px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '16px', background: '#F8FAFC' }}>
            {messages.length === 0 ? (
              <p style={{ textAlign: 'center', color: '#94A3B8', fontStyle: 'italic', marginTop: '20px' }}>Soyez le premier à envoyer un message !</p>
            ) : (
              messages.map((msg) => {
                const isMine = msg.sender_id === profile.id;
                return (
                  <div key={msg.id} style={{ display: 'flex', gap: '12px', flexDirection: isMine ? 'row-reverse' : 'row' }}>
                    {msg.profiles?.avatar_url ? <img src={msg.profiles.avatar_url} style={{ width: '36px', height: '36px', borderRadius: '50%' }} /> : <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: '#E2E8F0', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><UserIcon size={18} color="#64748B" /></div>}
                    <div style={{ background: isMine ? '#1E40AF' : '#FFF', color: isMine ? '#FFF' : '#0F172A', padding: '12px 16px', borderRadius: '16px', borderBottomRightRadius: isMine ? '4px' : '16px', borderBottomLeftRadius: isMine ? '16px' : '4px', border: isMine ? 'none' : '1px solid #E2E8F0', maxWidth: '70%' }}>
                      {!isMine && <p style={{ fontSize: '12px', fontWeight: 700, color: '#64748B', marginBottom: '4px' }}>{msg.profiles?.full_name}</p>}
                      <p style={{ fontSize: '15px', lineHeight: 1.4 }}>{msg.content}</p>
                    </div>
                  </div>
                );
              })
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input Chat */}
          <div style={{ padding: '16px 24px', background: '#FFF', borderTop: '1px solid #E2E8F0' }}>
            <form onSubmit={sendMessage} style={{ display: 'flex', gap: '12px' }}>
              <input value={newMessage} onChange={(e) => setNewMessage(e.target.value)} placeholder="Écris un message..." style={{ flex: 1, padding: '14px 20px', borderRadius: '30px', border: '1px solid #E2E8F0', background: '#F8FAFC', outline: 'none', fontSize: '15px' }} />
              <button type="submit" disabled={!newMessage.trim()} style={{ width: '48px', height: '48px', borderRadius: '50%', background: '#F59E0B', color: '#FFF', display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: !newMessage.trim() ? 0.5 : 1 }}><Send size={20} /></button>
            </form>
          </div>
        </div>
      ) : (
        /* --- VUE LISTE DES GROUPES --- */
        <div style={{ maxWidth: '900px', margin: '0 auto', padding: '40px 24px' }}>
          
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
            <h1 style={{ fontSize: '36px', fontWeight: 800, color: '#0F172A', letterSpacing: '-1px' }}>Groupes d'étude</h1>
            <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={() => setShowCreateModal(true)} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '12px 24px', background: '#F59E0B', color: '#FFF', borderRadius: '50px', fontWeight: 700, fontSize: '15px', boxShadow: '0 4px 15px rgba(245,158,11,0.3)' }}>
              <Plus size={20} /> Créer un groupe
            </motion.button>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '20px' }}>
            {groups.length === 0 ? (
              <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '60px', background: '#FFF', borderRadius: '24px', border: '1px solid #E2E8F0' }}>
                <Users size={64} color="#CBD5E1" style={{ margin: '0 auto 16px' }} />
                <h3 style={{ fontSize: '20px', fontWeight: 800, color: '#0F172A', marginBottom: '8px' }}>Aucun groupe pour le moment</h3>
                <p style={{ color: '#64748B' }}>Crée le premier groupe d'étude de StudyCI !</p>
              </div>
            ) : (
              groups.map(g => (
                <motion.div key={g.id} whileHover={{ y: -5 }} onClick={() => setActiveGroup(g)} style={{ background: '#FFF', padding: '24px', borderRadius: '20px', border: '1px solid #E2E8F0', cursor: 'pointer', display: 'flex', flexDirection: 'column', gap: '12px', boxShadow: '0 4px 15px rgba(0,0,0,0.02)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div style={{ width: '48px', height: '48px', background: 'rgba(245,158,11,0.1)', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <Users size={24} color="#F59E0B" />
                    </div>
                    {g.is_private ? <Lock size={18} color="#EF4444" /> : <Unlock size={18} color="#10B981" />}
                  </div>
                  <div>
                    <h3 style={{ fontSize: '18px', fontWeight: 800, color: '#0F172A', marginBottom: '4px' }}>{g.name}</h3>
                    <p style={{ fontSize: '14px', color: '#64748B', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{g.description || 'Aucune description'}</p>
                  </div>
                  <div style={{ marginTop: 'auto', paddingTop: '16px', borderTop: '1px solid #F1F5F9', display: 'flex', alignItems: 'center', gap: '8px', color: '#1E40AF', fontWeight: 700, fontSize: '14px' }}>
                    <MessageSquare size={16} /> Ouvrir la discussion
                  </div>
                </motion.div>
              ))
            )}
          </div>
        </div>
      )}

      {/* --- MODAL CRÉATION DE GROUPE --- */}
      <AnimatePresence>
        {showCreateModal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.8)', zIndex: 999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
            <motion.div initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} style={{ background: '#FFF', borderRadius: '24px', width: '100%', maxWidth: '450px', overflow: 'hidden' }}>
              <div style={{ padding: '20px 24px', borderBottom: '1px solid #E2E8F0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h3 style={{ fontSize: '20px', fontWeight: 800, color: '#0F172A' }}>Créer un groupe</h3>
                <button onClick={() => setShowCreateModal(false)} style={{ background: 'transparent', color: '#64748B' }}><X size={24} /></button>
              </div>
              <form onSubmit={createGroup} style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div>
                  <label style={{ fontSize: '13px', fontWeight: 600, color: '#475569', marginBottom: '8px', display: 'block' }}>Nom du groupe</label>
                  <input type="text" required value={newGroupName} onChange={(e) => setNewGroupName(e.target.value)} placeholder="Ex: Révisions Droit L2" style={{ width: '100%', padding: '14px', borderRadius: '12px', border: '1px solid #E2E8F0', background: '#F8FAFC', outline: 'none' }} />
                </div>
                <div>
                  <label style={{ fontSize: '13px', fontWeight: 600, color: '#475569', marginBottom: '8px', display: 'block' }}>Description (Optionnel)</label>
                  <textarea value={newGroupDesc} onChange={(e) => setNewGroupDesc(e.target.value)} placeholder="De quoi allez-vous parler ?" rows={3} style={{ width: '100%', padding: '14px', borderRadius: '12px', border: '1px solid #E2E8F0', background: '#F8FAFC', outline: 'none', resize: 'none' }} />
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '16px', background: '#F8FAFC', borderRadius: '12px', border: '1px solid #E2E8F0' }}>
                  <input type="checkbox" id="private" checked={newGroupPrivate} onChange={(e) => setNewGroupPrivate(e.target.checked)} style={{ width: '20px', height: '20px', accentColor: '#F59E0B' }} />
                  <label htmlFor="private" style={{ flex: 1, fontSize: '14px', fontWeight: 600, color: '#0F172A', cursor: 'pointer' }}>
                    Groupe privé
                    <p style={{ fontSize: '12px', color: '#64748B', fontWeight: 400, marginTop: '2px' }}>Un code d'invitation sera généré.</p>
                  </label>
                </div>
                <button type="submit" disabled={creating || !newGroupName.trim()} style={{ padding: '16px', background: '#1E40AF', color: '#FFF', borderRadius: '12px', fontWeight: 700, fontSize: '16px', marginTop: '8px', opacity: (creating || !newGroupName.trim()) ? 0.5 : 1 }}>
                  {creating ? 'Création...' : 'Créer le groupe'}
                </button>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}