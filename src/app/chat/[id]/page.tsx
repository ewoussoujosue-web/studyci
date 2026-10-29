'use client';

import { useEffect, useState, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { Send, ArrowLeft, Image as ImageIcon, Paperclip, Trash2, X, FileText } from 'lucide-react';
import { motion } from 'framer-motion';
import { useParams } from 'next/navigation';
import Loader from '@/components/Loader';

export default function ChatPage() {
  const params = useParams();
  const receiverId = params.id as string;

  const [loading, setLoading] = useState(true);
  const [me, setMe] = useState<any>(null);
  const [otherUser, setOtherUser] = useState<any>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [uploading, setUploading] = useState(false);
  const [fileToUpload, setFileToUpload] = useState<File | null>(null);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fetchData = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { window.location.href = '/inscription'; return; }
      setMe(session.user);

      // Récupérer le profil de l'autre personne
      const { data: otherProf } = await supabase.from('profiles').select('*').eq('id', receiverId).single();
      setOtherUser(otherProf);

      // Récupérer les messages
      const { data: msgs } = await supabase
        .from('messages')
        .select('*')
        .or(`and(sender_id.eq.${session.user.id},receiver_id.eq.${receiverId}),and(sender_id.eq.${receiverId},receiver_id.eq.${session.user.id})`)
        .order('created_at', { ascending: true });
      
      setMessages(msgs || []);
      setLoading(false);
      scrollToBottom();
    };

    fetchData();

    // Écouter en temps réel (Supabase Realtime)
    const channel = supabase.channel('chat_room')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'messages' }, (payload) => {
        // On recharge les messages si un nouveau arrive ou si on supprime
        fetchData();
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [receiverId]);

  const scrollToBottom = () => {
    setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
  };

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if ((!newMessage.trim() && !fileToUpload) || !me) return;

    setUploading(true);
    let file_url = null;
    let file_type = null;

    // Upload du fichier si présent
    if (fileToUpload) {
      file_type = fileToUpload.type;
      const ext = fileToUpload.name.split('.').pop();
      // On met dans le bucket 'avatars' qui est public
      const path = `chat/${me.id}-${Date.now()}.${ext}`;
      
      const { error: uploadError } = await supabase.storage.from('avatars').upload(path, fileToUpload);
      if (!uploadError) {
        const { data } = supabase.storage.from('avatars').getPublicUrl(path);
        file_url = data.publicUrl;
      } else {
        alert("Erreur d'upload du fichier");
        setUploading(false);
        return;
      }
    }

    // Envoi du message
    const { error } = await supabase.from('messages').insert({
      sender_id: me.id,
      receiver_id: receiverId,
      content: newMessage.trim() || (file_type?.startsWith('image') ? 'Image' : 'Fichier'),
      file_url,
      file_type
    });

    if (!error) {
      setNewMessage('');
      setFileToUpload(null);
      scrollToBottom();
    }
    setUploading(false);
  };

  const deleteMessage = async (msgId: string) => {
    if (!confirm("Supprimer ce message ?")) return;
    await supabase.from('messages').delete().eq('id', msgId);
  };

  if (loading) return <Loader text="Ouverture de la discussion..." />;

  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', background: '#F8FAFC' }}>
      
      {/* HEADER */}
      <div style={{ background: '#FFF', padding: '16px 24px', borderBottom: '1px solid #E2E8F0', display: 'flex', alignItems: 'center', gap: '16px' }}>
        <a href="/messages" style={{ color: '#F59E0B', background: '#FEF3C7', padding: '10px', borderRadius: '50%', display: 'flex' }}>
          <ArrowLeft size={20} />
        </a>
        {otherUser?.avatar_url ? (
          <img src={otherUser.avatar_url} style={{ width: '40px', height: '40px', borderRadius: '50%', objectFit: 'cover' }} />
        ) : (
          <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: '#E2E8F0' }} />
        )}
        <div>
          <h2 style={{ fontSize: '18px', fontWeight: 800, color: '#0F172A' }}>{otherUser?.full_name || 'Discussion'}</h2>
          <p style={{ fontSize: '13px', color: '#64748B' }}>{otherUser?.level || 'Étudiant'}</p>
        </div>
      </div>

      {/* ZONE DE CHAT */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {messages.map((msg) => {
          const isMine = msg.sender_id === me?.id;
          return (
            <div key={msg.id} style={{ display: 'flex', justifyContent: isMine ? 'flex-end' : 'flex-start', alignItems: 'center', gap: '10px' }}>
              
              {/* Bouton supprimer (seulement si c'est mon message) */}
              {isMine && (
                <button onClick={() => deleteMessage(msg.id)} style={{ background: 'transparent', color: '#CBD5E1', cursor: 'pointer' }} title="Supprimer">
                  <Trash2 size={16} />
                </button>
              )}

              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                style={{ 
                  maxWidth: '70%', padding: '12px 16px', borderRadius: '16px', 
                  borderBottomRightRadius: isMine ? '4px' : '16px',
                  borderBottomLeftRadius: isMine ? '16px' : '4px',
                  background: isMine ? '#1E40AF' : '#FFF', 
                  color: isMine ? '#FFF' : '#0F172A',
                  border: isMine ? 'none' : '1px solid #E2E8F0',
                  boxShadow: '0 2px 10px rgba(0,0,0,0.05)'
                }}>
                
                {/* Affichage du fichier joint */}
                {msg.file_url && (
                  <div style={{ marginBottom: msg.content ? '8px' : '0' }}>
                    {msg.file_type?.startsWith('image/') ? (
                      <img src={msg.file_url} style={{ maxWidth: '100%', borderRadius: '8px' }} />
                    ) : msg.file_type?.startsWith('video/') ? (
                      <video src={msg.file_url} controls style={{ maxWidth: '100%', borderRadius: '8px' }} />
                    ) : (
                      <a href={msg.file_url} target="_blank" rel="noopener noreferrer" style={{ display: 'flex', alignItems: 'center', gap: '8px', textDecoration: 'underline', color: isMine ? '#FFF' : '#1E40AF' }}>
                        <FileText size={20} /> Télécharger le fichier
                      </a>
                    )}
                  </div>
                )}

                <p style={{ fontSize: '15px', lineHeight: 1.4 }}>{msg.content}</p>
                <p style={{ fontSize: '10px', opacity: 0.7, textAlign: 'right', marginTop: '4px' }}>
                  {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </p>
              </motion.div>
            </div>
          );
        })}
        <div ref={messagesEndRef} />
      </div>

      {/* ZONE DE SAISIE */}
      <div style={{ background: '#FFF', padding: '16px 24px', borderTop: '1px solid #E2E8F0' }}>
        
        {/* Aperçu du fichier avant envoi */}
        {fileToUpload && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: '#F1F5F9', padding: '8px 12px', borderRadius: '8px', marginBottom: '12px', width: 'fit-content' }}>
            <Paperclip size={16} color="#64748B" />
            <span style={{ fontSize: '13px', color: '#334155', fontWeight: 600 }}>{fileToUpload.name}</span>
            <button onClick={() => setFileToUpload(null)} style={{ background: 'transparent', color: '#EF4444' }}><X size={16} /></button>
          </div>
        )}

        <form onSubmit={handleSend} style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          {/* Bouton pour uploader (image, vidéo, pdf) */}
          <label style={{ cursor: 'pointer', color: '#F59E0B', display: 'flex', alignItems: 'center', justifyContent: 'center', width: '40px', height: '40px', background: '#FEF3C7', borderRadius: '50%' }}>
            <ImageIcon size={20} />
            <input type="file" accept="image/*,video/*,application/pdf" style={{ display: 'none' }} onChange={(e) => setFileToUpload(e.target.files?.[0] || null)} />
          </label>

          <input 
            value={newMessage} 
            onChange={(e) => setNewMessage(e.target.value)} 
            placeholder="Écris un message..." 
            style={{ flex: 1, padding: '14px 20px', borderRadius: '30px', border: '1px solid #E2E8F0', background: '#F8FAFC', outline: 'none', fontSize: '15px' }} 
          />

          <button type="submit" disabled={uploading || (!newMessage.trim() && !fileToUpload)} style={{ width: '48px', height: '48px', borderRadius: '50%', background: '#F59E0B', color: '#FFF', display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: (uploading || (!newMessage.trim() && !fileToUpload)) ? 0.5 : 1 }}>
            {uploading ? <div style={{ width: '20px', height: '20px', border: '2px solid #FFF', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 1s linear infinite' }} /> : <Send size={20} />}
          </button>
        </form>
      </div>
    </div>
  );
}