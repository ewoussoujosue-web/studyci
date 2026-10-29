'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { useEffect, useState } from 'react';

export default function SplashScreen() {
  const [showSplash, setShowSplash] = useState(false);

  useEffect(() => {
    // Vérifie si le splash a déjà été vu dans cette session
    const hasSeenSplash = sessionStorage.getItem('studyci_splash_seen');
    
    if (!hasSeenSplash) {
      setShowSplash(true);
      // On le cache après 2.5 secondes
      const timer = setTimeout(() => {
        setShowSplash(false);
        sessionStorage.setItem('studyci_splash_seen', 'true');
      }, 2500);
      return () => clearTimeout(timer);
    }
  }, []);

  return (
    <AnimatePresence>
      {showSplash && (
        <motion.div
          initial={{ opacity: 1 }}
          exit={{ opacity: 0, y: -50 }}
          transition={{ duration: 0.6, ease: "easeInOut" }}
          style={{
            position: 'fixed', inset: 0, zIndex: 9999,
            background: '#F8FAFC',
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center'
          }}
        >
          {/* Animation du Logo */}
          <motion.div
            initial={{ scale: 0, rotate: -180 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ type: "spring", stiffness: 260, damping: 20, delay: 0.2 }}
            style={{ 
              width: '100px', height: '100px', 
              background: 'linear-gradient(135deg, #F59E0B, #F77F00)', 
              borderRadius: '24px', 
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 20px 40px rgba(245, 158, 11, 0.4)',
              marginBottom: '24px'
            }}
          >
            <span style={{ fontSize: '50px', fontWeight: 900, color: '#FFF', fontFamily: 'Poppins' }}>S</span>
          </motion.div>

          {/* Texte StudyCI */}
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6, duration: 0.5 }}
            style={{ fontSize: '42px', fontWeight: 800, color: '#0F172A', fontFamily: 'Poppins' }}
          >
            Study<span style={{ color: '#F59E0B' }}>CI</span>
          </motion.h1>

          {/* Sous-titre */}
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1, duration: 0.5 }}
            style={{ fontSize: '16px', color: '#64748B', marginTop: '12px', fontWeight: 500 }}
          >
            Ouvre, révise et réussis !
          </motion.p>

          {/* Petite barre de chargement en bas */}
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: "200px" }}
            transition={{ delay: 0.5, duration: 1.8, ease: "easeInOut" }}
            style={{ height: '4px', background: '#F59E0B', borderRadius: '4px', position: 'absolute', bottom: '80px' }}
          />
        </motion.div>
      )}
    </AnimatePresence>
  );
}