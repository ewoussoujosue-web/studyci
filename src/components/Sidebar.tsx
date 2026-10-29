'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Home, Search, Upload, Users, Sparkles, User, LogOut } from 'lucide-react';
import { usePathname } from 'next/navigation';

export default function Sidebar() {
  const pathname = usePathname();
  const [profile, setProfile] = useState<any>(null);

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data } = await supabase.from('profiles').select('*').eq('id', user.id).single();
        setProfile(data);
      }
    })();
  }, []);

  const logout = async () => {
    await supabase.auth.signOut();
    window.location.href = '/';
  };

  const navItems = [
    { name: 'Le Réseau', icon: Home, href: '/' },
    { name: 'Annales & Cours', icon: Search, href: '/search' },
    { name: 'Groupes de révision', icon: Users, href: '/groupes' },
    { name: 'Mon Assistant IA', icon: Sparkles, href: '/mon-ia' },
  ];

  return (
    <div style={{ width: '260px', height: '100vh', position: 'fixed', left: 0, top: 0, borderRight: '1px solid rgba(255,255,255,0.05)', background: '#0B1120', padding: '24px', display: 'flex', flexDirection: 'column', zIndex: 100 }}>
      
      {/* LOGO */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '40px' }}>
        <div style={{ width: '40px', height: '40px', background: '#FBBF24', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#0B1120', fontSize: '20px', fontWeight: 800 }}>S</div>
        <h1 style={{ fontSize: '24px', fontWeight: 800, color: '#FFF', letterSpacing: '-0.5px' }}>StudyCI</h1>
      </div>

      {/* NAVIGATION */}
      <nav style={{ display: 'flex', flexDirection: 'column', gap: '8px', flex: 1 }}>
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          return (
            <a key={item.name} href={item.href} 
              style={{ display: 'flex', alignItems: 'center', gap: '14px', padding: '12px 16px', borderRadius: '12px', 
              background: isActive ? 'rgba(59, 130, 246, 0.1)' : 'transparent', 
              color: isActive ? '#3B82F6' : '#94A3B8', 
              fontWeight: isActive ? 600 : 500, transition: 'all 0.2s' }}>
              <item.icon size={20} color={isActive ? '#3B82F6' : '#64748B'} />
              {item.name}
            </a>
          );
        })}
        
        <a href="/upload" 
          style={{ display: 'flex', alignItems: 'center', gap: '14px', padding: '12px 16px', borderRadius: '12px', 
          background: pathname === '/upload' ? 'rgba(251, 191, 36, 0.1)' : 'transparent', 
          color: pathname === '/upload' ? '#FBBF24' : '#94A3B8', 
          fontWeight: 500, transition: 'all 0.2s', marginTop: '16px' }}>
          <Upload size={20} color={pathname === '/upload' ? '#FBBF24' : '#64748B'} /> Uploader
        </a>
      </nav>

      {/* PROFIL EN BAS */}
      {profile && (
        <div style={{ borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '20px' }}>
          <a href="/profile" style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px', borderRadius: '12px', background: 'rgba(30, 41, 59, 0.5)', marginBottom: '8px' }}>
            {profile.avatar_url ? (
              <img src={profile.avatar_url} alt="" style={{ width: '36px', height: '36px', borderRadius: '50%', objectFit: 'cover' }} />
            ) : (
              <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: '#1E293B', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><User size={18} color="#94A3B8" /></div>
            )}
            <div style={{ flex: 1, overflow: 'hidden' }}>
              <p style={{ fontSize: '14px', fontWeight: 600, color: '#FFF', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{profile.full_name || 'Étudiant'}</p>
              <p style={{ fontSize: '12px', color: '#64748B' }}>{profile.level || 'Filière'}</p>
            </div>
          </a>
          <button onClick={logout} style={{ width: '100%', display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 16px', borderRadius: '12px', background: 'transparent', color: '#EF4444', fontWeight: 500, transition: 'all 0.2s' }}>
            <LogOut size={20} /> Déconnexion
          </button>
        </div>
      )}
    </div>
  );
}