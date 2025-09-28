import { supabaseAdmin } from '../auth/supabase.client';
import {
  Workspace,
  WorkspaceMember,
  WorkspaceSocialAccount,
  CreateWorkspaceRequest,
  UpdateWorkspaceRequest,
  InviteMemberRequest,
  UpdateMemberRoleRequest,
  LinkSocialAccountRequest,
  RemoveMemberRequest,
  SwitchWorkspaceRequest,
  UserContext,
  WorkspaceRole,
  WorkspacePermissions,
  WorkspaceListResponse,
  WorkspaceDetailsResponse,
  MemberInvitationResponse,
} from './workspace.types';
import { WorkspacePermissionManager } from './workspace.permissions';
import {
  NotFoundError,
  AuthorizationError,
  ValidationError,
  ConflictError,
  DatabaseError,
  BusinessLogicError,
} from '../../utils/errors';

export class WorkspaceService {
  /**
   * Get all workspaces for the authenticated user with enhanced response
   */
  async getUserWorkspaces(userId: string): Promise<WorkspaceListResponse> {
    try {
      const { data, error } = await supabaseAdmin
        .from('workspace_memberships')
        .select(
          `
          role,
          is_active,
          workspaces (
            id,
            name,
            created_by,
            created_at,
            updated_at,
            is_default,
            is_active,
            settings
          )
        `
        )
        .eq('user_id', userId)
        .eq('is_active', true);

      if (error) {
        throw new DatabaseError(`Failed to fetch workspaces: ${error.message}`, error);
      }

      const workspaces: Workspace[] = data?.map((membership: any) => ({
        ...membership.workspaces,
        role: membership.role,
      })) || [];

      // Get member and social account counts for each workspace
      for (const workspace of workspaces) {
        try {
          await this.enrichWorkspaceWithCounts(workspace);
        } catch (error) {
          // Don't fail the entire request if count enrichment fails
          console.warn(`Failed to enrich workspace ${workspace.id} with counts:`, error);
        }
      }

      // Find the default or most recently used workspace
      const activeWorkspace = workspaces.find(w => w.is_default) || workspaces[0];

      return {
        workspaces,
        total_count: workspaces.length,
        active_workspace_id: activeWorkspace?.id,
      };
    } catch (error: any) {
      if (error instanceof DatabaseError) {
        throw error;
      }
      throw new DatabaseError(`Failed to fetch workspaces: ${error.message}`, error);
    }
  }

  /**
   * Enrich workspace with member and social account counts
   */
  private async enrichWorkspaceWithCounts(workspace: Workspace): Promise<void> {
    try {
      // Get member count
      const { count: memberCount, error: memberError } = await supabaseAdmin
        .from('workspace_memberships')
        .select('*', { count: 'exact', head: true })
        .eq('workspace_id', workspace.id)
        .eq('is_active', true);

      if (memberError) {
        console.warn(`Failed to get member count for workspace ${workspace.id}:`, memberError);
      } else {
        workspace.member_count = memberCount || 0;
      }

      // Get social accounts count
      const { count: socialCount, error: socialError } = await supabaseAdmin
        .from('workspace_social_accounts')
        .select('*', { count: 'exact', head: true })
        .eq('workspace_id', workspace.id);

      if (socialError) {
        console.warn(`Failed to get social accounts count for workspace ${workspace.id}:`, socialError);
      } else {
        workspace.social_accounts_count = socialCount || 0;
      }
    } catch (error) {
      console.warn(`Error enriching workspace ${workspace.id}:`, error);
    }
  }

  /**
   * Get user's current workspace context using the database function
   */
  async getUserWorkspaceContext(userId: string): Promise<UserContext | null> {
    try {
      const { data, error } = await supabaseAdmin.rpc(
        'get_user_workspace_context',
        { user_uuid: userId }
      );

      if (error) {
        throw new Error(`Failed to fetch workspace context: ${error.message}`);
      }

      if (!data || data.length === 0) {
        return null;
      }

      const context = data[0];
      return {
        user_id: context.user_id,
        workspace_id: context.workspace_id,
        workspace_name: context.workspace_name,
        user_role: context.user_role,
        is_default: context.is_default,
        workspace_accounts: context.workspace_accounts || [],
      };
    } catch (error: any) {
      console.error('Error fetching workspace context:', error);
      throw new Error(`Failed to fetch workspace context: ${error.message}`);
    }
  }

