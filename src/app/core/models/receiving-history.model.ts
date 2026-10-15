import { EquipmentStatus } from './equipment-status.enum';

export interface ReceivingHistoryUserRef {
  id: string;
  fullName: string;
}

export interface ReceivingHistoryEntry {
  id: string;
  fromStatus?: EquipmentStatus | null;
  toStatus: EquipmentStatus;
  changedAt: string;
  note?: string;
  changedBy?: ReceivingHistoryUserRef | string;
}
