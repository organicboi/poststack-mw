-- ================================================
-- ENHANCED DATABASE MIGRATION SCRIPT
-- Merges new features with existing schema
-- ================================================

-- ================================================
-- 1. ENHANCE EXISTING USERS TABLE
-- ================================================

-- Add new columns to existing users table (only if they don't exist)
DO $$ 
BEGIN
    -- Add plan_tier column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='plan_tier') THEN
        ALTER TABLE public.users ADD COLUMN plan_tier TEXT DEFAULT 'FREE';
    END IF;
    
    -- Add password_hash column  
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='password_hash') THEN
        ALTER TABLE public.users ADD COLUMN password_hash TEXT;
    END IF;
    
    -- Add first_name column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='first_name') THEN
        ALTER TABLE public.users ADD COLUMN first_name TEXT;
    END IF;
    
    -- Add last_name column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='last_name') THEN
        ALTER TABLE public.users ADD COLUMN last_name TEXT;
    END IF;
    
    -- Rename avatar_url to avatar if it exists
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='avatar_url') AND
       NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='avatar') THEN
        ALTER TABLE public.users RENAME COLUMN avatar_url TO avatar;
    END IF;
END $$;

-- Add check constraint for plan_tier
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'users_plan_tier_check') THEN
        ALTER TABLE public.users ADD CONSTRAINT users_plan_tier_check 
        CHECK (plan_tier IN ('FREE', 'STARTER', 'PROFESSIONAL', 'ENTERPRISE'));
    END IF;
END $$;

-- ================================================
-- 2. ENHANCE EXISTING SOCIAL ACCOUNTS TABLE
-- ================================================

-- Backup existing social_accounts data if it exists
CREATE TABLE IF NOT EXISTS social_accounts_backup AS 
SELECT * FROM public.social_accounts WHERE false; -- Empty table with same structure

DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'social_accounts' AND table_schema = 'public') THEN
        INSERT INTO social_accounts_backup SELECT * FROM public.social_accounts;
    END IF;
END $$;

-- Add new columns to existing social_accounts table
DO $$ 
BEGIN
    -- Add workspace_id column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='social_accounts' AND column_name='workspace_id') THEN
        ALTER TABLE public.social_accounts ADD COLUMN workspace_id UUID REFERENCES public.workspaces(id) ON DELETE SET NULL;
    END IF;
    
    -- Add postiz_integration_id column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='social_accounts' AND column_name='postiz_integration_id') THEN
        ALTER TABLE public.social_accounts ADD COLUMN postiz_integration_id TEXT;
    END IF;
    
    -- Add platform column (rename provider if needed)
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='social_accounts' AND column_name='provider') AND
       NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='social_accounts' AND column_name='platform') THEN
        ALTER TABLE public.social_accounts RENAME COLUMN provider TO platform;
    ELSIF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='social_accounts' AND column_name='platform') THEN
        ALTER TABLE public.social_accounts ADD COLUMN platform TEXT;
    END IF;
    
    -- Add platform_user_id column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='social_accounts' AND column_name='platform_user_id') THEN
        ALTER TABLE public.social_accounts ADD COLUMN platform_user_id TEXT;
    END IF;
    
    -- Add platform_username column (rename account_name if needed)
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='social_accounts' AND column_name='account_name') AND
       NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='social_accounts' AND column_name='platform_username') THEN
        ALTER TABLE public.social_accounts RENAME COLUMN account_name TO platform_username;
    ELSIF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='social_accounts' AND column_name='platform_username') THEN
        ALTER TABLE public.social_accounts ADD COLUMN platform_username TEXT;
    END IF;
    
    -- Add display_name column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='social_accounts' AND column_name='display_name') THEN
        ALTER TABLE public.social_accounts ADD COLUMN display_name TEXT;
    END IF;
    
    -- Add avatar column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='social_accounts' AND column_name='avatar') THEN
        ALTER TABLE public.social_accounts ADD COLUMN avatar TEXT;
    END IF;
    
    -- Add follower_count column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='social_accounts' AND column_name='follower_count') THEN
        ALTER TABLE public.social_accounts ADD COLUMN follower_count INTEGER DEFAULT 0;
    END IF;
    
    -- Add last_sync_at column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='social_accounts' AND column_name='last_sync_at') THEN
        ALTER TABLE public.social_accounts ADD COLUMN last_sync_at TIMESTAMPTZ;
    END IF;
    
    -- Add connection_metadata column (rename metadata if needed)
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='social_accounts' AND column_name='metadata') AND
       NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='social_accounts' AND column_name='connection_metadata') THEN
        ALTER TABLE public.social_accounts RENAME COLUMN metadata TO connection_metadata;
    ELSIF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='social_accounts' AND column_name='connection_metadata') THEN
        ALTER TABLE public.social_accounts ADD COLUMN connection_metadata JSONB DEFAULT '{}';
    END IF;
    
    -- Add connected_at column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='social_accounts' AND column_name='connected_at') THEN
        ALTER TABLE public.social_accounts ADD COLUMN connected_at TIMESTAMPTZ DEFAULT NOW();
    END IF;
