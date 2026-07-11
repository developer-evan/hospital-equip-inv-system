import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from './api.service';
import { ApiResponse, PaginationQuery } from '../models/common.model';
import { CreateDepartmentDto, Department } from '../models/department.model';

@Injectable({ providedIn: 'root' })
export class DepartmentsService {
  private readonly api = inject(ApiService);

  list(query: PaginationQuery): Observable<ApiResponse<Department[]>> {
    return this.api.list<Department>('/departments', query);
  }

  active(): Observable<ApiResponse<Department[]>> {
    return this.api.get<Department[]>('/departments/active');
  }

  create(dto: CreateDepartmentDto): Observable<ApiResponse<Department>> {
    return this.api.post<Department>('/departments', dto);
  }

  update(id: string, dto: Partial<CreateDepartmentDto>): Observable<ApiResponse<Department>> {
    return this.api.patch<Department>(`/departments/${id}`, dto);
  }

  remove(id: string): Observable<void> {
    return this.api.delete(`/departments/${id}`);
  }
}