  /**
   * Get comprehensive workspace details with members and social accounts
   */
  async getWorkspaceDetails(
    workspaceId: string,
    userId: string
  ): Promise<WorkspaceDetailsResponse> {
    try {
      // Validate access and get user's role
      const userRole = await this.validateWorkspaceAccessWithRole(workspaceId, userId);

      // Check if user can view workspace details
      WorkspacePermissionManager.requirePermission(
        userRole,
        'canViewWorkspaceDetails',
        'view workspace details'
      );

      // Get workspace details
      const { data: workspaceData, error: workspaceError } = await supabaseAdmin
        .from('workspaces')
        .select('*')
        .eq('id', workspaceId)
        .eq('is_active', true)
        .single();

      if (workspaceError) {
        throw new DatabaseError(`Failed to fetch workspace: ${workspaceError.message}`, workspaceError);
      }

      if (!workspaceData) {
        throw new NotFoundError('Workspace', workspaceId);
      }

      // Get all members with enhanced details
      const members = await this.getWorkspaceMembers(workspaceId, userId);

      // Get social accounts if user has permission
      let social_accounts: WorkspaceSocialAccount[] = [];
      if (WorkspacePermissionManager.hasPermission(userRole, 'canManageSocialAccounts') ||
          WorkspacePermissionManager.hasPermission(userRole, 'canViewWorkspaceDetails')) {
        social_accounts = await this.getWorkspaceSocialAccounts(workspaceId, userId);
      }

      // Get user's permissions
      const permissions = WorkspacePermissionManager.getPermissionsForRole(userRole);

      // Enrich with counts
      await this.enrichWorkspaceWithCounts(workspaceData);

      return {
        ...workspaceData,
        role: userRole,
        members,
        social_accounts,
        permissions,
      };
    } catch (error: any) {
      if (error instanceof NotFoundError || error instanceof AuthorizationError || error instanceof DatabaseError) {
        throw error;
      }
      throw new DatabaseError(`Failed to fetch workspace details: ${error.message}`, error);
    }
  }

  /**
   * Create a new workspace with enhanced validation
   */
  async createWorkspace(
    request: CreateWorkspaceRequest,
    userId: string
  ): Promise<Workspace> {
    try {
      // Validate input
      if (!request.name || request.name.trim().length === 0) {
        throw new ValidationError('Workspace name is required');
      }

      if (request.name.trim().length > 100) {
        throw new ValidationError('Workspace name must be 100 characters or less');
      }

      // Check if user already has a workspace with this name
      const existingWorkspaces = await this.getUserWorkspaces(userId);
      const duplicateName = existingWorkspaces.workspaces.some(
        w => w.name.toLowerCase() === request.name.trim().toLowerCase()
      );

      if (duplicateName) {
        throw new ConflictError('A workspace with this name already exists');
      }

      // Create workspace with transaction-like behavior
      const { data: workspaceData, error: workspaceError } = await supabaseAdmin
        .from('workspaces')
        .insert({
          name: request.name.trim(),
          created_by: userId,
          is_default: existingWorkspaces.workspaces.length === 0, // First workspace is default
          is_active: true,
          settings: request.settings || {},
        })
        .select()
        .single();

      if (workspaceError) {
        throw new DatabaseError(
          `Failed to create workspace: ${workspaceError.message}`,
          workspaceError
        );
      }

      // Add creator as owner
      const { error: membershipError } = await supabaseAdmin
        .from('workspace_memberships')
        .insert({
          user_id: userId,
          workspace_id: workspaceData.id,
          role: 'owner',
          is_active: true,
        });

      if (membershipError) {
        // Rollback workspace creation
        try {
          await supabaseAdmin
            .from('workspaces')
            .delete()
            .eq('id', workspaceData.id);
        } catch (rollbackError) {
          console.error('Failed to rollback workspace creation:', rollbackError);
        }
        throw new DatabaseError(
          `Failed to create membership: ${membershipError.message}`,
          membershipError
        );
      }

      return {
        ...workspaceData,
        role: 'owner' as WorkspaceRole,
      };
    } catch (error: any) {
      if (error instanceof ValidationError || error instanceof ConflictError || error instanceof DatabaseError) {
        throw error;
      }
      throw new DatabaseError(`Failed to create workspace: ${error.message}`, error);
    }
  }

