/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ['@webgl-tools/core', '@webgl-tools/overlay', '@webgl-tools/three-adapter'],
}

module.exports = nextConfig