END $$;

-- Update platform constraint to include all supported platforms
DO $$
BEGIN
    -- Drop existing constraint if it exists
    IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'social_accounts_platform_check') THEN
        ALTER TABLE public.social_accounts DROP CONSTRAINT social_accounts_platform_check;
    END IF;
    
    -- Add new constraint with all platforms
    ALTER TABLE public.social_accounts ADD CONSTRAINT social_accounts_platform_check 
    CHECK (platform IN (
        'x', 'twitter', 'linkedin', 'linkedin-page', 'reddit', 'instagram', 'instagram-standalone',
        'facebook', 'threads', 'youtube', 'tiktok', 'pinterest', 'dribbble',
        'discord', 'slack', 'mastodon', 'bluesky', 'lemmy', 'farcaster',
        'telegram', 'nostr', 'vk'
    ));
END $$;

-- Drop old unique constraint and add new one
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'social_accounts_provider_unique') THEN
        ALTER TABLE public.social_accounts DROP CONSTRAINT social_accounts_provider_unique;
    END IF;
    
    -- Add new unique constraint
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'social_accounts_user_workspace_platform_unique') THEN
        ALTER TABLE public.social_accounts ADD CONSTRAINT social_accounts_user_workspace_platform_unique 
        UNIQUE(user_id, workspace_id, platform);
    END IF;
END $$;

-- ================================================
-- 3. ENHANCE EXISTING WORKSPACE_SOCIAL_ACCOUNTS TABLE
-- ================================================

-- Add new columns to existing workspace_social_accounts table
DO $$ 
BEGIN
    -- Add is_active column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='workspace_social_accounts' AND column_name='is_active') THEN
        ALTER TABLE public.workspace_social_accounts ADD COLUMN is_active BOOLEAN DEFAULT true;
    END IF;
    
    -- Add linked_by column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='workspace_social_accounts' AND column_name='linked_by') THEN
        ALTER TABLE public.workspace_social_accounts ADD COLUMN linked_by UUID REFERENCES auth.users(id);
    END IF;
    
    -- Add linked_at column (rename created_at if needed)
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='workspace_social_accounts' AND column_name='created_at') AND
       NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='workspace_social_accounts' AND column_name='linked_at') THEN
        ALTER TABLE public.workspace_social_accounts RENAME COLUMN created_at TO linked_at;
    ELSIF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='workspace_social_accounts' AND column_name='linked_at') THEN
        ALTER TABLE public.workspace_social_accounts ADD COLUMN linked_at TIMESTAMPTZ DEFAULT NOW();
    END IF;
END $$;

-- ================================================
-- 4. CREATE NEW TABLES
-- ================================================

