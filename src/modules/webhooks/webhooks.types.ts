export interface WebhookPayload {
  event: string;
  data: any;
  timestamp?: string;
}

export interface PostizWebhookData {
  externalId?: string;
  postizPostId?: string;
  status?: string;
  platformResults?: any[];
  publishedAt?: string;
  scheduledAt?: string;
  failedAt?: string;
  error?: string;
  success?: boolean;
  confirmed?: boolean;
}

export interface AccountWebhookData {
  platform: string;
  accountId: string;
  integrationId?: string;
  status?: string;
  metadata?: any;
}

export interface WebhookLog {
  id: string;
  webhookType: string;
  postizPostId?: string;
  myapp1PostId?: string;
  payload: Record<string, any>;
  status: 'pending' | 'processed' | 'failed';
  processedAt?: string;
  errorMessage?: string;
  receivedAt: string;
}

export interface WebhookProcessingResult {
  success: boolean;
  message: string;
  webhookId?: string;
  error?: string;
}