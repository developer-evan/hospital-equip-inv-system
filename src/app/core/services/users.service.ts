import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from './api.service';
import { ApiResponse, PaginationQuery } from '../models/common.model';
import {
  AdminResetPasswordDto,
  CreateUserDto,
  UpdateUserStatusDto,
  User,
} from '../models/user.model';

@Injectable({ providedIn: 'root' })
export class UsersService {
  private readonly api = inject(ApiService);

  list(query: PaginationQuery): Observable<ApiResponse<User[]>> {
    return this.api.list<User>('/users', query);
  }

  getById(id: string): Observable<ApiResponse<User>> {
    return this.api.get<User>(`/users/${id}`);
  }

  create(dto: CreateUserDto): Observable<ApiResponse<User>> {
    return this.api.post<User>('/users', dto);
  }

  update(id: string, dto: Partial<CreateUserDto>): Observable<ApiResponse<User>> {
    return this.api.patch<User>(`/users/${id}`, dto);
  }

  updateStatus(id: string, isActive: boolean): Observable<ApiResponse<User>> {
    const body: UpdateUserStatusDto = { isActive };
    return this.api.patch<User>(`/users/${id}/status`, body);
  }

  resetPassword(id: string, newPassword: string): Observable<ApiResponse<User>> {
    const body: AdminResetPasswordDto = { newPassword };
    return this.api.patch<User>(`/users/${id}/password`, body);
  }

  remove(id: string): Observable<void> {
    return this.api.delete(`/users/${id}`);
  }
}
