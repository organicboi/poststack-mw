import { Router, Request, Response, NextFunction } from 'express';
import { validateBody, validateQuery, validateParams, ValidatedRequest } from '../common/middleware/validation';
import { RegisterDto, LoginDto, ResetPasswordDto, OAuthLoginDto } from '../modules/auth/auth.dto';
import {
  CreateWorkspaceDto,
  UpdateWorkspaceDto,
  InviteMemberDto,
  WorkspaceParamsDto,
  WorkspaceQueryDto,
  MemberParamsDto
} from '../modules/workspace/workspace.dto';

const router = Router();

// Authentication Routes with Validation Examples

// Register endpoint with body validation
router.post('/auth/register',
  validateBody(RegisterDto),
  async (req: ValidatedRequest<RegisterDto>, res: Response, next: NextFunction) => {
    try {
      // Type-safe access to validated data
      const { email, password, fullName, redirectTo } = req.validatedBody!;

      // Your registration logic here
      console.log('Registering user:', { email, fullName });

      res.status(201).json({
        success: true,
        message: 'User registered successfully',
        data: { email, fullName }
      });
    } catch (error) {
      next(error);
    }
  }
);

// Login endpoint with body validation
router.post('/auth/login',
  validateBody(LoginDto),
  async (req: ValidatedRequest<LoginDto>, res: Response, next: NextFunction) => {
    try {
      const { email, password, redirectTo } = req.validatedBody!;

      // Your login logic here
      console.log('Logging in user:', email);

      res.json({
        success: true,
        message: 'Login successful',
        data: { email, redirectTo }
      });
    } catch (error) {
      next(error);
    }
  }
);

// Password reset with body validation
router.post('/auth/reset-password',
  validateBody(ResetPasswordDto),
  async (req: ValidatedRequest<ResetPasswordDto>, res: Response, next: NextFunction) => {
    try {
      const { email, redirectTo } = req.validatedBody!;

      // Your password reset logic here
      console.log('Password reset requested for:', email);

      res.json({
        success: true,
        message: 'Password reset email sent'
      });
    } catch (error) {
      next(error);
    }
  }
);

// OAuth login with body validation
router.post('/auth/oauth',
  validateBody(OAuthLoginDto),
  async (req: ValidatedRequest<OAuthLoginDto>, res: Response, next: NextFunction) => {
    try {
      const { provider, redirectTo, scopes } = req.validatedBody!;

      // Your OAuth logic here
      console.log('OAuth login:', { provider, scopes });

      res.json({
        success: true,
        message: 'OAuth URL generated',
        data: { provider, redirectTo }
      });
    } catch (error) {
      next(error);
    }
  }
);

// Workspace Routes with Validation Examples

// Create workspace with body validation
router.post('/workspaces',
  validateBody(CreateWorkspaceDto),
  async (req: ValidatedRequest<CreateWorkspaceDto>, res: Response, next: NextFunction) => {
    try {
      const { name, settings, is_default } = req.validatedBody!;

      // Your workspace creation logic here
      console.log('Creating workspace:', { name, is_default });

      res.status(201).json({
        success: true,
        message: 'Workspace created successfully',
        data: { name, settings, is_default }
      });
    } catch (error) {
      next(error);
    }
  }
);

// Get workspaces with query validation
router.get('/workspaces',
  validateQuery(WorkspaceQueryDto),
  async (req: ValidatedRequest<WorkspaceQueryDto>, res: Response, next: NextFunction) => {
    try {
      const { search, sortBy, sortOrder, limit, offset } = req.validatedQuery!;

      // Your workspace fetching logic here
      console.log('Fetching workspaces with filters:', { search, sortBy, sortOrder, limit, offset });

      res.json({
        success: true,
        message: 'Workspaces retrieved successfully',
        data: {
          workspaces: [],
          pagination: { limit, offset }
        }
      });
    } catch (error) {
      next(error);
    }
  }
);

// Update workspace with params and body validation
router.put('/workspaces/:workspaceId',
  validateParams(WorkspaceParamsDto),
  validateBody(UpdateWorkspaceDto),
  async (req: ValidatedRequest<UpdateWorkspaceDto>, res: Response, next: NextFunction) => {
    try {
      const { workspaceId } = req.validatedParams! as WorkspaceParamsDto;
      const { name, settings, is_active } = req.validatedBody!;

      // Your workspace update logic here
      console.log('Updating workspace:', { workspaceId, name, is_active });

      res.json({
        success: true,
        message: 'Workspace updated successfully',
        data: { workspaceId, name, settings, is_active }
      });
    } catch (error) {
      next(error);
    }
  }
);

