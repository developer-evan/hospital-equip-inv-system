/** Mirrors the backend's `DashboardSummary` shape — see src/modules/dashboard/README.md. */
export interface DashboardSummary {
  totalEquipment: number;
  working: number;
  underRepair: number;
  condemned: number;
  pendingInstallation: number;
  decommissioned: number;
  pmDueThisMonth: number;
  receivedToday: number;
}

export interface WeeklyActivityPoint {
  label: string;
  received: number;
  installed: number;
  pmCompleted: number;
}

export interface OperationalHealthMetric {
  axis: string;
  thisWeek: number;
  lastWeek: number;
}

export interface KpiTrend {
  label: string;
  value: string;
  icon: string;
  deltaPercent: number;
  trend: 'up' | 'down';
  comparisonLabel: string;
}

export interface RecentActivityRow {
  assetNumber: string;
  equipmentName: string;
  department: string;
  status: string;
  assignedTo: string;
  avatarInitials: string;
  updatedAt: string;
}
