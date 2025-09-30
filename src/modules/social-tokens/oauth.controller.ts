import { Router, Request, Response } from 'express';
import { OAuthService } from './oauth.service';
import { SocialTokensService } from './social-tokens.service';
import { BillingService } from '../billing/billing.service';
import { authenticateUser, AuthenticatedRequest } from '../../auth/auth.middleware';
import { asyncHandler } from '../../utils/async-handler';
import { OAuthContext, OAuthInitiateRequest, DisconnectPlatformRequest } from './social-tokens.types';
import { config } from '../../common/config';

const router = Router();
const oauthService = new OAuthService();
const socialTokensService = new SocialTokensService();
const billingService = new BillingService();

// Get list of supported social platforms
router.get('/supported-platforms', (req: Request, res: Response) => {
  res.json({
    success: true,
    data: {
      platforms: oauthService.getSupportedPlatforms(),
    }
  });
});

// Initiate OAuth flow for a social platform
router.post('/initiate',
  authenticateUser,
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { platform, workspaceId, returnUrl, externalUrl }: OAuthInitiateRequest = req.body;

    if (!oauthService.validatePlatform(platform)) {
      return res.status(400).json({
        success: false,
        error: `Unsupported platform: ${platform}`
      });
    }

    // Check if user can add more social accounts
    const canAddSocial = await billingService.canAddSocialAccount(req.user!.id);
    if (!canAddSocial) {
      return res.status(402).json({
        success: false,
        error: 'You have reached your social account limit. Please upgrade your plan.',
        code: 'SOCIAL_ACCOUNT_LIMIT_REACHED'
      });
    }

    // Create OAuth context for this user/workspace
    const context: OAuthContext = {
      externalUserId: req.user!.id,
      externalService: 'middleware',
      externalWorkspaceId: workspaceId || req.user!.id, // Default to user ID if no workspace
      returnUrl: returnUrl || `${config.frontend?.url || process.env.FRONTEND_URL}/connections`,
    };

    try {
      const oauthUrl = await oauthService.getOAuthUrl(platform, context, externalUrl);

      console.log(`OAuth initiated for user ${req.user!.id}, platform ${platform}`);

      res.json({
        success: true,
        data: {
          platform,
          oauthUrl,
          message: `Redirect user to this URL to authorize ${platform} connection`,
        }
      });

    } catch (error: any) {
      console.error(`OAuth initiation failed:`, error);
      res.status(400).json({
        success: false,
        error: error.message || 'Failed to initiate OAuth'
      });
    }
  })
);

// Handle OAuth callback from social platforms
router.get('/:platform/callback',
  asyncHandler(async (req: Request, res: Response) => {
    const { platform } = req.params;
    const { code, state, error } = req.query;

    // Handle OAuth errors (user denied, etc.)
    if (error) {
      console.warn(`OAuth error for ${platform}: ${error}`);
      return res.redirect(
        `${config.frontend?.url || process.env.FRONTEND_URL}/connections?error=${encodeURIComponent(error as string)}&platform=${platform}`
      );
    }

    // Validate required parameters
    if (!code || !state) {
      console.error(`Missing OAuth parameters for ${platform}: code=${!!code}, state=${!!state}`);
      return res.redirect(
        `${config.frontend?.url || process.env.FRONTEND_URL}/connections?error=invalid_request&platform=${platform}`
      );
    }

    try {
      // Decode state to get context
      const stateData = JSON.parse(Buffer.from(state as string, 'base64').toString());
      const context: OAuthContext = stateData.context;

      if (!context || !context.externalUserId) {
        throw new Error('Invalid OAuth state');
      }

      // Complete OAuth flow with Postiz
      const oauthResult = await oauthService.completeOAuth(platform, code as string, state as string, context);

      if (!oauthResult.success || !oauthResult.integrationId) {
        throw new Error(oauthResult.error || 'OAuth completion failed');
      }

      // Store connection metadata in social tokens table
      await socialTokensService.storeSocialAccountConnection(
        context.externalUserId,
        context.externalWorkspaceId || context.externalUserId, // Default workspace to user ID
        platform,
        {
          postizIntegrationId: oauthResult.integrationId,
          platformUserId: oauthResult.integrationId, // Use integrationId as reference
          platformUsername: platform, // Will be updated with real username later
          displayName: `${platform} Account`,
          connectionMetadata: {
            connectedAt: new Date().toISOString(),
            oauthProvider: 'postiz',
          },
        }
      );

      // Increment social account usage
      await billingService.incrementSocialAccountUsage(context.externalUserId);

      console.log(`OAuth completed successfully for user ${context.externalUserId}, platform ${platform}, integration ${oauthResult.integrationId}`);

      // Redirect to success page
      return res.redirect(
        `${context.returnUrl}?success=true&platform=${platform}&integration_id=${oauthResult.integrationId}`
      );

    } catch (error: any) {
      console.error(`OAuth callback error for ${platform}:`, error);

      return res.redirect(
        `${config.frontend?.url || process.env.FRONTEND_URL}/connections?error=${encodeURIComponent(error.message)}&platform=${platform}`
      );
    }
  })
);