-- Create posts table
CREATE TABLE IF NOT EXISTS public.posts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    workspace_id UUID REFERENCES public.workspaces(id) ON DELETE SET NULL,
    postiz_post_id TEXT,
    title TEXT,
    content TEXT NOT NULL,
    media_urls TEXT[] DEFAULT '{}',
    status TEXT DEFAULT 'DRAFT' CHECK (status IN ('DRAFT', 'SCHEDULED', 'PUBLISHING', 'PUBLISHED', 'FAILED', 'CANCELLED')),
    scheduled_for TIMESTAMPTZ,
    published_at TIMESTAMPTZ,
    settings JSONB DEFAULT '{}',
    error_message TEXT,
    postiz_response JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create post_platforms junction table
CREATE TABLE IF NOT EXISTS public.post_platforms (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    post_id UUID NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
    social_account_id UUID NOT NULL REFERENCES public.social_accounts(id) ON DELETE CASCADE,
    status TEXT DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'SCHEDULED', 'PUBLISHING', 'PUBLISHED', 'FAILED', 'CANCELLED')),
    postiz_post_id TEXT,
    platform_post_id TEXT,
    error_message TEXT,
    published_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    CONSTRAINT post_platforms_unique UNIQUE(post_id, social_account_id)
);

-- Create billing_info table
CREATE TABLE IF NOT EXISTS public.billing_info (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID UNIQUE NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    dodo_billing_customer_id TEXT,
    current_plan TEXT DEFAULT 'FREE' CHECK (current_plan IN ('FREE', 'STARTER', 'PROFESSIONAL', 'ENTERPRISE')),
    billing_interval TEXT CHECK (billing_interval IN ('monthly', 'yearly')),
    subscription_status TEXT CHECK (subscription_status IN ('active', 'cancelled', 'past_due', 'trialing', 'incomplete')),
    current_period_start TIMESTAMPTZ,
    current_period_end TIMESTAMPTZ,
    cancel_at_period_end BOOLEAN DEFAULT false,
    
    -- Usage tracking
    posts_used_this_month INTEGER DEFAULT 0,
    teams_used INTEGER DEFAULT 0,
    social_accounts_used INTEGER DEFAULT 0,
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create webhook_logs table
CREATE TABLE IF NOT EXISTS public.webhook_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    webhook_type TEXT NOT NULL,
    source TEXT DEFAULT 'postiz',
    postiz_post_id TEXT,
    myapp1_post_id UUID REFERENCES public.posts(id) ON DELETE SET NULL,
    payload JSONB NOT NULL,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'processed', 'failed', 'ignored')),
    processed_at TIMESTAMPTZ,
    error_message TEXT,
    retry_count INTEGER DEFAULT 0,
    received_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create plan_features table
