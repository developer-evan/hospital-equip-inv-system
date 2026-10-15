import { Injectable, inject } from '@angular/core';
import { Observable, catchError, map, of } from 'rxjs';
import { ApiService } from './api.service';
import { AuthService } from './auth.service';
import { ApiResponse, PaginationQuery } from '../models/common.model';
import { Role, ROLE_LABEL } from '../models/role.enum';
import {
  AdminResetPasswordDto,
  CreateUserDto,
  UpdateUserStatusDto,
  User,
} from '../models/user.model';
import { normalizeUser, normalizeUserProfile } from '../utils/entity.util';
import { ChangePasswordDto } from '../models/profile.model';
import { UserProfile } from '../models/profile.model';

const VERIFIER_ROLES = new Set<Role>([
  Role.ADMINISTRATOR,
  Role.BIOMEDICAL_ENGINEER,
  Role.DEPARTMENT_USER,
]);

@Injectable({ providedIn: 'root' })
export class UsersService {
  private readonly api = inject(ApiService);
  private readonly auth = inject(AuthService);

  list(query: PaginationQuery): Observable<ApiResponse<User[]>> {
    return this.api.list<User>('/users', query).pipe(map((res) => this.mapUsers(res)));
  }

  getById(id: string): Observable<ApiResponse<User>> {
    return this.api.get<User>(`/users/${id}`).pipe(map((res) => this.mapUser(res)));
  }

  create(dto: CreateUserDto): Observable<ApiResponse<User>> {
    return this.api.post<User>('/users', dto).pipe(map((res) => this.mapUser(res)));
  }

  update(id: string, dto: Partial<CreateUserDto>): Observable<ApiResponse<User>> {
    return this.api.patch<User>(`/users/${id}`, dto).pipe(map((res) => this.mapUser(res)));
  }

  updateStatus(id: string, isActive: boolean): Observable<ApiResponse<User>> {
    const body: UpdateUserStatusDto = { isActive };
    return this.api.patch<User>(`/users/${id}/status`, body).pipe(map((res) => this.mapUser(res)));
  }

  resetPassword(id: string, newPassword: string): Observable<ApiResponse<User>> {
    const body: AdminResetPasswordDto = { newPassword };
    return this.api.patch<User>(`/users/${id}/password`, body).pipe(map((res) => this.mapUser(res)));
  }

  remove(id: string): Observable<void> {
    return this.api.delete(`/users/${id}`);
  }

  /**
   * Dropdown options for maintenance “verification in charge” (API field: `engineer`).
   * Uses documented `GET /users` when allowed; otherwise falls back to the signed-in user.
   */
  verificationAssigneeOptions(): Observable<Array<{ label: string; value: string }>> {
    return this.list({ page: 1, limit: 100 }).pipe(
      map((res) => this.mapVerifierOptions(res.data ?? [])),
      map((options) => (options.length ? options : this.currentUserOption())),
      catchError(() => of(this.currentUserOption())),
    );
  }

  getMe(): Observable<ApiResponse<UserProfile>> {
    return this.api.get<UserProfile>('/users/me').pipe(
      map((res) => ({ ...res, data: normalizeUserProfile(res.data) })),
    );
  }

  changeMyPassword(dto: ChangePasswordDto): Observable<ApiResponse<void>> {
    return this.api.patch<void>('/users/me/password', dto);
  }

  private mapVerifierOptions(users: User[]): Array<{ label: string; value: string }> {
    return users
      .filter((user) => user.isActive !== false && VERIFIER_ROLES.has(user.role))
      .map((user) => ({
        label: `${user.fullName} (${ROLE_LABEL[user.role]})`,
        value: user.id,
      }));
  }

  private currentUserOption(): Array<{ label: string; value: string }> {
    const user = this.auth.currentUser();
    if (!user) return [];
    return [{ label: `${user.fullName} (${ROLE_LABEL[user.role]})`, value: user.id }];
  }

  private mapUsers(res: ApiResponse<User[]>): ApiResponse<User[]> {
    return {
      ...res,
      data: (res.data ?? []).map((user) => normalizeUser(user)).filter((user) => !!user.id),
    };
  }

  private mapUser(res: ApiResponse<User>): ApiResponse<User> {
    return { ...res, data: normalizeUser(res.data) };
  }
}
