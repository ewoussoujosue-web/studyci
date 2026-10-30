'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Plus, X, User, ChevronLeft, ChevronRight, Image as ImageIcon } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function StoriesBar({ profile }: { profile: any }) {
  const [stories, setStories] = useState<any[]>([]);
  const [groupedStories, setGroupedStories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  // État pour la visionneuse (modal)
  const [activeStoryIndex, setActiveStoryIndex] = useState<number | null>(null);
  const [activeUserStories, setActiveUserStories] = useState<any[]>([]);
  const [storyIndex, setStoryIndex] = useState(0);

  // État pour la création de story
  const [showCreate, setShowCreate] = useState(false);
  const [newStoryText, setNewStoryText] = useState('');
  const [newStoryImage, setNewStoryImage] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    fetchStories();
  }, []);

  const fetchStories = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      // On récupère les stories de moins de 24h
      const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      
      const { data, error } = await supabase
        .from('stories')
        .select('*, profiles(full_name, avatar_url)')
        .gte('created_at', oneDayAgo)
        .order('created_at', { ascending: false });

      if (error) {
        console.error("Erreur chargement stories:", error);
        return;
      }

      if (data) {
        setStories(data);
        
        // Grouper les stories par utilisateur
        const grouped = data.reduce((acc: any, story: any) => {
          if (!acc[story.user_id]) {
            acc[story.user_id] = {
              user_id: story.user_id,
              profile: story.profiles,
              stories: []
            };
          }
          acc[story.user_id].stories.push(story);
          return acc;
        }, {});

        // On met mon profil en premier si j'ai des stories
        const groupedArray = Object.values(grouped).sort((a: any, b: any) => {
          if (a.user_id === session.user.id) return -1;
          if (b.user_id === session.user.id) return 1;
          return 0;
        });

        setGroupedStories(groupedArray);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateStory = async () => {
    if (!newStoryText.trim() && !newStoryImage) return;
    setUploading(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      let media_url = null;
      let media_type = 'text';

      if (newStoryImage) {
        const ext = newStoryImage.name.split('.').pop();
        const path = `stories/${session.user.id}-${Date.now()}.${ext}`;
        
        const { error: uploadError } = await supabase.storage.from('avatars').upload(path, newStoryImage);
        if (uploadError) throw uploadError;

        const { data } = supabase.storage.from('avatars').getPublicUrl(path);
        media_url = data.publicUrl;
        media_type = 'image';
      }

      const { error } = await supabase.from('stories').insert({
        user_id: session.user.id,
        content: newStoryText.trim(),
        media_url,
        media_type
      });

      if (!error) {
        setShowCreate(false);
        setNewStoryText('');
        setNewStoryImage(null);
        fetchStories(); // Recharger
      }
    } catch (err: any) {
      alert("Erreur : " + err.message);
    } finally {
      setUploading(false);
    }
  };

  const handleDeleteStory = async (storyId: string) => {
    if (!confirm("Supprimer cette story ?")) return;
    await supabase.from('stories').delete().eq('id', storyId);
    setActiveStoryIndex(null);
    fetchStories();
  };

  const openStory = (index: number) => {
    const userGroup = groupedStories[index];
    setActiveUserStories(userGroup.stories);
    setActiveStoryIndex(index);
    setStoryIndex(0);
  };

  const nextStory = () => {
    if (storyIndex < activeUserStories.length - 1) {
      setStoryIndex(storyIndex + 1);
    } else {
      // Passer à l'utilisateur suivant
      if (activeStoryIndex !== null && activeStoryIndex < groupedStories.length - 1) {
        openStory(activeStoryIndex + 1);
      } else {
        setActiveStoryIndex(null); // Fermer
      }
    }
  };

  const prevStory = () => {
    if (storyIndex > 0) {
      setStoryIndex(storyIndex - 1);
    } else {
      // Revenir à l'utilisateur précédent
      if (activeStoryIndex !== null && activeStoryIndex > 0) {
        openStory(activeStoryIndex - 1);
      }
    }
  };

  // Gestion du minuteur automatique
  useEffect(() => {
    if (activeStoryIndex === null) return;
    const timer = setTimeout(() => {
      nextStory();
    }, 5000); // 5 secondes par story
    return () => clearTimeout(timer);
  }, [activeStoryIndex, storyIndex]);

  if (loading) return null;

  return (
    <>
      {/* BARRE DES STORIES */}
      <div style={{ display: 'flex', gap: '16px', padding: '16px 24px', overflowX: 'auto', borderBottom: '1px solid #E2E8F0', background: '#FFF' }}>
        
        {/* BOUTON CRÉER STORY */}
        <div onClick={() => setShowCreate(true)} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px', cursor: 'pointer', flexShrink: 0 }}>
          <div style={{ position: 'relative' }}>
            {profile?.avatar_url ? (
              <img src={profile.avatar_url} style={{ width: '60px', height: '60px', borderRadius: '50%', objectFit: 'cover', border: '2px solid #FFF' }} />
            ) : (
              <div style={{ width: '60px', height: '60px', borderRadius: '50%', background: '#F1F5F9', border: '1px solid #E2E8F0', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <User size={24} color="#94A3B8" />
              </div>
            )}
            <div style={{ position: 'absolute', bottom: '0', right: '0', background: '#3B82F6', borderRadius: '50%', padding: '2px', border: '2px solid #FFF' }}>
              <Plus size={14} color="#FFF" />
            </div>
          </div>
          <p style={{ fontSize: '11px', color: '#64748B', fontWeight: 600 }}>Ma story</p>
        </div>

        {/* LISTE DES STORIES DES AMIS */}
        {groupedStories.map((group: any, index: number) => (
          <div key={group.user_id} onClick={() => openStory(index)} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px', cursor: 'pointer', flexShrink: 0 }}>
            <div style={{ padding: '3px', borderRadius: '50%', background: 'linear-gradient(45deg, #F59E0B, #EF4444)' }}>
              {group.profile?.avatar_url ? (
                <img src={group.profile.avatar_url} style={{ width: '56px', height: '56px', borderRadius: '50%', objectFit: 'cover', border: '2px solid #FFF' }} />
              ) : (
                <div style={{ width: '56px', height: '56px', borderRadius: '50%', background: '#F1F5F9', border: '2px solid #FFF', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <User size={24} color="#94A3B8" />
                </div>
              )}
            </div>
            <p style={{ fontSize: '11px', color: '#0F172A', fontWeight: 600, maxWidth: '64px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {group.user_id === profile?.id ? 'Moi' : group.profile?.full_name?.split(' ')[0]}
            </p>
          </div>
        ))}
      </div>

      {/* --- MODAL DE VISIONNAGE --- */}
      <AnimatePresence>
        {activeStoryIndex !== null && activeUserStories[storyIndex] && (
          <motion.div 
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.9)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          >
            {/* Bouton Fermer */}
            <button onClick={() => setActiveStoryIndex(null)} style={{ position: 'absolute', top: '20px', right: '20px', color: '#FFF', background: 'rgba(255,255,255,0.2)', padding: '10px', borderRadius: '50%', zIndex: 10000, border: 'none', cursor: 'pointer' }}>
              <X size={24} />
            </button>

            {/* Bouton Précédent */}
            <button onClick={prevStory} style={{ position: 'absolute', left: '10px', color: '#FFF', background: 'rgba(255,255,255,0.1)', padding: '10px', borderRadius: '50%', border: 'none', cursor: 'pointer', zIndex: 10000 }}>
              <ChevronLeft size={30} />
            </button>

            {/* Contenu de la Story */}
            <div style={{ position: 'relative', width: '100%', maxWidth: '400px', height: '80vh', background: '#1E293B', borderRadius: '16px', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
              
              {/* Barre de progression en haut */}
              <div style={{ position: 'absolute', top: '10px', left: '10px', right: '10px', display: 'flex', gap: '4px', zIndex: 10 }}>
                {activeUserStories.map((_, idx) => (
                  <div key={idx} style={{ flex: 1, height: '3px', background: idx === storyIndex ? '#FFF' : 'rgba(255,255,255,0.3)', borderRadius: '2px' }} />
                ))}
              </div>

              {/* En-tête de la story */}
              <div style={{ position: 'absolute', top: '20px', left: '16px', display: 'flex', alignItems: 'center', gap: '10px', zIndex: 10 }}>
                {activeUserStories[storyIndex].profiles?.avatar_url ? (
                  <img src={activeUserStories[storyIndex].profiles.avatar_url} style={{ width: '36px', height: '36px', borderRadius: '50%', objectFit: 'cover' }} />
                ) : (
                  <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: '#475569' }} />
                )}
                <p style={{ color: '#FFF', fontWeight: 700, fontSize: '14px' }}>{activeUserStories[storyIndex].profiles?.full_name}</p>
              </div>

              {/* Image ou Texte */}
              <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
                {activeUserStories[storyIndex].media_type === 'image' && activeUserStories[storyIndex].media_url ? (
                  <img src={activeUserStories[storyIndex].media_url} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                ) : (
                  <div style={{ padding: '24px', textAlign: 'center', background: 'linear-gradient(135deg, #1E3A8A, #8B5CF6)', width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <p style={{ color: '#FFF', fontSize: '24px', fontWeight: 800, textShadow: '0 2px 10px rgba(0,0,0,0.5)' }}>{activeUserStories[storyIndex].content}</p>
                  </div>
                )}
              </div>

              {/* Bouton supprimer si c'est ma story */}
              {activeUserStories[storyIndex].user_id === profile?.id && (
                <button onClick={() => handleDeleteStory(activeUserStories[storyIndex].id)} style={{ position: 'absolute', bottom: '20px', left: '50%', transform: 'translateX(-50%)', background: 'rgba(239, 68, 68, 0.8)', color: '#FFF', padding: '10px 20px', borderRadius: '20px', border: 'none', cursor: 'pointer', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px', zIndex: 10 }}>
                  Supprimer la story
                </button>
              )}

              {/* Barre de texte en bas si besoin */}
              {activeUserStories[storyIndex].content && activeUserStories[storyIndex].media_type === 'image' && (
                <div style={{ position: 'absolute', bottom: '60px', left: '20px', right: '20px', zIndex: 10 }}>
                  <p style={{ color: '#FFF', fontSize: '18px', fontWeight: 700, textAlign: 'center', textShadow: '0 2px 10px rgba(0,0,0,0.8)' }}>{activeUserStories[storyIndex].content}</p>
                </div>
              )}
            </div>

            {/* Bouton Suivant */}
            <button onClick={nextStory} style={{ position: 'absolute', right: '10px', color: '#FFF', background: 'rgba(255,255,255,0.1)', padding: '10px', borderRadius: '50%', border: 'none', cursor: 'pointer', zIndex: 10000 }}>
              <ChevronRight size={30} />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* --- MODAL DE CRÉATION --- */}
      <AnimatePresence>
        {showCreate && (
          <motion.div 
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.8)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}
          >
            <div style={{ background: '#FFF', borderRadius: '24px', padding: '24px', width: '100%', maxWidth: '400px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <h3 style={{ fontSize: '20px', fontWeight: 800, color: '#0F172A' }}>Créer une story</h3>
                <button onClick={() => setShowCreate(false)} style={{ background: 'transparent', color: '#64748B', border: 'none', cursor: 'pointer' }}><X size={24} /></button>
              </div>

              <textarea 
                value={newStoryText} 
                onChange={(e) => setNewStoryText(e.target.value)} 
                placeholder="Écris quelque chose..." 
                style={{ width: '100%', height: '100px', padding: '16px', background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: '12px', fontSize: '15px', outline: 'none', resize: 'none', marginBottom: '16px' }}
              />

              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '12px 16px', background: '#EFF6FF', color: '#1E40AF', borderRadius: '12px', fontWeight: 700, cursor: 'pointer', marginBottom: '24px' }}>
                <ImageIcon size={20} /> 
                {newStoryImage ? newStoryImage.name : 'Ajouter une image (Optionnel)'}
                <input type="file" accept="image/*" style={{ display: 'none' }} onChange={(e) => setNewStoryImage(e.target.files?.[0] || null)} />
              </label>

              <button 
                onClick={handleCreateStory} 
                disabled={uploading || (!newStoryText.trim() && !newStoryImage)}
                style={{ width: '100%', padding: '16px', background: '#F59E0B', color: '#FFF', border: 'none', borderRadius: '12px', fontWeight: 800, fontSize: '16px', cursor: 'pointer', opacity: uploading ? 0.7 : 1 }}
              >
                {uploading ? 'Publication...' : 'Publier la story'}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}