CREATE TABLE IF NOT EXISTS public.plan_features (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    feature_id TEXT NOT NULL UNIQUE,
    feature_name TEXT NOT NULL,
    description TEXT,
    category TEXT DEFAULT 'general',
    is_popular BOOLEAN DEFAULT false,
    available_in_plans TEXT[] DEFAULT '{}',
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ================================================
-- 5. CREATE/UPDATE INDEXES
-- ================================================

-- Users table indexes (new)
CREATE INDEX IF NOT EXISTS idx_users_plan_tier ON public.users(plan_tier);

-- Posts indexes
CREATE INDEX IF NOT EXISTS idx_posts_user_id ON public.posts(user_id);
CREATE INDEX IF NOT EXISTS idx_posts_workspace_id ON public.posts(workspace_id);
CREATE INDEX IF NOT EXISTS idx_posts_status ON public.posts(status);
CREATE INDEX IF NOT EXISTS idx_posts_scheduled_for ON public.posts(scheduled_for) WHERE scheduled_for IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_posts_created_at ON public.posts(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_posts_postiz_post_id ON public.posts(postiz_post_id) WHERE postiz_post_id IS NOT NULL;

-- Enhanced social accounts indexes
CREATE INDEX IF NOT EXISTS idx_social_accounts_user_workspace ON public.social_accounts(user_id, workspace_id);
CREATE INDEX IF NOT EXISTS idx_social_accounts_platform ON public.social_accounts(platform);
CREATE INDEX IF NOT EXISTS idx_social_accounts_postiz_id ON public.social_accounts(postiz_integration_id) WHERE postiz_integration_id IS NOT NULL;

-- Post platforms indexes
CREATE INDEX IF NOT EXISTS idx_post_platforms_post_id ON public.post_platforms(post_id);
CREATE INDEX IF NOT EXISTS idx_post_platforms_social_account_id ON public.post_platforms(social_account_id);
CREATE INDEX IF NOT EXISTS idx_post_platforms_status ON public.post_platforms(status);

-- Billing info indexes
CREATE INDEX IF NOT EXISTS idx_billing_info_user_id ON public.billing_info(user_id);
CREATE INDEX IF NOT EXISTS idx_billing_info_plan ON public.billing_info(current_plan);
CREATE INDEX IF NOT EXISTS idx_billing_info_subscription_status ON public.billing_info(subscription_status);

-- Webhook logs indexes
CREATE INDEX IF NOT EXISTS idx_webhook_logs_type ON public.webhook_logs(webhook_type);
CREATE INDEX IF NOT EXISTS idx_webhook_logs_status ON public.webhook_logs(status);
CREATE INDEX IF NOT EXISTS idx_webhook_logs_received_at ON public.webhook_logs(received_at DESC);
CREATE INDEX IF NOT EXISTS idx_webhook_logs_postiz_post_id ON public.webhook_logs(postiz_post_id) WHERE postiz_post_id IS NOT NULL;

-- Enhanced workspace social accounts indexes
CREATE INDEX IF NOT EXISTS idx_workspace_social_accounts_active ON public.workspace_social_accounts(is_active);

-- ================================================
-- 6. CREATE ALTERNATIVE UPDATE FUNCTION (to avoid conflicts)
-- ================================================

-- Create alternative function name to avoid conflicts
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply updated_at triggers to new tables
DO $$ 
DECLARE
    table_name TEXT;
BEGIN
    FOR table_name IN SELECT unnest(ARRAY['posts', 'billing_info', 'plan_features']) 
    LOOP
        EXECUTE format('
            DROP TRIGGER IF EXISTS trigger_update_updated_at ON %I;
            CREATE TRIGGER trigger_update_updated_at
                BEFORE UPDATE ON %I
                FOR EACH ROW
                EXECUTE FUNCTION update_updated_at_column();
        ', table_name, table_name);
    END LOOP;
END $$;

-- Apply to enhanced social_accounts table
DROP TRIGGER IF EXISTS trigger_update_updated_at ON public.social_accounts;
CREATE TRIGGER trigger_update_updated_at
    BEFORE UPDATE ON public.social_accounts
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ================================================
-- 7. ENABLE ROW LEVEL SECURITY
-- ================================================

-- Enable RLS on new tables
ALTER TABLE public.posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.post_platforms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.billing_info ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.webhook_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.plan_features ENABLE ROW LEVEL SECURITY;

-- ================================================
-- 8. CREATE RLS POLICIES
-- ================================================

-- Policies for posts
DROP POLICY IF EXISTS "Users can manage their own posts" ON public.posts;
CREATE POLICY "Users can manage their own posts" ON public.posts
    FOR ALL USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Workspace members can view posts" ON public.posts;
CREATE POLICY "Workspace members can view posts" ON public.posts
    FOR SELECT USING (
        auth.uid() = user_id OR 
        (workspace_id IS NOT NULL AND EXISTS (
            SELECT 1 FROM public.workspace_memberships wm 
            WHERE wm.workspace_id = posts.workspace_id 
            AND wm.user_id = auth.uid() 
            AND wm.is_active = true
        ))
    );

-- Enhanced policies for social accounts
DROP POLICY IF EXISTS "social_accounts_policy" ON public.social_accounts;
CREATE POLICY "enhanced_social_accounts_policy" ON public.social_accounts
    FOR ALL USING (
        auth.uid() = user_id OR 
        (workspace_id IS NOT NULL AND EXISTS (
            SELECT 1 FROM public.workspace_memberships wm 
            WHERE wm.workspace_id = social_accounts.workspace_id 
            AND wm.user_id = auth.uid() 
            AND wm.is_active = true
        ))
    );

-- Policies for post platforms
DROP POLICY IF EXISTS "Users can access post platforms for their posts" ON public.post_platforms;
CREATE POLICY "Users can access post platforms for their posts" ON public.post_platforms
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.posts p 
            WHERE p.id = post_platforms.post_id 
            AND p.user_id = auth.uid()
        )
    );

-- Policies for billing info
DROP POLICY IF EXISTS "Users can access their own billing info" ON public.billing_info;
CREATE POLICY "Users can access their own billing info" ON public.billing_info
    FOR ALL USING (auth.uid() = user_id);

-- Policies for webhook logs (service role only)
DROP POLICY IF EXISTS "Service role can manage webhook logs" ON public.webhook_logs;
CREATE POLICY "Service role can manage webhook logs" ON public.webhook_logs
    FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

-- Enhanced policies for workspace social accounts
DROP POLICY IF EXISTS "workspace_social_accounts_policy" ON public.workspace_social_accounts;
CREATE POLICY "enhanced_workspace_social_accounts_policy" ON public.workspace_social_accounts
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.workspace_memberships wm 
            WHERE wm.workspace_id = workspace_social_accounts.workspace_id 
            AND wm.user_id = auth.uid() 
            AND wm.is_active = true
        )
    );

