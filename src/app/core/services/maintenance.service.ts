import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';
import { ApiService } from './api.service';
import { ApiResponse, PaginationQuery } from '../models/common.model';
import {
  CompleteMaintenanceDto,
  CreateMaintenanceDto,
  MaintenanceListQuery,
  MaintenanceRecord,
  UpdateMaintenanceDto,
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

  getSchedule(query: MaintenanceListQuery = {}): Observable<ApiResponse<MaintenanceRecord[]>> {
    return this.api
      .list<MaintenanceRecord>('/maintenance/schedule', query as Record<string, unknown>)
      .pipe(map((res) => this.mapList(res)));
  }

  getById(id: string): Observable<ApiResponse<MaintenanceRecord>> {
    return this.api.get<MaintenanceRecord>(`/maintenance/${id}`).pipe(map((res) => this.mapOne(res)));
  }

  getEquipmentHistory(
    equipmentId: string,
    query: PaginationQuery = {},
  ): Observable<ApiResponse<MaintenanceRecord[]>> {
    return this.api
      .list<MaintenanceRecord>(
        `/maintenance/equipment/${equipmentId}/history`,
        query as Record<string, unknown>,
      )
      .pipe(map((res) => this.mapList(res)));
  }

  create(dto: CreateMaintenanceDto): Observable<ApiResponse<MaintenanceRecord>> {
    return this.api
      .post<MaintenanceRecord>('/maintenance', dto)
      .pipe(map((res) => this.mapOne(res)));
  }

  update(id: string, dto: UpdateMaintenanceDto): Observable<ApiResponse<MaintenanceRecord>> {
    return this.api
      .patch<MaintenanceRecord>(`/maintenance/${id}`, dto)
      .pipe(map((res) => this.mapOne(res)));
  }

  complete(id: string, dto: CompleteMaintenanceDto): Observable<ApiResponse<MaintenanceRecord>> {
    return this.api
      .patch<MaintenanceRecord>(`/maintenance/${id}/complete`, dto)
      .pipe(map((res) => this.mapOne(res)));
  }

  uploadPhotos(id: string, files: File[]): Observable<ApiResponse<MaintenanceRecord>> {
    const formData = new FormData();
    files.forEach((file) => formData.append('photos', file));

    return this.api
      .post<MaintenanceRecord>(`/maintenance/${id}/photos`, formData)
      .pipe(map((res) => this.mapOne(res)));
  }

  remove(id: string): Observable<void> {
    return this.api.delete(`/maintenance/${id}`);
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
