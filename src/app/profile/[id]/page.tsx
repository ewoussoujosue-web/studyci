'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { motion } from 'framer-motion';
import { supabase } from '@/lib/supabase';
import { User, MessageCircle, UserPlus, UserCheck, CheckCircle, Flame, Award, Zap } from 'lucide-react';
import Loader from '@/components/Loader';

export default function PublicProfilePage() {
  const params = useParams();
  const id = params.id as string;
  
  const [profile, setProfile] = useState<any>(null);
  const [me, setMe] = useState<any>(null);
  const [following, setFollowing] = useState(false);
  const [followersCount, setFollowersCount] = useState(0);
  const [docCount, setDocCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [myName, setMyName] = useState<string>('');

  useEffect(() => {
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { window.location.href = '/inscription'; return; }
      setMe(session.user);

      // Récupérer mon nom pour l'afficher dans la notification
      const { data: myProf } = await supabase.from('profiles').select('full_name').eq('id', session.user.id).single();
      setMyName(myProf?.full_name || 'Quelqu\'un');

      const { data: prof } = await supabase.from('profiles').select('*').eq('id', id).single();
      setProfile(prof);

      const { data: f } = await supabase.from('follows').select('*').eq('follower_id', session.user.id).eq('following_id', id).maybeSingle();
      setFollowing(!!f);

      const { count: fCount } = await supabase.from('follows').select('*', { count: 'exact', head: true }).eq('following_id', id);
      setFollowersCount(fCount || 0);

      const { count: dCount } = await supabase.from('documents').select('*', { count: 'exact', head: true }).eq('uploader_id', id).eq('status', 'approved');
      setDocCount(dCount || 0);
      
      setLoading(false);
    })();
  }, [id]);

  const toggleFollow = async () => {
    if (!me) return;
    if (following) {
      await supabase.from('follows').delete().eq('follower_id', me.id).eq('following_id', id);
      setFollowing(false);
      setFollowersCount(c => Math.max(0, c - 1));
    } else {
      const { error } = await supabase.from('follows').insert({ follower_id: me.id, following_id: id });
      if (!error) {
        setFollowing(true);
        setFollowersCount(c => c + 1);

        // Créer une notification pour la personne suivie (sauf si je me suis suivi moi-même)
        if (id !== me.id) {
          await supabase.from('notifications').insert({
            user_id: id,
            title: 'Nouvel abonné 👥',
            message: `${myName} a commencé à te suivre.`,
            type: 'follow'
          });
        }
      }
    }
  };

  // --- SÉCURITÉ ---
  if (loading) return <Loader text="Chargement du profil..." />;
  if (!profile) return <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#EF4444', background: '#F8FAFC' }}>Profil introuvable</div>;

  const imageUrl = profile.avatar_url && profile.avatar_url.startsWith('http') ? profile.avatar_url : null;
  
  // On s'assure que skills est bien une chaîne de caractères avant de faire le split
  const skillList = (typeof profile.skills === 'string' && profile.skills.length > 0) 
    ? profile.skills.split(',').map((s: string) => s.trim()).filter((s: string) => s !== '') 
    : [];

  // --- AFFICHAGE ---
  return (
    <div style={{ minHeight: '100vh', background: '#F8FAFC', paddingBottom: '60px', position: 'relative' }}>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.6 }}
        style={{ height: '220px', background: 'linear-gradient(135deg, #1E40AF 0%, #3B82F6 50%, #F59E0B 100%)', backgroundSize: '200% 200%', animation: 'gradientShift 8s ease infinite' }} />

      <div style={{ maxWidth: '700px', margin: '0 auto', padding: '0 24px', marginTop: '-80px', position: 'relative', zIndex: 10 }}>
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
          style={{ background: '#FFFFFF', borderRadius: '24px', padding: '32px', boxShadow: '0 20px 40px rgba(0,0,0,0.08)', border: '1px solid #E2E8F0' }}>
          
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '24px', marginBottom: '24px', flexWrap: 'wrap' }}>
            <motion.div whileHover={{ scale: 1.05 }} transition={{ type: 'spring', stiffness: 300 }} style={{ position: 'relative' }}>
              {imageUrl ? (
                <img src={imageUrl} alt="Avatar" style={{ width: '120px', height: '120px', borderRadius: '50%', objectFit: 'cover', border: '4px solid #FFF', boxShadow: '0 8px 20px rgba(0,0,0,0.1)' }} />
              ) : (
                <div style={{ width: '120px', height: '120px', borderRadius: '50%', background: '#F1F5F9', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '4px solid #FFF', boxShadow: '0 8px 20px rgba(0,0,0,0.1)' }}>
                  <User size={60} color="#94A3B8" />
                </div>
              )}
              <div style={{ position: 'absolute', bottom: '5px', right: '5px', background: '#3B82F6', borderRadius: '50%', padding: '4px', border: '2px solid #FFF' }}>
                <CheckCircle size={16} color="#FFF" />
              </div>
            </motion.div>

            <div style={{ flex: 1, minWidth: '200px' }}>
              <h1 style={{ fontSize: '28px', fontWeight: 800, color: '#0F172A' }}>{profile.full_name || 'Étudiant'}</h1>
              <div style={{ display: 'flex', gap: '12px', alignItems: 'center', marginTop: '8px' }}>
                <span style={{ background: 'rgba(245,158,11,0.15)', color: '#B45309', padding: '4px 12px', borderRadius: '20px', fontWeight: 700, fontSize: '13px' }}>
                  {profile.level || 'Étudiant'}
                </span>
                <motion.p key={followersCount} initial={{ scale: 1.2 }} animate={{ scale: 1 }} style={{ color: '#64748B', fontSize: '14px', fontWeight: 500 }}>
                  {followersCount} abonné(s)
                </motion.p>
              </div>
            </div>
          </div>

          {/* BADGES */}
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '24px' }}>
            {followersCount >= 3 && <span style={{ background: '#FEF2F2', color: '#EF4444', padding: '6px 12px', borderRadius: '20px', fontSize: '12px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '4px' }}><Flame size={14} /> Populaire</span>}
            {docCount >= 5 && <span style={{ background: '#EFF6FF', color: '#3B82F6', padding: '6px 12px', borderRadius: '20px', fontSize: '12px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '4px' }}><Award size={14} /> Top Contributeur</span>}
            {docCount > 0 && docCount < 5 && <span style={{ background: '#F8FAFC', color: '#64748B', padding: '6px 12px', borderRadius: '20px', fontSize: '12px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '4px' }}>📚 Membre actif</span>}
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '24px' }}>
            <div style={{ background: '#F8FAFC', padding: '24px', borderRadius: '16px', border: '1px solid #E2E8F0' }}>
              <h3 style={{ fontSize: '14px', fontWeight: 700, color: '#475569', marginBottom: '8px' }}>À propos</h3>
              <p style={{ color: '#334155', fontSize: '15px', lineHeight: 1.6 }}>
                {profile.bio || 'Cet étudiant n\'a pas encore écrit de bio.'}
              </p>
            </div>

            {/* COMPÉTENCES PUBLIQUES */}
            {skillList.length > 0 && (
              <div style={{ background: '#F8FAFC', padding: '24px', borderRadius: '16px', border: '1px solid #E2E8F0' }}>
                <h3 style={{ fontSize: '14px', fontWeight: 700, color: '#475569', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}><Zap size={16} color="#F59E0B" /> Compétences</h3>
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                  {skillList.map((skill: string, index: number) => (
                    <span key={index} style={{ background: '#FFF', border: '1px solid #E2E8F0', padding: '6px 12px', borderRadius: '8px', fontSize: '13px', fontWeight: 600, color: '#0F172A' }}>
                      {skill}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div style={{ display: 'flex', gap: '12px' }}>
            <motion.button onClick={toggleFollow} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
              style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: '16px', background: following ? '#F1F5F9' : '#F59E0B', color: following ? '#0F172A' : '#FFFFFF', border: following ? '1px solid #E2E8F0' : 'none', borderRadius: '12px', fontWeight: 700, fontSize: '15px', transition: 'all 0.2s' }}>
              {following ? <><UserCheck size={20}/> Abonné</> : <><UserPlus size={20}/> Suivre</>}
            </motion.button>
            
            <motion.a href={`/chat/${id}`} whileHover={{ scale: 1.02, boxShadow: '0 10px 25px rgba(30,64,175,0.3)' }} whileTap={{ scale: 0.98 }}
              style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: '16px', background: 'linear-gradient(135deg, #1E40AF, #3B82F6)', color: '#FFF', borderRadius: '12px', fontWeight: '700', fontSize: '15px' }}>
              <MessageCircle size={20} /> Envoyer un message
            </motion.a>
          </div>

        </motion.div>
      </div>
    </div>
  );
}