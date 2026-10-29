'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Bell } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function NotificationBell() {
  const [notifs, setNotifs] = useState<any[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      setUserId(session.user.id);

      const { data } = await supabase.from('notifications').select('*').eq('user_id', session.user.id).order('created_at', { ascending: false });
      setNotifs(data || []);
    })();
  }, []);

  const unreadCount = notifs.filter(n => !n.is_read).length;

  const markAsRead = async () => {
    setIsOpen(!isOpen);
    if (!isOpen && unreadCount > 0 && userId) {
      await supabase.from('notifications').update({ is_read: true }).eq('user_id', userId).eq('is_read', false);
      setNotifs(notifs.map(n => ({ ...n, is_read: true })));
    }
  };

  return (
    <div style={{ position: 'relative' }}>
      <button onClick={markAsRead} style={{ position: 'relative', background: '#FFF', border: '1px solid #E2E8F0', padding: '10px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
        <Bell size={20} color="#64748B" />
        {unreadCount > 0 && (
          <span style={{ position: 'absolute', top: '-2px', right: '-2px', background: '#EF4444', color: '#FFF', fontSize: '10px', fontWeight: 'bold', width: '18px', height: '18px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            {unreadCount}
          </span>
        )}
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 10 }}
            style={{ position: 'absolute', top: '50px', right: '0', width: '320px', background: '#FFF', borderRadius: '16px', boxShadow: '0 10px 40px rgba(0,0,0,0.1)', border: '1px solid #E2E8F0', zIndex: 100, overflow: 'hidden' }}>
            <div style={{ padding: '16px', borderBottom: '1px solid #E2E8F0', fontWeight: 700, color: '#0F172A' }}>Notifications</div>
            <div style={{ maxHeight: '300px', overflowY: 'auto' }}>
              {notifs.length === 0 ? (
                <div style={{ padding: '24px', textAlign: 'center', color: '#64748B', fontSize: '14px' }}>Aucune notification.</div>
              ) : (
                notifs.map(n => (
                  <div key={n.id} style={{ padding: '16px', borderBottom: '1px solid #F1F5F9', background: n.is_read ? '#FFF' : '#EFF6FF' }}>
                    <p style={{ fontWeight: 600, fontSize: '14px', color: '#0F172A', marginBottom: '4px' }}>{n.title}</p>
                    <p style={{ fontSize: '13px', color: '#64748B', lineHeight: 1.4 }}>{n.message}</p>
                  </div>
                ))
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}