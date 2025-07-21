/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    appDir: false,
  },
  webpack: (config) => {
    // Add support for importing BUSY files
    config.module.rules.push({
      test: /\.busy$/,
      use: 'raw-loader',
    });
    
    return config;
  },
  env: {
    ORGATA_IDE_VERSION: process.env.npm_package_version || '0.1.0',
  },
  async rewrites() {
    return [
      {
        source: '/api/ws',
        destination: '/api/websocket',
      },
    ];
  },
};

module.exports = nextConfig;