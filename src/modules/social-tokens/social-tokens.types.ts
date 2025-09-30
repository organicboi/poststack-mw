export interface SocialAccount {
  id: string;
  userId: string;
  workspaceId?: string;
  platform: string;
  postizIntegrationId: string;
  platformUserId?: string;
  platformUsername?: string;
  displayName?: string;
  avatar?: string;
  isActive: boolean;
  connectionMetadata: Record<string, any>;
  connectedAt: string;
  updatedAt: string;
  workspace?: {
    id: string;
    name: string;
  };
  user?: {
    id: string;
    name: string;
    email: string;
  };
}

export interface CreateSocialAccountDto {
  workspaceId?: string;
  platform: string;
  postizIntegrationId: string;
  platformUserId?: string;
  platformUsername?: string;
  displayName?: string;
  avatar?: string;
  connectionMetadata?: Record<string, any>;
}

export interface UpdateSocialAccountDto {
  platformUserId?: string;
  platformUsername?: string;
  displayName?: string;
  avatar?: string;
  connectionMetadata?: Record<string, any>;
  isActive?: boolean;
}

export interface SocialAccountConnectionData {
  postizIntegrationId: string;
  platformUserId?: string;
  platformUsername?: string;
  displayName?: string;
  avatar?: string;
  connectionMetadata?: any;
}

export interface OAuthInitiateRequest {
  platform: string;
  workspaceId?: string;
  returnUrl?: string;
  externalUrl?: string; // For Mastodon-like instances
}

export interface PostizOAuthUrlResponse {
  url?: string;
  err?: boolean;
  message?: string;
}

export interface PostizOAuthExternalResponse {
  success: boolean;
  integrationId?: string;
  platform?: string;
  redirectUrl?: string;
  error?: string;
}

export interface OAuthContext {
  externalUserId: string;
  externalService: string;
  externalWorkspaceId?: string;
  returnUrl: string;
}

export interface DisconnectPlatformRequest {
  platform: string;
  workspaceId?: string;
}

export interface ConnectionStatusResponse {
  connected: boolean;
  platform: string;
  integrationId?: string;
  isActive?: boolean;
  connectedAt?: string;
  platformUsername?: string;
  error?: string;
}