-- Policies for plan features (read-only for authenticated users)
DROP POLICY IF EXISTS "Authenticated users can read plan features" ON public.plan_features;
CREATE POLICY "Authenticated users can read plan features" ON public.plan_features
    FOR SELECT USING (auth.role() = 'authenticated');

-- ================================================
-- 9. SEED PLAN FEATURES DATA
-- ================================================

INSERT INTO public.plan_features (feature_id, feature_name, description, category, is_popular, available_in_plans) VALUES
-- Core Features
('basic_posting', 'Basic Social Media Posting', 'Create and publish posts to connected social media accounts', 'posting', true, '{"FREE","STARTER","PROFESSIONAL","ENTERPRISE"}'),
('post_scheduling', 'Post Scheduling', 'Schedule posts to be published at specific times', 'posting', true, '{"STARTER","PROFESSIONAL","ENTERPRISE"}'),
('bulk_posting', 'Bulk Post Creation', 'Create and schedule multiple posts at once', 'posting', false, '{"PROFESSIONAL","ENTERPRISE"}'),
('post_templates', 'Post Templates', 'Use pre-designed templates for consistent branding', 'posting', false, '{"PROFESSIONAL","ENTERPRISE"}'),

-- Social Account Features
('social_accounts_basic', 'Connect Social Accounts', 'Connect and manage social media accounts', 'social', true, '{"FREE","STARTER","PROFESSIONAL","ENTERPRISE"}'),
('unlimited_accounts', 'Unlimited Social Accounts', 'Connect unlimited social media accounts', 'social', true, '{"ENTERPRISE"}'),
('advanced_oauth', 'Advanced OAuth Management', 'Advanced social account connection management', 'social', false, '{"PROFESSIONAL","ENTERPRISE"}'),

-- Team Features
('team_workspaces', 'Team Workspaces', 'Create and manage team workspaces', 'collaboration', true, '{"STARTER","PROFESSIONAL","ENTERPRISE"}'),
('unlimited_workspaces', 'Unlimited Workspaces', 'Create unlimited team workspaces', 'collaboration', false, '{"ENTERPRISE"}'),
('team_roles', 'Advanced Team Roles', 'Granular permission management for team members', 'collaboration', false, '{"PROFESSIONAL","ENTERPRISE"}'),
('workspace_analytics', 'Workspace Analytics', 'Analytics and insights for workspace performance', 'analytics', false, '{"PROFESSIONAL","ENTERPRISE"}'),

