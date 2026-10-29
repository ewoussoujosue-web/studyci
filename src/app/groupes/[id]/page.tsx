'use client';

import { useEffect, useState, useRef } from 'react';
import { useParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { ArrowLeft, Send, Users, User as UserIcon, Image as ImageIcon, Mic, Square, Play, Pause, Paperclip, X } from 'lucide-react';
import Loader from '@/components/Loader';

export default function GroupChatPage() {
  const params = useParams();
  const groupId = params.id as string;

  const [loading, setLoading] = useState(true);
  const [me, setMe] = useState<any>(null);
  const [group, setGroup] = useState<any>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [newMessage, setNewMessage] = useState('');
  
  // Médias
  const [fileToUpload, setFileToUpload] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);

  // Audio / Vocal
  const [isRecording, setIsRecording] = useState(false);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fetchData = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { window.location.href = '/inscription'; return; }
      setMe(session.user);

      const { data: g } = await supabase.from('groups').select('*').eq('id', groupId).single();
      setGroup(g);

      if (g) {
        const { data: msgs } = await supabase
          .from('group_messages')
          .select('*, profiles(full_name, avatar_url)')
          .eq('group_name', g.name)
          .order('created_at', { ascending: true });
        
        setMessages(msgs || []);
      }
      setLoading(false);
      scrollToBottom();
    };

    fetchData();

    const channel = supabase.channel('group_chat')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'group_messages' }, () => {
        fetchData();
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [groupId]);

  const scrollToBottom = () => {
    setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
  };

  // --- GESTION DES FICHIERS (IMAGES/VIDEOS) ---
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFileToUpload(e.target.files[0]);
    }
  };

  // --- GESTION DES VOCAUX ---
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
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
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

  // --- ENVOI DU MESSAGE (Texte + Média + Vocal) ---
  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if ((!newMessage.trim() && !fileToUpload && !audioBlob) || !me || !group) return;
    setUploading(true);

    let media_url = null;
    let media_type = null;

    try {
      // 1. Upload de l'image/vidéo si présent
      if (fileToUpload) {
        media_type = fileToUpload.type;
        const ext = fileToUpload.name.split('.').pop();
        const path = `groups/${Date.now()}.${ext}`;
        
        const { error: upErr } = await supabase.storage.from('avatars').upload(path, fileToUpload);
        if (!upErr) {
          const { data } = supabase.storage.from('avatars').getPublicUrl(path);
          media_url = data.publicUrl;
        }
      }

      // 2. Upload du vocal si présent
      if (audioBlob) {
        media_type = 'audio/webm';
        const path = `groups/${Date.now()}.webm`;
        
        const { error: upErr } = await supabase.storage.from('avatars').upload(path, audioBlob);
        if (!upErr) {
          const { data } = supabase.storage.from('avatars').getPublicUrl(path);
          media_url = data.publicUrl;
        }
      }

      // 3. Enregistrement du message
      const { error } = await supabase.from('group_messages').insert({
        group_name: group.name,
        sender_id: me.id,
        content: newMessage.trim() || (audioBlob ? 'Message vocal' : 'Fichier'),
        media_url: media_url,
        media_type: media_type
      });

      if (error) throw error;

      setNewMessage('');
      setFileToUpload(null);
      setAudioBlob(null);
      scrollToBottom();

    } catch (err) {
      alert("Erreur lors de l'envoi.");
    } finally {
      setUploading(false);
    }
  };

  if (loading) return <Loader text="Chargement de la discussion..." />;

  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', background: '#F8FAFC' }}>
      
      {/* HEADER */}
      <div style={{ background: '#FFF', padding: '16px 24px', borderBottom: '1px solid #E2E8F0', display: 'flex', alignItems: 'center', gap: '16px' }}>
        <a href="/groupes" style={{ color: '#F59E0B', background: '#FEF3C7', padding: '10px', borderRadius: '50%', display: 'flex' }}>
          <ArrowLeft size={20} />
        </a>
        {group?.avatar_url ? (
          <img src={group.avatar_url} style={{ width: '40px', height: '40px', borderRadius: '50%', objectFit: 'cover' }} />
        ) : (
          <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: 'rgba(245,158,11,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Users size={20} color="#F59E0B" />
          </div>
        )}
        <div>
          <h2 style={{ fontSize: '18px', fontWeight: 800, color: '#0F172A' }}>{group?.name || 'Groupe'}</h2>
        </div>
      </div>

      {/* ZONE DE CHAT */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {messages.map((msg) => {
          const isMine = msg.sender_id === me?.id;
          return (
            <div key={msg.id} style={{ display: 'flex', justifyContent: isMine ? 'flex-end' : 'flex-start', alignItems: 'flex-start', gap: '10px' }}>
              
              {!isMine && (
                msg.profiles?.avatar_url 
                  ? <img src={msg.profiles.avatar_url} style={{ width: '32px', height: '32px', borderRadius: '50%' }} /> 
                  : <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: '#E2E8F0', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><UserIcon size={16} color="#64748B" /></div>
              )}

              <div style={{ 
                maxWidth: '70%', padding: '12px 16px', borderRadius: '16px', 
                borderBottomRightRadius: isMine ? '4px' : '16px',
                borderBottomLeftRadius: isMine ? '16px' : '4px',
                background: isMine ? '#1E40AF' : '#FFF', 
                color: isMine ? '#FFF' : '#0F172A',
                border: isMine ? 'none' : '1px solid #E2E8F0',
                boxShadow: '0 2px 10px rgba(0,0,0,0.05)'
              }}>
                {!isMine && <p style={{ fontSize: '12px', fontWeight: 700, color: '#64748B', marginBottom: '4px' }}>{msg.profiles?.full_name}</p>}
                
                {/* AFFICHAGE DES MÉDIAS */}
                {msg.media_url && (
                  <div style={{ marginBottom: '8px' }}>
                    {msg.media_type?.startsWith('image') ? (
                      <img src={msg.media_url} style={{ maxWidth: '100%', borderRadius: '12px', maxHeight: '300px' }} />
                    ) : msg.media_type?.startsWith('video') ? (
                      <video src={msg.media_url} controls style={{ maxWidth: '100%', borderRadius: '12px', maxHeight: '300px' }} />
                    ) : msg.media_type?.startsWith('audio') ? (
                      <audio src={msg.media_url} controls style={{ width: '100%', height: '40px' }} />
                    ) : null}
                  </div>
                )}

                <p style={{ fontSize: '15px', lineHeight: 1.4 }}>{msg.content}</p>
                <p style={{ fontSize: '10px', opacity: 0.7, textAlign: 'right', marginTop: '4px' }}>
                  {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </p>
              </div>
            </div>
          );
        })}
        <div ref={messagesEndRef} />
      </div>

      {/* ZONE DE SAISIE */}
      <div style={{ background: '#FFF', padding: '16px 24px', borderTop: '1px solid #E2E8F0' }}>
        
        {/* Aperçu du fichier sélectionné */}
        {fileToUpload && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: '#F1F5F9', padding: '8px 12px', borderRadius: '8px', marginBottom: '12px', width: 'fit-content' }}>
            <ImageIcon size={16} color="#64748B" />
            <span style={{ fontSize: '13px', color: '#334155', fontWeight: 600 }}>{fileToUpload.name}</span>
            <button onClick={() => setFileToUpload(null)} style={{ background: 'transparent', color: '#EF4444' }}><X size={16} /></button>
          </div>
        )}

        {/* Aperçu du vocal enregistré */}
        {audioBlob && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: '#F1F5F9', padding: '8px 12px', borderRadius: '8px', marginBottom: '12px', width: 'fit-content' }}>
            <Mic size={16} color="#64748B" />
            <span style={{ fontSize: '13px', color: '#334155', fontWeight: 600 }}>Message vocal prêt</span>
            <button onClick={() => setAudioBlob(null)} style={{ background: 'transparent', color: '#EF4444' }}><X size={16} /></button>
          </div>
        )}

        <form onSubmit={sendMessage} style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          
          {/* Bouton Pièce jointe (Image/Vidéo) */}
          <label style={{ cursor: 'pointer', color: '#F59E0B', display: 'flex', alignItems: 'center', justifyContent: 'center', width: '40px', height: '40px', background: '#FEF3C7', borderRadius: '50%' }}>
            <Paperclip size={20} />
            <input type="file" accept="image/*,video/*" onChange={handleFileChange} style={{ display: 'none' }} />
          </label>

          {/* Bouton Micro */}
          <button 
            type="button" 
            onClick={isRecording ? stopRecording : startRecording} 
            style={{ color: isRecording ? '#EF4444' : '#64748B', display: 'flex', alignItems: 'center', justifyContent: 'center', width: '40px', height: '40px', background: isRecording ? '#FEF2F2' : '#F1F5F9', borderRadius: '50%', border: 'none' }}
          >
            {isRecording ? <Square size={20} /> : <Mic size={20} />}
          </button>

          <input 
            value={newMessage} 
            onChange={(e) => setNewMessage(e.target.value)} 
            placeholder="Écris un message..." 
            style={{ flex: 1, padding: '14px 20px', borderRadius: '30px', border: '1px solid #E2E8F0', background: '#F8FAFC', outline: 'none', fontSize: '15px' }} 
          />

          <button type="submit" disabled={uploading || (!newMessage.trim() && !fileToUpload && !audioBlob)} style={{ width: '48px', height: '48px', borderRadius: '50%', background: '#1E40AF', color: '#FFF', display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: (uploading || (!newMessage.trim() && !fileToUpload && !audioBlob)) ? 0.5 : 1 }}>
            <Send size={20} />
          </button>
        </form>
      </div>
    </div>
  );
}