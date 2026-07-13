import { Injectable, computed, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { Observable, finalize, map, shareReplay, tap, throwError } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ApiResponse } from '../models/common.model';
import { AuthUser, LoginRequest, LoginResponse, TokenPair } from '../models/auth.model';
import { Role } from '../models/role.enum';
import { TokenStorageService } from './token-storage.service';
import { normalizeAuthUser } from '../utils/entity.util';

const USER_KEY = 'heims_user';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly tokens = inject(TokenStorageService);
  private readonly router = inject(Router);

  private readonly currentUserSignal = signal<AuthUser | null>(this.readStoredUser());

  private refreshRequest$: Observable<TokenPair> | null = null;

  readonly currentUser = computed(() => this.currentUserSignal());
  readonly isAuthenticated = computed(() => !!this.currentUserSignal());

  login(dto: LoginRequest): Observable<LoginResponse> {
    return this.http.post<ApiResponse<LoginResponse>>(`${environment.apiUrl}/auth/login`, dto).pipe(
      map((res) => res.data),
      tap((data) => this.persistSession(data)),
    );
  }

  logout(): void {
    this.http.post(`${environment.apiUrl}/auth/logout`, {}).subscribe({
      complete: () => this.clearSessionAndRedirect(),
      error: () => this.clearSessionAndRedirect(),
    });
  }

  refresh(): Observable<TokenPair> {
    const refreshToken = this.tokens.getRefreshToken();
    if (!refreshToken) {
      return throwError(() => new Error('Missing refresh token'));
    }

    if (!this.refreshRequest$) {
      this.refreshRequest$ = this.http
        .post<ApiResponse<TokenPair>>(`${environment.apiUrl}/auth/refresh`, { refreshToken })
        .pipe(
          map((res) => res.data),
          tap((tokens) => this.tokens.setTokens(tokens)),
          finalize(() => {
            this.refreshRequest$ = null;
          }),
          shareReplay(1),
        );
    }

    return this.refreshRequest$;
  }

  /** Clears the session when tokens can no longer be refreshed. */
  sessionExpired(): void {
    this.refreshRequest$ = null;
    this.clearSessionAndRedirect();
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
    const user = normalizeAuthUser(login.user);
    this.tokens.setTokens(login);
    localStorage.setItem(USER_KEY, JSON.stringify(user));
    this.currentUserSignal.set(user);
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
      const stored = JSON.parse(localStorage.getItem(USER_KEY) ?? 'null') as AuthUser | null;
      return stored ? normalizeAuthUser(stored) : null;
    } catch {
      return null;
    }
  }
}
