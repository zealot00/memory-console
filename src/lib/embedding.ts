const OPENAI_MODEL = 'text-embedding-3-small';
const OLLAMA_MODEL = 'nomic-embed-text';

export type EmbeddingProvider = 'openai' | 'ollama';

export function getEmbeddingProvider(): EmbeddingProvider {
  const hasOllama = !!process.env.OLLAMA_HOST;
  const hasOpenAI = !!process.env.OPENAI_API_KEY;

  if (hasOllama) return 'ollama';
  if (hasOpenAI) return 'openai';

  throw new Error('Either OPENAI_API_KEY or OLLAMA_HOST environment variable is required');
}

async function generateOpenAIEmbedding(text: string): Promise<number[]> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error('OPENAI_API_KEY is required for OpenAI provider');
  }

  const response = await fetch('https://api.openai.com/v1/embeddings', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: OPENAI_MODEL,
      input: text.substring(0, 8000),
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`OpenAI API error: ${error}`);
  }

  const data = await response.json();
  return data.data[0].embedding;
}

async function generateOllamaEmbedding(text: string): Promise<number[]> {
  const host = process.env.OLLAMA_HOST || 'http://localhost:11434';

  const response = await fetch(`${host}/api/embeddings`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: OLLAMA_MODEL,
      prompt: text.substring(0, 8000),
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Ollama API error: ${error}`);
  }

  const data = await response.json();
  return data.embedding;
}

export async function generateEmbedding(text: string): Promise<number[]> {
  const provider = getEmbeddingProvider();

  if (provider === 'ollama') {
    return generateOllamaEmbedding(text);
  }

  return generateOpenAIEmbedding(text);
}

export function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length || a.length === 0) return 0;
  
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;
  
  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  
  const denominator = Math.sqrt(normA) * Math.sqrt(normB);
  return denominator > 0 ? dotProduct / denominator : 0;
}
