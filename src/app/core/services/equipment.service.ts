import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';
import { ApiService } from './api.service';
import { ApiResponse } from '../models/common.model';
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

  getById(id: string): Observable<ApiResponse<Equipment>> {
    return this.api.get<Equipment>(`/equipment/${id}`).pipe(map((res) => this.mapOne(res)));
  }

  create(dto: CreateEquipmentDto): Observable<ApiResponse<Equipment>> {
    return this.api.post<Equipment>('/equipment', dto).pipe(map((res) => this.mapOne(res)));
  }

  update(id: string, dto: Partial<CreateEquipmentDto>): Observable<ApiResponse<Equipment>> {
    return this.api.patch<Equipment>(`/equipment/${id}`, dto).pipe(map((res) => this.mapOne(res)));
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
