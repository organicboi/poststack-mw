import { Router, Request, Response } from 'express';
import { WorkspaceService } from './workspace.service';
import {
  authenticateWorkspaceRequest,
  validateWorkspaceId,
  validateUserId,
  validateAccountId,
  validateWorkspaceData,
  validateMemberInviteData,
  validateMemberRoleData,
  validateSocialAccountData,
  handleWorkspaceError,
  logWorkspaceRequest,
  rateLimitWorkspaceRequests,
  AuthenticatedRequest,
} from './workspace.middleware';

const router = Router();
const workspaceService = new WorkspaceService();

// Apply middleware to all routes
router.use(logWorkspaceRequest);
router.use(rateLimitWorkspaceRequests);
router.use(authenticateWorkspaceRequest);

// Helper to set workspace context headers
const setWorkspaceHeaders = (
  res: Response,
  workspaceId: string,
  workspaceName: string,
  userRole: string,
  userId: string,
  userEmail: string,
  accountIds?: string[]
) => {
  res.set('x-workspace-id', workspaceId);
  res.set('x-workspace-name', workspaceName);
  res.set('x-workspace-user-role', userRole);
  res.set('x-user-id', userId);
  res.set('x-user-email', userEmail || '');
  if (accountIds && accountIds.length > 0) {
    res.set('x-workspace-accounts', JSON.stringify(accountIds));
  }
};

/**
 * GET /api/v1/workspaces
 * Get all workspaces for the authenticated user
 */
router.get('/', async (req: AuthenticatedRequest, res: Response, next) => {
  try {
    const user = req.user!;
    const workspaces = await workspaceService.getUserWorkspaces(user.id);

    res.json({
      success: true,
      workspaces,
    });
  } catch (error: any) {
    next(error);
  }
});

/**
 * POST /api/v1/workspaces
 * Create a new workspace
 */
router.post(
  '/',
  validateWorkspaceData,
  async (req: AuthenticatedRequest, res: Response, next) => {
    try {
      const user = req.user!;
      const { name } = req.body;

      const workspace = await workspaceService.createWorkspace(
        { name },
        user.id
      );

      // Set context headers
      setWorkspaceHeaders(
        res,
        workspace.id,
        workspace.name,
        'owner',
        user.id,
        user.email || ''
      );

      res.status(201).json({
        success: true,
        workspace,
      });
    } catch (error: any) {
      next(error);
    }
  }
);

/**
 * GET /api/v1/workspaces/:id
 * Get detailed information about a specific workspace
 */
router.get(
  '/:id',
  validateWorkspaceId,
  async (req: AuthenticatedRequest, res: Response, next) => {
    try {
      const user = req.user!;
      const { id } = req.params;

      const workspace = await workspaceService.getWorkspaceDetails(id, user.id);

      // Get account IDs for this workspace
      const socialAccounts = await workspaceService.getWorkspaceSocialAccounts(
        id,
        user.id
      );
      const accountIds = socialAccounts.map(
        (account) => account.social_account_id
      );

      // Set context headers
      setWorkspaceHeaders(
        res,
        workspace.id,
        workspace.name,
        workspace.role!,
        user.id,
        user.email || '',
        accountIds
      );

      res.json({
        success: true,
        workspace,
      });
    } catch (error: any) {
      next(error);
    }
  }
);

/**
 * PUT /api/v1/workspaces/:id
 * Update workspace details
 */
/**
 * PUT /api/v1/workspaces/:id
 * Update workspace details
 */
router.put(
  '/:id',
  validateWorkspaceId,
  validateWorkspaceData,
  async (req: AuthenticatedRequest, res: Response, next) => {
    try {
      const user = req.user!;
      const { id } = req.params;
      const { name } = req.body;

      const workspace = await workspaceService.updateWorkspace(
        id,
        { name },
        user.id
      );

      // Get user's workspace context for headers
      const context = await workspaceService.getUserWorkspaceContext(user.id);
      const userRole = context?.user_role || 'viewer';

      // Set context headers
      setWorkspaceHeaders(
        res,
        workspace.id,
        workspace.name,
        userRole,
        user.id,
        user.email || ''
      );

      res.json({
        success: true,
        workspace,
      });
    } catch (error: any) {
      next(error);
    }
  }
);

/**
 * DELETE /api/v1/workspaces/:id
 * Delete a workspace
 */
