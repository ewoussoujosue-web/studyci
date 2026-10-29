'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { supabase } from '@/lib/supabase';
import { User, MessageCircle, Search, Home, FileText, Users, MessageSquare, Calendar, Sparkles, LogOut, GraduationCap, Flame, Award, UserPlus, UserCheck } from 'lucide-react';
import Loader from '@/components/Loader';

export default function ReseauPage() {
  const [loading, setLoading] = useState(true);
  const [students, setStudents] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState('Tous');
  const [myProfile, setMyProfile] = useState<any>(null);
  const [followingIds, setFollowingIds] = useState<string[]>([]);

  useEffect(() => {
    const fetchNetwork = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        
        if (session?.user) {
          // 1. Mettre à jour ma dernière connexion
          await supabase.from('profiles').update({ last_seen: new Date().toISOString() }).eq('id', session.user.id);

          // 2. Charger mon profil
          const { data: me } = await supabase.from('profiles').select('*').eq('id', session.user.id).single();
          setMyProfile(me);

          // 3. Charger les gens que je suis déjà
          const { data: followsData } = await supabase.from('follows').select('following_id').eq('follower_id', session.user.id);
          if (followsData) setFollowingIds(followsData.map(f => f.following_id));

          // 4. Charger les autres étudiants avec leurs stats
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
    
    const isFollowing = followingIds.includes(studentId);

    if (isFollowing) {
      // Se désabonner
      setFollowingIds(followingIds.filter(id => id !== studentId));
      setStudents(students.map(s => s.id === studentId ? { ...s, followersCount: Math.max(0, s.followersCount - 1) } : s));
      await supabase.from('follows').delete().eq('follower_id', myProfile.id).eq('following_id', studentId);
    } else {
      // S'abonner
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

  // Filtres dynamiques
  const filters = ['Tous', 'Mon École', 'Droit', 'Compta', 'Médecine', 'L1', 'L2', 'L3'];

  const filteredStudents = students.filter(s => {
    const matchesSearch = s.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) || s.level?.toLowerCase().includes(searchQuery.toLowerCase()) || s.school?.toLowerCase().includes(searchQuery.toLowerCase());
    
    let matchesFilter = false;
    if (activeFilter === 'Tous') matchesFilter = true;
    else if (activeFilter === 'Mon École') matchesFilter = s.school === myProfile?.school && s.school != null;
    else matchesFilter = s.level?.toLowerCase().includes(activeFilter.toLowerCase());

    return matchesSearch && matchesFilter;
  });

  // Fonction pour vérifier si l'utilisateur est en ligne (5 dernières minutes)
  const isUserOnline = (lastSeen: string) => {
    if (!lastSeen) return false;
    const diff = new Date().getTime() - new Date(lastSeen).getTime();
    return diff < 5 * 60 * 1000; // 5 minutes en millisecondes
  };

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
        <div style={{ flex: 1, minWidth: '400px', background: '#FFF' }}>
          
          {/* Header Fixe */}
          <div style={{ position: 'sticky', top: 0, zIndex: 50, background: 'rgba(255,255,255,0.95)', backdropFilter: 'blur(12px)', borderBottom: '1px solid #E2E8F0', padding: '20px 32px' }}>
            <h2 style={{ fontSize: '24px', fontWeight: 800, color: '#0F172A', marginBottom: '16px' }}>Le Réseau</h2>
            
            <div style={{ position: 'relative', width: '100%' }}>
              <Search size={20} color="#94A3B8" style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)' }} />
              <input 
                type="text" 
                placeholder="Rechercher par nom, école ou niveau..." 
                value={searchQuery} 
                onChange={(e) => setSearchQuery(e.target.value)} 
                style={{ width: '100%', padding: '14px 20px 14px 48px', borderRadius: '50px', border: '1px solid #E2E8F0', background: '#F8FAFC', fontSize: '15px', outline: 'none', transition: 'all 0.2s' }} 
                onFocus={(e) => { e.target.style.background = '#FFF'; e.target.style.borderColor = '#F59E0B'; }}
                onBlur={(e) => { e.target.style.background = '#F8FAFC'; e.target.style.borderColor = '#E2E8F0'; }}
              />
            </div>

            {/* Filtres */}
            <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingTop: '16px', scrollbarWidth: 'none' }}>
              {filters.map(f => (
                <button 
                  key={f} 
                  onClick={() => setActiveFilter(f)}
                  style={{ padding: '8px 16px', borderRadius: '50px', fontSize: '13px', fontWeight: 700, whiteSpace: 'nowrap', background: activeFilter === f ? '#0F172A' : '#F1F5F9', color: activeFilter === f ? '#FFF' : '#64748B', border: 'none', transition: 'all 0.2s', cursor: 'pointer' }}>
                  {f}
                </button>
              ))}
            </div>
          </div>

          {/* Grille d'étudiants */}
          <div style={{ padding: '24px 32px' }}>
            {filteredStudents.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '60px 20px', background: '#FFF', borderRadius: '24px', border: '1px solid #E2E8F0' }}>
                <Users size={64} color="#CBD5E1" style={{ margin: '0 auto 16px' }} />
                <h3 style={{ fontSize: '20px', fontWeight: 800, color: '#0F172A' }}>Aucun étudiant trouvé</h3>
              </div>
            ) : (
              <motion.div layout style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: '16px' }}>
                {filteredStudents.map((s) => (
                  <motion.div 
                    key={s.id} layout initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} whileHover={{ y: -4, boxShadow: '0 15px 30px rgba(0,0,0,0.06)' }}
                    style={{ background: '#FFF', borderRadius: '20px', padding: '24px', display: 'flex', flexDirection: 'column', alignItems: 'center', border: '1px solid #E2E8F0' }}>
                    
                    <div style={{ position: 'relative', marginBottom: '12px' }}>
                      {s.avatar_url ? <img src={s.avatar_url} style={{ width: '80px', height: '80px', borderRadius: '50%', objectFit: 'cover', border: '3px solid #F59E0B' }} /> : <div style={{ width: '80px', height: '80px', borderRadius: '50%', background: '#F8FAFC', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '3px solid #F59E0B' }}><User size={36} color="#F59E0B" /></div>}
                      
                      {/* POINT VERT DYNAMIQUE */}
                      {isUserOnline(s.last_seen) && (
                        <div style={{ position: 'absolute', bottom: '2px', right: '2px', width: '16px', height: '16px', background: '#10B981', borderRadius: '50%', border: '2px solid #FFF' }} />
                      )}
                    </div>

                    {/* BADGES DYNAMIQUES */}
                    <div style={{ display: 'flex', gap: '4px', marginBottom: '8px' }}>
                      {s.followersCount >= 3 && <span title="Populaire" style={{ background: '#FEF2F2', color: '#EF4444', padding: '4px', borderRadius: '50%' }}><Flame size={14} /></span>}
                      {s.docsCount >= 5 && <span title="Top Contributeur" style={{ background: '#EFF6FF', color: '#3B82F6', padding: '4px', borderRadius: '50%' }}><Award size={14} /></span>}
                    </div>

                    <h3 style={{ fontSize: '17px', fontWeight: 800, color: '#0F172A', textAlign: 'center' }}>{s.full_name || 'Étudiant'}</h3>
                    
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px', marginTop: '6px', marginBottom: '20px' }}>
                      <span style={{ fontSize: '12px', padding: '4px 12px', background: 'rgba(245,158,11,0.15)', color: '#B45309', borderRadius: '20px', fontWeight: 700 }}>
                        {s.level || 'Niveau inconnu'}
                      </span>
                      {s.school && (
                        <span style={{ fontSize: '11px', display: 'flex', alignItems: 'center', gap: '4px', color: '#64748B', fontWeight: 600 }}>
                          <GraduationCap size={12} /> {s.school}
                        </span>
                      )}
                      
                      {/* NOMBRE D'ABONNÉS */}
                      <motion.span key={s.followersCount} initial={{ scale: 1.2 }} animate={{ scale: 1 }} style={{ fontSize: '12px', color: '#94A3B8', fontWeight: 600, marginTop: '4px' }}>
                        {s.followersCount} abonné(s)
                      </motion.span>
                    </div>

                    <div style={{ display: 'flex', gap: '8px', width: '100%', marginTop: 'auto' }}>
                      <a href={`/profile/${s.id}`} style={{ flex: 1, padding: '10px', background: '#F8FAFC', color: '#0F172A', border: '1px solid #E2E8F0', borderRadius: '10px', fontWeight: 700, fontSize: '13px', textAlign: 'center', textDecoration: 'none' }}>
                        Profil
                      </a>
                      
                      {/* BOUTON SUIVRE / ABONNÉ */}
                      <button onClick={() => toggleFollow(s.id)} style={{ flex: 1, padding: '10px', background: followingIds.includes(s.id) ? '#ECFDF5' : '#FFF', color: followingIds.includes(s.id) ? '#059669' : '#1E40AF', border: `1px solid ${followingIds.includes(s.id) ? '#A7F3D0' : '#BFDBFE'}`, borderRadius: '10px', fontWeight: 700, fontSize: '13px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px', cursor: 'pointer', transition: 'all 0.2s' }}>
                        {followingIds.includes(s.id) ? <><UserCheck size={16} /> Abonné</> : <><UserPlus size={16} /> Suivre</>}
                      </button>
                    </div>

                    {/* BOUTON MESSAGE EN DESSOUS */}
                    <a href={`/chat/${s.id}`} style={{ width: '100%', marginTop: '8px', padding: '10px', background: '#1E40AF', color: '#FFF', borderRadius: '10px', fontWeight: 700, fontSize: '13px', textAlign: 'center', textDecoration: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
                      <MessageCircle size={14} /> Message
                    </a>

                  </motion.div>
                ))}
              </motion.div>
            )}
          </div>
        </div>

        {/* COLONNE DROITE */}
        <div style={{ width: '300px', padding: '20px', display: 'block', borderLeft: '1px solid #E2E8F0' }}>
            <div style={{ background: '#FFF', padding: '20px', borderRadius: '16px', border: '1px solid #E2E8F0' }}>
              <h3 style={{ fontSize: '16px', fontWeight: 800, color: '#0F172A', marginBottom: '12px' }}>Conseil du jour</h3>
              <p style={{ fontSize: '14px', color: '#64748B', lineHeight: 1.5 }}>
                N'hésite pas à envoyer un message aux étudiants de ta filière pour organiser des sessions de révision ou échanger des documents.
              </p>
            </div>
        </div>

      </div>
    </div>
  );
}