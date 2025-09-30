export interface TokenData {
  accessToken: string;
  accessTokenSecret?: string; // For Twitter/X
  refreshToken?: string;
  pageId?: string; // For Facebook pages
  personId?: string; // For LinkedIn personal
  companyId?: string; // For LinkedIn company
  platformUserId?: string;
  expiresAt?: string;
}

export interface CreatePostDto {
  externalUserId: string;
  externalService: string;
  content: string;
  platforms: string[];
  publishDate?: string;
  media?: string[]; // Array of media URLs or IDs
  teamContext?: string;
  metadata?: {
    myAppUserId?: string;
    myAppTeamId?: string;
    myAppWorkspaceId?: string;
    myAppPostId?: string;
    [key: string]: any;
  };
}

export interface PostizResponse {
  id: string;
  posts?: Array<{
    id: string;
    platform: string;
  }>;
  status?: string;
  message?: string;
}

export interface PostStatusResponse {
  id: string;
  state: 'QUEUE' | 'PROCESSING' | 'PUBLISHED' | 'ERROR' | 'DRAFT';
  publishedPosts?: Array<{
    platform: string;
    postId: string;
    url: string;
  }>;
  error?: string;
  metadata?: any;
}

export interface MediaUploadResponse {
  id: string;
  url: string;
  filename: string;
  mimeType: string;
  size: number;
}

export interface UserIntegrationsResponse {
  integrations: Array<{
    id: string;
    platform: string;
    platformUserId: string;
    platformUsername: string;
    isActive: boolean;
    connectedAt: string;
  }>;
}

export interface PlatformAnalyticsResponse {
  platform: string;
  userId: string;
  dateRange: string;
  metrics: {
    posts: number;
    likes: number;
    shares: number;
    comments: number;
    reach: number;
    impressions: number;
  };
  posts: Array<{
    id: string;
    content: string;
    publishedAt: string;
    metrics: {
      likes: number;
      shares: number;
      comments: number;
      reach: number;
    };
  }>;
}