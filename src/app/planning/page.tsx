'use client';

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '@/lib/supabase';
import { ArrowLeft, Calendar, Plus, Trash2, Clock, BrainCircuit, X, ChevronRight, ChevronLeft } from 'lucide-react';
import Loader from '@/components/Loader';

export default function PlanningPage() {
  const [exams, setExams] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [subject, setSubject] = useState('');
  const [date, setDate] = useState('');
  const [me, setMe] = useState<any>(null);
  
  const [showFlashcards, setShowFlashcards] = useState(false);
  const [flashcards, setFlashcards] = useState<any[]>([]);
  const [currentCard, setCurrentCard] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [loadingCards, setLoadingCards] = useState(false);

  useEffect(() => {
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { window.location.href = '/inscription'; return; }
      setMe(session.user);
      const { data } = await supabase.from('exams').select('*').eq('user_id', session.user.id).order('exam_date', { ascending: true });
      setExams(data || []);
      setLoading(false);
    })();
  }, []);

  const addExam = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!subject || !date || !me) return;
    const { data, error } = await supabase.from('exams').insert({ user_id: me.id, subject, exam_date: date }).select().single();
    if (!error && data) {
      setExams([...exams, data].sort((a, b) => new Date(a.exam_date).getTime() - new Date(b.exam_date).getTime()));
      setSubject(''); setDate('');
    }
  };

  const deleteExam = async (id: string) => {
    await supabase.from('exams').delete().eq('id', id);
    setExams(exams.filter(e => e.id !== id));
  };

  const generateFlashcards = async (matiere: string) => {
    setShowFlashcards(true);
    setLoadingCards(true);
    setFlashcards([]);
    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: matiere, isFlashcards: true, level: 'Étudiant' })
      });
      const data = await res.json();
      let cleanReply = data.reply.replace(/```json/g, '').replace(/```/g, '').trim();
      const cards = JSON.parse(cleanReply);
      setFlashcards(cards);
      setCurrentCard(0);
      setIsFlipped(false);
    } catch (err) {
      alert("L'IA n'a pas pu générer les flashcards. Réessaie.");
      setShowFlashcards(false);
    } finally {
      setLoadingCards(false);
    }
  };

  const getDaysLeft = (examDate: string) => {
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const target = new Date(examDate);
    return Math.ceil((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  };

  if (loading) return <Loader />;

  return (
    <div style={{ minHeight: '100vh', background: '#F8FAFC', padding: '40px 24px', position: 'relative' }}>
      
      {/* MODALE FLASHCARDS */}
      <AnimatePresence>
        {showFlashcards && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.8)', backdropFilter: 'blur(8px)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px' }}>
            <motion.div initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 20 }} style={{ background: '#FFF', borderRadius: '24px', padding: '32px', width: '100%', maxWidth: '500px', position: 'relative' }}>
              <button onClick={() => setShowFlashcards(false)} style={{ position: 'absolute', top: '24px', right: '24px', background: '#F1F5F9', padding: '8px', borderRadius: '50%' }}><X size={20} /></button>
              
              <h3 style={{ fontSize: '22px', fontWeight: 800, color: '#0F172A', marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                <BrainCircuit color="#8B5CF6" /> Flashcards IA
              </h3>

              {loadingCards ? (
                <div style={{ textAlign: 'center', padding: '40px' }}><Loader text="L'IA prépare tes cartes..." /></div>
              ) : flashcards.length > 0 ? (
                <>
                  <motion.div onClick={() => setIsFlipped(!isFlipped)} whileHover={{ scale: 1.02 }} style={{ background: isFlipped ? '#F8FAFC' : 'linear-gradient(135deg, #8B5CF6, #6366F1)', color: isFlipped ? '#0F172A' : '#FFF', height: '250px', borderRadius: '20px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '32px', textAlign: 'center', cursor: 'pointer', boxShadow: '0 10px 30px rgba(139,92,246,0.2)', border: isFlipped ? '1px solid #E2E8F0' : 'none' }}>
                    <p style={{ fontSize: '12px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '2px', marginBottom: '16px', opacity: 0.7 }}>{isFlipped ? 'Réponse' : 'Question'}</p>
                    <p style={{ fontSize: '18px', fontWeight: 600, lineHeight: 1.5 }}>{isFlipped ? flashcards[currentCard].answer : flashcards[currentCard].question}</p>
                    <p style={{ fontSize: '11px', marginTop: '24px', opacity: 0.5 }}>Clique pour retourner</p>
                  </motion.div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '24px' }}>
                    <button onClick={() => { setCurrentCard(c => Math.max(0, c - 1)); setIsFlipped(false); }} disabled={currentCard === 0} style={{ padding: '12px', background: '#F1F5F9', borderRadius: '50%', opacity: currentCard === 0 ? 0.5 : 1 }}><ChevronLeft size={24} /></button>
                    <p style={{ fontWeight: 700, color: '#64748B' }}>{currentCard + 1} / {flashcards.length}</p>
                    <button onClick={() => { setCurrentCard(c => Math.min(flashcards.length - 1, c + 1)); setIsFlipped(false); }} disabled={currentCard === flashcards.length - 1} style={{ padding: '12px', background: '#F1F5F9', borderRadius: '50%', opacity: currentCard === flashcards.length - 1 ? 0.5 : 1 }}><ChevronRight size={24} /></button>
                  </div>
                </>
              ) : (
                <p style={{ textAlign: 'center', color: '#EF4444' }}>Erreur lors de la génération. Réessaie.</p>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <div style={{ maxWidth: '600px', margin: '0 auto' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '32px' }}>
          <motion.a href="/" whileHover={{ x: -5 }} style={{ color: '#F59E0B', background: 'rgba(245,158,11,0.1)', padding: '10px', borderRadius: '50%' }}><ArrowLeft size={24} /></motion.a>
          <h1 style={{ fontSize: '32px', fontWeight: 800, color: '#0F172A' }}>Planning de révision</h1>
        </div>

        <form onSubmit={addExam} style={{ background: '#FFF', padding: '24px', borderRadius: '20px', border: '1px solid #E2E8F0', marginBottom: '32px', display: 'flex', gap: '12px', flexWrap: 'wrap', boxShadow: '0 4px 20px rgba(0,0,0,0.03)' }}>
          <input value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="Matière (ex: Droit Civil)" required style={{ flex: 1, minWidth: '200px', padding: '14px', background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: '12px', color: '#0F172A' }} />
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} required style={{ padding: '14px', background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: '12px', color: '#0F172A' }} />
          <button type="submit" style={{ padding: '14px 24px', background: '#1E40AF', color: '#FFF', borderRadius: '12px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px' }}><Plus size={20} /> Ajouter</button>
        </form>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {exams.map((exam) => {
            const daysLeft = getDaysLeft(exam.exam_date);
            const isUrgent = daysLeft <= 3 && daysLeft >= 0;
            return (
              <motion.div key={exam.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} style={{ background: '#FFF', padding: '20px', borderRadius: '16px', border: `1px solid ${isUrgent ? '#FECACA' : '#E2E8F0'}`, display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap', boxShadow: '0 4px 20px rgba(0,0,0,0.02)' }}>
                <div style={{ width: '60px', height: '60px', borderRadius: '16px', background: isUrgent ? '#FEF2F2' : '#EFF6FF', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <span style={{ fontSize: '20px', fontWeight: 800, color: isUrgent ? '#EF4444' : '#3B82F6' }}>{daysLeft}</span>
                  <span style={{ fontSize: '10px', fontWeight: 700, color: isUrgent ? '#EF4444' : '#3B82F6' }}>JOURS</span>
                </div>
                <div style={{ flex: 1, minWidth: '150px' }}>
                  <h3 style={{ fontSize: '18px', fontWeight: 700, color: '#0F172A' }}>{exam.subject}</h3>
                  <p style={{ fontSize: '14px', color: '#64748B', display: 'flex', alignItems: 'center', gap: '6px', marginTop: '4px' }}><Clock size={14} /> {new Date(exam.exam_date).toLocaleDateString('fr-FR')}</p>
                </div>
                <button onClick={() => generateFlashcards(exam.subject)} style={{ padding: '10px 16px', background: '#F3E8FF', color: '#7E22CE', borderRadius: '10px', fontWeight: 700, fontSize: '13px', display: 'flex', alignItems: 'center', gap: '6px', border: '1px solid #E9D5FF' }}>
                  <BrainCircuit size={16} /> Réviser (IA)
                </button>
                <button onClick={() => deleteExam(exam.id)} style={{ background: 'transparent', color: '#EF4444', padding: '10px' }}><Trash2 size={20} /></button>
              </motion.div>
            );
          })}
        </div>
      </div>
    </div>
  );
}