-- Canvases table
CREATE TABLE IF NOT EXISTS canvases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  name TEXT,
  nodes JSONB,
  edges JSONB,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Grimpo states table
CREATE TABLE IF NOT EXISTS grimpo_states (
  id SERIAL PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  nodes JSONB,
  edges JSONB,
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Projects table (aka Sectors)
-- Multi-project workspace container for per-user isolated nodes/edges
CREATE TABLE IF NOT EXISTS projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  nodes JSONB NOT NULL DEFAULT '[]'::jsonb,
  edges JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Migration: If you have an existing grimpo_states table with user_key column,
-- run this migration SQL to update it:
-- ALTER TABLE grimpo_states RENAME COLUMN user_key TO user_id;
-- ALTER TABLE grimpo_states ADD CONSTRAINT fk_grimpo_states_user_id FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;
-- CREATE INDEX IF NOT EXISTS idx_grimpo_states_user_id ON grimpo_states(user_id);

-- Graph state table
CREATE TABLE IF NOT EXISTS graph_states (
  id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  nodes JSONB NOT NULL DEFAULT '[]'::jsonb,
  edges JSONB NOT NULL DEFAULT '[]'::jsonb,
  mode_setting VARCHAR(20) NOT NULL DEFAULT 'auto',
  viewport JSONB,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  PRIMARY KEY (id, user_id)
);

-- Abyssal Garden state table
CREATE TABLE IF NOT EXISTS abyssal_garden_states (
  id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  swallowed_count INTEGER NOT NULL DEFAULT 0,
  abyssal_currency INTEGER NOT NULL DEFAULT 0,
  inventory JSONB NOT NULL DEFAULT '{"abyssal-rock":0,"seaweed":0,"bubble":0,"small-coral":0,"shrimp":0,"plankton":0,"starfish":0,"sea-flowers":0,"neon-sandcastle":0,"big-coral":0,"dumbo-octopus":0,"crystalline-spire":0,"turtle":0,"shellfish":0,"michelangelos-david":0,"roman-ruin":0,"sirens-tail":0,"whales":0,"lost-bounty":0}'::jsonb,
  garden_layout JSONB NOT NULL DEFAULT '[]'::jsonb,
  awarded_tasks JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  PRIMARY KEY (id, user_id)
);

-- Better-Auth tables
-- Users table
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  name VARCHAR(255),
  email VARCHAR(255) NOT NULL UNIQUE,
  email_verified BOOLEAN DEFAULT FALSE,
  image VARCHAR(255),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Sessions table
CREATE TABLE IF NOT EXISTS sessions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token TEXT NOT NULL UNIQUE,
  expires_at TIMESTAMP NOT NULL,
  ip_address VARCHAR(45),
  user_agent VARCHAR(255),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Accounts table (for OAuth providers)
CREATE TABLE IF NOT EXISTS accounts (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  account_id TEXT NOT NULL,
  provider_id TEXT NOT NULL,
  provider_type TEXT NOT NULL,
  access_token TEXT,
  refresh_token TEXT,
  expires_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Verification tokens table (for email verification and password reset)
CREATE TABLE IF NOT EXISTS verification_tokens (
  id TEXT PRIMARY KEY,
  identifier VARCHAR(255) NOT NULL,
  token TEXT NOT NULL UNIQUE,
  expires_at TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- PDF Summaries table
-- Stores a persisted PDF reference + the LLM-generated summary for a given user + node.
CREATE TABLE IF NOT EXISTS pdf_summaries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  node_id TEXT NOT NULL,
  pdf_blob_url TEXT NOT NULL,
  pdf_filename TEXT,
  summary_markdown TEXT NOT NULL,
  summary_json JSONB,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, node_id)
);

-- Indexes for better performance
CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_token ON sessions(token);
CREATE INDEX IF NOT EXISTS idx_sessions_expires_at ON sessions(expires_at);
CREATE INDEX IF NOT EXISTS idx_accounts_user_id ON accounts(user_id);
CREATE INDEX IF NOT EXISTS idx_accounts_provider_id ON accounts(provider_id);
CREATE INDEX IF NOT EXISTS idx_verification_tokens_identifier ON verification_tokens(identifier);
CREATE INDEX IF NOT EXISTS idx_verification_tokens_token ON verification_tokens(token);
CREATE INDEX IF NOT EXISTS idx_verification_tokens_expires_at ON verification_tokens(expires_at);
CREATE INDEX IF NOT EXISTS idx_grimpo_states_user_id ON grimpo_states(user_id);
CREATE INDEX IF NOT EXISTS idx_projects_user_id ON projects(user_id);
CREATE INDEX IF NOT EXISTS idx_projects_updated_at ON projects(updated_at);
CREATE INDEX IF NOT EXISTS idx_pdf_summaries_user_id ON pdf_summaries(user_id);

-- Bookshelves table (must be created before highlights due to foreign key)
CREATE TABLE IF NOT EXISTS bookshelves (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  color TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_bookshelves_user_id ON bookshelves(user_id);

-- PDF Highlights / Snippets table
-- This table stores both PDF highlights and manual notes (snippets)
CREATE TABLE IF NOT EXISTS highlights (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  node_id TEXT NOT NULL,
  content TEXT NOT NULL,
  comment TEXT,
  position JSONB,
  category_id UUID REFERENCES bookshelves(id) ON DELETE SET NULL,
  title TEXT,
  type TEXT NOT NULL DEFAULT 'highlight',
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Indexes for highlights
CREATE INDEX IF NOT EXISTS idx_highlights_user_id ON highlights(user_id);
CREATE INDEX IF NOT EXISTS idx_highlights_node_id ON highlights(node_id);
CREATE INDEX IF NOT EXISTS idx_highlights_category_id ON highlights(category_id);
CREATE INDEX IF NOT EXISTS idx_highlights_type ON highlights(type);

-- Note: We don't enforce a unique constraint here to allow:
-- 1. Manual notes (snippets) to be duplicated (same content in different categories)
-- 2. Users to save the same highlight multiple times if needed
-- Application-level deduplication can be added if needed

-- User AI Preferences table
-- Stores AI provider and model preferences per user per agent (Dumbo/Dumby)
CREATE TABLE IF NOT EXISTS user_ai_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  agent_type TEXT NOT NULL CHECK (agent_type IN ('dumbo', 'dumby')),
  provider TEXT NOT NULL CHECK (provider IN ('openai', 'google', 'anthropic', 'openrouter')),
  model TEXT NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, agent_type)
);

CREATE INDEX IF NOT EXISTS idx_user_ai_preferences_user_id ON user_ai_preferences(user_id);

-- Ideas / Thought Pool table
-- Quick capture area for dumping ideas before converting to tactical nodes
CREATE TABLE IF NOT EXISTS ideas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  image_url TEXT,
  priority INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'processed', 'archived')),
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ideas_user_id ON ideas(user_id);
CREATE INDEX IF NOT EXISTS idx_ideas_project_id ON ideas(project_id);
CREATE INDEX IF NOT EXISTS idx_ideas_status ON ideas(status);

-- Grimpy Workshop Sessions table
-- Stores interview context and generated plans from Grimpy workshops
CREATE TABLE IF NOT EXISTS workshop_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  idea_ids JSONB NOT NULL DEFAULT '[]'::jsonb,
  timeline_type TEXT NOT NULL CHECK (timeline_type IN ('daily', 'weekly', 'monthly', 'quarterly', 'phases')),
  interview_context JSONB,
  generated_plan JSONB,
  status TEXT NOT NULL DEFAULT 'in_progress' CHECK (status IN ('in_progress', 'completed', 'cancelled')),
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_workshop_sessions_user_id ON workshop_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_workshop_sessions_project_id ON workshop_sessions(project_id);

