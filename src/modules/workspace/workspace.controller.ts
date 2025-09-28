import { Router, Request, Response } from 'express';
import { WorkspaceService } from './workspace.service';
import {
  authenticateWorkspaceRequest,
  validateWorkspaceId,
  validateWorkspaceData,
  validateMemberInviteData,
  validateMemberRoleData,
  validateUserId,
  validateSocialAccountData,
  validateAccountId,
} from './workspace.middleware';
import { asyncHandler } from '../../utils/async-handler';
import { AuthenticatedRequest } from './workspace.middleware';

const workspaceService = new WorkspaceService();
const router = Router();

/**
 * Get all workspaces for the authenticated user
 */
router.get(
  '/',
  authenticateWorkspaceRequest,
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const userId = req.user!.id;
    const workspaces = await workspaceService.getUserWorkspaces(userId);

    res.status(200).json({
      success: true,
      data: workspaces,
    });
  })
);

/**
 * Create a new workspace
 */
router.post(
  '/',
  authenticateWorkspaceRequest,
  validateWorkspaceData,
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const userId = req.user!.id;
    const { name } = req.body;

    const workspace = await workspaceService.createWorkspace({ name }, userId);

    res.status(201).json({
      success: true,
      data: workspace,
    });
  })
);

/**
 * Get a specific workspace by ID with members
 */
router.get(
  '/:id',
  authenticateWorkspaceRequest,
  validateWorkspaceId,
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { id } = req.params;
    const userId = req.user!.id;

    const workspace = await workspaceService.getWorkspaceDetails(id, userId);

    res.status(200).json({
      success: true,
      data: workspace,
    });
  })
);

/**
 * Update a workspace
 */
router.patch(
  '/:id',
  authenticateWorkspaceRequest,
  validateWorkspaceId,
  validateWorkspaceData,
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { id } = req.params;
    const userId = req.user!.id;
    const { name } = req.body;

    const workspace = await workspaceService.updateWorkspace(
      id,
      { name },
      userId
    );

    res.status(200).json({
      success: true,
      data: workspace,
    });
  })
);

/**
 * Delete a workspace
 */
router.delete(
  '/:id',
  authenticateWorkspaceRequest,
  validateWorkspaceId,
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { id } = req.params;
    const userId = req.user!.id;

    await workspaceService.deleteWorkspace(id, userId);

    res.status(200).json({
      success: true,
      message: 'Workspace deleted successfully',
    });
  })
);

/**
 * Get all workspace members
 */
router.get(
  '/:id/members',
  authenticateWorkspaceRequest,
  validateWorkspaceId,
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { id } = req.params;
    const userId = req.user!.id;

    const members = await workspaceService.getWorkspaceMembers(id, userId);

    res.status(200).json({
      success: true,
      data: members,
    });
  })
);

/**
 * Invite a new member to workspace
 */
router.post(
  '/:id/members',
  authenticateWorkspaceRequest,
  validateWorkspaceId,
  validateMemberInviteData,
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { id } = req.params;
    const userId = req.user!.id;
    const { email, role } = req.body;

    const invite = await workspaceService.inviteMember(
      id,
      { email, role },
      userId
    );

    res.status(201).json({
      success: true,
      data: invite,
      message: 'Invitation sent successfully',
    });
  })
);

/**
 * Update a member's role - Not implemented in service yet
 */
router.patch(
  '/:id/members/:userId',
  authenticateWorkspaceRequest,
  validateWorkspaceId,
  validateUserId,
  validateMemberRoleData,
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    // Note: This functionality is not yet implemented in the service
    // Will need to implement workspaceService.updateMemberRole method

    const { id, userId: memberId } = req.params;
    const currentUserId = req.user!.id;
    const { role } = req.body;

    // TODO: Implement this method in service
    // await workspaceService.updateMemberRole(id, memberId, role, currentUserId);

    res.status(501).json({
      success: false,
      message: 'This feature is not yet implemented',
    });
  })
);

/**
 * Remove a member from workspace - Not implemented in service yet
 */
router.delete(
  '/:id/members/:userId',
  authenticateWorkspaceRequest,
  validateWorkspaceId,
  validateUserId,
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    // Note: This functionality is not yet implemented in the service
    // Will need to implement workspaceService.removeMember method

    const { id, userId: memberId } = req.params;
    const currentUserId = req.user!.id;

    // TODO: Implement this method in service
    // await workspaceService.removeMember(id, memberId, currentUserId);

    res.status(501).json({
      success: false,
      message: 'This feature is not yet implemented',
    });
  })
);

/**
 * Get workspace social accounts
 */
router.get(
  '/:id/social-accounts',
  authenticateWorkspaceRequest,
  validateWorkspaceId,
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { id } = req.params;
    const userId = req.user!.id;

    const accounts = await workspaceService.getWorkspaceSocialAccounts(
      id,
      userId
    );

    res.status(200).json({
      success: true,
      data: accounts,
    });
  })
);

/**
 * Link social account to workspace
 */
router.post(
  '/:id/social-accounts',
  authenticateWorkspaceRequest,
  validateWorkspaceId,
  validateSocialAccountData,
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { id } = req.params;
    const userId = req.user!.id;
    const { accountId } = req.body;

    const linkedAccount = await workspaceService.linkSocialAccount(
      id,
      { accountId },
      userId
    );

    res.status(201).json({
      success: true,
      data: linkedAccount,
      message: 'Social account linked successfully',
    });
  })
);

/**
 * Unlink social account from workspace - Not implemented in service yet
 */
router.delete(
  '/:id/social-accounts/:accountId',
  authenticateWorkspaceRequest,
  validateWorkspaceId,
  validateAccountId,
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    // Note: This functionality is not yet implemented in the service
    // Will need to implement workspaceService.unlinkSocialAccount method

    const { id, accountId } = req.params;
    const userId = req.user!.id;

    // TODO: Implement this method in service
    // await workspaceService.unlinkSocialAccount(id, accountId, userId);

    res.status(501).json({
      success: false,
      message: 'This feature is not yet implemented',
    });
  })
);

export default router;
