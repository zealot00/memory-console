import { cosineSimilarity, generateEmbedding } from '@/lib/embedding';

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
});
