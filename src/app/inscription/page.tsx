'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '@/lib/supabase';
import { Mail, Lock, User, GraduationCap, Upload, School } from 'lucide-react';
import Toast from '@/components/Toast';

export default function InscriptionPage() {
  const [mode, setMode] = useState<'signup' | 'login'>('signup');
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error'; show: boolean }>({ msg: '', type: 'error', show: false });
  
  const [fullName, setFullName] = useState('');
  const [level, setLevel] = useState('');
  const [school, setSchool] = useState(''); // NOUVEAU CHAMP LIBRE
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [avatar, setAvatar] = useState<File | null>(null);
  const [focused, setFocused] = useState('');

  const showToast = (msg: string, type: 'success' | 'error') => {
    setToast({ msg, type, show: true });
    setTimeout(() => setToast(t => ({ ...t, show: false })), 3000);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (mode === 'signup') {
        const { data, error: signErr } = await supabase.auth.signUp({ email, password, options: { data: { full_name: fullName } } });
        if (signErr) throw signErr;
        if (!data.user) throw new Error('Erreur inscription');

        let avatarUrl = '';
        if (avatar) {
          const ext = avatar.name.split('.').pop();
          const path = `${data.user.id}.${ext}`;
          const { error: upErr } = await supabase.storage.from('avatars').upload(path, avatar, { upsert: true });
          if (!upErr) {
            const { data: pub } = supabase.storage.from('avatars').getPublicUrl(path);
            avatarUrl = pub.publicUrl;
          }
        }

        // On sauvegarde l'école avec le profil
        await supabase.from('profiles').upsert({ 
          id: data.user.id, 
          full_name: fullName, 
          level, 
          school, // <-- L'ÉCOLE EST SAUVEGARDÉE ICI
          avatar_url: avatarUrl, 
          role: email === 'admin@study.ci' ? 'admin' : 'student' 
        });

        showToast('Compte créé avec succès !', 'success');
        setTimeout(() => { window.location.href = '/'; }, 800);
      } else {
        const realEmail = email === 'admin' ? 'admin@study.ci' : email;
        const { error: logErr } = await supabase.auth.signInWithPassword({ email: realEmail, password });
        if (logErr) throw logErr;
        showToast('Connexion réussie !', 'success');
        setTimeout(() => { window.location.href = '/'; }, 800);
      }
    } catch (err: any) {
      showToast(err.message || 'Une erreur est survenue', 'error');
    } finally {
      setLoading(false);
    }
  };

  const inputStyle = (name: string) => ({
    width: '100%', padding: '14px 14px 14px 44px',
    background: '#F8FAFC',
    border: `1px solid ${focused === name ? '#F59E0B' : '#E2E8F0'}`,
    borderRadius: '12px', color: '#0F172A', fontSize: '15px',
    transition: 'all 0.3s', boxShadow: focused === name ? '0 0 0 3px rgba(245,158,11,0.1)' : 'none'
  });

  return (
    <div style={{ minHeight: '100vh', position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px', overflow: 'hidden', background: '#F8FAFC' }}>
      <div className="bg-shape" style={{ width: '500px', height: '500px', background: '#3B82F6', top: '-10%', left: '-10%', opacity: 0.15 }} />
      <div className="bg-shape" style={{ width: '400px', height: '400px', background: '#FBBF24', bottom: '-10%', right: '-10%', opacity: 0.15, animationDelay: '-5s' }} />

      <Toast message={toast.msg} type={toast.type} show={toast.show} />

      <motion.div initial={{ opacity: 0, y: 30, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }} transition={{ duration: 0.6, type: 'spring', bounce: 0.3 }} className="glass-card" style={{ width: '100%', maxWidth: '440px', borderRadius: '24px', padding: '40px', position: 'relative', zIndex: 10 }}>
        
        <motion.h1 initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }} style={{ fontSize: '32px', fontWeight: 800, color: '#0F172A', textAlign: 'center', marginBottom: '8px', letterSpacing: '-1px' }}>
          Study<span style={{ color: '#F59E0B' }}>CI</span>
        </motion.h1>
        <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }} style={{ textAlign: 'center', color: '#64748B', marginBottom: '32px', fontSize: '15px' }}>
          {mode === 'signup' ? 'Rejoins la communauté étudiante' : 'Ravi de te revoir !'}
        </motion.p>

        <AnimatePresence mode="wait">
          <motion.form key={mode} initial={{ opacity: 0, x: mode === 'signup' ? -30 : 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: mode === 'signup' ? 30 : -30 }} transition={{ duration: 0.3 }} onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            
            {mode === 'signup' && (
              <>
                <div>
                  <label style={{ fontSize: '13px', color: '#475569', marginBottom: '8px', display: 'block', fontWeight: 600 }}>Nom & Prénom</label>
                  <div style={{ position: 'relative' }}>
                    <User size={20} color={focused === 'name' ? '#F59E0B' : '#94A3B8'} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', transition: 'color 0.2s' }} />
                    <input type="text" required value={fullName} onChange={(e) => setFullName(e.target.value)} onFocus={() => setFocused('name')} onBlur={() => setFocused('')} placeholder="Ex: Kouassi Jean" style={inputStyle('name')} />
                  </div>
                </div>
                <div>
                  <label style={{ fontSize: '13px', color: '#475569', marginBottom: '8px', display: 'block', fontWeight: 600 }}>Filière / Niveau</label>
                  <div style={{ position: 'relative' }}>
                    <GraduationCap size={20} color={focused === 'level' ? '#F59E0B' : '#94A3B8'} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', transition: 'color 0.2s' }} />
                    <input type="text" value={level} onChange={(e) => setLevel(e.target.value)} onFocus={() => setFocused('level')} onBlur={() => setFocused('')} placeholder="Ex: L2 Droit" style={inputStyle('level')} />
                  </div>
                </div>

                {/* CHAMP LIBRE POUR L'ÉCOLE */}
                <div>
                  <label style={{ fontSize: '13px', color: '#475569', marginBottom: '8px', display: 'block', fontWeight: 600 }}>Ton École / Université</label>
                  <div style={{ position: 'relative' }}>
                    <School size={20} color={focused === 'school' ? '#F59E0B' : '#94A3B8'} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', transition: 'color 0.2s' }} />
                    <input 
                      type="text" 
                      required 
                      value={school} 
                      onChange={(e) => setSchool(e.target.value)} 
                      onFocus={() => setFocused('school')} 
                      onBlur={() => setFocused('')} 
                      placeholder="Ex: UFHB, UIPA, INP-HB..." 
                      style={inputStyle('school')} 
                    />
                  </div>
                </div>
              </>
            )}

            <div>
              <label style={{ fontSize: '13px', color: '#475569', marginBottom: '8px', display: 'block', fontWeight: 600 }}>Email {mode === 'login' && '(ou "admin")'}</label>
              <div style={{ position: 'relative' }}>
                <Mail size={20} color={focused === 'email' ? '#F59E0B' : '#94A3B8'} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', transition: 'color 0.2s' }} />
                <input type="text" required value={email} onChange={(e) => setEmail(e.target.value)} onFocus={() => setFocused('email')} onBlur={() => setFocused('')} placeholder="ton.email@exemple.com" style={inputStyle('email')} />
              </div>
            </div>

            <div>
              <label style={{ fontSize: '13px', color: '#475569', marginBottom: '8px', display: 'block', fontWeight: 600 }}>Mot de passe</label>
              <div style={{ position: 'relative' }}>
                <Lock size={20} color={focused === 'pwd' ? '#F59E0B' : '#94A3B8'} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', transition: 'color 0.2s' }} />
                <input type="password" required value={password} onChange={(e) => setPassword(e.target.value)} onFocus={() => setFocused('pwd')} onBlur={() => setFocused('')} placeholder="••••••••" style={inputStyle('pwd')} />
              </div>
            </div>

            {mode === 'signup' && (
              <div>
                <label style={{ fontSize: '13px', color: '#475569', marginBottom: '8px', display: 'block', fontWeight: 600 }}>Photo de profil (optionnel)</label>
                <motion.label whileHover={{ borderColor: '#F59E0B', background: '#FFFBEB' }} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '14px', background: '#F8FAFC', border: '1px dashed #CBD5E1', borderRadius: '12px', cursor: 'pointer', fontSize: '14px', color: '#64748B', transition: 'all 0.2s' }}>
                  <Upload size={20} />
                  {avatar ? avatar.name : 'Choisir une image'}
                  <input type="file" accept="image/*" onChange={(e) => setAvatar(e.target.files?.[0] || null)} style={{ display: 'none' }} />
                </motion.label>
              </div>
            )}

            <motion.button type="submit" disabled={loading} whileHover={{ scale: loading ? 1 : 1.02, boxShadow: '0 10px 25px rgba(30,64,175,0.3)' }} whileTap={{ scale: loading ? 1 : 0.98 }} style={{ padding: '16px', background: 'linear-gradient(135deg, #1E40AF, #3B82F6)', color: '#FFF', borderRadius: '12px', fontSize: '16px', fontWeight: 700, marginTop: '12px', opacity: loading ? 0.6 : 1, transition: 'all 0.2s' }}>
              {loading ? 'Chargement...' : mode === 'signup' ? "S'inscrire" : 'Se connecter'}
            </motion.button>
          </motion.form>
        </AnimatePresence>

        <p style={{ textAlign: 'center', marginTop: '24px', fontSize: '14px', color: '#64748B' }}>
          {mode === 'signup' ? 'Déjà un compte ?' : 'Pas encore de compte ?'}{' '}
          <motion.button whileHover={{ scale: 1.05, color: '#1E40AF' }} whileTap={{ scale: 0.95 }} onClick={() => setMode(mode === 'signup' ? 'login' : 'signup')} style={{ background: 'none', color: '#F59E0B', fontWeight: 700, fontSize: '14px', transition: 'color 0.2s' }}>
            {mode === 'signup' ? 'Se connecter' : "S'inscrire"}
          </motion.button>
        </p>
      </motion.div>
    </div>
  );
}