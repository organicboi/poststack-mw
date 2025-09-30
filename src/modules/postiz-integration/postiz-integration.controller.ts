import { Router, Request, Response } from 'express';
import { PostizIntegrationService } from './postiz-integration.service';
import { authenticateUser, AuthenticatedRequest } from '../../auth/auth.middleware';
import { asyncHandler } from '../../utils/async-handler';
import { CreatePostDto } from './postiz-integration.types';

const router = Router();
const postizService = new PostizIntegrationService();

// Create a post in Postiz
router.post('/posts',
  authenticateUser,
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    try {
      const postData: CreatePostDto = {
        externalUserId: req.user!.id,
        externalService: 'middleware',
        ...req.body,
      };

      // Validate required fields
      if (!postData.content || !postData.platforms || !Array.isArray(postData.platforms)) {
        return res.status(400).json({
          success: false,
          error: 'Content and platforms array are required'
        });
      }

      const result = await postizService.createPost(postData);

      res.json({
        success: true,
        data: result,
        message: 'Post created successfully in Postiz'
      });

    } catch (error: any) {
      console.error('Failed to create post in Postiz:', error);
      res.status(400).json({
        success: false,
        error: error.message || 'Failed to create post in Postiz'
      });
    }
  })
);

// Get post status from Postiz
router.get('/posts/:postizPostId/status',
  authenticateUser,
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { postizPostId } = req.params;

      const status = await postizService.getPostStatus(postizPostId);

      res.json({
        success: true,
        data: status
      });

    } catch (error: any) {
      console.error('Failed to get post status:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to get post status'
      });
    }
  })
);

// Get user's connected integrations
router.get('/integrations',
  authenticateUser,
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    try {
      const integrations = await postizService.getUserIntegrations(req.user!.id);

      res.json({
        success: true,
        data: integrations
      });

    } catch (error: any) {
      console.error('Failed to get user integrations:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to get user integrations'
      });
    }
  })
);

// Get platform analytics
router.get('/analytics/:platform',
  authenticateUser,
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { platform } = req.params;
      const { date = '7' } = req.query;

      const analytics = await postizService.getUserPlatformAnalytics(
        req.user!.id,
        platform,
        date as string
      );

      res.json({
        success: true,
        data: analytics
      });

    } catch (error: any) {
      console.error('Failed to get platform analytics:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to get platform analytics'
      });
    }
  })
);

// Upload media to Postiz (placeholder - requires multer for file handling)
router.post('/media/upload',
  authenticateUser,
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    try {
      // TODO: Implement proper file upload with multer
      res.status(501).json({
        success: false,
        error: 'Media upload not yet implemented. Please add multer dependency.'
      });

    } catch (error: any) {
      console.error('Failed to upload media:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to upload media'
      });
    }
  })
);

// Disconnect a platform
router.post('/disconnect/:platform',
  authenticateUser,
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { platform } = req.params;

      const result = await postizService.disconnectPlatform(req.user!.id, platform);

      res.json({
        success: true,
        data: result,
        message: `${platform} disconnected successfully`
      });

    } catch (error: any) {
      console.error('Failed to disconnect platform:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to disconnect platform'
      });
    }
  })
);

// Health check for Postiz connection
router.get('/health',
  authenticateUser,
  asyncHandler(async (req: Request, res: Response) => {
    try {
      const isHealthy = await postizService.healthCheck();

      res.json({
        success: true,
        data: {
          postizHealthy: isHealthy,
          timestamp: new Date().toISOString(),
        }
      });

    } catch (error: any) {
      console.error('Failed to check Postiz health:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to check Postiz health'
      });
    }
  })
);

// Create post with social accounts (convenience endpoint)
router.post('/posts/social',
  authenticateUser,
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    try {
      const {
        workspaceId,
        content,
        socialAccountIds,
        publishDate,
        media
      } = req.body;

      // Validate required fields
      if (!content || !socialAccountIds || !Array.isArray(socialAccountIds)) {
        return res.status(400).json({
          success: false,
          error: 'Content and socialAccountIds array are required'
        });
      }

      const result = await postizService.createPostWithSocialAccounts(
        req.user!.id,
        workspaceId,
        content,
        socialAccountIds,
        publishDate,
        media
      );

      res.json({
        success: true,
        data: result,
        message: 'Post created successfully with social accounts'
      });

    } catch (error: any) {
      console.error('Failed to create post with social accounts:', error);
      res.status(400).json({
        success: false,
        error: error.message || 'Failed to create post with social accounts'
      });
    }
  })
);

export default router;