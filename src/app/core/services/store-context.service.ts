import { Injectable, Signal, computed, inject, signal } from '@angular/core';
import { AuthService } from './auth.service';
import { ROLE_LABEL } from '../models/role.enum';

export interface StoreProfile {
  id: string;
  name: string;
  initials: string;
  label: string;
}

type Permission =
  | 'orders:create'
  | 'equipment:create'
  | 'equipment:edit'
  | 'users:manage'
  | 'reports:view'
  | 'departments:write'
  | 'receiving:register'
  | 'maintenance:create';

const GRANTED_PERMISSIONS = new Set<Permission>([
  'orders:create',
  'equipment:create',
  'equipment:edit',
  'users:manage',
  'reports:view',
  'departments:write',
  'receiving:register',
  'maintenance:create',
]);

@Injectable({ providedIn: 'root' })
export class StoreContextService {
  private readonly auth = inject(AuthService);
  private readonly activeStoreId = signal<string>('store_001');

  readonly activeStoreProfile: Signal<StoreProfile> = computed(() => {
    const user = this.auth.currentUser();
    if (!user) {
      return {
        id: 'store_001',
        name: 'MediTrack Hospital',
        initials: 'MH',
        label: 'Facility',
      };
    }

    return {
      id: user.id,
      name: user.fullName,
      initials: this.auth.getInitials(user.fullName),
      label: ROLE_LABEL[user.role],
    };
  });

  can(permission: Permission): boolean {
    return GRANTED_PERMISSIONS.has(permission);
  }

  hasMultipleStores(): boolean {
    return false;
  }

  switchStore(id: string): void {
    this.activeStoreId.set(id);
  }
}
