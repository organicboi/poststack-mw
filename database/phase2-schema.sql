-- Phase 2 Database Schema for Core Modules
-- This script creates the necessary tables for user management, billing, and posts

-- Enhance existing users table
ALTER TABLE IF EXISTS users ADD COLUMN IF NOT EXISTS plan_tier TEXT DEFAULT 'FREE';
ALTER TABLE IF EXISTS users ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;
ALTER TABLE IF EXISTS users ADD COLUMN IF NOT EXISTS password_hash TEXT;
ALTER TABLE IF EXISTS users ADD COLUMN IF NOT EXISTS avatar TEXT;
ALTER TABLE IF EXISTS users ADD COLUMN IF NOT EXISTS bio TEXT;
ALTER TABLE IF EXISTS users ADD COLUMN IF NOT EXISTS display_name TEXT;
ALTER TABLE IF EXISTS users ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- Posts table
CREATE TABLE IF NOT EXISTS posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE,
  postiz_post_id TEXT,
  title TEXT,
  content TEXT,
  media_urls TEXT[],
  status TEXT DEFAULT 'DRAFT',
  scheduled_for TIMESTAMPTZ,
  published_at TIMESTAMPTZ,
  settings JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Social accounts table
CREATE TABLE IF NOT EXISTS social_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE,
  platform TEXT NOT NULL,
  postiz_integration_id TEXT NOT NULL,
  platform_user_id TEXT,
  platform_username TEXT,
  display_name TEXT,
  avatar TEXT,
  is_active BOOLEAN DEFAULT true,
  connection_metadata JSONB DEFAULT '{}',
  connected_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, workspace_id, platform)
);

-- Post platforms junction table
CREATE TABLE IF NOT EXISTS post_platforms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID REFERENCES posts(id) ON DELETE CASCADE,
  social_account_id UUID REFERENCES social_accounts(id) ON DELETE CASCADE,
  status TEXT DEFAULT 'PENDING',
  postiz_post_id TEXT,
  platform_post_id TEXT,
  error_message TEXT,
  published_at TIMESTAMPTZ,
  UNIQUE(post_id, social_account_id)
);

-- Billing info table
CREATE TABLE IF NOT EXISTS billing_info (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  dodo_billing_customer_id TEXT,
  current_plan TEXT DEFAULT 'FREE',
  billing_interval TEXT,
  subscription_status TEXT,
  current_period_start TIMESTAMPTZ,
  current_period_end TIMESTAMPTZ,
  cancel_at_period_end BOOLEAN DEFAULT false,
  posts_used_this_month INTEGER DEFAULT 0,
  workspaces_used INTEGER DEFAULT 0,
  social_accounts_used INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Row Level Security policies
ALTER TABLE IF EXISTS posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS social_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS post_platforms ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS billing_info ENABLE ROW LEVEL SECURITY;

-- Policies for posts
CREATE POLICY "Users can manage their own posts" ON posts
FOR ALL USING (auth.uid() = user_id);

-- Policies for social accounts
CREATE POLICY "Users can manage their own social accounts" ON social_accounts
FOR ALL USING (auth.uid() = user_id);

-- Policies for billing info
CREATE POLICY "Users can access their own billing info" ON billing_info
FOR ALL USING (auth.uid() = user_id);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_posts_user_id ON posts(user_id);
CREATE INDEX IF NOT EXISTS idx_posts_workspace_id ON posts(workspace_id);
CREATE INDEX IF NOT EXISTS idx_posts_status ON posts(status);
CREATE INDEX IF NOT EXISTS idx_social_accounts_user_workspace ON social_accounts(user_id, workspace_id);
CREATE INDEX IF NOT EXISTS idx_social_accounts_platform ON social_accounts(platform);