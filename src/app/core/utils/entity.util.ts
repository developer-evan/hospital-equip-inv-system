import { AuthUser } from '../models/auth.model';
import { Department } from '../models/department.model';
import { Equipment, EquipmentDepartmentRef } from '../models/equipment.model';
import { EquipmentStatus } from '../models/equipment-status.enum';
import {
  MaintenanceEngineerRef,
  MaintenanceEquipmentRef,
  MaintenanceRecord,
} from '../models/maintenance.model';
import { MaintenanceStatus } from '../models/maintenance-status.enum';
import { MaintenanceType } from '../models/maintenance-type.enum';
import { Notification } from '../models/notification.model';
import { UserProfile } from '../models/profile.model';
import { Role } from '../models/role.enum';
import { User, UserDepartmentRef } from '../models/user.model';

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' ? (value as Record<string, unknown>) : {};
}

export function resolveEntityId(entity: unknown): string {
  const record = asRecord(entity);
  const id = record['id'];
  const mongoId = record['_id'];

  if (typeof id === 'string' && id.length > 0 && id !== 'undefined') {
    return id;
  }

  if (typeof mongoId === 'string' && mongoId.length > 0) {
    return mongoId;
  }

  if (mongoId && typeof mongoId === 'object' && 'toString' in (mongoId as object)) {
    const asString = String(mongoId);
    if (asString && asString !== '[object Object]') {
      return asString;
    }
  }

  return '';
}

function normalizeUserDepartments(raw: unknown): UserDepartmentRef[] {
  if (!Array.isArray(raw)) return [];

  return raw
    .map((dept): UserDepartmentRef => {
      if (typeof dept === 'string') {
        return { id: dept, name: dept };
      }

      const department = asRecord(dept);
      return {
        id: resolveEntityId(department),
        name: String(department['name'] ?? ''),
        code: department['code'] ? String(department['code']) : undefined,
      };
    })
    .filter((dept) => !!dept.id);
}

export function normalizeUser(raw: unknown): User {
  const record = asRecord(raw);

  return {
    id: resolveEntityId(record),
    username: String(record['username'] ?? ''),
    email: String(record['email'] ?? ''),
    fullName: String(record['fullName'] ?? ''),
    role: record['role'] as Role,
    isActive: record['isActive'] !== false,
    createdAt: record['createdAt'] as string | undefined,
    updatedAt: record['updatedAt'] as string | undefined,
    departments: normalizeUserDepartments(record['departments']),
  };
}

export function normalizeDepartment(raw: unknown): Department {
  const record = asRecord(raw);

  return {
    id: resolveEntityId(record),
    name: String(record['name'] ?? ''),
    code: String(record['code'] ?? ''),
    location: record['location'] ? String(record['location']) : undefined,
    isActive: record['isActive'] !== false,
  };
}

function normalizeEquipmentDepartment(raw: unknown): string | EquipmentDepartmentRef {
  if (typeof raw === 'string') return raw;

  const department = asRecord(raw);
  const id = resolveEntityId(department);
  if (!id) return '';

  return {
    id,
    name: String(department['name'] ?? ''),
    code: department['code'] ? String(department['code']) : undefined,
  };
}

export function normalizeEquipment(raw: unknown): Equipment {
  const record = asRecord(raw);

  return {
    id: resolveEntityId(record),
    assetNumber: String(record['assetNumber'] ?? ''),
    name: String(record['name'] ?? ''),
    category: String(record['category'] ?? ''),
    manufacturer: String(record['manufacturer'] ?? ''),
    model: record['model'] ? String(record['model']) : undefined,
    serialNumber: String(record['serialNumber'] ?? ''),
    status: record['status'] as EquipmentStatus,
    department: normalizeEquipmentDepartment(record['department']),
    roomLocation: record['roomLocation'] ? String(record['roomLocation']) : undefined,
    supplier: record['supplier'] ? String(record['supplier']) : undefined,
    purchaseDate: record['purchaseDate'] as string | undefined,
    warrantyStartDate: record['warrantyStartDate'] as string | undefined,
    warrantyEndDate: record['warrantyEndDate'] as string | undefined,
    cost: typeof record['cost'] === 'number' ? record['cost'] : undefined,
    pmFrequencyDays:
      typeof record['pmFrequencyDays'] === 'number' ? record['pmFrequencyDays'] : undefined,
    calibrationFrequencyDays:
      typeof record['calibrationFrequencyDays'] === 'number'
        ? record['calibrationFrequencyDays']
        : undefined,
    photoUrls: Array.isArray(record['photoUrls'])
      ? record['photoUrls'].map(String)
      : undefined,
    manualUrls: Array.isArray(record['manualUrls'])
      ? record['manualUrls'].map(String)
      : undefined,
    qrCodeUrl: record['qrCodeUrl'] ? String(record['qrCodeUrl']) : undefined,
    installationDate: record['installationDate'] as string | undefined,
    installedBy: record['installedBy'] ? String(record['installedBy']) : undefined,
    createdAt: record['createdAt'] as string | undefined,
    updatedAt: record['updatedAt'] as string | undefined,
  };
}

