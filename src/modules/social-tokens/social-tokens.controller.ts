import { Router, Response } from 'express';
import { SocialTokensService } from './social-tokens.service';
import { authenticateUser, AuthenticatedRequest } from '../../auth/auth.middleware';
import { asyncHandler } from '../../utils/async-handler';
import { CreateSocialAccountDto, UpdateSocialAccountDto } from './social-tokens.types';

const router = Router();
const socialTokensService = new SocialTokensService();

// Get user's social tokens/connections
router.get('/:userId',
  authenticateUser,
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { userId } = req.params;

    // Ensure user can only access their own tokens
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
        data: connections.map(conn => ({
          id: conn.id,
          platform: conn.platform,
          postizIntegrationId: conn.postizIntegrationId,
          platformUserId: conn.platformUserId,
          platformUsername: conn.platformUsername,
          displayName: conn.displayName,
          avatar: conn.avatar,
          isActive: conn.isActive,
          workspaceId: conn.workspaceId,
          workspace: conn.workspace,
          connectedAt: conn.connectedAt,
          updatedAt: conn.updatedAt,
        }))
      });

    } catch (error: any) {
      console.error(`Failed to get social tokens for user ${userId}:`, error);
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve social connections'
      });
    }
  })
);

// Update social account connection
router.put('/:id',
  authenticateUser,
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { id } = req.params;
    const updateData: UpdateSocialAccountDto = req.body;

    try {
      const updatedConnection = await socialTokensService.updateSocialAccountConnection(id, updateData);

      res.json({
        success: true,
        data: {
          id: updatedConnection.id,
          platform: updatedConnection.platform,
          postizIntegrationId: updatedConnection.postizIntegrationId,
          platformUserId: updatedConnection.platformUserId,
          platformUsername: updatedConnection.platformUsername,
          displayName: updatedConnection.displayName,
          avatar: updatedConnection.avatar,
          isActive: updatedConnection.isActive,
          updatedAt: updatedConnection.updatedAt,
        },
        message: 'Social account connection updated successfully'
      });

    } catch (error: any) {
      console.error(`Failed to update social token ${id}:`, error);
      res.status(400).json({
        success: false,
        error: `Failed to update social account connection: ${error.message}`
      });
    }
  })
);

// Delete/disconnect social account
router.delete('/:id',
  authenticateUser,
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { id } = req.params;

    try {
      const result = await socialTokensService.disconnectPlatformById(id);

      res.json({
        success: true,
        data: {
          message: `${result.platform} connection disconnected successfully`,
          platform: result.platform,
        }
      });

    } catch (error: any) {
      console.error(`Failed to delete social token ${id}:`, error);
      res.status(400).json({
        success: false,
        error: `Failed to disconnect social account: ${error.message}`
      });
    }
  })
);

// Get social accounts for a workspace
router.get('/workspace/:workspaceId',
  authenticateUser,
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { workspaceId } = req.params;

    try {
      const connections = await socialTokensService.getWorkspaceConnectedPlatforms(workspaceId);

      res.json({
        success: true,
        data: connections.map(conn => ({
          id: conn.id,
          platform: conn.platform,
          postizIntegrationId: conn.postizIntegrationId,
          platformUsername: conn.platformUsername,
          displayName: conn.displayName,
          avatar: conn.avatar,
          isActive: conn.isActive,
          userId: conn.userId,
          user: conn.user,
          connectedAt: conn.connectedAt,
          updatedAt: conn.updatedAt,
        }))
      });

    } catch (error: any) {
      console.error(`Failed to get workspace social tokens for ${workspaceId}:`, error);
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve workspace social connections'
      });
    }
  })
);

// Get social accounts for publishing (used by posts service)
router.get('/publishing/:userId/:workspaceId',
  authenticateUser,
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { userId, workspaceId } = req.params;
    const { platforms } = req.query;

    // Ensure user can only access their own publishing accounts
    if (req.user!.id !== userId) {
      return res.status(403).json({
        success: false,
        error: 'Unauthorized to access these publishing accounts'
      });
    }

    try {
      const platformList = platforms ? (platforms as string).split(',') : [];
      const connections = await socialTokensService.getSocialAccountsForPublishing(
        userId,
        workspaceId,
        platformList
      );

      res.json({
        success: true,
        data: connections.map(conn => ({
          id: conn.id,
          platform: conn.platform,
          postizIntegrationId: conn.postizIntegrationId,
          platformUsername: conn.platformUsername,
          displayName: conn.displayName,
        }))
      });

    } catch (error: any) {
      console.error(`Failed to get publishing accounts for user ${userId}:`, error);
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve publishing accounts'
      });
    }
  })
);

// Check if user has connected platforms for posting
router.get('/check/:userId/:workspaceId',
  authenticateUser,
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { userId, workspaceId } = req.params;
    const { platforms } = req.query;

    // Ensure user can only check their own connections
    if (req.user!.id !== userId) {
      return res.status(403).json({
        success: false,
        error: 'Unauthorized to check these connections'
      });
    }

    try {
      const platformList = platforms ? (platforms as string).split(',') : [];
      const hasConnected = await socialTokensService.hasConnectedPlatforms(
        userId,
        workspaceId,
        platformList
      );

      res.json({
        success: true,
        data: {
          hasConnectedPlatforms: hasConnected,
          platforms: platformList,
        }
      });

    } catch (error: any) {
      console.error(`Failed to check connected platforms for user ${userId}:`, error);
      res.status(500).json({
        success: false,
        error: 'Failed to check connected platforms'
      });
    }
  })
);

export default router;