'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Bell, Check, Heart, MessageSquare, UserPlus, FileText, Users, CheckCircle, XCircle, Star, Download } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const TABS = [
  { id: 'all', label: 'Tout' },
  { id: 'like', label: 'Likes' },
  { id: 'comment', label: 'Comms' },
  { id: 'follow', label: 'Follows' },
  { id: 'message', label: 'Msgs' },
  { id: 'docs', label: 'Docs' },
  { id: 'groups', label: 'Groupes' },
];

const DOC_TYPES = ['download', 'rating', 'doc_approved', 'doc_rejected'];
const GROUP_TYPES = ['group_invite', 'group_join'];

export default function NotificationBell() {
  const [notifications, setNotifications] = useState<any[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [activeTab, setActiveTab] = useState<string>('all');

  const fetchNotifications = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    const { data } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', session.user.id)
      .order('created_at', { ascending: false })
      .limit(50);

    if (data) {
      setNotifications(data);
      setUnreadCount(data.filter(n => !n.is_read).length);
    }
  };

  useEffect(() => {
    fetchNotifications();

    const channel = supabase.channel('notifications_channel')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'notifications' }, () => {
        fetchNotifications(); 
      })
      .subscribe();

    const interval = setInterval(() => {
      fetchNotifications();
    }, 10000);

    return () => { 
      supabase.removeChannel(channel); 
      clearInterval(interval);
    };
  }, []);

  const markAllAsRead = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    await supabase.from('notifications').update({ is_read: true }).eq('user_id', session.user.id).eq('is_read', false);
    setNotifications(notifications.map(n => ({ ...n, is_read: true })));
    setUnreadCount(0);
  };

  const filtered = notifications.filter(n => {
    if (activeTab === 'all') return true;
    if (activeTab === 'docs') return DOC_TYPES.includes(n.type);
    if (activeTab === 'groups') return GROUP_TYPES.includes(n.type);
    return n.type === activeTab;
  });

  const unreadByTab = (tabId: string) => {
    return notifications.filter(n => {
      if (n.is_read) return false;
      if (tabId === 'all') return true;
      if (tabId === 'docs') return DOC_TYPES.includes(n.type);
      if (tabId === 'groups') return GROUP_TYPES.includes(n.type);
      return n.type === tabId;
    }).length;
  };

  const getIcon = (type: string) => {
    switch (type) {
      case 'like': return <Heart size={16} color="#EF4444" fill="#EF4444" />;
      case 'comment': return <MessageSquare size={16} color="#1E40AF" />;
      case 'follow': return <UserPlus size={16} color="#8B5CF6" />;
      case 'download': return <Download size={16} color="#10B981" />;
      case 'rating': return <Star size={16} color="#F59E0B" fill="#F59E0B" />;
      case 'doc_approved': return <CheckCircle size={16} color="#10B981" />;
      case 'doc_rejected': return <XCircle size={16} color="#EF4444" />;
      case 'group_invite': return <Users size={16} color="#F59E0B" />;
      case 'group_join': return <Users size={16} color="#8B5CF6" />;
      case 'message': return <MessageSquare size={16} color="#3B82F6" />;
      default: return <Bell size={16} color="#64748B" />;
    }
  };

  return (
    <div style={{ position: 'relative' }}>
      <button 
        onClick={() => setIsOpen(!isOpen)}
        style={{ position: 'relative', background: 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '8px', cursor: 'pointer', border: 'none' }}
      >
        <Bell size={24} color="#64748B" />
        {unreadCount > 0 && (
          <span style={{ position: 'absolute', top: '2px', right: '2px', background: '#EF4444', color: '#FFF', fontSize: '10px', fontWeight: 800, minWidth: '16px', height: '16px', borderRadius: '8px', padding: '0 4px', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '2px solid #FFF' }}>
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      <AnimatePresence>
        {isOpen && (
          <>
            <div onClick={() => setIsOpen(false)} style={{ position: 'fixed', inset: 0, zIndex: 99 }} />
            
            <motion.div 
              initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 10 }}
              style={{ position: 'absolute', top: '100%', right: 0, width: '380px', maxWidth: '95vw', background: '#FFF', borderRadius: '16px', boxShadow: '0 10px 30px rgba(0,0,0,0.15)', border: '1px solid #E2E8F0', zIndex: 100, overflow: 'hidden' }}
            >
              <div style={{ padding: '12px 16px', borderBottom: '1px solid #E2E8F0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#F8FAFC' }}>
                <h3 style={{ fontSize: '15px', fontWeight: 800, color: '#0F172A' }}>Notifications</h3>
                {unreadCount > 0 && (
                  <button onClick={markAllAsRead} style={{ background: 'transparent', color: '#1E40AF', fontSize: '12px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '4px', border: 'none', cursor: 'pointer' }}>
                    <Check size={14} /> Tout lire
                  </button>
                )}
              </div>

              <div style={{ display: 'flex', overflowX: 'auto', borderBottom: '1px solid #E2E8F0', background: '#FFF' }}>
                {TABS.map(tab => {
                  const count = unreadByTab(tab.id);
                  const isActive = activeTab === tab.id;
                  return (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id)}
                      style={{
                        flex: 1, minWidth: '60px', padding: '10px 8px',
                        background: isActive ? '#EFF6FF' : 'transparent',
                        color: isActive ? '#1E40AF' : '#64748B',
                        fontSize: '11px', fontWeight: 700, border: 'none',
                        borderBottom: isActive ? '2px solid #1E40AF' : '2px solid transparent',
                        cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px', whiteSpace: 'nowrap',
                      }}
                    >
                      <span>{tab.label}</span>
                      {count > 0 && (
                        <span style={{ background: '#EF4444', color: '#FFF', fontSize: '9px', fontWeight: 800, minWidth: '14px', height: '14px', borderRadius: '7px', padding: '0 3px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          {count}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>

              <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
                {filtered.length === 0 ? (
                  <p style={{ padding: '30px 20px', textAlign: 'center', color: '#94A3B8', fontSize: '13px' }}>
                    Aucune notification {activeTab !== 'all' ? 'dans cet onglet' : ''}.
                  </p>
                ) : (
                  filtered.map(n => (
                    <div
                      key={n.id}
                      onClick={async () => {
                        // 1. Marquer comme lu
                        if (!n.is_read) {
                          await supabase.from('notifications').update({ is_read: true }).eq('id', n.id);
                          setNotifications(prev => prev.map(x => x.id === n.id ? { ...x, is_read: true } : x));
                          setUnreadCount(prev => Math.max(0, prev - 1));
                        }
                        
                        // 2. Redirection pour les messages
                        if (n.type === 'message') {
                          // On regarde si l'ID de l'expéditeur est là
                          if (n.from_user_id) {
                            window.location.href = `/chat/${n.from_user_id}`;
                          } else {
                            // Si l'ID est manquant (vieille notification), on alerte
                            alert("Erreur : L'ID de l'expéditeur est manquant. Envoie-toi un nouveau message pour tester.");
                          }
                        }
                      }}
                      style={{
                        padding: '12px 16px', borderBottom: '1px solid #F1F5F9',
                        background: n.is_read ? '#FFF' : '#EFF6FF', cursor: 'pointer',
                        display: 'flex', gap: '10px', alignItems: 'flex-start',
                      }}
                    >
                      <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: '#F1F5F9', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        {getIcon(n.type)}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{ fontSize: '13px', fontWeight: 700, color: '#0F172A', marginBottom: '2px' }}>{n.title}</p>
                        <p style={{ fontSize: '12px', color: '#64748B', wordBreak: 'break-word' }}>{n.message}</p>
                        <p style={{ fontSize: '10px', color: '#94A3B8', marginTop: '4px' }}>
                          {new Date(n.created_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                        </p>
                      </div>
                      {!n.is_read && (
                        <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#1E40AF', marginTop: '6px', flexShrink: 0 }} />
                      )}
                    </div>
                  ))
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}