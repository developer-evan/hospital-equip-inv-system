import { Injectable, computed, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { Observable, catchError, map, of, tap, throwError } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ApiResponse } from '../models/common.model';
import { AuthUser, LoginRequest, LoginResponse } from '../models/auth.model';
import { Role } from '../models/role.enum';
import { TokenStorageService } from './token-storage.service';

const USER_KEY = 'heims_user';

const MOCK_LOGIN: LoginResponse = {
  accessToken: 'mock-access-token',
  refreshToken: 'mock-refresh-token',
  user: {
    id: 'usr_001',
    username: 'admin',
    email: 'admin@meditrack.health',
    fullName: 'Dr. Amara Okafor',
    role: Role.ADMINISTRATOR,
    departments: [],
  },
};

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly tokens = inject(TokenStorageService);
  private readonly router = inject(Router);

  private readonly currentUserSignal = signal<AuthUser | null>(this.readStoredUser());

  readonly currentUser = computed(() => this.currentUserSignal());
  readonly isAuthenticated = computed(() => !!this.currentUserSignal());

  login(dto: LoginRequest): Observable<LoginResponse> {
    return this.http.post<ApiResponse<LoginResponse>>(`${environment.apiUrl}/auth/login`, dto).pipe(
      map((res) => res.data),
      tap((data) => this.persistSession(data)),
      catchError((err) => {
        if (environment.enableMockAuth && dto.username && dto.password) {
          const mock = { ...MOCK_LOGIN, user: { ...MOCK_LOGIN.user, username: dto.username } };
          this.persistSession(mock);
          return of(mock);
        }
        return throwError(() => err);
      }),
    );
  }

  logout(): void {
    const token = this.tokens.getAccessToken();
    if (!token || token.startsWith('mock-')) {
      this.clearSessionAndRedirect();
      return;
    }

    this.http.post(`${environment.apiUrl}/auth/logout`, {}).subscribe({
      complete: () => this.clearSessionAndRedirect(),
      error: () => this.clearSessionAndRedirect(),
    });
  }

  hasRole(...roles: Role[]): boolean {
    const user = this.currentUserSignal();
    return !!user && roles.includes(user.role);
  }

  isAdmin(): boolean {
    return this.hasRole(Role.ADMINISTRATOR);
  }

  getInitials(fullName: string): string {
    return fullName
      .split(' ')
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase() ?? '')
      .join('');
  }

  private persistSession(login: LoginResponse): void {
    this.tokens.setTokens(login);
    localStorage.setItem(USER_KEY, JSON.stringify(login.user));
    this.currentUserSignal.set(login.user);
  }

  private clearSessionAndRedirect(): void {
    this.tokens.clear();
    localStorage.removeItem(USER_KEY);
    this.currentUserSignal.set(null);
    void this.router.navigate(['/login']);
  }

  private readStoredUser(): AuthUser | null {
    const token = this.tokens.getAccessToken();
    if (!token) return null;
    try {
      return JSON.parse(localStorage.getItem(USER_KEY) ?? 'null') as AuthUser | null;
    } catch {
      return null;
    }
  }
}
