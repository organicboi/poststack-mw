import { createClient, SupabaseClient } from '@supabase/supabase-js';
import {
  EnhancedUser,
  EnhancedWorkspace,
  Post,
  SocialAccount,
  BillingInfo,
  PostPlatform,
  WebhookLog,
  WorkspaceMembership,
  PlanFeature,
  QueryParams,
  PaginatedResponse,
} from '../types/enhanced.types';

/**
 * Enhanced Supabase Service with comprehensive database operations
 * Provides abstraction layer for all database interactions
 */
export class SupabaseService {
  private client: SupabaseClient;
  private adminClient: SupabaseClient;

  constructor() {
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_ANON_KEY;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Missing required Supabase environment variables');
    }

    this.client = createClient(supabaseUrl, supabaseKey);

    if (supabaseServiceKey) {
      this.adminClient = createClient(supabaseUrl, supabaseServiceKey);
    } else {
      this.adminClient = this.client;
    }
  }

  // =============================================================================
  // CLIENT ACCESS METHODS
  // =============================================================================

  /**
   * Get the standard Supabase client (with RLS)
   */
  getClient(): SupabaseClient {
    return this.client;
  }

  /**
   * Get the admin Supabase client (bypasses RLS)
   */
  getAdminClient(): SupabaseClient {
    return this.adminClient;
  }

  /**
   * Set user session for RLS context
   */
  async setUserSession(accessToken: string): Promise<void> {
    const { error } = await this.client.auth.setSession({
      access_token: accessToken,
      refresh_token: '',
    });
    if (error) throw error;
  }

  // =============================================================================
  // USER MANAGEMENT
  // =============================================================================

  /**
   * Get user by ID with enhanced data
   */
  async getUser(userId: string): Promise<EnhancedUser | null> {
    const { data, error } = await this.client
      .from('users')
      .select('*')
      .eq('id', userId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null; // Not found
      throw error;
    }

    return this.transformUser(data);
  }

  /**
   * Get user by email
   */
  async getUserByEmail(email: string): Promise<EnhancedUser | null> {
    const { data, error } = await this.client
      .from('users')
      .select('*')
      .eq('email', email)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null;
      throw error;
    }

    return this.transformUser(data);
  }

  /**
   * Create a new user
   */
  async createUser(userData: Partial<EnhancedUser>): Promise<EnhancedUser> {
    const { data, error } = await this.adminClient
      .from('users')
      .insert(userData)
      .select()
      .single();

    if (error) throw error;
    return this.transformUser(data);
  }

  /**
   * Update user data
   */
  async updateUser(
    userId: string,
    updates: Partial<EnhancedUser>
  ): Promise<EnhancedUser> {
    const { data, error } = await this.client
      .from('users')
      .update(updates)
      .eq('id', userId)
      .select()
      .single();

    if (error) throw error;
    return this.transformUser(data);
  }

  /**
   * Transform raw user data to EnhancedUser
   */
  private transformUser(data: any): EnhancedUser {
    return {
      ...data,
      created_at: new Date(data.created_at),
      updated_at: new Date(data.updated_at),
      full_name:
        data.first_name && data.last_name
          ? `${data.first_name} ${data.last_name}`
          : undefined,
      display_name: data.first_name || data.email.split('@')[0],
    };
  }

  // =============================================================================
  // WORKSPACE MANAGEMENT
  // =============================================================================

  /**
   * Get workspace by ID with counts
   */
  async getWorkspace(workspaceId: string): Promise<EnhancedWorkspace | null> {
    const { data, error } = await this.client
      .from('workspaces_with_counts')
      .select('*')
      .eq('id', workspaceId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null;
      throw error;
    }

    return this.transformWorkspace(data);
  }

  /**
   * Get user workspaces with pagination
   */
  async getUserWorkspaces(
    userId: string,
    params: QueryParams = {}
  ): Promise<PaginatedResponse<EnhancedWorkspace>> {
    const {
      page = 1,
      limit = 20,
      sort_by = 'created_at',
      sort_order = 'desc',
    } = params;
    const offset = (page - 1) * limit;

    const { data, error, count } = await this.client
      .from('workspaces_with_counts')
      .select('*', { count: 'exact' })
      .eq('created_by', userId)
      .eq('is_active', true)
      .order(sort_by, { ascending: sort_order === 'asc' })
      .range(offset, offset + limit - 1);

    if (error) throw error;

    return {
      data: data.map(this.transformWorkspace),
      meta: {
        page,
        limit,
        total: count || 0,
        total_pages: Math.ceil((count || 0) / limit),
        has_next_page: offset + limit < (count || 0),
        has_prev_page: page > 1,
      },
    };
  }

  /**
   * Create workspace
   */
  async createWorkspace(
    workspaceData: Partial<EnhancedWorkspace>
  ): Promise<EnhancedWorkspace> {
    const { data, error } = await this.client
      .from('workspaces')
      .insert(workspaceData)
      .select()
      .single();

    if (error) throw error;
    return this.transformWorkspace(data);
  }

  /**
   * Update workspace
   */
  async updateWorkspace(
    workspaceId: string,
    updates: Partial<EnhancedWorkspace>
  ): Promise<EnhancedWorkspace> {
    const { data, error } = await this.client
      .from('workspaces')
      .update(updates)
      .eq('id', workspaceId)
      .select()
      .single();

    if (error) throw error;
    return this.transformWorkspace(data);
  }

  /**
   * Transform raw workspace data
   */
  private transformWorkspace(data: any): EnhancedWorkspace {
    return {
      ...data,
      created_at: new Date(data.created_at),
      updated_at: new Date(data.updated_at),
    };
  }

  // =============================================================================
  // POSTS MANAGEMENT
  // =============================================================================

  /**
   * Get post by ID with social accounts
   */
  async getPost(postId: string): Promise<Post | null> {
    const { data, error } = await this.client
      .from('user_posts_with_social_accounts')
      .select('*')
      .eq('id', postId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null;
      throw error;
    }

    return this.transformPost(data);
  }

  /**
   * Get user posts with pagination and filters
   */
  async getUserPosts(
    userId: string,
    params: QueryParams & {
      status?: string;
      workspace_id?: string;
    } = {}
  ): Promise<PaginatedResponse<Post>> {
    const {
      page = 1,
      limit = 20,
      sort_by = 'created_at',
      sort_order = 'desc',
      status,
      workspace_id,
    } = params;
    const offset = (page - 1) * limit;

    let query = this.client
      .from('user_posts_with_social_accounts')
      .select('*', { count: 'exact' })
      .eq('user_id', userId);

    if (status) query = query.eq('status', status);
    if (workspace_id) query = query.eq('workspace_id', workspace_id);

    const { data, error, count } = await query
      .order(sort_by, { ascending: sort_order === 'asc' })
      .range(offset, offset + limit - 1);

    if (error) throw error;

    return {
      data: data.map(this.transformPost),
      meta: {
        page,
        limit,
        total: count || 0,
        total_pages: Math.ceil((count || 0) / limit),
        has_next_page: offset + limit < (count || 0),
        has_prev_page: page > 1,
      },
    };
  }

  /**
   * Create post
   */
  async createPost(postData: Partial<Post>): Promise<Post> {
    const { data, error } = await this.client
      .from('posts')
      .insert(postData)
      .select()
      .single();

    if (error) throw error;
    return this.transformPost(data);
  }

  /**
   * Update post
   */
  async updatePost(postId: string, updates: Partial<Post>): Promise<Post> {
    const { data, error } = await this.client
      .from('posts')
      .update(updates)
      .eq('id', postId)
      .select()
      .single();

    if (error) throw error;
    return this.transformPost(data);
  }

  /**
   * Delete post
   */
  async deletePost(postId: string): Promise<void> {
    const { error } = await this.client.from('posts').delete().eq('id', postId);

    if (error) throw error;
  }

  /**
   * Transform raw post data
   */
  private transformPost(data: any): Post {
    return {
      ...data,
      media_urls: data.media_urls || [],
      settings: data.settings || {},
      postiz_response: data.postiz_response || {},
      created_at: new Date(data.created_at),
      updated_at: new Date(data.updated_at),
      scheduled_for: data.scheduled_for
        ? new Date(data.scheduled_for)
        : undefined,
      published_at: data.published_at ? new Date(data.published_at) : undefined,
      social_accounts: Array.isArray(data.social_accounts)
        ? data.social_accounts
        : [],
    };
  }

  // =============================================================================
  // SOCIAL ACCOUNTS MANAGEMENT
  // =============================================================================

  /**
   * Get user social accounts
   */
  async getUserSocialAccounts(
    userId: string,
    params: QueryParams & {
      workspace_id?: string;
      platform?: string;
      is_active?: boolean;
    } = {}
  ): Promise<PaginatedResponse<SocialAccount>> {
    const { page = 1, limit = 20, workspace_id, platform, is_active } = params;
    const offset = (page - 1) * limit;

    let query = this.client
      .from('social_accounts')
      .select('*', { count: 'exact' })
      .eq('user_id', userId);

    if (workspace_id) query = query.eq('workspace_id', workspace_id);
    if (platform) query = query.eq('platform', platform);
    if (is_active !== undefined) query = query.eq('is_active', is_active);

    const { data, error, count } = await query
      .order('connected_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) throw error;

    return {
      data: data.map(this.transformSocialAccount),
      meta: {
        page,
        limit,
        total: count || 0,
        total_pages: Math.ceil((count || 0) / limit),
        has_next_page: offset + limit < (count || 0),
        has_prev_page: page > 1,
      },
    };
  }

  /**
   * Create social account
   */
  async createSocialAccount(
    accountData: Partial<SocialAccount>
  ): Promise<SocialAccount> {
    const { data, error } = await this.client
      .from('social_accounts')
      .insert(accountData)
      .select()
      .single();

    if (error) throw error;
    return this.transformSocialAccount(data);
  }

  /**
   * Update social account
   */
  async updateSocialAccount(
    accountId: string,
    updates: Partial<SocialAccount>
  ): Promise<SocialAccount> {
    const { data, error } = await this.client
      .from('social_accounts')
      .update(updates)
      .eq('id', accountId)
      .select()
      .single();

    if (error) throw error;
    return this.transformSocialAccount(data);
  }

  /**
   * Delete social account
   */
  async deleteSocialAccount(accountId: string): Promise<void> {
    const { error } = await this.client
      .from('social_accounts')
      .delete()
      .eq('id', accountId);

    if (error) throw error;
  }

  /**
   * Transform raw social account data
   */
  private transformSocialAccount(data: any): SocialAccount {
    return {
      ...data,
      connection_metadata: data.connection_metadata || {},
      connected_at: new Date(data.connected_at),
      updated_at: new Date(data.updated_at),
      expires_at: data.expires_at ? new Date(data.expires_at) : undefined,
      last_sync_at: data.last_sync_at ? new Date(data.last_sync_at) : undefined,
    };
  }

  // =============================================================================
  // BILLING MANAGEMENT
  // =============================================================================

  /**
   * Get user billing info
   */
  async getBillingInfo(userId: string): Promise<BillingInfo | null> {
    const { data, error } = await this.client
      .from('billing_info')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null;
      throw error;
    }

    return this.transformBillingInfo(data);
  }

  /**
   * Create or update billing info
   */
  async upsertBillingInfo(
    billingData: Partial<BillingInfo>
  ): Promise<BillingInfo> {
    const { data, error } = await this.client
      .from('billing_info')
      .upsert(billingData)
      .select()
      .single();

    if (error) throw error;
    return this.transformBillingInfo(data);
  }

  /**
   * Transform raw billing info data
   */
  private transformBillingInfo(data: any): BillingInfo {
    return {
      ...data,
      created_at: new Date(data.created_at),
      updated_at: new Date(data.updated_at),
      current_period_start: data.current_period_start
        ? new Date(data.current_period_start)
        : undefined,
      current_period_end: data.current_period_end
        ? new Date(data.current_period_end)
        : undefined,
    };
  }

  // =============================================================================
  // POST PLATFORMS MANAGEMENT
  // =============================================================================

  /**
   * Create post platform associations
   */
  async createPostPlatforms(
    postPlatforms: Partial<PostPlatform>[]
  ): Promise<PostPlatform[]> {
    const { data, error } = await this.client
      .from('post_platforms')
      .insert(postPlatforms)
      .select();

    if (error) throw error;
    return data.map(this.transformPostPlatform);
  }

  /**
   * Update post platform status
   */
  async updatePostPlatform(
    postPlatformId: string,
    updates: Partial<PostPlatform>
  ): Promise<PostPlatform> {
    const { data, error } = await this.client
      .from('post_platforms')
      .update(updates)
      .eq('id', postPlatformId)
      .select()
      .single();

    if (error) throw error;
    return this.transformPostPlatform(data);
  }

  /**
   * Get post platforms for a post
   */
  async getPostPlatforms(postId: string): Promise<PostPlatform[]> {
    const { data, error } = await this.client
      .from('post_platforms')
      .select(
        `
        *,
        social_account:social_accounts(*)
      `
      )
      .eq('post_id', postId);

    if (error) throw error;
    return data.map(this.transformPostPlatform);
  }

  /**
   * Transform raw post platform data
   */
  private transformPostPlatform(data: any): PostPlatform {
    return {
      ...data,
      created_at: new Date(data.created_at),
      published_at: data.published_at ? new Date(data.published_at) : undefined,
      social_account: data.social_account
        ? this.transformSocialAccount(data.social_account)
        : undefined,
    };
  }

  // =============================================================================
  // WEBHOOK LOGS MANAGEMENT
  // =============================================================================

  /**
   * Create webhook log entry
   */
  async createWebhookLog(logData: Partial<WebhookLog>): Promise<WebhookLog> {
    const { data, error } = await this.adminClient
      .from('webhook_logs')
      .insert(logData)
      .select()
      .single();

    if (error) throw error;
    return this.transformWebhookLog(data);
  }

  /**
   * Update webhook log status
   */
  async updateWebhookLog(
    logId: string,
    updates: Partial<WebhookLog>
  ): Promise<WebhookLog> {
    const { data, error } = await this.adminClient
      .from('webhook_logs')
      .update(updates)
      .eq('id', logId)
      .select()
      .single();

    if (error) throw error;
    return this.transformWebhookLog(data);
  }

  /**
   * Get webhook logs with pagination
   */
  async getWebhookLogs(
    params: QueryParams & {
      webhook_type?: string;
      status?: string;
      source?: string;
    } = {}
  ): Promise<PaginatedResponse<WebhookLog>> {
    const { page = 1, limit = 20, webhook_type, status, source } = params;
    const offset = (page - 1) * limit;

    let query = this.adminClient
      .from('webhook_logs')
      .select('*', { count: 'exact' });

    if (webhook_type) query = query.eq('webhook_type', webhook_type);
    if (status) query = query.eq('status', status);
    if (source) query = query.eq('source', source);

    const { data, error, count } = await query
      .order('received_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) throw error;

    return {
      data: data.map(this.transformWebhookLog),
      meta: {
        page,
        limit,
        total: count || 0,
        total_pages: Math.ceil((count || 0) / limit),
        has_next_page: offset + limit < (count || 0),
        has_prev_page: page > 1,
      },
    };
  }

  /**
   * Transform raw webhook log data
   */
  private transformWebhookLog(data: any): WebhookLog {
    return {
      ...data,
      received_at: new Date(data.received_at),
      processed_at: data.processed_at ? new Date(data.processed_at) : undefined,
    };
  }

  // =============================================================================
  // PLAN FEATURES MANAGEMENT
  // =============================================================================

  /**
   * Get all plan features
   */
  async getPlanFeatures(): Promise<PlanFeature[]> {
    const { data, error } = await this.client
      .from('plan_features')
      .select('*')
      .order('category')
      .order('feature_name');

    if (error) throw error;
    return data.map(this.transformPlanFeature);
  }

  /**
   * Transform raw plan feature data
   */
  private transformPlanFeature(data: any): PlanFeature {
    return {
      ...data,
      created_at: new Date(data.created_at),
      updated_at: new Date(data.updated_at),
      metadata: data.metadata || {},
    };
  }

  // =============================================================================
  // WORKSPACE MEMBERSHIPS
  // =============================================================================

  /**
   * Get workspace memberships for a workspace
   */
  async getWorkspaceMemberships(
    workspaceId: string
  ): Promise<WorkspaceMembership[]> {
    const { data, error } = await this.client
      .from('workspace_memberships')
      .select(
        `
        *,
        user:users(*),
        workspace:workspaces(*)
      `
      )
      .eq('workspace_id', workspaceId)
      .eq('is_active', true);

    if (error) throw error;
    return data.map(this.transformWorkspaceMembership);
  }

  /**
   * Transform workspace membership data
   */
  private transformWorkspaceMembership(data: any): WorkspaceMembership {
    return {
      ...data,
      joined_at: new Date(data.joined_at),
      user: data.user ? this.transformUser(data.user) : undefined,
      workspace: data.workspace
        ? this.transformWorkspace(data.workspace)
        : undefined,
    };
  }

  // =============================================================================
  // UTILITY METHODS
  // =============================================================================

  /**
   * Execute raw SQL query (admin only)
   */
  async executeRawQuery(query: string, params: any[] = []): Promise<any> {
    const { data, error } = await this.adminClient.rpc('execute_sql', {
      query,
      params,
    });

    if (error) throw error;
    return data;
  }

  /**
   * Check if user exists
   */
  async userExists(userId: string): Promise<boolean> {
    const { count, error } = await this.client
      .from('users')
      .select('id', { count: 'exact' })
      .eq('id', userId);

    if (error) throw error;
    return count !== null && count > 0;
  }

  /**
   * Health check
   */
  async healthCheck(): Promise<{ status: string; timestamp: Date }> {
    try {
      const { error } = await this.client
        .from('users')
        .select('count')
        .limit(1);
      if (error) throw error;

      return {
        status: 'healthy',
        timestamp: new Date(),
      };
    } catch (error) {
      throw new Error(`Supabase health check failed: ${error}`);
    }
  }
}

// Export singleton instance
export const supabaseService = new SupabaseService();
