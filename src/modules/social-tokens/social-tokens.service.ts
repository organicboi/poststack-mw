import { db } from '../../database/database.service';
import { SocialAccount, CreateSocialAccountDto, UpdateSocialAccountDto } from './social-tokens.types';

export class SocialTokensService {
  /**
   * Store social account connection reference
   * This stores ONLY the Postiz integration ID, NOT actual OAuth tokens
   * Tokens are managed by Postiz, we just track the connection
   */
  async storeSocialAccountConnection(
    userId: string,
    workspaceId: string,
    platform: string,
    connectionData: {
      postizIntegrationId: string;
      platformUserId?: string;
      platformUsername?: string;
      displayName?: string;
      avatar?: string;
      connectionMetadata?: any;
    }
  ): Promise<SocialAccount> {
    try {
      // Check if connection already exists
      const existing = await this.getSocialAccountByWorkspaceAndPlatform(userId, workspaceId, platform);

      if (existing) {
        // Update existing connection
        return await this.updateSocialAccountConnection(existing.id, {
          postizIntegrationId: connectionData.postizIntegrationId,
          platformUserId: connectionData.platformUserId,
          platformUsername: connectionData.platformUsername,
          displayName: connectionData.displayName,
          avatar: connectionData.avatar,
          connectionMetadata: connectionData.connectionMetadata || {},
          isActive: true,
        });
      }

      // Create new connection
      const { data: socialAccount, error } = await db.adminClient
        .from('social_accounts')
        .insert({
          user_id: userId,
          workspace_id: workspaceId,
          platform,
          postiz_integration_id: connectionData.postizIntegrationId,
          platform_user_id: connectionData.platformUserId,
          platform_username: connectionData.platformUsername,
          display_name: connectionData.displayName,
          avatar: connectionData.avatar,
          is_active: true,
          connection_metadata: connectionData.connectionMetadata || {},
        })
        .select()
        .single();

      if (error) {
        throw new Error(`Failed to store social account connection: ${error.message}`);
      }

      return this.mapToSocialAccount(socialAccount);
    } catch (error: any) {
      throw new Error(`Failed to store social account connection: ${error.message}`);
    }
  }

  /**
   * Get social account connection by user and platform
   */
  async getSocialAccountConnection(userId: string, platform: string): Promise<SocialAccount | null> {
    try {
      const { data: socialAccount, error } = await db.adminClient
        .from('social_accounts')
        .select('*')
        .eq('user_id', userId)
        .eq('platform', platform)
        .eq('is_active', true)
        .single();

      if (error && error.code !== 'PGRST116') {
        throw new Error(error.message);
      }

      return socialAccount ? this.mapToSocialAccount(socialAccount) : null;
    } catch (error: any) {
      if (error.message.includes('not found')) return null;
      throw error;
    }
  }

  /**
   * Get social account connection by user, workspace and platform
   */
  async getSocialAccountByWorkspaceAndPlatform(
    userId: string,
    workspaceId: string,
    platform: string
  ): Promise<SocialAccount | null> {
    try {
      const { data: socialAccount, error } = await db.adminClient
        .from('social_accounts')
        .select('*')
        .eq('user_id', userId)
        .eq('workspace_id', workspaceId)
        .eq('platform', platform)
        .eq('is_active', true)
        .single();

      if (error && error.code !== 'PGRST116') {
        throw new Error(error.message);
      }

      return socialAccount ? this.mapToSocialAccount(socialAccount) : null;
    } catch (error: any) {
      if (error.message.includes('not found')) return null;
      throw error;
    }
  }

  /**
   * Get all connected platforms for a user
   */
  async getUserConnectedPlatforms(userId: string): Promise<SocialAccount[]> {
    const { data: socialAccounts, error } = await db.adminClient
      .from('social_accounts')
      .select('*, workspaces(id, name)')
      .eq('user_id', userId)
      .eq('is_active', true)
      .order('connected_at', { ascending: false });

    if (error) {
      throw new Error(`Failed to get user connected platforms: ${error.message}`);
    }

    return (socialAccounts || []).map(account => this.mapToSocialAccount(account));
  }

  /**
   * Get all connected platforms for a workspace
   */
  async getWorkspaceConnectedPlatforms(workspaceId: string): Promise<SocialAccount[]> {
    const { data: socialAccounts, error } = await db.adminClient
      .from('social_accounts')
      .select('*, users(id, name, email)')
      .eq('workspace_id', workspaceId)
      .eq('is_active', true)
      .order('connected_at', { ascending: false });

    if (error) {
      throw new Error(`Failed to get workspace connected platforms: ${error.message}`);
    }

    return (socialAccounts || []).map(account => this.mapToSocialAccount(account));
  }

