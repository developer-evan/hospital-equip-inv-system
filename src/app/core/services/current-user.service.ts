import { Injectable, computed, signal } from '@angular/core';
import { AuthUser } from '../models/auth-user.model';
import { Role } from '../models/role.enum';

/**
 * Stands in for the real `AuthService` (see FRONTEND-GUIDE.md § Step 2) until the
 * login flow + token storage are wired up against the backend. The shell/layout and
 * every role-aware view only depend on this small surface (`currentUser`, `hasRole`),
 * so swapping this out later for the real session-backed service is a one-file change.
 */
@Injectable({ providedIn: 'root' })
export class CurrentUserService {
  private readonly userSignal = signal<AuthUser>({
    id: 'usr_001',
    fullName: 'Dr. Amara Okafor',
    initials: 'AO',
    email: 'amara.okafor@meditrack.health',
    role: Role.ADMINISTRATOR,
    facility: 'St. Xavier General Hospital',
  });

  readonly currentUser = computed(() => this.userSignal());

  hasRole(...roles: Role[]): boolean {
    return roles.includes(this.userSignal().role);
  }

  isAdmin(): boolean {
    return this.hasRole(Role.ADMINISTRATOR);
  }
}
