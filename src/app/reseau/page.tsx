'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { supabase } from '@/lib/supabase';
import { User, MessageCircle, Search, Home, FileText, Users, MessageSquare, Calendar, Sparkles, LogOut, GraduationCap, Flame, Award, UserPlus, UserCheck, Check } from 'lucide-react';
import Loader from '@/components/Loader';

export default function ReseauPage() {
  const [loading, setLoading] = useState(true);
  const [students, setStudents] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState('Tous');
  const [myProfile, setMyProfile] = useState<any>(null);
  const [followingIds, setFollowingIds] = useState<string[]>([]);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  useEffect(() => {
    const fetchNetwork = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        
        if (session?.user) {
          await supabase.from('profiles').update({ last_seen: new Date().toISOString() }).eq('id', session.user.id);

          const { data: me } = await supabase.from('profiles').select('*').eq('id', session.user.id).single();
          setMyProfile(me);

          const { data: followsData } = await supabase.from('follows').select('following_id').eq('follower_id', session.user.id);
          if (followsData) setFollowingIds(followsData.map(f => f.following_id));

          const { data: all } = await supabase
            .from('profiles')
            .select('*')
            .neq('id', session.user.id)
            .order('created_at', { ascending: false });

          if (all) {
            const studentsWithStats = await Promise.all(all.map(async (student) => {
              const { count: followersCount } = await supabase.from('follows').select('*', { count: 'exact', head: true }).eq('following_id', student.id);
              const { count: docsCount } = await supabase.from('documents').select('*', { count: 'exact', head: true }).eq('uploader_id', student.id).eq('status', 'approved');
              return { ...student, followersCount: followersCount || 0, docsCount: docsCount || 0 };
            }));
            setStudents(studentsWithStats);
          }
        }
      } catch (err) {
        console.error("Erreur:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchNetwork();
  }, []);

  const toggleFollow = async (studentId: string) => {
    if (!myProfile) return;
    if (followingIds.includes(studentId)) {
      setFollowingIds(followingIds.filter(id => id !== studentId));
      setStudents(students.map(s => s.id === studentId ? { ...s, followersCount: Math.max(0, s.followersCount - 1) } : s));
      await supabase.from('follows').delete().eq('follower_id', myProfile.id).eq('following_id', studentId);
    } else {
      setFollowingIds([...followingIds, studentId]);
      setStudents(students.map(s => s.id === studentId ? { ...s, followersCount: s.followersCount + 1 } : s));
      await supabase.from('follows').insert({ follower_id: myProfile.id, following_id: studentId });
    }
  };

  const logout = async () => {
    await supabase.auth.signOut();
    window.location.href = '/';
  };

  if (loading) return <Loader text="Chargement du réseau..." />;

  // Filtres façon Facebook
  const filters = ['Tous', 'En ligne', 'Mon École', 'Droit', 'Compta', 'Médecine'];

  const filteredStudents = students.filter(s => {
    const matchesSearch = s.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) || s.level?.toLowerCase().includes(searchQuery.toLowerCase()) || s.school?.toLowerCase().includes(searchQuery.toLowerCase());
    
    let matchesFilter = false;
    if (activeFilter === 'Tous') matchesFilter = true;
    else if (activeFilter === 'En ligne') {
      const diff = new Date().getTime() - new Date(s.last_seen).getTime();
      matchesFilter = diff < 5 * 60 * 1000;
    }
    else if (activeFilter === 'Mon École') matchesFilter = s.school === myProfile?.school && s.school != null;
    else matchesFilter = s.level?.toLowerCase().includes(activeFilter.toLowerCase());

    return matchesSearch && matchesFilter;
  });

  const isUserOnline = (lastSeen: string) => {
    if (!lastSeen) return false;
    const diff = new Date().getTime() - new Date(lastSeen).getTime();
    return diff < 5 * 60 * 1000;
  };

  return (
    <div style={{ minHeight: '100vh', background: '#F8FAFC', display: 'flex', justifyContent: 'center' }}>
      
      <div className="main-content-layout" style={{ display: 'flex', width: '100%', maxWidth: '1300px' }}>
        
        {/* SIDEBAR GAUCHE */}
        <div className="sidebar-desktop" style={{ width: '260px', padding: '20px', borderRight: '1px solid #E2E8F0', display: 'flex', flexDirection: 'column', position: 'sticky', top: 0, height: '100vh', background: '#F8FAFC' }}>
          <h1 style={{ fontSize: '28px', fontWeight: 800, color: '#0F172A', marginBottom: '32px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{ width: '32px', height: '32px', background: '#F59E0B', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#FFF', fontSize: '18px' }}>S</div>
            StudyCI
          </h1>

          <nav style={{ display: 'flex', flexDirection: 'column', gap: '8px', flex: 1 }}>
            <a href="/" style={{ display: 'flex', alignItems: 'center', gap: '16px', padding: '12px 16px', borderRadius: '12px', color: '#334155', fontWeight: 600, textDecoration: 'none', fontSize: '16px' }}><Home size={24} /> Accueil</a>
            <a href="/search" style={{ display: 'flex', alignItems: 'center', gap: '16px', padding: '12px 16px', borderRadius: '12px', color: '#334155', fontWeight: 600, textDecoration: 'none', fontSize: '16px' }}><FileText size={24} /> Annales</a>
            <a href="/reseau" style={{ display: 'flex', alignItems: 'center', gap: '16px', padding: '12px 16px', borderRadius: '12px', background: '#EFF6FF', color: '#1E40AF', fontWeight: 700, textDecoration: 'none', fontSize: '16px' }}><Users size={24} /> Réseau</a>
            <a href="/groupes" style={{ display: 'flex', alignItems: 'center', gap: '16px', padding: '12px 16px', borderRadius: '12px', color: '#334155', fontWeight: 600, textDecoration: 'none', fontSize: '16px' }}><MessageSquare size={24} /> Groupes</a>
            <a href="/planning" style={{ display: 'flex', alignItems: 'center', gap: '16px', padding: '12px 16px', borderRadius: '12px', color: '#334155', fontWeight: 600, textDecoration: 'none', fontSize: '16px' }}><Calendar size={24} /> Planning</a>
            <a href="/mon-ia" style={{ display: 'flex', alignItems: 'center', gap: '16px', padding: '12px 16px', borderRadius: '12px', color: '#334155', fontWeight: 600, textDecoration: 'none', fontSize: '16px' }}><Sparkles size={24} color="#8B5CF6" /> Mon IA</a>
          </nav>

          {myProfile && (
            <div style={{ borderTop: '1px solid #E2E8F0', paddingTop: '16px', marginTop: 'auto' }}>
              <a href="/profile" style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px', borderRadius: '12px', background: '#FFF', border: '1px solid #E2E8F0', textDecoration: 'none', marginBottom: '12px' }}>
                {myProfile.avatar_url ? <img src={myProfile.avatar_url} style={{ width: '40px', height: '40px', borderRadius: '50%' }} /> : <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: '#F1F5F9', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><User size={20} color="#94A3B8" /></div>}
                <div style={{ flex: 1, overflow: 'hidden' }}>
                  <p style={{ fontSize: '14px', fontWeight: 700, color: '#0F172A', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{myProfile.full_name || 'Mon Profil'}</p>
                  <p style={{ fontSize: '12px', color: '#64748B' }}>{myProfile.level || 'Étudiant'}</p>
                </div>
              </a>
              <button onClick={logout} style={{ width: '100%', display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 16px', borderRadius: '12px', background: 'transparent', color: '#EF4444', fontWeight: 600, fontSize: '16px' }}><LogOut size={24} /> Déconnexion</button>
            </div>
          )}
        </div>

        {/* CONTENU CENTRAL */}
        <div style={{ flex: 1, minWidth: '0', background: '#FFF', width: '100%' }}>
          
          <div style={{ position: 'sticky', top: 0, zIndex: 50, background: 'rgba(255,255,255,0.95)', backdropFilter: 'blur(12px)', borderBottom: '1px solid #E2E8F0', padding: isMobile ? '16px' : '20px' }}>
            <h2 style={{ fontSize: '24px', fontWeight: 800, color: '#0F172A', marginBottom: '16px' }}>Le Réseau</h2>
            
            <div style={{ position: 'relative', width: '100%' }}>
              <Search size={20} color="#94A3B8" style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)' }} />
              <input 
                type="text" 
                placeholder="Rechercher un étudiant..." 
                value={searchQuery} 
                onChange={(e) => setSearchQuery(e.target.value)} 
                style={{ width: '100%', padding: '14px 20px 14px 48px', borderRadius: '50px', border: '1px solid #E2E8F0', background: '#F8FAFC', fontSize: '15px', outline: 'none' }} 
              />
            </div>

            <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingTop: '16px', scrollbarWidth: 'none' }}>
              {filters.map(f => (
                <button 
                  key={f} 
                  onClick={() => setActiveFilter(f)}
                  style={{ padding: '8px 16px', borderRadius: '50px', fontSize: '13px', fontWeight: 700, whiteSpace: 'nowrap', background: activeFilter === f ? '#0F172A' : '#F1F5F9', color: activeFilter === f ? '#FFF' : '#64748B', border: 'none' }}>
                  {f}
                </button>
              ))}
            </div>
          </div>

          <div style={{ padding: isMobile ? '16px' : '20px' }}>
            {filteredStudents.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '60px 20px', background: '#FFF', borderRadius: '24px', border: '1px solid #E2E8F0' }}>
                <Users size={64} color="#CBD5E1" style={{ margin: '0 auto 16px' }} />
                <h3 style={{ fontSize: '20px', fontWeight: 800, color: '#0F172A' }}>Aucun étudiant trouvé</h3>
              </div>
            ) : (
              <motion.div layout style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fill, minmax(300px, 1fr))', gap: '16px' }}>
                {filteredStudents.map((s) => (
                  <motion.div 
                    key={s.id} layout initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
                    style={{ background: '#FFF', borderRadius: '20px', padding: '16px', display: 'flex', alignItems: 'center', gap: '16px', border: '1px solid #E2E8F0' }}>
                    
                    <div style={{ position: 'relative' }}>
                      {s.avatar_url ? <img src={s.avatar_url} style={{ width: '60px', height: '60px', borderRadius: '50%', objectFit: 'cover' }} /> : <div style={{ width: '60px', height: '60px', borderRadius: '50%', background: '#F8FAFC', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><User size={28} color="#F59E0B" /></div>}
                      {isUserOnline(s.last_seen) && (
                        <div style={{ position: 'absolute', bottom: '2px', right: '2px', width: '14px', height: '14px', background: '#10B981', borderRadius: '50%', border: '2px solid #FFF' }} />
                      )}
                    </div>

                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <h3 style={{ fontSize: '16px', fontWeight: 800, color: '#0F172A' }}>{s.full_name || 'Étudiant'}</h3>
                        {s.docsCount >= 5 && <Award size={14} color="#3B82F6" />}
                      </div>
                      <p style={{ fontSize: '12px', color: '#64748B' }}>{s.level || 'Niveau inconnu'}</p>
                      
                      <div style={{ display: 'flex', gap: '8px', marginTop: '12px' }}>
                        <a href={`/profile/${s.id}`} style={{ flex: 1, padding: '8px', background: '#EFF6FF', color: '#1E40AF', borderRadius: '8px', fontWeight: 700, fontSize: '12px', textAlign: 'center', textDecoration: 'none' }}>
                          Profil
                        </a>
                        <button onClick={() => toggleFollow(s.id)} style={{ flex: 1, padding: '8px', background: followingIds.includes(s.id) ? '#F1F5F9' : '#1E40AF', color: followingIds.includes(s.id) ? '#64748B' : '#FFF', borderRadius: '8px', fontWeight: 700, fontSize: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px', border: 'none' }}>
                          {followingIds.includes(s.id) ? <><Check size={14} /> Abonné</> : <><UserPlus size={14} /> Suivre</>}
                        </button>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </motion.div>
            )}
          </div>
        </div>
      </div>

      {/* BARRE DE NAVIGATION MOBILE */}
      <div className="mobile-nav-bar">
        <a href="/" className="mobile-nav-item">
          <Home size={22} />
        </a>
        <a href="/search" className="mobile-nav-item">
          <Search size={22} />
        </a>
        <a href="/reseau" className="mobile-nav-item active">
          <Users size={22} />
        </a>
        <a href="/messages" className="mobile-nav-item">
          <MessageSquare size={22} />
        </a>
        <a href="/groupes" className="mobile-nav-item">
          <MessageSquare size={22} />
        </a>
        <a href="/profile" className="mobile-nav-item">
          <User size={22} />
        </a>
      </div>
    </div>
  );
}