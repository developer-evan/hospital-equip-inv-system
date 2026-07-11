import { PaginationQuery } from './common.model';

export interface Notification {
  id: string;
  title: string;
  message: string;
  isRead: boolean;
  type?: string;
  link?: string;
  createdAt: string;
}

export interface NotificationListQuery extends PaginationQuery {
  unreadOnly?: boolean;
}

export interface UnreadCount {
  count: number;
}
