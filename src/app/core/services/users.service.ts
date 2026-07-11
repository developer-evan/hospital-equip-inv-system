import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';
import { ApiService } from './api.service';
import { ApiResponse, PaginationQuery } from '../models/common.model';
import {
  AdminResetPasswordDto,
  CreateUserDto,
  UpdateUserStatusDto,
  User,
} from '../models/user.model';
import { normalizeUser } from '../utils/entity.util';

@Injectable({ providedIn: 'root' })
export class UsersService {
  private readonly api = inject(ApiService);

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
