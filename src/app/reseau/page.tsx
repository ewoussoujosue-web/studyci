'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Search, User, MessageCircle, UserPlus, UserCheck, GraduationCap, ArrowLeft, Home, Users, MessageSquare } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import Loader from '@/components/Loader';

export default function ReseauPage() {
  const [loading, setLoading] = useState(true);
  const [me, setMe] = useState<any>(null);
  const [students, setStudents] = useState<any[]>([]);
  const [following, setFollowing] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) { window.location.href = '/inscription'; return; }
        setMe(session.user);

        // Récupérer tous les étudiants (sauf moi)
        const { data: profiles, error: profError } = await supabase
          .from('profiles')
          .select('*')
          .neq('id', session.user.id)
          .order('full_name', { ascending: true });
          
        if (profError) console.error("Erreur profils:", profError);
        if (profiles) setStudents(profiles);

        // Récupérer les follows
        const { data: followsData } = await supabase
          .from('follows')
          .select('following_id')
          .eq('follower_id', session.user.id);
          
        if (followsData) {
          setFollowing(followsData.map(f => f.following_id));
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const toggleFollow = async (targetId: string) => {
    if (!me) return;
    const isFollowing = following.includes(targetId);

    if (isFollowing) {
      await supabase.from('follows').delete().eq('follower_id', me.id).eq('following_id', targetId);
      setFollowing(following.filter(id => id !== targetId));
    } else {
      const { error } = await supabase.from('follows').insert({ follower_id: me.id, following_id: targetId });
      if (!error) {
        setFollowing([...following, targetId]);
      }
    }
  };

  // Filtrer uniquement par la recherche texte (nom, école, niveau)
  const filteredStudents = students.filter(s => {
    const term = searchQuery.toLowerCase();
    return (
      (s.full_name || '').toLowerCase().includes(term) ||
      (s.school || '').toLowerCase().includes(term) ||
      (s.level || '').toLowerCase().includes(term)
    );
  });

  if (loading) return <Loader text="Chargement du réseau..." />;

  return (
    <div style={{ minHeight: '100vh', background: '#F8FAFC', paddingBottom: isMobile ? '100px' : '40px' }}>
      <div style={{ maxWidth: '800px', margin: '0 auto', padding: isMobile ? '20px 16px' : '40px 24px' }}>
        
        {/* HEADER */}
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '24px' }}>
          <a href="/" style={{ color: '#F59E0B', background: '#FEF3C7', padding: '10px', borderRadius: '50%', display: 'flex' }}>
            <ArrowLeft size={24} />
          </a>
          <h1 style={{ fontSize: isMobile ? '28px' : '36px', fontWeight: 800, color: '#0F172A', letterSpacing: '-1px' }}>Le Réseau</h1>
        </motion.div>

        {/* BARRE DE RECHERCHE */}
        <div style={{ position: 'relative', marginBottom: '24px' }}>
          <Search size={20} color="#94A3B8" style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)' }} />
          <input 
            value={searchQuery} 
            onChange={(e) => setSearchQuery(e.target.value)} 
            placeholder="Rechercher un étudiant (nom, école, niveau)..." 
            style={{ width: '100%', padding: '16px 16px 16px 48px', background: '#FFF', border: '1px solid #E2E8F0', borderRadius: '30px', fontSize: '15px', outline: 'none', color: '#0F172A', boxShadow: '0 2px 10px rgba(0,0,0,0.02)' }} 
          />
        </div>

        {/* LISTE DES ÉTUDIANTS */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <AnimatePresence>
            {filteredStudents.length === 0 ? (
               <p style={{ textAlign: 'center', color: '#64748B', marginTop: '20px' }}>Aucun étudiant trouvé.</p>
            ) : (
              filteredStudents.map((student) => {
                const isFollowed = following.includes(student.id);

                return (
                  <motion.div 
                    key={student.id}
                    initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                    style={{ background: '#FFF', borderRadius: '20px', padding: '20px', border: '1px solid #E2E8F0', display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}
                  >
                    {/* AVATAR */}
                    <div style={{ position: 'relative', flexShrink: 0 }}>
                      {student.avatar_url ? (
                        <img src={student.avatar_url} style={{ width: '70px', height: '70px', borderRadius: '50%', objectFit: 'cover', border: '2px solid #F1F5F9' }} />
                      ) : (
                        <div style={{ width: '70px', height: '70px', borderRadius: '50%', background: '#F8FAFC', border: '1px solid #E2E8F0', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <User size={32} color="#F59E0B" />
                        </div>
                      )}
                    </div>

                    {/* INFOS */}
                    <div style={{ flex: 1, minWidth: '150px' }}>
                      <h3 style={{ fontSize: '18px', fontWeight: 800, color: '#0F172A', marginBottom: '4px' }}>{student.full_name}</h3>
                      
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', marginBottom: '4px' }}>
                        <span style={{ fontSize: '13px', color: '#64748B', fontWeight: 600 }}>{student.level || 'Étudiant'}</span>
                        
                        {/* 🎓 AFFICHAGE DE L'ÉCOLE */}
                        {student.school && (
                          <>
                            <span style={{ color: '#CBD5E1' }}>•</span>
                            <span style={{ fontSize: '13px', color: '#1E40AF', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '4px' }}>
                              <GraduationCap size={14} /> {student.school}
                            </span>
                          </>
                        )}
                      </div>
                    </div>

                    {/* BOUTONS D'ACTION */}
                    <div style={{ display: 'flex', gap: '8px', width: isMobile ? '100%' : 'auto', marginTop: isMobile ? '8px' : '0' }}>
                      
                      <a href={`/profile/${student.id}`} style={{ flex: isMobile ? 1 : 'none', padding: '10px 16px', background: '#F1F5F9', color: '#1E40AF', borderRadius: '12px', fontWeight: 700, fontSize: '14px', textDecoration: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        Profil
                      </a>

                      {/* 💬 BOUTON MESSAGE */}
                      <a href={`/chat/${student.id}`} style={{ flex: isMobile ? 1 : 'none', padding: '10px', background: '#EFF6FF', color: '#1E40AF', borderRadius: '12px', fontWeight: 700, textDecoration: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center' }} title="Envoyer un message">
                        <MessageCircle size={20} />
                      </a>
                      
                      <button onClick={() => toggleFollow(student.id)} style={{ flex: isMobile ? 1 : 'none', padding: '10px 16px', borderRadius: '12px', fontWeight: 700, fontSize: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', border: isFollowed ? '1px solid #E2E8F0' : 'none', cursor: 'pointer', background: isFollowed ? '#FFF' : '#1E40AF', color: isFollowed ? '#64748B' : '#FFF' }}>
                        {isFollowed ? <><UserCheck size={18} /> Abonné</> : <><UserPlus size={18} /> Suivre</>}
                      </button>
                    </div>

                  </motion.div>
                );
              })
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* BARRE DE NAVIGATION MOBILE */}
      {isMobile && (
        <div className="mobile-nav-bar">
          <a href="/" className="mobile-nav-item"><Home size={22} /></a>
          <a href="/search" className="mobile-nav-item"><Search size={22} /></a>
          <a href="/reseau" className="mobile-nav-item active"><Users size={22} /></a>
          <a href="/messages" className="mobile-nav-item"><MessageSquare size={22} /></a>
          <a href="/groupes" className="mobile-nav-item"><MessageSquare size={22} /></a>
          <a href="/profile" className="mobile-nav-item"><User size={22} /></a>
        </div>
      )}
    </div>
  );
}