import {
  Post,
  CreatePostDto,
  UpdatePostDto,
  PaginationOptions,
} from '../../types/core-modules.types';
import { db } from '../../database/database.service';
import { BillingService } from '../billing/billing.service';
import { PostizIntegrationService } from '../postiz-integration/postiz-integration.service';
import { SocialTokensService } from '../social-tokens/social-tokens.service';

/**
 * Post management service
 */
export class PostsService {
  private billingService: BillingService;
  private postizService: PostizIntegrationService;
  private socialTokensService: SocialTokensService;

  constructor() {
    this.billingService = new BillingService();
    this.postizService = new PostizIntegrationService();
    this.socialTokensService = new SocialTokensService();
  }

  /**
   * Create a new post
   */
  async createPost(userId: string, postData: CreatePostDto): Promise<Post> {
    // Check if user can create post based on plan limits
    const canCreate = await this.billingService.canCreatePost(userId);
    if (!canCreate.canCreate) {
      throw new Error(
        canCreate.reason || 'Unable to create post due to plan limits'
      );
    }

    // Create post in database
    const postRecord: Partial<Post> = {
      user_id: userId,
      content: postData.content,
      media_urls: postData.media_urls || [],
      status: 'DRAFT',
      settings: postData.settings || {},
    };

    if (postData.workspace_id) {
      postRecord.workspace_id = postData.workspace_id;
    }

    if (postData.title) {
      postRecord.title = postData.title;
    }

    if (postData.scheduled_for) {
      postRecord.scheduled_for = new Date(postData.scheduled_for).toISOString();
    }

    const post = await db.createPost(postRecord);

    try {
      // Integrate with Postiz if social accounts are provided
      if (postData.social_account_ids && postData.social_account_ids.length > 0) {
        // Get social accounts for the provided IDs
        const socialAccounts = await this.socialTokensService.getSocialAccountsForPublishing(
          userId,
          postData.workspace_id || userId,
          postData.social_account_ids
        );

        if (socialAccounts.length === 0) {
          throw new Error('No valid social accounts found for the provided IDs');
        }

        // Map social accounts to Postiz platform IDs
        const platformIds = socialAccounts.map(account => account.postizIntegrationId);

        // Create post in Postiz
        const postizResponse = await this.postizService.createPostWithSocialAccounts(
          userId,
          postData.workspace_id || userId,
          postData.content,
          platformIds,
          postData.scheduled_for,
          postData.media_urls
        );

        // Update post with Postiz information
        await db.updatePost(post.id, userId, {
          status: postData.scheduled_for ? 'SCHEDULED' : 'PUBLISHING',
          postiz_post_id: postizResponse.id,
          settings: {
            ...post.settings,
            postizResponse,
            socialAccounts: socialAccounts.map(acc => ({
              id: acc.id,
              platform: acc.platform,
              platformUsername: acc.platformUsername,
            })),
          },
        });
      } else if (postData.scheduled_for) {
        // Just schedule without social integration
        await db.updatePost(post.id, userId, {
          status: 'SCHEDULED',
        });
      }

      // Increment usage counter
      await this.billingService.incrementPostUsage(userId);

      // Return updated post
      const updatedPost = await db.findPostById(post.id, userId);
      return updatedPost || post;

    } catch (error: any) {
      console.error('Error creating post:', error);

      // Update post status to failed
      await db.updatePost(post.id, userId, {
        status: 'FAILED',
        settings: { ...post.settings, error: error.message },
      });

      throw new Error(`Failed to create post: ${error.message}`);
    }
  }

  /**
   * Get posts for a user with pagination and filtering
   */
  async getUserPosts(
    userId: string,
    options: PaginationOptions & {
      workspace_id?: string;
      status?: string;
      search?: string;
    } = {}
  ) {
    return await db.findUserPosts(userId, options);
  }

  /**
   * Get a single post by ID
   */
  async getPost(userId: string, postId: string): Promise<Post> {
    const post = await db.findPostById(postId, userId);
    if (!post) {
      throw new Error('Post not found');
    }
    return post;
  }

