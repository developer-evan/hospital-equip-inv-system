import { PaginationQuery } from './common.model';
import { EquipmentStatus } from './equipment-status.enum';

export interface EquipmentDepartmentRef {
  id: string;
  name: string;
  code?: string;
}

export interface Equipment {
  id: string;
  assetNumber: string;
  name: string;
  category: string;
  manufacturer: string;
  model?: string;
  serialNumber: string;
  status: EquipmentStatus;
  department: string | EquipmentDepartmentRef;
  roomLocation?: string;
  supplier?: string;
  purchaseDate?: string;
  warrantyStartDate?: string;
  warrantyEndDate?: string;
  cost?: number;
  pmFrequencyDays?: number;
  calibrationFrequencyDays?: number;
  photoUrls?: string[];
  manualUrls?: string[];
  qrCodeUrl?: string;
  installationDate?: string;
  installedBy?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface CreateEquipmentDto {
  name: string;
  category: string;
  manufacturer: string;
  model?: string;
  serialNumber: string;
  department: string;
  roomLocation?: string;
  supplier?: string;
  purchaseDate?: string;
  warrantyStartDate?: string;
  warrantyEndDate?: string;
  cost?: number;
  pmFrequencyDays?: number;
  calibrationFrequencyDays?: number;
}

export interface EquipmentListQuery extends PaginationQuery {
  department?: string;
  status?: EquipmentStatus;
}

export const EQUIPMENT_STATUS_LABEL: Record<EquipmentStatus, string> = {
  [EquipmentStatus.PENDING_INSTALLATION]: 'Pending Installation',
  [EquipmentStatus.WORKING]: 'Working',
  [EquipmentStatus.UNDER_REPAIR]: 'Under Repair',
  [EquipmentStatus.CONDEMNED]: 'Condemned',
  [EquipmentStatus.DECOMMISSIONED]: 'Decommissioned',
};
