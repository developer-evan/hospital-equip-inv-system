import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ApiResponse, PaginationQuery } from '../models/common.model';

@Injectable({ providedIn: 'root' })
export class ApiService {
  private readonly http = inject(HttpClient);

  list<T>(path: string, query: PaginationQuery | Record<string, unknown> = {}): Observable<ApiResponse<T[]>> {
    const params = Object.fromEntries(
      Object.entries(query).filter(([, value]) => value !== undefined && value !== null && value !== ''),
    );
    return this.http.get<ApiResponse<T[]>>(`${environment.apiUrl}${path}`, {
      params: params as Record<string, string>,
    });
  }

  get<T>(path: string): Observable<ApiResponse<T>> {
    return this.http.get<ApiResponse<T>>(`${environment.apiUrl}${path}`);
  }

  post<T>(path: string, body: unknown): Observable<ApiResponse<T>> {
    return this.http.post<ApiResponse<T>>(`${environment.apiUrl}${path}`, body);
  }

  patch<T>(path: string, body: unknown): Observable<ApiResponse<T>> {
    return this.http.patch<ApiResponse<T>>(`${environment.apiUrl}${path}`, body);
  }

  delete(path: string): Observable<void> {
    return this.http.delete<void>(`${environment.apiUrl}${path}`);
  }
}