router.delete(
  '/:id',
  validateWorkspaceId,
  async (req: AuthenticatedRequest, res: Response, next) => {
    try {
      const user = req.user!;
      const { id } = req.params;

      await workspaceService.deleteWorkspace(id, user.id);

      res.json({
        success: true,
        message: 'Workspace deleted successfully',
      });
    } catch (error: any) {
      next(error);
    }
  }
);

/**
 * GET /api/v1/workspaces/:id/members
 * Get all members of a workspace
 */
router.get(
  '/:id/members',
  validateWorkspaceId,
  async (req: AuthenticatedRequest, res: Response, next) => {
    try {
      const user = req.user!;
      const { id } = req.params;

      const members = await workspaceService.getWorkspaceMembers(id, user.id);

      res.json({
        success: true,
        members,
      });
    } catch (error: any) {
      next(error);
    }
  }
);

/**
 * POST /api/v1/workspaces/:id/members
 * Invite a user to join the workspace
 */
router.post(
  '/:id/members',
  validateWorkspaceId,
  validateMemberInviteData,
  async (req: AuthenticatedRequest, res: Response, next) => {
    try {
      const user = req.user!;
      const { id } = req.params;
      const { email, role } = req.body;

      const membership = await workspaceService.inviteMember(
        id,
        { email, role },
        user.id
      );

      res.status(201).json({
        success: true,
        membership,
      });
    } catch (error: any) {
      next(error);
    }
  }
);

/**
 * PATCH /api/v1/workspaces/:id/members/:userId
 * Update a member's role in the workspace
 */
router.patch(
  '/:id/members/:userId',
  validateWorkspaceId,
  validateUserId,
  validateMemberRoleData,
  async (req: AuthenticatedRequest, res: Response, next) => {
    try {
      const user = req.user!;
      const { id, userId } = req.params;
      const { role } = req.body;

      const membership = await workspaceService.updateMemberRole(
        id,
        userId,
        { role },
        user.id
      );

      res.json({
        success: true,
        membership,
      });
    } catch (error: any) {
      next(error);
    }
  }
);

/**
 * DELETE /api/v1/workspaces/:id/members/:userId
 * Remove a member from the workspace
 */
router.delete(
  '/:id/members/:userId',
  validateWorkspaceId,
  validateUserId,
  async (req: AuthenticatedRequest, res: Response, next) => {
    try {
      const user = req.user!;
      const { id, userId } = req.params;

      await workspaceService.removeMember(id, userId, user.id);

      res.json({
        success: true,
        message: 'Member removed successfully',
      });
    } catch (error: any) {
      next(error);
    }
  }
);

/**
 * GET /api/v1/workspaces/:id/social-accounts
 * Get all social accounts linked to a workspace
 */
router.get(
  '/:id/social-accounts',
  validateWorkspaceId,
  async (req: AuthenticatedRequest, res: Response, next) => {
    try {
      const user = req.user!;
      const { id } = req.params;

      const accounts = await workspaceService.getWorkspaceSocialAccounts(
        id,
        user.id
      );

      res.json({
        success: true,
        accounts,
      });
    } catch (error: any) {
      next(error);
    }
  }
);

/**
 * POST /api/v1/workspaces/:id/social-accounts
 * Link a social account to a workspace
 */
router.post(
  '/:id/social-accounts',
  validateWorkspaceId,
  validateSocialAccountData,
  async (req: AuthenticatedRequest, res: Response, next) => {
    try {
      const user = req.user!;
      const { id } = req.params;
      const { accountId } = req.body;

      const account = await workspaceService.linkSocialAccount(
        id,
        { accountId },
        user.id
      );

      res.status(201).json({
        success: true,
        account,
      });
    } catch (error: any) {
      next(error);
    }
  }
);

/**
 * DELETE /api/v1/workspaces/:id/social-accounts/:accountId
 * Unlink a social account from a workspace
 */
router.delete(
  '/:id/social-accounts/:accountId',
  validateWorkspaceId,
  validateAccountId,
  async (req: AuthenticatedRequest, res: Response, next) => {
    try {
      const user = req.user!;
      const { id, accountId } = req.params;

      await workspaceService.unlinkSocialAccount(id, accountId, user.id);

      res.json({
        success: true,
        message: 'Social account unlinked successfully',
      });
    } catch (error: any) {
      next(error);
    }
  }
);

// Apply error handling middleware at the end
router.use(handleWorkspaceError);

export { router as workspaceRoutes };
