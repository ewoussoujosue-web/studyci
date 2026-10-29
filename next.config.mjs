/** @type {import('next').NextConfig} */
const nextConfig = {
  // 1. Ignorer les erreurs TypeScript et ESLint pendant le build
  typescript: { 
    ignoreBuildErrors: true 
  },
  eslint: { 
    ignoreDuringBuilds: true 
  },
  
  // 2. Autoriser les images venant de Supabase
  images: {
    remotePatterns: [
      { 
        protocol: 'https', 
        hostname: '**.supabase.co' 
      }
    ],
  },

  // 3. Désactiver la télémétrie
  swcMinify: true,
};

export default nextConfig;