import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        // KOPIS 공연 포스터 이미지 도메인
        protocol: "https",
        hostname: "*.kopis.or.kr",
      },
    ],
  },
};

export default nextConfig;
