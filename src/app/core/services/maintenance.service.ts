import { Injectable, inject } from '@angular/core';
import { Observable, forkJoin, map, of, switchMap } from 'rxjs';
import { EquipmentLabelCacheService } from './equipment-label-cache.service';
import { ApiService } from './api.service';
import { ApiResponse, PaginationQuery } from '../models/common.model';
import {
  CompleteMaintenanceDto,
  CreateMaintenanceDto,
  MaintenanceListQuery,
  MaintenanceRecord,
  UpdateMaintenanceDto,
  VerifyMaintenanceDto,
} from '../models/maintenance.model';
import { normalizeMaintenance } from '../utils/entity.util';

@Injectable({ providedIn: 'root' })
export class MaintenanceService {
  private readonly api = inject(ApiService);
  private readonly equipmentLabels = inject(EquipmentLabelCacheService);

  list(query: MaintenanceListQuery): Observable<ApiResponse<MaintenanceRecord[]>> {
    return this.api
      .list<MaintenanceRecord>('/maintenance', query as Record<string, unknown>)
      .pipe(switchMap((res) => this.mapListEnriched(res)));
  }

  getSchedule(query: MaintenanceListQuery = {}): Observable<ApiResponse<MaintenanceRecord[]>> {
    return this.api
      .list<MaintenanceRecord>('/maintenance/schedule', query as Record<string, unknown>)
      .pipe(switchMap((res) => this.mapListEnriched(res)));
  }

  getById(id: string): Observable<ApiResponse<MaintenanceRecord>> {
    return this.api
      .get<MaintenanceRecord>(`/maintenance/${id}`)
      .pipe(switchMap((res) => this.mapOneEnriched(res)));
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
      .pipe(switchMap((res) => this.mapListEnriched(res)));
  }

  create(dto: CreateMaintenanceDto): Observable<ApiResponse<MaintenanceRecord>> {
    return this.api.post<MaintenanceRecord>('/maintenance', dto).pipe(
      switchMap((res) => {
        const id = normalizeMaintenance(res.data).id;
        return id ? this.getById(id) : of(this.mapOne(res));
      }),
    );
  }

  update(id: string, dto: UpdateMaintenanceDto): Observable<ApiResponse<MaintenanceRecord>> {
    return this.api
      .patch<MaintenanceRecord>(`/maintenance/${id}`, dto)
      .pipe(switchMap(() => this.getById(id)));
  }

  complete(id: string, dto: CompleteMaintenanceDto): Observable<ApiResponse<MaintenanceRecord>> {
    return this.api
      .patch<MaintenanceRecord>(`/maintenance/${id}/complete`, dto)
      .pipe(switchMap(() => this.getById(id)));
  }

  verify(id: string, dto: VerifyMaintenanceDto = {}): Observable<ApiResponse<MaintenanceRecord>> {
    return this.api
      .patch<MaintenanceRecord>(`/maintenance/${id}/verify`, dto)
      .pipe(switchMap(() => this.getById(id)));
  }

  uploadPhotos(id: string, files: File[]): Observable<ApiResponse<MaintenanceRecord>> {
    const formData = new FormData();
    files.forEach((file) => formData.append('photos', file));

    return this.api
      .post<MaintenanceRecord>(`/maintenance/${id}/photos`, formData)
      .pipe(switchMap(() => this.getById(id)));
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

  private mapOneEnriched(
    res: ApiResponse<MaintenanceRecord>,
  ): Observable<ApiResponse<MaintenanceRecord>> {
    const mapped = this.mapOne(res);
    return this.equipmentLabels.enrichMaintenanceRecord(mapped.data).pipe(
      map((data) => ({ ...mapped, data })),
    );
  }

  private mapListEnriched(
    res: ApiResponse<MaintenanceRecord[]>,
  ): Observable<ApiResponse<MaintenanceRecord[]>> {
    const mapped = this.mapList(res);
    if (!mapped.data.length) {
      return of(mapped);
    }

    return this.equipmentLabels.preload().pipe(
      switchMap(() =>
        forkJoin(mapped.data.map((item) => this.equipmentLabels.enrichMaintenanceRecord(item))).pipe(
          map((data) => ({ ...mapped, data })),
        ),
      ),
    );
  }
}
