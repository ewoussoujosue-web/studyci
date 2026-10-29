'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Image as ImageIcon, Sparkles, X, Send, Palette } from 'lucide-react';

// Nos ambiances (couleurs unies et dégradés)
const THEMES = [
  { id: 'default', name: 'Défaut', bg: '#FFFFFF', color: '#0F172A' },
  { id: 'gradient-1', name: 'Océan', bg: 'linear-gradient(135deg, #1E3A8A, #3B82F6)', color: '#FFFFFF' },
  { id: 'gradient-2', name: 'Coucher de soleil', bg: 'linear-gradient(135deg, #F59E0B, #EF4444)', color: '#FFFFFF' },
  { id: 'gradient-3', name: 'Violet', bg: 'linear-gradient(135deg, #8B5CF6, #D946EF)', color: '#FFFFFF' },
  { id: 'solid-1', name: 'Sable', bg: '#FDE68A', color: '#78350F' },
  { id: 'solid-2', name: 'Menthe', bg: '#A7F3D0', color: '#064E3B' },
];

export default function TextEditor({ profile, onSubmit, uploading }: { profile: any, onSubmit: (content: string, file: File | null, theme: any) => void, uploading: boolean }) {
  const [newPost, setNewPost] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [selectedTheme, setSelectedTheme] = useState(THEMES[0]);
  const [showThemes, setShowThemes] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPost.trim() && !selectedFile) return;
    onSubmit(newPost, selectedFile, selectedTheme);
    setNewPost('');
    setSelectedFile(null);
    setSelectedTheme(THEMES[0]);
    setShowThemes(false);
  };

  return (
    <form onSubmit={handleSubmit} style={{ padding: '24px', borderBottom: '1px solid #E2E8F0', background: '#FFF' }}>
      
      {/* APERÇU DU TEXTE AVEC LE THEME CHOISI */}
      <div style={{ display: 'flex', gap: '16px' }}>
        {profile?.avatar_url ? <img src={profile.avatar_url} style={{ width: '48px', height: '48px', borderRadius: '50%' }} /> : <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: '#F1F5F9' }} />}
        
        <div style={{ flex: 1 }}>
          <div style={{ 
            background: selectedTheme.bg, 
            padding: newPost ? '24px' : '0', 
            borderRadius: '16px', 
            transition: 'all 0.3s',
            minHeight: '60px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <textarea 
              value={newPost} 
              onChange={(e) => setNewPost(e.target.value)} 
              placeholder={selectedTheme.id === 'default' ? "Quoi de neuf, étudiant(e) ?" : "Écris ton texte ici..."} 
              rows={newPost ? 4 : 2} 
              style={{ 
                width: '100%', 
                border: 'none', 
                resize: 'none', 
                fontSize: '20px', 
                fontWeight: selectedTheme.id === 'default' ? 400 : 700,
                outline: 'none', 
                background: 'transparent', 
                color: selectedTheme.color,
                textAlign: newPost && selectedTheme.id !== 'default' ? 'center' : 'left',
                transition: 'all 0.3s'
              }} 
            />
          </div>

          {selectedFile && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', background: '#F8FAFC', padding: '12px', borderRadius: '12px', border: '1px solid #E2E8F0', marginTop: '12px' }}>
              <ImageIcon size={24} color="#3B82F6" />
              <p style={{ flex: 1, fontSize: '14px', fontWeight: 600, color: '#0F172A' }}>{selectedFile.name}</p>
              <button type="button" onClick={() => setSelectedFile(null)} style={{ background: 'transparent' }}><X size={20} color="#EF4444" /></button>
            </div>
          )}

          {/* BOUTONS D'ACTION */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid #F1F5F9', paddingTop: '16px', marginTop: '16px' }}>
            <div style={{ display: 'flex', gap: '20px' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px', fontWeight: 600, color: '#1E40AF', cursor: 'pointer' }}>
                <ImageIcon size={20} /> Média
                <input type="file" accept="image/*, .pdf" onChange={(e) => setSelectedFile(e.target.files?.[0] || null)} style={{ display: 'none' }} />
              </label>
              
              <button type="button" onClick={() => setShowThemes(!showThemes)} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px', fontWeight: 600, color: showThemes ? '#8B5CF6' : '#64748B', background: 'transparent' }}>
                <Palette size={20} /> Style
              </button>
              
              <button type="button" onClick={() => setNewPost(newPost + " Qui peut m'aider ? ")} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px', fontWeight: 600, color: '#8B5CF6', background: 'transparent' }}>
                <Sparkles size={20} /> IA
              </button>
            </div>
            
            <button type="submit" disabled={uploading || (!newPost.trim() && !selectedFile)} style={{ padding: '10px 24px', background: '#1E40AF', color: '#FFF', borderRadius: '50px', fontWeight: 700, opacity: (uploading || (!newPost.trim() && !selectedFile)) ? 0.5 : 1, display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Send size={16} /> {uploading ? 'Envoi...' : 'Publier'}
            </button>
          </div>
        </div>
      </div>

      {/* LE MENU DES THEMES (Comme sur l'image) */}
      <AnimatePresence>
        {showThemes && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} style={{ overflow: 'hidden', marginTop: '16px', marginLeft: '64px' }}>
            <div style={{ background: '#F8FAFC', padding: '16px', borderRadius: '16px', border: '1px solid #E2E8F0' }}>
              <p style={{ fontSize: '12px', fontWeight: 700, color: '#64748B', marginBottom: '12px', textTransform: 'uppercase' }}>Choisir un style</p>
              <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                {THEMES.map((theme) => (
                  <button
                    key={theme.id}
                    type="button"
                    onClick={() => setSelectedTheme(theme)}
                    style={{
                      width: '50px', height: '50px', borderRadius: '12px', border: selectedTheme.id === theme.id ? '3px solid #1E40AF' : '1px solid #E2E8F0',
                      background: theme.bg, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'transform 0.2s'
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.05)'}
                    onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
                    title={theme.name}
                  >
                    {selectedTheme.id === theme.id && <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: theme.color === '#FFFFFF' ? '#FFF' : '#0F172A' }} />}
                  </button>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </form>
  );
}