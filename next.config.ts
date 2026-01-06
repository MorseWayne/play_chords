import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // 生产环境使用 /play_chords 作为 basePath，开发环境不使用
  basePath: process.env.NODE_ENV === 'production' ? '/play_chords' : '',
  
  // 确保静态资源路径正确
  assetPrefix: process.env.NODE_ENV === 'production' ? '/play_chords' : '',
  
  // 允许跨域访问，解决 Turbopack 开发工具的问题
  allowedDevOrigins: ['10.10.131.118:10000'],
};

export default nextConfig;
