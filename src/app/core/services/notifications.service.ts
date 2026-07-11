import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';
import { ApiService } from './api.service';
import { ApiResponse } from '../models/common.model';
import { Notification, NotificationListQuery, UnreadCount } from '../models/notification.model';
import { normalizeNotification } from '../utils/entity.util';

@Injectable({ providedIn: 'root' })
export class NotificationsService {
  private readonly api = inject(ApiService);

  list(query: NotificationListQuery): Observable<ApiResponse<Notification[]>> {
    const params = {
      ...query,
      unreadOnly: query.unreadOnly ? 'true' : undefined,
    };
    return this.api
      .list<Notification>('/notifications', params as Record<string, unknown>)
      .pipe(map((res) => this.mapList(res)));
  }

  unreadCount(): Observable<ApiResponse<UnreadCount>> {
    return this.api.get<UnreadCount>('/notifications/unread-count');
  }

  markRead(id: string): Observable<ApiResponse<Notification>> {
    return this.api
      .patch<Notification>(`/notifications/${id}/read`, {})
      .pipe(map((res) => ({ ...res, data: normalizeNotification(res.data) })));
  }

  markAllRead(): Observable<ApiResponse<void>> {
    return this.api.patch<void>('/notifications/read-all', {});
  }

  private mapList(res: ApiResponse<Notification[]>): ApiResponse<Notification[]> {
    return {
      ...res,
      data: (res.data ?? []).map(normalizeNotification).filter((item) => !!item.id),
    };
  }
}
