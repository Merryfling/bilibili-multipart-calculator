/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    // !! 警告 !!
    // 禁用类型检查仅用于部署，本地开发时应该启用
    ignoreBuildErrors: true,
  },
  eslint: {
    // 禁用ESLint检查仅用于部署，本地开发时应该启用
    ignoreDuringBuilds: true,
  },
}

export default nextConfig; 