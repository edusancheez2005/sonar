/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  compiler: {
    styledComponents: true,
  },
  env: {
    PUBLIC_URL: '',
  },
  webpack: (config) => {
    config.resolve.alias = {
      ...(config.resolve.alias || {}),
      'react-router-dom': require('path').resolve(__dirname, 'app/lib/rrd-adapter.js'),
    };
    return config;
  },
};

module.exports = nextConfig;
