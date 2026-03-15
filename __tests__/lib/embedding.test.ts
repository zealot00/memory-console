import { cosineSimilarity } from '@/lib/embedding';

describe('embedding service', () => {
  describe('cosineSimilarity', () => {
    it('should return 1 for identical vectors', () => {
      const a = [1, 0, 0];
      const b = [1, 0, 0];
      expect(cosineSimilarity(a, b)).toBe(1);
    });

    it('should return 0 for orthogonal vectors', () => {
      const a = [1, 0, 0];
      const b = [0, 1, 0];
      expect(cosineSimilarity(a, b)).toBe(0);
    });

    it('should return -1 for opposite vectors', () => {
      const a = [1, 0, 0];
      const b = [-1, 0, 0];
      expect(cosineSimilarity(a, b)).toBe(-1);
    });

    it('should handle empty vectors', () => {
      expect(cosineSimilarity([], [])).toBe(0);
    });

    it('should handle different length vectors', () => {
      expect(cosineSimilarity([1, 2], [1])).toBe(0);
    });
  });

  describe('getEmbeddingProvider', () => {
    const originalEnv = process.env;

    beforeEach(() => {
      jest.resetModules();
      process.env = { ...originalEnv };
    });

    afterAll(() => {
      process.env = originalEnv;
    });

    it('should return ollama when OLLAMA_HOST is set', async () => {
      process.env.OLLAMA_HOST = 'http://localhost:11434';
      delete process.env.OPENAI_API_KEY;
      
      const { getEmbeddingProvider } = await import('@/lib/embedding');
      expect(getEmbeddingProvider()).toBe('ollama');
    });

    it('should return openai when only OPENAI_API_KEY is set', async () => {
      process.env.OPENAI_API_KEY = 'sk-test';
      delete process.env.OLLAMA_HOST;
      
      const { getEmbeddingProvider } = await import('@/lib/embedding');
      expect(getEmbeddingProvider()).toBe('openai');
    });

    it('should prefer ollama when both are set', async () => {
      process.env.OLLAMA_HOST = 'http://localhost:11434';
      process.env.OPENAI_API_KEY = 'sk-test';
      
      const { getEmbeddingProvider } = await import('@/lib/embedding');
      expect(getEmbeddingProvider()).toBe('ollama');
    });

    it('should throw error when neither is set', async () => {
      delete process.env.OPENAI_API_KEY;
      delete process.env.OLLAMA_HOST;
      
      const { getEmbeddingProvider } = await import('@/lib/embedding');
      expect(() => getEmbeddingProvider()).toThrow('OPENAI_API_KEY or OLLAMA_HOST');
    });
  });
});
