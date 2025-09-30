import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { config } from '../common/config';
import {
  ExtendedUser,
  BillingInfo,
  Post,
  PaginationOptions,
} from '../types/core-modules.types';

/**
 * Database service for handling core module operations
 * Uses the Singleton pattern to ensure a single instance is used throughout the app
 */
export class DatabaseService {
  private static instance: DatabaseService;
  public readonly client: SupabaseClient;
  public readonly adminClient: SupabaseClient;

  private constructor() {
    this.client = createClient(config.supabase.url, config.supabase.anonKey);
    this.adminClient = createClient(
      config.supabase.url,
      config.supabase.serviceKey
    );
  }

  static getInstance(): DatabaseService {
    if (!DatabaseService.instance) {
      DatabaseService.instance = new DatabaseService();
    }
    return DatabaseService.instance;
  }

  // ===== User Operations =====

  /**
   * Find a user by ID with extended profile information
   */
  async findUser(id: string): Promise<ExtendedUser | null> {
    const { data, error } = await this.adminClient
      .from('users')
      .select('*')
      .eq('id', id)
      .single();

    if (error && error.code !== 'PGRST116') {
      throw new Error(`Error finding user: ${error.message}`);
    }

    return data as ExtendedUser;
  }

  /**
   * Find a user by email
   */
  async findUserByEmail(email: string): Promise<ExtendedUser | null> {
    // First try to get the user ID from auth.users
    const { data: userResponse, error: userError } = await this.adminClient
      .from('users')
      .select('id')
      .eq('email', email)
      .single();

    if (userError && userError.code !== 'PGRST116') {
      throw new Error(`Error finding user by email: ${userError.message}`);
    }

    if (!userResponse) {
      return null;
    }

    return await this.findUser(userResponse.id);
  }

  /**
   * Update a user's profile information
   */
  async updateUser(
    id: string,
    updates: Partial<ExtendedUser>
  ): Promise<ExtendedUser> {
    const { data, error } = await this.adminClient
      .from('users')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      throw new Error(`Error updating user: ${error.message}`);
    }

    return data as ExtendedUser;
  }

  // ===== Posts Operations =====

  /**
   * Create a new post
   */
  async createPost(postData: Partial<Post>): Promise<Post> {
    const { data, error } = await this.adminClient
      .from('posts')
      .insert({
        ...postData,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) {
      throw new Error(`Error creating post: ${error.message}`);
    }

    return data as Post;
  }

  /**
   * Find posts by user ID with optional filters and pagination
   */
  async findUserPosts(
    userId: string,
    options: PaginationOptions & {
      workspace_id?: string;
      status?: string;
      search?: string;
    } = {}
  ): Promise<{ posts: Post[]; total: number }> {
    const {
      page = 1,
      limit = 10,
      sortBy = 'created_at',
      sortOrder = 'desc',
      workspace_id,
      status,
      search,
    } = options;

    const offset = (page - 1) * limit;

    let query = this.adminClient
      .from('posts')
      .select('*', { count: 'exact' })
      .eq('user_id', userId);

    if (workspace_id) {
      query = query.eq('workspace_id', workspace_id);
    }

    if (status) {
      query = query.eq('status', status);
    }

    if (search) {
      query = query.or(`title.ilike.%${search}%,content.ilike.%${search}%`);
    }

    const { data, error, count } = await query
      .order(sortBy, { ascending: sortOrder === 'asc' })
      .range(offset, offset + limit - 1);

    if (error) {
      throw new Error(`Error finding posts: ${error.message}`);
    }

    return {
      posts: data as Post[],
      total: count || 0,
    };
  }

  /**
   * Find a single post by ID
   */
  async findPostById(postId: string, userId: string): Promise<Post | null> {
    const { data, error } = await this.adminClient
      .from('posts')
      .select('*')
      .eq('id', postId)
      .eq('user_id', userId)
      .single();

    if (error && error.code !== 'PGRST116') {
      throw new Error(`Error finding post: ${error.message}`);
    }

    return data as Post;
  }

  /**
   * Update a post
   */
  async updatePost(
    postId: string,
    userId: string,
    updates: Partial<Post>
  ): Promise<Post> {
    const { data, error } = await this.adminClient
      .from('posts')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', postId)
      .eq('user_id', userId)
      .select()
      .single();

    if (error) {
      throw new Error(`Error updating post: ${error.message}`);
    }

    return data as Post;
  }

  /**
   * Delete a post
   */
  async deletePost(postId: string, userId: string): Promise<void> {
    const { error } = await this.adminClient
      .from('posts')
      .delete()
      .eq('id', postId)
      .eq('user_id', userId);

    if (error) {
      throw new Error(`Error deleting post: ${error.message}`);
    }
  }

  // ===== Billing Operations =====

  /**
   * Get billing information for a user
   */
  async findBillingInfo(userId: string): Promise<BillingInfo | null> {
    const { data, error } = await this.adminClient
      .from('billing_info')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (error && error.code !== 'PGRST116') {
      throw new Error(`Error finding billing info: ${error.message}`);
    }

    return data as BillingInfo;
  }

  /**
   * Create billing information for a user
   */
  async createBillingInfo(
    billingData: Partial<BillingInfo>
  ): Promise<BillingInfo> {
    const { data, error } = await this.adminClient
      .from('billing_info')
      .insert({
        ...billingData,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) {
      throw new Error(`Error creating billing info: ${error.message}`);
    }

    return data as BillingInfo;
  }

  /**
   * Update billing information for a user
   */
  async updateBillingInfo(
    userId: string,
    updates: Partial<BillingInfo>
  ): Promise<BillingInfo> {
    const { data, error } = await this.adminClient
      .from('billing_info')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('user_id', userId)
      .select()
      .single();

    if (error) {
      throw new Error(`Error updating billing info: ${error.message}`);
    }

    return data as BillingInfo;
  }

  /**
   * Count user workspaces
   */
  async countUserWorkspaces(userId: string): Promise<number> {
    const { count, error } = await this.adminClient
      .from('workspaces')
      .select('*', { count: 'exact', head: true })
      .eq('owner_id', userId);

    if (error) {
      throw new Error(`Error counting workspaces: ${error.message}`);
    }

    return count || 0;
  }

  /**
   * Count user social accounts
   */
  async countSocialAccounts(userId: string): Promise<number> {
    const { count, error } = await this.adminClient
      .from('social_accounts')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId);

    if (error) {
      throw new Error(`Error counting social accounts: ${error.message}`);
    }

    return count || 0;
  }
}

// Export a singleton instance
export const db = DatabaseService.getInstance();
