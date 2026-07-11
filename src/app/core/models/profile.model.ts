import { Role } from './role.enum';
import { UserDepartmentRef } from './user.model';

export interface UserProfile {
  id: string;
  username: string;
  email: string;
  fullName: string;
  role: Role;
  departments: UserDepartmentRef[];
  isActive: boolean;
  lastLoginAt?: string;
  createdAt?: string;
}

export interface ChangePasswordDto {
  currentPassword: string;
  newPassword: string;
}
