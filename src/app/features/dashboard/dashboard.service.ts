import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';
import {
  DashboardSummary,
  DepartmentBreakdownItem,
  KpiTrend,
  RecentActivityRow,
} from '../../core/models/dashboard-summary.model';
import { ApiService } from '../../core/services/api.service';
import { resolveEntityId } from '../../core/utils/entity.util';

function formatCount(value: number | undefined): string {
  return (value ?? 0).toLocaleString();
}

function resolveDepartmentLabel(item: DepartmentBreakdownItem): string {
  return item.name ?? item.department ?? 'Unknown';
}

function resolveDepartmentRef(value: unknown): string {
  if (typeof value === 'string') return value;
  if (value && typeof value === 'object') {
    const record = value as Record<string, unknown>;
    if (typeof record['name'] === 'string') return record['name'];
    if (typeof record['code'] === 'string') return record['code'];
  }
  return 'Unknown';
}

function formatActivityDate(value: unknown): string {
  if (!value) return '—';
  const date = new Date(String(value));
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

function initialsFromName(name: string): string {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('');
}

@Injectable({ providedIn: 'root' })
export class DashboardService {
  private readonly api = inject(ApiService);

  getSummary(departmentId?: string): Observable<DashboardSummary> {
    const query = departmentId ? { department: departmentId } : {};
    return this.api.get<DashboardSummary>('/dashboard/summary', query).pipe(
      map((res) => this.normalizeSummary(res.data)),
    );
  }

  buildKpiTrends(summary: DashboardSummary): KpiTrend[] {
    return [
      {
        label: 'Total Equipment',
        value: formatCount(summary.totalEquipment),
        icon: 'pi pi-box',
      },
      {
        label: 'Operational Units',
        value: formatCount(summary.working),
        icon: 'pi pi-check-circle',
      },
      {
        label: 'Under Repair',
        value: formatCount(summary.underRepair),
        icon: 'pi pi-wrench',
      },
      {
        label: 'PM Due This Month',
        value: formatCount(summary.pmDueThisMonth),
        icon: 'pi pi-calendar-clock',
      },
      {
        label: 'Pending Installation',
        value: formatCount(summary.pendingInstallation),
        icon: 'pi pi-clock',
      },
      {
        label: 'Condemned',
        value: formatCount(summary.condemned),
        icon: 'pi pi-times-circle',
      },
      {
        label: 'Decommissioned',
        value: formatCount(summary.decommissioned),
        icon: 'pi pi-ban',
      },
      {
        label: 'Received Today',
        value: formatCount(summary.receivedToday),
        icon: 'pi pi-inbox',
      },
    ];
  }

  private normalizeSummary(data: DashboardSummary): DashboardSummary {
    return {
      ...data,
      totalEquipment: data.totalEquipment ?? 0,
      working: data.working ?? 0,
      underRepair: data.underRepair ?? 0,
      condemned: data.condemned ?? 0,
      pendingInstallation: data.pendingInstallation ?? 0,
      decommissioned: data.decommissioned ?? 0,
      pmDueThisMonth: data.pmDueThisMonth ?? 0,
      receivedToday: data.receivedToday ?? 0,
      byDepartment: (data.byDepartment ?? []).map((item) => this.normalizeDepartmentBreakdown(item)),
      weeklyActivity: data.weeklyActivity ?? [],
      operationalHealth: data.operationalHealth ?? [],
      recentActivity: (data.recentActivity ?? []).map((item) => this.normalizeRecentActivity(item)),
    };
  }

  private normalizeDepartmentBreakdown(item: DepartmentBreakdownItem): DepartmentBreakdownItem {
    return {
      ...item,
      departmentId: item.departmentId ?? resolveEntityId(item),
      name: resolveDepartmentLabel(item),
      count: item.count ?? 0,
    };
  }

  private normalizeRecentActivity(item: RecentActivityRow | Record<string, unknown>): RecentActivityRow {
    const record = item as Record<string, unknown>;
    const assignedTo =
      typeof record['assignedTo'] === 'string'
        ? record['assignedTo']
        : typeof (record['assignedTo'] as Record<string, unknown> | undefined)?.['fullName'] === 'string'
          ? String((record['assignedTo'] as Record<string, unknown>)['fullName'])
          : typeof record['assignedEngineer'] === 'string'
            ? String(record['assignedEngineer'])
            : '—';

    const equipmentName =
      typeof record['equipmentName'] === 'string'
        ? record['equipmentName']
        : typeof record['name'] === 'string'
          ? record['name']
          : 'Unknown equipment';

    return {
      assetNumber:
        typeof record['assetNumber'] === 'string'
          ? record['assetNumber']
          : typeof record['assetTag'] === 'string'
            ? record['assetTag']
            : '—',
      equipmentName,
      department: resolveDepartmentRef(record['department']),
      status: typeof record['status'] === 'string' ? record['status'] : 'UNKNOWN',
      assignedTo,
      avatarInitials:
        typeof record['avatarInitials'] === 'string' ? record['avatarInitials'] : initialsFromName(assignedTo),
      updatedAt: formatActivityDate(record['updatedAt'] ?? record['changedAt'] ?? record['createdAt']),
    };
  }
}
