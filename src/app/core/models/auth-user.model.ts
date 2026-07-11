import { Role } from './role.enum';

export interface AuthUser {
  id: string;
  fullName: string;
  initials: string;
  email: string;
  role: Role;
  facility: string;
}
