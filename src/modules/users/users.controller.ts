import { Router, Response } from 'express';
import { asyncHandler } from '../../utils/async-handler';
import { AuthenticatedRequest } from '../../workspace/workspace.middleware';
import { UsersService } from './users.service';

const usersService = new UsersService();

const router = Router();

// Get current user profile
router.get(
  '/me',
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required',
      });
    }

    const user = await usersService.findById(req.user.id);

    res.json({
      success: true,
      data: {
        id: user.id,
        email: user.email,
        name: user.name,
        display_name: user.display_name,
        plan_tier: user.plan_tier,
        is_active: user.is_active,
        avatar: user.avatar,
        bio: user.bio,
        created_at: user.created_at,
        updated_at: user.updated_at,
      },
    });
  })
);

// Update user profile
router.patch(
  '/me',
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required',
      });
    }

    const { name, display_name, avatar, bio } = req.body;

    const updatedUser = await usersService.updateUser(req.user.id, {
      name,
      display_name,
      avatar,
      bio,
    });

    res.json({
      success: true,
      data: updatedUser,
      message: 'Profile updated successfully',
    });
  })
);

// Get user statistics
router.get(
  '/stats',
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required',
      });
    }

    const stats = await usersService.getUserStats(req.user.id);

    res.json({
      success: true,
      data: stats,
    });
  })
);

// Deactivate account
router.post(
  '/deactivate',
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required',
      });
    }

    await usersService.deactivateUser(req.user.id);

    res.json({
      success: true,
      message: 'Account deactivated successfully',
    });
  })
);

export { router as usersRoutes };
export default router;
