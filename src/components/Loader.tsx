'use client';

import { motion } from 'framer-motion';

export default function Loader({ text = "Chargement..." }: { text?: string }) {
  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: '#F8FAFC' }}>
      
      {/* Logo animé */}
      <motion.div
        animate={{ 
          scale: [1, 1.1, 1],
          rotate: [0, 5, -5, 0]
        }}
        transition={{ 
          duration: 2, 
          repeat: Infinity, 
          ease: "easeInOut" 
        }}
        style={{ 
          width: '80px', height: '80px', 
          background: 'linear-gradient(135deg, #F59E0B, #F77F00)', 
          borderRadius: '20px', 
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: '0 10px 25px rgba(245, 158, 11, 0.3)',
          marginBottom: '24px'
        }}
      >
        <span style={{ fontSize: '40px', fontWeight: 900, color: '#FFF', fontFamily: 'Poppins' }}>S</span>
      </motion.div>

      {/* Texte de chargement */}
      <motion.p
        animate={{ opacity: [0.5, 1, 0.5] }}
        transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
        style={{ color: '#64748B', fontSize: '16px', fontWeight: 600 }}
      >
        {text}
      </motion.p>
    </div>
  );
}