'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, X, User as UserIcon, Trash2 } from 'lucide-react';

export default function StoriesBar({ profile }: { profile: any }) {
  const [stories, setStories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  // États pour la création
  const [showCreator, setShowCreator] = useState(false);
  const [storyText, setStoryText] = useState('');
  const [storyFile, setStoryFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);

  // États pour la visionneuse
  const [activeStoryIndex, setActiveStoryIndex] = useState<number | null>(null);
  const [progress, setProgress] = useState(0);

  const loadStories = async () => {
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    
    const { data } = await supabase
      .from('stories')
      .select('*, profiles(full_name, avatar_url)')
      .gte('created_at', yesterday)
      .order('created_at', { ascending: true });
      
    if (data) setStories(data);
    setLoading(false);
  };

  useEffect(() => {
    loadStories();
  }, []);

  // GESTION DU DÉFILEMENT AUTOMATIQUE
  useEffect(() => {
    if (activeStoryIndex !== null) {
      setProgress(0);
      const duration = 5000; // 5 secondes par story
      const interval = 50; 
      const step = (interval / duration) * 100;

      const timer = setInterval(() => {
        setProgress((prev) => {
          if (prev >= 100) {
            clearInterval(timer);
            handleNextStory();
            return 0;
          }
          return prev + step;
        });
      }, interval);

      return () => clearInterval(timer);
    }
  }, [activeStoryIndex]);

  const handleNextStory = () => {
    if (activeStoryIndex !== null && activeStoryIndex < stories.length - 1) {
      setActiveStoryIndex(activeStoryIndex + 1);
    } else {
      setActiveStoryIndex(null);
    }
  };

  const handlePrevStory = () => {
    if (activeStoryIndex !== null && activeStoryIndex > 0) {
      setActiveStoryIndex(activeStoryIndex - 1);
    } else {
      setActiveStoryIndex(null);
    }
  };

  // --- FONCTION DE CRÉATION (Corrigée avec media_url et media_type) ---
  const handleCreateStory = async (e: React.FormEvent) => {
    e.preventDefault();
    if ((!storyText.trim() && !storyFile) || !profile) return;
    setUploading(true);

    let media_url = null;
    let media_type = null;

    try {
      if (storyFile) {
        media_type = storyFile.type;
        const ext = storyFile.name.split('.').pop();
        const path = `stories/${profile.id}-${Date.now()}.${ext}`;
        
        const { error: upErr } = await supabase.storage.from('avatars').upload(path, storyFile);
        if (upErr) throw upErr;

        const { data } = supabase.storage.from('avatars').getPublicUrl(path);
        media_url = data.publicUrl;
      }

      // ⚠️ ON ENVOIE DANS 'media_url' et 'media_type'
      const { error: dbError } = await supabase.from('stories').insert({
        user_id: profile.id,
        content: storyText.trim() ? storyText.trim() : null,
        media_url: media_url,
        media_type: media_type 
      });

      if (dbError) throw dbError;

      setShowCreator(false);
      setStoryText('');
      setStoryFile(null);
      loadStories();
      
    } catch (err: any) {
      console.error("Erreur Supabase :", err);
      alert("Impossible de publier la story. Erreur : " + err.message);
    } finally {
      setUploading(false);
    }
  };

  // --- FONCTION DE SUPPRESSION ---
  const handleDeleteStory = async (story: any) => {
    if (!confirm("Supprimer cette story ?")) return;
    
    try {
      setActiveStoryIndex(null);
      setStories(stories.filter(s => s.id !== story.id));

      const { error } = await supabase.from('stories').delete().eq('id', story.id);
      
      if (error) {
        console.error("Erreur Supabase :", error);
        alert("Erreur de suppression : " + error.message);
        loadStories();
        return;
      }

      if (story.media_url) {
        const pathParts = story.media_url.split('/avatars/');
        if (pathParts.length > 1) {
          const filePath = pathParts[1];
          supabase.storage.from('avatars').remove([filePath]).catch(e => console.log("Erreur suppression image:", e));
        }
      }

    } catch (err: any) {
      alert("Erreur : " + err.message);
    }
  };

  if (loading) return null;

  const activeStory = activeStoryIndex !== null ? stories[activeStoryIndex] : null;
  const isMyActiveStory = activeStory?.user_id === profile?.id;

  return (
    <div style={{ padding: '16px 24px', borderBottom: '1px solid #E2E8F0', background: '#FFF' }}>
      <div style={{ display: 'flex', gap: '16px', overflowX: 'auto', paddingBottom: '8px', scrollbarWidth: 'none' }}>
        
        {/* BOUTON AJOUTER */}
        <div onClick={() => setShowCreator(true)} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', cursor: 'pointer', minWidth: '72px' }}>
          <div style={{ position: 'relative', width: '72px', height: '72px', borderRadius: '50%', background: '#F8FAFC', border: '2px dashed #CBD5E1', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            {profile?.avatar_url ? <img src={profile.avatar_url} style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover', opacity: 0.5 }} /> : <UserIcon size={32} color="#94A3B8" />}
            <div style={{ position: 'absolute', bottom: 0, right: 0, background: '#F59E0B', borderRadius: '50%', padding: '4px', border: '2px solid #FFF' }}>
              <Plus size={16} color="#FFF" />
            </div>
          </div>
          <span style={{ fontSize: '12px', color: '#64748B', fontWeight: 600 }}>Ma story</span>
        </div>

        {/* LISTE DES STORIES (Corrigée avec media_type) */}
        {stories.map((story, index) => (
          <div key={story.id} onClick={() => setActiveStoryIndex(index)} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', cursor: 'pointer', minWidth: '72px' }}>
            <div style={{ width: '72px', height: '72px', borderRadius: '50%', padding: '3px', background: 'linear-gradient(45deg, #F59E0B, #EF4444, #8B5CF6)' }}>
              <div style={{ width: '100%', height: '100%', borderRadius: '50%', border: '2px solid #FFF', overflow: 'hidden', background: '#F1F5F9' }}>
                {story.media_url && story.media_type?.startsWith('image') ? (
                  <img src={story.media_url} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                ) : story.profiles?.avatar_url ? (
                  <img src={story.profiles.avatar_url} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                ) : (
                  <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#E2E8F0' }}><UserIcon size={24} color="#64748B" /></div>
                )}
              </div>
            </div>
            <span style={{ fontSize: '12px', color: '#0F172A', fontWeight: 600, width: '72px', textAlign: 'center', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {story.profiles?.full_name?.split(' ')[0] || 'Étudiant'}
            </span>
          </div>
        ))}
      </div>

      {/* --- MODAL CRÉATION --- */}
      <AnimatePresence>
        {showCreator && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.8)', zIndex: 999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
            <motion.div initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} style={{ background: '#FFF', borderRadius: '24px', width: '100%', maxWidth: '400px', overflow: 'hidden' }}>
              <div style={{ padding: '16px 20px', borderBottom: '1px solid #E2E8F0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h3 style={{ fontSize: '18px', fontWeight: 800, color: '#0F172A' }}>Créer une story</h3>
                <button onClick={() => setShowCreator(false)} style={{ background: 'transparent', color: '#64748B' }}><X size={24} /></button>
              </div>
              <form onSubmit={handleCreateStory} style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <textarea value={storyText} onChange={(e) => setStoryText(e.target.value)} placeholder="Quoi de neuf ? (Texte optionnel)" rows={3} style={{ width: '100%', padding: '16px', borderRadius: '12px', border: '1px solid #E2E8F0', background: '#F8FAFC', outline: 'none', resize: 'none' }} />
                <div>
                  <label style={{ fontSize: '13px', fontWeight: 600, color: '#475569', marginBottom: '8px', display: 'block' }}>Photo (Optionnel)</label>
                  <input type="file" accept="image/*" onChange={(e) => setStoryFile(e.target.files?.[0] || null)} style={{ fontSize: '14px' }} />
                </div>
                <button type="submit" disabled={uploading || (!storyText.trim() && !storyFile)} style={{ padding: '16px', background: 'linear-gradient(135deg, #F59E0B, #F77F00)', color: '#FFF', borderRadius: '12px', fontWeight: 800, fontSize: '16px', opacity: (uploading || (!storyText.trim() && !storyFile)) ? 0.5 : 1 }}>
                  {uploading ? 'Publication...' : 'Publier la story'}
                </button>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* --- VISIONNEUSE DE STORY (Corrigée avec media_type) --- */}
      <AnimatePresence>
        {activeStory && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.95)', zIndex: 9999, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
            
            <div onClick={handlePrevStory} style={{ position: 'absolute', left: 0, top: '80px', bottom: 0, width: '30%', zIndex: 20, cursor: 'pointer' }} />
            <div onClick={handleNextStory} style={{ position: 'absolute', right: 0, top: '80px', bottom: 0, width: '70%', zIndex: 20, cursor: 'pointer' }} />

            <div style={{ position: 'relative', width: '100%', maxWidth: '400px', height: '80vh', background: '#1E293B', borderRadius: '16px', overflow: 'hidden' }}>
              
              <div style={{ position: 'absolute', top: '16px', left: '16px', right: '16px', height: '3px', background: 'rgba(255,255,255,0.3)', borderRadius: '2px', zIndex: 10 }}>
                <div style={{ width: `${progress}%`, height: '100%', background: '#FFF', borderRadius: '2px', transition: 'width 0.05s linear' }} />
              </div>

              <div style={{ position: 'absolute', top: '30px', left: '16px', right: '16px', display: 'flex', alignItems: 'center', gap: '12px', zIndex: 30 }}>
                {activeStory.profiles?.avatar_url ? <img src={activeStory.profiles.avatar_url} style={{ width: '32px', height: '32px', borderRadius: '50%' }} /> : <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: '#475569' }} />}
                <p style={{ color: '#FFF', fontWeight: 700, fontSize: '14px', textShadow: '0 2px 4px rgba(0,0,0,0.5)', flex: 1 }}>{activeStory.profiles?.full_name}</p>
                
                {isMyActiveStory && (
                  <button 
                    onClick={(e) => { e.stopPropagation(); handleDeleteStory(activeStory); }} 
                    style={{ background: 'rgba(239, 68, 68, 0.2)', padding: '8px', borderRadius: '50%', color: '#EF4444', position: 'relative', zIndex: 40 }}
                  >
                    <Trash2 size={20} />
                  </button>
                )}
                
                <button 
                  onClick={(e) => { e.stopPropagation(); setActiveStoryIndex(null); }} 
                  style={{ background: 'transparent', color: '#FFF', position: 'relative', zIndex: 40 }}
                >
                  <X size={24} />
                </button>
              </div>

              {activeStory.media_url && activeStory.media_type?.startsWith('image') ? (
                <img src={activeStory.media_url} style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
              ) : (
                <div style={{ width: '100%', height: '100%', background: 'linear-gradient(135deg, #1E40AF, #8B5CF6)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px' }}>
                  <p style={{ color: '#FFF', fontSize: '24px', fontWeight: 800, textAlign: 'center' }}>{activeStory.content}</p>
                </div>
              )}

              {activeStory.media_url && activeStory.content && (
                <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, background: 'linear-gradient(to top, rgba(0,0,0,0.8), transparent)', padding: '40px 20px 20px' }}>
                  <p style={{ color: '#FFF', fontSize: '16px', fontWeight: 600 }}>{activeStory.content}</p>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}