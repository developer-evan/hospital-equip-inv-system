import { Injectable, inject } from '@angular/core';
import { Observable, catchError, map, of, shareReplay, tap } from 'rxjs';
import { Equipment } from '../models/equipment.model';
import { MaintenanceEquipmentRef, MaintenanceRecord } from '../models/maintenance.model';
import { EquipmentService } from './equipment.service';

@Injectable({ providedIn: 'root' })
export class EquipmentLabelCacheService {
  private readonly equipmentService = inject(EquipmentService);
  private readonly cache = new Map<string, Equipment>();
  private preload$?: Observable<void>;

  /** Warm cache from the equipment list (first 100 assets). */
  preload(): Observable<void> {
    if (!this.preload$) {
      this.preload$ = this.equipmentService.list({ page: 1, limit: 100 }).pipe(
        tap((res) => {
          for (const item of res.data ?? []) {
            if (item.id) this.cache.set(item.id, item);
          }
        }),
        map(() => undefined),
        shareReplay(1),
      );
    }
    return this.preload$;
  }

  fetchById(id: string): Observable<Equipment | undefined> {
    const cached = this.cache.get(id);
    if (cached?.name?.trim()) {
      return of(cached);
    }

    return this.equipmentService.getById(id).pipe(
      tap((res) => {
        if (res.data?.id) this.cache.set(res.data.id, res.data);
      }),
      map((res) => res.data),
      catchError(() => of(undefined)),
    );
  }

  maintenanceEquipmentId(equipment: MaintenanceRecord['equipment']): string {
    if (typeof equipment === 'string') return equipment;
    return equipment.id;
  }

  maintenanceEquipmentHasName(equipment: MaintenanceRecord['equipment']): boolean {
    return typeof equipment === 'object' && !!equipment.name?.trim();
  }

  toEquipmentRef(equipment: Equipment): MaintenanceEquipmentRef {
    return {
      id: equipment.id,
      name: equipment.name,
      assetNumber: equipment.assetNumber,
      department: equipment.department,
    };
  }

  /** Fill equipment name/asset when the maintenance API only returned an id or partial embed. */
  enrichMaintenanceRecord(record: MaintenanceRecord): Observable<MaintenanceRecord> {
    const equipment = record.equipment;
    if (this.maintenanceEquipmentHasName(equipment)) {
      return of(record);
    }

    const id = this.maintenanceEquipmentId(equipment);
    if (!id) {
      return of(record);
    }

    return this.fetchById(id).pipe(
      map((item) =>
        item
          ? { ...record, equipment: this.toEquipmentRef(item) }
          : record,
      ),
    );
  }

  displayFor(equipment: MaintenanceRecord['equipment']): {
    name: string;
    assetNumber: string;
  } {
    if (typeof equipment === 'object' && equipment.name?.trim()) {
      return {
        name: equipment.name,
        assetNumber: equipment.assetNumber ?? '',
      };
    }

    const id = this.maintenanceEquipmentId(equipment);
    const cached = id ? this.cache.get(id) : undefined;
    if (cached?.name?.trim()) {
      return { name: cached.name, assetNumber: cached.assetNumber ?? '' };
    }

    return { name: '—', assetNumber: '' };
  }
}
