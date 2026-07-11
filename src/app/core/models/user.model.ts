import { Role } from './role.enum';

export interface UserDepartmentRef {
  id: string;
  name: string;
  code?: string;
}

export interface User {
  id: string;
  username: string;
  email: string;
  fullName: string;
  role: Role;
  departments: string[] | UserDepartmentRef[];
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface CreateUserDto {
  username: string;
  email: string;
  password: string;
  fullName: string;
  role: Role;
  departments: string[];
}

export interface UpdateUserStatusDto {
  isActive: boolean;
}

export interface AdminResetPasswordDto {
  newPassword: string;
}
