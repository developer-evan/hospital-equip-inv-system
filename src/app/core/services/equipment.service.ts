import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';
import { ApiService } from './api.service';
import { ApiResponse, PaginationQuery } from '../models/common.model';
import { EquipmentStatus } from '../models/equipment-status.enum';
import {
  CreateEquipmentDto,
  Equipment,
  EquipmentListQuery,
} from '../models/equipment.model';
import { normalizeEquipment } from '../utils/entity.util';

@Injectable({ providedIn: 'root' })
export class EquipmentService {
  private readonly api = inject(ApiService);

  list(query: EquipmentListQuery): Observable<ApiResponse<Equipment[]>> {
    return this.api.list<Equipment>('/equipment', query as Record<string, unknown>).pipe(
      map((res) => this.mapList(res)),
    );
  }

  listByDepartment(
    departmentId: string,
    query: PaginationQuery = {},
  ): Observable<ApiResponse<Equipment[]>> {
    return this.api
      .list<Equipment>(`/equipment/department/${departmentId}`, query as Record<string, unknown>)
      .pipe(map((res) => this.mapList(res)));
  }

  listByStatus(
    status: EquipmentStatus,
    query: PaginationQuery = {},
  ): Observable<ApiResponse<Equipment[]>> {
    return this.api
      .list<Equipment>(`/equipment/status/${status}`, query as Record<string, unknown>)
      .pipe(map((res) => this.mapList(res)));
  }

  getById(id: string): Observable<ApiResponse<Equipment>> {
    return this.api.get<Equipment>(`/equipment/${id}`).pipe(map((res) => this.mapOne(res)));
  }

  getQrCode(id: string): Observable<Blob> {
    return this.api.downloadFile(`/equipment/${id}/qr-code`);
  }

  create(dto: CreateEquipmentDto): Observable<ApiResponse<Equipment>> {
    return this.api.post<Equipment>('/equipment', dto).pipe(map((res) => this.mapOne(res)));
  }

  update(id: string, dto: Partial<CreateEquipmentDto>): Observable<ApiResponse<Equipment>> {
    return this.api.patch<Equipment>(`/equipment/${id}`, dto).pipe(map((res) => this.mapOne(res)));
  }

  uploadPhotos(id: string, files: File[]): Observable<ApiResponse<Equipment>> {
    const formData = new FormData();
    files.forEach((file) => formData.append('photos', file));

    return this.api
      .post<Equipment>(`/equipment/${id}/photos`, formData)
      .pipe(map((res) => this.mapOne(res)));
  }

  uploadManual(id: string, file: File): Observable<ApiResponse<Equipment>> {
    const formData = new FormData();
    formData.append('manual', file);

    return this.api
      .post<Equipment>(`/equipment/${id}/manual`, formData)
      .pipe(map((res) => this.mapOne(res)));
  }

  regenerateQrCode(id: string): Observable<ApiResponse<Equipment>> {
    return this.api
      .post<Equipment>(`/equipment/${id}/qr-code/regenerate`, {})
      .pipe(map((res) => this.mapOne(res)));
  }

  remove(id: string): Observable<void> {
    return this.api.delete(`/equipment/${id}`);
  }

  private mapList(res: ApiResponse<Equipment[]>): ApiResponse<Equipment[]> {
    return {
      ...res,
      data: (res.data ?? []).map((item) => normalizeEquipment(item)).filter((item) => !!item.id),
    };
  }

  private mapOne(res: ApiResponse<Equipment>): ApiResponse<Equipment> {
    return { ...res, data: normalizeEquipment(res.data) };
  }
}
