import { supabaseAdmin } from '../auth/supabase.client';

export interface Workspace {
  id: string;
  name: string;
  created_by: string;
  created_at: string;
  updated_at?: string;
  is_default?: boolean;
  is_active?: boolean;
  settings?: any;
  role?: 'owner' | 'manager' | 'editor' | 'viewer';
}

export interface WorkspaceMember {
  id?: string;
  user_id: string;
  workspace_id: string;
  role: 'owner' | 'manager' | 'editor' | 'viewer';
  email: string;
  user_name?: string;
  is_active?: boolean;
  joined_at?: string;
}

export interface WorkspaceSocialAccount {
  id: string;
  workspace_id: string;
  social_account_id: string;
  provider: string;
  account_name: string;
  expires_at?: string;
  metadata?: any;
}

export interface CreateWorkspaceRequest {
  name: string;
}

export interface UpdateWorkspaceRequest {
  name: string;
}

export interface InviteMemberRequest {
  email: string;
  role: 'owner' | 'manager' | 'editor' | 'viewer';
}

export interface UpdateMemberRoleRequest {
  role: 'owner' | 'manager' | 'editor' | 'viewer';
}

export interface LinkSocialAccountRequest {
  accountId: string;
}

export interface UserContext {
  user_id: string;
  workspace_id: string;
  workspace_name: string;
  user_role: 'owner' | 'manager' | 'editor' | 'viewer';
  is_default: boolean;
  workspace_accounts: string[];
}

export class WorkspaceService {
  /**
   * Get all workspaces for the authenticated user
   */
  async getUserWorkspaces(userId: string): Promise<Workspace[]> {
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
        throw new Error(`Failed to fetch workspaces: ${error.message}`);
      }

