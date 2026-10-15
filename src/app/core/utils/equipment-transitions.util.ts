import { EquipmentStatus } from '../models/equipment-status.enum';

/** Client-side UX hint; backend enforces authoritative transitions. */
export const ALLOWED_EQUIPMENT_TRANSITIONS: Record<EquipmentStatus, EquipmentStatus[]> = {
  [EquipmentStatus.PENDING_INSTALLATION]: [EquipmentStatus.WORKING],
  [EquipmentStatus.WORKING]: [
    EquipmentStatus.UNDER_REPAIR,
    EquipmentStatus.CONDEMNED,
    EquipmentStatus.DECOMMISSIONED,
  ],
  [EquipmentStatus.UNDER_REPAIR]: [EquipmentStatus.WORKING, EquipmentStatus.CONDEMNED],
  [EquipmentStatus.CONDEMNED]: [EquipmentStatus.DECOMMISSIONED],
  [EquipmentStatus.DECOMMISSIONED]: [],
};

export function nextEquipmentStatuses(current: EquipmentStatus): EquipmentStatus[] {
  return ALLOWED_EQUIPMENT_TRANSITIONS[current] ?? [];
}