  /**
   * Update social account connection
   */
  async updateSocialAccountConnection(
    id: string,
    updateData: {
      platformUserId?: string;
      platformUsername?: string;
      displayName?: string;
      avatar?: string;
      connectionMetadata?: any;
      isActive?: boolean;
      postizIntegrationId?: string;
    }
  ): Promise<SocialAccount> {
    const { data: updatedAccount, error } = await db.adminClient
      .from('social_accounts')
      .update({
        platform_user_id: updateData.platformUserId,
        platform_username: updateData.platformUsername,
        display_name: updateData.displayName,
        avatar: updateData.avatar,
        connection_metadata: updateData.connectionMetadata,
        is_active: updateData.isActive,
        postiz_integration_id: updateData.postizIntegrationId,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to update social account connection: ${error.message}`);
    }

    return this.mapToSocialAccount(updatedAccount);
  }

  /**
   * Disconnect a social platform
   */
  async disconnectPlatform(userId: string, platform: string): Promise<void> {
    const socialAccount = await this.getSocialAccountConnection(userId, platform);

    if (!socialAccount) {
      throw new Error(`No ${platform} connection found for user`);
    }

    const { error } = await db.adminClient
      .from('social_accounts')
      .delete()
      .eq('id', socialAccount.id);

    if (error) {
      throw new Error(`Failed to disconnect platform: ${error.message}`);
    }
  }

  /**
   * Disconnect a social platform by ID
   */
  async disconnectPlatformById(id: string): Promise<{ platform: string }> {
    const { data: socialAccount, error: getError } = await db.adminClient
      .from('social_accounts')
      .select('platform')
      .eq('id', id)
      .single();

    if (getError) {
      throw new Error(`Social account not found: ${getError.message}`);
    }

    const { error } = await db.adminClient
      .from('social_accounts')
      .update({ is_active: false })
      .eq('id', id);

    if (error) {
      throw new Error(`Failed to disconnect platform: ${error.message}`);
    }

    return { platform: socialAccount.platform };
  }

  /**
   * Find social account by Postiz integration ID (for webhooks)
   */
  async findByPostizIntegrationId(postizIntegrationId: string): Promise<SocialAccount | null> {
    const { data: socialAccount, error } = await db.adminClient
      .from('social_accounts')
      .select('*, users(id, name, email), workspaces(id, name)')
      .eq('postiz_integration_id', postizIntegrationId)
      .eq('is_active', true)
      .single();

    if (error && error.code !== 'PGRST116') {
      throw new Error(`Failed to find social account: ${error.message}`);
    }

    return socialAccount ? this.mapToSocialAccount(socialAccount) : null;
  }

  /**
   * Get social accounts for post publishing
   */
  async getSocialAccountsForPublishing(
    userId: string,
    workspaceId: string,
    platforms: string[]
  ): Promise<SocialAccount[]> {
    const { data: socialAccounts, error } = await db.adminClient
      .from('social_accounts')
      .select('id, platform, postiz_integration_id, platform_username, display_name')
      .eq('user_id', userId)
      .eq('workspace_id', workspaceId)
      .in('platform', platforms)
      .eq('is_active', true);

    if (error) {
      throw new Error(`Failed to get social accounts for publishing: ${error.message}`);
    }

    return (socialAccounts || []).map(account => this.mapToSocialAccount(account));
  }

  /**
   * Check if user has connected platforms for a workspace
   */
  async hasConnectedPlatforms(userId: string, workspaceId: string, platforms: string[]): Promise<boolean> {
    const connectedAccounts = await this.getSocialAccountsForPublishing(userId, workspaceId, platforms);
    return connectedAccounts.length > 0;
  }

  /**
   * Get platform connection status for user and workspace
   */
  async getPlatformConnectionStatus(userId: string, workspaceId: string, platform: string) {
    try {
      const connection = await this.getSocialAccountByWorkspaceAndPlatform(userId, workspaceId, platform);
      return {
        connected: !!connection,
        platform,
        connection,
      };
    } catch (error: any) {
      return {
        connected: false,
        platform,
        error: error.message,
      };
    }
  }

  private mapToSocialAccount(data: any): SocialAccount {
    return {
      id: data.id,
      userId: data.user_id,
      workspaceId: data.workspace_id,
      platform: data.platform,
      postizIntegrationId: data.postiz_integration_id,
      platformUserId: data.platform_user_id,
      platformUsername: data.platform_username,
      displayName: data.display_name,
      avatar: data.avatar,
      isActive: data.is_active,
      connectionMetadata: data.connection_metadata || {},
      connectedAt: data.connected_at,
      updatedAt: data.updated_at,
      workspace: data.workspaces ? {
        id: data.workspaces.id,
        name: data.workspaces.name,
      } : undefined,
      user: data.users ? {
        id: data.users.id,
        name: data.users.name,
        email: data.users.email,
      } : undefined,
    };
  }
}