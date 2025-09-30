import { config } from '../../common/config';
import {
  CreatePostDto,
  PostizResponse,
  PostStatusResponse,
  TokenData,
  MediaUploadResponse,
  UserIntegrationsResponse,
  PlatformAnalyticsResponse
} from './postiz-integration.types';

export class PostizIntegrationService {
  private readonly postizBaseUrl: string;
  private readonly serviceKey: string;

  constructor() {
    this.postizBaseUrl = config.postiz?.apiUrl || process.env.POSTIZ_API_URL || 'http://localhost:3000';
    this.serviceKey = config.postiz?.serviceKey || process.env.POSTIZ_SERVICE_KEY || '';

    if (!this.serviceKey) {
      throw new Error('POSTIZ_SERVICE_KEY is required');
    }
  }

  /**
   * Create a post in Postiz using external user mapping
   */
  async createPost(postData: CreatePostDto): Promise<PostizResponse> {
    try {
      console.log(`Creating post in Postiz for platforms: ${postData.platforms.join(', ')}`);

      const response = await fetch(`${this.postizBaseUrl}/external-integrations/posts`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-service-key': this.serviceKey,
          'x-external-service': 'middleware',
          'User-Agent': 'Middleware-PostizClient/1.0',
        },
        body: JSON.stringify(postData),
      });

      if (!response.ok) {
        if (response.status === 401) {
          throw new Error('Invalid Postiz service key');
        }

        if (response.status === 400) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(`Postiz validation error: ${errorData.message || 'Invalid request'}`);
        }

