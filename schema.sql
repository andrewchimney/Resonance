-- Enable UUID + pgvector
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS vector;

-- Users table
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  username TEXT UNIQUE NOT NULL,
  email TEXT UNIQUE,
  password_hash TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  generation_prefrences TEXT

);

-- Presets table
CREATE TABLE presets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  visibility TEXT DEFAULT 'public',
  supabase_key TEXT NOT NULL,
  preset_object_key TEXT NOT NULL DEFAULT '',
  preview_object_key TEXT,
  embedding VECTOR(384),
  source TEXT DEFAULT 'seed',
  created_at TIMESTAMP DEFAULT NOW()
);

-- Posts table
CREATE TABLE posts(
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  preset_id UUID REFERENCES presets(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  visibility TEXT DEFAULT 'public',
  created_at TIMESTAMP DEFAULT NOW(),
  votes INTEGER DEFAULT 0

);
-- Comments table
CREATE TABLE comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  post_id UUID REFERENCES posts(id) ON DELETE CASCADE,
  body TEXT NOT NULL,
  visibility TEXT DEFAULT 'public',
  created_at TIMESTAMP DEFAULT NOW(),
  votes INTEGER DEFAULT 0,
  preset_id UUID REFERENCES presets(id) ON DELETE CASCADE

);


CREATE INDEX presets_owner_idx ON presets(owner_user_id);
CREATE INDEX presets_embedding_idx ON presets USING ivfflat (embedding);

-- DROP TABLE IF EXISTS presets CASCADE;
-- DROP TABLE IF EXISTS users CASCADE;