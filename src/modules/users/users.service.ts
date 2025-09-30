import { db } from '../../database/database.service';
import { UpdateUserDto } from '../../types/core-modules.types';

/**
 * User Management Service
 */
export class UsersService {
  /**
   * Find a user by ID
   */
  async findById(id: string) {
    const user = await db.findUser(id);
    if (!user) {
      throw new Error('User not found');
    }
    return user;
  }

  /**
   * Find a user by email
   */
  async findByEmail(email: string) {
    return await db.findUserByEmail(email);
  }

  /**
   * Update user profile
   */
  async updateUser(id: string, updates: UpdateUserDto) {
    return await db.updateUser(id, updates);
  }

  /**
   * Deactivate user account
   */
  async deactivateUser(id: string) {
    return await db.updateUser(id, { is_active: false });
  }

  /**
   * Get user stats
   */
  async getUserStats(userId: string) {
    const [postsCount, workspacesCount, socialAccountsCount] =
      await Promise.all([
        db.findUserPosts(userId, {}).then(result => result.total),
        db.countUserWorkspaces(userId),
        db.countSocialAccounts(userId),
      ]);

    return {
      postsCount,
      workspacesCount,
      socialAccountsCount,
    };
  }
}
