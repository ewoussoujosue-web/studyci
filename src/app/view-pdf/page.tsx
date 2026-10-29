'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { ArrowLeft, AlertCircle, Sparkles, X, CheckCircle, XCircle, Trophy } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import Loader from '@/components/Loader';

function Viewer() {
  const searchParams = useSearchParams();
  const path = searchParams.get('path');
  const title = searchParams.get('title') || 'Document';
  const [url, setUrl] = useState<string | null>(null);
  const [error, setError] = useState('');
  
  // ÉTATS POUR LE QUIZ
  const [showQuizModal, setShowQuizModal] = useState(false);
  const [loadingQuiz, setLoadingQuiz] = useState(false);
  const [quizData, setQuizData] = useState<any[]>([]);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [score, setScore] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [isAnswered, setIsAnswered] = useState(false);
  const [quizFinished, setQuizFinished] = useState(false);

  const isImage = path?.toLowerCase().match(/\.(jpg|jpeg|png|webp|gif)$/i);

  useEffect(() => {
    if (!path) {
      setError("Aucun fichier spécifié.");
      return;
    }

    (async () => {
      try {
        const { data, error: supabaseError } = await supabase
          .storage
          .from('documents')
          .createSignedUrl(path, 3600);

        if (supabaseError) throw supabaseError;
        if (!data || !data.signedUrl) throw new Error("Lien introuvable.");

        setUrl(data.signedUrl);
      } catch (err: any) {
        console.error(err);
        setError(err.message || "Erreur lors de la récupération du document.");
      }
    })();
  }, [path]);

  // FONCTION POUR GÉNÉRER LE QUIZ
  const generateQuiz = async () => {
    setShowQuizModal(true);
    setLoadingQuiz(true);
    setQuizData([]);
    setCurrentQuestion(0);
    setScore(0);
    setSelectedAnswer(null);
    setIsAnswered(false);
    setQuizFinished(false);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const level = session?.user?.user_metadata?.level || 'Étudiant';

      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: `Génère un quiz sur le sujet : "${title}"`,
          level: level,
          isQuiz: true,
          aiName: 'StudyCI'
        })
      });

      const data = await response.json();
      
      if (data.reply) {
        // On nettoie la réponse au cas où l'IA mettrait des balises markdown
        const cleanJson = data.reply.replace(/```json/g, '').replace(/```/g, '').trim();
        const parsedQuiz = JSON.parse(cleanJson);
        setQuizData(parsedQuiz);
      }
    } catch (err) {
      console.error("Erreur quiz:", err);
      alert("Désolé, l'IA n'a pas pu générer le quiz. Réessaie.");
      setShowQuizModal(false);
    } finally {
      setLoadingQuiz(false);
    }
  };

  const handleAnswerClick = (answer: string) => {
    if (isAnswered) return;
    setSelectedAnswer(answer);
    setIsAnswered(true);
    
    const correct = quizData[currentQuestion].correctAnswer;
    if (answer === correct) {
      setScore(score + 1);
    }
  };

  const nextQuestion = () => {
    if (currentQuestion + 1 < quizData.length) {
      setCurrentQuestion(currentQuestion + 1);
      setSelectedAnswer(null);
      setIsAnswered(false);
    } else {
      setQuizFinished(true);
    }
  };

  if (error) {
    return (
      <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: '#0F172A', color: '#F1F5F9', padding: '24px', textAlign: 'center' }}>
        <AlertCircle size={48} color="#EF4444" style={{ marginBottom: '16px' }} />
        <h2 style={{ fontSize: '20px', fontWeight: 700, marginBottom: '8px' }}>Impossible d'ouvrir le document</h2>
        <p style={{ color: '#94A3B8', maxWidth: '500px', lineHeight: 1.6, marginBottom: '24px' }}>{error}</p>
        <button onClick={() => window.history.back()} style={{ padding: '12px 24px', background: '#1E40AF', color: '#FFF', borderRadius: '8px', fontWeight: 600 }}>Retour</button>
      </div>
    );
  }

  if (!url) return <Loader text="Chargement sécurisé du document..." />;

  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', background: '#0F172A' }}>
      
      {/* Barre du haut */}
      <div style={{ padding: '16px 24px', display: 'flex', alignItems: 'center', gap: '16px', background: '#1E293B', borderBottom: '1px solid #334155', zIndex: 10 }}>
        <button onClick={() => window.history.back()} style={{ color: '#FBBF24', display: 'flex', alignItems: 'center', cursor: 'pointer', background: 'transparent' }}>
          <ArrowLeft size={22} />
        </button>
        <h1 style={{ fontSize: '18px', fontWeight: 600, color: '#F1F5F9', flex: 1 }}>{title}</h1>
        
        {/* BOUTON QUIZ */}
        <motion.button 
          whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
          onClick={generateQuiz}
          style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 16px', background: 'linear-gradient(135deg, #8B5CF6, #D946EF)', color: '#FFF', borderRadius: '50px', fontWeight: 700, fontSize: '14px', boxShadow: '0 4px 15px rgba(139,92,246,0.3)' }}
        >
          <Sparkles size={16} /> Créer un Quiz
        </motion.button>
      </div>
      
      {/* Zone d'affichage (Image ou PDF) */}
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', background: '#0F172A', position: 'relative' }}>
        {isImage ? (
          <img src={url} alt={title} style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain', padding: '20px' }} />
        ) : (
          <iframe src={url} style={{ width: '100%', height: '100%', border: 'none' }} title="Lecteur PDF" />
        )}
      </div>

      {/* --- MODALE DU QUIZ --- */}
      <AnimatePresence>
        {showQuizModal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.9)', backdropFilter: 'blur(8px)', zIndex: 999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
            <motion.div initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} style={{ background: '#FFF', borderRadius: '24px', width: '100%', maxWidth: '600px', overflow: 'hidden' }}>
              
              {/* Header de la modale */}
              <div style={{ padding: '20px 24px', borderBottom: '1px solid #E2E8F0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#F8FAFC' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#8B5CF6' }}>
                  <Sparkles size={20} />
                  <h3 style={{ fontSize: '18px', fontWeight: 800 }}>Quiz de révision</h3>
                </div>
                <button onClick={() => setShowQuizModal(false)} style={{ background: 'transparent', color: '#64748B' }}><X size={24} /></button>
              </div>

              {/* Contenu */}
              <div style={{ padding: '32px 24px' }}>
                
                {loadingQuiz ? (
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '40px 0' }}>
                    <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1.5, ease: "linear" }}>
                      <Sparkles size={40} color="#8B5CF6" />
                    </motion.div>
                    <p style={{ marginTop: '16px', color: '#64748B', fontWeight: 600 }}>L'IA prépare tes questions...</p>
                  </div>
                ) : quizFinished ? (
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ width: '80px', height: '80px', background: '#FFFBEB', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
                      <Trophy size={40} color="#F59E0B" />
                    </div>
                    <h2 style={{ fontSize: '28px', fontWeight: 800, color: '#0F172A', marginBottom: '8px' }}>Quiz terminé !</h2>
                    <p style={{ fontSize: '18px', color: '#64748B', marginBottom: '24px' }}>
                      Ton score : <strong style={{ color: score >= 3 ? '#10B981' : '#EF4444' }}>{score} / {quizData.length}</strong>
                    </p>
                    <button onClick={() => setShowQuizModal(false)} style={{ padding: '16px 32px', background: '#1E40AF', color: '#FFF', borderRadius: '12px', fontWeight: 700, fontSize: '16px', width: '100%' }}>
                      Continuer mes révisions
                    </button>
                  </div>
                ) : quizData.length > 0 ? (
                  <div>
                    <p style={{ fontSize: '13px', color: '#64748B', fontWeight: 700, marginBottom: '16px', textTransform: 'uppercase', letterSpacing: '1px' }}>Question {currentQuestion + 1} sur {quizData.length}</p>
                    <h3 style={{ fontSize: '20px', fontWeight: 700, color: '#0F172A', marginBottom: '24px', lineHeight: 1.4 }}>{quizData[currentQuestion].question}</h3>
                    
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                      {quizData[currentQuestion].options.map((opt: string, idx: number) => {
                        const isCorrect = opt === quizData[currentQuestion].correctAnswer;
                        const isSelected = opt === selectedAnswer;
                        
                        let bgColor = '#F8FAFC';
                        let borderColor = '#E2E8F0';
                        let textColor = '#0F172A';

                        if (isAnswered) {
                          if (isCorrect) { bgColor = '#ECFDF5'; borderColor = '#10B981'; textColor = '#065F46'; }
                          else if (isSelected) { bgColor = '#FEF2F2'; borderColor = '#EF4444'; textColor = '#991B1B'; }
                        } else if (isSelected) {
                          bgColor = '#EFF6FF'; borderColor = '#3B82F6';
                        }

                        return (
                          <button 
                            key={idx} onClick={() => handleAnswerClick(opt)} disabled={isAnswered}
                            style={{ padding: '16px', borderRadius: '12px', border: `2px solid ${borderColor}`, background: bgColor, color: textColor, fontSize: '16px', fontWeight: 600, textAlign: 'left', display: 'flex', alignItems: 'center', justifyContent: 'space-between', transition: 'all 0.2s' }}
                          >
                            {opt}
                            {isAnswered && isCorrect && <CheckCircle size={20} color="#10B981" />}
                            {isAnswered && isSelected && !isCorrect && <XCircle size={20} color="#EF4444" />}
                          </button>
                        );
                      })}
                    </div>

                    {isAnswered && (
                      <motion.button initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} onClick={nextQuestion} style={{ width: '100%', padding: '16px', background: '#0F172A', color: '#FFF', borderRadius: '12px', fontWeight: 700, fontSize: '16px', marginTop: '24px' }}>
                        {currentQuestion + 1 === quizData.length ? 'Voir mon score' : 'Question suivante'}
                      </motion.button>
                    )}
                  </div>
                ) : null}

              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}

export default function ViewPdfPage() {
  return (
    <Suspense fallback={<Loader />}>
      <Viewer />
    </Suspense>
  );
}