'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { User, MessageSquare, Home, Search, Users, Calendar, Sparkles, LogOut } from 'lucide-react';
import Loader from '@/components/Loader';

export default function MessagesPage() {
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<any>(null);
  const [conversations, setConversations] = useState<any[]>([]);

  useEffect(() => {
    const fetchMessages = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) { window.location.href = '/inscription'; return; }

        const { data: prof } = await supabase.from('profiles').select('*').eq('id', session.user.id).single();
        setProfile(prof);

        // 1. Récupérer TOUS les messages
        const { data: msgs, error: msgsError } = await supabase
          .from('messages')
          .select('*')
          .or(`sender_id.eq.${session.user.id},receiver_id.eq.${session.user.id}`)
          .order('created_at', { ascending: false });

        if (msgsError || !msgs) {
          setLoading(false);
          return;
        }

        // 2. Trouver les IDs des autres
        const otherUserIds = new Set<string>();
        msgs.forEach(msg => {
          if (msg.sender_id !== session.user.id && msg.sender_id) otherUserIds.add(msg.sender_id);
          if (msg.receiver_id !== session.user.id && msg.receiver_id) otherUserIds.add(msg.receiver_id);
        });

        // 3. Récupérer les profils
        const { data: profilesData } = await supabase
          .from('profiles')
          .select('id, full_name, avatar_url')
          .in('id', Array.from(otherUserIds));

        // 4. Fusionner
        const conversationsMap = new Map();
        
        msgs.forEach(msg => {
          const isSender = msg.sender_id === session.user.id;
          const otherUserId = isSender ? msg.receiver_id : msg.sender_id;
          
          // SÉCURITÉ : On ignore le message si l'autre ID est vide
          if (!otherUserId) return; 

          if (!conversationsMap.has(otherUserId)) {
            const otherProfile = profilesData?.find(p => p.id === otherUserId);
            
            // On crée la conversation
            conversationsMap.set(otherUserId, {
              id: String(otherUserId), // On force en texte
              full_name: otherProfile?.full_name || 'Étudiant inconnu',
              avatar_url: otherProfile?.avatar_url,
              lastMessage: msg.content || 'Fichier',
              date: msg.created_at
            });
          }
        });
        
        setConversations(Array.from(conversationsMap.values()));
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchMessages();
  }, []);

  const logout = async () => {
    await supabase.auth.signOut();
    window.location.href = '/';
  };

  if (loading) return <Loader text="Chargement des messages..." />;

  return (
    <div style={{ minHeight: '100vh', background: '#F8FAFC', display: 'flex', justifyContent: 'center' }}>
      <div style={{ display: 'flex', width: '100%', maxWidth: '1300px' }}>
        
        {/* SIDEBAR GAUCHE */}
        <div style={{ width: '260px', padding: '20px', borderRight: '1px solid #E2E8F0', display: 'flex', flexDirection: 'column', position: 'sticky', top: 0, height: '100vh', background: '#F8FAFC' }}>
          <h1 style={{ fontSize: '28px', fontWeight: 800, color: '#0F172A', marginBottom: '32px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{ width: '32px', height: '32px', background: '#F59E0B', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#FFF', fontSize: '18px' }}>S</div>
            StudyCI
          </h1>

          <nav style={{ display: 'flex', flexDirection: 'column', gap: '8px', flex: 1 }}>
            <a href="/" style={{ display: 'flex', alignItems: 'center', gap: '16px', padding: '12px 16px', borderRadius: '12px', color: '#334155', fontWeight: 600, textDecoration: 'none', fontSize: '16px' }}><Home size={24} /> Accueil</a>
            <a href="/search" style={{ display: 'flex', alignItems: 'center', gap: '16px', padding: '12px 16px', borderRadius: '12px', color: '#334155', fontWeight: 600, textDecoration: 'none', fontSize: '16px' }}><Search size={24} /> Annales</a>
            <a href="/reseau" style={{ display: 'flex', alignItems: 'center', gap: '16px', padding: '12px 16px', borderRadius: '12px', color: '#334155', fontWeight: 600, textDecoration: 'none', fontSize: '16px' }}><Users size={24} /> Réseau</a>
            <a href="/messages" style={{ display: 'flex', alignItems: 'center', gap: '16px', padding: '12px 16px', borderRadius: '12px', background: '#EFF6FF', color: '#1E40AF', fontWeight: 700, textDecoration: 'none', fontSize: '16px' }}><MessageSquare size={24} /> Messages</a>
            <a href="/groupes" style={{ display: 'flex', alignItems: 'center', gap: '16px', padding: '12px 16px', borderRadius: '12px', color: '#334155', fontWeight: 600, textDecoration: 'none', fontSize: '16px' }}><Users size={24} /> Groupes</a>
            <a href="/planning" style={{ display: 'flex', alignItems: 'center', gap: '16px', padding: '12px 16px', borderRadius: '12px', color: '#334155', fontWeight: 600, textDecoration: 'none', fontSize: '16px' }}><Calendar size={24} /> Planning</a>
            <a href="/mon-ia" style={{ display: 'flex', alignItems: 'center', gap: '16px', padding: '12px 16px', borderRadius: '12px', color: '#334155', fontWeight: 600, textDecoration: 'none', fontSize: '16px' }}><Sparkles size={24} color="#8B5CF6" /> Mon IA</a>
          </nav>

          <div style={{ borderTop: '1px solid #E2E8F0', paddingTop: '16px', marginTop: 'auto' }}>
            <a href="/profile" style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px', borderRadius: '12px', background: '#FFF', border: '1px solid #E2E8F0', textDecoration: 'none', marginBottom: '12px' }}>
              {profile?.avatar_url ? <img src={profile.avatar_url} style={{ width: '40px', height: '40px', borderRadius: '50%' }} /> : <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: '#F1F5F9', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><User size={20} color="#94A3B8" /></div>}
              <div style={{ flex: 1, overflow: 'hidden' }}>
                <p style={{ fontSize: '14px', fontWeight: 700, color: '#0F172A', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{profile?.full_name || 'Mon Profil'}</p>
                <p style={{ fontSize: '12px', color: '#64748B' }}>{profile?.level || 'Étudiant'}</p>
              </div>
            </a>
            <button onClick={logout} style={{ width: '100%', display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 16px', borderRadius: '12px', background: 'transparent', color: '#EF4444', fontWeight: 600, fontSize: '16px' }}><LogOut size={24} /> Déconnexion</button>
          </div>
        </div>

        {/* CONTENU CENTRAL */}
        <div style={{ flex: 1, padding: '32px', maxWidth: '800px' }}>
          <h2 style={{ fontSize: '24px', fontWeight: 800, color: '#0F172A', marginBottom: '24px' }}>Mes Messages</h2>
          
          {conversations.length === 0 ? (
            <div style={{ background: '#FFF', padding: '40px', borderRadius: '24px', textAlign: 'center', border: '1px solid #E2E8F0' }}>
              <MessageSquare size={48} color="#CBD5E1" style={{ margin: '0 auto 16px' }} />
              <p style={{ color: '#64748B', fontSize: '16px' }}>Aucune conversation pour le moment.</p>
              <a href="/reseau" style={{ display: 'inline-block', marginTop: '16px', color: '#1E40AF', fontWeight: 600, textDecoration: 'none' }}>Trouver des étudiants à contacter</a>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {conversations.map((contact) => (
                <a key={contact.id} href={`/chat/${contact.id}`} style={{ display: 'flex', alignItems: 'center', gap: '16px', padding: '16px', background: '#FFF', borderRadius: '16px', border: '1px solid #E2E8F0', textDecoration: 'none', transition: 'all 0.2s' }}>
                  {contact.avatar_url ? <img src={contact.avatar_url} style={{ width: '50px', height: '50px', borderRadius: '50%' }} /> : <div style={{ width: '50px', height: '50px', borderRadius: '50%', background: '#F1F5F9', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><User size={24} color="#94A3B8" /></div>}
                  <div style={{ flex: 1 }}>
                    <p style={{ fontWeight: 700, color: '#0F172A', fontSize: '16px' }}>{contact.full_name}</p>
                    <p style={{ fontSize: '14px', color: '#64748B', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '400px' }}>{contact.lastMessage}</p>
                  </div>
                  <p style={{ fontSize: '12px', color: '#94A3B8' }}>{new Date(contact.date).toLocaleDateString()}</p>
                </a>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}