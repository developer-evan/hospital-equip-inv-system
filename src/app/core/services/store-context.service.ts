import { Injectable, Signal, computed, signal } from '@angular/core';

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

/** The set of permissions granted to the current user/role. Swap in real RBAC from AuthService later. */
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

const STORE_PROFILES: StoreProfile[] = [
  {
    id: 'store_001',
    name: 'St. Xavier General Hospital',
    initials: 'SX',
    label: 'Store',
  },
  {
    id: 'store_002',
    name: 'Westside Clinic',
    initials: 'WC',
    label: 'Store',
  },
];

@Injectable({ providedIn: 'root' })
export class StoreContextService {
  private readonly activeStoreId = signal<string>(STORE_PROFILES[0].id);

  readonly activeStoreProfile: Signal<StoreProfile> = computed(
    () => STORE_PROFILES.find((s) => s.id === this.activeStoreId()) ?? STORE_PROFILES[0],
  );

  can(permission: Permission): boolean {
    return GRANTED_PERMISSIONS.has(permission);
  }

  hasMultipleStores(): boolean {
    return STORE_PROFILES.length > 1;
  }

  switchStore(id: string): void {
    this.activeStoreId.set(id);
  }
}
