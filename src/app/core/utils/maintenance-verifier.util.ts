import { MaintenanceEngineerRef, MaintenanceRecord } from '../models/maintenance.model';

/** API uses `engineer`; responses may also populate `verificationInCharge`. */
export function maintenanceVerifierRef(
  record: Pick<MaintenanceRecord, 'verificationInCharge' | 'engineer'>,
): string | MaintenanceEngineerRef | undefined {
  return record.verificationInCharge ?? record.engineer;
}

export function maintenanceVerifierId(
  record: Pick<MaintenanceRecord, 'verificationInCharge' | 'engineer'>,
): string | undefined {
  const ref = maintenanceVerifierRef(record);
  if (!ref) return undefined;
  return typeof ref === 'string' ? ref : ref.id;
}
