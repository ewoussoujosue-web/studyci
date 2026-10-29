'use client';

import { useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '@/lib/supabase';
import { Send, ArrowLeft, Bot, User, Sparkles, Settings, BrainCircuit } from 'lucide-react';
import Loader from '@/components/Loader';

export default function MyIAPage() {
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [messages, setMessages] = useState<any[]>([{ role: 'model', content: "Bonjour ! Je suis prêt à t'aider à réviser. Tu peux me poser des questions ou me demander de te faire un quiz !" }]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [editingName, setEditingName] = useState(false);
  const [newName, setNewName] = useState('');
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { window.location.href = '/inscription'; return; }
      
      const { data } = await supabase.from('profiles').select('*').eq('id', user.id).single();
      setProfile(data);
      setNewName(data.ai_name || 'Mon Assistant IA');
      setLoading(false);
    })();
  }, []);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages, isTyping]);

  const saveName = async () => {
    if (!newName.trim()) return;
    await supabase.from('profiles').update({ ai_name: newName }).eq('id', profile.id);
    setProfile({ ...profile, ai_name: newName });
    setEditingName(false);
  };

  const sendMessage = async (e: React.FormEvent | null, isQuiz = false) => {
    if (e) e.preventDefault();
    if ((!input.trim() && !isQuiz) || isTyping) return;

    const userMessage = isQuiz ? "Génère-moi un quiz de 3 questions à choix multiples pour m'entraîner." : input.trim();
    setInput('');
    setMessages(prev => [...prev, { role: 'user', content: userMessage }]);
    setIsTyping(true);

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: userMessage,
          history: messages.slice(1),
          level: profile.level,
          aiName: profile.ai_name,
          isQuiz: isQuiz
        })
      });

      const data = await res.json();
      if (data.error) throw new Error(data.error);

      setMessages(prev => [...prev, { role: 'model', content: data.reply }]);
    } catch (err) {
      setMessages(prev => [...prev, { role: 'model', content: "Désolé, j'ai eu un petit problème. Réessaie !" }]);
    } finally {
      setIsTyping(false);
    }
  };

  if (loading) return <Loader text="Connexion à ton IA..." />;

  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', background: '#0F172A', position: 'relative' }}>
      
      <div className="bg-shape" style={{ width: '300px', height: '300px', background: '#8B5CF6', top: '-10%', left: '-10%' }} />
      <div className="bg-shape" style={{ width: '250px', height: '250px', background: '#1E40AF', bottom: '10%', right: '-5%', animationDelay: '-5s' }} />

      {/* HEADER */}
      <div style={{ padding: '16px 24px', display: 'flex', alignItems: 'center', gap: '16px', background: 'rgba(15,23,42,0.8)', backdropFilter: 'blur(12px)', borderBottom: '1px solid rgba(255,255,255,0.05)', zIndex: 10 }}>
        <motion.a href="/" whileHover={{ x: -3 }} style={{ color: '#FBBF24' }}><ArrowLeft size={22} /></motion.a>
        
        <div style={{ width: '44px', height: '44px', borderRadius: '50%', background: 'linear-gradient(135deg, #8B5CF6, #3B82F6)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 0 20px rgba(139,92,246,0.4)' }}>
          <Sparkles size={24} color="#FFF" />
        </div>
        
        <div style={{ flex: 1 }}>
          {editingName ? (
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              <input value={newName} onChange={(e) => setNewName(e.target.value)} autoFocus
                style={{ padding: '6px 12px', background: '#1E293B', border: '1px solid #8B5CF6', borderRadius: '8px', color: '#FFF', fontSize: '16px', fontWeight: 700 }} />
              <button onClick={saveName} style={{ background: '#8B5CF6', color: '#FFF', padding: '6px 12px', borderRadius: '8px', fontWeight: 600, fontSize: '13px' }}>OK</button>
            </div>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }} onClick={() => setEditingName(true)}>
              <h1 style={{ fontSize: '18px', fontWeight: 700, color: '#FFF' }}>{profile?.ai_name || 'Mon Assistant IA'}</h1>
              <Settings size={14} color="#94A3B8" />
            </div>
          )}
          <p style={{ fontSize: '12px', color: '#A78BFA', fontWeight: 600 }}>Spécialisé en {profile?.level || 'général'}</p>
        </div>

        {/* BOUTON QUIZ */}
        <motion.button onClick={() => sendMessage(null, true)} whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} disabled={isTyping}
          style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 16px', background: 'linear-gradient(135deg, #FBBF24, #F59E0B)', color: '#0F172A', borderRadius: '12px', fontWeight: 700, fontSize: '14px', boxShadow: '0 4px 15px rgba(251,191,36,0.3)', opacity: isTyping ? 0.5 : 1 }}>
          <BrainCircuit size={18} /> Mode Quiz
        </motion.button>
      </div>

      {/* ZONE DE CHAT */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px', zIndex: 1 }}>
        <AnimatePresence>
          {messages.map((m, i) => {
            const isUser = m.role === 'user';
            return (
              <motion.div key={i} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
                style={{ alignSelf: isUser ? 'flex-end' : 'flex-start', maxWidth: '80%', display: 'flex', gap: '12px', flexDirection: isUser ? 'row-reverse' : 'row' }}>
                
                <div style={{ width: '36px', height: '36px', borderRadius: '50%', flexShrink: 0, background: isUser ? '#334155' : 'linear-gradient(135deg, #8B5CF6, #3B82F6)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  {isUser ? <User size={20} color="#FFF" /> : <Bot size={20} color="#FFF" />}
                </div>

                <div style={{ padding: '14px 20px', borderRadius: '20px', background: isUser ? '#1E40AF' : 'rgba(30,41,59,0.8)', border: isUser ? 'none' : '1px solid rgba(139,92,246,0.3)', color: '#FFF', fontSize: '15px', lineHeight: 1.6, boxShadow: '0 4px 15px rgba(0,0,0,0.1)', whiteSpace: 'pre-wrap' }}>
                  {m.content}
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>

        {isTyping && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ alignSelf: 'flex-start', display: 'flex', gap: '12px' }}>
             <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: 'linear-gradient(135deg, #8B5CF6, #3B82F6)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Bot size={20} color="#FFF" />
              </div>
              <div style={{ padding: '16px 20px', borderRadius: '20px', background: 'rgba(30,41,59,0.8)', border: '1px solid rgba(139,92,246,0.3)', display: 'flex', gap: '4px', alignItems: 'center' }}>
                <motion.div animate={{ y: [0, -5, 0] }} transition={{ repeat: Infinity, duration: 0.6, delay: 0 }} style={{ width: '6px', height: '6px', background: '#A78BFA', borderRadius: '50%' }} />
                <motion.div animate={{ y: [0, -5, 0] }} transition={{ repeat: Infinity, duration: 0.6, delay: 0.2 }} style={{ width: '6px', height: '6px', background: '#A78BFA', borderRadius: '50%' }} />
                <motion.div animate={{ y: [0, -5, 0] }} transition={{ repeat: Infinity, duration: 0.6, delay: 0.4 }} style={{ width: '6px', height: '6px', background: '#A78BFA', borderRadius: '50%' }} />
              </div>
          </motion.div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* INPUT */}
      <div style={{ padding: '20px 24px', background: 'rgba(15,23,42,0.9)', borderTop: '1px solid rgba(255,255,255,0.05)', zIndex: 10 }}>
        <form onSubmit={sendMessage} style={{ maxWidth: '900px', margin: '0 auto', display: 'flex', gap: '12px', position: 'relative' }}>
          <input value={input} onChange={(e) => setInput(e.target.value)} placeholder={`Pose ta question à ${profile?.ai_name || 'ton IA'}...`}
            style={{ flex: 1, padding: '16px 24px', background: '#1E293B', border: '1px solid rgba(139,92,246,0.3)', borderRadius: '50px', color: '#FFF', fontSize: '16px', paddingRight: '60px' }} />
          <motion.button type="submit" disabled={!input.trim() || isTyping} whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
            style={{ position: 'absolute', right: '6px', top: '6px', bottom: '6px', width: '44px', background: input.trim() ? '#8B5CF6' : '#334155', color: '#FFF', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'background 0.2s' }}>
            <Send size={18} />
          </motion.button>
        </form>
      </div>
    </div>
  );
}