export function normalizeAuthUser(raw: unknown): AuthUser {
  const record = asRecord(raw);
  const departmentsRaw = Array.isArray(record['departments']) ? record['departments'] : [];

  return {
    id: resolveEntityId(record),
    username: String(record['username'] ?? ''),
    email: String(record['email'] ?? ''),
    fullName: String(record['fullName'] ?? ''),
    role: record['role'] as Role,
    departments: departmentsRaw.map((dept) =>
      typeof dept === 'string' ? dept : resolveEntityId(dept),
    ),
  };
}

function normalizeMaintenanceRef(
  raw: unknown,
): string | MaintenanceEquipmentRef | MaintenanceEngineerRef {
  if (typeof raw === 'string') return raw;
  const record = asRecord(raw);
  const id = resolveEntityId(record);
  if (record['fullName']) {
    return { id, fullName: String(record['fullName']) };
  }
  const ref: MaintenanceEquipmentRef = {
    id,
    name: String(record['name'] ?? ''),
    assetNumber: record['assetNumber'] ? String(record['assetNumber']) : undefined,
  };

  if (record['department'] !== undefined && record['department'] !== null) {
    ref.department = normalizeEquipmentDepartment(record['department']);
  }

  return ref;
}

export function normalizeMaintenance(raw: unknown): MaintenanceRecord {
  const record = asRecord(raw);

  return {
    id: resolveEntityId(record),
    equipment: normalizeMaintenanceRef(record['equipment']) as string | MaintenanceEquipmentRef,
    type: record['type'] as MaintenanceType,
    status: record['status'] as MaintenanceStatus,
    scheduledDate: String(record['scheduledDate'] ?? ''),
    performedDate: record['performedDate'] as string | undefined,
    nextDueDate: record['nextDueDate'] as string | undefined,
    engineer: record['engineer']
      ? (normalizeMaintenanceRef(record['engineer']) as string | MaintenanceEngineerRef)
      : undefined,
    serviceReport: record['serviceReport'] ? String(record['serviceReport']) : undefined,
    photoUrls: Array.isArray(record['photoUrls'])
      ? record['photoUrls'].map(String)
      : undefined,
    createdAt: record['createdAt'] as string | undefined,
    updatedAt: record['updatedAt'] as string | undefined,
  };
}

export function normalizeNotification(raw: unknown): Notification {
  const record = asRecord(raw);

  return {
    id: resolveEntityId(record),
    title: String(record['title'] ?? ''),
    message: String(record['message'] ?? record['body'] ?? ''),
    isRead: record['isRead'] === true || record['read'] === true,
    type: record['type'] ? String(record['type']) : undefined,
    link: record['link'] ? String(record['link']) : undefined,
    createdAt: String(record['createdAt'] ?? ''),
  };
}

export function normalizeUserProfile(raw: unknown): UserProfile {
  const record = asRecord(raw);

  return {
    id: resolveEntityId(record),
    username: String(record['username'] ?? ''),
    email: String(record['email'] ?? ''),
    fullName: String(record['fullName'] ?? ''),
    role: record['role'] as Role,
    departments: normalizeUserDepartments(record['departments']),
    isActive: record['isActive'] !== false,
    lastLoginAt: record['lastLoginAt'] as string | undefined,
    createdAt: record['createdAt'] as string | undefined,
  };
}
