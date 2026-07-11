import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';
import { delay } from 'rxjs/operators';
import {
  DashboardSummary,
  KpiTrend,
  OperationalHealthMetric,
  RecentActivityRow,
  WeeklyActivityPoint,
} from '../../core/models/dashboard-summary.model';

const SUMMARY: DashboardSummary = {
  totalEquipment: 1284,
  working: 1042,
  underRepair: 96,
  condemned: 21,
  pendingInstallation: 38,
  decommissioned: 87,
  pmDueThisMonth: 63,
  receivedToday: 7,
};

const KPI_TRENDS: KpiTrend[] = [
  {
    label: 'Total Equipment',
    value: '1,284',
    icon: 'pi pi-box',
    deltaPercent: 4.6,
    trend: 'up',
    comparisonLabel: 'vs last month',
  },
  {
    label: 'Operational Units',
    value: '1,042',
    icon: 'pi pi-check-circle',
    deltaPercent: 2.1,
    trend: 'up',
    comparisonLabel: 'vs last month',
  },
  {
    label: 'Under Repair',
    value: '96',
    icon: 'pi pi-wrench',
    deltaPercent: 3.4,
    trend: 'down',
    comparisonLabel: 'vs last month',
  },
  {
    label: 'PM Due This Month',
    value: '63',
    icon: 'pi pi-calendar-clock',
    deltaPercent: 8.2,
    trend: 'up',
    comparisonLabel: 'vs last month',
  },
];

const WEEKLY_ACTIVITY: WeeklyActivityPoint[] = [
  { label: 'Mon', received: 14, installed: 9, pmCompleted: 6 },
  { label: 'Tue', received: 18, installed: 12, pmCompleted: 9 },
  { label: 'Wed', received: 12, installed: 15, pmCompleted: 11 },
  { label: 'Thu', received: 24, installed: 19, pmCompleted: 16 },
  { label: 'Fri', received: 16, installed: 11, pmCompleted: 13 },
  { label: 'Sat', received: 9, installed: 7, pmCompleted: 8 },
  { label: 'Sun', received: 20, installed: 17, pmCompleted: 15 },
];

const OPERATIONAL_HEALTH: OperationalHealthMetric[] = [
  { axis: 'Equipment Uptime', thisWeek: 92, lastWeek: 85 },
  { axis: 'PM Compliance', thisWeek: 88, lastWeek: 80 },
  { axis: 'Response Time', thisWeek: 76, lastWeek: 70 },
  { axis: 'Inventory Accuracy', thisWeek: 95, lastWeek: 90 },
  { axis: 'Dept. Coverage', thisWeek: 83, lastWeek: 78 },
];

const RECENT_ACTIVITY: RecentActivityRow[] = [
  {
    assetNumber: '#EQ-3124',
    equipmentName: 'Philips Patient Monitor MX450',
    department: 'ICU',
    status: 'WORKING',
    assignedTo: 'Grace Adeyemi',
    avatarInitials: 'GA',
    updatedAt: 'Jul 10, 2026',
  },
  {
    assetNumber: '#EQ-3125',
    equipmentName: 'Drager Fabius Anesthesia Machine',
    department: 'Surgery',
    status: 'UNDER_REPAIR',
    assignedTo: 'Tunde Bakare',
    avatarInitials: 'TB',
    updatedAt: 'Jul 10, 2026',
  },
  {
    assetNumber: '#EQ-3126',
    equipmentName: 'GE Voluson E10 Ultrasound',
    department: 'Radiology',
    status: 'PENDING_INSTALLATION',
    assignedTo: 'Marcus Osei',
    avatarInitials: 'MO',
    updatedAt: 'Jul 9, 2026',
  },
  {
    assetNumber: '#EQ-3121',
    equipmentName: 'Baxter Infusion Pump Sigma Spectrum',
    department: 'Pediatrics',
    status: 'WORKING',
    assignedTo: 'Grace Adeyemi',
    avatarInitials: 'GA',
    updatedAt: 'Jul 9, 2026',
  },
  {
    assetNumber: '#EQ-3118',
    equipmentName: 'Mindray BeneVision N22 Monitor',
    department: 'Emergency',
    status: 'CONDEMNED',
    assignedTo: 'Tunde Bakare',
    avatarInitials: 'TB',
    updatedAt: 'Jul 8, 2026',
  },
  {
    assetNumber: '#EQ-3109',
    equipmentName: 'Siemens Somatom X.ceed CT Scanner',
    department: 'Radiology',
    status: 'WORKING',
    assignedTo: 'Marcus Osei',
    avatarInitials: 'MO',
    updatedAt: 'Jul 8, 2026',
  },
  {
    assetNumber: '#EQ-3097',
    equipmentName: 'Stryker Electric Hospital Bed',
    department: 'Orthopedics',
    status: 'DECOMMISSIONED',
    assignedTo: 'Grace Adeyemi',
    avatarInitials: 'GA',
    updatedAt: 'Jul 7, 2026',
  },
];

/**
 * Serves mock data shaped exactly like the eventual `GET /dashboard/summary` response
 * (see FRONTEND-GUIDE.md § Step 14) so this service — and every component consuming it —
 * can be pointed at `ApiService` later without touching the dashboard component itself.
 */
@Injectable({ providedIn: 'root' })
export class DashboardService {
  getSummary(): Observable<DashboardSummary> {
    return of(SUMMARY).pipe(delay(150));
  }

  getKpiTrends(): Observable<KpiTrend[]> {
    return of(KPI_TRENDS).pipe(delay(150));
  }

  getWeeklyActivity(): Observable<WeeklyActivityPoint[]> {
    return of(WEEKLY_ACTIVITY).pipe(delay(150));
  }

  getOperationalHealth(): Observable<OperationalHealthMetric[]> {
    return of(OPERATIONAL_HEALTH).pipe(delay(150));
  }

  getRecentActivity(): Observable<RecentActivityRow[]> {
    return of(RECENT_ACTIVITY).pipe(delay(150));
  }
}
