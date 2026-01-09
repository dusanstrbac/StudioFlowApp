import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  // output: 'export', // Ovo je samo kada se pravi /out folder za prezentacione sajtove

  images: {
    domains: ['randomuser.me'],
    unoptimized: true,
  },
}

export default nextConfig
