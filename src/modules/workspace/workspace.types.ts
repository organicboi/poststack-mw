// Core Types
export type WorkspaceRole = 'owner' | 'manager' | 'editor' | 'viewer';

// Permission Types
export interface WorkspacePermissions {
  canCreateWorkspace: boolean;
  canUpdateWorkspace: boolean;
  canDeleteWorkspace: boolean;
  canInviteMembers: boolean;
  canRemoveMembers: boolean;
  canUpdateMemberRoles: boolean;
  canManageSocialAccounts: boolean;
  canViewMembers: boolean;
  canViewWorkspaceDetails: boolean;
  canSwitchWorkspace: boolean;
}

// Enhanced Workspace Interface
export interface Workspace {
  id: string;
  name: string;
  created_by: string;
  created_at: string;
  updated_at?: string;
  is_default?: boolean;
  is_active?: boolean;
  settings?: WorkspaceSettings;
  role?: WorkspaceRole;
  member_count?: number;
  social_accounts_count?: number;
}

export interface WorkspaceSettings {
  timezone?: string;
  default_posting_schedule?: {
    monday: { enabled: boolean; times: string[] };
    tuesday: { enabled: boolean; times: string[] };
    wednesday: { enabled: boolean; times: string[] };
    thursday: { enabled: boolean; times: string[] };
    friday: { enabled: boolean; times: string[] };
    saturday: { enabled: boolean; times: string[] };
    sunday: { enabled: boolean; times: string[] };
  };
  auto_approve_posts?: boolean;
  notifications?: {
    email: boolean;
    slack: boolean;
    discord: boolean;
  };
  branding?: {
    logo_url?: string;
    primary_color?: string;
    secondary_color?: string;
  };
}

// Enhanced Member Interface
export interface WorkspaceMember {
  id?: string;
  user_id: string;
  workspace_id: string;
  role: WorkspaceRole;
  email: string;
  user_name?: string;
  avatar_url?: string;
  is_active?: boolean;
  joined_at?: string;
  last_active_at?: string;
  invited_by?: string;
  permissions?: WorkspacePermissions;
}

// Enhanced Social Account Interface
export interface WorkspaceSocialAccount {
  id: string;
  workspace_id: string;
  social_account_id: string;
  provider: string;
  account_name: string;
  account_username?: string;
  profile_picture_url?: string;
  follower_count?: number;
  is_active?: boolean;
  expires_at?: string;
  last_sync_at?: string;
  metadata?: SocialAccountMetadata;
  linked_by?: string;
  linked_at?: string;
}

export interface SocialAccountMetadata {
  access_token_expires?: string;
  refresh_token_expires?: string;
  scope?: string[];
  account_type?: 'personal' | 'business';
  verified?: boolean;
  features?: string[];
}

// Request/Response Types
export interface CreateWorkspaceRequest {
  name: string;
  settings?: Partial<WorkspaceSettings>;
}

export interface UpdateWorkspaceRequest {
  name?: string;
  settings?: Partial<WorkspaceSettings>;
}

export interface InviteMemberRequest {
  email: string;
  role: WorkspaceRole;
  send_invitation_email?: boolean;
}

export interface UpdateMemberRoleRequest {
  role: WorkspaceRole;
  notify_member?: boolean;
}

export interface RemoveMemberRequest {
  notify_member?: boolean;
  reason?: string;
}

export interface LinkSocialAccountRequest {
  accountId: string;
  is_active?: boolean;
}

export interface SwitchWorkspaceRequest {
  workspace_id: string;
}

// Enhanced User Context
export interface UserContext {
  user_id: string;
  workspace_id: string;
  workspace_name: string;
  user_role: WorkspaceRole;
  is_default: boolean;
  workspace_accounts: string[];
  permissions: WorkspacePermissions;
  workspace_settings?: WorkspaceSettings;
}

// Response Types
export interface WorkspaceListResponse {
  workspaces: Workspace[];
  total_count: number;
  active_workspace_id?: string;
}

export interface WorkspaceDetailsResponse extends Workspace {
  members: WorkspaceMember[];
  social_accounts: WorkspaceSocialAccount[];
  permissions: WorkspacePermissions;
}

export interface MemberInvitationResponse {
  member: WorkspaceMember;
  invitation_sent: boolean;
  invitation_expires_at?: string;
}

// Validation Types
export interface WorkspaceAccessValidation {
  has_access: boolean;
  user_role?: WorkspaceRole;
  permissions?: WorkspacePermissions;
  reason?: string;
}

export interface PermissionValidation {
  has_permission: boolean;
  required_roles: WorkspaceRole[];
  user_role?: WorkspaceRole;
  reason?: string;
}