        throw new Error(`Postiz API error: ${response.status} ${response.statusText}`);
      }

      const result: PostizResponse = await response.json();
      console.log(`Post created successfully in Postiz: ${result.id}`);
      return result;

    } catch (error: any) {
      console.error('Failed to create post in Postiz:', error.message);
      throw new Error(`Failed to create post in Postiz: ${error.message}`);
    }
  }

  /**
   * Get post status from Postiz
   */
  async getPostStatus(postizPostId: string): Promise<PostStatusResponse> {
    try {
      const response = await fetch(`${this.postizBaseUrl}/external-integrations/posts/${postizPostId}/status`, {
        method: 'GET',
        headers: {
          'x-service-key': this.serviceKey,
          'x-external-service': 'middleware',
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to get post status: ${response.status} ${response.statusText}`);
      }

      return await response.json();

    } catch (error: any) {
      console.error(`Failed to get post status from Postiz: ${postizPostId}`, error.message);
      throw new Error(`Failed to get post status from Postiz: ${error.message}`);
    }
  }

  /**
   * Get user analytics for platform from Postiz
   */
  async getUserPlatformAnalytics(
    externalUserId: string,
    platform: string,
    date: string = '7'
  ): Promise<PlatformAnalyticsResponse> {
    try {
      const response = await fetch(
        `${this.postizBaseUrl}/external-integrations/user/${externalUserId}/analytics/${platform}?date=${date}`,
        {
          method: 'GET',
          headers: {
            'x-service-key': this.serviceKey,
            'x-external-service': 'middleware',
          },
        }
      );

      if (!response.ok) {
        throw new Error(`Failed to get analytics: ${response.status} ${response.statusText}`);
      }

      return await response.json();

    } catch (error: any) {
      console.error(`Failed to get user analytics from Postiz: ${externalUserId}/${platform}`, error.message);
      throw new Error(`Failed to get user analytics from Postiz: ${error.message}`);
    }
  }

  /**
   * Upload media to Postiz
   */
  async uploadMedia(file: Buffer, filename: string, mimeType: string): Promise<MediaUploadResponse> {
    try {
      const formData = new FormData();
      const blob = new Blob([new Uint8Array(file)], { type: mimeType });
      formData.append('file', blob, filename);

      const response = await fetch(`${this.postizBaseUrl}/media`, {
        method: 'POST',
        headers: {
          'X-Service-Key': this.serviceKey,
        },
        body: formData,
      });

      if (!response.ok) {
        throw new Error(`Failed to upload media: ${response.status} ${response.statusText}`);
      }

      return await response.json();

    } catch (error: any) {
      console.error('Failed to upload media to Postiz:', error.message);
      throw new Error(`Failed to upload media to Postiz: ${error.message}`);
    }
  }

  /**
   * Get user's connected integrations from Postiz
   */
  async getUserIntegrations(externalUserId: string): Promise<UserIntegrationsResponse> {
    try {
      const response = await fetch(
        `${this.postizBaseUrl}/external-integrations/user/${externalUserId}/integrations`,
        {
          method: 'GET',
          headers: {
            'x-service-key': this.serviceKey,
            'x-external-service': 'middleware',
          },
        }
      );

      if (!response.ok) {
        throw new Error(`Failed to get integrations: ${response.status} ${response.statusText}`);
      }

      return await response.json();

    } catch (error: any) {
      console.error(`Failed to get user integrations from Postiz: ${externalUserId}`, error.message);
      throw new Error(`Failed to get user integrations from Postiz: ${error.message}`);
    }
  }

  /**
   * Disconnect a platform for a user
   */
  async disconnectPlatform(externalUserId: string, platform: string): Promise<any> {
    try {
      const response = await fetch(
        `${this.postizBaseUrl}/external-integrations/users/${externalUserId}/disconnect/${platform}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-service-key': this.serviceKey,
            'x-external-service': 'middleware',
          },
          body: JSON.stringify({}),
        }
      );

      if (!response.ok) {
        throw new Error(`Failed to disconnect platform: ${response.status} ${response.statusText}`);
      }

      return await response.json();

    } catch (error: any) {
      console.error(`Failed to disconnect platform from Postiz: ${externalUserId}/${platform}`, error.message);
      throw new Error(`Failed to disconnect platform from Postiz: ${error.message}`);
    }
  }

  /**
   * Health check for Postiz connection
   */
  async healthCheck(): Promise<boolean> {
    try {
      const response = await fetch(`${this.postizBaseUrl}/health`, {
        method: 'GET',
        headers: {
          'x-service-key': this.serviceKey,
        },
        signal: AbortSignal.timeout(5000), // 5 second timeout
      });

      return response.status === 200;

    } catch (error: any) {
      console.warn('Postiz health check failed:', error.message);
      return false;
    }
  }

  /**
   * Serialize tokens for different platforms
   */
  serializeTokenForPlatform(tokenData: TokenData, platform: string): string {
    switch (platform.toLowerCase()) {
      case 'twitter':
      case 'x':
        if (!tokenData.accessTokenSecret) {
          throw new Error('Twitter tokens require accessTokenSecret');
        }
        return `${tokenData.accessToken}:${tokenData.accessTokenSecret}`;

      case 'facebook':
      case 'instagram':
        const pageId = tokenData.pageId || 'me';
        return `${tokenData.accessToken}|${pageId}`;

      case 'linkedin':
        const entityId = tokenData.companyId || tokenData.personId || 'me';
        return `${tokenData.accessToken}|${entityId}`;

      default:
        // Most platforms just use access token
        return tokenData.accessToken;
    }
  }

  /**
   * Prepare platform tokens for Postiz API
   */
  preparePlatformTokens(
    socialTokens: Array<{ platform: string; tokenData: TokenData }>
  ): Record<string, TokenData> {
    const platformTokens: Record<string, TokenData> = {};

    for (const { platform, tokenData } of socialTokens) {
      platformTokens[platform] = {
        accessToken: tokenData.accessToken,
        accessTokenSecret: tokenData.accessTokenSecret,
        refreshToken: tokenData.refreshToken,
        pageId: tokenData.pageId,
        personId: tokenData.personId,
        companyId: tokenData.companyId,
        platformUserId: tokenData.platformUserId,
        expiresAt: tokenData.expiresAt,
      };
    }

    return platformTokens;
  }

  /**
   * Create a post with social accounts integration
   */
  async createPostWithSocialAccounts(
    userId: string,
    workspaceId: string,
    content: string,
    socialAccountIds: string[],
    publishDate?: string,
    media?: string[]
  ): Promise<PostizResponse> {
    try {
      // Map social account IDs to platform names
      // In a real implementation, you would fetch the social accounts and get their platforms
      const platforms = socialAccountIds; // Simplified for now

      const postData: CreatePostDto = {
        externalUserId: userId,
        externalService: 'middleware',
        content,
        platforms,
        publishDate,
        media,
        teamContext: workspaceId,
        metadata: {
          myAppUserId: userId,
          myAppWorkspaceId: workspaceId,
          socialAccountIds,
        },
      };

      return await this.createPost(postData);

    } catch (error: any) {
      console.error('Failed to create post with social accounts:', error.message);
      throw error;
    }
  }
}