  /**
   * Update workspace details with enhanced validation
   */
  async updateWorkspace(
    workspaceId: string,
    request: UpdateWorkspaceRequest,
    userId: string
  ): Promise<Workspace> {
    try {
      // Check if user has permission to update
      await this.validateWorkspacePermission(
        workspaceId,
        userId,
        'canUpdateWorkspace',
        'update workspace'
      );

      // Validate input
      const updateData: any = { updated_at: new Date().toISOString() };

      if (request.name !== undefined) {
        if (!request.name || request.name.trim().length === 0) {
          throw new ValidationError('Workspace name cannot be empty');
        }
        if (request.name.trim().length > 100) {
          throw new ValidationError('Workspace name must be 100 characters or less');
        }
        updateData.name = request.name.trim();
      }

      if (request.settings !== undefined) {
        updateData.settings = request.settings;
      }

      const { data, error } = await supabaseAdmin
        .from('workspaces')
        .update(updateData)
        .eq('id', workspaceId)
        .eq('is_active', true)
        .select()
        .single();

      if (error) {
        throw new DatabaseError(`Failed to update workspace: ${error.message}`, error);
      }

      if (!data) {
        throw new NotFoundError('Workspace', workspaceId);
      }

      return data;
    } catch (error: any) {
      if (error instanceof ValidationError || error instanceof AuthorizationError ||
          error instanceof DatabaseError || error instanceof NotFoundError) {
        throw error;
      }
      throw new DatabaseError(`Failed to update workspace: ${error.message}`, error);
    }
  }

  /**
   * Delete workspace (soft delete)
   */
  async deleteWorkspace(workspaceId: string, userId: string): Promise<void> {
    try {
      // Check if user is owner
      await this.validateWorkspacePermission(workspaceId, userId, ['owner']);

      // Check if it's the default workspace
      const { data: workspace, error: fetchError } = await supabaseAdmin
        .from('workspaces')
        .select('is_default')
        .eq('id', workspaceId)
        .single();

      if (fetchError) {
        throw new Error(`Failed to fetch workspace: ${fetchError.message}`);
      }

      if (workspace.is_default) {
        throw new Error('Cannot delete default workspace');
      }

      // Soft delete workspace
      const { error } = await supabaseAdmin
        .from('workspaces')
        .update({ is_active: false })
        .eq('id', workspaceId);

      if (error) {
        throw new Error(`Failed to delete workspace: ${error.message}`);
      }
    } catch (error: any) {
      console.error('Error deleting workspace:', error);
      throw error;
    }
  }

  /**
   * Get workspace members with enhanced details and permissions
   */
  async getWorkspaceMembers(
    workspaceId: string,
    userId: string
  ): Promise<WorkspaceMember[]> {
    try {
      // Validate access and get user's role
      const userRole = await this.validateWorkspaceAccessWithRole(workspaceId, userId);

      // Check if user can view members
      WorkspacePermissionManager.requirePermission(
        userRole,
        'canViewMembers',
        'view workspace members'
      );

      const { data, error } = await supabaseAdmin
        .from('workspace_memberships')
        .select(
          `
          id,
          user_id,
          workspace_id,
          role,
          is_active,
          joined_at,
          users (
            email,
            name
          )
        `
        )
        .eq('workspace_id', workspaceId)
        .eq('is_active', true)
        .order('role', { ascending: false })
        .order('joined_at', { ascending: true });

      if (error) {
        throw new DatabaseError(`Failed to fetch members: ${error.message}`, error);
      }

      return (
        data?.map((member: any) => ({
          id: member.id,
          user_id: member.user_id,
          workspace_id: member.workspace_id,
          role: member.role,
          email: member.users?.email || '',
          user_name: member.users?.name || '',
          is_active: member.is_active,
          joined_at: member.joined_at,
          permissions: WorkspacePermissionManager.getPermissionsForRole(member.role),
        })) || []
      );
    } catch (error: any) {
      if (error instanceof AuthorizationError || error instanceof DatabaseError) {
        throw error;
      }
      throw new DatabaseError(`Failed to fetch members: ${error.message}`, error);
    }
  }

