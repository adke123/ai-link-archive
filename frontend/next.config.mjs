/** @type {import('next').NextConfig} */
import withPWA from 'next-pwa';

const nextConfig = {
  reactStrictMode: true,
};

export default withPWA({
  dest: 'public',       // 빌드 시 public 폴더에 PWA 파일 생성
  register: true,
  skipWaiting: true,
  disable: process.env.NODE_ENV === 'development', // 개발 중에는 PWA 끄기 (오류 방지)
})(nextConfig);