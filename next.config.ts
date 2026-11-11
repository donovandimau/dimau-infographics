import type { NextConfig } from 'next';

const config: NextConfig = {
  // The v1 library homepage (public/index.html) stays at "/" exactly as before.
  async rewrites() {
    return { beforeFiles: [{ source: '/', destination: '/index.html' }], afterFiles: [], fallback: [] };
  },
  serverExternalPackages: ['@resvg/resvg-js', 'linkedom', '@antv/infographic'],
  outputFileTracingIncludes: { '/api/**': ['./public/fonts/**'] },
};

export default config;