  /**
   * Invite member to workspace with enhanced validation
   */
  async inviteMember(
    workspaceId: string,
    request: InviteMemberRequest,
    userId: string
  ): Promise<MemberInvitationResponse> {
    try {
      // Get inviter's role for permission validation
      const inviterRole = await this.validateWorkspaceAccessWithRole(workspaceId, userId);

      // Check if user has permission to invite members
      WorkspacePermissionManager.requirePermission(
        inviterRole,
        'canInviteMembers',
        'invite members'
      );

      // Validate that inviter can assign the requested role
      WorkspacePermissionManager.requireRoleAssignmentPermission(
        inviterRole,
        request.role
      );

      // Validate email format
      if (!request.email || !this.isValidEmail(request.email)) {
        throw new ValidationError('Valid email address is required');
      }

      // Find user by email in auth.users first
      const { data: authUserData, error: authUserError } =
        await supabaseAdmin.auth.admin.listUsers();

      if (authUserError) {
        throw new DatabaseError(`Failed to fetch users: ${authUserError.message}`, authUserError);
      }

      const authUser = authUserData.users.find(
        (u) => u.email?.toLowerCase() === request.email.toLowerCase()
      );

      if (!authUser) {
        throw new NotFoundError('User', request.email);
      }

      // Check if user is trying to invite themselves
      if (authUser.id === userId) {
        throw new BusinessLogicError('You cannot invite yourself to the workspace');
      }

      // Check if user exists in public.users, if not sync them
      const { data: userData, error: userError } = await supabaseAdmin
        .from('users')
        .select('id, email, name')
        .eq('id', authUser.id)
        .single();

      if (userError && userError.code !== 'PGRST116') {
        throw new DatabaseError(`Failed to fetch user data: ${userError.message}`, userError);
      }

      // If user not in public.users, sync them
      if (!userData) {
        const userName =
          authUser.user_metadata?.name ||
          authUser.user_metadata?.full_name ||
          authUser.email?.split('@')[0] ||
          'Unknown User';

        try {
          await supabaseAdmin.from('users').insert({
            id: authUser.id,
            email: authUser.email!,
            name: userName,
          });
        } catch (syncError) {
          console.warn('Failed to sync user to public.users:', syncError);
        }
      }

      // Check if user is already a member
      const { data: existingMembership } = await supabaseAdmin
        .from('workspace_memberships')
        .select('id, is_active')
        .eq('workspace_id', workspaceId)
        .eq('user_id', authUser.id)
        .single();

      if (existingMembership) {
        if (existingMembership.is_active) {
          throw new ConflictError('User is already a member of this workspace');
        } else {
          // Reactivate inactive membership
          const { data: reactivatedMember, error: reactivateError } = await supabaseAdmin
            .from('workspace_memberships')
            .update({
              role: request.role,
              is_active: true,
              joined_at: new Date().toISOString(),
            })
            .eq('id', existingMembership.id)
            .select()
            .single();

          if (reactivateError) {
            throw new DatabaseError(`Failed to reactivate membership: ${reactivateError.message}`, reactivateError);
          }

          const member: WorkspaceMember = {
            id: reactivatedMember.id,
            user_id: authUser.id,
            workspace_id: workspaceId,
            role: request.role,
            email: authUser.email!,
            user_name: userData?.name || authUser.user_metadata?.name || '',
            is_active: true,
            joined_at: reactivatedMember.joined_at,
            invited_by: userId,
            permissions: WorkspacePermissionManager.getPermissionsForRole(request.role),
          };

          return {
            member,
            invitation_sent: false, // Reactivation, no new invitation
          };
        }
      }

      // Add new membership
      const { data: membershipData, error: membershipError } =
        await supabaseAdmin
          .from('workspace_memberships')
          .insert({
            user_id: authUser.id,
            workspace_id: workspaceId,
            role: request.role,
            is_active: true,
          })
          .select()
          .single();

      if (membershipError) {
        throw new DatabaseError(`Failed to add member: ${membershipError.message}`, membershipError);
      }

      const member: WorkspaceMember = {
        id: membershipData.id,
        user_id: authUser.id,
        workspace_id: workspaceId,
        role: request.role,
        email: authUser.email!,
        user_name: userData?.name || authUser.user_metadata?.name || '',
        is_active: true,
        joined_at: membershipData.joined_at,
        invited_by: userId,
        permissions: WorkspacePermissionManager.getPermissionsForRole(request.role),
      };

      // TODO: Send invitation email if requested
      const invitationSent = request.send_invitation_email === true;

      return {
        member,
        invitation_sent: invitationSent,
        invitation_expires_at: invitationSent ? new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString() : undefined,
      };
    } catch (error: any) {
      if (error instanceof ValidationError || error instanceof ConflictError ||
          error instanceof NotFoundError || error instanceof AuthorizationError ||
          error instanceof DatabaseError || error instanceof BusinessLogicError) {
        throw error;
      }
      throw new DatabaseError(`Failed to invite member: ${error.message}`, error);
    }
  }

