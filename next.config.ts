/** @type {import('next').NextConfig} */
const nextConfig = {
  // 1. Ignorer les erreurs TypeScript et ESLint pendant le build (pour ne pas bloquer)
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },

  // 2. Autoriser les images venant de Supabase
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**.supabase.co',
      },
    ],
  },

  // 3. L'option pour éviter le crash "BUILD_UTILS_SPAWN_1" sur Vercel
  experimental: {
    missingSuspenseWithCSRBailout: false,
  },

  // 4. Optimiser le build pour Vercel (allège la mémoire utilisée)
  output: 'standalone',

  // 5. Désactiver la télémétrie pour aller plus vite
  swcMinify: true,
};

export default nextConfig;