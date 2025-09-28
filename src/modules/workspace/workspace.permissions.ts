import {
  WorkspaceRole,
  WorkspacePermissions,
  WorkspaceAccessValidation,
  PermissionValidation,
} from './workspace.types';
import { AuthorizationError, NotFoundError } from '../../utils/errors';

// Permission matrix mapping roles to their capabilities
const PERMISSION_MATRIX: Record<WorkspaceRole, WorkspacePermissions> = {
  owner: {
    canCreateWorkspace: true,
    canUpdateWorkspace: true,
    canDeleteWorkspace: true,
    canInviteMembers: true,
    canRemoveMembers: true,
    canUpdateMemberRoles: true,
    canManageSocialAccounts: true,
    canViewMembers: true,
    canViewWorkspaceDetails: true,
    canSwitchWorkspace: true,
  },
  manager: {
    canCreateWorkspace: false,
    canUpdateWorkspace: true,
    canDeleteWorkspace: false,
    canInviteMembers: true,
    canRemoveMembers: true,
    canUpdateMemberRoles: false, // Can't promote to owner or demote owners
    canManageSocialAccounts: true,
    canViewMembers: true,
    canViewWorkspaceDetails: true,
    canSwitchWorkspace: true,
  },
  editor: {
    canCreateWorkspace: false,
    canUpdateWorkspace: false,
    canDeleteWorkspace: false,
    canInviteMembers: false,
    canRemoveMembers: false,
    canUpdateMemberRoles: false,
    canManageSocialAccounts: true,
    canViewMembers: true,
    canViewWorkspaceDetails: true,
    canSwitchWorkspace: true,
  },
  viewer: {
    canCreateWorkspace: false,
    canUpdateWorkspace: false,
    canDeleteWorkspace: false,
    canInviteMembers: false,
    canRemoveMembers: false,
    canUpdateMemberRoles: false,
    canManageSocialAccounts: false,
    canViewMembers: true,
    canViewWorkspaceDetails: true,
    canSwitchWorkspace: true,
  },
};

// Role hierarchy for permission validation (higher number = more permissions)
const ROLE_HIERARCHY: Record<WorkspaceRole, number> = {
  viewer: 1,
  editor: 2,
  manager: 3,
  owner: 4,
};

export class WorkspacePermissionManager {
  /**
   * Get permissions for a specific role
   */
  static getPermissionsForRole(role: WorkspaceRole): WorkspacePermissions {
    return { ...PERMISSION_MATRIX[role] };
  }

  /**
   * Check if a role has a specific permission
   */
  static hasPermission(
    userRole: WorkspaceRole,
    permission: keyof WorkspacePermissions
  ): boolean {
    return PERMISSION_MATRIX[userRole][permission];
  }

  /**
   * Validate if user has required permission and throw error if not
   */
  static requirePermission(
    userRole: WorkspaceRole,
    permission: keyof WorkspacePermissions,
    action?: string
  ): void {
    if (!this.hasPermission(userRole, permission)) {
      const actionText = action || permission;
      throw new AuthorizationError(
        `Your role (${userRole}) does not have permission to ${actionText}`
      );
    }
  }

  /**
   * Check if user can perform action on target role (for role management)
   */
  static canManageRole(userRole: WorkspaceRole, targetRole: WorkspaceRole): boolean {
    // Only owners can manage other owners
    if (targetRole === 'owner' && userRole !== 'owner') {
      return false;
    }

    // Managers can manage editors and viewers, but not other managers or owners
    if (userRole === 'manager') {
      return ['editor', 'viewer'].includes(targetRole);
    }

    // Only owners can manage managers
    if (targetRole === 'manager' && userRole !== 'owner') {
      return false;
    }

    // Users can only manage roles lower than their own
    return ROLE_HIERARCHY[userRole] > ROLE_HIERARCHY[targetRole];
  }

  /**
   * Validate role management permission
   */
  static requireRoleManagementPermission(
    userRole: WorkspaceRole,
    targetRole: WorkspaceRole,
    action: string = 'manage this role'
  ): void {
    if (!this.canManageRole(userRole, targetRole)) {
      throw new AuthorizationError(
        `Your role (${userRole}) cannot ${action} for role ${targetRole}`
      );
    }
  }

  /**
   * Check if user can assign a specific role
   */
  static canAssignRole(userRole: WorkspaceRole, roleToAssign: WorkspaceRole): boolean {
    // Only owners can assign owner role
    if (roleToAssign === 'owner' && userRole !== 'owner') {
      return false;
    }

    // Managers can assign editor and viewer roles
    if (userRole === 'manager') {
      return ['editor', 'viewer'].includes(roleToAssign);
    }

    // Users can only assign roles lower than their own
    return ROLE_HIERARCHY[userRole] > ROLE_HIERARCHY[roleToAssign];
  }