  /**
   * Update member role with enhanced validation
   */
  async updateMemberRole(
    workspaceId: string,
    memberId: string,
    request: UpdateMemberRoleRequest,
    userId: string
  ): Promise<WorkspaceMember> {
    try {
      // Get current user's role
      const userRole = await this.validateWorkspaceAccessWithRole(workspaceId, userId);

      // Check if user has permission to update roles
      WorkspacePermissionManager.requirePermission(
        userRole,
        'canUpdateMemberRoles',
        'update member roles'
      );

      // Get the target member's current details
      const { data: currentMember, error: memberError } = await supabaseAdmin
        .from('workspace_memberships')
        .select('user_id, role')
        .eq('id', memberId)
        .eq('workspace_id', workspaceId)
        .eq('is_active', true)
        .single();

      if (memberError || !currentMember) {
        throw new NotFoundError('Workspace member', memberId);
      }

      // Prevent self-role changes
      if (currentMember.user_id === userId) {
        throw new BusinessLogicError('You cannot change your own role');
      }

      // Validate that user can manage the current member's role
      WorkspacePermissionManager.requireRoleManagementPermission(
        userRole,
        currentMember.role as WorkspaceRole,
        'update role of'
      );

      // Validate that user can assign the new role
      WorkspacePermissionManager.requireRoleAssignmentPermission(
        userRole,
        request.role
      );

      // Update the member's role
      const { data: updatedMember, error: updateError } = await supabaseAdmin
        .from('workspace_memberships')
        .update({ role: request.role })
        .eq('id', memberId)
        .eq('workspace_id', workspaceId)
        .select(`
          id,
          user_id,
          workspace_id,
          role,
          is_active,
          joined_at,
          users (
            email,
            name
          )
        `)
        .single();

      if (updateError) {
        throw new DatabaseError(`Failed to update member role: ${updateError.message}`, updateError);
      }

      const member: WorkspaceMember = {
        id: updatedMember.id,
        user_id: updatedMember.user_id,
        workspace_id: updatedMember.workspace_id,
        role: updatedMember.role,
        email: updatedMember.users?.email || '',
        user_name: updatedMember.users?.name || '',
        is_active: updatedMember.is_active,
        joined_at: updatedMember.joined_at,
        permissions: WorkspacePermissionManager.getPermissionsForRole(updatedMember.role),
      };

      // TODO: Send notification if requested
      return member;
    } catch (error: any) {
      if (error instanceof NotFoundError || error instanceof AuthorizationError ||
          error instanceof DatabaseError || error instanceof BusinessLogicError) {
        throw error;
      }
      throw new DatabaseError(`Failed to update member role: ${error.message}`, error);
    }
  }

  /**
   * Remove member from workspace
   */
  async removeMember(
    workspaceId: string,
    memberId: string,
    request: RemoveMemberRequest = {},
    userId: string
  ): Promise<void> {
    try {
      // Get current user's role
      const userRole = await this.validateWorkspaceAccessWithRole(workspaceId, userId);

      // Check if user has permission to remove members
      WorkspacePermissionManager.requirePermission(
        userRole,
        'canRemoveMembers',
        'remove members'
      );

      // Get the target member's current details
      const { data: targetMember, error: memberError } = await supabaseAdmin
        .from('workspace_memberships')
        .select('user_id, role')
        .eq('id', memberId)
        .eq('workspace_id', workspaceId)
        .eq('is_active', true)
        .single();

      if (memberError || !targetMember) {
        throw new NotFoundError('Workspace member', memberId);
      }

      // Prevent self-removal
      if (targetMember.user_id === userId) {
        throw new BusinessLogicError('You cannot remove yourself from the workspace. Use leave workspace instead.');
      }

      // Validate that user can manage the target member's role
      WorkspacePermissionManager.requireRoleManagementPermission(
        userRole,
        targetMember.role as WorkspaceRole,
        'remove'
      );

      // Soft delete the membership
      const { error: removeError } = await supabaseAdmin
        .from('workspace_memberships')
        .update({ is_active: false })
        .eq('id', memberId)
        .eq('workspace_id', workspaceId);

      if (removeError) {
        throw new DatabaseError(`Failed to remove member: ${removeError.message}`, removeError);
      }

      // TODO: Send notification if requested
    } catch (error: any) {
      if (error instanceof NotFoundError || error instanceof AuthorizationError ||
          error instanceof DatabaseError || error instanceof BusinessLogicError) {
        throw error;
      }
      throw new DatabaseError(`Failed to remove member: ${error.message}`, error);
    }
  }

