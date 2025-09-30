import { Router, Response } from 'express';
import { PostsService } from './posts.service';
import { asyncHandler } from '../../utils/async-handler';
import { AuthenticatedRequest } from '../../workspace/workspace.middleware';
import { PaginationOptions } from '../../types/core-modules.types';

const router = Router();
const postsService = new PostsService();

// Create new post
router.post(
  '/',
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required',
      });
    }

    const postData = req.body;

    if (!postData.content) {
      return res.status(400).json({
        success: false,
        message: 'Post content is required',
      });
    }

    const post = await postsService.createPost(req.user.id, postData);

    return res.status(201).json({
      success: true,
      data: post,
      message: 'Post created successfully',
    });
  })
);

// Get all user posts with pagination and filtering
router.get(
  '/',
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required',
      });
    }

    const options: PaginationOptions & {
      workspace_id?: string;
      status?: string;
      search?: string;
    } = {
      page: req.query.page ? parseInt(req.query.page as string) : 1,
      limit: req.query.limit ? parseInt(req.query.limit as string) : 10,
      sortBy: req.query.sortBy as string,
      sortOrder: req.query.sortOrder as 'asc' | 'desc',
      workspace_id: req.query.workspace_id as string,
      status: req.query.status as string,
      search: req.query.search as string,
    };

    const { posts, total } = await postsService.getUserPosts(
      req.user.id,
      options
    );

    const totalPages = Math.ceil(total / (options.limit || 10));

    return res.json({
      success: true,
      data: posts,
      pagination: {
        page: options.page || 1,
        limit: options.limit || 10,
        total,
        totalPages,
      },
    });
  })
);

// Get specific post
router.get(
  '/:id',
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required',
      });
    }

    const postId = req.params.id as string;
    const post = await postsService.getPost(req.user.id, postId);

    return res.json({
      success: true,
      data: post,
    });
  })
);

// Update post
router.patch(
  '/:id',
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required',
      });
    }

    const postId = req.params.id as string;
    const post = await postsService.updatePost(req.user.id, postId, req.body);

    return res.json({
      success: true,
      data: post,
      message: 'Post updated successfully',
    });
  })
);

// Delete post
router.delete(
  '/:id',
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required',
      });
    }

    const postId = req.params.id as string;
    await postsService.deletePost(req.user.id, postId);

    return res.json({
      success: true,
      message: 'Post deleted successfully',
    });
  })
);

// Schedule post
router.post(
  '/:id/schedule',
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required',
      });
    }

    const { scheduledFor } = req.body;

    if (!scheduledFor) {
      return res.status(400).json({
        success: false,
        message: 'Scheduled date is required',
      });
    }

    const postId = req.params.id as string;
    const post = await postsService.schedulePost(
      req.user.id,
      postId,
      scheduledFor
    );

    return res.json({
      success: true,
      data: post,
      message: 'Post scheduled successfully',
    });
  })
);

// Cancel scheduled post
router.post(
  '/:id/cancel',
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required',
      });
    }

    const postId = req.params.id as string;
    const post = await postsService.cancelScheduledPost(req.user.id, postId);

    return res.json({
      success: true,
      data: post,
      message: 'Post schedule cancelled successfully',
    });
  })
);

export { router as postsRoutes };
export default router;
