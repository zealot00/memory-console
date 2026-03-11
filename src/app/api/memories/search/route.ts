import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withReadAuth, logAudit } from "@/lib/auth";
import { getClientIP } from "@/lib/utils";

const MAX_SEARCH_RESULTS = 20;

function calculateSimilarity(text1: string, text2: string): number {
  const words1 = new Set(text1.toLowerCase().split(/\s+/).filter(Boolean));
  const words2 = new Set(text2.toLowerCase().split(/\s+/).filter(Boolean));
  
  if (words1.size === 0 || words2.size === 0) return 0;
  
  let intersection = 0;
  words1.forEach(word => {
    if (words2.has(word)) intersection++;
  });
  
  const union = words1.size + words2.size - intersection;
  return union > 0 ? intersection / union : 0;
}

function highlightMatches(text: string, query: string): string {
  const words = query.toLowerCase().split(/\s+/).filter(Boolean);
  let result = text;
  words.forEach(word => {
    const regex = new RegExp(`(${word})`, 'gi');
    result = result.replace(regex, '**$1**');
  });
  return result;
}

export async function POST(request: NextRequest) {
  return withReadAuth(async (req, auth) => {
    try {
      const body = await request.json();
      const { query, namespace, limit = MAX_SEARCH_RESULTS, minScore = 0.1 } = body;

      if (!query || typeof query !== "string") {
        return NextResponse.json(
          { error: "Search query is required" },
          { status: 400 }
        );
      }

      const searchNamespace = namespace || auth.namespace;

      const memories = await prisma.memory.findMany({
        where: {
          namespace: searchNamespace,
          status: "active",
        },
        orderBy: { updatedAt: "desc" },
        take: 100,
      });

      const queryLower = query.toLowerCase();
      const scored = memories.map(memory => {
        const titleScore = calculateSimilarity(memory.title, queryLower) * 0.6;
        const contentScore = calculateSimilarity(memory.content, queryLower) * 0.4;
        const tagScore = memory.tags.some(tag => 
          queryLower.includes(tag.toLowerCase())
        ) ? 0.2 : 0;
        
        const totalScore = Math.min(titleScore + contentScore + tagScore, 1);
        
        return {
          ...memory,
          score: totalScore,
          highlightedTitle: highlightMatches(memory.title, query),
          highlightedContent: highlightMatches(memory.content.substring(0, 500), query),
        };
      });

      const results = scored
        .filter(r => r.score >= Number(minScore))
        .sort((a, b) => b.score - a.score)
        .slice(0, Number(limit));

      await logAudit(
        "search",
        "memory",
        undefined,
        searchNamespace,
        undefined,
        auth.tokenId,
        getClientIP(request),
        { query, resultsCount: results.length }
      );

      return NextResponse.json({
        items: results.map(r => ({
          id: r.id,
          title: r.title,
          content: r.content,
          namespace: r.namespace,
          tags: r.tags,
          score: r.score,
          highlightedTitle: r.highlightedTitle,
          highlightedContent: r.highlightedContent,
        })),
        total: results.length,
        query,
      });
    } catch (error) {
      console.error("Error searching memories:", error);
      return NextResponse.json(
        { error: "Search failed" },
        { status: 500 }
      );
    }
  })(request);
}