  /**
   * Validate role assignment permission
   */
  static requireRoleAssignmentPermission(
    userRole: WorkspaceRole,
    roleToAssign: WorkspaceRole
  ): void {
    if (!this.canAssignRole(userRole, roleToAssign)) {
      throw new AuthorizationError(
        `Your role (${userRole}) cannot assign ${roleToAssign} role`
      );
    }
  }

  /**
   * Validate workspace access and return detailed validation result
   */
  static validateWorkspaceAccess(
    userRole: WorkspaceRole | null,
    isActiveMember: boolean = true
  ): WorkspaceAccessValidation {
    if (!userRole || !isActiveMember) {
      return {
        has_access: false,
        reason: 'User is not a member of this workspace',
      };
    }

    return {
      has_access: true,
      user_role: userRole,
      permissions: this.getPermissionsForRole(userRole),
    };
  }

  /**
   * Validate specific permission and return detailed validation result
   */
  static validatePermission(
    userRole: WorkspaceRole,
    permission: keyof WorkspacePermissions,
    requiredRoles?: WorkspaceRole[]
  ): PermissionValidation {
    const hasPermission = this.hasPermission(userRole, permission);
    const effectiveRequiredRoles = requiredRoles || this.getRequiredRolesForPermission(permission);

    return {
      has_permission: hasPermission,
      required_roles: effectiveRequiredRoles,
      user_role: userRole,
      reason: hasPermission ? undefined : `Permission ${permission} requires one of: ${effectiveRequiredRoles.join(', ')}`,
    };
  }

  /**
   * Get required roles for a specific permission
   */
  static getRequiredRolesForPermission(permission: keyof WorkspacePermissions): WorkspaceRole[] {
    const rolesWithPermission: WorkspaceRole[] = [];

    for (const [role, permissions] of Object.entries(PERMISSION_MATRIX)) {
      if (permissions[permission]) {
        rolesWithPermission.push(role as WorkspaceRole);
      }
    }

    return rolesWithPermission;
  }

  /**
   * Check if role is higher in hierarchy than another role
   */
  static isRoleHigher(role: WorkspaceRole, targetRole: WorkspaceRole): boolean {
    return ROLE_HIERARCHY[role] > ROLE_HIERARCHY[targetRole];
  }

  /**
   * Check if role is equal or higher in hierarchy than another role
   */
  static isRoleEqualOrHigher(role: WorkspaceRole, targetRole: WorkspaceRole): boolean {
    return ROLE_HIERARCHY[role] >= ROLE_HIERARCHY[targetRole];
  }

  /**
   * Get the highest role from a list of roles
   */
  static getHighestRole(roles: WorkspaceRole[]): WorkspaceRole | null {
    if (roles.length === 0) return null;

    return roles.reduce((highest, current) => {
      return ROLE_HIERARCHY[current] > ROLE_HIERARCHY[highest] ? current : highest;
    });
  }

  /**
   * Validate multiple permissions at once
   */
  static hasAllPermissions(
    userRole: WorkspaceRole,
    permissions: (keyof WorkspacePermissions)[]
  ): boolean {
    return permissions.every(permission => this.hasPermission(userRole, permission));
  }

  /**
   * Validate that user has at least one of the specified permissions
   */
  static hasAnyPermission(
    userRole: WorkspaceRole,
    permissions: (keyof WorkspacePermissions)[]
  ): boolean {
    return permissions.some(permission => this.hasPermission(userRole, permission));
  }

  /**
   * Get a summary of what actions a role can perform
   */
  static getRoleCapabilities(role: WorkspaceRole): {
    role: WorkspaceRole;
    hierarchy_level: number;
    permissions: WorkspacePermissions;
    can_manage_roles: WorkspaceRole[];
    can_assign_roles: WorkspaceRole[];
  } {
    const permissions = this.getPermissionsForRole(role);
    const allRoles: WorkspaceRole[] = ['owner', 'manager', 'editor', 'viewer'];

    const canManageRoles = allRoles.filter(targetRole => this.canManageRole(role, targetRole));
    const canAssignRoles = allRoles.filter(targetRole => this.canAssignRole(role, targetRole));

    return {
      role,
      hierarchy_level: ROLE_HIERARCHY[role],
      permissions,
      can_manage_roles: canManageRoles,
      can_assign_roles: canAssignRoles,
    };
  }
}