import {
  IsEmail,
  IsString,
  IsOptional,
  IsUUID,
  IsIn,
  IsBoolean,
  MinLength,
  MaxLength,
  IsObject,
  ValidateNested,
  IsArray,
  ArrayMaxSize
} from 'class-validator';
import { Expose, Transform, Type } from 'class-transformer';

export class CreateWorkspaceDto {
  @Expose()
  @IsString({ message: 'Workspace name must be a string' })
  @MinLength(1, { message: 'Workspace name is required' })
  @MaxLength(100, { message: 'Workspace name must not exceed 100 characters' })
  @Transform(({ value }) => value?.trim())
  name!: string;

  @Expose()
  @IsOptional()
  @IsObject({ message: 'Settings must be an object' })
  settings?: Record<string, any>;

  @Expose()
  @IsOptional()
  @IsBoolean({ message: 'is_default must be a boolean' })
  is_default?: boolean;
}

export class UpdateWorkspaceDto {
  @Expose()
  @IsOptional()
  @IsString({ message: 'Workspace name must be a string' })
  @MinLength(1, { message: 'Workspace name cannot be empty' })
  @MaxLength(100, { message: 'Workspace name must not exceed 100 characters' })
  @Transform(({ value }) => value?.trim())
  name?: string;

  @Expose()
  @IsOptional()
  @IsObject({ message: 'Settings must be an object' })
  settings?: Record<string, any>;

  @Expose()
  @IsOptional()
  @IsBoolean({ message: 'is_active must be a boolean' })
  is_active?: boolean;
}

export class InviteMemberDto {
  @Expose()
  @IsEmail({}, { message: 'Please provide a valid email address' })
  @Transform(({ value }) => value?.toLowerCase().trim())
  email!: string;

  @Expose()
  @IsString({ message: 'Role must be a string' })
  @IsIn(['owner', 'manager', 'editor', 'viewer'], {
    message: 'Role must be one of: owner, manager, editor, viewer'
  })
  role!: 'owner' | 'manager' | 'editor' | 'viewer';

  @Expose()
  @IsOptional()
  @IsString({ message: 'Custom message must be a string' })
  @MaxLength(500, { message: 'Custom message must not exceed 500 characters' })
  customMessage?: string;
}

export class UpdateMemberRoleDto {
  @Expose()
  @IsString({ message: 'Role must be a string' })
  @IsIn(['owner', 'manager', 'editor', 'viewer'], {
    message: 'Role must be one of: owner, manager, editor, viewer'
  })
  role!: 'owner' | 'manager' | 'editor' | 'viewer';
}

export class LinkSocialAccountDto {
  @Expose()
  @IsString({ message: 'Account ID must be a string' })
  @MinLength(1, { message: 'Account ID is required' })
  accountId!: string;

  @Expose()
  @IsOptional()
  @IsObject({ message: 'Metadata must be an object' })
  metadata?: Record<string, any>;
}

export class WorkspaceParamsDto {
  @Expose()
  @IsString({ message: 'Workspace ID must be a string' })
  @IsUUID('4', { message: 'Workspace ID must be a valid UUID' })
  workspaceId!: string;
}

export class MemberParamsDto extends WorkspaceParamsDto {
  @Expose()
  @IsString({ message: 'Member ID must be a string' })
  @IsUUID('4', { message: 'Member ID must be a valid UUID' })
  memberId!: string;
}

export class WorkspaceQueryDto {
  @Expose()
  @IsOptional()
  @IsString({ message: 'Search term must be a string' })
  @MaxLength(100, { message: 'Search term must not exceed 100 characters' })
  search?: string;

  @Expose()
  @IsOptional()
  @IsString({ message: 'Sort field must be a string' })
  @IsIn(['name', 'created_at', 'updated_at'], {
    message: 'Sort field must be one of: name, created_at, updated_at'
  })
  sortBy?: 'name' | 'created_at' | 'updated_at';

  @Expose()
  @IsOptional()
  @IsString({ message: 'Sort order must be a string' })
  @IsIn(['asc', 'desc'], {
    message: 'Sort order must be one of: asc, desc'
  })
  sortOrder?: 'asc' | 'desc';

  @Expose()
  @IsOptional()
  @Transform(({ value }) => parseInt(value))
  @Type(() => Number)
  limit?: number;

  @Expose()
  @IsOptional()
  @Transform(({ value }) => parseInt(value))
  @Type(() => Number)
  offset?: number;
}

export class MemberQueryDto {
  @Expose()
  @IsOptional()
  @IsString({ message: 'Role filter must be a string' })
  @IsIn(['owner', 'manager', 'editor', 'viewer'], {
    message: 'Role must be one of: owner, manager, editor, viewer'
  })
  role?: 'owner' | 'manager' | 'editor' | 'viewer';

  @Expose()
  @IsOptional()
  @IsString({ message: 'Search term must be a string' })
  @MaxLength(100, { message: 'Search term must not exceed 100 characters' })
  search?: string;

  @Expose()
  @IsOptional()
  @Transform(({ value }) => value === 'true')
  @IsBoolean({ message: 'is_active must be a boolean' })
  is_active?: boolean;

  @Expose()
  @IsOptional()
  @Transform(({ value }) => parseInt(value))
  @Type(() => Number)
  limit?: number;

  @Expose()
  @IsOptional()
  @Transform(({ value }) => parseInt(value))
  @Type(() => Number)
  offset?: number;
}

export class BulkInviteMembersDto {
  @Expose()
  @IsArray({ message: 'Invitations must be an array' })
  @ArrayMaxSize(50, { message: 'Cannot invite more than 50 members at once' })
  @ValidateNested({ each: true })
  @Type(() => InviteMemberDto)
  invitations!: InviteMemberDto[];

  @Expose()
  @IsOptional()
  @IsString({ message: 'Custom message must be a string' })
  @MaxLength(500, { message: 'Custom message must not exceed 500 characters' })
  customMessage?: string;
}