export enum MaintenanceType {
  PREVENTIVE = 'PREVENTIVE',
  CORRECTIVE = 'CORRECTIVE',
  CALIBRATION = 'CALIBRATION',
}

export const MAINTENANCE_TYPE_LABEL: Record<MaintenanceType, string> = {
  [MaintenanceType.PREVENTIVE]: 'Preventive',
  [MaintenanceType.CORRECTIVE]: 'Corrective',
  [MaintenanceType.CALIBRATION]: 'Calibration',
};

export function maintenanceTypeRequiresVerification(type: MaintenanceType): boolean {
  return type === MaintenanceType.PREVENTIVE || type === MaintenanceType.CALIBRATION;
}
