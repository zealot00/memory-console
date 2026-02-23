import "./globals.css";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "记忆控制台 | Memory Console",
  description: "AI 和人类的共享记忆系统",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="zh-CN">
      <body className="antialiased">{children}</body>
    </html>
  );
}