// Get user's connected social platforms
router.get('/connections/:userId',
  authenticateUser,
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { userId } = req.params;

    // Ensure user can only access their own connections
    if (req.user!.id !== userId) {
      return res.status(403).json({
        success: false,
        error: 'Unauthorized to access these connections'
      });
    }

    try {
      const connections = await socialTokensService.getUserConnectedPlatforms(userId);

      res.json({
        success: true,
        data: {
          connections: connections.map(conn => ({
            id: conn.id,
            platform: conn.platform,
            integrationId: conn.postizIntegrationId,
            platformUsername: conn.platformUsername,
            displayName: conn.displayName,
            avatar: conn.avatar,
            isActive: conn.isActive,
            connectedAt: conn.connectedAt,
            lastUpdated: conn.updatedAt,
            workspace: conn.workspace,
          })),
        }
      });

    } catch (error: any) {
      console.error(`Failed to get connections for user ${userId}:`, error);
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve connections'
      });
    }
  })
);

// Disconnect a social platform
router.post('/disconnect',
  authenticateUser,
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { platform, workspaceId }: DisconnectPlatformRequest = req.body;

    try {
      // Get the connection to find integration ID
      const connection = await socialTokensService.getSocialAccountConnection(req.user!.id, platform);

      if (!connection) {
        return res.status(404).json({
          success: false,
          error: 'Platform not connected'
        });
      }

      const integrationId = connection.postizIntegrationId;

      if (!integrationId) {
        return res.status(400).json({
          success: false,
          error: 'Invalid connection data'
        });
      }

      // Disconnect from Postiz
      await oauthService.disconnectIntegration(integrationId);

      // Remove from database
      await socialTokensService.disconnectPlatform(req.user!.id, platform);

      console.log(`Platform ${platform} disconnected for user ${req.user!.id}, integration ${integrationId}`);

      res.json({
        success: true,
        data: {
          message: `${platform} disconnected successfully`,
          platform,
        }
      });

    } catch (error: any) {
      console.error(`Failed to disconnect ${platform} for user ${req.user!.id}:`, error);
      res.status(400).json({
        success: false,
        error: `Failed to disconnect ${platform}: ${error.message}`
      });
    }
  })
);

// Check connection status for a platform
router.get('/connection/:platform/status',
  authenticateUser,
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { platform } = req.params;
    const { workspaceId } = req.query;

    try {
      const connection = await socialTokensService.getSocialAccountConnection(req.user!.id, platform);

      if (!connection) {
        return res.json({
          success: true,
          data: {
            connected: false,
            platform,
          }
        });
      }

      res.json({
        success: true,
        data: {
          connected: true,
          platform,
          integrationId: connection.postizIntegrationId,
          isActive: connection.isActive,
          connectedAt: connection.connectedAt,
          platformUsername: connection.platformUsername,
          displayName: connection.displayName,
        }
      });

    } catch (error: any) {
      console.error(`Failed to check connection status for ${platform}:`, error);
      res.status(500).json({
        success: false,
        error: 'Failed to check connection status'
      });
    }
  })
);

export default router;