  /**
   * Validate email format
   */
  private isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  /**
   * Get workspace social accounts with enhanced details
   */
  async getWorkspaceSocialAccounts(
    workspaceId: string,
    userId: string
  ): Promise<WorkspaceSocialAccount[]> {
    try {
      // Validate access and permissions
      const userRole = await this.validateWorkspaceAccessWithRole(workspaceId, userId);

      // Check if user can view workspace details or manage social accounts
      if (!WorkspacePermissionManager.hasPermission(userRole, 'canManageSocialAccounts') &&
          !WorkspacePermissionManager.hasPermission(userRole, 'canViewWorkspaceDetails')) {
        throw new AuthorizationError('You do not have permission to view social accounts');
      }

      const { data, error } = await supabaseAdmin
        .from('workspace_social_accounts')
        .select(
          `
          id,
          workspace_id,
          social_account_id,
          is_active,
          linked_at,
          linked_by,
          social_accounts (
            provider,
            account_name,
            account_username,
            profile_picture_url,
            follower_count,
            expires_at,
            last_sync_at,
            metadata
          )
        `
        )
        .eq('workspace_id', workspaceId)
        .order('linked_at', { ascending: false });

      if (error) {
        throw new DatabaseError(`Failed to fetch social accounts: ${error.message}`, error);
      }

      return (
        data?.map((account: any) => ({
          id: account.id,
          workspace_id: account.workspace_id,
          social_account_id: account.social_account_id,
          provider: account.social_accounts?.provider || '',
          account_name: account.social_accounts?.account_name || '',
          account_username: account.social_accounts?.account_username,
          profile_picture_url: account.social_accounts?.profile_picture_url,
          follower_count: account.social_accounts?.follower_count,
          is_active: account.is_active !== false, // Default to true if null
          expires_at: account.social_accounts?.expires_at,
          last_sync_at: account.social_accounts?.last_sync_at,
          metadata: account.social_accounts?.metadata,
          linked_by: account.linked_by,
          linked_at: account.linked_at,
        })) || []
      );
    } catch (error: any) {
      if (error instanceof AuthorizationError || error instanceof DatabaseError) {
        throw error;
      }
      throw new DatabaseError(`Failed to fetch social accounts: ${error.message}`, error);
    }
  }

