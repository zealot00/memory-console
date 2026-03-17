import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withReadAuth, logAudit } from "@/lib/auth";
import { getClientIP } from "@/lib/utils";
import { generateEmbedding, cosineSimilarity } from "@/lib/embedding";

export async function POST(request: NextRequest) {
  return withReadAuth(async (req, auth) => {
    try {
      const body = await request.json();
      const { 
        query, 
        namespace, 
        limit = 20, 
        minScore = 0.1,
        mode = 'vector',
        keywordWeight = 0.3,
        vectorWeight = 0.7,
      } = body;

      if (!query || typeof query !== "string") {
        return NextResponse.json({ error: "Search query is required" }, { status: 400 });
      }

      if (mode === 'hybrid' && (!keywordWeight || !vectorWeight)) {
        return NextResponse.json({ error: "keywordWeight and vectorWeight required for hybrid mode" }, { status: 400 });
      }

      const searchNamespace = namespace || auth.namespace;

      // Keyword search mode
      if (mode === 'keyword') {
        const results = await prisma.memory.findMany({
          where: {
            namespace: searchNamespace,
            status: 'active',
            OR: [
              { title: { contains: query, mode: 'insensitive' } },
              { content: { contains: query, mode: 'insensitive' } },
            ],
          },
          take: limit,
          orderBy: { updatedAt: 'desc' },
        });

        await logAudit("search", "memory", undefined, searchNamespace, undefined, auth.tokenId, getClientIP(request), { query, resultsCount: results.length, mode: 'keyword' });

        return NextResponse.json({
          items: results.map(r => ({
            id: r.id, 
            title: r.title, 
            content: r.content, 
            namespace: r.namespace, 
            tags: r.tags, 
            score: 1,
          })),
          total: results.length,
          query,
          mode: 'keyword',
        });
      }

      // Generate query embedding
      let queryEmbedding: number[];
      try {
        queryEmbedding = await generateEmbedding(query);
      } catch (error) {
        console.error('Failed to generate query embedding:', error);
        return NextResponse.json({ error: "Failed to generate search embedding" }, { status: 500 });
      }

      // Hybrid search mode
      if (mode === 'hybrid') {
        try {
          const embeddingVector = `[${queryEmbedding.join(',')}]`;

          const rawResults = await prisma.$queryRaw<Array<{
            id: string;
            title: string;
            content: string;
            namespace: string;
            tags: string[];
            vectorScore: number;
            keywordScore: number;
          }>>`
            SELECT 
              id, 
              title, 
              content, 
              namespace, 
              tags,
              (embedding <=> ${embeddingVector}::vector) AS "vectorScore",
              CASE 
                WHEN title ILIKE ${`%${query}%`} OR content ILIKE ${`%${query}%`} THEN 1.0
                ELSE 0.0
              END AS "keywordScore"
            FROM "Memory"
            WHERE namespace = ${searchNamespace}
              AND status = 'active'
              AND array_length(embedding, 1) > 0
              AND (title ILIKE ${`%${query}%`} OR content ILIKE ${`%${query}%`})
            ORDER BY embedding <=> ${embeddingVector}::vector
            LIMIT ${limit * 2}
          `;

          const results = rawResults
            .map(r => ({
              id: r.id,
              title: r.title,
              content: r.content,
              namespace: r.namespace,
              tags: r.tags,
              score: (1 - r.vectorScore) * vectorWeight + r.keywordScore * keywordWeight,
            }))
            .sort((a, b) => b.score - a.score)
            .slice(0, limit);

          await logAudit("search", "memory", undefined, searchNamespace, undefined, auth.tokenId, getClientIP(request), { query, resultsCount: results.length, mode: 'hybrid' });

          return NextResponse.json({
            items: results,
            total: results.length,
            query,
            mode: 'hybrid',
          });
        } catch (pgError: any) {
          console.warn('pgvector query failed, falling back to in-memory calculation:', pgError.message);
          // Fallback to in-memory calculation
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

          await logAudit("search", "memory", undefined, searchNamespace, undefined, auth.tokenId, getClientIP(request), { query, resultsCount: results.length, mode: 'hybrid', fallback: true });

          return NextResponse.json({
            items: results.map(r => ({
              id: r.id, title: r.title, content: r.content, namespace: r.namespace, tags: r.tags, score: r.score,
            })),
            total: results.length,
            query,
            mode: 'hybrid',
          });
        }
      }

      // Vector search mode (default) - with fallback to in-memory
      try {
        const embeddingVector = `[${queryEmbedding.join(',')}]`;
        
        const results = await prisma.$queryRaw<Array<{
          id: string;
          title: string;
          content: string;
          namespace: string;
          tags: string[];
          score: number;
        }>>`
          SELECT 
            id, 
            title, 
            content, 
            namespace, 
            tags,
            (embedding <=> ${embeddingVector}::vector) AS score
          FROM "Memory"
          WHERE namespace = ${searchNamespace}
            AND status = 'active'
            AND array_length(embedding, 1) > 0
          ORDER BY embedding <=> ${embeddingVector}::vector
          LIMIT ${limit}
        `;

        const filteredResults = results.filter(r => (r.score || 1) <= (1 - minScore));

        await logAudit("search", "memory", undefined, searchNamespace, undefined, auth.tokenId, getClientIP(request), { query, resultsCount: filteredResults.length, mode: 'vector' });

        return NextResponse.json({
          items: filteredResults.map(r => ({
            id: r.id, 
            title: r.title, 
            content: r.content, 
            namespace: r.namespace, 
            tags: r.tags, 
            score: 1 - (r.score || 0),
          })),
          total: filteredResults.length,
          query,
          mode: 'vector',
        });
      } catch (pgError: any) {
        console.warn('pgvector query failed, falling back to in-memory calculation:', pgError.message);
        
        // Fallback to in-memory calculation
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

        await logAudit("search", "memory", undefined, searchNamespace, undefined, auth.tokenId, getClientIP(request), { query, resultsCount: results.length, mode: 'vector', fallback: true });

        return NextResponse.json({
          items: results.map(r => ({
            id: r.id, title: r.title, content: r.content, namespace: r.namespace, tags: r.tags, score: r.score,
          })),
          total: results.length,
          query,
          mode: 'vector',
        });
      }
    } catch (error) {
      console.error("Error searching memories:", error);
      return NextResponse.json({ error: "Search failed" }, { status: 500 });
    }
  })(request);
}
