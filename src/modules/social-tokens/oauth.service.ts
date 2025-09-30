import { config } from '../../common/config';
import { PostizOAuthUrlResponse, PostizOAuthExternalResponse, OAuthContext } from './social-tokens.types';

export class OAuthService {
  private readonly postizApiUrl: string;
  private readonly serviceKey: string;
  private readonly middlewareBackendUrl: string;

  constructor() {
    this.postizApiUrl = config.postiz?.apiUrl || process.env.POSTIZ_API_URL || 'http://localhost:3000';
    this.serviceKey = config.postiz?.serviceKey || process.env.POSTIZ_SERVICE_KEY || '';
    this.middlewareBackendUrl = config.backend?.url || process.env.BACKEND_URL || 'http://localhost:3002';

    if (!this.serviceKey) {
      throw new Error('POSTIZ_SERVICE_KEY environment variable is required');
    }
  }

  /**
   * Get OAuth authorization URL from Postiz
   */
  async getOAuthUrl(
    platform: string,
    context: OAuthContext,
    externalUrl?: string
  ): Promise<string> {
    try {
      const params = new URLSearchParams();

      // Add external URL if provided (for platforms like Mastodon)
      if (externalUrl) {
        params.append('externalUrl', externalUrl);
      }

      // Store context in callback URL for state management
      const callbackUrl = `${this.middlewareBackendUrl}/oauth/${platform}/callback`;
      const stateData = {
        context,
        callbackUrl,
      };
      const encodedState = Buffer.from(JSON.stringify(stateData)).toString('base64');

      console.log(`Getting OAuth URL for platform: ${platform}`);

      const response = await fetch(
        `${this.postizApiUrl}/integrations/social/${platform}?${params.toString()}`,
        {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${this.serviceKey}`,
            'Content-Type': 'application/json',
          },
        }
      );

      if (!response.ok) {
        throw new Error(`Postiz API returned ${response.status}: ${response.statusText}`);
      }

      const data: PostizOAuthUrlResponse = await response.json();

      if (data.err) {
        throw new Error(data.message || 'Failed to get OAuth URL');
      }

      if (!data.url) {
        throw new Error('No OAuth URL returned from Postiz');
      }

      // Append our state parameter to the OAuth URL
      const oauthUrl = new URL(data.url);
      oauthUrl.searchParams.set('state', encodedState);

      console.log(`Generated OAuth URL for ${platform}`);
      return oauthUrl.toString();

    } catch (error: any) {
      console.error(`Failed to get OAuth URL for ${platform}:`, error);
      throw new Error(`Failed to initiate ${platform} OAuth: ${error.message}`);
    }
  }

  /**
   * Complete OAuth flow via Postiz external endpoint
   */
  async completeOAuth(
    platform: string,
    code: string,
    state: string,
    context: OAuthContext
  ): Promise<PostizOAuthExternalResponse> {
    try {
      console.log(`Completing OAuth for platform: ${platform}`);

      const requestBody = {
        code,
        state,
        externalContext: {
          externalUserId: context.externalUserId,
          externalService: 'middleware',
          externalWorkspaceId: context.externalWorkspaceId,
          returnUrl: context.returnUrl,
        },
      };

      const response = await fetch(
        `${this.postizApiUrl}/auth/oauth/${platform}/external`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${this.serviceKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(requestBody),
        }
      );

      if (!response.ok) {
        throw new Error(`Postiz API returned ${response.status}: ${response.statusText}`);
      }

      const data: PostizOAuthExternalResponse = await response.json();

      if (!data.success) {
        throw new Error(data.error || 'OAuth completion failed');
      }

      console.log(`OAuth completed successfully for ${platform}, integrationId: ${data.integrationId}`);
      return data;

    } catch (error: any) {
      console.error(`Failed to complete OAuth for ${platform}:`, error);
      throw new Error(`Failed to complete ${platform} OAuth: ${error.message}`);
    }
  }

  /**
   * Get list of supported social platforms
   */
  getSupportedPlatforms(): string[] {
    return [
      'x', 'linkedin', 'linkedin-page', 'reddit', 'instagram', 'instagram-standalone',
      'facebook', 'threads', 'youtube', 'tiktok', 'pinterest', 'dribbble',
      'discord', 'slack', 'mastodon', 'bluesky', 'lemmy', 'farcaster',
      'telegram', 'nostr', 'vk'
    ];
  }

  /**
   * Validate platform is supported
   */
  validatePlatform(platform: string): boolean {
    return this.getSupportedPlatforms().includes(platform);
  }

  /**
   * Get integration details from Postiz (for connection management)
   */
  async getIntegrationDetails(integrationId: string) {
    try {
      const response = await fetch(
        `${this.postizApiUrl}/integrations/${integrationId}`,
        {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${this.serviceKey}`,
            'Content-Type': 'application/json',
          },
        }
      );

      if (!response.ok) {
        throw new Error(`Postiz API returned ${response.status}: ${response.statusText}`);
      }

      return await response.json();

    } catch (error: any) {
      console.error(`Failed to get integration details for ${integrationId}:`, error);
      throw new Error(`Failed to get integration details: ${error.message}`);
    }
  }

  /**
   * Disconnect integration from Postiz
   */
  async disconnectIntegration(integrationId: string) {
    try {
      const response = await fetch(
        `${this.postizApiUrl}/integrations`,
        {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${this.serviceKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ id: integrationId }),
        }
      );

      if (!response.ok) {
        throw new Error(`Postiz API returned ${response.status}: ${response.statusText}`);
      }

      console.log(`Disconnected integration: ${integrationId}`);
      return await response.json();

    } catch (error: any) {
      console.error(`Failed to disconnect integration ${integrationId}:`, error);
      throw new Error(`Failed to disconnect integration: ${error.message}`);
    }
  }
}