// Invite member with params and body validation
router.post('/workspaces/:workspaceId/members',
  validateParams(WorkspaceParamsDto),
  validateBody(InviteMemberDto),
  async (req: ValidatedRequest<InviteMemberDto>, res: Response, next: NextFunction) => {
    try {
      const { workspaceId } = req.validatedParams! as WorkspaceParamsDto;
      const { email, role, customMessage } = req.validatedBody!;

      // Your member invitation logic here
      console.log('Inviting member:', { workspaceId, email, role });

      res.status(201).json({
        success: true,
        message: 'Member invited successfully',
        data: { workspaceId, email, role, customMessage }
      });
    } catch (error) {
      next(error);
    }
  }
);

// Remove member with params validation
router.delete('/workspaces/:workspaceId/members/:memberId',
  validateParams(MemberParamsDto),
  async (req: ValidatedRequest, res: Response, next: NextFunction) => {
    try {
      const { workspaceId, memberId } = req.validatedParams! as MemberParamsDto;

      // Your member removal logic here
      console.log('Removing member:', { workspaceId, memberId });

      res.json({
        success: true,
        message: 'Member removed successfully',
        data: { workspaceId, memberId }
      });
    } catch (error) {
      next(error);
    }
  }
);

// Example of combining multiple validation types
router.get('/workspaces/:workspaceId/members',
  validateParams(WorkspaceParamsDto),
  validateQuery(WorkspaceQueryDto),
  async (req: ValidatedRequest, res: Response, next: NextFunction) => {
    try {
      const { workspaceId } = req.validatedParams! as WorkspaceParamsDto;
      const { search, limit, offset } = req.validatedQuery! as WorkspaceQueryDto;

      // Your member fetching logic here
      console.log('Fetching workspace members:', { workspaceId, search, limit, offset });

      res.json({
        success: true,
        message: 'Workspace members retrieved successfully',
        data: {
          workspaceId,
          members: [],
          pagination: { limit, offset }
        }
      });
    } catch (error) {
      next(error);
    }
  }
);

// Example of custom validation with multiple DTOs
router.post('/workspaces/:workspaceId/invite-bulk',
  validateParams(WorkspaceParamsDto),
  validateBody(InviteMemberDto, {
    skipMissingProperties: false,
    forbidNonWhitelisted: true
  }),
  async (req: ValidatedRequest<InviteMemberDto>, res: Response, next: NextFunction) => {
    try {
      const { workspaceId } = req.validatedParams! as WorkspaceParamsDto;
      const invitationData = req.validatedBody!;

      // Your bulk invitation logic here
      console.log('Bulk member invitation:', { workspaceId, invitationData });

      res.status(201).json({
        success: true,
        message: 'Members invited successfully',
        data: { workspaceId, invited: [invitationData] }
      });
    } catch (error) {
      next(error);
    }
  }
);

export { router as validationExamplesRouter };

// Type-safe controller functions examples
export class AuthController {
  static async register(req: ValidatedRequest<RegisterDto>, res: Response, next: NextFunction) {
    try {
      // Type-safe access to validated data
      const userData = req.validatedBody!;

      // Implementation here
      res.status(201).json({
        success: true,
        message: 'User registered successfully',
        data: { email: userData.email }
      });
    } catch (error) {
      next(error);
    }
  }

  static async login(req: ValidatedRequest<LoginDto>, res: Response, next: NextFunction) {
    try {
      const credentials = req.validatedBody!;

      // Implementation here
      res.json({
        success: true,
        message: 'Login successful',
        data: { email: credentials.email }
      });
    } catch (error) {
      next(error);
    }
  }
}

export class WorkspaceController {
  static async create(req: ValidatedRequest<CreateWorkspaceDto>, res: Response, next: NextFunction) {
    try {
      const workspaceData = req.validatedBody!;

      // Implementation here
      res.status(201).json({
        success: true,
        message: 'Workspace created successfully',
        data: workspaceData
      });
    } catch (error) {
      next(error);
    }
  }

  static async update(req: ValidatedRequest<UpdateWorkspaceDto>, res: Response, next: NextFunction) {
    try {
      const { workspaceId } = req.validatedParams! as WorkspaceParamsDto;
      const updateData = req.validatedBody!;

      // Implementation here
      res.json({
        success: true,
        message: 'Workspace updated successfully',
        data: { workspaceId, ...updateData }
      });
    } catch (error) {
      next(error);
    }
  }
}