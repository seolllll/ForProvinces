import type { Metadata } from "next";
import { Geist } from "next/font/google";
import "./globals.css";

const geist = Geist({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "ForProvinces | 전국 공연 지도",
  description: "전국의 연극, 뮤지컬, 전시회를 한눈에 확인하세요.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <body className={geist.className}>{children}</body>
    </html>
  );
}
