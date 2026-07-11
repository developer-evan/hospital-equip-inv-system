import { Injectable, Signal, computed, inject, signal } from '@angular/core';
import { AuthService } from './auth.service';
import { Role, ROLE_LABEL } from '../models/role.enum';

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

const ADMIN_ONLY: Permission[] = ['users:manage', 'reports:view', 'departments:write'];

const ROLE_PERMISSIONS: Record<Role, Permission[]> = {
  [Role.ADMINISTRATOR]: [
    'orders:create',
    'equipment:create',
    'equipment:edit',
    'users:manage',
    'reports:view',
    'departments:write',
    'receiving:register',
    'maintenance:create',
  ],
  [Role.STORE_OFFICER]: [
    'equipment:create',
    'equipment:edit',
    'receiving:register',
    'maintenance:create',
  ],
  [Role.BIOMEDICAL_ENGINEER]: ['equipment:edit', 'maintenance:create'],
  [Role.DEPARTMENT_USER]: [],
};

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
    const user = this.auth.currentUser();
    if (!user) return false;
    return ROLE_PERMISSIONS[user.role]?.includes(permission) ?? false;
  }

  isAdminOnly(permission: Permission): boolean {
    return ADMIN_ONLY.includes(permission);
  }

  hasMultipleStores(): boolean {
    return false;
  }

  switchStore(id: string): void {
    this.activeStoreId.set(id);
  }
}
