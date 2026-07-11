import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';
import { ApiService } from './api.service';
import { ApiResponse } from '../models/common.model';
import { CreateEquipmentDto, Equipment } from '../models/equipment.model';
import { EquipmentStatus } from '../models/equipment-status.enum';
import { normalizeEquipment } from '../utils/entity.util';

export interface ConfirmInstallationDto {
  installationDate: string;
  note?: string;
}

export interface ChangeEquipmentStatusDto {
  status: EquipmentStatus;
  note?: string;
}

@Injectable({ providedIn: 'root' })
export class ReceivingService {
  private readonly api = inject(ApiService);

  register(dto: CreateEquipmentDto): Observable<ApiResponse<Equipment>> {
    return this.api
      .post<Equipment>('/receiving/register', dto)
      .pipe(map((res) => ({ ...res, data: normalizeEquipment(res.data) })));
  }

  confirmInstallation(
    equipmentId: string,
    dto: ConfirmInstallationDto,
  ): Observable<ApiResponse<Equipment>> {
    return this.api
      .patch<Equipment>(`/receiving/${equipmentId}/confirm-installation`, dto)
      .pipe(map((res) => ({ ...res, data: normalizeEquipment(res.data) })));
  }

  changeStatus(
    equipmentId: string,
    dto: ChangeEquipmentStatusDto,
  ): Observable<ApiResponse<Equipment>> {
    return this.api
      .patch<Equipment>(`/receiving/${equipmentId}/change-status`, dto)
      .pipe(map((res) => ({ ...res, data: normalizeEquipment(res.data) })));
  }
}
