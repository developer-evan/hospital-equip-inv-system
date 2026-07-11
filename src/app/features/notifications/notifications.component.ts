import {
  ChangeDetectionStrategy,
  Component,
  inject,
  OnInit,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Button } from 'primeng/button';
import { TableLazyLoadEvent, TableModule } from 'primeng/table';
import { Tag } from 'primeng/tag';
import { ToggleSwitch } from 'primeng/toggleswitch';
import { TooltipModule } from 'primeng/tooltip';

import { NotificationsService } from '../../core/services/notifications.service';
import { PaginationMeta } from '../../core/models/common.model';
import { Notification } from '../../core/models/notification.model';

@Component({
  selector: 'app-notifications',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormsModule, Button, TableModule, Tag, ToggleSwitch, TooltipModule],
  template: `
    <div class="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h2 class="text-xl font-semibold text-white">Notifications</h2>
        <p class="mt-1 text-sm text-slate-500">Alerts and updates across your facility.</p>
      </div>
      <p-button type="button" icon="pi pi-check" label="Mark all read" [outlined]="true" severity="secondary" styleClass="!rounded-xl" (onClick)="markAllRead()" />
    </div>

    <div class="overflow-hidden rounded-2xl border border-white/5 bg-[#111319]">
      <p-table [value]="notifications()" [loading]="loading()" [lazy]="true" [paginator]="true" [rows]="pageSize" [totalRecords]="totalRecords()" (onLazyLoad)="onLazyLoad($event)" styleClass="dashboard-table" paginatorStyleClass="dashboard-paginator" [rowHover]="true">
        <ng-template #caption>
          <div class="flex items-center gap-3">
            <span class="text-sm text-slate-400">Unread only</span>
            <p-toggleswitch [(ngModel)]="unreadOnly" (ngModelChange)="onFilterChanged()" />
          </div>
        </ng-template>
        <ng-template #header>
          <tr>
            <th class="!w-28">Status</th>
            <th>Notification</th>
            <th class="!w-40">Date</th>
            <th class="!w-24"></th>
          </tr>
        </ng-template>
        <ng-template #body let-item>
          <tr [class.opacity-60]="item.isRead">
            <td>
              <p-tag [value]="item.isRead ? 'Read' : 'Unread'" [severity]="item.isRead ? 'secondary' : 'warn'" styleClass="!text-xs" />
            </td>
            <td>
              <p class="font-medium text-slate-200">{{ item.title }}</p>
              <p class="mt-0.5 text-sm text-slate-500">{{ item.message }}</p>
            </td>
            <td class="text-sm text-slate-500">{{ formatDate(item.createdAt) }}</td>
            <td class="text-right">
              @if (!item.isRead) {
                <p-button type="button" icon="pi pi-check" [rounded]="true" [text]="true" pTooltip="Mark read" (onClick)="markRead(item)" />
              }
            </td>
          </tr>
        </ng-template>
        <ng-template #emptymessage>
          <tr><td colspan="4"><div class="py-14 text-center text-sm text-slate-500">No notifications.</div></td></tr>
        </ng-template>
      </p-table>
    </div>
  `,
})
export class NotificationsComponent implements OnInit {
  private readonly notificationsService = inject(NotificationsService);

  protected readonly pageSize = 10;
  readonly notifications = signal<Notification[]>([]);
  readonly totalRecords = signal(0);
  readonly loading = signal(false);

  unreadOnly = false;
  private currentPage = 1;

  ngOnInit(): void {}

  onLazyLoad(event: TableLazyLoadEvent): void {
    this.currentPage = event.first! / event.rows! + 1;
    this.load(event.rows ?? this.pageSize);
  }

  onFilterChanged(): void {
    this.currentPage = 1;
    this.load();
  }

  markRead(item: Notification): void {
    this.notificationsService.markRead(item.id).subscribe({ next: () => this.load() });
  }

  markAllRead(): void {
    this.notificationsService.markAllRead().subscribe({ next: () => this.load() });
  }

  formatDate(value: string): string {
    return value ? new Date(value).toLocaleString() : '—';
  }

  private load(limit = this.pageSize): void {
    this.loading.set(true);
    this.notificationsService.list({ page: this.currentPage, limit, unreadOnly: this.unreadOnly || undefined }).subscribe({
      next: (res) => {
        this.notifications.set(res.data);
        this.totalRecords.set((res.meta as PaginationMeta).totalItems ?? res.data.length);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }
}