      return (
        data?.map((membership: any) => ({
          ...membership.workspaces,
          role: membership.role,
        })) || []
      );
    } catch (error: any) {
      console.error('Error fetching user workspaces:', error);
      throw new Error(`Failed to fetch workspaces: ${error.message}`);
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
   * Get workspace details with members
   */
  async getWorkspaceDetails(
    workspaceId: string,
    userId: string
  ): Promise<Workspace & { members: WorkspaceMember[] }> {
    try {
      // First check if user has access to this workspace
      await this.validateWorkspaceAccess(workspaceId, userId);

      // Get workspace details
      const { data: workspaceData, error: workspaceError } = await supabaseAdmin
        .from('workspaces')
        .select('*')
        .eq('id', workspaceId)
        .eq('is_active', true)
        .single();

      if (workspaceError) {
        throw new Error(`Failed to fetch workspace: ${workspaceError.message}`);
      }

      // Get user's role in this workspace
      const { data: userRole, error: roleError } = await supabaseAdmin
        .from('workspace_memberships')
        .select('role')
        .eq('workspace_id', workspaceId)
        .eq('user_id', userId)
        .eq('is_active', true)
        .single();

      if (roleError) {
        throw new Error(`Failed to fetch user role: ${roleError.message}`);
      }

      // Get all members with user details from public.users
      const { data: membersData, error: membersError } = await supabaseAdmin
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
        .eq('is_active', true);

      if (membersError) {
        throw new Error(`Failed to fetch members: ${membersError.message}`);
      }

      const members: WorkspaceMember[] =
        membersData?.map((member: any) => ({
          id: member.id,
          user_id: member.user_id,
          workspace_id: member.workspace_id,
          role: member.role,
          email: member.users?.email || '',
          user_name: member.users?.name || '',
          is_active: member.is_active,
          joined_at: member.joined_at,
        })) || [];

      return {
        ...workspaceData,
        role: userRole.role,
        members,
      };
    } catch (error: any) {
      console.error('Error fetching workspace details:', error);
      throw error;
    }
  }

  /**
   * Create a new workspace
   */
  async createWorkspace(
    request: CreateWorkspaceRequest,
    userId: string
  ): Promise<Workspace> {
    try {
      // Create workspace
      const { data: workspaceData, error: workspaceError } = await supabaseAdmin
        .from('workspaces')
        .insert({
          name: request.name,
          created_by: userId,
          is_default: false,
          is_active: true,
        })
        .select()
        .single();

      if (workspaceError) {
        throw new Error(
          `Failed to create workspace: ${workspaceError.message}`
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
        await supabaseAdmin
          .from('workspaces')
          .delete()
          .eq('id', workspaceData.id);
        throw new Error(
          `Failed to create membership: ${membershipError.message}`
        );
      }

      return workspaceData;
    } catch (error: any) {
      console.error('Error creating workspace:', error);
      throw error;
    }
  }

  /**
   * Update workspace details
   */
  async updateWorkspace(
    workspaceId: string,
    request: UpdateWorkspaceRequest,
    userId: string
  ): Promise<Workspace> {
    try {
      // Check if user has permission to update
      await this.validateWorkspacePermission(workspaceId, userId, [
        'owner',
        'manager',
      ]);

      const { data, error } = await supabaseAdmin
        .from('workspaces')
        .update({
          name: request.name,
          updated_at: new Date().toISOString(),
        })
        .eq('id', workspaceId)
        .eq('is_active', true)
        .select()
        .single();

      if (error) {
        throw new Error(`Failed to update workspace: ${error.message}`);
      }

      return data;
    } catch (error: any) {
      console.error('Error updating workspace:', error);
      throw error;
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
   * Switch user's current workspace
   */
  async switchWorkspace(userId: string, workspaceId: string): Promise<boolean> {
    try {
      const { data, error } = await supabaseAdmin.rpc('switch_user_workspace', {
        user_uuid: userId,
        new_workspace_id: workspaceId,
      });

      if (error) {
        throw new Error(`Failed to switch workspace: ${error.message}`);
      }

      return data === true;
    } catch (error: any) {
      console.error('Error switching workspace:', error);
      throw error;
    }
  }

  /**
   * Get workspace members
   */
  async getWorkspaceMembers(
    workspaceId: string,
    userId: string
  ): Promise<WorkspaceMember[]> {
    try {
      // Check if user has access to this workspace
      await this.validateWorkspaceAccess(workspaceId, userId);

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
        .eq('is_active', true);

      if (error) {
        throw new Error(`Failed to fetch members: ${error.message}`);
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
        })) || []
      );
    } catch (error: any) {
      console.error('Error fetching workspace members:', error);
      throw error;
    }
  }

  /**
   * Invite member to workspace
   */
  async inviteMember(
    workspaceId: string,
    request: InviteMemberRequest,
    userId: string
  ): Promise<WorkspaceMember> {
    try {
      // Check if user has permission to add members
      await this.validateWorkspacePermission(workspaceId, userId, [
        'owner',
        'manager',
      ]);

      // Find user by email in auth.users first, then check if they're in public.users
      const { data: authUserData, error: authUserError } =
        await supabaseAdmin.auth.admin.listUsers();

      if (authUserError) {
        throw new Error(`Failed to fetch users: ${authUserError.message}`);
      }

      const authUser = authUserData.users.find(
        (u) => u.email === request.email
      );
      if (!authUser) {
        throw new Error(`User with email ${request.email} not found`);
      }

      // Check if user exists in public.users, if not sync them
      const { data: userData, error: userError } = await supabaseAdmin
        .from('users')
        .select('id, email, name')
        .eq('id', authUser.id)
        .single();

      if (userError && userError.code !== 'PGRST116') {
        // PGRST116 is "not found"
        throw new Error(`Failed to fetch user data: ${userError.message}`);
      }

      // If user not in public.users, sync them
      if (!userData) {
        const userName =
          authUser.user_metadata?.name ||
          authUser.user_metadata?.full_name ||
          authUser.email?.split('@')[0];

        await supabaseAdmin.from('users').insert({
          id: authUser.id,
          email: authUser.email!,
          name: userName,
        });
      }

      // Check if user is already a member
      const { data: existingMembership } = await supabaseAdmin
        .from('workspace_memberships')
        .select('id')
        .eq('workspace_id', workspaceId)
        .eq('user_id', authUser.id)
        .single();

      if (existingMembership) {
        throw new Error('User is already a member of this workspace');
      }

      // Add membership
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
        throw new Error(`Failed to add member: ${membershipError.message}`);
      }

      return {
        id: membershipData.id,
        user_id: authUser.id,
        workspace_id: workspaceId,
        role: request.role,
        email: authUser.email!,
        user_name: userData?.name || authUser.user_metadata?.name || '',
        is_active: true,
        joined_at: membershipData.joined_at,
      };
    } catch (error: any) {
      console.error('Error inviting member:', error);
      throw error;
    }
  }

  /**
   * Update member role
   */
  async updateMemberRole(
    workspaceId: string,
    memberId: string,
    request: UpdateMemberRoleRequest,
    userId: string
  ): Promise<WorkspaceMember> {
    try {
      // Check if user has permission to update member roles
      await this.validateWorkspacePermission(workspaceId, userId, [
        'owner',
        'manager',
      ]);

      // Get current member info
      const { data: currentMember, error: fetchError } = await supabaseAdmin
        .from('workspace_memberships')
        .select(
          `
          user_id,
          role,
          users!inner (
            email,
            name
          )
        `
        )
        .eq('id', memberId)
        .eq('workspace_id', workspaceId)
        .single();

      if (fetchError) {
        throw new Error(`Member not found: ${fetchError.message}`);
      }

      // Prevent changing own role if you're the owner
      if (currentMember.user_id === userId && currentMember.role === 'owner') {
        throw new Error('Cannot change your own role as the workspace owner');
      }

      // Update role
      const { data, error } = await supabaseAdmin
        .from('workspace_memberships')
        .update({ role: request.role })
        .eq('id', memberId)
        .eq('workspace_id', workspaceId)
        .select()
        .single();

      if (error) {
        throw new Error(`Failed to update member role: ${error.message}`);
      }

      return {
        id: data.id,
        user_id: data.user_id,
        workspace_id: data.workspace_id,
        role: data.role,
        email: (currentMember.users as any)?.email || '',
        user_name: (currentMember.users as any)?.name || '',
        is_active: data.is_active,
        joined_at: data.joined_at,
      };
    } catch (error: any) {
      console.error('Error updating member role:', error);
      throw error;
    }
  }

  /**
   * Remove member from workspace
   */
  async removeMember(
    workspaceId: string,
    memberId: string,
    userId: string
  ): Promise<void> {
    try {
      // Check if user has permission to remove members
      await this.validateWorkspacePermission(workspaceId, userId, [
        'owner',
        'manager',
      ]);

      // Get member info to check if they're the owner
      const { data: member, error: fetchError } = await supabaseAdmin
        .from('workspace_memberships')
        .select('user_id, role')
        .eq('id', memberId)
        .eq('workspace_id', workspaceId)
        .single();

      if (fetchError) {
        throw new Error(`Member not found: ${fetchError.message}`);
      }

      // Prevent removing yourself if you're the owner
      if (member.user_id === userId && member.role === 'owner') {
        throw new Error('Cannot remove yourself as the workspace owner');
      }

      // Soft delete membership
      const { error } = await supabaseAdmin
        .from('workspace_memberships')
        .update({ is_active: false })
        .eq('id', memberId)
        .eq('workspace_id', workspaceId);

      if (error) {
        throw new Error(`Failed to remove member: ${error.message}`);
      }
    } catch (error: any) {
      console.error('Error removing member:', error);
      throw error;
    }
  }

  /**
   * Get workspace social accounts
   */
  async getWorkspaceSocialAccounts(
    workspaceId: string,
    userId: string
  ): Promise<WorkspaceSocialAccount[]> {
    try {
      // Check if user has access to this workspace
      await this.validateWorkspaceAccess(workspaceId, userId);

      const { data, error } = await supabaseAdmin
        .from('workspace_social_accounts')
        .select(
          `
          id,
          workspace_id,
          social_account_id,
          social_accounts (
            provider,
            account_name,
            expires_at,
            metadata
          )
        `
        )
        .eq('workspace_id', workspaceId);

      if (error) {
        throw new Error(`Failed to fetch social accounts: ${error.message}`);
      }

      return (
        data?.map((account: any) => ({
          id: account.id,
          workspace_id: account.workspace_id,
          social_account_id: account.social_account_id,
          provider: account.social_accounts?.provider || '',
          account_name: account.social_accounts?.account_name || '',
          expires_at: account.social_accounts?.expires_at,
          metadata: account.social_accounts?.metadata,
        })) || []
      );
    } catch (error: any) {
      console.error('Error fetching workspace social accounts:', error);
      throw error;
    }
  }

  /**
   * Link social account to workspace
   */
  async linkSocialAccount(
    workspaceId: string,
    request: LinkSocialAccountRequest,
    userId: string
  ): Promise<WorkspaceSocialAccount> {
    try {
      // Check if user has permission to link accounts
      await this.validateWorkspacePermission(workspaceId, userId, [
        'owner',
        'manager',
      ]);

      // Check if account exists and belongs to user
      const { data: socialAccount, error: accountError } = await supabaseAdmin
        .from('social_accounts')
        .select('*')
        .eq('id', request.accountId)
        .eq('user_id', userId)
        .single();

      if (accountError) {
        throw new Error(`Social account not found: ${accountError.message}`);
      }

      // Check if already linked to this workspace
      const { data: existingLink } = await supabaseAdmin
        .from('workspace_social_accounts')
        .select('id')
        .eq('workspace_id', workspaceId)
        .eq('social_account_id', request.accountId)
        .single();

      if (existingLink) {
        throw new Error('Social account is already linked to this workspace');
      }

      // Create link
      const { data, error } = await supabaseAdmin
        .from('workspace_social_accounts')
        .insert({
          workspace_id: workspaceId,
          social_account_id: request.accountId,
        })
        .select()
        .single();

      if (error) {
        throw new Error(`Failed to link social account: ${error.message}`);
      }

      return {
        id: data.id,
        workspace_id: data.workspace_id,
        social_account_id: data.social_account_id,
        provider: socialAccount.provider,
        account_name: socialAccount.account_name,
        expires_at: socialAccount.expires_at,
        metadata: socialAccount.metadata,
      };
    } catch (error: any) {
      console.error('Error linking social account:', error);
      throw error;
    }
  }

  /**
   * Unlink social account from workspace
   */
  async unlinkSocialAccount(
    workspaceId: string,
    linkId: string,
    userId: string
  ): Promise<void> {
    try {
      // Check if user has permission to unlink accounts
      await this.validateWorkspacePermission(workspaceId, userId, [
        'owner',
        'manager',
      ]);

      const { error } = await supabaseAdmin
        .from('workspace_social_accounts')
        .delete()
        .eq('id', linkId)
        .eq('workspace_id', workspaceId);

      if (error) {
        throw new Error(`Failed to unlink social account: ${error.message}`);
      }
    } catch (error: any) {
      console.error('Error unlinking social account:', error);
      throw error;
    }
  }

  /**
   * Validate if user has access to workspace
   */
  private async validateWorkspaceAccess(
    workspaceId: string,
    userId: string
  ): Promise<void> {
    const { data, error } = await supabaseAdmin
      .from('workspace_memberships')
      .select('id')
      .eq('workspace_id', workspaceId)
      .eq('user_id', userId)
      .eq('is_active', true)
      .single();

    if (error || !data) {
      throw new Error('Access denied: You are not a member of this workspace');
    }
  }

  /**
   * Validate if user has specific permissions in workspace
   */
  private async validateWorkspacePermission(
    workspaceId: string,
    userId: string,
    allowedRoles: string[]
  ): Promise<void> {
    const { data, error } = await supabaseAdmin
      .from('workspace_memberships')
      .select('role')
      .eq('workspace_id', workspaceId)
      .eq('user_id', userId)
      .eq('is_active', true)
      .single();

    if (error || !data) {
      throw new Error('Access denied: You are not a member of this workspace');
    }

    if (!allowedRoles.includes(data.role)) {
      throw new Error(
        `Access denied: Your role (${data.role}) does not have permission for this action`
      );
    }
  }
}