  /**
   * Update a post
   */
  async updatePost(
    userId: string,
    postId: string,
    updates: UpdatePostDto
  ): Promise<Post> {
    const post = await this.getPost(userId, postId);

    // Only allow updates to posts that are in DRAFT or FAILED status
    if (!['DRAFT', 'FAILED'].includes(post.status)) {
      throw new Error(`Cannot update post in ${post.status} status`);
    }

    return await db.updatePost(postId, userId, updates);
  }

  /**
   * Delete a post
   */
  async deletePost(userId: string, postId: string): Promise<void> {
    const post = await this.getPost(userId, postId);

    // Don't allow deletion of published posts
    if (post.status === 'PUBLISHED') {
      throw new Error('Cannot delete published post');
    }

    await db.deletePost(postId, userId);
  }

  /**
   * Schedule a post
   */
  async schedulePost(
    userId: string,
    postId: string,
    scheduledDate: string
  ): Promise<Post> {
    const post = await this.getPost(userId, postId);

    // Only allow scheduling posts in DRAFT or FAILED status
    if (!['DRAFT', 'FAILED'].includes(post.status)) {
      throw new Error(`Cannot schedule post in ${post.status} status`);
    }

    // Validate date
    const scheduledFor = new Date(scheduledDate);
    if (isNaN(scheduledFor.getTime()) || scheduledFor <= new Date()) {
      throw new Error('Scheduled date must be in the future');
    }

    return await db.updatePost(postId, userId, {
      status: 'SCHEDULED',
      scheduled_for: scheduledFor.toISOString(),
    });
  }

  /**
   * Cancel scheduled post
   */
  async cancelScheduledPost(userId: string, postId: string): Promise<Post> {
    const post = await this.getPost(userId, postId);

    if (post.status !== 'SCHEDULED') {
      throw new Error('Only scheduled posts can be cancelled');
    }

    return await db.updatePost(postId, userId, {
      status: 'DRAFT',
      scheduled_for: null as unknown as string, // TypeScript workaround to set value to null
    });
  }

  /**
   * Handle webhook from Postiz about post status updates
   */
  async handlePostizWebhook(
    postId: string,
    status: string,
    webhookData: {
      postizPostId?: string;
      platformResults?: any[];
      publishedAt?: string;
      scheduledAt?: string;
      failedAt?: string;
      updatedAt?: string;
      error?: string;
      success?: boolean;
      confirmed?: boolean;
    }
  ): Promise<void> {
    try {
      // Find the post by ID
      const { data: post, error: findError } = await db.adminClient
        .from('posts')
        .select('*')
        .eq('id', postId)
        .single();

      if (findError || !post) {
        console.error(`Post not found for webhook update: ${postId}`);
        return;
      }

      // Prepare update data
      const updateData: any = {
        status,
        updated_at: new Date().toISOString(),
        settings: {
          ...post.settings,
          webhook_data: webhookData,
          last_webhook_update: new Date().toISOString(),
        },
      };

      // Set Postiz post ID if provided
      if (webhookData.postizPostId) {
        updateData.postiz_post_id = webhookData.postizPostId;
      }

      // Set published_at if status is PUBLISHED
      if (status === 'PUBLISHED' && webhookData.publishedAt) {
        updateData.published_at = webhookData.publishedAt;
      }

      // Set scheduled_for if status is SCHEDULED
      if (status === 'SCHEDULED' && webhookData.scheduledAt) {
        updateData.scheduled_for = webhookData.scheduledAt;
      }

      // Update error information if post failed
      if (status === 'FAILED' && webhookData.error) {
        updateData.settings = {
          ...updateData.settings,
          error: webhookData.error,
          failed_at: webhookData.failedAt || new Date().toISOString(),
        };
      }

      // Update the post
      const { error: updateError } = await db.adminClient
        .from('posts')
        .update(updateData)
        .eq('id', postId);

      if (updateError) {
        console.error(`Failed to update post ${postId} from webhook:`, updateError);
        return;
      }

      console.log(`Post ${postId} updated from webhook - status: ${status}`);

    } catch (error: any) {
      console.error(`Error handling Postiz webhook for post ${postId}:`, error);
      throw error;
    }
  }
}
