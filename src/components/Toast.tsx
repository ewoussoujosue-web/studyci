'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle, XCircle } from 'lucide-react';

export default function Toast({
  message,
  type,
  show,
}: {
  message: string;
  type: 'success' | 'error';
  show: boolean;
}) {
  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0, y: -50, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -50, scale: 0.9 }}
          transition={{ type: 'spring', stiffness: 300, damping: 25 }}
          style={{
            position: 'fixed',
            top: '20px',
            left: '50%',
            transform: 'translateX(-50%)',
            zIndex: 9999,
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            padding: '14px 22px',
            borderRadius: '12px',
            background: type === 'success' ? '#009E60' : '#EF4444',
            color: '#FFF',
            fontWeight: 600,
            fontSize: '14px',
            boxShadow: '0 10px 40px rgba(0,0,0,0.4)',
          }}
        >
          {type === 'success' ? <CheckCircle size={18} /> : <XCircle size={18} />}
          {message}
        </motion.div>
      )}
    </AnimatePresence>
  );
}