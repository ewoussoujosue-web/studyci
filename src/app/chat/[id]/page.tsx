'use client';

import { useEffect, useState, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { Send, ArrowLeft, Image as ImageIcon, Paperclip, Trash2, X, FileText, Mic, Square, Download } from 'lucide-react';
import { motion } from 'framer-motion';
import { useParams } from 'next/navigation';
import Loader from '@/components/Loader';

export default function ChatPage() {
  const params = useParams();
  const receiverId = Array.isArray(params.id) ? params.id[0] : params.id;

  const [loading, setLoading] = useState(true);
  const [me, setMe] = useState<any>(null);
  const [otherUser, setOtherUser] = useState<any>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [uploading, setUploading] = useState(false);
  const [fileToUpload, setFileToUpload] = useState<File | null>(null);
  
  // États pour les vocaux
  const [isRecording, setIsRecording] = useState(false);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!receiverId) return;

    const fetchData = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { window.location.href = '/inscription'; return; }
      setMe(session.user);

      const { data: otherProf, error: profError } = await supabase.from('profiles').select('*').eq('id', receiverId).single();
      if (profError) console.error("Erreur profil:", profError);
      setOtherUser(otherProf);

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

    const channel = supabase.channel('chat_room')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'messages' }, () => {
        fetchData();
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [receiverId]);

  const scrollToBottom = () => {
    setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) audioChunksRef.current.push(event.data);
      };

      mediaRecorder.onstop = () => {
        const mimeType = mediaRecorder.mimeType || 'audio/webm';
        const audioBlob = new Blob(audioChunksRef.current, { type: mimeType });
        setAudioBlob(audioBlob);
      };

      mediaRecorder.start();
      setIsRecording(true);
    } catch (err) {
      alert("Impossible d'accéder au microphone.");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
    }
  };

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if ((!newMessage.trim() && !fileToUpload && !audioBlob) || !me) return;

    setUploading(true);
    let file_url = null;
    let file_type = null;

    try {
      // 1. Uploads
      if (fileToUpload) {
        file_type = fileToUpload.type;
        const ext = fileToUpload.name.split('.').pop();
        const path = `chat/${me.id}-${Date.now()}.${ext}`;
        const { error: uploadError } = await supabase.storage.from('avatars').upload(path, fileToUpload);
        if (!uploadError) {
          const { data } = supabase.storage.from('avatars').getPublicUrl(path);
          file_url = data.publicUrl;
        }
      }

      if (audioBlob) {
        file_type = audioBlob.type;
        const ext = file_type.includes('mp4') ? 'mp4' : 'webm';
        const path = `chat/${me.id}-${Date.now()}.${ext}`;
        const { error: uploadError } = await supabase.storage.from('avatars').upload(path, audioBlob);
        if (!uploadError) {
          const { data } = await supabase.storage.from('avatars').getPublicUrl(path);
          file_url = data.publicUrl;
        }
      }

      // 2. Insertion du message
      const { error: msgError } = await supabase.from('messages').insert({
        sender_id: me.id,
        receiver_id: receiverId,
        content: newMessage.trim() || (audioBlob ? 'Message vocal' : 'Fichier'),
        file_url,
        file_type
      });

      if (msgError) {
        alert("❌ Erreur message : " + msgError.message);
        return;
      }

      // 3. Notification
      try {
        const { data: myProf } = await supabase.from('profiles').select('full_name').eq('id', me.id).single();
        
        await supabase.from('notifications').insert({
          user_id: receiverId,
          title: 'Nouveau message 💬',
          message: `${myProf?.full_name || 'Quelqu\'un'} t'a envoyé un message.`,
          type: 'message',
          from_user_id: me.id
        });
      } catch (err: any) {
        console.error("Erreur notif :", err.message);
      }

      // 4. Reset
      setNewMessage('');
      setFileToUpload(null);
      setAudioBlob(null);
      scrollToBottom();

    } catch (err: any) {
      alert("Erreur globale : " + err.message);
    } finally {
      setUploading(false);
    }
  };

  const deleteMessage = async (msgId: string) => {
    if (!confirm("Supprimer ce message ?")) return;
    await supabase.from('messages').delete().eq('id', msgId);
  };

  const downloadFile = async (url: string, filename: string) => {
    try {
      const response = await fetch(url);
      const blob = await response.blob();
      const blobUrl = window.URL.createObjectURL(blob);
      
      const link = document.createElement('a');
      link.href = blobUrl;
      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(blobUrl);
    } catch (err) {
      window.open(url, '_blank');
    }
  };

  const isUserOnline = (lastSeen: string) => {
    if (!lastSeen) return false;
    const diff = new Date().getTime() - new Date(lastSeen).getTime();
    return diff < 5 * 60 * 1000;
  };

  if (loading) return <Loader text="Ouverture de la discussion..." />;

  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', background: '#F8FAFC' }}>
      
      {/* HEADER FIXE */}
      <div style={{ background: '#FFF', padding: '16px 24px', borderBottom: '1px solid #E2E8F0', display: 'flex', alignItems: 'center', gap: '16px', position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100 }}>
        <button 
          onClick={() => window.location.href = '/messages'} 
          style={{ color: '#F59E0B', background: '#FEF3C7', padding: '10px', borderRadius: '50%', display: 'flex', border: 'none', cursor: 'pointer' }}
        >
          <ArrowLeft size={20} />
        </button>
        
        <div style={{ position: 'relative' }}>
          {otherUser?.avatar_url ? (
            <img src={otherUser.avatar_url} style={{ width: '40px', height: '40px', borderRadius: '50%', objectFit: 'cover' }} />
          ) : (
            <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: '#E2E8F0' }} />
          )}
          {isUserOnline(otherUser?.last_seen) && (
            <div style={{ position: 'absolute', bottom: '0', right: '0', width: '12px', height: '12px', background: '#10B981', borderRadius: '50%', border: '2px solid #FFF' }} />
          )}
        </div>

        <div>
          <h2 style={{ fontSize: '18px', fontWeight: 800, color: '#0F172A' }}>{otherUser?.full_name || 'Discussion'}</h2>
          <p style={{ fontSize: '13px', color: '#64748B' }}>{isUserOnline(otherUser?.last_seen) ? 'En ligne' : 'Hors ligne'}</p>
        </div>
      </div>

      {/* ZONE DE CHAT */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '24px', paddingTop: '90px', paddingBottom: '120px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {messages.map((msg) => {
          const isMine = msg.sender_id === me?.id;
          return (
            <div key={msg.id} style={{ display: 'flex', justifyContent: isMine ? 'flex-end' : 'flex-start', alignItems: 'center', gap: '10px' }}>
              
              {isMine && (
                <button onClick={() => deleteMessage(msg.id)} style={{ background: 'transparent', color: '#CBD5E1', cursor: 'pointer', border: 'none' }} title="Supprimer">
                  <Trash2 size={16} />
                </button>
              )}

              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                style={{ 
                  maxWidth: '75%', padding: '12px 16px', borderRadius: '16px', 
                  borderBottomRightRadius: isMine ? '4px' : '16px',
                  borderBottomLeftRadius: isMine ? '16px' : '4px',
                  background: isMine ? '#1E40AF' : '#FFF', 
                  color: isMine ? '#FFF' : '#0F172A',
                  border: isMine ? 'none' : '1px solid #E2E8F0',
                  boxShadow: '0 2px 10px rgba(0,0,0,0.05)'
                }}>
                
                {msg.file_url && (
                  <div style={{ marginBottom: msg.content ? '8px' : '0', position: 'relative' }}>
                    <button 
                      onClick={() => downloadFile(msg.file_url, `fichier-${msg.id}`)}
                      style={{ position: 'absolute', top: '8px', right: '8px', background: 'rgba(0,0,0,0.5)', color: '#FFF', padding: '6px', borderRadius: '50%', zIndex: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', border: 'none' }}
                    >
                      <Download size={16} />
                    </button>

                    {msg.file_type?.startsWith('image/') && (
                      <img src={msg.file_url} style={{ maxWidth: '100%', borderRadius: '8px' }} />
                    )}
                    
                    {msg.file_type?.startsWith('video/') && (
                      <video src={msg.file_url} controls style={{ maxWidth: '100%', borderRadius: '8px' }} />
                    )}

                    {msg.file_type?.startsWith('audio/') && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'rgba(0,0,0,0.1)', padding: '8px', borderRadius: '8px' }}>
                        <Mic size={20} color={isMine ? '#FFF' : '#1E40AF'} />
                        <audio src={msg.file_url} controls style={{ height: '30px', flex: 1 }} />
                      </div>
                    )}

                    {!msg.file_type?.startsWith('image') && !msg.file_type?.startsWith('video') && !msg.file_type?.startsWith('audio') && (
                      <a href={msg.file_url} target="_blank" rel="noopener noreferrer" style={{ display: 'flex', alignItems: 'center', gap: '8px', textDecoration: 'underline', color: isMine ? '#FFF' : '#1E40AF' }}>
                        <FileText size={20} /> Ouvrir le document
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

      {/* ZONE DE SAISIE FIXE EN BAS */}
      <div style={{ background: '#FFF', padding: '16px 24px', borderTop: '1px solid #E2E8F0', position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 100 }}>
        
        {fileToUpload && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: '#F1F5F9', padding: '8px 12px', borderRadius: '8px', marginBottom: '12px', width: 'fit-content' }}>
            <Paperclip size={16} color="#64748B" />
            <span style={{ fontSize: '13px', color: '#334155', fontWeight: 600 }}>{fileToUpload.name}</span>
            <button onClick={() => setFileToUpload(null)} style={{ background: 'transparent', color: '#EF4444', border: 'none' }}><X size={16} /></button>
          </div>
        )}

        {audioBlob && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: '#F1F5F9', padding: '8px 12px', borderRadius: '8px', marginBottom: '12px', width: 'fit-content' }}>
            <Mic size={16} color="#64748B" />
            <span style={{ fontSize: '13px', color: '#334155', fontWeight: 600 }}>Vocal prêt</span>
            <button onClick={() => setAudioBlob(null)} style={{ background: 'transparent', color: '#EF4444', border: 'none' }}><X size={16} /></button>
          </div>
        )}

        <form onSubmit={handleSend} style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          <label style={{ cursor: 'pointer', color: '#F59E0B', display: 'flex', alignItems: 'center', justifyContent: 'center', width: '40px', height: '40px', background: '#FEF3C7', borderRadius: '50%', flexShrink: 0 }}>
            <ImageIcon size={20} />
            <input type="file" accept="image/*,video/*,application/pdf" style={{ display: 'none' }} onChange={(e) => setFileToUpload(e.target.files?.[0] || null)} />
          </label>

          <button 
            type="button" 
            onClick={isRecording ? stopRecording : startRecording} 
            style={{ color: isRecording ? '#EF4444' : '#64748B', display: 'flex', alignItems: 'center', justifyContent: 'center', width: '40px', height: '40px', background: isRecording ? '#FEF2F2' : '#F1F5F9', borderRadius: '50%', border: 'none', flexShrink: 0 }}
          >
            {isRecording ? <Square size={20} /> : <Mic size={20} />}
          </button>

          <input 
            value={newMessage} 
            onChange={(e) => setNewMessage(e.target.value)} 
            placeholder="Écris un message..." 
            style={{ flex: 1, padding: '14px 20px', borderRadius: '30px', border: '1px solid #E2E8F0', background: '#F8FAFC', outline: 'none', fontSize: '16px', minWidth: 0 }} 
          />

          <button type="submit" disabled={uploading || (!newMessage.trim() && !fileToUpload && !audioBlob)} style={{ width: '48px', height: '48px', borderRadius: '50%', background: '#F59E0B', color: '#FFF', display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: (uploading || (!newMessage.trim() && !fileToUpload && !audioBlob)) ? 0.5 : 1, flexShrink: 0, border: 'none' }}>
            {uploading ? <div style={{ width: '20px', height: '20px', border: '2px solid #FFF', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 1s linear infinite' }} /> : <Send size={20} />}
          </button>
        </form>
      </div>
    </div>
  );
}