  /**
   * Link social account to workspace with enhanced validation
   */
  async linkSocialAccount(
    workspaceId: string,
    request: LinkSocialAccountRequest,
    userId: string
  ): Promise<WorkspaceSocialAccount> {
    try {
      // Check if user has permission to manage social accounts
      await this.validateWorkspacePermission(
        workspaceId,
        userId,
        'canManageSocialAccounts',
        'link social accounts'
      );

      // Validate account ID
      if (!request.accountId || request.accountId.trim() === '') {
        throw new ValidationError('Social account ID is required');
      }

      // Check if account exists and belongs to user (or is accessible to them)
      const { data: socialAccount, error: accountError } = await supabaseAdmin
        .from('social_accounts')
        .select('*')
        .eq('id', request.accountId)
        .single();

      if (accountError) {
        throw new NotFoundError('Social account', request.accountId);
      }

      // Check if user has permission to link this account
      // Account should belong to the user or they should have permission to link it
      if (socialAccount.user_id !== userId) {
        // In future, you might want to allow managers to link shared accounts
        throw new AuthorizationError('You can only link your own social accounts');
      }

      // Check if account is still valid (not expired)
      if (socialAccount.expires_at && new Date(socialAccount.expires_at) < new Date()) {
        throw new BusinessLogicError('Social account has expired. Please re-authenticate the account.');
      }

      // Check if already linked to this workspace
      const { data: existingLink } = await supabaseAdmin
        .from('workspace_social_accounts')
        .select('id, is_active')
        .eq('workspace_id', workspaceId)
        .eq('social_account_id', request.accountId)
        .single();

      if (existingLink) {
        if (existingLink.is_active !== false) {
          throw new ConflictError('Social account is already linked to this workspace');
        } else {
          // Reactivate the link
          const { data: reactivatedLink, error: reactivateError } = await supabaseAdmin
            .from('workspace_social_accounts')
            .update({
              is_active: request.is_active !== false, // Default to true
              linked_by: userId,
              linked_at: new Date().toISOString(),
            })
            .eq('id', existingLink.id)
            .select()
            .single();

          if (reactivateError) {
            throw new DatabaseError(`Failed to reactivate social account link: ${reactivateError.message}`, reactivateError);
          }

          return {
            id: reactivatedLink.id,
            workspace_id: reactivatedLink.workspace_id,
            social_account_id: reactivatedLink.social_account_id,
            provider: socialAccount.provider,
            account_name: socialAccount.account_name,
            account_username: socialAccount.account_username,
            profile_picture_url: socialAccount.profile_picture_url,
            follower_count: socialAccount.follower_count,
            is_active: reactivatedLink.is_active,
            expires_at: socialAccount.expires_at,
            last_sync_at: socialAccount.last_sync_at,
            metadata: socialAccount.metadata,
            linked_by: reactivatedLink.linked_by,
            linked_at: reactivatedLink.linked_at,
          };
        }
      }

      // Create new link
      const { data, error } = await supabaseAdmin
        .from('workspace_social_accounts')
        .insert({
          workspace_id: workspaceId,
          social_account_id: request.accountId,
          is_active: request.is_active !== false, // Default to true
          linked_by: userId,
          linked_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (error) {
        throw new DatabaseError(`Failed to link social account: ${error.message}`, error);
      }

      return {
        id: data.id,
        workspace_id: data.workspace_id,
        social_account_id: data.social_account_id,
        provider: socialAccount.provider,
        account_name: socialAccount.account_name,
        account_username: socialAccount.account_username,
        profile_picture_url: socialAccount.profile_picture_url,
        follower_count: socialAccount.follower_count,
        is_active: data.is_active,
        expires_at: socialAccount.expires_at,
        last_sync_at: socialAccount.last_sync_at,
        metadata: socialAccount.metadata,
        linked_by: data.linked_by,
        linked_at: data.linked_at,
      };
    } catch (error: any) {
      if (error instanceof ValidationError || error instanceof NotFoundError ||
          error instanceof AuthorizationError || error instanceof ConflictError ||
          error instanceof BusinessLogicError || error instanceof DatabaseError) {
        throw error;
      }
      throw new DatabaseError(`Failed to link social account: ${error.message}`, error);
    }
  }

  /**
   * Unlink social account from workspace
   */
  async unlinkSocialAccount(
    workspaceId: string,
    socialAccountId: string,
    userId: string
  ): Promise<void> {
    try {
      // Check if user has permission to manage social accounts
      await this.validateWorkspacePermission(
        workspaceId,
        userId,
        'canManageSocialAccounts',
        'unlink social accounts'
      );

      // Check if the link exists
      const { data: existingLink, error: linkError } = await supabaseAdmin
        .from('workspace_social_accounts')
        .select('id')
        .eq('workspace_id', workspaceId)
        .eq('social_account_id', socialAccountId)
        .single();

      if (linkError || !existingLink) {
        throw new NotFoundError('Social account link');
      }

      // Soft delete the link
      const { error } = await supabaseAdmin
        .from('workspace_social_accounts')
        .update({ is_active: false })
        .eq('id', existingLink.id);

      if (error) {
        throw new DatabaseError(`Failed to unlink social account: ${error.message}`, error);
      }
    } catch (error: any) {
      if (error instanceof NotFoundError || error instanceof AuthorizationError || error instanceof DatabaseError) {
        throw error;
      }
      throw new DatabaseError(`Failed to unlink social account: ${error.message}`, error);
    }
  }

  /**
   * Validate workspace access and return user's role
   */
  private async validateWorkspaceAccessWithRole(
    workspaceId: string,
    userId: string
  ): Promise<WorkspaceRole> {
    const { data, error } = await supabaseAdmin
      .from('workspace_memberships')
      .select('role')
      .eq('workspace_id', workspaceId)
      .eq('user_id', userId)
      .eq('is_active', true)
      .single();

    if (error || !data) {
      throw new AuthorizationError('Access denied: You are not a member of this workspace');
    }

    return data.role as WorkspaceRole;
  }

  /**
   * Validate if user has access to workspace (legacy method for compatibility)
   */
  private async validateWorkspaceAccess(
    workspaceId: string,
    userId: string
  ): Promise<void> {
    await this.validateWorkspaceAccessWithRole(workspaceId, userId);
  }

  /**
   * Enhanced permission validation using the permission manager
   */
  private async validateWorkspacePermission(
    workspaceId: string,
    userId: string,
    permission: keyof WorkspacePermissions,
    action?: string
  ): Promise<void> {
    const userRole = await this.validateWorkspaceAccessWithRole(workspaceId, userId);
    WorkspacePermissionManager.requirePermission(userRole, permission, action);
  }

  /**
   * Legacy permission validation for backward compatibility
   */
  private async validateWorkspacePermissionLegacy(
    workspaceId: string,
    userId: string,
    allowedRoles: WorkspaceRole[]
  ): Promise<void> {
    const userRole = await this.validateWorkspaceAccessWithRole(workspaceId, userId);

    if (!allowedRoles.includes(userRole)) {
      throw new AuthorizationError(
        `Access denied: Your role (${userRole}) does not have permission for this action`
      );
    }
  }

  /**
   * Switch user's active workspace
   */
  async switchWorkspace(
    request: SwitchWorkspaceRequest,
    userId: string
  ): Promise<UserContext> {
    try {
      // Validate that user has access to the target workspace
      const userRole = await this.validateWorkspaceAccessWithRole(request.workspace_id, userId);

      // Check if user can switch to this workspace
      WorkspacePermissionManager.requirePermission(
        userRole,
        'canSwitchWorkspace',
        'switch to this workspace'
      );

      // Get the new workspace context
      const context = await this.getUserWorkspaceContext(userId, request.workspace_id);

      if (!context) {
        throw new NotFoundError('Workspace context', request.workspace_id);
      }

      return context;
    } catch (error: any) {
      if (error instanceof AuthorizationError || error instanceof NotFoundError || error instanceof DatabaseError) {
        throw error;
      }
      throw new DatabaseError(`Failed to switch workspace: ${error.message}`, error);
    }
  }

  /**
   * Leave workspace (for current user)
   */
  async leaveWorkspace(
    workspaceId: string,
    userId: string
  ): Promise<void> {
    try {
      // Get user's current role
      const userRole = await this.validateWorkspaceAccessWithRole(workspaceId, userId);

      // Check if this is a default workspace
      const { data: workspace, error: workspaceError } = await supabaseAdmin
        .from('workspaces')
        .select('is_default, created_by')
        .eq('id', workspaceId)
        .single();

      if (workspaceError) {
        throw new DatabaseError(`Failed to fetch workspace: ${workspaceError.message}`, workspaceError);
      }

      // Prevent leaving default workspace
      if (workspace.is_default) {
        throw new BusinessLogicError('You cannot leave your default workspace');
      }

      // If user is the owner, check if there are other owners
      if (userRole === 'owner') {
        const { data: otherOwners, error: ownersError } = await supabaseAdmin
          .from('workspace_memberships')
          .select('id')
          .eq('workspace_id', workspaceId)
          .eq('role', 'owner')
          .neq('user_id', userId)
          .eq('is_active', true);

        if (ownersError) {
          throw new DatabaseError(`Failed to check other owners: ${ownersError.message}`, ownersError);
        }

        if (!otherOwners || otherOwners.length === 0) {
          throw new BusinessLogicError('You cannot leave the workspace as the only owner. Transfer ownership first or delete the workspace.');
        }
      }

      // Remove user from workspace
      const { error: removeError } = await supabaseAdmin
        .from('workspace_memberships')
        .update({ is_active: false })
        .eq('workspace_id', workspaceId)
        .eq('user_id', userId);

      if (removeError) {
        throw new DatabaseError(`Failed to leave workspace: ${removeError.message}`, removeError);
      }
    } catch (error: any) {
      if (error instanceof BusinessLogicError || error instanceof DatabaseError) {
        throw error;
      }
      throw new DatabaseError(`Failed to leave workspace: ${error.message}`, error);
    }
  }

  /**
   * Get user workspace context with optional workspace ID
   */
  async getUserWorkspaceContext(
    userId: string,
    workspaceId?: string
  ): Promise<UserContext | null> {
    try {
      let contextWorkspaceId = workspaceId;

      // If no workspace ID provided, get user's default or first workspace
      if (!contextWorkspaceId) {
        const workspaces = await this.getUserWorkspaces(userId);
        if (workspaces.workspaces.length === 0) {
          return null;
        }
        contextWorkspaceId = workspaces.active_workspace_id || workspaces.workspaces[0].id;
      }

      const { data, error } = await supabaseAdmin.rpc(
        'get_user_workspace_context',
        { user_uuid: userId, workspace_uuid: contextWorkspaceId }
      );

      if (error) {
        throw new DatabaseError(`Failed to fetch workspace context: ${error.message}`, error);
      }

      if (!data || data.length === 0) {
        return null;
      }

      const context = data[0];
      const userRole = context.user_role as WorkspaceRole;

      return {
        user_id: context.user_id,
        workspace_id: context.workspace_id,
        workspace_name: context.workspace_name,
        user_role: userRole,
        is_default: context.is_default,
        workspace_accounts: context.workspace_accounts || [],
        permissions: WorkspacePermissionManager.getPermissionsForRole(userRole),
        workspace_settings: context.workspace_settings,
      };
    } catch (error: any) {
      if (error instanceof DatabaseError) {
        throw error;
      }
      throw new DatabaseError(`Failed to fetch workspace context: ${error.message}`, error);
    }
  }

  /**
   * Validate email format
   */
  private isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }
}
