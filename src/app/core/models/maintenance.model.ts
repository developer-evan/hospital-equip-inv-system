import { PaginationQuery } from './common.model';
import { EquipmentDepartmentRef } from './equipment.model';
import { MaintenanceStatus } from './maintenance-status.enum';
import { MaintenanceType } from './maintenance-type.enum';

export interface MaintenanceEquipmentRef {
  id: string;
  name: string;
  assetNumber?: string;
  department?: string | EquipmentDepartmentRef;
}

export interface MaintenanceEngineerRef {
  id: string;
  fullName: string;
}

export interface MaintenanceRecord {
  id: string;
  equipment: string | MaintenanceEquipmentRef;
  type: MaintenanceType;
  status: MaintenanceStatus;
  scheduledDate: string;
  performedDate?: string;
  nextDueDate?: string;
  engineer?: string | MaintenanceEngineerRef;
  serviceReport?: string;
  photoUrls?: string[];
  createdAt?: string;
  updatedAt?: string;
}

export interface CreateMaintenanceDto {
  equipment: string;
  type: MaintenanceType;
  scheduledDate: string;
  engineer?: string;
}

export interface UpdateMaintenanceDto {
  type?: MaintenanceType;
  scheduledDate?: string;
  engineer?: string;
}

export interface CompleteMaintenanceDto {
  performedDate: string;
  serviceReport: string;
}

export interface MaintenanceListQuery extends PaginationQuery {
  equipment?: string;
  engineer?: string;
  type?: MaintenanceType;
  status?: MaintenanceStatus;
  from?: string;
  to?: string;
}

export const MAINTENANCE_STATUS_LABEL: Record<MaintenanceStatus, string> = {
  [MaintenanceStatus.SCHEDULED]: 'Scheduled',
  [MaintenanceStatus.IN_PROGRESS]: 'In Progress',
  [MaintenanceStatus.OVERDUE]: 'Overdue',
  [MaintenanceStatus.COMPLETED]: 'Completed',
};
