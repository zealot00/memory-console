import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withReadAuth, logAudit } from "@/lib/auth";
import { getClientIP } from "@/lib/utils";
import { generateEmbedding, cosineSimilarity } from "@/lib/embedding";

export async function POST(request: NextRequest) {
  return withReadAuth(async (req, auth) => {
    try {
      const body = await request.json();
      const { query, namespace, limit = 20, minScore = 0.1 } = body;

      if (!query || typeof query !== "string") {
        return NextResponse.json({ error: "Search query is required" }, { status: 400 });
      }

      const searchNamespace = namespace || auth.namespace;

      let queryEmbedding: number[];
      try {
        queryEmbedding = await generateEmbedding(query);
      } catch (error) {
        console.error('Failed to generate query embedding:', error);
        return NextResponse.json({ error: "Failed to generate search embedding" }, { status: 500 });
      }

      const memories = await prisma.memory.findMany({
        where: { namespace: searchNamespace, status: "active" },
        take: 100,
      });

      const results = memories
        .map(memory => ({
          ...memory,
          score: memory.embedding?.length ? cosineSimilarity(queryEmbedding, memory.embedding) : 0,
        }))
        .filter(r => r.score >= minScore)
        .sort((a, b) => b.score - a.score)
        .slice(0, limit);

      await logAudit("search", "memory", undefined, searchNamespace, undefined, auth.tokenId, getClientIP(request), { query, resultsCount: results.length });

      return NextResponse.json({
        items: results.map(r => ({
          id: r.id, title: r.title, content: r.content, namespace: r.namespace, tags: r.tags, score: r.score,
        })),
        total: results.length,
        query,
      });
    } catch (error) {
      console.error("Error searching memories:", error);
      return NextResponse.json({ error: "Search failed" }, { status: 500 });
    }
  })(request);
}
