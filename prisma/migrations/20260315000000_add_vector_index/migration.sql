-- Add pgvector HNSW index for embedding column
-- This migration adds vector similarity search support

-- Enable pgvector extension if not already enabled
CREATE EXTENSION IF NOT EXISTS vector;

-- Create HNSW index on embedding column for cosine similarity
-- Using hnsw with m=16 and ef_construction=64 for good balance of speed and accuracy
CREATE INDEX IF NOT EXISTS "Memory_embedding_hnsw_idx" 
ON "Memory" 
USING hnsw (embedding vector_cosine_ops)
WITH (m = 16, ef_construction = 64);

-- Optional: Also create a standard b-tree index for basic lookups if needed
-- Note: vector columns don't benefit from standard b-tree indexes
