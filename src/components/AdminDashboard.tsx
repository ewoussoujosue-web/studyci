'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { supabase } from '@/lib/supabase';
import { 
  Users, FileText, MessageSquare, Trash2, Shield, 
  TrendingUp, AlertTriangle, CheckCircle, XCircle, 
  Search, Ban, UserCheck, BarChart3, Home
} from 'lucide-react';

type AdminTab = 'overview' | 'users' | 'posts' | 'reports';

export default function AdminDashboard({ profile, onExit }: { profile: any; onExit: () => void }) {
  const [activeTab, setActiveTab] = useState<AdminTab>('overview');
  const [stats, setStats] = useState({ users: 0, posts: 0, comments: 0, reports: 0 });
  const [users, setUsers] = useState<any[]>([]);
  const [posts, setPosts] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);

  const loadAdminData = async () => {
    setLoading(true);
    try {
      const [usersRes, postsRes, commentsRes] = await Promise.all([
        supabase.from('profiles').select('*').order('created_at', { ascending: false }),
        supabase.from('posts').select('*, profiles(full_name, avatar_url)').order('created_at', { ascending: false }),
        supabase.from('post_comments').select('id', { count: 'exact', head: true }),
      ]);

      setUsers(usersRes.data || []);
      setPosts(postsRes.data || []);
      setStats({
        users: usersRes.data?.length || 0,
        posts: postsRes.data?.length || 0,
        comments: commentsRes.count || 0,
        reports: 0,
      });
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAdminData();
  }, []);

  const deleteUser = async (userId: string) => {
    if (!confirm('Supprimer cet utilisateur et tout son contenu ?')) return;
    await supabase.from('profiles').delete().eq('id', userId);
    loadAdminData();
  };

  const deletePost = async (postId: string) => {
    if (!confirm('Supprimer cette publication ?')) return;
    await supabase.from('posts').delete().eq('id', postId);
    loadAdminData();
  };

  const toggleBan = async (userId: string, currentStatus: boolean) => {
    await supabase.from('profiles').update({ is_banned: !currentStatus }).eq('id', userId);
    loadAdminData();
  };

  const filteredUsers = users.filter(u => 
    u.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    u.email?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div style={{ minHeight: '100vh', background: '#F8FAFC', display: 'flex', justifyContent: 'center' }}>
      <div style={{ display: 'flex', width: '100%', maxWidth: '1300px' }}>
        
        {/* SIDEBAR ADMIN */}
        <div style={{ width: '260px', padding: '20px', borderRight: '1px solid #E2E8F0', background: '#0F172A', position: 'sticky', top: 0, height: '100vh', display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '32px' }}>
            <div style={{ width: '32px', height: '32px', background: '#EF4444', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Shield size={18} color="#FFF" />
            </div>
            <h1 style={{ fontSize: '20px', fontWeight: 800, color: '#FFF' }}>Admin Panel</h1>
          </div>

          <nav style={{ display: 'flex', flexDirection: 'column', gap: '8px', flex: 1 }}>
            {[
              { id: 'overview', label: 'Vue d\'ensemble', icon: BarChart3 },
              { id: 'users', label: 'Utilisateurs', icon: Users },
              { id: 'posts', label: 'Publications', icon: FileText },
              { id: 'reports', label: 'Signalements', icon: AlertTriangle },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as AdminTab)}
                style={{
                  display: 'flex', alignItems: 'center', gap: '12px',
                  padding: '12px 16px', borderRadius: '12px', border: 'none',
                  background: activeTab === tab.id ? '#1E293B' : 'transparent',
                  color: activeTab === tab.id ? '#FBBF24' : '#94A3B8',
                  fontWeight: 600, fontSize: '15px', cursor: 'pointer',
                  textAlign: 'left'
                }}
              >
                <tab.icon size={20} /> {tab.label}
              </button>
            ))}
          </nav>

          <button 
            onClick={onExit}
            style={{ 
              display: 'flex', alignItems: 'center', gap: '12px', 
              padding: '12px 16px', borderRadius: '12px', border: 'none',
              background: 'transparent', color: '#10B981', 
              fontWeight: 600, fontSize: '15px', cursor: 'pointer' 
            }}
          >
            <Home size={20} /> Retour au feed
          </button>
        </div>

        {/* CONTENU ADMIN */}
        <div style={{ flex: 1, padding: '32px', background: '#FFF' }}>
          
          {/* OVERVIEW */}
          {activeTab === 'overview' && (
            <div>
              <h2 style={{ fontSize: '28px', fontWeight: 800, color: '#0F172A', marginBottom: '8px' }}>Vue d'ensemble</h2>
              <p style={{ color: '#64748B', marginBottom: '32px' }}>Statistiques en temps réel de StudyCI</p>
              
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '32px' }}>
                {[
                  { label: 'Utilisateurs', value: stats.users, icon: Users, color: '#3B82F6', bg: '#EFF6FF' },
                  { label: 'Publications', value: stats.posts, icon: FileText, color: '#10B981', bg: '#ECFDF5' },
                  { label: 'Commentaires', value: stats.comments, icon: MessageSquare, color: '#F59E0B', bg: '#FFFBEB' },
                  { label: 'Signalements', value: stats.reports, icon: AlertTriangle, color: '#EF4444', bg: '#FEF2F2' },
                ].map((stat) => (
                  <motion.div 
                    key={stat.label}
                    initial={{ opacity: 0, y: 20 }} 
                    animate={{ opacity: 1, y: 0 }}
                    style={{ background: stat.bg, padding: '24px', borderRadius: '16px', border: '1px solid #E2E8F0' }}
                  >
                    <stat.icon size={28} color={stat.color} />
                    <p style={{ fontSize: '32px', fontWeight: 900, color: '#0F172A', marginTop: '12px' }}>{stat.value}</p>
                    <p style={{ fontSize: '14px', color: '#64748B', fontWeight: 600 }}>{stat.label}</p>
                  </motion.div>
                ))}
              </div>
            </div>
          )}

          {/* USERS */}
          {activeTab === 'users' && (
            <div>
              <h2 style={{ fontSize: '28px', fontWeight: 800, color: '#0F172A', marginBottom: '24px' }}>Gestion des utilisateurs</h2>
              
              <div style={{ position: 'relative', marginBottom: '24px' }}>
                <Search size={20} color="#94A3B8" style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)' }} />
                <input 
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Rechercher un utilisateur..."
                  style={{ width: '100%', padding: '14px 14px 14px 48px', background: '#F1F5F9', border: 'none', borderRadius: '12px', fontSize: '15px', outline: 'none' }}
                />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {filteredUsers.map((u) => (
                  <div key={u.id} style={{ display: 'flex', alignItems: 'center', gap: '16px', padding: '16px', background: '#F8FAFC', borderRadius: '12px', border: '1px solid #E2E8F0' }}>
                    {u.avatar_url ? (
                      <img src={u.avatar_url} style={{ width: '48px', height: '48px', borderRadius: '50%', objectFit: 'cover' }} />
                    ) : (
                      <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: '#E2E8F0', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <Users size={24} color="#94A3B8" />
                      </div>
                    )}
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <p style={{ fontWeight: 700, color: '#0F172A' }}>{u.full_name || 'Anonyme'}</p>
                        {u.is_admin && (
                          <span style={{ fontSize: '11px', padding: '2px 8px', background: '#FEF3C7', color: '#92400E', borderRadius: '10px', fontWeight: 700 }}>ADMIN</span>
                        )}
                        {u.is_banned && (
                          <span style={{ fontSize: '11px', padding: '2px 8px', background: '#FEE2E2', color: '#991B1B', borderRadius: '10px', fontWeight: 700 }}>BANNI</span>
                        )}
                      </div>
                      <p style={{ fontSize: '13px', color: '#64748B' }}>{u.level || 'Étudiant'} · {u.email || 'Email non renseigné'}</p>
                    </div>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button 
                        onClick={() => toggleBan(u.id, u.is_banned)}
                        title={u.is_banned ? 'Débannir' : 'Bannir'}
                        style={{ padding: '8px', background: u.is_banned ? '#ECFDF5' : '#FFFBEB', border: 'none', borderRadius: '8px', cursor: 'pointer' }}
                      >
                        {u.is_banned ? <UserCheck size={18} color="#10B981" /> : <Ban size={18} color="#F59E0B" />}
                      </button>
                      <button 
                        onClick={() => deleteUser(u.id)}
                        style={{ padding: '8px', background: '#FEF2F2', border: 'none', borderRadius: '8px', cursor: 'pointer' }}
                      >
                        <Trash2 size={18} color="#EF4444" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* POSTS */}
          {activeTab === 'posts' && (
            <div>
              <h2 style={{ fontSize: '28px', fontWeight: 800, color: '#0F172A', marginBottom: '24px' }}>Modération des publications</h2>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {posts.map((p) => (
                  <div key={p.id} style={{ padding: '16px', background: '#F8FAFC', borderRadius: '12px', border: '1px solid #E2E8F0' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                        <p style={{ fontWeight: 700, color: '#0F172A' }}>{p.profiles?.full_name || 'Anonyme'}</p>
                        <p style={{ fontSize: '12px', color: '#64748B' }}>· {new Date(p.created_at).toLocaleDateString('fr-FR')}</p>
                      </div>
                      <button 
                        onClick={() => deletePost(p.id)}
                        style={{ padding: '8px', background: '#FEF2F2', border: 'none', borderRadius: '8px', cursor: 'pointer' }}
                      >
                        <Trash2 size={16} color="#EF4444" />
                      </button>
                    </div>
                    {p.content && <p style={{ color: '#334155', fontSize: '14px' }}>{p.content.slice(0, 200)}{p.content.length > 200 ? '...' : ''}</p>}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* REPORTS */}
          {activeTab === 'reports' && (
            <div>
              <h2 style={{ fontSize: '28px', fontWeight: 800, color: '#0F172A', marginBottom: '24px' }}>Signalements</h2>
              <div style={{ padding: '48px', textAlign: 'center', background: '#F8FAFC', borderRadius: '16px', border: '1px dashed #CBD5E1' }}>
                <CheckCircle size={48} color="#10B981" style={{ margin: '0 auto 16px' }} />
                <p style={{ color: '#64748B', fontWeight: 600 }}>Aucun signalement en attente</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}