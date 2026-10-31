'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Plus, X, User, ChevronLeft, ChevronRight, Image as ImageIcon, Send, Eye } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function StoriesBar({ profile }: { profile: any }) {
  const [groupedStories, setGroupedStories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Navigation
  const [activeStoryIndex, setActiveStoryIndex] = useState<number | null>(null);
  const [activeUserStories, setActiveUserStories] = useState<any[]>([]);
  const [storyIndex, setStoryIndex] = useState(0);
  
  // Interactions
  const [replyText, setReplyText] = useState('');
  const [sendingReply, setSendingReply] = useState(false);
  const [showViewsList, setShowViewsList] = useState(false);
  const [storyViews, setStoryViews] = useState<any[]>([]);

  // Création
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

      const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      
      // 1. Récupérer les stories de moins de 24h
      const { data: storiesData } = await supabase
        .from('stories')
        .select('*, profiles(full_name, avatar_url, last_seen)')
        .gte('created_at', oneDayAgo)
        .order('created_at', { ascending: false });

      // 2. Récupérer TOUTES les vues de l'utilisateur actuel
      const { data: viewsData } = await supabase
        .from('story_views')
        .select('story_id')
        .eq('viewer_id', session.user.id);

      const seenStoryIds = new Set(viewsData?.map(v => v.story_id) || []);

      if (storiesData) {
        const grouped = storiesData.reduce((acc: any, story: any) => {
          if (!acc[story.user_id]) {
            acc[story.user_id] = {
              user_id: story.user_id,
              profile: story.profiles,
              stories: [],
              allSeen: true
            };
          }
          acc[story.user_id].stories.push(story);
          
          if (!seenStoryIds.has(story.id)) {
            acc[story.user_id].allSeen = false;
          }
          
          return acc;
        }, {});

        const groupedArray = Object.values(grouped).sort((a: any, b: any) => {
          if (a.user_id === session.user.id) return -1;
          if (b.user_id === session.user.id) return 1;
          if (!a.allSeen && b.allSeen) return -1;
          if (a.allSeen && !b.allSeen) return 1;
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

  const registerView = async (storyId: string) => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;
    
    const storyOwnerId = activeUserStories[storyIndex].user_id;
    if (storyOwnerId === session.user.id) return; 

    const { error } = await supabase.from('story_views').insert({
      story_id: storyId,
      viewer_id: session.user.id
    });

    if (error) {
      console.error("Erreur d'enregistrement de vue:", error);
    } else {
      setGroupedStories(prev => prev.map(g => g.user_id === storyOwnerId ? { ...g, allSeen: true } : g));
    }
  };

  const fetchViews = async (storyId: string) => {
    setStoryViews([]);
    
    const { data, error } = await supabase
      .from('story_views')
      .select('viewer_id, profiles(full_name, avatar_url)')
      .eq('story_id', storyId);
      
    if (error) {
      console.error("Erreur chargement des vues:", error);
    }
    
    if (data) {
      setStoryViews(data);
    }
  };

  const openStory = (index: number) => {
    const userGroup = groupedStories[index];
    setActiveUserStories(userGroup.stories);
    setActiveStoryIndex(index);
    setStoryIndex(0);
    setReplyText('');
    setShowViewsList(false);
    
    const currentStory = userGroup.stories[0];
    registerView(currentStory.id);
    
    // ⚡ CHARGER LES VUES SI C'EST MA STORY
    if (currentStory.user_id === profile?.id) {
      fetchViews(currentStory.id);
    }
  };

  const closeStory = () => {
    setActiveStoryIndex(null);
    fetchStories(); 
  };

  const nextStory = () => {
    if (storyIndex < activeUserStories.length - 1) {
      const nextIdx = storyIndex + 1;
      setStoryIndex(nextIdx);
      setShowViewsList(false);
      
      const nextStoryObj = activeUserStories[nextIdx];
      registerView(nextStoryObj.id);
      
      if (nextStoryObj.user_id === profile?.id) {
        fetchViews(nextStoryObj.id);
      }
    } else {
      if (activeStoryIndex !== null && activeStoryIndex < groupedStories.length - 1) {
        openStory(activeStoryIndex + 1);
      } else {
        closeStory(); 
      }
    }
  };

  const prevStory = () => {
    if (storyIndex > 0) {
      setStoryIndex(storyIndex - 1);
      setShowViewsList(false);
      
      const prevStoryObj = activeUserStories[storyIndex - 1];
      if (prevStoryObj.user_id === profile?.id) {
        fetchViews(prevStoryObj.id);
      }
    } else {
      if (activeStoryIndex !== null && activeStoryIndex > 0) {
        openStory(activeStoryIndex - 1);
      }
    }
  };

  const handleReply = async () => {
    if (!replyText.trim() || activeStoryIndex === null) return;
    setSendingReply(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      const story = activeUserStories[storyIndex];
      
      await supabase.from('messages').insert({
        sender_id: session.user.id,
        receiver_id: story.user_id,
        content: `A répondu à ta story : "${replyText.trim()}"`
      });
      setReplyText('');
      closeStory();
      alert("Message envoyé !");
    } catch (err) {
      console.error(err);
    } finally {
      setSendingReply(false);
    }
  };

  const deleteStory = async (storyId: string) => {
    if (!confirm("Supprimer cette story ?")) return;
    await supabase.from('stories').delete().eq('id', storyId);
    closeStory();
  };

  const handleCreateStory = async () => {
    if (!newStoryText.trim() && !newStoryImage) return;
    setUploading(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Utilisateur non connecté");

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

      const { error: insertError } = await supabase.from('stories').insert({
        user_id: session.user.id,
        content: newStoryText.trim(),
        media_url,
        media_type
      });

      if (insertError) throw insertError;

      setShowCreate(false);
      setNewStoryText('');
      setNewStoryImage(null);
      fetchStories();
      
    } catch (err: any) {
      alert("❌ Erreur : " + err.message);
    } finally {
      setUploading(false);
    }
  };

  if (loading) return null;

  return (
    <>
      <div style={{ display: 'flex', gap: '16px', padding: '16px 24px', overflowX: 'auto', borderBottom: '1px solid #E2E8F0', background: '#FFF' }}>
        
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

        {groupedStories.map((group: any, index: number) => (
          <div key={group.user_id} onClick={() => openStory(index)} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px', cursor: 'pointer', flexShrink: 0 }}>
            
            <div style={{ 
              padding: '3px', 
              borderRadius: '50%', 
              background: group.user_id === profile?.id 
                ? 'linear-gradient(45deg, #F59E0B, #EF4444)' 
                : group.allSeen 
                  ? '#E2E8F0' 
                  : 'linear-gradient(45deg, #F59E0B, #EF4444)' 
            }}>
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

      {/* MODAL VISIONNAGE */}
      <AnimatePresence>
        {activeStoryIndex !== null && activeUserStories[storyIndex] && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.95)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          >
            <AnimatePresence>
              {showViewsList && (
                <motion.div initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
                  style={{ position: 'absolute', bottom: 0, left: 0, right: 0, background: '#FFF', borderTopLeftRadius: '24px', borderTopRightRadius: '24px', maxHeight: '50vh', zIndex: 10001, display: 'flex', flexDirection: 'column' }}
                >
                  <div style={{ padding: '16px', borderBottom: '1px solid #E2E8F0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <h3 style={{ fontSize: '16px', fontWeight: 800, color: '#0F172A' }}>Vues ({storyViews.length})</h3>
                    <button onClick={() => setShowViewsList(false)} style={{ background: 'transparent', border: 'none', color: '#64748B' }}><X size={24} /></button>
                  </div>
                  <div style={{ flex: 1, overflowY: 'auto', padding: '16px' }}>
                    {storyViews.length === 0 ? (
                      <p style={{ textAlign: 'center', color: '#64748B', fontSize: '14px', marginTop: '20px' }}>Aucune vue pour le moment.</p>
                    ) : (
                      storyViews.map((view: any) => (
                        <div key={view.viewer_id} style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
                          {view.profiles?.avatar_url ? <img src={view.profiles.avatar_url} style={{ width: '40px', height: '40px', borderRadius: '50%' }} /> : <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: '#F1F5F9' }} />}
                          <p style={{ fontWeight: 700, color: '#0F172A', fontSize: '14px' }}>{view.profiles?.full_name}</p>
                        </div>
                      ))
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <button onClick={closeStory} style={{ position: 'absolute', top: '20px', right: '20px', color: '#FFF', background: 'rgba(255,255,255,0.2)', padding: '10px', borderRadius: '50%', zIndex: 10000, border: 'none', cursor: 'pointer' }}>
              <X size={24} />
            </button>

            <button onClick={prevStory} style={{ position: 'absolute', left: '10px', color: '#FFF', background: 'rgba(255,255,255,0.1)', padding: '10px', borderRadius: '50%', border: 'none', cursor: 'pointer', zIndex: 10000 }}>
              <ChevronLeft size={30} />
            </button>

            <div style={{ position: 'relative', width: '100%', maxWidth: '400px', height: '85vh', background: '#1E293B', borderRadius: '16px', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
              
              <div style={{ position: 'absolute', top: '10px', left: '10px', right: '10px', display: 'flex', gap: '4px', zIndex: 10 }}>
                {activeUserStories.map((_, idx) => (
                  <div key={idx} style={{ flex: 1, height: '3px', background: 'rgba(255,255,255,0.3)', borderRadius: '2px', overflow: 'hidden' }}>
                    {idx === storyIndex && (
                      <motion.div 
                        initial={{ width: 0 }} 
                        animate={{ width: '100%' }} 
                        transition={{ duration: 5, ease: 'linear' }} 
                        onAnimationComplete={nextStory}
                        style={{ height: '100%', background: '#FFF' }} 
                      />
                    )}
                    {idx < storyIndex && <div style={{ height: '100%', background: '#FFF' }} />}
                  </div>
                ))}
              </div>

              <div style={{ position: 'absolute', top: '20px', left: '16px', display: 'flex', alignItems: 'center', gap: '10px', zIndex: 10 }}>
                {activeUserStories[storyIndex].profiles?.avatar_url ? (
                  <img src={activeUserStories[storyIndex].profiles.avatar_url} style={{ width: '36px', height: '36px', borderRadius: '50%', objectFit: 'cover' }} />
                ) : (
                  <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: '#475569' }} />
                )}
                <div>
                  <p style={{ color: '#FFF', fontWeight: 700, fontSize: '14px' }}>{activeUserStories[storyIndex].profiles?.full_name}</p>
                  <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: '11px' }}>{new Date(activeUserStories[storyIndex].created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</p>
                </div>
              </div>

              <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {activeUserStories[storyIndex].media_type === 'image' && activeUserStories[storyIndex].media_url ? (
                  <img src={activeUserStories[storyIndex].media_url} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                ) : (
                  <div style={{ padding: '24px', textAlign: 'center', background: 'linear-gradient(135deg, #1E3A8A, #8B5CF6)', width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <p style={{ color: '#FFF', fontSize: '24px', fontWeight: 800, textShadow: '0 2px 10px rgba(0,0,0,0.5)' }}>{activeUserStories[storyIndex].content}</p>
                  </div>
                )}
              </div>

              {activeUserStories[storyIndex].user_id === profile?.id ? (
                <div style={{ position: 'absolute', bottom: '20px', left: '0', right: '0', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px', zIndex: 10 }}>
                  <button 
                    onClick={() => setShowViewsList(true)}
                    style={{ background: 'rgba(0,0,0,0.6)', color: '#FFF', padding: '10px 20px', borderRadius: '20px', border: 'none', cursor: 'pointer', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px' }}
                  >
                    <Eye size={18} /> {storyViews.length} vue{storyViews.length > 1 ? 's' : ''}
                  </button>
                  <button onClick={() => deleteStory(activeUserStories[storyIndex].id)} style={{ background: 'rgba(239, 68, 68, 0.8)', color: '#FFF', padding: '10px 20px', borderRadius: '20px', border: 'none', cursor: 'pointer', fontWeight: 700 }}>
                    Supprimer la story
                  </button>
                </div>
              ) : (
                <div style={{ position: 'absolute', bottom: '20px', left: '16px', right: '16px', zIndex: 10 }}>
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    <input 
                      value={replyText}
                      onChange={(e) => setReplyText(e.target.value)}
                      placeholder="Répondre à la story..."
                      style={{ flex: 1, padding: '12px 16px', borderRadius: '30px', border: '1px solid rgba(255,255,255,0.3)', background: 'rgba(0,0,0,0.3)', color: '#FFF', outline: 'none', fontSize: '14px' }}
                    />
                    <button 
                      onClick={handleReply}
                      disabled={!replyText.trim() || sendingReply}
                      style={{ background: '#3B82F6', color: '#FFF', padding: '12px', borderRadius: '50%', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: (!replyText.trim() || sendingReply) ? 0.5 : 1 }}
                    >
                      <Send size={18} />
                    </button>
                  </div>
                </div>
              )}
            </div>

            <button onClick={nextStory} style={{ position: 'absolute', right: '10px', color: '#FFF', background: 'rgba(255,255,255,0.1)', padding: '10px', borderRadius: '50%', border: 'none', cursor: 'pointer', zIndex: 10000 }}>
              <ChevronRight size={30} />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* MODAL CRÉATION */}
      <AnimatePresence>
        {showCreate && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
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

              {newStoryImage ? (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px', background: '#ECFDF5', color: '#065F46', borderRadius: '12px', marginBottom: '16px', border: '1px solid #A7F3D0' }}>
                  <span style={{ fontSize: '13px', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '200px' }}>{newStoryImage.name}</span>
                  <button onClick={() => setNewStoryImage(null)} style={{ background: 'transparent', border: 'none', color: '#EF4444', cursor: 'pointer' }}><X size={16} /></button>
                </div>
              ) : (
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '12px 16px', background: '#EFF6FF', color: '#1E40AF', borderRadius: '12px', fontWeight: 700, cursor: 'pointer', marginBottom: '16px' }}>
                  <ImageIcon size={20} /> Ajouter une image
                  <input type="file" accept="image/*" style={{ display: 'none' }} onChange={(e) => setNewStoryImage(e.target.files?.[0] || null)} />
                </label>
              )}

              <button 
                onClick={handleCreateStory} 
                disabled={uploading || (!newStoryText.trim() && !newStoryImage)}
                style={{ width: '100%', padding: '16px', background: '#F59E0B', color: '#FFF', border: 'none', borderRadius: '12px', fontWeight: 800, fontSize: '16px', cursor: 'pointer', opacity: (uploading || (!newStoryText.trim() && !newStoryImage)) ? 0.7 : 1 }}
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