-- Analytics Features
('basic_analytics', 'Basic Analytics', 'View basic post performance metrics', 'analytics', true, '{"STARTER","PROFESSIONAL","ENTERPRISE"}'),
('advanced_analytics', 'Advanced Analytics', 'Detailed analytics with custom date ranges and comparisons', 'analytics', true, '{"PROFESSIONAL","ENTERPRISE"}'),
('custom_reports', 'Custom Reports', 'Create custom analytics reports and export data', 'analytics', false, '{"ENTERPRISE"}'),

-- Integration Features
('postiz_integration', 'Postiz Integration', 'Advanced integration with Postiz platform', 'integration', true, '{"STARTER","PROFESSIONAL","ENTERPRISE"}'),
('webhook_support', 'Webhook Support', 'Receive real-time updates via webhooks', 'integration', false, '{"PROFESSIONAL","ENTERPRISE"}'),
('api_access', 'API Access', 'Programmatic access to your data via REST API', 'integration', false, '{"PROFESSIONAL","ENTERPRISE"}'),
('custom_integrations', 'Custom Integrations', 'Build custom integrations with third-party services', 'integration', false, '{"ENTERPRISE"}'),

-- Support Features
('email_support', 'Email Support', 'Get help via email support', 'support', false, '{"STARTER","PROFESSIONAL","ENTERPRISE"}'),
('priority_support', 'Priority Support', 'Get priority customer support', 'support', true, '{"PROFESSIONAL","ENTERPRISE"}'),
('dedicated_support', 'Dedicated Support Manager', 'Personal support manager for your account', 'support', false, '{"ENTERPRISE"}'),

-- Billing Features
('usage_tracking', 'Usage Tracking', 'Track your usage against plan limits', 'billing', false, '{"FREE","STARTER","PROFESSIONAL","ENTERPRISE"}'),
('usage_alerts', 'Usage Alerts', 'Get notified when approaching plan limits', 'billing', false, '{"STARTER","PROFESSIONAL","ENTERPRISE"}'),
('billing_management', 'Advanced Billing', 'Manage billing, invoices, and payment methods', 'billing', false, '{"STARTER","PROFESSIONAL","ENTERPRISE"}')

ON CONFLICT (feature_id) DO UPDATE SET
    feature_name = EXCLUDED.feature_name,
    description = EXCLUDED.description,
    category = EXCLUDED.category,
    is_popular = EXCLUDED.is_popular,
    available_in_plans = EXCLUDED.available_in_plans,
    updated_at = NOW();

-- ================================================
-- 10. CREATE USEFUL VIEWS
-- ================================================

-- Create a view for user posts with social account information
CREATE OR REPLACE VIEW public.user_posts_with_social_accounts AS
SELECT 
    p.*,
    COALESCE(
        json_agg(
            json_build_object(
                'id', sa.id,
                'platform', sa.platform,
                'platform_username', sa.platform_username,
                'display_name', sa.display_name,
                'avatar', sa.avatar,
                'status', pp.status,
                'published_at', pp.published_at,
                'error_message', pp.error_message
            )
        ) FILTER (WHERE sa.id IS NOT NULL), 
        '[]'::json
    ) as social_accounts
FROM public.posts p
LEFT JOIN public.post_platforms pp ON p.id = pp.post_id
LEFT JOIN public.social_accounts sa ON pp.social_account_id = sa.id
GROUP BY p.id;

-- Update existing workspaces view to include social account counts
DROP VIEW IF EXISTS public.workspaces_with_counts;
CREATE OR REPLACE VIEW public.workspaces_with_counts AS
SELECT 
    w.*,
    COALESCE(member_count.count, 0) as member_count,
    COALESCE(social_account_count.count, 0) as social_accounts_count
FROM public.workspaces w
LEFT JOIN (
    SELECT workspace_id, COUNT(*) as count
    FROM public.workspace_memberships 
    WHERE is_active = true
    GROUP BY workspace_id
) member_count ON w.id = member_count.workspace_id
LEFT JOIN (
    SELECT wsa.workspace_id, COUNT(*) as count
    FROM public.workspace_social_accounts wsa
    JOIN public.social_accounts sa ON wsa.social_account_id = sa.id
    WHERE wsa.is_active = true AND sa.is_active = true
    GROUP BY wsa.workspace_id
) social_account_count ON w.id = social_account_count.workspace_id;

