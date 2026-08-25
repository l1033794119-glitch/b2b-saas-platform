/** @type {import('next').NextConfig} */
const path = require("path");

const nextConfig = {
  reactStrictMode: true,
  images: { remotePatterns: [{ protocol: "https", hostname: "**" }] },
  // 兜底 alias：部分 Linux 服务器上 tsconfig paths @/* 会被 webpack 忽略
  // 强制在 webpack 配置层同步别名
  webpack: (config) => {
    if (!config.resolve) config.resolve = {};
    if (!config.resolve.alias) config.resolve.alias = {};
    config.resolve.alias["@"] = path.resolve(__dirname, ".");
    return config;
  },
};

module.exports = nextConfig;
