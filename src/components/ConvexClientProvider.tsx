"use client";

import { ReactNode } from "react";
import { ConvexReactClient, ConvexProvider } from "convex/react";

// 使用本地 Convex dev server
const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL || "http://localhost:3000";

const convex = new ConvexReactClient(convexUrl);

export function ConvexClientProvider({ children }: { children: ReactNode }) {
  return <ConvexProvider client={convex}>{children}</ConvexProvider>;
}