-- ================================================
-- 11. GRANT PERMISSIONS
-- ================================================

-- Grant permissions to authenticated users
GRANT SELECT ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT INSERT, UPDATE ON public.posts, public.post_platforms, public.billing_info TO authenticated;
GRANT DELETE ON public.posts TO authenticated;

-- Grant full permissions to service role
GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;

-- ================================================
-- 12. DATA MIGRATION FOR EXISTING SOCIAL ACCOUNTS
-- ================================================

-- Migrate existing social account data to work with workspaces
DO $$
DECLARE
    account_record RECORD;
    user_default_workspace_id UUID;
BEGIN
    -- For each existing social account without workspace_id, assign to user's default workspace
    FOR account_record IN 
        SELECT sa.id, sa.user_id 
        FROM public.social_accounts sa 
        WHERE sa.workspace_id IS NULL
    LOOP
        -- Get user's default workspace
        SELECT w.id INTO user_default_workspace_id
        FROM public.workspaces w
        JOIN public.workspace_memberships wm ON w.id = wm.workspace_id
        WHERE wm.user_id = account_record.user_id 
        AND w.is_default = true 
        AND wm.role = 'owner'
        LIMIT 1;
        
        -- Update social account with workspace_id
        IF user_default_workspace_id IS NOT NULL THEN
            UPDATE public.social_accounts 
            SET workspace_id = user_default_workspace_id,
                updated_at = NOW()
            WHERE id = account_record.id;
            
            -- Ensure workspace_social_accounts junction record exists
            INSERT INTO public.workspace_social_accounts (workspace_id, social_account_id, linked_by, is_active)
            VALUES (user_default_workspace_id, account_record.id, account_record.user_id, true)
            ON CONFLICT (workspace_id, social_account_id) DO NOTHING;
        END IF;
    END LOOP;
END $$;

-- ================================================
-- 13. COMPLETION MESSAGE
-- ================================================

DO $$ 
DECLARE
    users_count INTEGER;
    workspaces_count INTEGER;
    social_accounts_count INTEGER;
    posts_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO users_count FROM public.users;
    SELECT COUNT(*) INTO workspaces_count FROM public.workspaces;
    SELECT COUNT(*) INTO social_accounts_count FROM public.social_accounts;
    SELECT COUNT(*) INTO posts_count FROM public.posts;
    
    RAISE NOTICE '========================================';
    RAISE NOTICE 'ENHANCED DATABASE MIGRATION COMPLETED!';
    RAISE NOTICE '========================================';
    RAISE NOTICE 'Database Statistics:';
    RAISE NOTICE '- Users: %', users_count;
    RAISE NOTICE '- Workspaces: %', workspaces_count;
    RAISE NOTICE '- Social Accounts: %', social_accounts_count;
    RAISE NOTICE '- Posts: %', posts_count;
    RAISE NOTICE '';
    RAISE NOTICE 'Enhanced Features:';
    RAISE NOTICE '✓ Users table enhanced with plan_tier, avatar, first_name, last_name';
    RAISE NOTICE '✓ Social accounts enhanced for Postiz integration';
    RAISE NOTICE '✓ Posts table created for content management';
    RAISE NOTICE '✓ Billing info table created for subscription management';
    RAISE NOTICE '✓ Webhook logs table created for integration tracking';
    RAISE NOTICE '✓ Plan features seeded with comprehensive feature set';
    RAISE NOTICE '✓ RLS policies updated for enhanced security';
    RAISE NOTICE '✓ Performance indexes added';
    RAISE NOTICE '✓ Existing data migrated successfully';
    RAISE NOTICE '';
    RAISE NOTICE 'Next Steps:';
    RAISE NOTICE '1. Update application code to use enhanced schema';
    RAISE NOTICE '2. Test new functionality with existing data';
    RAISE NOTICE '3. Configure Postiz webhook endpoints';
    RAISE NOTICE '4. Set up billing integration';
    RAISE NOTICE '========================================';
END $$;