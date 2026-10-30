'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { User, MessageSquare, Home, Search, Users, Calendar, Sparkles, LogOut, PenSquare, Plus } from 'lucide-react';
import Loader from '@/components/Loader';

export default function MessagesPage() {
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<any>(null);
  const [conversations, setConversations] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeStoryUsers, setActiveStoryUsers] = useState<any[]>([]);

  useEffect(() => {
    const fetchMessages = async () => {
      try {
        // 1. Session & Profil
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) { window.location.href = '/inscription'; return; }
        
        await supabase.from('profiles').update({ last_seen: new Date().toISOString() }).eq('id', session.user.id);
        const { data: prof } = await supabase.from('profiles').select('*').eq('id', session.user.id).single();
        setProfile(prof);

        // 2. Récupérer les stories actives (moins de 24h)
        const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
        const { data: storiesData } = await supabase
          .from('stories')
          .select('user_id, profiles(id, full_name, avatar_url, last_seen)')
          .gte('created_at', oneDayAgo);

        if (storiesData) {
          const uniqueStoryUsers = Array.from(new Map(storiesData.map(s => [s.user_id, s.profiles])).values());
          setActiveStoryUsers(uniqueStoryUsers);
        }

        // 3. Récupérer tous les messages
        const { data: msgs } = await supabase
          .from('messages')
          .select('*')
          .or(`sender_id.eq.${session.user.id},receiver_id.eq.${session.user.id}`)
          .order('created_at', { ascending: false });

        if (!msgs || msgs.length === 0) {
          setConversations([]);
          setLoading(false);
          return;
        }

        // 4. Récupérer les profils des interlocuteurs
        const otherUserIds = new Set<string>();
        msgs.forEach(msg => {
          if (msg.sender_id !== session.user.id) otherUserIds.add(msg.sender_id);
          if (msg.receiver_id !== session.user.id) otherUserIds.add(msg.receiver_id);
        });

        const { data: profilesData } = await supabase
          .from('profiles')
          .select('id, full_name, avatar_url, last_seen')
          .in('id', Array.from(otherUserIds));

        // 5. Grouper par conversation
        const conversationsMap = new Map();
        
        msgs.forEach(msg => {
          const otherUserId = msg.sender_id === session.user.id ? msg.receiver_id : msg.sender_id;
          if (!otherUserId) return; 

          if (!conversationsMap.has(otherUserId)) {
            const otherProfile = profilesData?.find(p => p.id === otherUserId);
            
            conversationsMap.set(otherUserId, {
              id: otherUserId,
              full_name: otherProfile?.full_name || 'Étudiant',
              avatar_url: otherProfile?.avatar_url,
              last_seen: otherProfile?.last_seen,
              lastMessage: msg.content || (msg.file_url ? '📎 Fichier' : 'Message'),
              date: msg.created_at,
              isMine: msg.sender_id === session.user.id,
              unread: (msg.receiver_id === session.user.id && msg.is_read === false) ? 1 : 0
            });
          } else {
             if (msg.receiver_id === session.user.id && msg.is_read === false) {
               const conv = conversationsMap.get(otherUserId);
               conv.unread += 1;
             }
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

    const channel = supabase.channel('messages_page_updates')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'messages' }, () => {
        fetchMessages(); 
      })
      .subscribe();

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') fetchMessages();
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    return () => { 
      supabase.removeChannel(channel); 
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  const logout = async () => {
    await supabase.auth.signOut();
    window.location.href = '/';
  };

  // 🕒 Fonction pour formater le temps écoulé depuis la dernière déconnexion
  const formatLastSeen = (lastSeen: string) => {
    if (!lastSeen) return 'Hors ligne';
    
    const date = new Date(lastSeen);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    
    const diffSecs = Math.floor(diffMs / 1000);
    const diffMins = Math.floor(diffSecs / 60);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);
    
    // Si moins de 5 minutes, on considère "En ligne" (géré en amont généralement mais par sécurité)
    if (diffMins < 5) return 'En ligne';
    if (diffMins < 60) return `Il y a ${diffMins} min`;
    if (diffHours < 24) return `Il y a ${diffHours}h`;
    if (diffDays === 1) return `Il y a hier`;
    return `Il y a ${diffDays} jours`;
  };

  const isUserOnline = (lastSeen: string) => {
    if (!lastSeen) return false;
    const diff = new Date().getTime() - new Date(lastSeen).getTime();
    return diff < 5 * 60 * 1000;
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
    if (diffDays === 1) return 'Hier';
    if (diffDays < 7) return date.toLocaleDateString('fr-FR', { weekday: 'short' });
    return date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
  };

  const filteredConversations = conversations.filter(c => 
    c.full_name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (loading) return <Loader text="Chargement des messages..." />;

  return (
    <div style={{ minHeight: '100vh', background: '#FFFFFF', display: 'flex', justifyContent: 'center' }}>
      <div className="main-content-layout" style={{ display: 'flex', width: '100%', maxWidth: '1300px' }}>
        
        {/* --- SIDEBAR GAUCHE (Desktop) --- */}
        <div className="sidebar-desktop" style={{ width: '260px', padding: '20px', borderRight: '1px solid #E2E8F0', display: 'flex', flexDirection: 'column', position: 'sticky', top: 0, height: '100vh', background: '#FFF' }}>
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

        {/* --- CONTENU CENTRAL --- */}
        <div style={{ flex: 1, background: '#FFF', display: 'flex', flexDirection: 'column', height: '100vh', overflow: 'hidden' }}>
          
          {/* HEADER */}
          <div style={{ padding: '20px 24px', borderBottom: '1px solid #E2E8F0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#FFF' }}>
            <h2 style={{ fontSize: '24px', fontWeight: 800, color: '#0F172A' }}>Messagerie</h2>
            
            <a href="/reseau" style={{ display: 'flex', alignItems: 'center', gap: '8px', background: '#F59E0B', color: '#FFF', padding: '10px 16px', borderRadius: '12px', fontWeight: 700, fontSize: '14px', border: 'none', cursor: 'pointer', textDecoration: 'none' }}>
              <PenSquare size={18} /> Nouveau
            </a>
          </div>

          {/* BARRE DE STORIES */}
          <div style={{ padding: '16px 24px', borderBottom: '1px solid #E2E8F0', overflowX: 'auto', display: 'flex', gap: '16px', alignItems: 'center', background: '#FFF' }}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px', cursor: 'pointer', flexShrink: 0 }}>
              <div style={{ position: 'relative' }}>
                {profile?.avatar_url ? (
                  <img src={profile.avatar_url} style={{ width: '60px', height: '60px', borderRadius: '50%', objectFit: 'cover', border: '2px solid #FFF' }} />
                ) : (
                  <div style={{ width: '60px', height: '60px', borderRadius: '50%', background: '#F1F5F9', border: '1px solid #E2E8F0', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <User size={24} color="#94A3B8" />
                  </div>
                )}
                <div style={{ position: 'absolute', bottom: '0', right: '0', background: '#3B82F6', borderRadius: '50%', padding: '2px', border: '2px solid #FFF' }}>
                  <Plus size={12} color="#FFF" />
                </div>
              </div>
              <p style={{ fontSize: '11px', color: '#64748B', fontWeight: 600 }}>Ma story</p>
            </div>

            {activeStoryUsers.map((contact: any) => (
              contact && (
                <div key={contact.id} onClick={() => window.location.href = `/profile/${contact.id}`} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px', cursor: 'pointer', flexShrink: 0 }}>
                  <div style={{ padding: '2px', borderRadius: '50%', background: 'linear-gradient(45deg, #F59E0B, #EF4444)' }}>
                    {contact.avatar_url ? (
                      <img src={contact.avatar_url} style={{ width: '56px', height: '56px', borderRadius: '50%', objectFit: 'cover', border: '2px solid #FFF' }} />
                    ) : (
                      <div style={{ width: '56px', height: '56px', borderRadius: '50%', background: '#F1F5F9', border: '2px solid #FFF', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <User size={24} color="#94A3B8" />
                      </div>
                    )}
                  </div>
                  <p style={{ fontSize: '11px', color: '#0F172A', fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '60px' }}>{contact.full_name.split(' ')[0]}</p>
                </div>
              )
            ))}
          </div>

          {/* BARRE DE RECHERCHE */}
          <div style={{ padding: '16px 24px', borderBottom: '1px solid #E2E8F0', background: '#F8FAFC' }}>
            <div style={{ position: 'relative' }}>
              <Search size={18} color="#64748B" style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)' }} />
              <input 
                type="text" 
                placeholder="Rechercher une conversation..." 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{ width: '100%', padding: '12px 12px 12px 42px', background: '#FFF', border: '1px solid #E2E8F0', borderRadius: '12px', fontSize: '14px', outline: 'none', color: '#0F172A' }} 
              />
            </div>
          </div>
          
          {/* LISTE DES CONVERSATIONS */}
          <div style={{ flex: 1, overflowY: 'auto', paddingBottom: '80px' }}>
            {filteredConversations.length === 0 ? (
              <div style={{ padding: '60px 20px', textAlign: 'center' }}>
                <MessageSquare size={48} color="#CBD5E1" style={{ margin: '0 auto 16px' }} />
                <p style={{ color: '#0F172A', fontSize: '16px', fontWeight: 700, marginBottom: '8px' }}>Aucune conversation</p>
                <p style={{ color: '#64748B', fontSize: '14px' }}>Commence à discuter avec d'autres étudiants.</p>
              </div>
            ) : (
              filteredConversations.map((contact) => {
                const online = isUserOnline(contact.last_seen);
                return (
                  <a 
                    key={contact.id} 
                    href={`/chat/${contact.id}`} 
                    onClick={() => {
                      setConversations(prev => prev.map(c => c.id === contact.id ? { ...c, unread: 0 } : c));
                    }}
                    style={{ display: 'flex', alignItems: 'center', gap: '16px', padding: '16px 24px', textDecoration: 'none', borderBottom: '1px solid #F1F5F9', transition: 'background 0.2s' }}
                  >
                    
                    <div style={{ position: 'relative', flexShrink: 0 }}>
                      {contact.avatar_url ? (
                        <img src={contact.avatar_url} style={{ width: '50px', height: '50px', borderRadius: '50%', objectFit: 'cover' }} />
                      ) : (
                        <div style={{ width: '50px', height: '50px', borderRadius: '50%', background: '#F1F5F9', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <User size={24} color="#94A3B8" />
                        </div>
                      )}
                      {online && (
                        <div style={{ position: 'absolute', bottom: '0', right: '0', width: '14px', height: '14px', background: '#10B981', borderRadius: '50%', border: '2px solid #FFF' }} />
                      )}
                    </div>

                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2px' }}>
                        <p style={{ fontWeight: 700, color: '#0F172A', fontSize: '15px' }}>{contact.full_name}</p>
                        <p style={{ fontSize: '12px', color: contact.unread > 0 ? '#1E40AF' : '#94A3B8', fontWeight: contact.unread > 0 ? 700 : 400 }}>
                          {formatTime(contact.date)}
                        </p>
                      </div>
                      
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <p style={{ fontSize: '13px', color: online ? '#10B981' : '#64748B', fontWeight: online ? 600 : 400, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {online ? 'En ligne' : formatLastSeen(contact.last_seen)}
                        </p>
                      </div>
                      
                      <p style={{ fontSize: '13px', color: contact.unread > 0 ? '#0F172A' : '#94A3B8', fontWeight: contact.unread > 0 ? 600 : 400, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', marginTop: '2px' }}>
                        {contact.isMine && <span style={{ color: '#94A3B8' }}>Vous : </span>}
                        {contact.lastMessage}
                      </p>
                    </div>

                    {contact.unread > 0 && (
                      <div style={{ background: '#1E40AF', color: '#FFF', fontSize: '11px', fontWeight: 800, minWidth: '18px', height: '18px', borderRadius: '9px', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 4px', marginLeft: '8px' }}>
                        {contact.unread}
                      </div>
                    )}
                  </a>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* BARRE DE NAVIGATION MOBILE */}
      <div className="mobile-nav-bar">
        <a href="/" className="mobile-nav-item"><Home size={22} /></a>
        <a href="/search" className="mobile-nav-item"><Search size={22} /></a>
        <a href="/reseau" className="mobile-nav-item"><Users size={22} /></a>
        <a href="/messages" className="mobile-nav-item active"><MessageSquare size={22} /></a>
        <a href="/groupes" className="mobile-nav-item"><MessageSquare size={22} /></a>
        <a href="/profile" className="mobile-nav-item"><User size={22} /></a>
      </div>
    </div>
  );
}