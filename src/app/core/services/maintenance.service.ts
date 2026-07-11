import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';
import { ApiService } from './api.service';
import { ApiResponse } from '../models/common.model';
import {
  CompleteMaintenanceDto,
  CreateMaintenanceDto,
  MaintenanceListQuery,
  MaintenanceRecord,
} from '../models/maintenance.model';
import { normalizeMaintenance } from '../utils/entity.util';

@Injectable({ providedIn: 'root' })
export class MaintenanceService {
  private readonly api = inject(ApiService);

  list(query: MaintenanceListQuery): Observable<ApiResponse<MaintenanceRecord[]>> {
    return this.api
      .list<MaintenanceRecord>('/maintenance', query as Record<string, unknown>)
      .pipe(map((res) => this.mapList(res)));
  }

  create(dto: CreateMaintenanceDto): Observable<ApiResponse<MaintenanceRecord>> {
    return this.api
      .post<MaintenanceRecord>('/maintenance', dto)
      .pipe(map((res) => this.mapOne(res)));
  }

  complete(id: string, dto: CompleteMaintenanceDto): Observable<ApiResponse<MaintenanceRecord>> {
    return this.api
      .patch<MaintenanceRecord>(`/maintenance/${id}/complete`, dto)
      .pipe(map((res) => this.mapOne(res)));
  }

  private mapList(res: ApiResponse<MaintenanceRecord[]>): ApiResponse<MaintenanceRecord[]> {
    return {
      ...res,
      data: (res.data ?? []).map(normalizeMaintenance).filter((item) => !!item.id),
    };
  }

  private mapOne(res: ApiResponse<MaintenanceRecord>): ApiResponse<MaintenanceRecord> {
    return { ...res, data: normalizeMaintenance(res.data) };
  }
}
