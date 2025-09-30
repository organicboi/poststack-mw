import * as crypto from 'crypto';
import { config } from '../../common/config';
import { db } from '../../database/database.service';
import { PostsService } from '../posts/posts.service';
import {
  WebhookPayload,
  PostizWebhookData,
  AccountWebhookData,
  WebhookProcessingResult
} from './webhooks.types';

export class WebhooksService {
  private readonly webhookSecret: string;
  private postsService: PostsService;

  constructor() {
    this.webhookSecret = config.webhook?.secret || process.env.WEBHOOK_SECRET || 'default-webhook-secret';
    this.postsService = new PostsService();
  }

  /**
   * Verify webhook signature from Postiz
   */
  verifyWebhookSignature(payload: string, signature: string): boolean {
    try {
      const expectedSignature = crypto
        .createHmac('sha256', this.webhookSecret)
        .update(payload)
        .digest('hex');

      const receivedSignature = signature.replace('sha256=', '');

      return crypto.timingSafeEqual(
        Buffer.from(expectedSignature, 'hex'),
        Buffer.from(receivedSignature, 'hex')
      );
    } catch (error) {
      console.error('Error verifying webhook signature:', error);
      return false;
    }
  }

  /**
   * Log webhook received for auditing
   */
  private async logWebhook(
    webhookType: string,
    payload: any,
    postizPostId?: string,
    myapp1PostId?: string
  ): Promise<string> {
    try {
      const { data: webhookLog, error } = await db.adminClient
        .from('webhook_logs')
        .insert({
          webhook_type: webhookType,
          postiz_post_id: postizPostId,
          myapp1_post_id: myapp1PostId,
          payload,
          status: 'pending',
          received_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (error) {
        console.error('Failed to log webhook:', error);
        return '';
      }

      return webhookLog.id;
    } catch (error) {
      console.error('Error logging webhook:', error);
      return '';
    }
  }

  /**
   * Update webhook log status
   */
  private async updateWebhookLog(
    webhookId: string,
    status: 'processed' | 'failed',
    errorMessage?: string
  ): Promise<void> {
    try {
      await db.adminClient
        .from('webhook_logs')
        .update({
          status,
          processed_at: new Date().toISOString(),
          error_message: errorMessage,
        })
        .eq('id', webhookId);
    } catch (error) {
      console.error('Error updating webhook log:', error);
    }
  }

  /**
   * Handle webhook from Postiz about post status updates
   */
  async handlePostizWebhook(payload: WebhookPayload, signature?: string): Promise<WebhookProcessingResult> {
    let webhookId = '';

    try {
      // Verify signature if provided
      if (signature) {
        const isValid = this.verifyWebhookSignature(JSON.stringify(payload), signature);
        if (!isValid) {
          throw new Error('Invalid webhook signature');
        }
      }

      const { event, data } = payload;

      console.log(`Received Postiz webhook: ${event}`, { data });

      // Log webhook
      webhookId = await this.logWebhook('postiz', payload, data.postizPostId, data.externalId);

      switch (event) {
        case 'post.status_updated':
          await this.handlePostStatusUpdate(data);
          break;

        case 'post.published':
          await this.handlePostPublished(data);
          break;

        case 'post.failed':
          await this.handlePostFailed(data);
          break;

        case 'post.scheduled':
          await this.handlePostScheduled(data);
          break;

        default:
          console.warn(`Unknown webhook event: ${event}`);
      }

      // Update webhook log to processed
      if (webhookId) {
        await this.updateWebhookLog(webhookId, 'processed');
      }

      return {
        success: true,
        message: 'Webhook processed successfully',
        webhookId
      };

    } catch (error: any) {
      console.error('Error processing Postiz webhook:', error);

      // Update webhook log to failed
      if (webhookId) {
        await this.updateWebhookLog(webhookId, 'failed', error.message);
      }

      return {
        success: false,
        message: 'Failed to process webhook',
        error: error.message,
        webhookId
      };
    }
  }

  /**
   * Handle post status update from Postiz
   */
  private async handlePostStatusUpdate(data: PostizWebhookData) {
    const { externalId, status, postizPostId, platformResults } = data;

    if (!externalId) {
      console.warn('Webhook missing externalId (post ID)');
      return;
    }

    await this.postsService.handlePostizWebhook(externalId, status || 'UNKNOWN', {
      postizPostId,
      platformResults,
      updatedAt: new Date().toISOString(),
    });

    console.log(`Updated post ${externalId} status to ${status}`);
  }

  /**
   * Handle successful post publication
   */
  private async handlePostPublished(data: PostizWebhookData) {
    const { externalId, postizPostId, platformResults, publishedAt } = data;

    if (!externalId) {
      console.warn('Webhook missing externalId (post ID)');
      return;
    }

    await this.postsService.handlePostizWebhook(externalId, 'PUBLISHED', {
      postizPostId,
      platformResults,
      publishedAt,
      success: true,
    });

    console.log(`Post ${externalId} published successfully across platforms`);
  }

  /**
   * Handle post publication failure
   */
  private async handlePostFailed(data: PostizWebhookData) {
    const { externalId, postizPostId, error, platformResults } = data;

    if (!externalId) {
      console.warn('Webhook missing externalId (post ID)');
      return;
    }

    await this.postsService.handlePostizWebhook(externalId, 'FAILED', {
      postizPostId,
      error,
      platformResults,
      failedAt: new Date().toISOString(),
    });

    console.error(`Post ${externalId} failed to publish:`, error);
  }

  /**
   * Handle post scheduling confirmation
   */
  private async handlePostScheduled(data: PostizWebhookData) {
    const { externalId, postizPostId, scheduledAt } = data;

    if (!externalId) {
      console.warn('Webhook missing externalId (post ID)');
      return;
    }

    await this.postsService.handlePostizWebhook(externalId, 'SCHEDULED', {
      postizPostId,
      scheduledAt,
      confirmed: true,
    });

    console.log(`Post ${externalId} scheduled successfully for ${scheduledAt}`);
  }

  /**
   * Handle webhook for social account connection status
   */
  async handleAccountWebhook(payload: WebhookPayload): Promise<WebhookProcessingResult> {
    let webhookId = '';

    try {
      const { event, data } = payload;

      console.log(`Received account webhook: ${event}`, { data });

      // Log webhook
      webhookId = await this.logWebhook('account', payload);

      switch (event) {
        case 'account.connected':
          console.log(`Social account connected: ${data.platform} - ${data.accountId}`);
          break;

        case 'account.disconnected':
          console.log(`Social account disconnected: ${data.platform} - ${data.accountId}`);
          break;

        case 'account.token_expired':
          console.warn(`Social account token expired: ${data.platform} - ${data.accountId}`);
          // Could trigger notification to user to reconnect
          break;

        default:
          console.warn(`Unknown account webhook event: ${event}`);
      }

      // Update webhook log to processed
      if (webhookId) {
        await this.updateWebhookLog(webhookId, 'processed');
      }

      return {
        success: true,
        message: 'Account webhook processed',
        webhookId
      };

    } catch (error: any) {
      console.error('Error processing account webhook:', error);

      // Update webhook log to failed
      if (webhookId) {
        await this.updateWebhookLog(webhookId, 'failed', error.message);
      }

      return {
        success: false,
        message: 'Failed to process account webhook',
        error: error.message,
        webhookId
      };
    }
  }

  /**
   * Get webhook logs for monitoring
   */
  async getWebhookLogs(limit: number = 100, offset: number = 0) {
    try {
      const { data: logs, error } = await db.adminClient
        .from('webhook_logs')
        .select('*')
        .order('received_at', { ascending: false })
        .limit(limit)
        .range(offset, offset + limit - 1);

      if (error) {
        throw new Error(`Failed to get webhook logs: ${error.message}`);
      }

      return logs || [];
    } catch (error: any) {
      console.error('Error getting webhook logs:', error);
      throw error;
    }
  }

  /**
   * Health check endpoint for webhook monitoring
   */
  getWebhookHealth() {
    return {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      webhookSecret: this.webhookSecret ? 'configured' : 'not_configured',
      service: 'webhooks',
    };
  }
}